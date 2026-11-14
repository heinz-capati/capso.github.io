// theme.js — CAPSo Design System Tokens & Light/Dark Theme Engine
// Presentation only. Loaded immediately after https://cdn.tailwindcss.com on every page.
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
            },
            colors: {
                // Cool, low-glare structural neutrals (reduced blue light vs. pure slate)
                graphite: {
                    50: '#f5f6f8',
                    100: '#e7e9ee',
                    200: '#cdd1da',
                    300: '#a9afbc',
                    400: '#848b9a',
                    500: '#626978',
                    600: '#495060',
                    700: '#333945',
                    800: '#232831',
                    850: '#1b1f27',
                    900: '#14171d',
                    950: '#0d0f13'
                }
            },
            boxShadow: {
                panel: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 2px 0 rgba(0,0,0,0.45), 0 10px 28px -14px rgba(0,0,0,0.7)',
                raised: 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 2px 4px 0 rgba(0,0,0,0.45), 0 18px 40px -16px rgba(0,0,0,0.85)',
                modal: 'inset 0 1px 0 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.5), 0 32px 80px -20px rgba(0,0,0,0.9)',
                'glow-amber': '0 0 0 1px rgba(251,191,36,0.35), 0 8px 24px -8px rgba(245,158,11,0.55)',
                'glow-rose': '0 0 0 1px rgba(251,113,133,0.35), 0 8px 24px -8px rgba(244,63,94,0.55)',
                'glow-emerald': '0 0 0 1px rgba(52,211,153,0.3), 0 8px 24px -10px rgba(16,185,129,0.5)'
            },
            backgroundImage: {
                blueprint: 'linear-gradient(rgba(148,163,184,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.035) 1px, transparent 1px)',
                'amber-sheen': 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 45%, #f97316 100%)'
            },
            backgroundSize: {
                'grid-32': '32px 32px'
            }
        }
    }
};

