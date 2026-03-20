// --- 文本处理辅助函数 ---

        // 简单的中文分句
        const splitSentences = (text) => text.match(/[^。？！]+[。？！]?/g) || [];

        // 简单的中文分词（基于非单词字符）
        // 注意：这是一个非常基础的实现，对于精确的语言学分析，需要专业的中文分词库。
        const tokenize = (text) => text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);

        // --- 指标计算函数 ---

        // 1. 滑动TTR (Type-Token Ratio)
        const calculateSlidingTTR = (tokens, windowSize) => {
            if (tokens.length < windowSize) return [];
            const ttrValues = [];
            for (let i = 0; i <= tokens.length - windowSize; i++) {
                const window = tokens.slice(i, i + windowSize);
                const types = new Set(window);
                ttrValues.push(types.size / window.length);
            }
            return ttrValues;
        };

        // 2. 句子长度
        const getSentenceLengths = (sentences) => sentences.map(s => tokenize(s).length).filter(len => len > 0);

        // 3. LZ压缩率
        const calculateLZCompressionRate = (text) => {
            if (!text) return 0;
            const compressed = LZString.compress(text);
            return compressed.length / text.length;
        };

        // 4. 相邻句子语义相似度 (余弦相似度)
        const calculateAdjacentSimilarity = (sentences) => {
            if (sentences.length < 2) return [];

            // 构建整个文本的词汇表
            const vocab = new Set();
            const tokenizedSentences = sentences.map(s => {
                const tokens = tokenize(s);
                tokens.forEach(t => vocab.add(t));
                return tokens;
            });
            const vocabList = Array.from(vocab);

            // 将句子转换为TF向量
            const sentenceVectors = tokenizedSentences.map(tokens => {
                const vector = new Array(vocabList.length).fill(0);
                const tf = new Map();
                tokens.forEach(token => tf.set(token, (tf.get(token) || 0) + 1));
                tf.forEach((count, token) => {
                    const index = vocabList.indexOf(token);
                    if (index !== -1) vector[index] = count;
                });
                return vector;
            });

            // 计算余弦相似度
            const cosineSimilarity = (vecA, vecB) => {
                let dotProduct = 0;
                let normA = 0;
                let normB = 0;
                for (let i = 0; i < vecA.length; i++) {
                    dotProduct += vecA[i] * vecB[i];
                    normA += vecA[i] * vecA[i];
                    normB += vecB[i] * vecB[i];
                }
                normA = Math.sqrt(normA);
                normB = Math.sqrt(normB);
                if (normA === 0 || normB === 0) return 0;
                return dotProduct / (normA * normB);
            };

            const similarities = [];
            for (let i = 0; i < sentenceVectors.length - 1; i++) {
                similarities.push(cosineSimilarity(sentenceVectors[i], sentenceVectors[i + 1]));
            }
            return similarities;
        };

        // --- 图表绘制函数 ---
        const charts = {};

        const createChart = (ctx, config) => {
            const chartId = ctx.canvas.id;
            if (charts[chartId]) {
                charts[chartId].destroy();
            }
            charts[chartId] = new Chart(ctx, config);
        };

        const renderCharts = (dataA, dataB) => {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow"><h3 class="font-bold text-center mb-2">滑动TTR (词汇丰富度动态)</h3><canvas id="ttrChart"></canvas><p class="text-sm text-gray-500 mt-2 text-center">该图展示了文本在不同位置用词的多样性。曲线越高，表示该部分的词汇越丰富，重复用词较少。</p></div>
                <div class="bg-white p-4 rounded-lg shadow"><h3 class="font-bold text-center mb-2">句子复杂度分布 (基于句子长度)</h3><canvas id="lenChart"></canvas><p class="text-sm text-gray-500 mt-2 text-center">箱形图展示了句子长度的分布。箱体越长、位置越高，代表文本的句子结构整体更复杂、句子更长。</p></div>
                <div class="bg-white p-4 rounded-lg shadow"><h3 class="font-bold text-center mb-2">信息密度 (LZ压缩率)</h3><canvas id="lzChart"></canvas><p class="text-sm text-gray-500 mt-2 text-center">该图对比了文本的信息冗余度。柱体越低，说明文本的重复模式越少，信息密度越高。</p></div>
                <div class="bg-white p-4 rounded-lg shadow"><h3 class="font-bold text-center mb-2">相邻句子连贯性 (语义相似度)</h3><canvas id="simChart"></canvas><p class="text-sm text-gray-500 mt-2 text-center">曲线展示了相邻句子之间的关联程度。曲线波动平稳且值较高，通常意味着句子间过渡更自然，主题更连贯。</p></div>
            `;

            // 1. TTR Chart
            createChart(document.getElementById('ttrChart').getContext('2d'), {
                type: 'line',
                data: {
                    labels: Array.from({length: Math.max(dataA.ttr.length, dataB.ttr.length)}, (_, i) => i),
                    datasets: [{
                        label: '文本 A',
                        data: dataA.ttr,
                        borderColor: 'rgba(59, 130, 246, 0.8)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.1
                    }, {
                        label: '文本 B',
                        data: dataB.ttr,
                        borderColor: 'rgba(239, 68, 68, 0.8)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.1
                    }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
            });

            // 2. Sentence Length Chart
            createChart(document.getElementById('lenChart').getContext('2d'), {
                type: 'boxplot',
                data: {
                    labels: ['文本 A', '文本 B'],
                    datasets: [{
                        label: '句子长度分布',
                        data: [dataA.lengths, dataB.lengths],
                        backgroundColor: ['rgba(59, 130, 246, 0.5)', 'rgba(239, 68, 68, 0.5)'],
                        borderColor: ['rgba(59, 130, 246, 1)', 'rgba(239, 68, 68, 1)'],
                        borderWidth: 1,
                        padding: 10,
                        itemRadius: 2
                    }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
            });

            // 3. LZ Compression Chart
            createChart(document.getElementById('lzChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['文本 A', '文本 B'],
                    datasets: [{
                        label: 'LZ压缩率',
                        data: [dataA.lzRate, dataB.lzRate],
                        backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                        borderColor: ['rgba(59, 130, 246, 1)', 'rgba(239, 68, 68, 1)'],
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
            });

            // 4. Similarity Chart
            createChart(document.getElementById('simChart').getContext('2d'), {
                type: 'line',
                data: {
                    labels: Array.from({length: Math.max(dataA.similarities.length, dataB.similarities.length)}, (_, i) => i + 1),
                    datasets: [{
                        label: '文本 A',
                        data: dataA.similarities,
                        borderColor: 'rgba(59, 130, 246, 0.8)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        pointRadius: 1,
                    }, {
                        label: '文本 B',
                        data: dataB.similarities,
                        borderColor: 'rgba(239, 68, 68, 0.8)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        pointRadius: 1,
                    }]
                },
                 options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
            });
        };

        // --- 主逻辑 ---
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            const textA = document.getElementById('textA').value;
            const textB = document.getElementById('textB').value;

            if (!textA || !textB) {
                alert('请在两个输入框中都粘贴文本。');
                return;
            }

            const tokensA = tokenize(textA);
            const tokensB = tokenize(textB);
            const sentencesA = splitSentences(textA);
            const sentencesB = splitSentences(textB);

            const windowSize = 50; // TTR窗口大小

            const dataA = {
                ttr: calculateSlidingTTR(tokensA, windowSize),
                lengths: getSentenceLengths(sentencesA),
                lzRate: calculateLZCompressionRate(textA),
                similarities: calculateAdjacentSimilarity(sentencesA)
            };

            const dataB = {
                ttr: calculateSlidingTTR(tokensB, windowSize),
                lengths: getSentenceLengths(sentencesB),
                lzRate: calculateLZCompressionRate(textB),
                similarities: calculateAdjacentSimilarity(sentencesB)
            };

            renderCharts(dataA, dataB);
        });
