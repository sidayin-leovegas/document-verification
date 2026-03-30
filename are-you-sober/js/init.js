let r;
const canvas = document.getElementById('mainCanvas');
const progressBar = document.getElementById('progress-bar');
const loaderContainer = document.getElementById('loader-container');

let currentState = null; // State Guard to prevent loops
let progress = 0;
let successTriggered = false;
let timerInterval = null;

const FLAT_LIMIT = 5; 
const JITTER_FLOOR = 0.12; 

/**
 * Converts CSS hex strings (#RRGGBB) to Rive hex numbers (0xFFRRGGBB)
 * Restored from original logic
 */
const getRiveColor = (variable) => {
    const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    const cleanHex = color.replace('#', '').trim();
    return parseInt(`0xFF${cleanHex}`, 16);
};

function updateAnimation(type) {
    // CRITICAL: Prevent continuous reloading if already in this state
    if (currentState === type) return; 
    currentState = type;

    let tCol, bCol;
    if (type === "error") {
        tCol = getRiveColor('--error-dark');
        bCol = getRiveColor('--error-mid');
    } else if (type === "success") {
        tCol = getRiveColor('--success-dark');
        bCol = getRiveColor('--success-mid');
    } else {
        // Default BetMGM colors
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
            try {
                const vm = r.viewModelByName('ViewModel1');
                const vmi = vm.defaultInstance();

                if (vmi) {
                    r.bindViewModelInstance(vmi);
                    
                    // Set the string value
                    vmi.string('document_type').value = type;

                    // 1. Update Main Color Properties
                    vmi.color("gradient_top").value = tCol;
                    vmi.color("gradient_bottom").value = bCol;

                    // 2. Restored: Update sub-state layer colors
                    const states = ["success", "pending", "error", "cs"];
                    states.forEach(state => {
                        const topProp = vmi.color(`gradient_top_${state}`);
                        const bottomProp = vmi.color(`gradient_bottom_${state}`);
                        
                        if (topProp) topProp.value = tCol;
                        if (bottomProp) bottomProp.value = bCol;
                    });

                    r.play('State Machine 1');
                }
            } catch (e) {
                console.error('[Rive] Initialization Error:', e.message);
            }
        }
    });
}

function handleSensors(event) {
    const acc = event.acceleration;
    const movement = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    window.ondeviceorientation = (orient) => {
        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        // TABLE DETECTION: If flat and movement is below floor, trigger ERROR ONCE
        if (isFlat && movement < JITTER_FLOOR) {
            stopSuccessTimer();
            updateAnimation("error"); 
        } 
        // HANDHELD DETECTION: If flat and movement is above floor, start SUCCESS progress
        else if (isFlat && movement >= JITTER_FLOOR && !successTriggered) {
            if (currentState === "error") updateAnimation("verification");
            startSuccessTimer();
        } 
        // RESET: If tilted or picked up
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
        progress += 2; // 5 seconds total
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(timerInterval);
            successTriggered = true;
            updateAnimation("success");
            // No alert for error, but keeping alert for success as per previous requirement
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

// User Activation
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