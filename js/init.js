let r; 
const canvas = document.getElementById('mainCanvas');

/**
 * Gets the value of the currently selected radio button in a group
 */
function getSelectedDocType() {
    const selected = document.querySelector('input[name="doc-group"]:checked');
    // We use .value from the HTML element (e.g., value="ID", value="passport")
    return selected ? selected.value : "verification"; 
}

/**
 * Helper to convert CSS hex strings (#RRGGBB) to Rive hex numbers (0xFFRRGGBB)
 * Rive expects a number in the format 0xAARRGGBB.
 */
const cssToRiveColor = (cssColor) => {
    const cleanHex = cssColor.replace('#', '').trim();
    // Handle shorthand hex like #FFF -> #FFFFFF
    const fullHex = cleanHex.length === 3 
        ? cleanHex.split('').map(char => char + char).join('') 
        : cleanHex;
    // Prepend 'FF' for full opacity (Alpha channel)
    return parseInt(`0xFF${fullHex}`, 16);
};

function initRive() {
    const selectedDocType = getSelectedDocType();

    // 1. Extract the current theme colors from your CSS variables
    const topAnimElement = document.querySelector('.top-animation');
    const style = window.getComputedStyle(topAnimElement);
    
    const topColorCSS = style.getPropertyValue('--bg-top').trim() || "#F1F1F8"; 
    const bottomColorCSS = style.getPropertyValue('--bg-bottom').trim() || "#D1D1D8";

    // Convert CSS strings to Rive-compatible numbers
    const topColor = cssToRiveColor(topColorCSS);
    const bottomColor = cssToRiveColor(bottomColorCSS);
    console.log("getting colors: ", topColorCSS, bottomColorCSS);

    // Clean up existing instance if it exists
    if (r) {
        r.cleanup();
    }

    // 2. Initialize the Rive Instance
    r = new rive.Rive({
      src: 'assets/document_requst_animation.riv',
      canvas: canvas,
      stateMachines: 'State Machine 1',
      // 1. Set the renderer to webgl2
      renderer: 'webgl2', 
      // 2. ENABLE THIS for blurs/feathers to show up
      useOffscreenRenderer: true, 
      layout: new rive.Layout({
          fit: rive.Fit.Cover,
          alignment: rive.Alignment.Center
      }),
      autoplay: true,
      onLoad: () => {
          r.resizeDrawingSurfaceToCanvas();            
            try {
                const vm = r.viewModelByName('ViewModel1');
                const vmi = vm.defaultInstance();

                if (vmi) {
                    // Physically bind the data model to the Artboard
                    r.bindViewModelInstance(vmi);
                    
                    // Update the Document Type string property
                    const docTypeProp = vmi.string('document_type');
                    if (docTypeProp) {
                        docTypeProp.value = selectedDocType;
                    }

                    // 3. Update Color Properties using the .color() typed accessor
                    vmi.color("gradient_top").value = topColor;  
                    vmi.color("gradient_bottom").value = bottomColor;
                    const states = ["success", "pending", "error", "cs"];
                    states.forEach(state => {
                        // Access the color property object and set its .value
                        const topProp = vmi.color(`gradient_top_${state}`);
                        const bottomProp = vmi.color(`gradient_bottom_${state}`);
                        
                        if (topProp) {
                            topProp.value = topColor;
                        }
                        if (bottomProp) {
                            bottomProp.value = bottomColor;
                        }
                    });

                    console.log(`[Rive] Successfully initialized with ${selectedDocType} and custom colors.`);
                    r.play('State Machine 1');
                }
            } catch (e) {
                console.error('[Rive] ViewModel Initialization Error:', e.message);
            }
        }
    });
}

// --- Event Listeners ---
document.querySelectorAll('input[name="doc-group"]').forEach(radio => {
    // Calling updateDocType instead of initRive for smoother transitions
    radio.addEventListener('change', initRive); 
});

document.querySelectorAll('input[name="theme-group"]').forEach(radio => {
    radio.addEventListener('change', initRive);
});

const ro = new ResizeObserver(() => {
    if (r && canvas) r.resizeDrawingSurfaceToCanvas();
});
if (canvas.parentElement) ro.observe(canvas.parentElement);


initRive();