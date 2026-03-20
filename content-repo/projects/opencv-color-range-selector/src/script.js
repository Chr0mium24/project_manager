let cvReady = false;
        const loader = document.getElementById('loader');

        function onOpenCvReady() {
            cvReady = true;
            loader.style.display = 'none';
            main();
        }

        function main() {
            // --- DOM Elements ---
            const imageUpload = document.getElementById('imageUpload');
            const originalCanvas = document.getElementById('originalCanvas');
            const maskCanvas = document.getElementById('maskCanvas');
            const originalPlaceholder = document.getElementById('original-placeholder');
            const maskPlaceholder = document.getElementById('mask-placeholder');
            const slidersContainer = document.getElementById('sliders-container');
            const pythonCode = document.getElementById('python-code');
            const copyBtn = document.getElementById('copy-code-btn');
            const colorPicker = document.getElementById('colorPicker');
            const colorValuesEl = document.getElementById('color-values');
            const modeRadios = document.querySelectorAll('input[name="colorMode"]');

            // --- State ---
            let currentMode = 'hsv';
            let originalImage = null;
            let sliders = [];
            let ranges = {
                hsv: {
                    h: { min: 0, max: 179 },
                    s: { min: 0, max: 255 },
                    v: { min: 0, max: 255 }
                },
                lab: {
                    l: { min: 0, max: 255 },
                    a: { min: 0, max: 255 },
                    b: { min: 0, max: 255 }
                }
            };
            let currentValues = {};

            // --- Color Conversion Functions ---
            function hexToRgb(hex) {
                let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : null;
            }

            function rgbToHsv(r, g, b) {
                r /= 255; g /= 255; b /= 255;
                let max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h, s, v = max;
                let d = max - min;
                s = max === 0 ? 0 : d / max;
                if (max === min) {
                    h = 0;
                } else {
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }
                return { h: Math.round(h * 179), s: Math.round(s * 255), v: Math.round(v * 255) };
            }

            function rgbToLab(r, g, b) {
                r /= 255; g /= 255; b /= 255;
                r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
                g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
                b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
                r *= 100; g *= 100; b *= 100;

                let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
                let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
                let z = r * 0.0193 + g * 0.1192 + b * 0.9505;

                x /= 95.047; y /= 100.000; z /= 108.883;
                x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
                y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
                z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

                let L = (116 * y) - 16;
                let a = 500 * (x - y);
                let b_ = 200 * (y - z);

                let L_out = Math.round(L * 255 / 100);
                let a_out = Math.round(a + 128);
                let b_out = Math.round(b_ + 128);

                return { l: L_out, a: a_out, b: b_out };
            }


            // --- Core Functions ---
            function createSliders() {
                slidersContainer.innerHTML = '';
                sliders = [];
                currentValues = {}; // FIX: Reset current values on mode change
                const channels = currentMode === 'hsv' ? ['H', 'S', 'V'] : ['L', 'A', 'B'];
                const keys = currentMode === 'hsv' ? ['h', 's', 'v'] : ['l', 'a', 'b'];

                channels.forEach((channel, i) => {
                    const key = keys[i];
                    const range = ranges[currentMode][key];

                    const row = document.createElement('div');
                    row.className = 'row align-items-center mb-3';

                    const labelCol = document.createElement('div');
                    labelCol.className = 'col-md-2';
                    labelCol.innerHTML = `<label class="slider-label">${channel} Range:</label>`;

                    const sliderCol = document.createElement('div');
                    sliderCol.className = 'col-md-8';
                    const sliderEl = document.createElement('div');
                    sliderCol.appendChild(sliderEl);

                    const valueCol = document.createElement('div');
                    valueCol.className = 'col-md-2';
                    valueCol.innerHTML = `<span id="${key}-value" class="fw-bold" style="font-family: monospace;"></span>`;

                    row.appendChild(labelCol);
                    row.appendChild(sliderCol);
                    row.appendChild(valueCol);
                    slidersContainer.appendChild(row);

                    const slider = noUiSlider.create(sliderEl, {
                        start: [range.min, range.max],
                        connect: true,
                        step: 1,
                        range: { 'min': range.min, 'max': range.max },
                        format: { to: value => Math.round(value), from: value => Number(value) }
                    });

                    sliders.push({ key: key, instance: slider, valueEl: document.getElementById(`${key}-value`) });

                    slider.on('update', (values) => {
                        currentValues[key] = { min: values[0], max: values[1] };
                        document.getElementById(`${key}-value`).textContent = `[${values[0]}, ${values[1]}]`;
                        processImage();
                        updateCode();
                    });
                });
            }

            function processImage() {
    if (!originalImage || !cvReady || Object.keys(currentValues).length !== 3) {
        return;
    }

    // 声明所有将要创建的 Mat 对象
    let src, dst, temp, lower, upper;
    try {
        src = cv.imread(originalImage);
        dst = new cv.Mat();
        temp = new cv.Mat();

        // 转换色彩空间
        cv.cvtColor(src, temp, cv.COLOR_RGBA2BGR);
        const finalConversionCode = currentMode === 'hsv' ? cv.COLOR_BGR2HSV : cv.COLOR_BGR2Lab;
        cv.cvtColor(temp, temp, finalConversionCode);

        const keys = Object.keys(currentValues);

        // --- 错误修复 START ---
        // 使用 1x3 的 Mat 作为边界向量，类型为 CV_8U
        const lowerValues = [currentValues[keys[0]].min, currentValues[keys[1]].min, currentValues[keys[2]].min];
        const upperValues = [currentValues[keys[0]].max, currentValues[keys[1]].max, currentValues[keys[2]].max];

        lower = cv.matFromArray(1, 3, cv.CV_8U, lowerValues);
        upper = cv.matFromArray(1, 3, cv.CV_8U, upperValues);
        // --- 错误修复 END ---

        cv.inRange(temp, lower, upper, dst);

        cv.imshow('maskCanvas', dst);
        maskPlaceholder.style.display = 'none';

    } catch (err) {
        console.error("OpenCV Error: ", err);
        // 你可以在这里向用户显示一个友好的错误提示
    } finally {
        // 确保所有创建的 Mat 都被删除，防止内存泄漏
        if (src) src.delete();
        if (dst) dst.delete();
        if (temp) temp.delete();
        if (lower) lower.delete(); // 新增
        if (upper) upper.delete(); // 新增
    }
}

            function updateCode() {
                if (Object.keys(currentValues).length !== 3) {
                    pythonCode.textContent = "# 等待滑块值...";
                    return;
                }
                const keys = currentMode === 'hsv' ? ['h', 's', 'v'] : ['l', 'a', 'b'];
                const lower = `[${currentValues[keys[0]].min}, ${currentValues[keys[1]].min}, ${currentValues[keys[2]].min}]`;
                const upper = `[${currentValues[keys[0]].max}, ${currentValues[keys[1]].max}, ${currentValues[keys[2]].max}]`;
                const conversion = currentMode === 'hsv' ? 'cv2.COLOR_BGR2HSV' : 'cv2.COLOR_BGR2LAB';

                const code = `
import cv2
import numpy as np

# 读取图片
# image = cv2.imread('your_image.jpg')

# 将图片从 BGR 转换到 ${currentMode.toUpperCase()} 色彩空间
converted_frame = cv2.cvtColor(image, ${conversion})

# 定义 ${currentMode.toUpperCase()} 中的颜色范围
lower_bound = np.array(${lower})
upper_bound = np.array(${upper})

# 根据颜色范围创建遮罩
mask = cv2.inRange(converted_frame, lower_bound, upper_bound)

# (可选) 将遮罩应用到原图
# result = cv2.bitwise_and(image, image, mask=mask)

# 显示遮罩
# cv2.imshow('Mask', mask)
# cv2.waitKey(0)
# cv2.destroyAllWindows()
`;
                pythonCode.textContent = code.trim();
            }

            function loadImage(src) {
                const img = new Image();
                img.onload = () => {
                    originalImage = img;
                    const ctx = originalCanvas.getContext('2d');
                    originalCanvas.width = img.width;
                    originalCanvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    originalPlaceholder.style.display = 'none';
                    processImage();
                };
                img.src = src;
            }

            function handleImageUpload(event) {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => loadImage(e.target.result);
                    reader.readAsDataURL(file);
                }
            }

            function handlePaste(event) {
                const items = (event.clipboardData || event.originalEvent.clipboardData).items;
                for (let item of items) {
                    if (item.type.indexOf('image') === 0) {
                        const blob = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = (e) => loadImage(e.target.result);
                        reader.readAsDataURL(blob);
                        event.preventDefault();
                        break;
                    }
                }
            }

            function updateColorPickerValues(hex) {
                const rgb = hexToRgb(hex);
                if (rgb) {
                    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
                    colorValuesEl.innerHTML = `
                        RGB: (${rgb.r}, ${rgb.g}, ${rgb.b})<br>
                        HSV: (${hsv.h}, ${hsv.s}, ${hsv.v})<br>
                        LAB: (${lab.l}, ${lab.a}, ${lab.b})
                    `;
                }
            }

            // --- Event Listeners ---
            imageUpload.addEventListener('change', handleImageUpload);
            window.addEventListener('paste', handlePaste);

            modeRadios.forEach(radio => {
                radio.addEventListener('change', (event) => {
                    currentMode = event.target.value;
                    createSliders();
                });
            });

            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(pythonCode.textContent).then(() => {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '已复制!';
                    copyBtn.classList.remove('btn-outline-light');
                    copyBtn.classList.add('btn-success');
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.classList.remove('btn-success');
                        copyBtn.classList.add('btn-outline-light');
                    }, 2000);
                });
            });

            colorPicker.addEventListener('input', (event) => {
                updateColorPickerValues(event.target.value);
            });

            // --- Initial Setup ---
            createSliders();
            updateColorPickerValues(colorPicker.value);
        }
