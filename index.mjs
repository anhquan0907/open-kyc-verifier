let KycVerifier, ReVerifier;

if (typeof window !== 'undefined') {
    KycVerifier = class extends HTMLElement {
    static get observedAttributes() {
        return ['api-key'];
    }

    constructor() {
        super();
        this.apiKey = '';
        this.attachShadow({ mode: 'open' });

        // Global Variables & Config
        this.API_URL = 'https://open-kyc.ziang.me/api/v3/dverif/kyc';
        this.FACE_CASCADE_URL = 'https://open-kyc.ziang.me/Lib/v1.0/plug-in.xml';

        this.currentStep = 1;
        this.cameraStream = null;
        this.validationIntervalId = null;
        this.isCvReady = false;
        this.faceClassifier;

        this.capturedImages = {
            idFront: null,
            portrait: null
        };
        this.faceCascadeLoaded = false;
        this.hasInitialized = false;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    max-width: 400px;
                    min-height: 50px;
                    margin: 0 auto;
                    background: #fff;
                    padding: 16px;
                    border-radius: 20px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    box-sizing: border-box;
                }

                /* 🌐 Mobile */
                @media (max-width: 600px) {
                    :host {
                        padding: 10px;
                        border-radius: 20px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                        max-width: 100%;
                        margin: 0;
                        min-height: 500px;
                    }
                }

                h2 {
                    color: #007bff;
                    text-align: center;
                    font-size: 1.6em;
                    margin-top: 0;
                    margin-bottom: 25px;
                }

                /* --- Step Indicator --- */
                .step-indicator {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    position: relative;
                }
                .step-indicator::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 15%;
                    right: 15%;
                    height: 3px;
                    background-color: #dee2e6;
                    transform: translateY(-50%);
                    z-index: 1;
                }
                .step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    font-weight: bold;
                    font-size: 0.9em;
                    color: #6c757d;
                    transition: all 0.3s;
                    position: relative;
                    z-index: 2;
                    background-color: #fff;
                    padding: 0 10px;
                }
                .step .step-circle {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background-color: #dee2e6;
                    color: #6c757d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                    border: 3px solid #dee2e6;
                    transition: all 0.3s;
                }
                .step.active { color: #007bff; }
                .step.active .step-circle {
                    background-color: #fff;
                    border-color: #007bff;
                    color: #007bff;
                }
                .step.completed .step-circle {
                     background-color: #007bff;
                     border-color: #007bff;
                     color: #fff;
                }

                .step-content { min-height: 420px; }

                /* --- Camera/Preview Styles --- */
                .camera-box {
                    position: relative;
                    width: 100%;
                    height: 250px;
                    margin: 15px auto 10px;
                    border-radius: 12px;
                    overflow: hidden;
                    background-color: #111;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .portrait-box {
                    width: 85%;
                    height: 300px;
                }
                .camera-box video, .camera-box .captured-preview {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .camera-box canvas.overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }

                video::-webkit-media-controls { display: none !important; }
                video::-webkit-media-controls-enclosure { display: none !important; }

                /* --- Button Styles --- */
                .button-group {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    margin-top: 15px;
                }
                .action-button {
                    padding: 14px 20px;
                    border: none;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    width: 100%;
                }
                .modal-icon.success { color: var(--success-color); }
                .modal-icon.error { color: var(--danger-color); }
                .btn-primary { background-color: #007bff; color: white; }
                .btn-primary:hover:not(:disabled) { background-color: #0056b3; }
                .btn-success { background-color: #28a745; color: white; }
                .btn-success:hover:not(:disabled) { background-color: #218838; }
                .btn-secondary { background-color: #6c757d; color: white; }
                .btn-secondary:hover { background-color: #5a6268; }
                .action-button:disabled { background-color: #ccc; cursor: not-allowed; opacity: 0.7; }

                .capture-btn {
                    display: block;
                    margin: 0 auto;
                    width: 60px;
                    height: 60px;
                    padding: 0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* --- Validation Message Style --- */
                .validation-message {
                    text-align: center;
                    padding: 12px;
                    border-radius: 6px;
                    font-weight: 500;
                    margin: 5px 0;
                    min-height: 20px;
                    transition: all 0.3s ease;
                    display: block;
                }
                .validation-message.error {
                    color: #dc3545;
                }
                .validation-message.success {
                    color: #28a745;
                }

                /* --- Result & Loading Styles --- */
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 380px;
                }
                .loading-spinner {
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #007bff;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 15px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* --- Result Screen --- */
                .result-screen {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 20px 0;
                    min-height: 380px;
                }
                .result-screen h3 { font-size: 1.8em; margin: 15px 0 10px; }
                .result-screen p { font-size: 1.1em; color: #6c757d; margin-bottom: 30px; }
                .result-screen.success h3 { color: #28a745; }
                .result-screen.error h3 { color: #dc3545; }
                .result-icon { width: 100px; height: 100px; }
            </style>

            <h2>(OPEN KYC)</h2>

            <div class="step-indicator">
                <div class="step active" id="step1-indicator">
                      <div class="step-circle">1</div>Thẻ
                </div>
                <div class="step" id="step2-indicator">
                      <div class="step-circle">2</div>Khuôn Mặt
                </div>
                <div class="step" id="step3-indicator">
                      <div class="step-circle">3</div>Xác Thực
                </div>
            </div>

            <div id="step-container" class="step-content">
            </div>

            <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #6c757d;">Powered by Ziang</div>
        `;

        this.init();
    }

    async init() {
        if (!this.hasInitialized) {
            this.hasInitialized = true;
            // Load OpenCV if not already loaded
            if (typeof window !== 'undefined') {
                if (!window.cv) {
                    // Remove existing script if any
                    const existingScript = document.querySelector('script[src*="mainxls.js"]');
                    if (existingScript) {
                        existingScript.remove();
                    }
                    // Load OpenCV.js
                    const script = document.createElement('script');
                    script.src = 'https://open-kyc.ziang.me/Lib/v1.0/js/mainxls.js';
                    script.async = true;
                    script.onload = () => this.onOpenCvReady();
                    document.head.appendChild(script);
                } else {
                    // OpenCV already loaded, proceed
                    this.onOpenCvReady();
                }
            }
        }
    }

    // Utility Functions
    async loadFaceCascade() {
        // Wait for cv to be ready
        let cvReadyWait = 0;
        while (!window.cv || typeof window.cv.FS_createDataFile !== 'function') {
            await new Promise(resolve => setTimeout(resolve, 200));
            cvReadyWait++;
            if (cvReadyWait > 50) {
                this.faceCascadeLoaded = false;
                return;
            }
        }
        // Add cache-busting query string
        const cascadeUrl = this.FACE_CASCADE_URL + '?v=' + Math.random().toString(36).substring(2);
        try {
            const response = await fetch(cascadeUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            const data = new Uint8Array(buffer);
            // Remove existing file if any
            try {
                cv.FS_unlink('haarcascade_frontalface_default.xml');
            } catch (e) {
                // Ignore if file doesn't exist
            }
            cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', data, true, false, false);
            this.faceClassifier = new cv.CascadeClassifier();
            this.faceClassifier.load('haarcascade_frontalface_default.xml');
            this.faceCascadeLoaded = true;
        } catch (error) {
            console.warn('DEBUG: fetch failed, trying XHR fallback', error);
            // Fallback to XMLHttpRequest for mobile
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', cascadeUrl, true);
                xhr.responseType = 'arraybuffer';
                await new Promise((resolve, reject) => {
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            const buffer = xhr.response;
                            const data = new Uint8Array(buffer);
                            // Remove existing file if any
                            try {
                                cv.FS_unlink('haarcascade_frontalface_default.xml');
                            } catch (e) {
                                // Ignore if file doesn't exist
                            }
                            cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', data, true, false, false);
                            this.faceClassifier = new cv.CascadeClassifier();
                            this.faceClassifier.load('haarcascade_frontalface_default.xml');
                            this.faceCascadeLoaded = true;
                            resolve();
                        } else {
                            reject(new Error('XHR status ' + xhr.status));
                        }
                    };
                    xhr.onerror = () => reject(new Error('XHR error'));
                    xhr.send();
                });
            } catch (xhrError) {
                this.faceCascadeLoaded = false;
            }
        }
    }

    async loadFaceCascadeUntilSuccess() {
        let attempt = 0;
        const maxAttempts = 10;
        while (!this.faceCascadeLoaded && attempt < maxAttempts) {
            attempt++;
            await this.loadFaceCascade();
            if (!this.faceCascadeLoaded) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
        if (this.faceCascadeLoaded) {
            this.renderStep();
        } else {
            this.displayInitialError('Không thể tải dữ liệu nhận diện khuôn mặt. Vui lòng kiểm tra kết nối mạng hoặc thử lại trên thiết bị khác.');
        }
    }

    onOpenCvReady() {
        this.isCvReady = true;
        this.renderInitialLoading();
        this.loadFaceCascadeUntilSuccess();
    }

    renderInitialLoading() {
        const stepContainer = this.shadowRoot.getElementById('step-container');
        stepContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p style="text-align:center; font-weight: bold; font-size: 1.1em; color: #007bff;">Đang tải dữ liệu</p>
            </div>`;
    }

    renderRetry() {
        const stepContainer = this.shadowRoot.getElementById('step-container');
        stepContainer.innerHTML = `
            <div class="loading-container">
                <p style="text-align:center; font-weight: bold; font-size: 1.1em;">Tải dữ liệu mất nhiều thời gian hơn dự kiến</p>
            </div>`;
    }

    retryLoading() {
        this.hasInitialized = false;
        this.isCvReady = false;
        this.faceCascadeLoaded = false;
        this.init();
    }

    // Core Camera and Validation Logic
    updateStepIndicator() {
        const steps = this.shadowRoot.querySelectorAll('.step');
        steps.forEach((el, index) => {
            el.classList.remove('active', 'completed');
            const stepNum = index + 1;
            if (stepNum < this.currentStep) {
                el.classList.add('completed');
            } else if (stepNum === this.currentStep) {
                el.classList.add('active');
            }
        });
    }

    async startCamera(videoElementId, facingMode = 'environment') {
        try {
            this.stopCamera();
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            const video = this.shadowRoot.getElementById(videoElementId);
            video.srcObject = this.cameraStream;
            video.style.display = 'block';
            video.style.transform = (facingMode === 'user') ? 'scaleX(-1)' : 'scaleX(1)';

            await new Promise(resolve => video.onloadedmetadata = resolve);
            this.startLiveValidation(videoElementId);
            return true;
        } catch (err) {
            let message = 'Lỗi: Không thể truy cập camera. Vui lòng cấp quyền và thử lại.';
            if (err.name === 'NotAllowedError') {
                message = 'Truy cập camera bị chặn bởi chính sách quyền. Vui lòng kiểm tra cài đặt trình duyệt hoặc liên hệ quản trị viên trang web.';
            }
            this.displayInitialError(message);
            return false;
        }
    }

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        if (this.validationIntervalId) {
            cancelAnimationFrame(this.validationIntervalId);
            this.validationIntervalId = null;
        }
    }

    drawOverlay(canvasId, type, status = 'invalid') {
        const canvas = this.shadowRoot.getElementById(canvasId);
        if (!canvas || !canvas.parentElement) return;

        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        switch (status) {
            case 'valid':
                ctx.strokeStyle = 'rgba(40, 167, 69, 0.9)';
                break;
            case 'invalid':
                ctx.strokeStyle = 'rgba(220, 53, 69, 0.9)';
                break;
            default:
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        }

        ctx.lineWidth = 4;
        ctx.setLineDash([15, 10]);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (type === 'portrait') { // Perfect circle for portrait
            const radius = Math.min(canvas.width, canvas.height) * 0.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else { // Rectangle for ID card
            const rectWidth = canvas.width * 0.9;
            const rectHeight = canvas.height * 0.8;
            ctx.strokeRect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight);
        }
    }

    startLiveValidation(videoId) {
        const video = this.shadowRoot.getElementById(videoId);
        const canvasId = `${videoId.replace('Video', '')}CanvasOverlay`;
        const validationMsg = this.shadowRoot.getElementById('validationMessage');
        const captureBtn = this.shadowRoot.getElementById(`${this.currentStep === 1 ? 'idFront' : 'portrait'}CaptureBtn`);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        let src;
        if (this.currentStep === 1) {
            src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
        } else {
            src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
        }

        // Draw initial overlay
        const overlayType = this.currentStep === 1 ? 'id' : 'portrait';
        this.drawOverlay(canvasId, overlayType, 'invalid');

        const processFrame = () => {
            if (!this.isCvReady || !video.srcObject || video.paused || video.ended) {
                this.validationIntervalId = requestAnimationFrame(processFrame);
                return;
            }

            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

            let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            src.data.set(imageData.data);

            let isValid = false;
            let message = '';

            if (this.currentStep === 1) {
                const result = this.validateIdCardBounds(src);
                isValid = result.isValid;
                message = result.message;
            } else if (this.currentStep === 2) {
                const result = this.validatePortrait(src);
                isValid = result.isValid;
                message = result.message;
            }

            const overlayType = this.currentStep === 1 ? 'id' : 'portrait';
            this.drawOverlay(canvasId, overlayType, isValid ? 'valid' : 'invalid');
            validationMsg.textContent = message;
            validationMsg.className = `validation-message ${isValid ? 'success' : 'error'}`;
            captureBtn.disabled = !isValid;

            this.validationIntervalId = requestAnimationFrame(processFrame);
        };

        this.validationIntervalId = requestAnimationFrame(processFrame);
    }

    validateIdCardBounds(src) {
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
        let edges = new cv.Mat();
        cv.Canny(gray, edges, 50, 150);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let isValid = false;
        let message = 'Vui lòng đặt thẻ vào trong khung';

        if (contours.size() > 0) {
            let largestContour = contours.get(0);
            let maxArea = cv.contourArea(largestContour);
            for (let i = 1; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt);
                if (area > maxArea) {
                    maxArea = area;
                    largestContour = cnt;
                }
            }

            const imageArea = src.cols * src.rows;
            if (maxArea > imageArea * 0.2) {
                const rect = cv.boundingRect(largestContour);
                const frameWidthRatio = 0.9;
                const frameHeightRatio = 0.8;

                const isContained = rect.x > src.cols * (1 - frameWidthRatio) / 2 * 0.9 &&
                    rect.y > src.rows * (1 - frameHeightRatio) / 2 * 0.9 &&
                    (rect.x + rect.width) < src.cols * (1 - (1 - frameWidthRatio) / 2) * 1.1 &&
                    (rect.y + rect.height) < src.rows * (1 - (1 - frameHeightRatio) / 2) * 1.1;

                if (isContained) {
                    isValid = true;
                    message = 'Vị trí hợp lệ! Sẵn sàng để chụp.';
                } else {
                    message = 'Vui lòng đặt thẻ nằm gọn trong khung';
                }
            }
        }

        gray.delete(); edges.delete(); contours.delete(); hierarchy.delete();

        return { isValid, message };
    }

    validatePortrait(src) {
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        let faces = new cv.RectVector();
        this.faceClassifier.detectMultiScale(gray, faces, 1.1, 5, 0, new cv.Size(100, 100));

        let isValid = false;
        let message = 'Không tìm thấy khuôn mặt';

        if (faces.size() === 1) {
            const face = faces.get(0);

            // Use circular validation area
            const circleCenterX = src.cols / 2;
            const circleCenterY = src.rows / 2;
            const circleRadius = Math.min(src.cols, src.rows) * 0.8;

            // Check if face fits within the circle
            const faceSize = Math.max(face.width, face.height);
            const isSizeValid = faceSize > circleRadius * 0.8;

            // Check if face center is within the circle
            const faceCenterX = face.x + face.width / 2;
            const faceCenterY = face.y + face.height / 2;
            const distanceFromCenter = Math.sqrt(
                Math.pow(faceCenterX - circleCenterX, 2) +
                Math.pow(faceCenterY - circleCenterY, 2)
            );
            const isCentered = distanceFromCenter < circleRadius * 0.3;

            if (isSizeValid && isCentered) {
                isValid = true;
                message = 'Khuôn mặt hợp lệ! Sẵn sàng chụp.';
            } else if (!isSizeValid) {
                message = 'Vui lòng di chuyển lại gần hơn';
            } else {
                message = 'Vui lòng giữ khuôn mặt ở giữa khung';
            }

        } else if (faces.size() > 1) {
            message = 'Phát hiện nhiều hơn một khuôn mặt';
        }

        gray.delete(); faces.delete();

        return { isValid, message };
    }

    captureImage(type, videoElementId) {
        const video = this.shadowRoot.getElementById(videoElementId);
        if (!video || !video.srcObject) return null;

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        const context = captureCanvas.getContext('2d');

        if (type === 'portrait') {
            context.translate(captureCanvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        return captureCanvas.toDataURL('image/jpeg', 0.9);
    }

    // Event Handlers & Step Logic
    handleCaptureOrRetake(type, videoId) {
        if (this.capturedImages[type]) {
            this.capturedImages[type] = null;
            this.renderStep();
        } else {
            const imageData = this.captureImage(type, videoId);
            if (!imageData) return;

            this.capturedImages[type] = imageData;
            this.stopCamera();

            this.shadowRoot.getElementById(`${type}Preview`).src = this.capturedImages[type];
            this.shadowRoot.getElementById(`${type}Preview`).style.display = 'block';
            this.shadowRoot.getElementById(videoId).style.display = 'none';
            this.shadowRoot.getElementById(`${videoId.replace('Video', '')}CanvasOverlay`).style.display = 'none';

            this.shadowRoot.getElementById(`${type}CaptureBtn`).style.display = 'none';
            this.shadowRoot.getElementById(`${type}NextBtn`).disabled = false;
            this.shadowRoot.getElementById('validationMessage').style.display = 'none';
        }
    }

    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
            this.renderStep();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderStep();
        }
    }

    // UI Rendering
    renderStep() {
        const stepContainer = this.shadowRoot.getElementById('step-container');
        this.updateStepIndicator();
        this.stopCamera();
        let html = '';

        switch (this.currentStep) {
            case 1:
                const type1 = 'idFront';
                html = `
                    <p style="text-align:center; font-weight: bold;">Bước 1: Chụp Ảnh Mặt Trước Thẻ</p>
                    <p style="text-align:center; font-size: 0.9em; color: #6c757d; margin-bottom: 15px;">Vui lòng đặt thẻ trên mặt phẳng có độ tương phản với thẻ tốt, ( Ví dụ nền đen )</p>
                    <div class="camera-box id-card-box">
                        <video id="step1Video" autoplay muted playsinline style="display: none;"></video>
                        <canvas id="step1CanvasOverlay" class="overlay"></canvas>
                        <img id="${type1}Preview" class="captured-preview" style="display: ${this.capturedImages[type1] ? 'block' : 'none'};" src="${this.capturedImages[type1] || ''}" alt="Preview Thẻ">
                    </div>
                    <div id="validationMessage" class="validation-message error"></div>
                    <div style="text-align: center; margin: 10px 0;">
                        <button type="button" class="action-button btn-success capture-btn" id="${type1}CaptureBtn" onclick="this.getRootNode().host.handleCaptureOrRetake('${type1}', 'step1Video')" disabled><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg></button>
                    </div>
                    <div class="button-group">
                        <div></div>
                        <button type="button" class="action-button btn-primary" id="${type1}NextBtn" onclick="this.getRootNode().host.nextStep()" ${!this.capturedImages[type1] ? 'disabled' : ''}>Tiếp Tục</button>
                    </div>`;
                stepContainer.innerHTML = html;
                if (!this.capturedImages[type1]) {
                    this.startCamera('step1Video', 'environment');
                } else {
                    this.shadowRoot.getElementById('idFrontCaptureBtn').disabled = false;
                }
                break;

            case 2:
                const type2 = 'portrait';
                html = `
                    <p style="text-align:center; font-weight: bold;">Bước 2: Chụp Ảnh Chân Dung</p>
                    <div class="camera-box portrait-box">
                        <video id="step2Video" autoplay muted playsinline style="display: none;"></video>
                        <canvas id="step2CanvasOverlay" class="overlay"></canvas>
                        <img id="${type2}Preview" class="captured-preview" style="display: ${this.capturedImages[type2] ? 'block' : 'none'};" src="${this.capturedImages[type2] || ''}" alt="Preview Chân dung">
                    </div>
                     <div id="validationMessage" class="validation-message error"></div>
                    <div style="text-align: center; margin: 10px 0;">
                        <button type="button" class="action-button btn-success capture-btn" id="${type2}CaptureBtn" onclick="this.getRootNode().host.handleCaptureOrRetake('${type2}', 'step2Video')" disabled><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg></button>
                    </div>
                    <div class="button-group">
                        <button type="button" class="action-button btn-secondary" onclick="this.getRootNode().host.prevStep()">Quay Lại</button>
                        <button type="button" class="action-button btn-primary" id="${type2}NextBtn" onclick="this.getRootNode().host.nextStep()" ${!this.capturedImages[type2] ? 'disabled' : ''}>Tiếp Tục</button>
                    </div>`;
                stepContainer.innerHTML = html;
                if (!this.capturedImages[type2]) {
                    this.startCamera('step2Video', 'user');
                } else {
                    this.shadowRoot.getElementById('portraitCaptureBtn').disabled = false;
                }
                break;

            case 3:
                html = `
                    <p style="text-align:center; font-weight: bold;">Bước 3: Xác Nhận Thông Tin</p>
                    <p style="text-align:center; font-size: 0.9em; color: var(--dark-gray);">Vui lòng kiểm tra lại hình ảnh trước khi xác thực.</p>
                    <div style="display:flex; justify-content: space-around; margin: 20px 0; gap: 15px;">
                        <div style="text-align: center;">
                            <label style="font-weight:bold;">Ảnh Thẻ</label><br>
                            <img src="${this.capturedImages.idFront}" style="width: 140px; height: auto; border: 2px solid var(--border-color); border-radius: 8px; margin-top: 5px;" alt="Thẻ">
                        </div>
                        <div style="text-align: center;">
                            <label style="font-weight:bold;">Ảnh Chân dung</label><br>
                            <img src="${this.capturedImages.portrait}" style="width: 140px; height: auto; border: 2px solid var(--border-color); border-radius: 8px; margin-top: 5px; transform: scaleX(-1);" alt="Selfie">
                        </div>
                    </div>
                    <div class="button-group">
                         <button type="button" class="action-button btn-primary" onclick="this.getRootNode().host.executeKYC()">✨ XÁC THỰC</button>
                    </div>`;
                stepContainer.innerHTML = html;
                break;
        }
    }

    renderNoApiKeyError() {
        const stepContainer = this.shadowRoot.getElementById('step-container');
        stepContainer.innerHTML = `
            <div class="result-screen error">
                <svg class="result-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="#FFF" stroke="#dc3545" stroke-width="2"/>
                    <path fill="none" stroke="#dc3545" stroke-width="3" d="M16 16 36 36 M36 16 16 36" />
                </svg>
                <h3>Cần API Key</h3>
                <p>Vui lòng cung cấp api-key attribute cho component.</p>
                <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">&lt;kyc-verifier api-key="YOUR_API_KEY"&gt;&lt;/kyc-verifier&gt;</pre>
            </div>
        `;
    }

    displayInitialError(message) {
        const stepContainer = this.shadowRoot.getElementById('step-container');
        stepContainer.innerHTML = `
             <div class="result-screen error">
                <h3>Đã xảy ra lỗi</h3>
                <p>${message}</p>
            </div>
        `;
    }

    async executeKYC() {
        const stepContainer = this.shadowRoot.getElementById('step-container');
        stepContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p style="text-align:center; font-weight: bold; font-size: 1.1em;">Đang xử lý xác thực...</p>
                <p style="text-align:center; color: var(--dark-gray);">Vui lòng không đóng trình duyệt.</p>
            </div>`;

        const cleanBase64 = (dataUrl) => dataUrl.split(',')[1];

        const data = {
            api_key: this.apiKey,
            id_front: cleanBase64(this.capturedImages.idFront),
            portrait: cleanBase64(this.capturedImages.portrait),
        };

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            // Extract only the required fields
            const eventDetail = {
                verified: result.data?.verified || false,
                success: result.success || false,
                ses_id: result.ses_id || null,
                info: result.data?.info_text || null,
            };

            // Dispatch custom event
            this.dispatchEvent(new CustomEvent('kyc-verification-complete', {
                detail: eventDetail,
                bubbles: true,
                composed: true
            }));

            // Still display result for internal UI
            if (response.ok && result.success && result.data && result.data.verified === true) {
                this.displayResult(true);
            } else {
                const errorMessage = result.message || 'Xác thực không thành công. Dữ liệu không hợp lệ.';
                this.displayResult(false, errorMessage);
            }
        } catch (error) {
            const eventDetail = {
                verified: false,
                success: false,
                message: `Lỗi kết nối mạng: ${error.message}`
            };
            this.dispatchEvent(new CustomEvent('kyc-verification-complete', {
                detail: eventDetail,
                bubbles: true,
                composed: true
            }));
            this.displayResult(false, `Lỗi kết nối mạng: ${error.message}`);
        }
    }

    displayResult(isSuccess, message = '') {
        const stepContainer = this.shadowRoot.getElementById('step-container');
        this.shadowRoot.querySelector('.step-indicator').style.display = 'none';

        const successHTML = `
            <div class="result-screen success">
                <svg class="result-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="white" stroke="var(--success-color)" stroke-width="2"/>
                    <path fill="var(--success-color)" d="M14.1 27.2l7.1 7.2 16.7-16.8L36.6 16 21.2 31.4l-5.7-5.7z"/>
                </svg>
                <h3>Xác Thực Thành Công!</h3>
                <p>Quá trình xác thực của bạn đã hoàn tất.</p>
            </div>`;

        const errorHTML = `
            <div class="result-screen error">
                 <svg class="result-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="25" fill="#FFF" stroke="var(--error-color)" stroke-width="2"/>
                      <path fill="none" stroke="var(--error-color)" stroke-width="3" d="M16 16 36 36 M36 16 16 36" />
                 </svg>
                <h3>Xác Thực Thất Bại</h3>
                <p>Vui lòng thực hiện lại.</p>
                <p>${message}</p>
            </div>`;

        stepContainer.innerHTML = isSuccess ? successHTML : errorHTML;
    }

    resetProcess() {
        this.currentStep = 1;
        this.capturedImages.idFront = null;
        this.capturedImages.portrait = null;
        this.shadowRoot.querySelector('.step-indicator').style.display = 'flex';
        this.renderStep();
    }

    connectedCallback() {
        // Ensure api-key is read when element is connected
        this.apiKey = this.getAttribute('api-key') || '';

        // Only render if api-key is provided
        if (this.apiKey) {
            this.renderInitialLoading();
        } else {
            this.renderNoApiKeyError();
        }
    }

    disconnectedCallback() {
        this.stopCamera();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'api-key') {
            this.apiKey = newValue || '';
            // Re-render based on new api-key value
            if (this.apiKey) {
                this.renderInitialLoading();
            } else {
                this.renderNoApiKeyError();
            }
        }
    }
}

// Export the class instead of defining the custom element

// Re-verification Component (Portrait only)
ReVerifier = class extends HTMLElement {
    static get observedAttributes() {
        return ['api-key', 'ses_id'];
    }

    constructor() {
        super();
        this.apiKey = '';
        this.sesId = '';
        this.attachShadow({ mode: 'open' });

        this.API_URL = 'https://open-kyc.ziang.me/api/v3/rverif/kyc';
        this.FACE_CASCADE_URL = 'https://open-kyc.ziang.me/Lib/v1.0/plug-in.xml';

        this.cameraStream = null;
        this.validationIntervalId = null;
        this.isCvReady = false;
        this.faceClassifier;

        this.capturedImages = {
            portrait: null
        };
        this.faceCascadeLoaded = false;
        this.hasInitialized = false;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    max-width: 400px;
                    min-height: 50px;
                    margin: 0 auto;
                    background: #fff;
                    padding: 16px;
                    border-radius: 20px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    box-sizing: border-box;
                }

                /* 🌐 Mobile */
                @media (max-width: 600px) {
                    :host {
                        padding: 10px;
                        border-radius: 20px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                        max-width: 100%;
                        margin: 0;
                        min-height: 500px;
                    }
                }

                h2 {
                    color: #007bff;
                    text-align: center;
                    font-size: 1.6em;
                    margin-top: 0;
                    margin-bottom: 25px;
                }

                /* --- Camera/Preview Styles --- */
                .camera-box {
                    position: relative;
                    width: 100%;
                    height: 300px;
                    margin: 15px auto 10px;
                    border-radius: 12px;
                    overflow: hidden;
                    background-color: #111;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .camera-box video, .camera-box .captured-preview {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .camera-box canvas.overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }

                video::-webkit-media-controls { display: none !important; }
                video::-webkit-media-controls-enclosure { display: none !important; }

                /* --- Button Styles --- */
                .button-group {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    margin-top: 15px;
                }
                .action-button {
                    padding: 14px 20px;
                    border: none;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    width: 100%;
                }
                .btn-primary { background-color: #007bff; color: white; }
                .btn-primary:hover:not(:disabled) { background-color: #0056b3; }
                .btn-success { background-color: #28a745; color: white; }
                .btn-success:hover:not(:disabled) { background-color: #218838; }
                .action-button:disabled { background-color: #ccc; cursor: not-allowed; opacity: 0.7; }

                .capture-btn {
                    display: block;
                    margin: 0 auto;
                    width: 60px;
                    height: 60px;
                    padding: 0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* --- Validation Message Style --- */
                .validation-message {
                    text-align: center;
                    padding: 12px;
                    border-radius: 6px;
                    font-weight: 500;
                    margin: 5px 0;
                    min-height: 20px;
                    transition: all 0.3s ease;
                    display: block;
                }
                .validation-message.error {
                    color: #dc3545;
                }
                .validation-message.success {
                    color: #28a745;
                }

                /* --- Result & Loading Styles --- */
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 350px;
                }
                .loading-spinner {
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #007bff;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 15px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* --- Result Screen --- */
                .result-screen {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 20px 0;
                    min-height: 350px;
                }
                .result-screen h3 { font-size: 1.8em; margin: 15px 0 10px; }
                .result-screen p { font-size: 1.1em; color: #6c757d; margin-bottom: 30px; }
                .result-screen.success h3 { color: #28a745; }
                .result-screen.error h3 { color: #dc3545; }
                .result-icon { width: 100px; height: 100px; }
            </style>

            <h2>(RE-VERIFY)</h2>

            <div id="content-container" class="step-content">
            </div>

            <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #6c757d;">Powered by Ziang</div>
        `;

        this.init();
    }

    async init() {
        if (!this.hasInitialized) {
            this.hasInitialized = true;
            // Load OpenCV if not already loaded
            if (typeof window !== 'undefined') {
                if (!window.cv) {
                    // Remove existing script if any
                    const existingScript = document.querySelector('script[src*="mainxls.js"]');
                    if (existingScript) {
                        existingScript.remove();
                    }
                    // Load OpenCV.js
                    const script = document.createElement('script');
                    script.src = 'https://open-kyc.ziang.me/Lib/v1.0/js/mainxls.js';
                    script.async = true;
                    script.onload = () => this.onOpenCvReady();
                    document.head.appendChild(script);
                } else {
                    // OpenCV already loaded, proceed
                    this.onOpenCvReady();
                }
            }
        }
    }

    // Utility Functions
    async loadFaceCascade() {
        // Wait for cv to be ready
        let cvReadyWait = 0;
        while (!window.cv || typeof window.cv.FS_createDataFile !== 'function') {
            await new Promise(resolve => setTimeout(resolve, 200));
            cvReadyWait++;
            if (cvReadyWait > 50) {
                this.faceCascadeLoaded = false;
                return;
            }
        }
        // Add cache-busting query string
        const cascadeUrl = this.FACE_CASCADE_URL + '?v=' + Math.random().toString(36).substring(2);
        try {
            const response = await fetch(cascadeUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            const data = new Uint8Array(buffer);
            // Remove existing file if any
            try {
                cv.FS_unlink('haarcascade_frontalface_default.xml');
            } catch (e) {
                // Ignore if file doesn't exist
            }
            cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', data, true, false, false);
            this.faceClassifier = new cv.CascadeClassifier();
            this.faceClassifier.load('haarcascade_frontalface_default.xml');
            this.faceCascadeLoaded = true;
        } catch (error) {
            console.warn('DEBUG: fetch failed, trying XHR fallback', error);
            // Fallback to XMLHttpRequest for mobile
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', cascadeUrl, true);
                xhr.responseType = 'arraybuffer';
                await new Promise((resolve, reject) => {
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            const buffer = xhr.response;
                            const data = new Uint8Array(buffer);
                            // Remove existing file if any
                            try {
                                cv.FS_unlink('haarcascade_frontalface_default.xml');
                            } catch (e) {
                                // Ignore if file doesn't exist
                            }
                            cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', data, true, false, false);
                            this.faceClassifier = new cv.CascadeClassifier();
                            this.faceClassifier.load('haarcascade_frontalface_default.xml');
                            this.faceCascadeLoaded = true;
                            resolve();
                        } else {
                            reject(new Error('XHR status ' + xhr.status));
                        }
                    };
                    xhr.onerror = () => reject(new Error('XHR error'));
                    xhr.send();
                });
            } catch (xhrError) {
                this.faceCascadeLoaded = false;
            }
        }
    }

    async loadFaceCascadeUntilSuccess() {
        let attempt = 0;
        const maxAttempts = 10;
        while (!this.faceCascadeLoaded && attempt < maxAttempts) {
            attempt++;
            await this.loadFaceCascade();
            if (!this.faceCascadeLoaded) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
        if (this.faceCascadeLoaded) {
            this.renderContent();
        } else {
            this.displayInitialError('Không thể tải dữ liệu nhận diện khuôn mặt. Vui lòng kiểm tra kết nối mạng hoặc thử lại trên thiết bị khác.');
        }
    }

    onOpenCvReady() {
        this.isCvReady = true;
        this.renderInitialLoading();
        this.loadFaceCascadeUntilSuccess();
    }

    renderInitialLoading() {
        const contentContainer = this.shadowRoot.getElementById('content-container');
        contentContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p style="text-align:center; font-weight: bold; font-size: 1.1em; color: #007bff;">Đang tải dữ liệu</p>
            </div>`;
    }

    renderRetry() {
        const contentContainer = this.shadowRoot.getElementById('content-container');
        contentContainer.innerHTML = `
            <div class="loading-container">
                <p style="text-align:center; font-weight: bold; font-size: 1.1em;">Tải dữ liệu mất nhiều thời gian hơn dự kiến</p>
            </div>`;
    }

    retryLoading() {
        this.hasInitialized = false;
        this.isCvReady = false;
        this.faceCascadeLoaded = false;
        this.init();
    }

    // Core Camera and Validation Logic
    async startCamera(videoElementId, facingMode = 'user') {
        try {
            this.stopCamera();
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            const video = this.shadowRoot.getElementById(videoElementId);
            video.srcObject = this.cameraStream;
            video.style.display = 'block';
            video.style.transform = (facingMode === 'user') ? 'scaleX(-1)' : 'scaleX(1)';

            await new Promise(resolve => video.onloadedmetadata = resolve);
            this.startLiveValidation(videoElementId);
            return true;
        } catch (err) {
            let message = 'Lỗi: Không thể truy cập camera. Vui lòng cấp quyền và thử lại.';
            if (err.name === 'NotAllowedError') {
                message = 'Truy cập camera bị chặn bởi chính sách quyền. Vui lòng kiểm tra cài đặt trình duyệt hoặc liên hệ quản trị viên trang web.';
            }
            this.displayInitialError(message);
            return false;
        }
    }

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        if (this.validationIntervalId) {
            cancelAnimationFrame(this.validationIntervalId);
            this.validationIntervalId = null;
        }
    }

    drawOverlay(canvasId, status = 'invalid') {
        const canvas = this.shadowRoot.getElementById(canvasId);
        if (!canvas || !canvas.parentElement) return;

        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        switch (status) {
            case 'valid':
                ctx.strokeStyle = 'rgba(40, 167, 69, 0.9)';
                break;
            case 'invalid':
                ctx.strokeStyle = 'rgba(220, 53, 69, 0.9)';
                break;
            default:
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        }

        ctx.lineWidth = 4;
        ctx.setLineDash([15, 10]);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Perfect circle for portrait
        const radius = Math.min(canvas.width, canvas.height) * 0.4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    }

    startLiveValidation(videoId) {
        const video = this.shadowRoot.getElementById(videoId);
        const canvasId = `${videoId.replace('Video', '')}CanvasOverlay`;
        const validationMsg = this.shadowRoot.getElementById('validationMessage');
        const captureBtn = this.shadowRoot.getElementById('portraitCaptureBtn');

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        // Draw initial overlay
        this.drawOverlay(canvasId, 'invalid');

        const processFrame = () => {
            if (!this.isCvReady || !video.srcObject || video.paused || video.ended) {
                this.validationIntervalId = requestAnimationFrame(processFrame);
                return;
            }

            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

            let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            let src = cv.matFromImageData(imageData);

            const result = this.validatePortrait(src);
            const isValid = result.isValid;
            const message = result.message;

            this.drawOverlay(canvasId, isValid ? 'valid' : 'invalid');
            validationMsg.textContent = message;
            validationMsg.className = `validation-message ${isValid ? 'success' : 'error'}`;
            captureBtn.disabled = !isValid;

            src.delete();
            this.validationIntervalId = requestAnimationFrame(processFrame);
        };

        this.validationIntervalId = requestAnimationFrame(processFrame);
    }

    validatePortrait(src) {
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        let faces = new cv.RectVector();
        this.faceClassifier.detectMultiScale(gray, faces, 1.1, 5, 0, new cv.Size(100, 100));

        let isValid = false;
        let message = 'Không tìm thấy khuôn mặt';

        if (faces.size() === 1) {
            const face = faces.get(0);

            // Use circular validation area
            const circleCenterX = src.cols / 2;
            const circleCenterY = src.rows / 2;
            const circleRadius = Math.min(src.cols, src.rows) * 0.4;

            // Check if face fits within the circle
            const faceSize = Math.max(face.width, face.height);
            const isSizeValid = faceSize > circleRadius * 0.6;

            // Check if face center is within the circle
            const faceCenterX = face.x + face.width / 2;
            const faceCenterY = face.y + face.height / 2;
            const distanceFromCenter = Math.sqrt(
                Math.pow(faceCenterX - circleCenterX, 2) +
                Math.pow(faceCenterY - circleCenterY, 2)
            );
            const isCentered = distanceFromCenter < circleRadius * 0.4;

            if (isSizeValid && isCentered) {
                isValid = true;
                message = 'Khuôn mặt hợp lệ! Sẵn sàng chụp.';
            } else if (!isSizeValid) {
                message = 'Vui lòng di chuyển lại gần hơn';
            } else {
                message = 'Giữ khuôn mặt vào giữa khung';
            }

        } else if (faces.size() > 1) {
            message = 'Có nhiều hơn một khuôn mặt';
        }

        gray.delete(); faces.delete();

        return { isValid, message };
    }

    captureImage(videoElementId) {
        const video = this.shadowRoot.getElementById(videoElementId);
        if (!video || !video.srcObject) return null;

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        const context = captureCanvas.getContext('2d');

        // Flip for portrait (selfie)
        context.translate(captureCanvas.width, 0);
        context.scale(-1, 1);

        context.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        return captureCanvas.toDataURL('image/jpeg', 0.9);
    }

    // Event Handlers
    handleCaptureOrRetake(videoId) {
        if (this.capturedImages.portrait) {
            this.capturedImages.portrait = null;
            this.renderContent();
        } else {
            const imageData = this.captureImage(videoId);
            if (!imageData) return;

            this.capturedImages.portrait = imageData;
            this.stopCamera();
            this.renderContent();
        }
    }

    // UI Rendering
    renderContent() {
        const contentContainer = this.shadowRoot.getElementById('content-container');
        this.stopCamera();

        if (this.capturedImages.portrait) {
            // Show preview and verify button
            contentContainer.innerHTML = `
                <p style="text-align:center; font-weight: bold;">Xác nhận ảnh chân dung</p>
                <div class="camera-box">
                    <img id="portraitPreview" class="captured-preview" src="${this.capturedImages.portrait}" alt="Preview Chân dung" style="transform: scaleX(-1);">
                </div>
                <div class="button-group">
                    <button type="button" class="action-button btn-secondary" onclick="this.getRootNode().host.handleCaptureOrRetake('portraitVideo')">Chụp Lại</button>
                    <button type="button" class="action-button btn-primary" id="verifyBtn" onclick="this.getRootNode().host.executeReVerification()">✨ XÁC THỰC</button>
                </div>`;
        } else {
            // Show camera for capture
            contentContainer.innerHTML = `
                <p style="text-align:center; font-weight: bold;">Chụp ảnh chân dung</p>
                <p style="text-align:center; font-size: 0.9em; color: #6c757d; margin-bottom: 15px;">Vui lòng giữ khuôn mặt trong khung tròn</p>
                <div class="camera-box">
                    <video id="portraitVideo" autoplay muted playsinline style="display: none;"></video>
                    <canvas id="portraitCanvasOverlay" class="overlay"></canvas>
                </div>
                <div id="validationMessage" class="validation-message error"></div>
                <div style="text-align: center; margin: 10px 0;">
                    <button type="button" class="action-button btn-success capture-btn" id="portraitCaptureBtn" onclick="this.getRootNode().host.handleCaptureOrRetake('portraitVideo')" disabled>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
                            <circle cx="12" cy="12" r="3" fill="white"/>
                        </svg>
                    </button>
                </div>`;
            this.startCamera('portraitVideo', 'user');
        }
    }

    renderNoApiKeyError() {
        const contentContainer = this.shadowRoot.getElementById('content-container');
        contentContainer.innerHTML = `
            <div class="result-screen error">
                <svg class="result-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="#FFF" stroke="#dc3545" stroke-width="2"/>
                    <path fill="none" stroke="#dc3545" stroke-width="3" d="M16 16 36 36 M36 16 16 36" />
                </svg>
                <h3>Cần API Key & Session ID</h3>
                <p>Vui lòng cung cấp api-key và ses_id attributes cho component.</p>
                <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">&lt;re-verifier api-key="YOUR_API_KEY" ses_id="SESSION_ID"&gt;&lt;/re-verifier&gt;</pre>
            </div>
        `;
    }

    displayInitialError(message) {
        const contentContainer = this.shadowRoot.getElementById('content-container');
        contentContainer.innerHTML = `
             <div class="result-screen error">
                <h3>Đã xảy ra lỗi</h3>
                <p>${message}</p>
            </div>
        `;
    }

    async executeReVerification() {
        const contentContainer = this.shadowRoot.getElementById('content-container');
        contentContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p style="text-align:center; font-weight: bold; font-size: 1.1em;">Đang xử lý xác thực...</p>
                <p style="text-align:center; color: var(--dark-gray);">Vui lòng không đóng trình duyệt.</p>
            </div>`;

        const cleanBase64 = (dataUrl) => dataUrl.split(',')[1];

        const data = {
            api_key: this.apiKey,
            portrait: cleanBase64(this.capturedImages.portrait),
            ses_id: this.sesId
        };

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            // Extract only the required fields
            const eventDetail = {
                verified: result.data?.verified || false,
                success: result.success || false,
            };

            // Dispatch custom event
            this.dispatchEvent(new CustomEvent('kyc-verification-complete', {
                detail: eventDetail,
                bubbles: true,
                composed: true
            }));

            if (response.ok && result.success && result.data && result.data.verified === true) {
                this.displayResult(true);
            } else {
                const errorMessage = result.message || 'Xác thực không thành công. Dữ liệu không hợp lệ.';
                this.displayResult(false, errorMessage);
            }
        } catch (error) {
            const eventDetail = {
                verified: false,
                success: false,
                ses_id: null,
                message: `Lỗi kết nối mạng: ${error.message}`
            };

            this.dispatchEvent(new CustomEvent('kyc-verification-complete', {
                detail: eventDetail,
                bubbles: true,
                composed: true
            }));

            this.displayResult(false, `Lỗi kết nối mạng: ${error.message}`);
        }
    }

    displayResult(isSuccess, message = '') {
        const contentContainer = this.shadowRoot.getElementById('content-container');

        const successHTML = `
            <div class="result-screen success">
                <svg class="result-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="white" stroke="var(--success-color)" stroke-width="2"/>
                    <path fill="var(--success-color)" d="M14.1 27.2l7.1 7.2 16.7-16.8L36.6 16 21.2 31.4l-5.7-5.7z"/>
                </svg>
                <h3>Xác Thực Thành Công!</h3>
                <p>Quá trình xác thực lại đã hoàn tất.</p>
            </div>`;

        const errorHTML = `
            <div class="result-screen error">
                 <svg class="result-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="25" fill="#FFF" stroke="var(--error-color)" stroke-width="2"/>
                      <path fill="none" stroke="var(--error-color)" stroke-width="3" d="M16 16 36 36 M36 16 16 36" />
                 </svg>
                <h3>Xác Thực Thất Bại</h3>
                <p>Vui lòng thực hiện lại.</p>
                <p>${message}</p>
            </div>`;

        contentContainer.innerHTML = isSuccess ? successHTML : errorHTML;
    }

    resetProcess() {
        this.capturedImages.portrait = null;
        this.renderContent();
    }

    connectedCallback() {
        // Ensure attributes are read when element is connected
        this.apiKey = this.getAttribute('api-key') || '';
        this.sesId = this.getAttribute('ses_id') || '';

        // Only render if both api-key and ses_id are provided
        if (this.apiKey && this.sesId) {
            this.renderInitialLoading();
        } else {
            this.renderNoApiKeyError();
        }
    }

    disconnectedCallback() {
        this.stopCamera();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'api-key') {
            this.apiKey = newValue || '';
        } else if (name === 'ses_id') {
            this.sesId = newValue || '';
        }

        // Re-render based on new attribute values
        if (this.apiKey && this.sesId) {
            this.renderInitialLoading();
        } else {
            this.renderNoApiKeyError();
        }
    }
}

export { KycVerifier, ReVerifier };
export default KycVerifier;