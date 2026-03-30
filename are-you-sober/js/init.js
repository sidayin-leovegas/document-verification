let r;
const canvas = document.getElementById('mainCanvas');
const progressBar = document.getElementById('progress-bar');
const loaderContainer = document.getElementById('loader-container');

let currentState = null;
let progress = 0;
let successTriggered = false;
let timerInterval = null;

const FLAT_LIMIT = 5; 
const JITTER_FLOOR = 0.12; // Anything below this is "Table", above is "Hand"

const getRiveColor = (variable) => {
    const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return parseInt(`0xFF${color.replace('#', '')}`, 16);
};

function updateAnimation(type) {
    if (currentState === type) return; // Prevention of the "Chrome Loop"
    currentState = type;

    let tCol, bCol;
    if (type === "error") {
        tCol = getRiveColor('--error-dark');
        bCol = getRiveColor('--error-mid');
    } else if (type === "success") {
        tCol = getRiveColor('--success-dark');
        bCol = getRiveColor('--success-mid');
    } else {
        tCol = getRiveColor('--primary-400');
        bCol = getRiveColor('--primary-300');
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
                vmi.string('document_type').value = type;
                vmi.color("gradient_top").value = tCol;
                vmi.color("gradient_bottom").value = bCol;
                r.play('State Machine 1');
            }
        }
    });
}

function handleSensors(event) {
    const acc = event.acceleration;
    const movement = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    window.ondeviceorientation = (orient) => {
        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        // 1. DETECT TABLE (Error State)
        if (isFlat && movement < JITTER_FLOOR) {
            stopSuccessTimer();
            if (currentState !== "error") updateAnimation("error");
        } 
        // 2. DETECT HANDHELD FLAT (Success Progress)
        else if (isFlat && movement >= JITTER_FLOOR && !successTriggered) {
            if (currentState === "error") updateAnimation("verification");
            startSuccessTimer();
        } 
        // 3. TILTED OR MOVED (Reset)
        else {
            stopSuccessTimer();
            if (currentState === "error") updateAnimation("verification");
        }
    };
}

function startSuccessTimer() {
    if (timerInterval) return;
    loaderContainer.style.display = 'block';
    timerInterval = setInterval(() => {
        progress += 2; // 2% every 100ms = 100% in 5 seconds
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(timerInterval);
            successTriggered = true;
            updateAnimation("success");
            alert("success");
        }
    }, 100);
}

function stopSuccessTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    progress = 0;
    progressBar.style.width = '0%';
    loaderContainer.style.display = 'none';
}

document.getElementById('start-btn').addEventListener('click', () => {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(permissionState => {
            if (permissionState === 'granted') {
                window.addEventListener('devicemotion', handleSensors);
                document.getElementById('sensor-overlay').style.display = 'none';
                updateAnimation("verification");
            }
        });
    } else {
        window.addEventListener('devicemotion', handleSensors);
        document.getElementById('sensor-overlay').style.display = 'none';
        updateAnimation("verification");
    }
});