/* ================================================== */
/*           IFN PORTAL - JAVASCRIPT CORE             */
/* ================================================== */
/* Module principal - chargé en premier */

(function() {
    'use strict';

    // Configuration globale optimisée
    const IFN_CONFIG = {
        version: '2.0.0',
        lazyLoadThreshold: 100,
        animationDuration: 300,
        debounceDelay: 250,
        throttleDelay: 100,
        refreshInterval: 30000,
        enableAnimations: true,
        enableNotifications: true
    };

    // Variables globales
    let isInitialized = false;
    let modulesLoaded = new Set();
    let eventListeners = new Map();

    // ==================================================
    //                 CORE MODULE                     //
    // ==================================================

    /**
     * Initialisation principale de l'application
     */
    async function initialize() {
        if (isInitialized) return;
        
        console.log('🚀 Initialisation IFN Portal v' + IFN_CONFIG.version);
        
        try {
            // Chargement du CSS critique
            await loadCriticalCSS();
            
            // Initialisation des modules essentiels
            initializeCoreModules();
            
            // Configuration des event listeners globaux
            setupGlobalEventListeners();
            
            // Démarrage des fonctionnalités de base
            startCoreFeatures();
            
            // Chargement lazy des modules avancés
            loadLazyModules();
            
            isInitialized = true;
            console.log('✅ IFN Portal initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur d\'initialisation:', error);
            showCriticalError('Erreur lors du chargement de l\'application');
        }
    }

    /**
     * Chargement du CSS critique
     */
    async function loadCriticalCSS() {
        if (document.querySelector('#ifn-critical-css')) return;
        
        const criticalCSS = document.createElement('link');
        criticalCSS.id = 'ifn-critical-css';
        criticalCSS.rel = 'stylesheet';
        criticalCSS.href = '/static/css/ifn_critical.css';
        criticalCSS.media = 'all';
        
        document.head.appendChild(criticalCSS);
        
        // Forcer le rendu
        await new Promise(resolve => criticalCSS.onload = resolve);
    }

    /**
     * Initialisation des modules essentiels
     */
    function initializeCoreModules() {
        // Module de navigation
        import('./modules/navigation.js').then(module => {
            module.default.init();
            modulesLoaded.add('navigation');
        });

        // Module d'accessibilité
        import('./modules/accessibility.js').then(module => {
            module.default.init();
            modulesLoaded.add('accessibility');
        });

        // Module de notifications
        import('./modules/notifications.js').then(module => {
            module.default.init();
            modulesLoaded.add('notifications');
        });
    }

    /**
     * Configuration des event listeners globaux
     */
    function setupGlobalEventListeners() {
        // Events de navigation
        document.addEventListener('click', handleGlobalClick, { passive: false });
        document.addEventListener('keydown', handleGlobalKeydown);
        
        // Events de performance
        window.addEventListener('resize', debounce(handleResize, IFN_CONFIG.debounceDelay));
        window.addEventListener('scroll', throttle(handleScroll, IFN_CONFIG.throttleDelay));
        
        // Events d'accessibilité
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);
        
        // Events de visibilité
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Gestion des erreurs globales
        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    /**
     * Démarrage des fonctionnalités de base
     */
    function startCoreFeatures() {
        // Détection du type de dashboard
        detectAndInitDashboard();
        
        // Initialisation de l'accessibilité clavier
        initKeyboardNavigation();
        
        // Configuration des tooltips
        initTooltips();
        
        // Démarrage des compteurs animés
        initAnimatedCounters();
    }

    /**
     * Chargement lazy des modules avancés
     */
    function loadLazyModules() {
        const lazyModules = [
            './modules/charts.js',
            './modules/filters.js',
            './modules/dragdrop.js',
            './modules/analytics.js'
        ];

        // Intersection Observer pour chargement automatique
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    lazyModules.forEach(module => {
                        if (!modulesLoaded.has(module)) {
                            loadModule(module);
                        }
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });

        // Observer le contenu principal
        const main = document.querySelector('main') || document.body;
        observer.observe(main);
    }

    // ==================================================
    //                 EVENT HANDLERS                   //
    // ==================================================

    /**
     * Gestionnaire de clics globaux
     */
    function handleGlobalClick(event) {
        const target = event.target.closest('[data-action], .btn, .nav-link');
        
        if (!target) return;
        
        // Action rapide
        const action = target.getAttribute('data-action');
        if (action) {
            event.preventDefault();
            executeQuickAction(target, action);
        }
        
        // Navigation
        if (target.classList.contains('nav-link')) {
            handleNavigation(target);
        }
        
        // Bouton d'action
        if (target.classList.contains('btn')) {
            handleButtonAction(target);
        }
    }

    /**
     * Gestionnaire de touches clavier
     */
    function handleGlobalKeydown(event) {
        // Navigation avec flèches
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            handleArrowNavigation(event);
        }
        
        // Activation avec Entrée
        if (event.key === 'Enter') {
            handleEnterActivation(event);
        }
        
        // Échap pour fermer modales
        if (event.key === 'Escape') {
            handleEscapeKey();
        }
        
        // Raccourcis clavier
        if (event.ctrlKey || event.metaKey) {
            handleKeyboardShortcuts(event);
        }
    }

    /**
     * Gestionnaire de redimensionnement
     */
    const handleResize = debounce(() => {
        updateLayout();
        updateResponsiveElements();
    }, IFN_CONFIG.debounceDelay);

    /**
     * Gestionnaire de scroll
     */
    const handleScroll = throttle(() => {
        handleScrollEffects();
        updateScrollPosition();
    }, IFN_CONFIG.throttleDelay);

    // ==================================================
    //               FONCTIONNALITÉS                   //
    // ==================================================

    /**
     * Détection et initialisation du dashboard
     */
    function detectAndInitDashboard() {
        const dashboardType = detectDashboardType();
        const dashboardElement = document.querySelector('[data-dashboard]');
        
        if (dashboardElement) {
            dashboardElement.setAttribute('data-dashboard-loaded', 'true');
            dashboardElement.setAttribute('aria-busy', 'true');
            
            // Simulation du chargement du dashboard
            setTimeout(() => {
                dashboardElement.setAttribute('aria-busy', 'false');
                dashboardElement.classList.add('dashboard-loaded');
            }, 1000);
        }
        
        console.log('Dashboard détecté:', dashboardType);
    }

    /**
     * Détection du type de dashboard
     */
    function detectDashboardType() {
        const title = document.querySelector('.ifn-dashboard-header h1');
        if (!title) return null;

        const titleText = title.textContent.toLowerCase();
        
        if (titleText.includes('marchand')) return 'marchand';
        if (titleText.includes('producteur')) return 'producteur';
        if (titleText.includes('coopérative') || titleText.includes('cooperative')) return 'cooperative';
        if (titleText.includes('produits') || titleText.includes('visualisation')) return 'produits';
        
        return null;
    }

    /**
     * Initialisation navigation clavier
     */
    function initKeyboardNavigation() {
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach((element, index) => {
            element.setAttribute('data-focus-index', index);
        });
        
        console.log('Navigation clavier initialisée');
    }

    /**
     * Initialisation des tooltips
     */
    function initTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
            element.addEventListener('focus', showTooltip);
            element.addEventListener('blur', hideTooltip);
        });
    }

    /**
     * Initialisation des compteurs animés
     */
    function initAnimatedCounters() {
        const counters = document.querySelectorAll('[data-counter]');
        
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        });
        
        counters.forEach(counter => counterObserver.observe(counter));
    }

    // ==================================================
    //               UTILITAIRES                       //
    // ==================================================

    /**
     * Fonction debounce optimisée
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Fonction throttle optimisée
     */
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Chargement de module avec cache
     */
    async function loadModule(modulePath) {
        if (modulesLoaded.has(modulePath)) return;
        
        try {
            const module = await import(modulePath);
            module.default.init();
            modulesLoaded.add(modulePath);
            console.log('📦 Module chargé:', modulePath);
        } catch (error) {
            console.warn('⚠️ Erreur chargement module:', modulePath, error);
        }
    }

    /**
     * Animation de compteur
     */
    function animateCounter(element) {
        const target = parseInt(element.getAttribute('data-counter'));
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
            } else {
                element.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            }
        };
        
        updateCounter();
    }

    /**
     * Affichage d'erreur critique
     */
    function showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger position-fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.right = '20px';
        errorDiv.style.zIndex = '9999';
        errorDiv.innerHTML = `
            <strong>Erreur:</strong> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // ==================================================
    //               ACCESSIBILITÉ                     //
    // ==================================================

    function handleFocusIn(event) {
        const target = event.target;
        target.setAttribute('data-focus', 'true');
        
        // Annonce pour les lecteurs d'écran
        announceFocus(target);
    }

    function handleFocusOut(event) {
        const target = event.target;
        target.removeAttribute('data-focus');
    }

    function announceFocus(element) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `Focus sur ${element.textContent || element.placeholder || element.title || 'élément'}`;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => announcement.remove(), 1000);
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            console.log('🔇 Page masquée - pause des animations');
        } else {
            console.log('👁️ Page visible - reprise des animations');
        }
    }

    // ==================================================
    //               GESTION ERREURS                   //
    // ==================================================

    function handleGlobalError(event) {
        console.error('❌ Erreur JavaScript:', event.error);
        reportError(event.error);
    }

    function handleUnhandledRejection(event) {
        console.error('❌ Promesse rejetée:', event.reason);
        reportError(event.reason);
    }

    function reportError(error) {
        // En production, envoyer à un service de monitoring
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: error.message,
                fatal: false
            });
        }
    }

    // ==================================================
    //               EXPORT GLOBAL                     //
    // ==================================================

    // API publique
    window.IFN_Portal = {
        init: initialize,
        config: IFN_CONFIG,
        loadModule: loadModule,
        version: IFN_CONFIG.version,
        modules: () => Array.from(modulesLoaded)
    };

    // Démarrage automatique
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();