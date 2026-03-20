let html5QrCode;
      let refreshTimer = null; // 用于高频刷新的定时器
      let isScanning = false;
      let lastGeneratedToken = ""; // 记录上一次生成的Token，防止重复渲染

      // --- 初始化与路由 ---
      window.addEventListener("load", handleRouting);
      window.addEventListener("hashchange", handleRouting);

      function handleRouting() {
        const params = getHashParams();
        if (params.id && params.dataId) {
          showGenerateView(params);
        } else {
          showScanView();
        }
      }

      // --- 视图切换 ---
      function showScanView() {
        document.getElementById("scan-view").style.display = "block";
        document.getElementById("generate-view").style.display = "none";
        stopDynamicRefresh();
        stopCamera();
      }

      function showGenerateView(params) {
        document.getElementById("scan-view").style.display = "none";
        document.getElementById("generate-view").style.display = "block";
        stopCamera();

        // 生成静态详情码
        const staticUrl = `https://cesp.cuhk.edu.cn/qrcode?hkuType=${params.hkuType}&scene=lectureDetail&lectureId=${params.id}`;
        renderQr("static-qrcode", staticUrl);

        // 启动动态刷新
        startDynamicRefresh(params);
      }

      // --- 扫描相关逻辑 ---
      async function startCamera() {
        if (isScanning) return;

        const readerDiv = document.getElementById("reader");
        readerDiv.classList.add("active");

        document.getElementById("btn-start-scan").style.display = "none";
        document.getElementById("btn-stop-scan").style.display = "block";

        if (!html5QrCode) {
          html5QrCode = new Html5Qrcode("reader");
        }

        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess,
          );
          isScanning = true;
        } catch (err) {
          console.error(err);
          alert("摄像头启动失败，请确保授予权限或使用HTTPS协议。");
          stopCamera();
        }
      }

      function stopCamera() {
        if (html5QrCode && isScanning) {
          html5QrCode
            .stop()
            .then(() => {
              html5QrCode.clear();
              isScanning = false;
              document.getElementById("reader").classList.remove("active");
              document.getElementById("btn-start-scan").style.display = "block";
              document.getElementById("btn-stop-scan").style.display = "none";
            })
            .catch((err) => console.log("停止失败", err));
        }
      }

      function onScanSuccess(decodedText) {
        try {
          const url = new URL(decodedText);
          const p = new URLSearchParams(url.search);
          if (p.get("scene") === "signInOut") {
            // [新增] 获取当前时间作为 startTime，确保后续生成基于此时间点
            const now = Date.now();
            const newHash = `hkuType=${p.get("hkuType")}&dataId=${p.get("dataId")}&id=${p.get("id")}&startTime=${now}`;
            window.location.hash = newHash;
          } else {
            alert("识别成功，但不是有效的动态签到码 (scene!=signInOut)");
          }
        } catch (e) {
          alert("无效的链接: " + decodedText);
        }
      }

      // --- 文件/粘贴/拖拽识别核心 ---
      function scanImageFile(file) {
        if (!file) return;
        const scanner = new Html5Qrcode("reader");
        scanner
          .scanFile(file, true)
          .then((decodedText) => {
            onScanSuccess(decodedText);
          })
          .catch((err) => {
            alert("无法识别图片中的二维码，请确保图片清晰且包含完整二维码。");
            console.error(err);
          });
      }

      document.getElementById("file-input").addEventListener("change", (e) => {
        if (e.target.files.length > 0) scanImageFile(e.target.files[0]);
      });

      document.addEventListener("paste", (e) => {
        if (document.getElementById("scan-view").style.display === "none")
          return;
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            scanImageFile(item.getAsFile());
            e.preventDefault();
            return;
          }
        }
      });

      const dragOverlay = document.getElementById("drag-overlay");
      let dragCounter = 0;

      window.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dragCounter++;
        if (document.getElementById("scan-view").style.display !== "none") {
          dragOverlay.style.display = "flex";
        }
      });

      window.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
          dragOverlay.style.display = "none";
        }
      });

      window.addEventListener("dragover", (e) => e.preventDefault());

      window.addEventListener("drop", (e) => {
        e.preventDefault();
        dragCounter = 0;
        dragOverlay.style.display = "none";
        if (document.getElementById("scan-view").style.display === "none")
          return;
        if (e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            scanImageFile(file);
          } else {
            alert("请拖入动态二维码图片文件");
          }
        }
      });

      // --- 生成逻辑 (核心修改区) ---
      function renderQr(elementId, text) {
        const container = document.getElementById(elementId);
        container.innerHTML = "";
        new QRCode(container, {
          text: text,
          width: 180,
          height: 180,
          correctLevel: QRCode.CorrectLevel.L,
        });
      }

      function startDynamicRefresh(params) {
        const container = document.getElementById("dynamic-qrcode");
        const tokenText = document.getElementById("token-text");
        const progressBar = document.getElementById("token-progress");
        const warningBox = document.getElementById("legacy-warning");

        // 1. 确定基准时间
        let baseTime;
        if (params.startTime) {
          baseTime = parseInt(params.startTime);
          warningBox.style.display = "none"; // 隐藏警告
        } else {
          // 降级处理：没有startTime参数
          baseTime = Date.now();
          warningBox.style.display = "block"; // 显示警告
        }

        lastGeneratedToken = ""; // 重置状态

        // 2. 启动高频检测 (每50ms运行一次，保证进度条平滑且Token切换精准)
        if (refreshTimer) clearInterval(refreshTimer);

        refreshTimer = setInterval(() => {
          const now = Date.now();
          // 计算距离基准时间过去了多少毫秒
          const elapsed = now - baseTime;
          // 防止时间回调导致负数 (虽然极少见)
          const validElapsed = Math.max(0, elapsed);

          // A. 进度条计算
          // 取余数：在当前的 5s 周期内跑了多少毫秒
          const remainder = validElapsed % 5000;
          const percent = (remainder / 5000) * 100;
          progressBar.style.width = percent + "%";

          // B. Token 计算
          // 计算当前是第几个 5s 周期
          const steps = Math.floor(validElapsed / 5000);
          // 当前周期对应的目标 Token 时间戳
          const currentTokenTime = baseTime + steps * 5000;
          // 转 36 进制
          const token = currentTokenTime.toString(36);

          // C. 只有当 Token 发生变化时才重新渲染 QR
          if (token !== lastGeneratedToken) {
            const dynamicUrl = `https://cesp.cuhk.edu.cn/qrcode?scene=signInOut&hkuType=${params.hkuType}&dataId=${params.dataId}&id=${params.id}&token=${token}`;

            container.innerHTML = "";
            new QRCode(container, {
              text: dynamicUrl,
              width: 180,
              height: 180,
              correctLevel: QRCode.CorrectLevel.L,
            });

            // 格式化时间显示
            const d = new Date(currentTokenTime);
            const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;

            tokenText.innerText = `Token: ${token} (${timeStr})`;
            lastGeneratedToken = token;
          }
        }, 50); // 50ms 刷新率
      }

      function stopDynamicRefresh() {
        if (refreshTimer) {
          clearInterval(refreshTimer);
          refreshTimer = null;
        }
        document.getElementById("token-progress").style.width = "0%";
      }

      // --- 工具函数 ---
      function getHashParams() {
        const hash = window.location.hash.substring(1);
        const params = {};
        if (!hash) return params;
        hash.split("&").forEach((pair) => {
          const [key, value] = pair.split("=");
          if (key) params[key] = value;
        });
        return params;
      }

      function resetScan() {
        window.location.hash = "";
      }

      function copyCurrentUrl() {
        navigator.clipboard.writeText(window.location.href).then(() => {
          alert("✅ 链接已复制！(包含初始时间参数)");
        });
      }
