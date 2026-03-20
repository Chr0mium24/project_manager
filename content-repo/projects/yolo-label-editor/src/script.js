const openDirBtn = document.getElementById('openDirBtn');
        const fileTableBody = document.getElementById('fileTableBody');
        const folderPath = document.getElementById('folderPath');
        const statusDiv = document.getElementById('status');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');

        const replaceSelectedBtn = document.getElementById('replaceSelectedBtn');
        const replaceSelectedInput = document.getElementById('replaceSelectedInput');

        const replaceSpecificBtn = document.getElementById('replaceSpecificBtn');
        const replaceSpecificOld = document.getElementById('replaceSpecificOld');
        const replaceSpecificNew = document.getElementById('replaceSpecificNew');

        const allControls = [replaceSelectedBtn, replaceSelectedInput, replaceSpecificBtn, replaceSpecificOld, replaceSpecificNew];

        let fileHandles = [];

        // 统一设置控件的禁用状态
        function setControlsDisabled(disabled) {
            openDirBtn.disabled = disabled;
            allControls.forEach(control => control.disabled = disabled);
        }
        setControlsDisabled(true); // 初始时禁用，直到选择文件夹

        // 打开文件夹并读取文件
        openDirBtn.addEventListener('click', async () => {
            try {
                // 1. 开始加载，禁用所有操作
                setControlsDisabled(true);
                fileTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-12 text-center text-gray-400">正在扫描文件夹...</td></tr>';
                statusDiv.textContent = '正在扫描文件夹...';
                statusDiv.className = 'text-sm text-blue-600 font-medium';
                folderPath.textContent = '';
                selectAllCheckbox.checked = false;

                const dirHandle = await window.showDirectoryPicker();

                // 2. 开始建立内部文件列表
                fileHandles = [];
                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
                        fileHandles.push(entry);
                    }
                }

                // 3. 渲染表格
                await renderTable();

                // 4. 加载完成，恢复操作
                folderPath.textContent = `当前文件夹: ${dirHandle.name}`;
                statusDiv.textContent = `已加载 ${fileHandles.length} 个标签文件。`;
                statusDiv.className = 'text-sm text-green-600 font-medium';
                setControlsDisabled(false);

            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error opening directory:', err);
                    statusDiv.textContent = '无法打开文件夹。';
                    statusDiv.className = 'text-sm text-red-600 font-medium';
                } else {
                    statusDiv.textContent = '已取消选择文件夹。';
                    statusDiv.className = 'text-sm text-gray-500 font-medium';
                }
                 // 如果之前有数据，则恢复按钮可用状态
                setControlsDisabled(fileHandles.length === 0);
            }
        });

        // 渲染表格
        async function renderTable() {
            if (fileHandles.length === 0) {
                 fileTableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-12 text-center text-gray-400">未找到 .txt 标签文件。</td></tr>';
                 return;
            }

            fileTableBody.innerHTML = ''; // 清空表格

            for (const handle of fileHandles) {
                try {
                    const file = await handle.getFile();
                    const text = await file.text();
                    const lines = text.trim().split('\n');
                    const labels = lines.map(line => line.split(' ')[0]).filter(Boolean); // 获取每行的第一个数字作为label
                    const uniqueLabels = [...new Set(labels)];

                    const row = document.createElement('tr');
                    row.className = 'border-b hover:bg-gray-50';
                    row.innerHTML = `
                        <td class="w-4 p-4">
                            <div class="flex items-center">
                                <input type="checkbox" class="file-checkbox w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500" data-filename="${handle.name}">
                            </div>
                        </td>
                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${handle.name}</th>
                        <td class="px-6 py-4">${uniqueLabels.join(', ')}</td>
                    `;
                    fileTableBody.appendChild(row);
                } catch (e) {
                     console.error(`Error reading file ${handle.name}:`, e);
                }
            }
        }

        // 全选/取消全选
        selectAllCheckbox.addEventListener('change', (e) => {
            document.querySelectorAll('.file-checkbox').forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });

        // 获取选中的文件句柄
        function getSelectedFileHandles() {
            const selectedFiles = [];
            document.querySelectorAll('.file-checkbox:checked').forEach(checkbox => {
                const filename = checkbox.dataset.filename;
                const handle = fileHandles.find(h => h.name === filename);
                if (handle) {
                    selectedFiles.push(handle);
                }
            });
            return selectedFiles;
        }

        // 功能一: 替换选中文件的标签
        replaceSelectedBtn.addEventListener('click', async () => {
            const newLabel = replaceSelectedInput.value;
            if (newLabel.trim() === '') {
                alert('请输入新的标签ID。'); return;
            }
            const selectedHandles = getSelectedFileHandles();
            if (selectedHandles.length === 0) {
                alert('请至少选择一个文件。'); return;
            }

            setControlsDisabled(true);
            statusDiv.textContent = `正在处理 ${selectedHandles.length} 个文件...`;
            statusDiv.className = 'text-sm text-blue-600 font-medium';

            for (const handle of selectedHandles) {
                try {
                    const file = await handle.getFile();
                    const text = await file.text();
                    const lines = text.trim().split('\n').filter(Boolean);

                    const newContent = lines.map(line => {
                        const parts = line.split(' ');
                        if (parts.length > 1) { parts[0] = newLabel; return parts.join(' '); }
                        return line;
                    }).join('\n');

                    const writable = await handle.createWritable();
                    await writable.write(newContent);
                    await writable.close();
                } catch (err) { console.error(`无法更新文件 ${handle.name}:`, err); }
            }

            statusDiv.textContent = `${selectedHandles.length} 个文件已成功更新！`;
            statusDiv.className = 'text-sm text-green-600 font-medium';
            await renderTable();
            setControlsDisabled(false);
        });

        // 功能二: 替换指定的标签
        replaceSpecificBtn.addEventListener('click', async () => {
            const oldLabel = replaceSpecificOld.value;
            const newLabel = replaceSpecificNew.value;
            if (oldLabel.trim() === '' || newLabel.trim() === '') {
                alert('请输入旧的标签ID和新的标签ID。'); return;
            }
            if (fileHandles.length === 0) {
                 alert('请先加载一个文件夹。'); return;
            }

            setControlsDisabled(true);
            statusDiv.textContent = `正在所有文件中查找标签 ${oldLabel} 并替换为 ${newLabel}...`;
            statusDiv.className = 'text-sm text-blue-600 font-medium';

            let modifiedFileCount = 0;
            for (const handle of fileHandles) {
                try {
                    const file = await handle.getFile();
                    const text = await file.text();
                    const lines = text.trim().split('\n').filter(Boolean);
                    let fileModified = false;

                    const newContent = lines.map(line => {
                        const parts = line.split(' ');
                        if (parts[0] === oldLabel) {
                            parts[0] = newLabel;
                            fileModified = true;
                            return parts.join(' ');
                        }
                        return line;
                    }).join('\n');

                    if (fileModified) {
                        const writable = await handle.createWritable();
                        await writable.write(newContent);
                        await writable.close();
                        modifiedFileCount++;
                    }
                } catch (err) { console.error(`处理文件 ${handle.name} 时出错:`, err); }
            }

            statusDiv.textContent = `${modifiedFileCount} 个文件中的标签已成功更新！`;
            statusDiv.className = 'text-sm text-green-600 font-medium';
            await renderTable();
            setControlsDisabled(false);
        });

        // 初始页面加载时，除了“选择文件夹”按钮，其他都是禁用的
        openDirBtn.disabled = false;
