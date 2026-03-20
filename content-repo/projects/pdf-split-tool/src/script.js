const { PDFDocument } = PDFLib;

        let currentPdfBytes = null;
        let totalPages = 0;
        let originalFilename = "document";

        const uploadInput = document.getElementById('pdf-upload');
        const previewIframe = document.getElementById('pdf-preview');
        const pageInfo = document.getElementById('page-info');
        const splitBtn = document.getElementById('split-btn');
        const rangesInput = document.getElementById('ranges-input');
        const statusMsg = document.getElementById('status-msg');

        // 1. 处理文件上传与预览
        uploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            originalFilename = file.name.replace(/\.[^/.]+$/, ""); // 移除后缀名
            statusMsg.innerText = "正在加载文件...";

            try {
                // 读取文件内容
                const arrayBuffer = await file.arrayBuffer();
                currentPdfBytes = new Uint8Array(arrayBuffer);

                // 使用 pdf-lib 加载文档以获取页数
                const pdfDoc = await PDFDocument.load(currentPdfBytes);
                totalPages = pdfDoc.getPageCount();
                pageInfo.innerText = `已加载: ${file.name} (共 ${totalPages} 页)`;

                // 使用 Blob URL 预览 PDF
                const blob = new Blob([currentPdfBytes], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                previewIframe.src = blobUrl;

                splitBtn.disabled = false;
                statusMsg.innerText = "";
            } catch (error) {
                console.error(error);
                statusMsg.style.color = "red";
                statusMsg.innerText = "加载 PDF 失败，请确保文件未损坏且未加密。";
            }
        });

        // 2. 解析用户输入的页码范围
        // 输入: "1-3, 5", 输出: [0, 1, 2, 4] (转换为从 0 开始的索引，并去重排序)
        function parseRange(rangeStr, maxPages) {
            const pageIndices = new Set();
            const parts = rangeStr.split(',');

            for (let part of parts) {
                part = part.trim();
                if (!part) continue;

                if (part.includes('-')) {
                    const [startStr, endStr] = part.split('-');
                    const start = parseInt(startStr);
                    const end = parseInt(endStr);

                    if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) {
                            if (i >= 1 && i <= maxPages) {
                                pageIndices.add(i - 1);
                            }
                        }
                    }
                } else {
                    const num = parseInt(part);
                    if (!isNaN(num) && num >= 1 && num <= maxPages) {
                        pageIndices.add(num - 1);
                    }
                }
            }
            // 转换为数组并升序排序
            return Array.from(pageIndices).sort((a, b) => a - b);
        }

        // 3. 触发下载
        function downloadFile(bytes, filename) {
            const blob = new Blob([bytes], { type: "application/pdf" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // 4. 执行拆分逻辑
        splitBtn.addEventListener('click', async () => {
            if (!currentPdfBytes) return;

            const text = rangesInput.value.trim();
            if (!text) {
                alert("请输入需要拆分的页码范围！");
                return;
            }

            const lines = text.split('\n');
            statusMsg.style.color = "#2e7d32";
            statusMsg.innerText = "正在拆分并导出...";
            splitBtn.disabled = true;

            try {
                // 加载原始文档
                const sourcePdf = await PDFDocument.load(currentPdfBytes);

                let exportedCount = 0;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const indicesToCopy = parseRange(line, totalPages);

                    if (indicesToCopy.length === 0) {
                        console.warn(`跳过无效行: ${line}`);
                        continue;
                    }

                    // 创建新文档并拷贝指定页面
                    const newPdf = await PDFDocument.create();
                    const copiedPages = await newPdf.copyPages(sourcePdf, indicesToCopy);

                    copiedPages.forEach((page) => newPdf.addPage(page));

                    // 保存并下载
                    const newPdfBytes = await newPdf.save();
                    const safeLineName = line.replace(/[^a-zA-Z0-9,-]/g, '_');
                    const newFilename = `${originalFilename}_${safeLineName}.pdf`;

                    downloadFile(newPdfBytes, newFilename);
                    exportedCount++;
                }

                if (exportedCount > 0) {
                    statusMsg.innerText = `✅ 成功导出 ${exportedCount} 个 PDF 文件！`;
                } else {
                    statusMsg.style.color = "red";
                    statusMsg.innerText = "未找到有效的页码范围，请检查输入格式。";
                }

            } catch (error) {
                console.error(error);
                statusMsg.style.color = "red";
                statusMsg.innerText = "拆分过程中发生错误。";
            } finally {
                splitBtn.disabled = false;
            }
        });
