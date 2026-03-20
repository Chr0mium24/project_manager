const { createApp } = Vue;

        createApp({
            data() {
                return {
                    settings: {
                        apiKey: '',
                        geminiKey: ''
                    },
                    sessions: [],
                    currentSessionId: null,
                    inputText: '',
                    showSettings: false,
                    isGenerating: false,
                    defaultGreeting: '你好！我是你的本地 AI 助手，请问有什么可以帮你？'
                }
            },
            computed: {
                currentSession() {
                    return this.sessions.find(s => s.id === this.currentSessionId);
                }
            },
            mounted() {
                this.loadData();
                if (this.sessions.length === 0) {
                    this.createNewSession();
                }
            },
            methods: {
                generateId() {
                    return Math.random().toString(36).substring(2, 10);
                },
                loadData() {
                    const savedSettings = localStorage.getItem('chat_settings');
                    const savedSessions = localStorage.getItem('chat_sessions');
                    if (savedSettings) this.settings = JSON.parse(savedSettings);
                    if (savedSessions) this.sessions = JSON.parse(savedSessions);

                    const savedGreeting = localStorage.getItem('chat_greeting');
                    if (savedGreeting) this.defaultGreeting = savedGreeting;
                },
                saveData() {
                    localStorage.setItem('chat_sessions', JSON.stringify(this.sessions));
                },
                saveSettings() {
                    localStorage.setItem('chat_settings', JSON.stringify(this.settings));
                    this.showSettings = false;
                },
                clearCache() {
                    if(confirm('确定要清除所有数据吗？这无法恢复。')) {
                        localStorage.clear();
                        location.reload();
                    }
                },
                createNewSession() {
                    const newSession = {
                        id: this.generateId(),
                        title: '新会话 ' + new Date().toLocaleTimeString(),
                        messages: [{ id: this.generateId(), role: 'assistant', content: this.defaultGreeting, disabled: false }]
                    };
                    this.sessions.unshift(newSession);
                    this.currentSessionId = newSession.id;
                    this.saveData();
                },
                deleteSession(id) {
                    if(confirm('删除此会话？')) {
                        this.sessions = this.sessions.filter(s => s.id !== id);
                        if(this.currentSessionId === id) {
                            this.currentSessionId = this.sessions.length > 0 ? this.sessions[0].id : null;
                        }
                        this.saveData();
                    }
                },
                toggleMask(msg) {
                    msg.disabled = !msg.disabled;
                    this.saveData();
                },
                editMessage(msg) {
                    const newContent = prompt('修改消息内容：', msg.content);
                    if (newContent !== null && newContent.trim() !== '') {
                        msg.content = newContent;
                        this.saveData();
                    }
                },
                deleteMessage(index) {
                    if(confirm('删除此条消息？')) {
                        this.currentSession.messages.splice(index, 1);
                        this.saveData();
                    }
                },
                scrollToBottom() {
                    setTimeout(() => {
                        const box = document.getElementById('chat-box');
                        if (box) box.scrollTop = box.scrollHeight;
                    }, 50);
                },
                async sendMessage() {
                    if (!this.inputText.trim() || !this.settings.apiKey) {
                        if (!this.settings.apiKey) alert('请先在设置中填写 MiniMax API Key');
                        return;
                    }

                    const userMsg = { id: this.generateId(), role: 'user', content: this.inputText.trim(), disabled: false };
                    this.currentSession.messages.push(userMsg);
                    this.inputText = '';
                    this.isGenerating = true;
                    this.scrollToBottom();

                    // 核心：过滤掉被屏蔽的消息，不发给接口
                    const payloadMessages = this.currentSession.messages
                        .filter(m => !m.disabled)
                        .map(m => ({ role: m.role, content: m.content }));

                    try {
                        const response = await fetch('https://api.edgefn.net/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${this.settings.apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: "MiniMax-M2.5",
                                messages: payloadMessages
                            })
                        });

                        const data = await response.json();
                        if (data.choices && data.choices[0]) {
                            this.currentSession.messages.push({
                                id: this.generateId(),
                                role: 'assistant',
                                content: data.choices[0].message.content,
                                disabled: false
                            });

                            // 动态更新标题
                            if (this.currentSession.messages.length === 3) {
                                this.currentSession.title = payloadMessages[1].content.substring(0, 10) + '...';
                            }
                        } else {
                            throw new Error(data.error?.message || '未知错误');
                        }
                    } catch (error) {
                        this.currentSession.messages.push({
                            id: this.generateId(),
                            role: 'assistant',
                            content: `[请求出错]: ${error.message}`,
                            disabled: false
                        });
                    } finally {
                        this.isGenerating = false;
                        this.saveData();
                        this.scrollToBottom();
                    }
                },

                // ==========================================
                // 依据你的习惯：利用 gemini-flash-latest 替换硬编码
                // ==========================================
                async generateHardcodedData() {
                    if (!this.settings.geminiKey) {
                        alert('请先填写 Gemini API Key');
                        return;
                    }

                    try {
                        // AI 编写的提示词：要求 Gemini 根据应用场景生成高质量的初始占位文案
                        const geminiPrompt = `
                            你现在是一个产品文案专家。我正在开发一个极简、私密的本地 AI 对话工具。
                            请为这个应用生成一句亲切、专业、简短的"首次欢迎语"（作为系统硬编码的初始占位符）。
                            要求：不带引号，纯文本返回，字数在30字以内，体现"本地安全"和"高效"的特点。
                        `;

                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.settings.geminiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: geminiPrompt }] }]
                            })
                        });

                        const data = await response.json();
                        const generatedText = data.candidates[0].content.parts[0].text.trim();

                        this.defaultGreeting = generatedText;
                        localStorage.setItem('chat_greeting', generatedText);
                        alert(`已成功使用 Gemini 生成新的硬编码文案并替换：\n\n"${generatedText}"\n\n新创建的会话将应用此欢迎语。`);

                    } catch (error) {
                        alert('Gemini 请求失败，请检查网络或 API Key。');
                        console.error(error);
                    }
                }
            }
        }).mount('#app');
