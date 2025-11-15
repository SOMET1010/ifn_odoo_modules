/**
 * Initialisation et optimisation du système d'icônes IFN
 * 
 * Ce module coordonne l'initialisation du système d'icônes,
 * gère le cache optimisé, le lazy loading et le préchargement intelligent.
 */

(function(window) {
    'use strict';

    const IFN_IconSystem = {
        // Configuration du système
        config: {
            preloadThreshold: 3,        // Nombre d'icônes à précharger en priorité
            lazyLoadOffset: 100,        // Offset pour le lazy loading
            cacheSize: 50,              // Taille max du cache
            enableServiceWorker: 'serviceWorker' in navigator,
            debug: false
        },

        // État du système
        state: {
            initialized: false,
            iconsLoaded: new Set(),
            cache: new Map(),
            priorities: new Map(),
            observers: new Map()
        },

        /**
         * Initialise le système complet
         */
        init: function() {
            if (this.state.initialized) {
                return;
            }

            this.log('Initialisation du système d\'icônes IFN');
            
            // Initialiser les composants
            this.initializeComponents()
                .then(() => this.setupOptimizations())
                .then(() => this.startMonitoring())
                .then(() => {
                    this.state.initialized = true;
                    this.log('Système d\'icônes IFN initialisé avec succès');
                    this.dispatchReadyEvent();
                })
                .catch(error => {
                    console.error('Erreur lors de l\'initialisation:', error);
                });
        },

        /**
         * Initialise les composants de base
         */
        async initializeComponents() {
            this.log('Initialisation des composants...');

            // Attendre que les dépendances soient disponibles
            await this.waitForDependencies();

            // Initialiser le sprite optimisé
            if (window.IFN_IconSprite) {
                await window.IFN_IconSprite.loadOptimizedSprite();
            }

            // Initialiser les fallbacks
            if (window.IFN_IconFallbacks) {
                window.IFN_IconFallbacks.init();
            }

            // Initialiser le système principal
            if (window.IFN_Icons) {
                window.IFN_Icons.init();
            }

            this.log('Composants initialisés');
        },

        /**
         * Attend que les dépendances soient disponibles
         */
        waitForDependencies() {
            return new Promise((resolve) => {
                const checkDependencies = () => {
                    if (window.IFN_Icons && window.IFN_IconSprite && window.IFN_IconFallbacks) {
                        resolve();
                    } else {
                        setTimeout(checkDependencies, 50);
                    }
                };
                checkDependencies();
            });
        },

        /**
         * Configure les optimisations
         */
        setupOptimizations() {
            this.log('Configuration des optimisations...');

            // Setup du cache intelligent
            this.setupIntelligentCache();

            // Setup du lazy loading avancé
            this.setupAdvancedLazyLoading();

            // Setup du préchargement intelligent
            this.setupSmartPreloading();

            // Setup de la compression et optimisation
            this.setupCompression();

            this.log('Optimisations configurées');
        },

        /**
         * Configure le cache intelligent
         */
        setupIntelligentCache() {
            // Cache en mémoire avec LRU
            this.state.cache = new Map();
            
            // Observer les insertions pour maintenir la taille
            const originalSet = this.state.cache.set.bind(this.state.cache);
            this.state.cache.set = (key, value) => {
                if (this.state.cache.size >= this.config.cacheSize) {
                    // Supprimer l'élément le plus ancien (LRU)
                    const firstKey = this.state.cache.keys().next().value;
                    this.state.cache.delete(firstKey);
                }
                return originalSet(key, value);
            };

            // Persistance du cache dans localStorage
            this.loadCacheFromStorage();
            window.addEventListener('beforeunload', () => {
                this.saveCacheToStorage();
            });
        },

        /**
         * Configure le lazy loading avancé
         */
        setupAdvancedLazyLoading() {
            if (!('IntersectionObserver' in window)) {
                return;
            }

            // Observer principal pour les icônes lazy
            this.state.observers.main = new IntersectionObserver(
                this.handleLazyIconIntersection.bind(this),
                {
                    rootMargin: `${this.config.lazyLoadOffset}px`,
                    threshold: 0.1
                }
            );

            // Observer pour le préchargement basé sur le scroll
            this.state.observers.preload = new IntersectionObserver(
                this.handlePreloadIntersection.bind(this),
                {
                    rootMargin: '200px'
                }
            );

            // Observer les éléments existants
            this.observeExistingIcons();
        },

        /**
         * Gère l'intersection pour le lazy loading
         */
        handleLazyIconIntersection(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const iconElement = entry.target;
                    const iconName = iconElement.dataset.icon;
                    
                    if (iconName) {
                        this.loadIcon(iconName, iconElement);
                        this.state.observers.main.unobserve(iconElement);
                    }
                }
            });
        },

        /**
         * Gère l'intersection pour le préchargement
         */
        handlePreloadIntersection(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const container = entry.target;
                    const icons = container.querySelectorAll('[data-preload-icon]');
                    
                    icons.forEach(icon => {
                        const iconName = icon.dataset.preloadIcon;
                        if (iconName && !this.state.iconsLoaded.has(iconName)) {
                            this.preloadIcon(iconName);
                        }
                    });
                }
            });
        },

        /**
         * Configure le préchargement intelligent
         */
        setupSmartPreloading() {
            // Analyser les patterns d'usage
            this.analyzeUsagePatterns();

            // Préchargement basé sur l'historique
            this.setupHistoryBasedPreloading();

            // Préchargement basé sur la géolocalisation (si disponible)
            this.setupLocationBasedPreloading();

            // Préchargement lors des moments d'inactivité
            this.setupIdlePreloading();
        },

        /**
         * Analyse les patterns d'usage
         */
        analyzeUsagePatterns() {
            // Observer les clics sur les icônes pour apprendre les préférences
            document.addEventListener('click', (event) => {
                const iconElement = event.target.closest('[data-icon]');
                if (iconElement) {
                    const iconName = iconElement.dataset.icon;
                    this.updateIconPriority(iconName, 'click');
                }
            }, true);

            // Observer le survol pour les priorités
            document.addEventListener('mouseenter', (event) => {
                const iconElement = event.target.closest('[data-icon]');
                if (iconElement) {
                    const iconName = iconElement.dataset.icon;
                    this.updateIconPriority(iconName, 'hover');
                }
            }, true);
        },

        /**
         * Met à jour la priorité d'une icône
         */
        updateIconPriority(iconName, action) {
            const current = this.state.priorities.get(iconName) || 0;
            const increment = action === 'click' ? 10 : 1;
            this.state.priorities.set(iconName, current + increment);
        },

        /**
         * Configure le préchargement basé sur l'historique
         */
        setupHistoryBasedPreloading() {
            // Stocker l'historique des icônes utilisées
            const historyKey = 'ifn-icons-history';
            
            window.addEventListener('beforeunload', () => {
                const history = this.getHistory();
                try {
                    localStorage.setItem(historyKey, JSON.stringify(history));
                } catch (e) {
                    // Ignorer les erreurs de storage
                }
            });
        },

        /**
         * Configure le préchargement lors des moments d'inactivité
         */
        setupIdlePreloading() {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    this.preloadHighPriorityIcons();
                });
            } else {
                setTimeout(() => {
                    this.preloadHighPriorityIcons();
                }, 1000);
            }
        },

        /**
         * Précharge les icônes de haute priorité
         */
        preloadHighPriorityIcons() {
            const sortedIcons = Array.from(this.state.priorities.entries())
                .sort(([,a], [,b]) => b - a)
                .slice(0, this.config.preloadThreshold)
                .map(([name]) => name);

            this.log(`Préchargement intelligent: ${sortedIcons.join(', ')}`);
            
            if (window.IFN_Icons) {
                window.IFN_Icons.preload(sortedIcons);
            }
        },

        /**
         * Configure la compression et optimisation
         */
        setupCompression() {
            // Observer les connexions lentes pour adapter les stratégies
            if (navigator.connection) {
                navigator.connection.addEventListener('change', () => {
                    this.adaptToConnectionSpeed();
                });
            }
        },

        /**
         * S'adapte à la vitesse de connexion
         */
        adaptToConnectionSpeed() {
            const connection = navigator.connection;
            
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                // Connexion lente: réduire le préchargement
                this.config.preloadThreshold = 1;
                this.config.lazyLoadOffset = 200;
            } else if (connection.effectiveType === '3g') {
                // Connexion moyenne: paramètres normaux
                this.config.preloadThreshold = 3;
                this.config.lazyLoadOffset = 100;
            } else {
                // Connexion rapide: agresif
                this.config.preloadThreshold = 5;
                this.config.lazyLoadOffset = 50;
            }
        },

        /**
         * Démarre la surveillance
         */
        startMonitoring() {
            // Surveiller les erreurs d'icônes
            document.addEventListener('error', (event) => {
                if (event.target.closest('.ifn-icon, [data-icon]')) {
                    this.handleIconError(event.target);
                }
            }, true);

            // Surveiller les performances
            this.monitorPerformance();
        },

        /**
         * Surveille les performances
         */
        monitorPerformance() {
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        list.getEntries().forEach(entry => {
                            if (entry.name.includes('ifn-icon')) {
                                this.logPerformance(entry);
                            }
                        });
                    });
                    observer.observe({ entryTypes: ['measure', 'navigation'] });
                } catch (e) {
                    // Ignorer les erreurs d'observers
                }
            }
        },

        /**
         * Gère les erreurs d'icônes
         */
        handleIconError(errorElement) {
            const iconContainer = errorElement.closest('[data-icon]');
            if (iconContainer) {
                const iconName = iconContainer.dataset.icon;
                this.log(`Erreur d'icône: ${iconName}`);
                
                // Notifier le système de fallbacks
                if (window.IFN_IconFallbacks) {
                    window.IFN_IconFallbacks.handleIconError(errorElement);
                }
            }
        },

        /**
         * Observe les icônes existantes
         */
        observeExistingIcons() {
            // Icônes avec lazy loading
            document.querySelectorAll('.lazy-icon').forEach(icon => {
                this.state.observers.main.observe(icon);
            });

            // Conteneurs avec préchargement
            document.querySelectorAll('[data-preload-container]').forEach(container => {
                this.state.observers.preload.observe(container);
            });
        },

        /**
         * Charge une icône avec optimisations
         */
        loadIcon(iconName, container) {
            if (this.state.iconsLoaded.has(iconName)) {
                return;
            }

            const startTime = performance.now();
            
            if (window.IFN_Icons) {
                window.IFN_Icons.renderIcon(iconName, { container }).then(() => {
                    this.state.iconsLoaded.add(iconName);
                    this.logPerformance({
                        name: `icon-load-${iconName}`,
                        duration: performance.now() - startTime
                    });
                }).catch(error => {
                    this.log(`Erreur de chargement de ${iconName}:`, error);
                });
            }
        },

        /**
         * Précharge une icône
         */
        preloadIcon(iconName) {
            if (window.IFN_Icons && !this.state.iconsLoaded.has(iconName)) {
                window.IFN_Icons.preload([iconName]);
            }
        },

        /**
         * Log des performances
         */
        logPerformance(entry) {
            if (this.config.debug) {
                console.log(`Performance [${entry.name}]: ${entry.duration.toFixed(2)}ms`);
            }
        },

        /**
         * Charge le cache depuis le stockage
         */
        loadCacheFromStorage() {
            try {
                const cached = localStorage.getItem('ifn-icons-cache');
                if (cached) {
                    const cacheData = JSON.parse(cached);
                    Object.entries(cacheData).forEach(([key, value]) => {
                        this.state.cache.set(key, value);
                    });
                }
            } catch (e) {
                // Ignorer les erreurs de parsing
            }
        },

        /**
         * Sauvegarde le cache vers le stockage
         */
        saveCacheToStorage() {
            try {
                const cacheData = Object.fromEntries(this.state.cache);
                localStorage.setItem('ifn-icons-cache', JSON.stringify(cacheData));
            } catch (e) {
                // Ignorer les erreurs de storage
            }
        },

        /**
         * Obtient l'historique
         */
        getHistory() {
            return Array.from(this.state.iconsLoaded);
        },

        /**
         * Log avec débogage
         */
        log(...args) {
            if (this.config.debug) {
                console.log('[IFN Icon System]', ...args);
            }
        },

        /**
         * Déclenche l'événement ready
         */
        dispatchReadyEvent() {
            const event = new CustomEvent('IFN:IconsSystemReady', {
                detail: {
                    initialized: true,
                    iconsLoaded: this.state.iconsLoaded.size,
                    cacheSize: this.state.cache.size
                }
            });
            window.dispatchEvent(event);
        },

        /**
         * API publique
         */
        publicAPI: {
            /**
             * Charge une icône de manière optimisée
             */
            loadIcon: (iconName, container) => IFN_IconSystem.loadIcon(iconName, container),
            
            /**
             * Précharge une icône
             */
            preloadIcon: (iconName) => IFN_IconSystem.preloadIcon(iconName),
            
            /**
             * Obtient les statistiques
             */
            getStats: () => ({
                initialized: IFN_IconSystem.state.initialized,
                iconsLoaded: IFN_IconSystem.state.iconsLoaded.size,
                cacheSize: IFN_IconSystem.state.cache.size,
                priorities: Object.fromEntries(IFN_IconSystem.state.priorities)
            }),

            /**
             * Force le rechargement du cache
             */
            clearCache: () => {
                IFN_IconSystem.state.cache.clear();
                localStorage.removeItem('ifn-icons-cache');
                IFN_IconSystem.state.iconsLoaded.clear();
            }
        }
    };

    // Exposer l'API publique
    window.IFN_IconSystem = IFN_IconSystem.publicAPI;

    // Auto-initialisation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => IFN_IconSystem.init());
    } else {
        IFN_IconSystem.init();
    }

})(window);