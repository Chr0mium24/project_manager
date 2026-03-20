const { createApp, ref, computed } = Vue;

        createApp({
            setup() {
                const inputText = ref('if debug_mode is True : print "Error"');
                const compressionRate = ref(1);

                // 简单的分词器
                const tokens = computed(() => {
                    return inputText.value.split(/\s+/).filter(t => t.length > 0);
                });

                // 模拟语义颜色映射
                const getTokenColor = (text) => {
                    if (['if', 'else', 'return', 'def', 'class'].includes(text)) return 'bg-purple-600 text-purple-100'; // 关键字
                    if (['True', 'False', 'None'].includes(text)) return 'bg-orange-600 text-orange-100'; // 布尔值
                    if (text.includes('"') || text.includes("'")) return 'bg-green-600 text-green-100'; // 字符串
                    if (['is', 'in', 'not', ':', '=', '+'].includes(text)) return 'bg-slate-600 text-slate-200'; // 操作符
                    return 'bg-blue-600 text-blue-100'; // 变量
                };

                // 2. 离散剪枝逻辑 (模拟)
                const prunedTokens = computed(() => {
                    const rate = compressionRate.value;
                    return tokens.value.map((t, i) => {
                        // 简单的保留逻辑：关键字优先保留，压缩率越高丢得越多
                        // 这里用简单的 hash 模拟决定
                        const isKeyword = ['if', 'True', 'print', ':'].some(k => t.includes(k));
                        let keep = true;

                        if (!isKeyword) {
                            // 非关键字，根据压缩率随机丢弃
                            keep = (i % Math.ceil(rate)) === 0;
                        }

                        return { text: t, keep };
                    });
                });

                // 3. 连续降采样逻辑 (核心创新点)
                const scaledTokens = computed(() => {
                    const result = [];
                    const rate = compressionRate.value;
                    const arr = tokens.value;

                    // 按照压缩率步长进行“采样/融合”
                    // 步长如果不为整数，则模拟信号插值 (这里简化为分块平均)
                    let currentIdx = 0;

                    while (currentIdx < arr.length) {
                        const step = rate; // 这是一个浮点数，比如 2.5
                        const endIdx = Math.min(currentIdx + step, arr.length);

                        // 获取这一段范围内的所有 token
                        // 比如 index 0 到 2.5
                        const sliceTokens = [];
                        for (let i = Math.floor(currentIdx); i < Math.ceil(endIdx); i++) {
                            if(arr[i]) sliceTokens.push(arr[i]);
                        }

                        // 生成混合标签 (简单的字符串拼接)
                        let label = sliceTokens.length > 1 && rate > 1.5
                            ? sliceTokens[0].substring(0,3) + '..'
                            : sliceTokens[0];

                        // 生成混合颜色 (模拟 Embedding Pooling)
                        // 我们简单取第一个和最后一个的颜色混合
                        const color1 = getTokenBaseColor(sliceTokens[0]);
                        const color2 = getTokenBaseColor(sliceTokens[sliceTokens.length-1] || sliceTokens[0]);

                        result.push({
                            label: label,
                            colorStart: color1,
                            colorEnd: color2,
                            width: 100 / (arr.length / rate) // 动态宽度
                        });

                        currentIdx += step;
                    }
                    return result;
                });

                // 辅助：获取颜色的 Hex 值用于渐变
                const getTokenBaseColor = (text) => {
                     if (['if', 'else', 'return', 'def', 'class'].includes(text)) return '#9333ea'; // Purple
                    if (['True', 'False', 'None'].includes(text)) return '#ea580c'; // Orange
                    if (text.includes('"') || text.includes("'")) return '#16a34a'; // Green
                    if (['is', 'in', 'not', ':', '=', '+'].includes(text)) return '#475569'; // Slate
                    return '#2563eb'; // Blue
                };

                const getChunkStyle = (chunk) => {
                    return {
                        background: `linear-gradient(90deg, ${chunk.colorStart}, ${chunk.colorEnd})`,
                        // 模拟挤压：宽度变小，或者保持 flex 比例
                        flexBasis: `${Math.max(40, 150 / compressionRate.value)}px`,
                        flexGrow: 1,
                        opacity: 0.9
                    };
                };

                return {
                    inputText,
                    compressionRate,
                    tokens,
                    prunedTokens,
                    scaledTokens,
                    getTokenColor,
                    getChunkStyle
                };
            }
        }).mount('#app');
