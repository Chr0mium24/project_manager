document.addEventListener('DOMContentLoaded', () => {
            // --- State Management ---
            let participants = [];
            let expenses = [];
            let lastPayer = '';

            // --- DOM Element Caching ---
            const initialCurrencyInput = document.getElementById('initial-currency');
            const exchangeRateInput = document.getElementById('exchange-rate');
            const finalCurrencyInput = document.getElementById('final-currency');

            const participantNameInput = document.getElementById('participant-name');
            const addParticipantBtn = document.getElementById('add-participant');
            const participantsListDiv = document.getElementById('participants-list');
            const paidBySelect = document.getElementById('paid-by');
            const sharersListDiv = document.getElementById('sharers-list');
            const selectAllSharersCheckbox = document.getElementById('select-all-sharers');

            const expenseDescInput = document.getElementById('expense-description');
            const expenseAmountInput = document.getElementById('expense-amount');
            const addExpenseBtn = document.getElementById('add-expense');
            const expensesListDiv = document.getElementById('expenses-list');

            const calculateBtn = document.getElementById('calculate');
            const resetBtn = document.getElementById('reset-all');

            const resultsSection = document.getElementById('results-section');
            const summaryDiv = document.getElementById('summary');
            const transactionsDiv = document.getElementById('transactions');
            const printExpensesListDiv = document.getElementById('print-expenses-list');

            const modal = document.getElementById('modal');
            const modalMessage = document.getElementById('modal-message');
            const modalButtons = document.getElementById('modal-buttons');

            // --- Modal Functions ---
            function closeModal() {
                modal.classList.add('hidden');
            }

            function showModal(message, buttons) {
                modalMessage.textContent = message;
                modalButtons.innerHTML = '';

                if (!buttons || buttons.length === 0) {
                    buttons = [{ text: '好的', className: 'btn-primary', action: closeModal }];
                }

                buttons.forEach(btnInfo => {
                    const button = document.createElement('button');
                    button.textContent = btnInfo.text;
                    button.className = `btn ${btnInfo.className} px-6 py-2 rounded-lg`;
                    button.onclick = () => {
                        if (btnInfo.action) btnInfo.action();
                        if (btnInfo.action !== closeModal) closeModal();
                    };
                    modalButtons.appendChild(button);
                });

                modal.classList.remove('hidden');
            }

            // --- Core Functions ---
            function updateUI() {
                const initialUnit = initialCurrencyInput.value.trim() || '金额';

                // 1. Update participant tags
                participantsListDiv.innerHTML = participants.length === 0
                    ? '<p class="text-gray-400">暂无参与人员</p>'
                    : participants.map((p, index) => `
                        <div class="flex items-center bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1.5 rounded-full">
                            <span>${p}</span>
                            <button data-index="${index}" class="remove-participant ml-2 text-indigo-500 hover:text-indigo-700 focus:outline-none">&times;</button>
                        </div>`).join('');

                // 2. Update dropdowns and checkboxes
                paidBySelect.innerHTML = '<option value="">--请选择付款人--</option>';
                sharersListDiv.innerHTML = participants.length === 0
                    ? '<p class="text-gray-400">请先添加参与人员</p>'
                    : participants.map(p => `
                        <div class="flex items-center">
                            <input id="sharer-${p}" type="checkbox" value="${p}" class="custom-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 sharer-checkbox">
                            <label for="sharer-${p}" class="ml-3 block text-sm font-medium text-gray-700">${p}</label>
                        </div>`).join('');

                participants.forEach(p => paidBySelect.add(new Option(p, p)));
                paidBySelect.value = lastPayer;

                // 3. Update expense list
                expensesListDiv.innerHTML = expenses.length === 0
                    ? '<p class="text-gray-400 text-center pt-8">暂无账单</p>'
                    : expenses.map((expense, index) => `
                        <div class="bg-white p-3 rounded-lg border border-gray-200 relative">
                            <button data-index="${index}" class="remove-expense absolute top-1 right-1 text-red-400 hover:text-red-600 text-lg">&times;</button>
                            <p class="font-semibold text-gray-800">${expense.description}</p>
                            <p class="text-sm text-gray-600">金额: <span class="font-bold">${initialUnit} ${expense.amount.toFixed(2)}</span></p>
                            <p class="text-sm text-gray-500">付款人: ${expense.paidBy}</p>
                            <p class="text-xs text-gray-400 mt-1">分摊人: ${expense.sharers.join(', ')}</p>
                        </div>`).join('');

                // 4. Hide results
                resultsSection.classList.add('hidden');
            }

            function addParticipant() {
                const name = participantNameInput.value.trim();
                if (!name) {
                    showModal('请输入姓名！');
                    return;
                }
                if (participants.includes(name)) {
                    showModal('这个人已经添加过了！');
                    return;
                }
                participants.push(name);
                participantNameInput.value = '';
                updateUI();
            }

            function addExpense() {
                const description = expenseDescInput.value.trim();
                const amount = parseFloat(expenseAmountInput.value);
                const paidBy = paidBySelect.value;
                const selectedSharers = Array.from(sharersListDiv.querySelectorAll('.sharer-checkbox:checked')).map(cb => cb.value);

                if (!description || !amount || !paidBy || selectedSharers.length === 0) {
                    showModal('请填写完整的账单信息！');
                    return;
                }
                if (amount <= 0) {
                    showModal('金额必须是正数！');
                    return;
                }

                expenses.push({ description, amount, paidBy, sharers: selectedSharers });

                lastPayer = paidBySelect.value;

                expenseDescInput.value = '';
                expenseAmountInput.value = '';
                sharersListDiv.querySelectorAll('.sharer-checkbox').forEach(cb => cb.checked = false);
                selectAllSharersCheckbox.checked = false;

                updateUI();
            }

            function calculateAndDisplayResults() {
                if (participants.length < 2 || expenses.length === 0) {
                    showModal('请至少添加2名参与人员和1笔消费项目后再计算。');
                    return;
                }

                const balances = participants.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});

                expenses.forEach(expense => {
                    balances[expense.paidBy] += expense.amount;
                    const share = expense.amount / expense.sharers.length;
                    expense.sharers.forEach(sharer => {
                        balances[sharer] -= share;
                    });
                });

                const debtors = [];
                const creditors = [];
                Object.entries(balances).forEach(([person, amount]) => {
                    if (amount < -0.01) debtors.push({ name: person, amount });
                    else if (amount > 0.01) creditors.push({ name: person, amount });
                });

                const transactions = [];
                while (debtors.length > 0 && creditors.length > 0) {
                    debtors.sort((a, b) => a.amount - b.amount);
                    creditors.sort((a, b) => b.amount - a.amount);

                    const debtor = debtors[0];
                    const creditor = creditors[0];
                    const amountToTransfer = Math.min(-debtor.amount, creditor.amount);

                    transactions.push({
                        from: debtor.name,
                        to: creditor.name,
                        amount: amountToTransfer
                    });

                    debtor.amount += amountToTransfer;
                    creditor.amount -= amountToTransfer;

                    if (Math.abs(debtor.amount) < 0.01) debtors.shift();
                    if (Math.abs(creditor.amount) < 0.01) creditors.shift();
                }

                displayFullReport(transactions);
            }

            function displayFullReport(transactions) {
                const initialUnit = initialCurrencyInput.value.trim() || 'CNY';
                const rate = parseFloat(exchangeRateInput.value);
                const finalUnit = finalCurrencyInput.value.trim();

                const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

                let summaryText = `总共有 <span class="font-bold text-indigo-600">${participants.length}</span> 人参与, 总消费 <span class="font-bold text-indigo-600">${initialUnit} ${totalExpense.toFixed(2)}</span>。`;

                if (rate > 0 && finalUnit) {
                    const convertedTotal = totalExpense * rate;
                    summaryText += `<br>约合 <span class="font-bold text-indigo-600">${finalUnit} ${convertedTotal.toFixed(2)}</span>。`;
                }
                summaryText += `<p class="mt-1 font-semibold">最简转账方案如下:</p>`;
                summaryDiv.innerHTML = summaryText;

                printExpensesListDiv.innerHTML = expenses.map(expense => `
                    <div class="p-2 border-b">
                        <p><strong>说明:</strong> ${expense.description}</p>
                        <p><strong>金额:</strong> ${initialUnit} ${expense.amount.toFixed(2)}</p>
                        <p><strong>付款人:</strong> ${expense.paidBy}</p>
                        <p><strong>分摊人:</strong> ${expense.sharers.join(', ')}</p>
                    </div>`).join('');

                transactionsDiv.innerHTML = transactions.length === 0
                    ? '<p class="text-center text-green-600 font-semibold">完美! 大家都已结清。</p>'
                    : transactions.map(t => {
                        let amountDisplay;
                        if (rate > 0 && finalUnit) {
                            const convertedAmount = t.amount * rate;
                            amountDisplay = `<span class="font-bold text-indigo-600 text-lg">${finalUnit} ${convertedAmount.toFixed(2)}</span>
                                             <span class="text-sm text-gray-500 ml-2">(${initialUnit} ${t.amount.toFixed(2)})</span>`;
                        } else {
                            amountDisplay = `<span class="font-bold text-indigo-600 text-lg">${initialUnit} ${t.amount.toFixed(2)}</span>`;
                        }

                        return `
                        <div class="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                            <div class="flex items-center">
                                <span class="font-medium text-gray-800">${t.from}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                <span class="font-medium text-gray-800">${t.to}</span>
                            </div>
                            <div class="text-right">
                                ${amountDisplay}
                            </div>
                        </div>`;
                    }).join('');

                resultsSection.classList.remove('hidden');
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }

            // --- Event Listeners ---
            addParticipantBtn.addEventListener('click', addParticipant);
            participantNameInput.addEventListener('keypress', (e) => e.key === 'Enter' && addParticipant());
            addExpenseBtn.addEventListener('click', addExpense);
            calculateBtn.addEventListener('click', calculateAndDisplayResults);

            resetBtn.addEventListener('click', () => {
                showModal('确定要重置所有数据吗？此操作无法撤销。', [
                    {
                        text: '确定重置',
                        className: 'btn-danger',
                        action: () => {
                            participants = [];
                            expenses = [];
                            lastPayer = '';
                            initialCurrencyInput.value = '';
                            exchangeRateInput.value = '';
                            finalCurrencyInput.value = '';
                            updateUI();
                        }
                    },
                    { text: '取消', className: 'btn-secondary', action: closeModal }
                ]);
            });

            // Dynamic event listeners for lists
            participantsListDiv.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-participant')) {
                    participants.splice(parseInt(e.target.dataset.index, 10), 1);
                    updateUI();
                }
            });

            expensesListDiv.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-expense')) {
                    expenses.splice(parseInt(e.target.dataset.index, 10), 1);
                    updateUI();
                }
            });

            selectAllSharersCheckbox.addEventListener('change', (e) => {
                sharersListDiv.querySelectorAll('.sharer-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            });

            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) closeModal();
            });

            // --- Initial Load ---
            updateUI();
        });
