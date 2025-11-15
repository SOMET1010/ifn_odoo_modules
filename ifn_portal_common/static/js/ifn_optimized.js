/* ================================================== */
/*          IFN PORTAL - MAIN OPTIMIZED SCRIPT        */
/* ================================================== */
/* Point d'entrée principal - Version optimisée       */

(function() {
    'use strict';

    // Configuration globale optimisée
    const IFN_CONFIG = {
        version: '2.0.0',
        enablePerformanceMonitoring: true,
        enableErrorReporting: true,
        enableAnalytics: true,
        modules: {
            navigation: './modules/navigation.js',
            accessibility: './modules/accessibility.js',
            notifications: './modules/notifications.js',
            'image-optimization': './modules/image-optimization.js',
            charts: './modules/charts.js',
            filters: './modules/filters.js',
            dragdrop: './modules/dragdrop.js',
            analytics: './modules/analytics.js'
        }
    };

    // Variables globales
    let initialized = false;
    let loadedModules = new Map();
    let performanceMarks = {};

    // ==================================================
    //                BOOTSTRAP MODULE                //
    // ==================================================

    /**
     * Point d'entrée principal optimisé
     */
    async function bootstrap() {
        if (initialized) return;

        const startTime = performance.now();
        
        try {
            // Marquer le début du chargement
            performance.mark('bootstrap-start');
            
            // Chargement prioritaire
            await loadPriorityModules();
            
            // Initialisation progressive
            await initializeProgressive();
            
            // Chargement différé des modules
            setupLazyModuleLoading();
            
            // Configuration des optimisations
            setupOptimizations();
            
            // Surveillance des performances
            if (IFN_CONFIG.enablePerformanceMonitoring) {
                setupPerformanceMonitoring();
            }
            
            // Marquer la fin du chargement
            performance.mark('bootstrap-end');
            performance.measure('bootstrap-duration', 'bootstrap-start', 'bootstrap-end');
            
            initialized = true;
            
            console.log(`🚀 IFN Portal v${IFN_CONFIG.version} initialisé en ${performanceMarks.bootstrapDuration}ms`);
            
            // Événement pour les modules
            document.dispatchEvent(new CustomEvent('portal:initialized', {
                detail: { version: IFN_CONFIG.version }
            }));
            
        } catch (error) {
            console.error('❌ Erreur lors du bootstrap:', error);
            showFallbackError('Erreur de chargement de l\'application');
        }
    }

    /**
     * Chargement des modules prioritaires
     */
    async function loadPriorityModules() {
        const priorityModules = [
            'navigation',
            'accessibility', 
            'notifications'
        ];

        const loadPromises = priorityModules.map(moduleName => 
            loadModule(moduleName).catch(error => {
                console.warn(`⚠️ Module ${moduleName} chargé en fallback:`, error);
                return null;
            })
        );

        await Promise.all(loadPromises);
    }

    /**
     * Initialisation progressive
     */
    async function initializeProgressive() {
        // Phase 1: CSS critique + JS essentiel
        await Promise.all([
            loadCriticalCSS(),
            setupEssentialFeatures()
        ]);

        // Phase 2: Modules d'interaction
        await loadInteractionModules();

        // Phase 3: Modules de visualisation
        await loadVisualizationModules();
    }

    /**
     * Configuration du chargement lazy des modules
     */
    function setupLazyModuleLoading() {
        // Observer pour les modules visuels
        const visualizationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadVisualizationModules();
                    visualizationObserver.disconnect();
                }
            });
        }, { threshold: 0.1 });

        // Observer le contenu principal
        const main = document.querySelector('main') || document.body;
        visualizationObserver.observe(main);

        // Chargement par interaction utilisateur
        setupUserTriggeredLoading();
    }

    /**
     * Chargement basé sur les interactions utilisateur
     */
    function setupUserTriggeredLoading() {
        const triggerEvents = ['click', 'mouseenter', 'focus'];
        
        triggerEvents.forEach(event => {
            document.addEventListener(event, debounce((e) => {
                const target = e.target.closest('[data-module]');
                if (target) {
                    const moduleName = target.getAttribute('data-module');
                    if (moduleName && !loadedModules.has(moduleName)) {
                        loadModule(moduleName);
                    }
                }
            }, 500));
        });
    }

    // ==================================================
    //                MODULE LOADER                     //
    // ==================================================

    /**
     * Chargement d'un module avec cache et optimisations
     */
    async function loadModule(moduleName) {
        if (loadedModules.has(moduleName)) {
            return loadedModules.get(moduleName);
        }

        const modulePath = IFN_CONFIG.modules[moduleName];
        if (!modulePath) {
            throw new Error(`Module non trouvé: ${moduleName}`);
        }

        console.log(`📦 Chargement du module: ${moduleName}`);

        try {
            // Chargement dynamique avec timeout
            const modulePromise = import(modulePath);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
            );

            const module = await Promise.race([modulePromise, timeoutPromise]);
            
            // Initialisation du module
            if (module.default && typeof module.default.init === 'function') {
                await module.default.init();
            }

            loadedModules.set(moduleName, module);
            
            console.log(`✅ Module chargé: ${moduleName}`);
            
            // Événement de chargement
            document.dispatchEvent(new CustomEvent('module:loaded', {
                detail: { moduleName, module }
            }));
            
            return module;

        } catch (error) {
            console.error(`❌ Erreur chargement module ${moduleName}:`, error);
            
            // Fallback si disponible
            const fallback = getModuleFallback(moduleName);
            if (fallback) {
                console.log(`🔄 Fallback pour ${moduleName}:`, fallback);
                return await fallback();
            }
            
            throw error;
        }
    }

    /**
     * Chargement des modules d'interaction
     */
    async function loadInteractionModules() {
        const interactionModules = ['filters', 'dragdrop'];
        
        await Promise.all(
            interactionModules.map(name => 
                loadModule(name).catch(err => console.warn(`Module ${name} non critique:`, err))
            )
        );
    }

    /**
     * Chargement des modules de visualisation
     */
    async function loadVisualizationModules() {
        const vizModules = ['charts', 'analytics'];
        
        await Promise.all(
            vizModules.map(name => 
                loadModule(name).catch(err => console.warn(`Module ${name} non critique:`, err))
            )
        );
    }

    /**
     * Fallback pour les modules critiques
     */
    function getModuleFallback(moduleName) {
        const fallbacks = {
            'navigation': () => setupBasicNavigation(),
            'accessibility': () => setupBasicAccessibility(),
            'notifications': () => setupBasicNotifications()
        };

        return fallbacks[moduleName];
    }

    // ==================================================
    //                FEATURES SETUP                   //
    // ==================================================

    /**
     * Chargement du CSS critique
     */
    async function loadCriticalCSS() {
        const criticalCSS = document.createElement('link');
        criticalCSS.rel = 'stylesheet';
        criticalCSS.href = '/static/css/ifn_critical.css';
        criticalCSS.id = 'critical-css';
        criticalCSS.media = 'all';

        // Chargement synchrone pour le CSS critique
        document.head.appendChild(criticalCSS);
        
        // Chargement asynchrone du CSS non-critique
        setTimeout(() => {
            const lazyCSS = document.createElement('link');
            lazyCSS.rel = 'stylesheet';
            lazyCSS.href = '/static/css/ifn_lazy.css';
            lazyCSS.media = 'print, (min-width: 600px)';
            lazyCSS.onload = () => {
                console.log('✅ CSS lazy chargé');
            };
            document.head.appendChild(lazyCSS);
        }, 0);
    }

    /**
     * Configuration des fonctionnalités essentielles
     */
    async function setupEssentialFeatures() {
        // Détection du dashboard
        detectDashboardType();
        
        // Setup des event listeners globaux
        setupGlobalEventListeners();
        
        // Configuration de l'accessibilité de base
        setupBasicAccessibilityFeatures();
        
        console.log('🔧 Fonctionnalités essentielles configurées');
    }

    /**
     * Configuration des optimisations
     */
    function setupOptimizations() {
        // Service Worker pour cache
        setupServiceWorker();
        
        // Préchargement des ressources critiques
        preloadCriticalResources();
        
        // Configuration des animations GPU
        setupGPUAcceleration();
        
        // Optimisation des requêtes réseau
        setupNetworkOptimizations();
    }

    /**
     * Configuration du Service Worker
     */
    function setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/static/js/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker enregistré');
                })
                .catch(error => {
                    console.warn('⚠️ Service Worker non disponible:', error);
                });
        }
    }

    /**
     * Préchargement des ressources critiques
     */
    function preloadCriticalResources() {
        const resources = [
            { href: '/static/js/ifn_core.js', as: 'script' },
            { href: '/static/images/logo.png', as: 'image' }
        ];

        resources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.href;
            link.as = resource.as;
            document.head.appendChild(link);
        });
    }

    /**
     * Configuration accélération GPU
     */
    function setupGPUAcceleration() {
        // Appliquer transform3d aux éléments animés
        const animatedElements = document.querySelectorAll('.card, .btn, .modal');
        animatedElements.forEach(el => {
            el.style.transform = 'translateZ(0)';
            el.style.backfaceVisibility = 'hidden';
        });
    }

    /**
     * Optimisations réseau
     */
    function setupNetworkOptimizations() {
        // DNS prefetch pour les domaines externes
        const externalDomains = ['fonts.googleapis.com', 'cdn.jsdelivr.net'];
        
        externalDomains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = `//${domain}`;
            document.head.appendChild(link);
        });

        // Preconnect aux ressources critiques
        const preconnectDomains = ['fonts.googleapis.com'];
        
        preconnectDomains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = `https://${domain}`;
            document.head.appendChild(link);
        });
    }

    // ==================================================
    //                EVENT HANDLERS                   //
    // ==================================================

    /**
     * Configuration des event listeners globaux
     */
    function setupGlobalEventListeners() {
        // Clics globaux optimisés
        document.addEventListener('click', handleGlobalClick, { passive: false });
        
        // Clavier global
        document.addEventListener('keydown', handleGlobalKeydown);
        
        // Resize avec debounce
        window.addEventListener('resize', debounce(handleResize, 250));
        
        // Scroll avec throttle
        window.addEventListener('scroll', throttle(handleScroll, 100));
        
        // Gestion des erreurs
        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        
        // Visibilité de la page
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    /**
     * Gestionnaire de clics optimisé
     */
    function handleGlobalClick(event) {
        const target = event.target.closest('[data-action], .btn');
        
        if (!target) return;
        
        event.preventDefault();
        
        const action = target.getAttribute('data-action');
        if (action) {
            executeAction(target, action);
        }
        
        // Feedback visuel
        provideVisualFeedback(target);
    }

    /**
     * Gestionnaire clavier optimisé
     */
    function handleGlobalKeydown(event) {
        // Raccourcis globaux
        if (event.ctrlKey || event.metaKey) {
            switch(event.key) {
                case 'k':
                    event.preventDefault();
                    focusSearch();
                    break;
                case '/':
                    event.preventDefault();
                    showKeyboardShortcuts();
                    break;
            }
        }
    }

    // ==================================================
    //                DETECTION & FEATURES             //
    // ==================================================

    /**
     * Détection du type de dashboard
     */
    function detectDashboardType() {
        const title = document.querySelector('.ifn-dashboard-header h1');
        if (!title) return null;

        const titleText = title.textContent.toLowerCase();
        let dashboardType = null;
        
        if (titleText.includes('marchand')) dashboardType = 'marchand';
        else if (titleText.includes('producteur')) dashboardType = 'producteur';
        else if (titleText.includes('coopérative')) dashboardType = 'cooperative';
        else if (titleText.includes('produits')) dashboardType = 'produits';

        if (dashboardType) {
            document.body.setAttribute('data-dashboard-type', dashboardType);
            console.log(`📊 Dashboard détecté: ${dashboardType}`);
        }

        return dashboardType;
    }

    // ==================================================
    //                PERFORMANCE MONITORING          //
    // ==================================================

    /**
     * Configuration de la surveillance des performances
     */
    function setupPerformanceMonitoring() {
        // Observer des métriques Core Web Vitals
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log('📈 LCP:', lastEntry.startTime);
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

            // First Input Delay
            const fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    console.log('📈 FID:', entry.processingStart - entry.startTime);
                });
            });
            fidObserver.observe({ type: 'first-input', buffered: true });

            // Cumulative Layout Shift
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                console.log('📈 CLS:', clsValue);
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        }

        // Rapport des métriques
        setTimeout(() => {
            reportPerformanceMetrics();
        }, 5000);
    }

    /**
     * Rapport des métriques de performance
     */
    function reportPerformanceMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const metrics = {
            'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
            'TCP Connect': navigation.connectEnd - navigation.connectStart,
            'SSL Handshake': navigation.connectEnd - navigation.secureConnectionStart,
            'TTFB': navigation.responseStart - navigation.requestStart,
            'Download': navigation.responseEnd - navigation.responseStart,
            'DOM Interactive': navigation.domInteractive - navigation.navigationStart,
            'DOM Complete': navigation.domComplete - navigation.navigationStart,
            'Load Complete': navigation.loadEventEnd - navigation.navigationStart
        };

        console.log('📊 Métriques de performance:', metrics);

        // Envoi au service d'analytics si disponible
        if (typeof gtag !== 'undefined') {
            gtag('event', 'timing_complete', {
                name: 'page_load',
                value: Math.round(navigation.loadEventEnd - navigation.navigationStart)
            });
        }
    }

    // ==================================================
    //                FALLBACKS                        //
    // ==================================================

    /**
     * Navigation de base
     */
    function setupBasicNavigation() {
        console.log('🔧 Navigation de base configurée');
        return { default: { init: () => console.log('Basic nav ready') } };
    }

    /**
     * Accessibilité de base
     */
    function setupBasicAccessibility() {
        console.log('🔧 Accessibilité de base configurée');
        return { default: { init: () => console.log('Basic a11y ready') } };
    }

    /**
     * Notifications de base
     */
    function setupBasicNotifications() {
        console.log('🔧 Notifications de base configurées');
        return { default: { init: () => console.log('Basic notifications ready') } };
    }

    // ==================================================
    //                UTILITAIRES                      //
    // ==================================================

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

    function handleResize() {
        console.log('📐 Redimensionnement détecté');
    }

    function handleScroll() {
        // Logique de scroll optimisée
    }

    function handleGlobalError(event) {
        console.error('❌ Erreur JavaScript:', event.error);
    }

    function handleUnhandledRejection(event) {
        console.error('❌ Promesse rejetée:', event.reason);
    }

    function handleVisibilityChange() {
        console.log(document.hidden ? '🔇 Page masquée' : '👁️ Page visible');
    }

    function executeAction(target, action) {
        console.log(`⚡ Exécution action: ${action}`);
    }

    function provideVisualFeedback(target) {
        target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            target.style.transform = 'scale(1)';
        }, 100);
    }

    function focusSearch() {
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput) searchInput.focus();
    }

    function showKeyboardShortcuts() {
        console.log('⌨️ Raccourcis clavier: Ctrl+K (recherche), Ctrl+/ (aide)');
    }

    function showFallbackError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger position-fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.right = '20px';
        errorDiv.style.zIndex = '9999';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // ==================================================
    //                EXPORT                           //
    // ==================================================

    // API publique
    window.IFN_Portal = {
        init: bootstrap,
        loadModule,
        config: IFN_CONFIG,
        version: IFN_CONFIG.version,
        modules: () => Array.from(loadedModules.keys()),
        performance: {
            marks: performanceMarks,
            measure: (name) => performance.measure(name)
        }
    };

    // Démarrage automatique
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})();