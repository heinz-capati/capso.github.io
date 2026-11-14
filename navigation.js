// navigation.js - Shared Navigation Loader with Built-In Fallback for file:// & Offline
const FALLBACK_NAV_HTML = `
<!-- nav.html - CAPSo Enterprise ERP Navigation (Graphite & Safety Amber) -->
<header class="sticky top-0 z-30 border-b border-white/[0.06] bg-graphite-950/80 backdrop-blur-xl">
    <div aria-hidden="true" class="h-0.5 w-full bg-amber-sheen"></div>
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="relative flex h-16 items-center justify-between gap-4">

            <!-- Mobile menu button -->
            <div class="flex items-center sm:hidden">
                <button type="button" id="mobile-menu-button" class="inline-flex items-center justify-center rounded-lg p-2 text-graphite-300 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-controls="mobile-menu" aria-expanded="false">
                    <span class="sr-only">Open main menu</span>
                    <svg id="hamburger-icon" class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                    <svg id="close-icon" class="hidden h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Brand & Desktop Navigation -->
            <div class="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                <a href="index.html" class="group flex flex-shrink-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                    <img src="Images/logo-192.png" alt="CAPSo Logo" onerror="this.src='images/logo-192.png'; this.onerror=null;" class="h-9 w-9 rounded-lg bg-amber-400 p-1.5 shadow-glow-amber ring-1 ring-amber-300/60 transition-transform duration-200 group-hover:scale-105">
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-bold tracking-tight text-white">CAPSo</span>
                        <span class="hidden md:inline-flex items-center rounded-md bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300 ring-1 ring-inset ring-amber-400/25">Enterprise ERP</span>
                    </div>
                </a>
                <div class="hidden sm:ml-8 sm:flex sm:items-center">
                    <nav class="flex space-x-1" aria-label="Global">
                        <a href="index.html" class="nav-link rounded-lg px-3.5 py-2 text-sm font-medium text-graphite-400 transition-colors hover:bg-white/5 hover:text-white">
                            Outbound &amp; Dispatch
                        </a>
                        <a href="inventory.html" class="nav-link rounded-lg px-3.5 py-2 text-sm font-medium text-graphite-400 transition-colors hover:bg-white/5 hover:text-white">
                            Inventory, DR &amp; Quotes
                        </a>
                    </nav>
                </div>
            </div>

            <!-- Right Controls (Theme Toggle, Demo Initializer & PWA Install) -->
            <div class="flex items-center gap-2 sm:gap-3">
                <button id="theme-toggle-btn" type="button" class="inline-flex items-center gap-x-1.5 rounded-lg bg-graphite-800 px-3 py-1.5 text-xs font-semibold text-graphite-200 ring-1 ring-inset ring-white/10 transition-all duration-150 hover:bg-graphite-700 hover:text-white hover:ring-white/20 active:scale-[0.97] sm:text-sm" title="Switch to Light Mode" aria-label="Switch to Light Mode" aria-pressed="false">
                    <svg id="theme-icon-sun" class="h-4 w-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                    </svg>
                    <svg id="theme-icon-moon" class="hidden h-4 w-4 text-graphite-300" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                    </svg>
                    <span id="theme-toggle-label" class="hidden sm:inline">Light</span>
                </button>

                <button id="nav-seed-demo-btn" type="button" class="inline-flex items-center gap-x-1.5 rounded-lg bg-graphite-800 px-3 py-1.5 text-xs font-semibold text-graphite-200 ring-1 ring-inset ring-white/10 transition-all duration-150 hover:bg-graphite-700 hover:text-white hover:ring-white/20 active:scale-[0.97] sm:text-sm" title="Inject 30 realistic hardware SKUs into Firestore">
                    <svg class="h-4 w-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                    <span class="hidden sm:inline">Seed 30 Demo SKUs</span>
                    <span class="sm:hidden">Seed Demo</span>
                </button>

                <button id="install-app-btn" type="button" class="hidden items-center gap-x-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-graphite-950 shadow-glow-amber transition-all duration-150 hover:bg-amber-300 active:scale-[0.97] sm:text-sm">
                    <svg class="-ml-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                    </svg>
                    Install App
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile Navigation Menu -->
    <div class="sm:hidden hidden border-t border-white/[0.06] bg-graphite-950/95" id="mobile-menu">
        <div class="space-y-1 px-4 pb-3 pt-2">
            <a href="index.html" class="nav-link-mobile block rounded-lg px-3 py-2 text-base font-medium text-graphite-400 hover:bg-white/5 hover:text-white">Outbound &amp; Dispatch</a>
            <a href="inventory.html" class="nav-link-mobile block rounded-lg px-3 py-2 text-base font-medium text-graphite-400 hover:bg-white/5 hover:text-white">Inventory, DR &amp; Quotes</a>
        </div>
    </div>

    <!-- Non-Invasive Demo Disclaimer Strip -->
    <div id="demo-disclaimer-banner" class="border-t border-white/[0.05] bg-graphite-950/60">
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-left text-[11px] text-graphite-400 sm:px-6 lg:px-8">
            <p class="truncate">
                <span class="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle"></span>
                <span class="font-medium text-graphite-200">Demo Environment</span>
                <span class="mx-1.5 text-graphite-600">·</span>
                <span>All customer details, addresses, orders, and inventory records are fictional.</span>
            </p>
            <button type="button" id="open-disclaimer-modal-btn" class="flex-shrink-0 font-medium text-graphite-300 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white">Notice</button>
        </div>
    </div>
</header>

<!-- Minimalist Pop-Up Demo Disclaimer Modal -->
<div id="demo-disclaimer-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="demo-disclaimer-title">
    <div id="demo-disclaimer-backdrop" class="fixed inset-0 bg-graphite-950/70 backdrop-blur-sm"></div>
    <div class="relative z-10 w-full max-w-sm rounded-xl bg-graphite-900 p-5 text-left shadow-modal ring-1 ring-white/10">
        <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400">Demo Environment</p>
        <h3 id="demo-disclaimer-title" class="mt-1 text-sm font-semibold text-white">Fictional Sample Data</h3>
        <p class="mt-1.5 text-xs leading-relaxed text-graphite-400">
            This application is a live portfolio demonstration. All customer names, delivery addresses, SKUs, and transactions are fictional and for demo purposes only.
        </p>
        <div class="mt-4 flex justify-end border-t border-white/[0.06] pt-3">
            <button type="button" id="dismiss-disclaimer-btn" class="rounded-lg bg-graphite-800 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/10 transition-colors hover:bg-graphite-700 active:scale-[0.98]">
                Continue
            </button>
        </div>
    </div>
</div>
`;