(function () {
    const THEME_STORAGE_KEY = 'capso_erp_theme';
    window.CAPSO_THEME_KEY = THEME_STORAGE_KEY;

    function injectLightModeStylesheet() {
        if (typeof document === 'undefined' || !document.head) return;
        if (document.getElementById('capso-theme-overrides')) return;

        const style = document.createElement('style');
        style.id = 'capso-theme-overrides';
        style.textContent = `
/* Enhanced Readability Typography Scale (Dark & Light Mode) */
html {
    font-size: 17px;
}

.text-\\[10px\\] {
    font-size: 0.76rem !important;
    line-height: 1.15rem !important;
}

.text-\\[11px\\] {
    font-size: 0.82rem !important;
    line-height: 1.25rem !important;
}

.text-xs {
    font-size: 0.86rem !important;
    line-height: 1.3rem !important;
}

.text-sm {
    font-size: 0.96rem !important;
    line-height: 1.45rem !important;
}

.text-base {
    font-size: 1.06rem !important;
    line-height: 1.55rem !important;
}

@media (min-width: 640px) {
    .sm\\:text-xs {
        font-size: 0.86rem !important;
        line-height: 1.3rem !important;
    }

    .sm\\:text-sm {
        font-size: 0.96rem !important;
        line-height: 1.45rem !important;
    }

    .sm\\:text-base {
        font-size: 1.06rem !important;
        line-height: 1.55rem !important;
    }
}

/* Light Mode ("Industrial Daylight Slate & Safety Amber") overrides */
html.light {
    color-scheme: light !important;
    background-color: #f8fafc !important;
    background-image: linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px) !important;
}

html.light body {
    color: #0f172a !important;
    background-color: transparent !important;
}

/* Sticky Header & Mobile Nav Drawer */
html.light header.sticky {
    background-color: rgba(255, 255, 255, 0.92) !important;
    border-color: #e2e8f0 !important;
}

html.light #mobile-menu {
    background-color: rgba(255, 255, 255, 0.98) !important;
    border-color: #e2e8f0 !important;
}

html.light .bg-white\\/\\[0\\.07\\] {
    background-color: rgba(245, 158, 11, 0.14) !important;
}

/* Primary Elevated Cards, Calendar Columns, Modals & Toasts */
html.light .bg-graphite-900,
html.light .bg-graphite-900\\/80,
html.light .bg-graphite-900\\/90,
html.light .bg-graphite-850,
html.light .bg-zinc-900\\/90,
html.light .bg-zinc-900\\/80,
html.light .bg-zinc-900\\/70,
html.light .bg-zinc-900 {
    background-color: #ffffff !important;
}

/* Inset Panel Footers, Table Heads & Modal Info Panels */
html.light .bg-graphite-950,
html.light .bg-graphite-950\\/60,
html.light .bg-graphite-950\\/40,
html.light .bg-zinc-950,
html.light .bg-zinc-950\\/80,
html.light .bg-zinc-950\\/60,
html.light .bg-zinc-950\\/40 {
    background-color: #f8fafc !important;
}

/* Nested Chips, Secondary Action Buttons & Item Rows */
html.light .bg-graphite-800,
html.light .bg-zinc-800,
html.light .bg-zinc-800\\/90,
html.light .bg-white\\/5,
html.light .order-item-row,
html.light .dr-item-row {
    background-color: #f1f5f9 !important;
}

html.light .bg-graphite-700,
html.light .bg-graphite-700\\/80 {
    background-color: #e2e8f0 !important;
}

html.light .hover\\:bg-graphite-700:hover,
html.light .hover\\:bg-zinc-700:hover,
html.light .hover\\:bg-zinc-800:hover,
html.light .hover\\:bg-white\\/5:hover {
    background-color: #e2e8f0 !important;
}

html.light .hover\\:bg-zinc-900:hover {
    background-color: #ffffff !important;
}

/* Table Alternating Striping & Row Hover */
html.light tr.odd\\:bg-zinc-900\\/35:nth-child(odd),
html.light tr.odd\\:bg-zinc-900\\/40:nth-child(odd) {
    background-color: #ffffff !important;
}

html.light tr.even\\:bg-zinc-950\\/25:nth-child(even),
html.light tr.even\\:bg-zinc-950\\/30:nth-child(even) {
    background-color: #f8fafc !important;
}

html.light tr.hover\\:bg-zinc-800\\/70:hover,
html.light tr.hover\\:bg-zinc-800\\/60:hover {
    background-color: #f1f5f9 !important;
}

/* Modal Backdrop */
html.light [data-motion="backdrop"],
html.light #demo-disclaimer-backdrop {
    background-color: rgba(15, 23, 42, 0.45) !important;
}

/* Form Controls: Inputs & Selects */
html.light input:not([type="checkbox"]):not([type="radio"]),
html.light select,
html.light textarea {
    background-color: #ffffff !important;
    color: #0f172a !important;
    border-color: #cbd5e1 !important;
    --tw-ring-color: #cbd5e1 !important;
}

html.light input::placeholder,
html.light textarea::placeholder {
    color: #94a3b8 !important;
}

html.light input:focus,
html.light select:focus,
html.light textarea:focus {
    border-color: #f59e0b !important;
    --tw-ring-color: rgba(245, 158, 11, 0.7) !important;
}

html.light #dr-modal input:focus,
html.light #dr-modal select:focus {
    border-color: #10b981 !important;
    --tw-ring-color: rgba(16, 185, 129, 0.7) !important;
}

/* Generated Quote Preview in Quotation Builder */
html.light #generated-quote-preview {
    background-color: #f8fafc !important;
    color: #0f172a !important;
    --tw-ring-color: #cbd5e1 !important;
}

/* Primary & Secondary Typography */
html.light .text-white:not(.bg-rose-500):not([class*="bg-rose-600"]),
html.light .text-graphite-50,
html.light .text-graphite-100,
html.light .text-zinc-100 {
    color: #0f172a !important;
}

html.light .text-graphite-200,
html.light .text-graphite-300,
html.light .text-zinc-200,
html.light .text-zinc-300 {
    color: #334155 !important;
}

html.light .text-graphite-400,
html.light .text-graphite-500,
html.light .text-zinc-400,
html.light .text-zinc-500,
html.light .text-zinc-600 {
    color: #64748b !important;
}

/* Semantic & Accent Colors Tuned for Light Surfaces (WCAG AA+) */
html.light .text-amber-200,
html.light .text-amber-300,
html.light .text-amber-300\\/90,
html.light .text-amber-400 {
    color: #b45309 !important;
}

html.light .text-amber-100\\/80,
html.light .text-amber-100\\/90 {
    color: #78350f !important;
}

html.light .bg-amber-400\\/\\[0\\.06\\] {
    background-color: rgba(245, 158, 11, 0.1) !important;
}

html.light .bg-amber-400\\/10,
html.light .bg-amber-400\\/15 {
    background-color: rgba(245, 158, 11, 0.14) !important;
}

html.light .text-emerald-200,
html.light .text-emerald-300,
html.light .text-emerald-400 {
    color: #047857 !important;
}

html.light .bg-emerald-400\\/10,
html.light .bg-emerald-400\\/15 {
    background-color: rgba(16, 185, 129, 0.12) !important;
}

html.light .text-rose-200,
html.light .text-rose-300,
html.light .text-rose-400 {
    color: #be123c !important;
}

html.light .bg-rose-500\\/10,
html.light .bg-rose-500\\/15 {
    background-color: rgba(244, 63, 94, 0.12) !important;
}

html.light .text-sky-300 {
    color: #0369a1 !important;
}

html.light .bg-sky-400\\/10 {
    background-color: rgba(14, 165, 233, 0.12) !important;
}

html.light .text-violet-300 {
    color: #6d28d9 !important;
}

html.light .bg-violet-400\\/10 {
    background-color: rgba(139, 92, 246, 0.12) !important;
}

/* Hover text states inside Light Mode buttons & links */
html.light .hover\\:text-white:hover {
    color: #0f172a !important;
}

html.light .hover\\:text-amber-200:hover,
html.light .hover\\:text-amber-300:hover {
    color: #92400e !important;
}

html.light .hover\\:bg-amber-400:hover {
    background-color: #fbbf24 !important;
}

html.light .hover\\:text-zinc-950:hover {
    color: #09090b !important;
}

html.light .hover\\:text-rose-200:hover,
html.light .hover\\:text-rose-300:hover {
    color: #9f1239 !important;
}

html.light .hover\\:text-emerald-200:hover {
    color: #065f46 !important;
}

/* Borders, Dividers & Rings */
html.light .border-white\\/\\[0\\.06\\],
html.light .border-zinc-800,
html.light .border-zinc-800\\/80 {
    border-color: #e2e8f0 !important;
}

html.light .border-zinc-700 {
    border-color: #cbd5e1 !important;
}

html.light .divide-white\\/\\[0\\.04\\] > :not([hidden]) ~ :not([hidden]),
html.light .divide-white\\/\\[0\\.05\\] > :not([hidden]) ~ :not([hidden]),
html.light .divide-zinc-800 > :not([hidden]) ~ :not([hidden]) {
    border-color: #e2e8f0 !important;
}

html.light [class*="ring-white/"],
html.light .ring-zinc-800 {
    --tw-ring-color: #e2e8f0 !important;
}

html.light .ring-zinc-700,
html.light [class*="ring-zinc-700/"] {
    --tw-ring-color: #cbd5e1 !important;
}

html.light .hover\\:ring-zinc-700:hover,
html.light .hover\\:ring-white\\/\\[0\\.12\\]:hover,
html.light .hover\\:ring-white\\/20:hover {
    --tw-ring-color: #94a3b8 !important;
}

html.light .hover\\:ring-amber-400\\/50:hover {
    --tw-ring-color: rgba(245, 158, 11, 0.65) !important;
}

/* Elevated Light Mode Shadows (preserves Tailwind ring variables) */
html.light .shadow-panel {
    --tw-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.1) !important;
}

html.light .shadow-raised {
    --tw-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 16px 32px -12px rgba(15, 23, 42, 0.12) !important;
}

html.light .shadow-modal {
    --tw-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08), 0 24px 64px -16px rgba(15, 23, 42, 0.25) !important;
}

html.light .shadow-glow-amber {
    --tw-shadow: 0 0 0 1px rgba(217, 119, 6, 0.35), 0 6px 16px -6px rgba(245, 158, 11, 0.35) !important;
}

html.light .shadow-glow-emerald {
    --tw-shadow: 0 0 0 1px rgba(5, 150, 105, 0.3), 0 6px 16px -6px rgba(16, 185, 129, 0.3) !important;
}

html.light .shadow-glow-rose {
    --tw-shadow: 0 0 0 1px rgba(225, 29, 72, 0.3), 0 6px 16px -6px rgba(244, 63, 94, 0.3) !important;
}
`;
        document.head.appendChild(style);
    }

    function getCapsoTheme() {
        try {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            return saved === 'light' ? 'light' : 'dark';
        } catch (err) {
            return 'dark';
        }
    }

    function updateThemeToggleUI(theme) {
        if (typeof document === 'undefined') return;
        const btn = document.getElementById('theme-toggle-btn');
        const sunIcon = document.getElementById('theme-icon-sun');
        const moonIcon = document.getElementById('theme-icon-moon');
        const label = document.getElementById('theme-toggle-label');
        if (!btn) return;

        const isLight = theme === 'light';
        if (sunIcon) sunIcon.classList.toggle('hidden', isLight);
        if (moonIcon) moonIcon.classList.toggle('hidden', !isLight);
        if (label) label.textContent = isLight ? 'Dark' : 'Light';
        btn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
        btn.setAttribute('aria-label', isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode');
        btn.setAttribute('aria-pressed', String(isLight));
    }

    function applyCapsoTheme(theme) {
        const nextTheme = theme === 'light' ? 'light' : 'dark';
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(nextTheme);
            root.style.colorScheme = nextTheme;

            const themeMeta = document.querySelector('meta[name="theme-color"]');
            if (themeMeta) {
                themeMeta.setAttribute('content', nextTheme === 'light' ? '#f8fafc' : '#0d0f13');
            }
        }

        try {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch (err) {
            // Ignore storage access errors in restricted contexts
        }

        updateThemeToggleUI(nextTheme);
        return nextTheme;
    }

    function toggleCapsoTheme() {
        const current = getCapsoTheme();
        return applyCapsoTheme(current === 'light' ? 'dark' : 'light');
    }

    window.getCapsoTheme = getCapsoTheme;
    window.applyCapsoTheme = applyCapsoTheme;
    window.toggleCapsoTheme = toggleCapsoTheme;

    injectLightModeStylesheet();
    applyCapsoTheme(getCapsoTheme());

    if (typeof document !== 'undefined') {
        document.addEventListener('navigationLoaded', () => {
            updateThemeToggleUI(getCapsoTheme());
        });
    }
})();
