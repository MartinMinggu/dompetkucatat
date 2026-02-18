// Service Worker Registration & PWA Install
let deferredPrompt = null;

export function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js')
            .then((reg) => console.log('[SW] Registered:', reg.scope))
            .catch((err) => console.warn('[SW] Registration failed:', err));
    }
}

// Capture install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install button if exists
    const btn = document.getElementById('install-btn');
    if (btn) {
        btn.classList.remove('hidden');
        btn.addEventListener('click', installPWA);
    }
});

export async function installPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    console.log('[PWA] Install:', result.outcome);
    deferredPrompt = null;

    const btn = document.getElementById('install-btn');
    if (btn) btn.classList.add('hidden');
}

// Detect if already installed
window.addEventListener('appinstalled', () => {
    console.log('[PWA] Installed successfully');
    deferredPrompt = null;
});
