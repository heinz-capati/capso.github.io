// ui-motion.js — Presentation-only motion layer built on Motion (the Framer Motion engine, vanilla API).
// It observes the DOM and animates elements as they appear. It contains NO business logic,
// never reads or writes app state, and silently disables itself if Motion is unavailable
// or the user prefers reduced motion.
(function () {
    'use strict';

    const M = window.Motion;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!M || typeof M.animate !== 'function' || prefersReducedMotion) {
        console.info('[ui-motion] Animations disabled (Motion unavailable or reduced motion preferred).');
        return;
    }

    // Low-bounce springs: tactile and deliberate, settle fast without wobble.
    const SPRING_SNAPPY = { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 };
    const SPRING_PANEL = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 };
    const FADE = { duration: 0.18, ease: 'easeOut' };

    // Runs an animation, suspends CSS transitions during it (so Tailwind hover transitions
    // don't fight Motion's per-frame updates) and clears inline styles afterwards so
    // Tailwind hover/active transforms keep working.
    function run(el, keyframes, options) {
        try {
            const prevTransition = el.style.transition;
            el.style.transition = 'none';
            if (keyframes.opacity) el.style.opacity = String(keyframes.opacity[0]);
            const controls = M.animate(el, keyframes, options);
            Promise.resolve(controls).then(() => {
                el.style.transition = prevTransition;
                el.style.transform = '';
                el.style.opacity = '';
            }).catch(() => {
                el.style.transition = prevTransition;
                el.style.opacity = '';
            });
            return controls;
        } catch (err) {
            el.style.opacity = '';
            return null;
        }
    }

    // ---------------------------------------------------------------
    // 1. Page entrance: KPI cards & panels rise in with a short stagger
    // ---------------------------------------------------------------
    document.querySelectorAll('[data-motion="rise"]').forEach((el, i) => {
        run(el, { opacity: [0, 1], y: [14, 0] }, { ...SPRING_PANEL, delay: 0.04 + i * 0.05 });
    });

    // ---------------------------------------------------------------
    // 2. Navigation bar fades down once navigation.js mounts it
    // ---------------------------------------------------------------
    document.addEventListener('navigationLoaded', () => {
        const header = document.querySelector('#nav-placeholder header');
        if (header) run(header, { opacity: [0, 1], y: [-10, 0] }, SPRING_SNAPPY);
    });

    // ---------------------------------------------------------------
    // 3. Modals: backdrop fades, panel springs up from below and scales in
    // ---------------------------------------------------------------
    document.querySelectorAll('[data-motion-modal]').forEach(modal => {
        let wasHidden = modal.classList.contains('hidden');
        new MutationObserver(() => {
            const isHidden = modal.classList.contains('hidden');
            if (wasHidden && !isHidden) {
                const backdrop = modal.querySelector('[data-motion="backdrop"]');
                const panel = modal.querySelector('[data-motion="panel"]');
                if (backdrop) run(backdrop, { opacity: [0, 1] }, FADE);
                if (panel) run(panel, { opacity: [0, 1], y: [28, 0], scale: [0.965, 1] }, SPRING_PANEL);
            }
            wasHidden = isHidden;
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    // ---------------------------------------------------------------
    // 4. Lists, tables, calendar and line items: staggered entry on render
    // ---------------------------------------------------------------
    const LIST_CONTAINERS = [
        '#orders-list-container',
        '#inventory-body',
        '#transactions-body',
        '#dashboard-transactions-body',
        '#quote-body',
        '#calendar-grid',
        '#items-container',
        '#dr-items-container',
        '#table-pagination'
    ];

    LIST_CONTAINERS.forEach(selector => {
        const container = document.querySelector(selector);
        if (!container) return;
        new MutationObserver(mutations => {
            const added = [];
            mutations.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1) added.push(n);
            }));
            added.forEach((node, i) => {
                run(node, { opacity: [0, 1], y: [8, 0] }, { ...SPRING_SNAPPY, delay: Math.min(i, 14) * 0.018 });
            });
        }).observe(container, { childList: true });
    });

    // ---------------------------------------------------------------
    // 5. Toasts slide in from the right edge
    // ---------------------------------------------------------------
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
        new MutationObserver(mutations => {
            mutations.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1) run(n, { opacity: [0, 1], x: [36, 0], scale: [0.96, 1] }, SPRING_PANEL);
            }));
        }).observe(toastContainer, { childList: true });
    }

    // ---------------------------------------------------------------
    // 6. KPI values give a brief "tick" whenever their number changes
    // ---------------------------------------------------------------
    ['#kpi-total-sales', '#kpi-pending-dispatches', '#kpi-low-stock', '#grand-total', '#quote-profit-margin'].forEach(selector => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.style.transformOrigin = 'left center';
        let last = el.textContent;
        new MutationObserver(() => {
            if (el.textContent === last) return;
            last = el.textContent;
            run(el, { scale: [1.07, 1], opacity: [0.55, 1] }, SPRING_SNAPPY);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    });
})();

