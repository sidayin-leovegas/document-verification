let r;
const canvas = document.getElementById('mainCanvas');
const generateBtn = document.getElementById('generateBtn');
const modal = document.getElementById('animationModal');
const closeModal = document.getElementById('closeModal');
const radioGroups = ['theme-group', 'win-group', 'ex-group'];

function validateSelection() {
    const allSelected = radioGroups.every(name => 
        document.querySelector(`input[name="${name}"]:checked`)
    );
    generateBtn.disabled = !allSelected;
}

document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', validateSelection);
});

function getSelection(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : null;
}

function getThemeText() {
    const selected = document.querySelector('input[name="theme-group"]:checked');
    return selected ? selected.nextElementSibling.textContent.trim() : null;
}

function getWinText(level) {
    const winMap = { 1: "MINI WIN", 2: "MINOR WIN", 3: "MAJOR WIN", 4: "MEGA WIN" };
    return winMap[level] || "";
}

function getWinAmount(level) {
    const amountMap = {
        1: "783,38 kr",
        2: "1 894,29 kr",
        3: "250 023,12 kr",
        4: "12 989 128,92 kr"
    };
    return amountMap[level] || "0,00 kr";
}

function initRive() {
    const themeName = getThemeText();
    const winLevel = parseInt(getSelection('win-group'));
    const exLevel = parseInt(getSelection('ex-group'));
    const winText = getWinText(winLevel);
    const winAmount = getWinAmount(winLevel);

    if (r) { r.cleanup(); }

    r = new rive.Rive({
        src: 'assets/global_jackpot_wheels_2026.riv?v=16', // Bumped for winDiamond
        canvas: canvas,
        artboard: 'Jackpot animation',
        stateMachines: 'State Machine 1',
        autoplay: true,
        layout: new rive.Layout({
            fit: rive.Fit.Cover,
            alignment: rive.Alignment.BottomCenter,
        }),
        onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            modal.classList.add('active');

            try {
                const jackpotVM = r.viewModelByName('Jackpot');
                const vmi = jackpotVM.instanceByName('Jackpot Instance');

                if (vmi) {
                    r.bindViewModelInstance(vmi);
                    
                    // 1. Set Numbers and Main Strings
                    vmi.number('winLevel').value = winLevel;
                    vmi.number('excitementLevel').value = exLevel;
                    
                    if (vmi.string('brand')) vmi.string('brand').value = themeName;
                    if (vmi.string('introText')) vmi.string('introText').value = "JACKPOT TRIGGERED!";
                    if (vmi.string('winText')) vmi.string('winText').value = winText;
                    if (vmi.string('winAmount')) vmi.string('winAmount').value = winAmount;

                    // 2. Update Nested Components including the new winDiamond
                    const brandComponents = {
                        'spin1': vmi.viewModel('spin1'),
                        'spin2': vmi.viewModel('spin2correct'),
                        'spin3': vmi.viewModel('spin3correct'),
                        'spin4': vmi.viewModel('spin4correct'),
                        'indicator': vmi.viewModel('indicator'),
                        'logo': vmi.viewModel('logo'),
                        'winDiamond': vmi.viewModel('winDiamond') // Added per Rive agent
                    };

                    for (const key in brandComponents) {
                        const vm = brandComponents[key];
                        if (vm) {
                            const componentBrand = vm.string('brand');
                            if (componentBrand) componentBrand.value = themeName;
                        }
                    }
                    
                    r.play('State Machine 1');
                }
            } catch (e) {
                console.error('[Rive] Initialization Error:', e.message);
            }
        }
    });
}

generateBtn.addEventListener('click', initRive);

closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
    if (r) { r.cleanup(); }
});

const ro = new ResizeObserver(() => {
    if (r && canvas) r.resizeDrawingSurfaceToCanvas();
});
if (canvas.parentElement) ro.observe(canvas.parentElement);