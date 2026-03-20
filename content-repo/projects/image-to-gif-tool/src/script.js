const GIF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js";

let generatedGifBlob = null;

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const resultContainer = document.getElementById("result-container");
const loader = document.getElementById("loader");
const output = document.getElementById("output");
const gifPreview = document.getElementById("gif-preview");
const downloadBtn = document.getElementById("download-btn");
const copyBtn = document.getElementById("copy-btn");
const errorMessage = document.getElementById("error-message");

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("border-blue-500", "bg-gray-50", "dark:bg-gray-800");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("border-blue-500", "bg-gray-50", "dark:bg-gray-800");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("border-blue-500", "bg-gray-50", "dark:bg-gray-800");
  const [file] = Array.from(event.dataTransfer?.files ?? []);
  if (file) {
    void handleFile(file);
  }
});

dropZone.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (event) => {
  const [file] = Array.from(event.target.files ?? []);
  if (file) {
    void handleFile(file);
  }
});

copyBtn.addEventListener("click", async () => {
  if (!generatedGifBlob || !navigator.clipboard?.write) {
    alert("复制失败！您的浏览器可能不支持该功能。");
    return;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/gif": generatedGifBlob })
    ]);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "已复制!";
    copyBtn.disabled = true;
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("无法将图片复制到剪贴板:", error);
    alert("复制失败，请检查浏览器权限或手动下载。");
  }
});

async function handleFile(file) {
  resetUI();
  resultContainer.classList.remove("hidden");
  loader.classList.remove("hidden");

  try {
    const imageDataUrl = await readImageDataUrl(file);
    await convertToGif(imageDataUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "文件处理失败，请重试。";
    showError(message);
  }
}

async function readImageDataUrl(file) {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".heic") || fileName.endsWith(".heif")) {
    const converted = await heic2any({ blob: file, toType: "image/png" });
    return blobToDataURL(Array.isArray(converted) ? converted[0] : converted);
  }

  if (fileType === "image/webp") {
    const arrayBuffer = await file.arrayBuffer();
    const webp = new WebP();
    const canvas = await webp.decode(arrayBuffer);
    return canvas.toDataURL("image/png");
  }

  if (fileType === "image/png" || fileType === "image/jpeg") {
    return blobToDataURL(file);
  }

  throw new Error("不支持的文件格式。请上传 PNG, JPG, HEIC, 或 WEBP。");
}

async function convertToGif(imageDataUrl) {
  const image = new Image();
  image.src = imageDataUrl;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: image.width,
    height: image.height,
    workerScript: GIF_WORKER_URL
  });

  gif.addFrame(image, { delay: 200 });
  gif.on("finished", async (blob) => {
    generatedGifBlob = blob;
    const dataUrl = await blobToDataURL(blob);
    gifPreview.src = dataUrl;
    downloadBtn.href = dataUrl;
    loader.classList.add("hidden");
    output.classList.remove("hidden");
  });
  gif.render();
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function resetUI() {
  resultContainer.classList.add("hidden");
  loader.classList.add("hidden");
  output.classList.add("hidden");
  errorMessage.classList.add("hidden");
  errorMessage.textContent = "";
  gifPreview.src = "";
  downloadBtn.href = "#";
  generatedGifBlob = null;
}

function showError(message) {
  loader.classList.add("hidden");
  output.classList.add("hidden");
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}
