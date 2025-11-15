/**
 * Système de fallbacks et accessibilité pour les icônes IFN
 * 
 * Gère les fallbacks automatiques, l'accessibilité et la compatibilité
 * pour tous les navigateurs et cas d'usage.
 */

(function(window) {
    'use strict';

    const IFN_IconFallbacks = {
        // Configuration des fallbacks
        config: {
            enabled: true,
            autoFallback: true,
            screenReaderSupport: true,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        },

        // Fallbacks par type d'icône
        fallbacks: {
            'business': {
                default: '📦',
                text: 'Commerce',
                image: '/static/src/img/icons/fallbacks/business.png'
            },
            'logistics': {
                default: '📋',
                text: 'Logistique',
                image: '/static/src/img/icons/fallbacks/logistics.png'
            },
            'finance': {
                default: '💳',
                text: 'Finance',
                image: '/static/src/img/icons/fallbacks/finance.png'
            },
            'social': {
                default: '👥',
                text: 'Social',
                image: '/static/src/img/icons/fallbacks/social.png'
            },
            'education': {
                default: '📚',
                text: 'Éducation',
                image: '/static/src/img/icons/fallbacks/education.png'
            },
            'navigation': {
                default: '🏠',
                text: 'Navigation',
                image: '/static/src/img/icons/fallbacks/navigation.png'
            },
            'communication': {
                default: '🔔',
                text: 'Communication',
                image: '/static/src/img/icons/fallbacks/communication.png'
            },
            'content': {
                default: '📁',
                text: 'Contenu',
                image: '/static/src/img/icons/fallbacks/content.png'
            },
            'actions': {
                default: '⚡',
                text: 'Action',
                image: '/static/src/img/icons/fallbacks/actions.png'
            },
            'status': {
                default: '✅',
                text: 'Statut',
                image: '/static/src/img/icons/fallbacks/status.png'
            },
            'tools': {
                default: '🔧',
                text: 'Outils',
                image: '/static/src/img/icons/fallbacks/tools.png'
            },
            'user': {
                default: '👤',
                text: 'Utilisateur',
                image: '/static/src/img/icons/fallbacks/user.png'
            },
            'data': {
                default: '📊',
                text: 'Données',
                image: '/static/src/img/icons/fallbacks/data.png'
            },
            'planning': {
                default: '📅',
                text: 'Planning',
                image: '/static/src/img/icons/fallbacks/planning.png'
            }
        },

        /**
         * Initialise le système de fallbacks
         */
        init: function() {
            this.setupStyles();
            this.setupAccessibility();
            this.setupErrorHandlers();
            this.monitorConnectivity();
        },

        /**
         * Configure les styles CSS pour les fallbacks
         */
        setupStyles: function() {
            const style = document.createElement('style');
            style.textContent = `
                /* Styles pour les fallbacks */
                .ifn-icon-fallback {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 1em;
                    height: 1em;
                    font-size: 1em;
                    line-height: 1;
                    text-decoration: none;
                    border-radius: 2px;
                    transition: all 0.2s ease;
                    background-color: transparent;
                }

                .ifn-icon-fallback--emoji {
                    font-family: system-ui, -apple-system, sans-serif;
                    background: none;
                }

                .ifn-icon-fallback--text {
                    font-family: system-ui, -apple-system, sans-serif;
                    font-weight: 500;
                    color: currentColor;
                    background: rgba(255, 255, 255, 0.1);
                }

                .ifn-icon-fallback--image {
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: center;
                    border: 1px solid currentColor;
                    opacity: 0.7;
                }

                .ifn-icon-fallback--error {
                    border: 2px dashed currentColor;
                    background-color: rgba(255, 0, 0, 0.1);
                }

                /* États des fallbacks */
                .ifn-icon-fallback--loading {
                    animation: ifn-fallback-pulse 1.5s ease-in-out infinite;
                }

                .ifn-icon-fallback--hidden {
                    display: none;
                }

                @keyframes ifn-fallback-pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }

                /* Accessibilité */
                @media (prefers-reduced-motion: reduce) {
                    .ifn-icon-fallback--loading {
                        animation: none;
                    }
                    
                    .ifn-icon-fallback {
                        transition: none;
                    }
                }

                /* Mode sombre */
                @media (prefers-color-scheme: dark) {
                    .ifn-icon-fallback--text {
                        background-color: rgba(255, 255, 255, 0.05);
                    }
                }

                /* Support high contrast */
                @media (prefers-contrast: high) {
                    .ifn-icon-fallback {
                        border-width: 2px;
                    }
                    
                    .ifn-icon-fallback--image {
                        border-width: 3px;
                    }
                }
            `;
            document.head.appendChild(style);
        },

        /**
         * Configure l'accessibilité
         */
        setupAccessibility: function() {
            // Ajouter les attributs ARIA automatiquement
            this.addAriaSupport();
            
            // Support des lecteurs d'écran
            if (this.config.screenReaderSupport) {
                this.setupScreenReaderSupport();
            }
        },

        /**
         * Ajoute le support ARIA
         */
        addAriaSupport: function() {
            const style = document.createElement('style');
            style.textContent = `
                /* Support ARIA pour les icônes */
                [role="img"][aria-label] {
                    position: relative;
                }

                /* Masquage visuel mais accessible aux lecteurs d'écran */
                .ifn-sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    margin: -1px;
                    padding: 0;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }

                /* Focus visible pour l'accessibilité clavier */
                .ifn-icon-fallback:focus {
                    outline: 2px solid currentColor;
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(style);
        },

        /**
         * Configure le support des lecteurs d'écran
         */
        setupScreenReaderSupport: function() {
            // Observer les changements de focus
            document.addEventListener('focusin', (event) => {
                if (event.target.classList.contains('ifn-icon-fallback')) {
                    this.announceToScreenReader(event.target);
                }
            });
        },

        /**
         * Annonce aux lecteurs d'écran
         */
        announceToScreenReader: function(element) {
            const ariaLabel = element.getAttribute('aria-label');
            const title = element.getAttribute('title');
            const text = ariaLabel || title || element.textContent;
            
            if (text) {
                const announcement = document.createElement('div');
                announcement.setAttribute('aria-live', 'polite');
                announcement.setAttribute('aria-atomic', 'true');
                announcement.className = 'ifn-sr-only';
                announcement.textContent = `Icône: ${text}`;
                
                document.body.appendChild(announcement);
                
                // Supprimer après l'annonce
                setTimeout(() => {
                    document.body.removeChild(announcement);
                }, 1000);
            }
        },

        /**
         * Configure les gestionnaires d'erreurs
         */
        setupErrorHandlers: function() {
            // Gestion des erreurs de chargement SVG
            document.addEventListener('error', (event) => {
                if (event.target.tagName === 'use' || event.target.closest('.ifn-icon')) {
                    this.handleIconError(event.target);
                }
            }, true);

            // Gestion des erreurs réseau
            window.addEventListener('online', () => {
                this.clearOfflineFallbacks();
            });

            window.addEventListener('offline', () => {
                this.enableOfflineFallbacks();
            });
        },

        /**
         * Gère les erreurs d'icône
         */
        handleIconError: function(errorElement) {
            const iconContainer = errorElement.closest('.ifn-icon-container') || errorElement;
            const iconName = iconContainer.dataset.icon;
            
            if (iconName && this.config.autoFallback) {
                this.applyFallback(iconContainer, iconName);
            }
        },

        /**
         * Applique un fallback
         */
        applyFallback: function(container, iconName, options = {}) {
            const icon = IFN_Icons.icons[iconName];
            if (!icon) {
                console.warn(`Impossible de trouver un fallback pour l'icône '${iconName}'`);
                return;
            }

            const category = icon.category;
            const fallbackData = this.fallbacks[category] || this.fallbacks.default;
            const fallbackType = options.type || this.getOptimalFallbackType();

            // Supprimer l'ancienne icône
            container.innerHTML = '';

            // Créer le fallback
            const fallbackElement = this.createFallbackElement(fallbackData, fallbackType, {
                iconName,
                icon,
                options
            });

            container.appendChild(fallbackElement);
            container.classList.add('ifn-fallback-active');

            // Ajouter les attributs d'accessibilité
            this.addAccessibilityAttributes(fallbackElement, icon, options);

            // Événement personnalisé pour informer de l'utilisation du fallback
            container.dispatchEvent(new CustomEvent('icon:fallback', {
                detail: { iconName, fallbackType, element: fallbackElement }
            }));
        },

        /**
         * Crée un élément de fallback
         */
        createFallbackElement: function(fallbackData, type, context) {
            const { iconName, icon, options } = context;
            
            switch (type) {
                case 'emoji':
                    return this.createEmojiFallback(fallbackData, options);
                    
                case 'text':
                    return this.createTextFallback(fallbackData, icon, options);
                    
                case 'image':
                    return this.createImageFallback(fallbackData, iconName, options);
                    
                default:
                    return this.createDefaultFallback(fallbackData, options);
            }
        },

        /**
         * Crée un fallback emoji
         */
        createEmojiFallback: function(fallbackData, options) {
            const element = document.createElement('span');
            element.className = 'ifn-icon-fallback ifn-icon-fallback--emoji';
            element.textContent = fallbackData.default;
            element.style.fontSize = options.size || '1em';
            return element;
        },

        /**
         * Crée un fallback texte
         */
        createTextFallback: function(fallbackData, icon, options) {
            const element = document.createElement('span');
            element.className = 'ifn-icon-fallback ifn-icon-fallback--text';
            element.textContent = this.getFallbackText(icon);
            element.style.fontSize = options.size || '0.8em';
            return element;
        },

        /**
         * Crée un fallback image
         */
        createImageFallback: function(fallbackData, iconName, options) {
            const element = document.createElement('span');
            element.className = 'ifn-icon-fallback ifn-icon-fallback--image';
            
            // Essayer de charger une image spécifique, sinon utiliser le fallback générique
            const imgSrc = `/static/src/img/icons/fallbacks/${iconName}.png` || fallbackData.image;
            element.style.backgroundImage = `url(${imgSrc})`;
            element.style.width = options.size || '1em';
            element.style.height = options.size || '1em';
            
            // Charger l'image en arrière-plan
            this.preloadFallbackImage(imgSrc, element);
            
            return element;
        },

        /**
         * Crée un fallback par défaut
         */
        createDefaultFallback: function(fallbackData, options) {
            return this.createEmojiFallback(fallbackData, options);
        },

        /**
         * Obtient le texte de fallback optimal
         */
        getFallbackText: function(icon) {
            // Essayer d'obtenir une abréviation
            if (icon.name) {
                const words = icon.name.split(' ');
                if (words.length > 1) {
                    return words.map(word => word.charAt(0).toUpperCase()).join('');
                }
                return icon.name.charAt(0).toUpperCase();
            }
            return '?';
        },

        /**
         * Précharge une image de fallback
         */
        preloadFallbackImage: function(src, element) {
            const img = new Image();
            img.onload = () => {
                element.style.opacity = '1';
            };
            img.onerror = () => {
                element.classList.add('ifn-icon-fallback--error');
                console.warn(`Image de fallback non trouvée: ${src}`);
            };
            img.src = src;
            
            // Style de chargement
            element.style.opacity = '0.5';
        },

        /**
         * Obtient le type de fallback optimal
         */
        getOptimalFallbackType: function() {
            // Vérifier le support des emojis
            const supportsEmoji = this.checkEmojiSupport();
            if (supportsEmoji) {
                return 'emoji';
            }
            
            // Vérifier les performances réseau
            if (navigator.connection && navigator.connection.effectiveType === 'slow-2g') {
                return 'text';
            }
            
            return 'image';
        },

        /**
         * Vérifie le support des emojis
         */
        checkEmojiSupport: function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.font = '16px Arial';
            ctx.fillText('📦', 0, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            
            // Vérifier si l'emoji a été rendu (non transparent)
            return data.some((value, index) => {
                // Ignorer les canaux alpha pour le test
                return index % 4 !== 3 && value > 0;
            });
        },

        /**
         * Ajoute les attributs d'accessibilité
         */
        addAccessibilityAttributes: function(element, icon, options) {
            if (options.ariaLabel) {
                element.setAttribute('aria-label', options.ariaLabel);
            } else if (icon.name) {
                element.setAttribute('aria-label', icon.name);
            }
            
            if (options.ariaHidden) {
                element.setAttribute('aria-hidden', 'true');
            } else {
                element.setAttribute('role', 'img');
            }
        },

        /**
         * Surveille la connectivité
         */
        monitorConnectivity: function() {
            const updateStatus = () => {
                const isOnline = navigator.onLine;
                document.body.classList.toggle('ifn-offline', !isOnline);
                document.body.classList.toggle('ifn-online', isOnline);
            };

            window.addEventListener('online', updateStatus);
            window.addEventListener('offline', updateStatus);
            updateStatus(); // État initial
        },

        /**
         * Active les fallbacks hors ligne
         */
        enableOfflineFallbacks: function() {
            // Forcer l'utilisation de fallbacks pour économiser la bande passante
            document.body.classList.add('ifn-offline-mode');
        },

        /**
         * Supprime les fallbacks hors ligne
         */
        clearOfflineFallbacks: function() {
            document.body.classList.remove('ifn-offline-mode');
        },

        /**
         * Teste la disponibilité d'une icône
         */
        testIconAvailability: function(iconName) {
            return new Promise((resolve) => {
                const testElement = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                testElement.setAttribute('href', `#ifn-icon-${iconName}`);
                
                // Timeout pour éviter l'attente infinie
                const timeout = setTimeout(() => {
                    resolve(false);
                }, 1000);
                
                testElement.addEventListener('load', () => {
                    clearTimeout(timeout);
                    resolve(true);
                });
                
                testElement.addEventListener('error', () => {
                    clearTimeout(timeout);
                    resolve(false);
                });
                
                document.body.appendChild(testElement);
            });
        },

        /**
         * Interface publique pour les templates Odoo
         */
        odooAPI: {
            /**
             * Génère le HTML avec fallback pour Odoo
             */
            iconWithFallback: function(iconName, options = {}) {
                const fallback = IFN_IconFallbacks;
                
                return `
                    <div class="ifn-icon-container" 
                         data-icon="${iconName}"
                         role="img"
                         ${options.ariaLabel ? `aria-label="${options.ariaLabel}"` : ''}>
                        <div class="ifn-icon-fallback--loading">Chargement...</div>
                    </div>
                    <script>
                        (function() {
                            var container = document.querySelector('[data-icon="${iconName}"]');
                            if (container && window.IFN_Icons) {
                                IFN_Icons.renderIcon('${iconName}', {
                                    container: container,
                                    fallback: true,
                                    ${options.ariaLabel ? `ariaLabel: '${options.ariaLabel}',` : ''}
                                    ${options.size ? `size: '${options.size}',` : ''}
                                    ${options.color ? `color: '${options.color}',` : ''}
                                }).catch(function() {
                                    IFN_IconFallbacks.applyFallback(container, '${iconName}');
                                });
                            }
                        })();
                    </script>
                `;
            }
        }
    };

    // Exposer l'API
    window.IFN_IconFallbacks = IFN_IconFallbacks;

    // Auto-initialisation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => IFN_IconFallbacks.init());
    } else {
        IFN_IconFallbacks.init();
    }

})(window);