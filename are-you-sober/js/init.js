let r;
const canvas = document.getElementById('mainCanvas');
let flatTimer = null;
let isCurrentlyFlat = false;
let lastState = "verification";

// Sensitivity thresholds
const FLAT_THRESHOLD = 5; // Degrees from 0 to be considered "flat"
const MOTION_THRESHOLD = 0.5; // Change in degrees to consider "moving"
let lastBeta = 0;
let lastGamma = 0;

function cssToRiveColor(cssColor) {
    const cleanHex = cssColor.replace('#', '').trim();
    return parseInt(`0xFF${cleanHex}`, 16);
}

function initRive(docType = "verification") {
    if (r) r.cleanup();
    lastState = docType;

    const topColor = cssToRiveColor("#7f39fb");
    const bottomColor = cssToRiveColor("#985eff");

    r = new rive.Rive({
        src: 'assets/document_requst_animation.riv',
        canvas: canvas,
        stateMachines: 'State Machine 1',
        renderer: 'webgl2',
        useOffscreenRenderer: true,
        autoplay: true,
        onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            const vmi = r.viewModelByName('ViewModel1')?.defaultInstance();
            if (vmi) {
                r.bindViewModelInstance(vmi);
                vmi.string('document_type').value = docType;
                vmi.color("gradient_top").value = topColor;
                vmi.color("gradient_bottom").value = bottomColor;
                r.play('State Machine 1');
            }
        }
    });
}

function handleOrientation(event) {
    const beta = event.beta;   // -180 to 180 (front/back)
    const gamma = event.gamma; // -90 to 90 (left/right)

    // Check if device is flat (approx 0,0)
    const isFlat = Math.abs(beta) < FLAT_THRESHOLD && Math.abs(gamma) < FLAT_THRESHOLD;
    
    // Check if device is static
    const isMoving = Math.abs(beta - lastBeta) > MOTION_THRESHOLD || Math.abs(gamma - lastGamma) > MOTION_THRESHOLD;
    
    lastBeta = beta;
    lastGamma = gamma;

    // Logic: Put down on static flat surface -> Error
    if (isFlat && !isMoving && lastState !== "error") {
        initRive("error");
        alert("error");
        clearTimeout(flatTimer);
        return;
    }

    // Logic: Picked up from static -> Back to Verification
    if (!isFlat && lastState === "error") {
        initRive("verification");
    }

    // Logic: Holding flat for 5 seconds -> Success
    if (isFlat && isMoving) {
        if (!isCurrentlyFlat) {
            isCurrentlyFlat = true;
            flatTimer = setTimeout(() => {
                initRive("success");
                alert("success");
            }, 5000);
        }
    } else {
        isCurrentlyFlat = false;
        clearTimeout(flatTimer);
    }
}

// Permission Request & Init
document.getElementById('start-btn').addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    document.getElementById('sensor-overlay').style.display = 'none';
                    initRive("verification");
                }
            });
    } else {
        // Desktop or non-iOS
        window.addEventListener('deviceorientation', handleOrientation);
        document.getElementById('sensor-overlay').style.display = 'none';
        initRive("verification");
    }
});