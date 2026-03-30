let r;
const canvas = document.getElementById('mainCanvas');
const progressBar = document.getElementById('progress-bar');
const loaderContainer = document.getElementById('loader-container');

let currentState = null; 
let progress = 0;
let successTriggered = false;
let timerInterval = null;

// Detection Thresholds
const FLAT_LIMIT = 5; 
const HAND_TREMOR_THRESHOLD = 0.15; // Movement above this is a human hand
const SURFACE_STILLNESS_THRESHOLD = 0.05; // Movement below this is a static surface
let stillnessBuffer = 0; // Tracks how long the device has been "surface-level" still

const getRiveColor = (variable) => {
    const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    const cleanHex = color.replace('#', '').trim();
    return parseInt(`0xFF${cleanHex}`, 16);
};

function updateAnimation(type) {
    if (currentState === type) return; 
    currentState = type;

    let tCol = getRiveColor('--primary-400');
    let bCol = getRiveColor('--primary-300');

    if (type === "error") {
        tCol = getRiveColor('--error-dark');
        bCol = getRiveColor('--error-mid');
    } else if (type === "success") {
        tCol = getRiveColor('--success-dark');
        bCol = getRiveColor('--success-mid');
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

                // Set Primary Gradients
                vmi.color("gradient_top").value = tCol;
                vmi.color("gradient_bottom").value = bCol;

                // Explicitly target state-specific colors
                if (type === "error") {
                    vmi.color("gradient_top_error").value = tCol;
                    vmi.color("gradient_bottom_error").value = bCol;
                }
                if (type === "success") {
                    vmi.color("gradient_top_success").value = tCol;
                    vmi.color("gradient_bottom_success").value = bCol;
                }
                r.play('State Machine 1');
            }
        }
    });
}

function handleSensors(event) {
    const acc = event.acceleration;
    // Calculate total movement magnitude
    const movement = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);

    window.ondeviceorientation = (orient) => {
        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        if (isFlat) {
            if (movement < SURFACE_STILLNESS_THRESHOLD) {
                // Potential Static Surface detected. Increase stillness buffer.
                stillnessBuffer++;
                if (stillnessBuffer > 20) { // Approx 300ms of absolute stillness
                    stopSuccessTimer();
                    updateAnimation("error");
                }
            } else if (movement > HAND_TREMOR_THRESHOLD) {
                // Handheld Flat detected (Biological noise present)
                stillnessBuffer = 0;
                if (currentState === "error") updateAnimation("verification");
                if (!successTriggered) startSuccessTimer();
            }
        } else {
            // Not flat - Reset everything
            stillnessBuffer = 0;
            stopSuccessTimer();
            if (currentState === "error" || currentState === "success") {
                successTriggered = false;
                updateAnimation("verification");
            }
        }
    };
}

function startSuccessTimer() {
    if (timerInterval || successTriggered) return;
    loaderContainer.style.display = 'block';
    timerInterval = setInterval(() => {
        progress += 2; 
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(timerInterval);
            timerInterval = null;
            successTriggered = true;
            updateAnimation("success");
            alert("success");
        }
    }, 100);
}

function stopSuccessTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    progress = 0;
    progressBar.style.width = '0%';
    loaderContainer.style.display = 'none';
}

document.getElementById('start-btn').addEventListener('click', () => {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(state => {
            if (state === 'granted') {
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