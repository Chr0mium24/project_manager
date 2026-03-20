// --- 1. Data Structure: Abstract Algebra Syllabus ---
        const algebraStructure = {
            "group_theory": {
                title: "群论 (Group Theory)",
                chapters: [
                    "群的定义与基本性质 (Definitions & Properties)",
                    "子群 (Subgroups)",
                    "循环群 (Cyclic Groups)",
                    "置换群 (Permutation Groups)",
                    "陪集与拉格朗日定理 (Cosets & Lagrange's Thm)",
                    "正规子群与商群 (Normal Subgroups & Quotients)",
                    "群同态与同构定理 (Homomorphisms & Isomorphism Thms)"
                ]
            },
            "ring_theory": {
                title: "环论 (Ring Theory)",
                chapters: [
                    "环的定义 (Definitions)",
                    "整环与域 (Integral Domains & Fields)",
                    "理想与商环 (Ideals & Quotient Rings)",
                    "环同态 (Ring Homomorphisms)",
                    "多项式环 (Polynomial Rings)",
                    "唯一分解整环 (UFDs)"
                ]
            },
            "field_theory": {
                title: "域论 (Field Theory)",
                chapters: [
                    "域扩张 (Field Extensions)",
                    "分裂域 (Splitting Fields)",
                    "伽罗瓦理论基础 (Basics of Galois Theory)"
                ]
            }
        };

        // --- 2. State Management ---
        let state = {
            apiKey: localStorage.getItem('lean_dojo_apikey') || null,
            currentTopicKey: null,
            currentSubTopic: null,
            history: JSON.parse(localStorage.getItem('lean_dojo_history') || '[]')
        };

        // --- 3. UI Initialization ---
        document.addEventListener('DOMContentLoaded', () => {
            checkApiKey();
            renderSidebar();
            restoreLastSession();
        });

        function checkApiKey() {
            if (!state.apiKey) {
                document.getElementById('apiKeyModal').classList.remove('hidden');
                document.getElementById('apiStatus').innerText = "API Key: 未设置";
            } else {
                document.getElementById('apiStatus').innerText = "API Key: 已就绪";
            }
        }

        function saveApiKey() {
            const input = document.getElementById('apiKeyInput').value.trim();
            if (input) {
                state.apiKey = input;
                localStorage.setItem('lean_dojo_apikey', input);
                document.getElementById('apiKeyModal').classList.add('hidden');
                checkApiKey();
            }
        }

        function clearData() {
            if(confirm("确定要清除 API Key 和所有历史记录吗？")) {
                localStorage.removeItem('lean_dojo_apikey');
                localStorage.removeItem('lean_dojo_history');
                location.reload();
            }
        }

        function renderSidebar() {
            const list = document.getElementById('chapterList');
            list.innerHTML = '';

            for (const [key, section] of Object.entries(algebraStructure)) {
                // Section Header
                const sectionHeader = document.createElement('div');
                sectionHeader.className = "px-3 py-2 mt-2 text-xs font-bold text-sky-500 truncate";
                sectionHeader.innerText = section.title;
                list.appendChild(sectionHeader);

                // Chapters
                section.chapters.forEach(chapter => {
                    const btn = document.createElement('button');
                    btn.className = "w-full text-left px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded transition truncate";
                    btn.innerText = chapter;
                    btn.onclick = () => selectTopic(key, chapter);
                    list.appendChild(btn);
                });
            }
        }

        function selectTopic(topicKey, subTopic) {
            state.currentTopicKey = topicKey;
            state.currentSubTopic = subTopic;

            document.getElementById('currentTopicDisplay').innerText = algebraStructure[topicKey].title;
            document.getElementById('currentSubTopicDisplay').innerText = subTopic;
            document.getElementById('btnGenerate').disabled = false;

            // Clear editor if switching topics drastically, or load from history if implemented
            logConsole(`已选择: ${subTopic}`);
        }

        // --- 4. Gemini API Interaction ---

        async function callGemini(prompt, systemInstruction = "") {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${state.apiKey}`;

            const payload = {
                contents: [{
                    parts: [{ text: systemInstruction + "\n\n" + prompt }]
                }]
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                console.error("API Error:", error);
                throw error;
            }
        }

        // --- 5. Core Logic: Generate Problem ---

        async function generateProblem() {
            if (!state.currentSubTopic) return;

            setLoading(true);
            logConsole("正在生成新的 Lean 4 命题...");

            const systemPrompt = `你是一个 Lean 4 定理证明助手。你的任务是为抽象代数学习者生成 Lean 4 的练习题。
            请严格按照 JSON 格式返回，不要包含 markdown 代码块标记。
            格式要求:
            {
                "title": "命题标题",
                "descriptionMarkdown": "数学描述 (可以使用 LaTeX)",
                "initialCode": "Lean 4 代码模板 (包含 import, variable, theorem声明, 和 := by sorry)"
            }`;

            const userPrompt = `请为章节 "${state.currentSubTopic}" (属于 ${algebraStructure[state.currentTopicKey].title}) 生成一个适合初学者的 Lean 4 证明题。
            确保代码可以编译（假设有 Mathlib）。
            如果是群论，通常需要 import Mathlib.Algebra.Group.Basic
            确保 initialCode 以 'sorry' 结尾，留给用户填空。`;

            try {
                let rawText = await callGemini(userPrompt, systemPrompt);
                // Clean markdown code blocks if present
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

                const problemData = JSON.parse(rawText);

                // Update UI
                renderProblem(problemData);

                // Save to state
                state.currentProblem = problemData;
                saveHistory();
                logConsole("命题生成成功！");

            } catch (e) {
                logConsole(`生成失败: ${e.message}`, 'error');
            } finally {
                setLoading(false);
            }
        }

        function renderProblem(data) {
            const descEl = document.getElementById('problemDescription');
            descEl.innerHTML = marked.parse(`## ${data.title}\n\n${data.descriptionMarkdown}`);

            const editor = document.getElementById('leanCodeInput');
            editor.value = data.initialCode;
        }

        // --- 6. Core Logic: Simulation (Run/Check) ---

        async function runSimulation() {
            const code = document.getElementById('leanCodeInput').value;
            if (!code.trim()) return;

            setLoading(true);
            logConsole("正在编译并验证证明...", 'info');

            const systemPrompt = `你是一个严格的 Lean 4 编译器模拟器。
            用户会提交一段 Lean 代码。你需要判断这段代码在逻辑上和语法上是否正确，尤其是证明部分。

            请返回严格的 JSON 格式 (无 Markdown):
            {
                "status": "success" | "error",
                "message": "编译器输出信息",
                "feedback": "针对用户的详细解释或纠错建议"
            }

            如果代码里还有 'sorry'，status 必须是 error，message 提示 'proof contains sorry'。
            如果逻辑错误，详细说明哪一步 tactic 错了。`;

            const userPrompt = `请验证以下 Lean 4 代码，背景是抽象代数章节 ${state.currentSubTopic}:

            \`\`\`lean
            ${code}
            \`\`\``;

            try {
                let rawText = await callGemini(userPrompt, systemPrompt);
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

                const result = JSON.parse(rawText);

                if (result.status === 'success') {
                    logConsole(`Goals accomplished! 🎉\n${result.message}`, 'success');
                    logConsole(`AI 点评: ${result.feedback}`, 'success');
                } else {
                    logConsole(`Error: ${result.message}`, 'error');
                    logConsole(`建议: ${result.feedback}`, 'warning');
                }

            } catch (e) {
                logConsole(`验证服务错误: ${e.message}`, 'error');
            } finally {
                setLoading(false);
            }
        }

        // --- 7. Utilities ---

        function setLoading(isLoading) {
            const indicator = document.getElementById('loadingIndicator');
            if (isLoading) indicator.classList.remove('hidden');
            else indicator.classList.add('hidden');
        }

        function logConsole(text, type = 'info') {
            const consoleEl = document.getElementById('consoleOutput');
            const entry = document.createElement('div');

            const timestamp = new Date().toLocaleTimeString();
            let colorClass = "text-slate-300";
            if (type === 'error') colorClass = "text-red-400";
            if (type === 'success') colorClass = "text-emerald-400";
            if (type === 'warning') colorClass = "text-yellow-400";

            entry.className = `border-l-2 pl-2 text-sm ${type === 'error' ? 'border-red-500' : 'border-slate-600'}`;
            entry.innerHTML = `<span class="text-xs text-slate-600">[${timestamp}]</span> <span class="${colorClass}">${text.replace(/\n/g, '<br>')}</span>`;

            consoleEl.appendChild(entry);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }

        function saveHistory() {
            // Save just the latest context for simplicity in this demo
            const sessionData = {
                currentTopicKey: state.currentTopicKey,
                currentSubTopic: state.currentSubTopic,
                currentProblem: state.currentProblem,
                currentCode: document.getElementById('leanCodeInput').value
            };
            localStorage.setItem('lean_dojo_last_session', JSON.stringify(sessionData));
        }

        function restoreLastSession() {
            const saved = localStorage.getItem('lean_dojo_last_session');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.currentTopicKey && data.currentSubTopic) {
                        selectTopic(data.currentTopicKey, data.currentSubTopic);
                        if (data.currentProblem) {
                            renderProblem(data.currentProblem);
                            // If user had edited code, restore that instead of template
                            if (data.currentCode) {
                                document.getElementById('leanCodeInput').value = data.currentCode;
                            }
                            logConsole("已恢复上次的学习进度");
                        }
                    }
                } catch (e) {
                    console.error("Failed to restore session", e);
                }
            }
        }

        // Auto-save code on input
        document.getElementById('leanCodeInput').addEventListener('input', () => {
            saveHistory();
        });