document.addEventListener("DOMContentLoaded", function () {
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (!navPlaceholder) {
        console.error("Critical Error: Navigation placeholder div not found!");
        return;
    }

    function mountNavigation(html) {
        navPlaceholder.innerHTML = html;
        highlightActiveLink();

        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        const hamburgerIcon = document.getElementById('hamburger-icon');
        const closeIcon = document.getElementById('close-icon');

        if (mobileMenuButton && mobileMenu && hamburgerIcon && closeIcon) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
                hamburgerIcon.classList.toggle('hidden');
                closeIcon.classList.toggle('hidden');
            });
        }

        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (typeof window.applyCapsoTheme === 'function' && typeof window.getCapsoTheme === 'function') {
            window.applyCapsoTheme(window.getCapsoTheme());
        }
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                if (typeof window.toggleCapsoTheme === 'function') {
                    window.toggleCapsoTheme();
                }
            });
        }

        // Demo Disclaimer Pop-Up & Re-open Trigger
        const DISCLAIMER_KEY = 'capso_demo_disclaimer_dismissed';
        const disclaimerModal = document.getElementById('demo-disclaimer-modal');
        const disclaimerBackdrop = document.getElementById('demo-disclaimer-backdrop');
        const dismissDisclaimerBtn = document.getElementById('dismiss-disclaimer-btn');
        const openDisclaimerBtn = document.getElementById('open-disclaimer-modal-btn');

        const openDisclaimerModal = () => {
            if (disclaimerModal) disclaimerModal.classList.remove('hidden');
        };

        const closeDisclaimerModal = () => {
            if (disclaimerModal) disclaimerModal.classList.add('hidden');
            try {
                sessionStorage.setItem(DISCLAIMER_KEY, 'true');
            } catch (err) {
                // Ignore storage errors in restricted contexts
            }
        };

        if (disclaimerModal) {
            let dismissed = false;
            try {
                dismissed = sessionStorage.getItem(DISCLAIMER_KEY) === 'true';
            } catch (err) {
                dismissed = false;
            }
            if (!dismissed) {
                openDisclaimerModal();
            }
        }

        if (dismissDisclaimerBtn) dismissDisclaimerBtn.addEventListener('click', closeDisclaimerModal);
        if (disclaimerBackdrop) disclaimerBackdrop.addEventListener('click', closeDisclaimerModal);
        if (openDisclaimerBtn) openDisclaimerBtn.addEventListener('click', openDisclaimerModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && disclaimerModal && !disclaimerModal.classList.contains('hidden')) {
                closeDisclaimerModal();
            }
        });

        document.dispatchEvent(new CustomEvent('navigationLoaded'));
        console.log("Navigation loaded and 'navigationLoaded' event dispatched.");
    }

    // Browsers block fetch() on file:// URLs due to CORS; mount embedded nav directly
    if (window.location.protocol === 'file:') {
        mountNavigation(FALLBACK_NAV_HTML);
        return;
    }

    const cacheBustingUrl = `nav.html?v=${new Date().getTime()}`;

    fetch(cacheBustingUrl)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(html => {
            mountNavigation(html);
        })
        .catch(error => {
            console.warn('Could not fetch nav.html, mounting built-in navigation fallback:', error);
            mountNavigation(FALLBACK_NAV_HTML);
        });
});

function highlightActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const navLinks = document.querySelectorAll('nav a.nav-link');
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.remove('text-graphite-400', 'hover:bg-white/5', 'hover:text-white');
            link.classList.add('bg-white/[0.07]', 'text-white', 'ring-1', 'ring-inset', 'ring-amber-400/30', 'shadow-[inset_0_-2px_0_0_rgb(251,191,36)]');
        }
    });

    const mobileNavLinks = document.querySelectorAll('#mobile-menu a.nav-link-mobile');
    mobileNavLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.remove('text-graphite-400', 'hover:bg-white/5', 'hover:text-white');
            link.classList.add('bg-amber-400/10', 'text-amber-300');
        }
    });
}
