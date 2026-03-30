let r;
const canvas = document.getElementById('mainCanvas');
const progressBar = document.getElementById('progress-bar');
const loaderParent = document.getElementById('loader-parent');

let currentState = "verification"; 
let progress = 0;
let progressInterval = null;

const STILLNESS_THRESHOLD = 0.15; // Jitter floor
const FLAT_ANGLE = 5;

const cssToRiveColor = (cssVar) => {
    const cssColor = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    return parseInt(`0xFF${cssColor.replace('#', '')}`, 16);
};

function updateRive(status) {
    if (currentState === status && status !== "verification") return; 
    currentState = status;

    let topColor, bottomColor;
    if (status === "error") {
        topColor = cssToRiveColor('--error-dark');
        bottomColor = cssToRiveColor('--error-mid');
    } else if (status === "success") {
        topColor = cssToRiveColor('--success-dark');
        bottomColor = cssToRiveColor('--success-mid');
    } else {
        topColor = cssToRiveColor('--primary-400');
        bottomColor = cssToRiveColor('--primary-300');
    }

    if (r) r.cleanup();
    r = new rive.Rive({
        src: 'assets/document_requst_animation.riv',
        canvas: canvas,
        stateMachines: 'State Machine 1',
        autoplay: true,
        onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            const vmi = r.viewModelByName('ViewModel1')?.defaultInstance();
            if (vmi) {
                r.bindViewModelInstance(vmi);
                vmi.string('document_type').value = status;
                vmi.color("gradient_top").value = topColor;
                vmi.color("gradient_bottom").value = bottomColor;
            }
        }
    });
}

function startSuccessTimer() {
    if (progressInterval) return;
    loaderParent.style.display = 'block';
    progress = 0;
    
    progressInterval = setInterval(() => {
        progress += (100 / 50); // Increment for 5 seconds (running every 100ms)
        progressBar.style.width = `${progress}%`;

        if (progress >= 100) {
            clearInterval(progressInterval);
            updateRive("success");
            alert("success");
        }
    }, 100);
}

function resetSuccessTimer() {
    clearInterval(progressInterval);
    progressInterval = null;
    progress = 0;
    progressBar.style.width = `0%`;
    loaderParent.style.display = 'none';
}

function handleSensors(e) {
    const acc = e.acceleration;
    const movement = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    window.ondeviceorientation = (orient) => {
        const isFlat = Math.abs(orient.beta) < FLAT_ANGLE && Math.abs(orient.gamma) < FLAT_ANGLE;

        // 1. TABLE DETECTION (Error)
        if (isFlat && movement < STILLNESS_THRESHOLD) {
            resetSuccessTimer();
            if (currentState !== "error") {
                updateRive("error");
                alert("error");
            }
        } 
        // 2. HANDHELD FLAT (Success Timer)
        else if (isFlat && movement >= STILLNESS_THRESHOLD) {
            if (currentState !== "success" && currentState !== "error") {
                startSuccessTimer();
            }
        }
        // 3. RECOVERY (If picked up or tilted away)
        else {
            resetSuccessTimer();
            if (currentState === "error") {
                updateRive("verification");
            }
        }
    };
}

document.getElementById('start-btn').addEventListener('click', () => {
    // Requesting both orientation and motion for Chrome/iOS
    if (DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(response => {
            if (response == 'granted') {
                window.addEventListener('devicemotion', handleSensors);
                document.getElementById('sensor-overlay').style.display = 'none';
                updateRive("verification");
            }
        });
    } else {
        window.addEventListener('devicemotion', handleSensors);
        document.getElementById('sensor-overlay').style.display = 'none';
        updateRive("verification");
    }
});