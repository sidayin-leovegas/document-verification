let r;
const canvas = document.getElementById('mainCanvas');
let isOnTable = false;
let flatTimer = null;

// Thresholds
const FLAT_ANGLE = 5; 
const MOTION_THRESHOLD = 0.05; // Adjust this to fine-tune "hand jitters"

function initRive(docType = "verification") {
    if (r) r.cleanup();

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
                
                // Force the string value to the requested state
                const docTypeProp = vmi.string('document_type');
                if (docTypeProp) {
                    docTypeProp.value = docType;
                }
                
                // Ensure colors are also set for the error/success states
                vmi.color("gradient_top").value = cssToRiveColor("#7f39fb");
                vmi.color("gradient_bottom").value = cssToRiveColor("#985eff");
                
                r.play('State Machine 1');
            }
        }
    });
}

function handleMotion(event) {
    const acc = event.acceleration; // Acceleration EXCLUDING gravity
    const totalMovement = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    // Get rotation to check if it's flat
    // Note: We use a global variable or separate listener for orientation
}

window.addEventListener('deviceorientation', (e) => {
    const isFlat = Math.abs(e.beta) < FLAT_ANGLE && Math.abs(e.gamma) < FLAT_ANGLE;
    
    // We'll use devicemotion to check the "stillness"
    window.ondevicemotion = (m) => {
        const acc = m.acceleration;
        const stillness = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

        // CASE 1: ON A TABLE (Flat + Zero Movement)
        if (isFlat && stillness < MOTION_THRESHOLD) {
            if (!isOnTable) {
                isOnTable = true;
                initRive("error");
                alert("Error: Device placed on flat surface.");
            }
        } 
        
        // CASE 2: PICKED UP (Not Flat or Significant Movement)
        else if (!isFlat || stillness > MOTION_THRESHOLD) {
            if (isOnTable) {
                isOnTable = false;
                initRive("verification");
            }
        }

        // CASE 3: SUCCESS (Flat + Hand Jitters)
        // If it's flat but STILLNESS is > threshold, they are holding it flat
        if (isFlat && stillness >= MOTION_THRESHOLD && !flatTimer) {
             flatTimer = setTimeout(() => {
                 initRive("success");
                 alert("Success: Held flat for 5s");
             }, 5000);
        } else if (!isFlat) {
            clearTimeout(flatTimer);
            flatTimer = null;
        }
    };
});