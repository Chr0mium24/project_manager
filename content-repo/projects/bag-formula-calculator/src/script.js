const inputs = document.querySelectorAll('input, select');
        const side1 = document.getElementById('side1');
        const side2 = document.getElementById('side2');
        const clearBtn = document.getElementById('clearBtn');
        const STORAGE_PREFIX = 'bagCalc_';

        // 页面加载时读取 LocalStorage 数据
        function loadData() {
            inputs.forEach(input => {
                const savedVal = localStorage.getItem(STORAGE_PREFIX + input.id);
                if (savedVal !== null) {
                    input.value = savedVal;
                }
            });
            calculate();
        }

        // 保存单项数据到 LocalStorage
        function saveData(id, value) {
            localStorage.setItem(STORAGE_PREFIX + id, value);
        }

        // 侧边联动逻辑及保存
        side1.addEventListener('input', (e) => {
            side2.value = e.target.value;
            saveData('side1', e.target.value);
            saveData('side2', e.target.value);
            calculate();
        });
        side2.addEventListener('input', (e) => {
            side1.value = e.target.value;
            saveData('side2', e.target.value);
            saveData('side1', e.target.value);
            calculate();
        });

        // 监听其他所有输入和下拉框变化并保存
        inputs.forEach(input => {
            if(input.id !== 'side1' && input.id !== 'side2') {
                // 使用 'input' 事件可以同时监听 input 和 select 元素的内容改变
                input.addEventListener('input', (e) => {
                    saveData(e.target.id, e.target.value);
                    calculate();
                });
            }
        });

        // 清空按钮逻辑
        clearBtn.addEventListener('click', () => {
            inputs.forEach(input => {
                localStorage.removeItem(STORAGE_PREFIX + input.id);
                // 恢复默认状态
                if (input.id === 'lengthOffset') {
                    input.value = '6.5';
                } else if (input.id === 'multiplier') {
                    input.value = '';
                } else {
                    input.value = '';
                }
            });
            calculate();
        });

        const formatOutput = (num) => isNaN(num) ? '' : num.toFixed(4);

        function calculate() {
            const getVal = (id) => {
                const val = document.getElementById(id).value;
                if(id === 'otherFee' && val === '') return 0;
                return val === '' ? NaN : parseFloat(val);
            };

            const h = getVal('h');
            const w = getVal('w');
            const side = getVal('side1');
            const lengthOffset = getVal('lengthOffset'); // 获取新的布料长偏移量
            const gsm = getVal('gsm');
            const fabricPrice = getVal('fabricPrice');
            const printDeduct = getVal('printDeduct');
            const printPrice = getVal('printPrice');
            const processFee = getVal('processFee');
            const packFee = getVal('packFee');
            const otherFee = getVal('otherFee');
            const multiplier = getVal('multiplier');

            // 1. 布料长
            let L = NaN;
            if (!isNaN(h) && !isNaN(side) && !isNaN(lengthOffset)) {
                L = h * 2 + side + lengthOffset;
                document.getElementById('resL').innerText = formatOutput(L);
                document.getElementById('valL').innerText = formatOutput(L);
                document.getElementById('valL2').innerText = formatOutput(L);
            } else {
                ["resL", "valL", "valL2"].forEach(id => document.getElementById(id).innerText = '');
            }

            // 2. 布料宽
            let W = NaN;
            if (!isNaN(w) && !isNaN(side)) {
                W = w + side + 1.5;
                document.getElementById('resW').innerText = formatOutput(W);
                document.getElementById('valW').innerText = formatOutput(W);
                document.getElementById('valW2').innerText = formatOutput(W);
            } else {
                ["resW", "valW", "valW2"].forEach(id => document.getElementById(id).innerText = '');
            }

            // 3. 总面积
            let Area = NaN;
            if (!isNaN(L) && !isNaN(W)) {
                Area = L * W / 10000;
                document.getElementById('resArea').innerText = formatOutput(Area);
                document.getElementById('valArea1').innerText = formatOutput(Area);
            } else {
                document.getElementById('resArea').innerText = '';
                document.getElementById('valArea1').innerText = '';
            }

            // 4. 布料成本
            let FabricCost = NaN;
            if (!isNaN(Area) && !isNaN(gsm) && !isNaN(fabricPrice)) {
                FabricCost = Area * gsm * fabricPrice / 1000000;
                document.getElementById('resFabricCost').innerText = formatOutput(FabricCost);
                document.getElementById('valFabricCost').innerText = formatOutput(FabricCost);
            } else {
                document.getElementById('resFabricCost').innerText = '';
                document.getElementById('valFabricCost').innerText = '';
            }

            // 5. 彩印成本
            let PrintCost = NaN;
            if (!isNaN(L) && !isNaN(W) && !isNaN(printDeduct) && !isNaN(printPrice)) {
                PrintCost = ((L - printDeduct) * W) * printPrice / 10000;
                document.getElementById('resPrintCost').innerText = formatOutput(PrintCost);
                document.getElementById('valPrintCost').innerText = formatOutput(PrintCost);
            } else {
                document.getElementById('resPrintCost').innerText = '';
                document.getElementById('valPrintCost').innerText = '';
            }

            // 6. 最终单价
            let Final = NaN;
            if (!isNaN(FabricCost) && !isNaN(PrintCost) && !isNaN(processFee) && !isNaN(packFee) && !isNaN(multiplier)) {
                Final = (FabricCost + PrintCost + processFee + packFee + otherFee) * multiplier;
                document.getElementById('resFinal').innerText = formatOutput(Final);
            } else {
                document.getElementById('resFinal').innerText = '';
            }
        }

        // 初始化执行
        loadData();
