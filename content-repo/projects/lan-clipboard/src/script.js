const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // TODO: 替换为实际的 Key
        let messages = JSON.parse(localStorage.getItem('clipboard_chat')) || [];
        let peer = null;
        let conn = null;
        const myPeerId = 'peer_' + Math.random().toString(36).substr(2, 9);

        // 监听回车发送
        document.getElementById('msg-input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
            }
        });

        renderMessages();

        // --- 核心 WebRTC 网络逻辑 ---
        function joinRoom() {
            const roomName = document.getElementById('room-id').value;
            if (!roomName) return alert('请输入房间号');

            updateStatus('黄', '尝试抢占房间...');
            if (peer) peer.destroy();

            // 显式指定 Google STUN 服务器
            peer = new Peer(roomName, {
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('open', () => {
                updateStatus('绿', '房间已建立，等待接入');
                peer.on('connection', (incomingConn) => {
                    incomingConn.on('open', () => {
                        conn = incomingConn;
                        updateStatus('绿', '设备已互连');
                        setupSync();
                    });
                });
            });

            peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    updateStatus('黄', '加入现有房间中...');
                    peer.destroy();
                    setTimeout(() => {
                        peer = new Peer(myPeerId);
                        peer.on('open', () => {
                            conn = peer.connect(roomName);
                            conn.on('open', () => {
                                updateStatus('绿', '已加入房间');
                                setupSync();
                            });
                            conn.on('error', () => updateStatus('红', '连接断开'));
                        });
                    }, 500);
                } else {
                    updateStatus('红', '网络错误: ' + err.type);
                }
            });
        }

        function updateStatus(color, text) {
            const statusEl = document.getElementById('status');
            const colorMap = { '红': 'bg-red-500', '黄': 'bg-yellow-400', '绿': 'bg-green-500' };
            statusEl.innerHTML = `<span class="w-2.5 h-2.5 rounded-full ${colorMap[color]} shadow-sm"></span> ${text}`;
        }

        function setupSync() {
            conn.send({ type: 'sync_history', data: messages });
            conn.on('data', (payload) => {
                if (payload.type === 'sync_history') {
                    payload.data.forEach(rm => {
                        if (!messages.find(m => m.id === rm.id)) saveAndRender(rm);
                    });
                } else if (payload.type === 'new_msg') {
                    saveAndRender(payload.data);
                    if (payload.data.type === 'text') {
                        navigator.clipboard.writeText(payload.data.raw).catch(() => {});
                    }
                }
            });
        }

        function broadcast(msgObj) {
            if (conn && conn.open) conn.send({ type: 'new_msg', data: msgObj });
        }

        // --- 发送逻辑与数据结构 ---
        async function handleSendText() {
            const input = document.getElementById('msg-input');
            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            input.style.height = 'auto'; // 重置高度

            let msgObj = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                type: 'text',
                raw: text,
                html: DOMPurify.sanitize(marked.parse(text)), // Markdown 解析
                timestamp: Date.now(),
                sender: myPeerId,
                aiTag: ''
            };

            // AI 智能感知：动态接管所有文本判断
            msgObj.aiTag = '分析中...';
            saveAndRender(msgObj);
            msgObj.aiTag = await analyzeWithGemini(text);

            saveAndRender(msgObj);
            broadcast(msgObj);
        }

        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const isImage = file.type.startsWith('image/');
                let msgObj = {
                    id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    type: isImage ? 'image' : 'file',
                    fileName: file.name,
                    fileData: e.target.result, // Base64 编码
                    timestamp: Date.now(),
                    sender: myPeerId
                };
                saveAndRender(msgObj);
                broadcast(msgObj);
            };
            reader.readAsDataURL(file);
        }

        // --- 渲染引擎 ---
        function saveAndRender(newMsg) {
            const index = messages.findIndex(m => m.id === newMsg.id);
            if (index > -1) messages[index] = newMsg;
            else messages.push(newMsg);

            messages.sort((a, b) => a.timestamp - b.timestamp);
            if (messages.length > 100) messages = messages.slice(messages.length - 100);

            localStorage.setItem('clipboard_chat', JSON.stringify(messages));
            renderDOM();
        }

        function renderDOM() {
            const container = document.getElementById('chat-container');
            container.innerHTML = '';

            messages.forEach(msg => {
                const isSelf = msg.sender === myPeerId;
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                const bubbleWrapper = document.createElement('div');
                bubbleWrapper.className = `flex flex-col max-w-[80%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`;

                let contentHtml = '';
                if (msg.type === 'text') {
                    const aiBadge = msg.aiTag ? `<div class="text-xs font-semibold text-teal-800 bg-teal-100/50 inline-block px-2 py-1 rounded mb-2 border border-teal-200">✨ ${msg.aiTag}</div>` : '';
                    contentHtml = `${aiBadge}<div class="markdown-body text-sm text-gray-800 leading-relaxed">${msg.html}</div>`;
                } else if (msg.type === 'image') {
                    contentHtml = `<img src="${msg.fileData}" alt="${msg.fileName}" class="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition">`;
                } else if (msg.type === 'file') {
                    contentHtml = `<a href="${msg.fileData}" download="${msg.fileName}" class="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200 hover:bg-gray-100 transition">
                        <svg class="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg>
                        <div class="flex flex-col"><span class="text-sm font-medium text-gray-700 underline">${msg.fileName}</span><span class="text-xs text-gray-500">点击下载</span></div>
                    </a>`;
                }

                bubbleWrapper.innerHTML = `
                    <div class="px-4 py-3 rounded-2xl shadow-sm relative group ${isSelf ? 'bg-[#dcf8c6] rounded-br-sm' : 'bg-white rounded-bl-sm border border-gray-100'}">
                        ${contentHtml}
                    </div>
                    <span class="text-[11px] text-gray-400 mt-1 px-1">${timeStr}</span>
                `;
                container.appendChild(bubbleWrapper);
            });
            container.scrollTop = container.scrollHeight;
        }

        // --- 智能化 AI 调用封装 ---
        async function analyzeWithGemini(rawText) {
            // 利用 gemini-flash-latest 提取信息元数据，替代硬编码判断逻辑
            const promptConfig = {
                contents: [{
                    parts: [{
                        text: `作为后台数据感知中间件，请提取以下剪贴板内容的特征。
请严格输出格式：[分类标签] 核心内容简述
分类标签限定词汇库：代码, 日志, 链接, 短文, 杂项
若内容不足20字，直接返回空字符串即可。
待分析文本：\n${rawText.substring(0, 1500)}`
                    }]
                }]
            };

            if (rawText.length < 20) return "";

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(promptConfig)
                });
                const data = await response.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text.trim();
                }
            } catch (error) {
                console.warn("AI 感知链路异常", error);
            }
            return "";
        }
