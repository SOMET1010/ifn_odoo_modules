/**
 * Système d'icônes centralisé IFN
 * 
 * Ce module fournit un système complet de gestion des icônes IFN :
 * - Mapping des 18 pictogrammes avec noms descriptifs
 * - Système de fallback automatique
 * - Lazy loading des icônes
 * - Cache optimisé
 * - Préchargement intelligent
 * - Support accessibilité (ARIA)
 * 
 * Usage :
 *   IFN_Icons.renderIcon('sell', {size: '24px', color: 'primary'});
 *   IFN_Icons.getIconURL('stock');
 *   IFN_Icons.preload(['social', 'education', 'home']);
 */

(function(window) {
    'use strict';

    const IFN_Icons = {
        // Configuration des icônes avec métadonnées
        icons: {
            'sell': {
                id: 'ifn-icon-sell',
                name: 'Vente',
                description: 'Icône représentant les ventes et transactions commerciales',
                category: 'business',
                tags: ['panier', 'commerce', 'achat', 'money'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['payment', 'add']
            },
            'stock': {
                id: 'ifn-icon-stock',
                name: 'Stock',
                description: 'Icône représentant la gestion des stocks et inventaires',
                category: 'logistics',
                tags: ['inventaire', 'entrepot', 'produits'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['documents', 'view']
            },
            'payment': {
                id: 'ifn-icon-payment',
                name: 'Paiement',
                description: 'Icône représentant les systèmes de paiement',
                category: 'finance',
                tags: ['carte', 'banque', 'transaction', 'money'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['sell', 'add']
            },
            'social': {
                id: 'ifn-icon-social',
                name: 'Réseau Social',
                description: 'Icône représentant les interactions sociales et communauté',
                category: 'social',
                tags: ['utilisateurs', 'communauté', 'partage'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['profile', 'notifications']
            },
            'education': {
                id: 'ifn-icon-education',
                name: 'Formation',
                description: 'Icône représentant la formation et l\'apprentissage',
                category: 'education',
                tags: ['livre', 'apprentissage', 'cours', 'savoir'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['help', 'stats']
            },
            'home': {
                id: 'ifn-icon-home',
                name: 'Accueil',
                description: 'Icône représentant la page d\'accueil et la navigation principale',
                category: 'navigation',
                tags: ['maison', 'début', 'accueil'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['view', 'settings']
            },
            'notifications': {
                id: 'ifn-icon-notifications',
                name: 'Notifications',
                description: 'Icône représentant les alertes et notifications',
                category: 'communication',
                tags: ['alerte', 'cloche', 'message', 'info'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['info', 'warning']
            },
            'documents': {
                id: 'ifn-icon-documents',
                name: 'Documents',
                description: 'Icône représentant la gestion documentaire',
                category: 'content',
                tags: ['fichier', 'dossier', 'archive'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['view', 'stock']
            },
            'settings': {
                id: 'ifn-icon-settings',
                name: 'Paramètres',
                description: 'Icône représentant la configuration et les réglages',
                category: 'navigation',
                tags: ['engrenage', 'configuration', 'options'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['edit', 'view']
            },
            'search': {
                id: 'ifn-icon-search',
                name: 'Recherche',
                description: 'Icône représentant la fonction de recherche',
                category: 'navigation',
                tags: ['loupe', 'trouver', 'recherche'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['view', 'help']
            },
            'download': {
                id: 'ifn-icon-download',
                name: 'Téléchargement',
                description: 'Icône représentant le téléchargement de fichiers',
                category: 'actions',
                tags: ['flèche', 'sauvegarder', 'export'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['upload', 'add']
            },
            'upload': {
                id: 'ifn-icon-upload',
                name: 'Upload',
                description: 'Icône représentant le téléchargement vers le serveur',
                category: 'actions',
                tags: ['flèche', 'envoyer', 'import'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['download', 'add']
            },
            'add': {
                id: 'ifn-icon-add',
                name: 'Ajouter',
                description: 'Icône représentant l\'ajout d\'éléments',
                category: 'actions',
                tags: ['plus', 'créer', 'nouveau'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['upload', 'edit']
            },
            'delete': {
                id: 'ifn-icon-delete',
                name: 'Supprimer',
                description: 'Icône représentant la suppression',
                category: 'actions',
                tags: ['poubelle', 'effacer', 'supprimer'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['warning', 'error']
            },
            'edit': {
                id: 'ifn-icon-edit',
                name: 'Modifier',
                description: 'Icône représentant la modification',
                category: 'actions',
                tags: ['crayon', 'modifier', 'éditer'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['settings', 'add']
            },
            'view': {
                id: 'ifn-icon-view',
                name: 'Voir',
                description: 'Icône représentant l\'affichage et la visualisation',
                category: 'actions',
                tags: ['œil', 'voir', 'visualiser'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['documents', 'search']
            },
            'sync': {
                id: 'ifn-icon-sync',
                name: 'Synchronisation',
                description: 'Icône représentant la synchronisation de données',
                category: 'status',
                tags: ['flèches', 'synchro', 'rafraîchir'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['online', 'offline']
            },
            'offline': {
                id: 'ifn-icon-offline',
                name: 'Hors ligne',
                description: 'Icône représentant l\'état hors ligne',
                category: 'status',
                tags: ['wifi', 'déconnecté', 'hors ligne'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['sync', 'online']
            },
            'online': {
                id: 'ifn-icon-online',
                name: 'En ligne',
                description: 'Icône représentant l\'état en ligne',
                category: 'status',
                tags: ['wifi', 'connecté', 'en ligne'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['sync', 'offline']
            },
            'qrcode': {
                id: 'ifn-icon-qrcode',
                name: 'QR Code',
                description: 'Icône représentant les codes QR',
                category: 'tools',
                tags: ['scan', 'qr', 'code'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['search', 'view']
            },
            'profile': {
                id: 'ifn-icon-profile',
                name: 'Profil',
                description: 'Icône représentant le profil utilisateur',
                category: 'user',
                tags: ['utilisateur', 'personne', 'compte'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['social', 'settings']
            },
            'help': {
                id: 'ifn-icon-help',
                name: 'Aide',
                description: 'Icône représentant l\'aide et l\'assistance',
                category: 'communication',
                tags: ['question', 'aide', 'support'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['info', 'education']
            },
            'stats': {
                id: 'ifn-icon-stats',
                name: 'Statistiques',
                description: 'Icône représentant les statistiques et analyses',
                category: 'data',
                tags: ['graphique', 'données', 'analyse'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['education', 'calendar']
            },
            'calendar': {
                id: 'ifn-icon-calendar',
                name: 'Calendrier',
                description: 'Icône représentant la planification et le calendrier',
                category: 'planning',
                tags: ['date', 'événement', 'planification'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['time', 'stats']
            },
            'time': {
                id: 'ifn-icon-time',
                name: 'Temps',
                description: 'Icône représentant le temps et les horloges',
                category: 'planning',
                tags: ['horloge', 'durée', 'temps'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['calendar', 'sync']
            },
            'success': {
                id: 'ifn-icon-success',
                name: 'Succès',
                description: 'Icône représentant un succès ou une validation',
                category: 'status',
                tags: ['check', 'succès', 'validé'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['info', 'add']
            },
            'error': {
                id: 'ifn-icon-error',
                name: 'Erreur',
                description: 'Icône représentant une erreur',
                category: 'status',
                tags: ['erreur', 'problème', 'échec'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['warning', 'delete']
            },
            'warning': {
                id: 'ifn-icon-warning',
                name: 'Avertissement',
                description: 'Icône représentant un avertissement',
                category: 'status',
                tags: ['attention', 'avertissement', 'caution'],
                color: 'primary',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['info', 'error']
            },
            'info': {
                id: 'ifn-icon-info',
                name: 'Information',
                description: 'Icône représentant une information',
                category: 'status',
                tags: ['information', 'détail', 'aide'],
                color: 'success',
                defaultSize: '24px',
                svgPath: '/static/src/img/icons/ifn-icons.svg',
                alternatives: ['help', 'success']
            }
        },

        // Cache pour les éléments chargés
        cache: {
            sprite: null,
            icons: new Map(),
            loaded: new Set()
        },

        // Configuration par défaut
        defaults: {
            size: '24px',
            color: 'currentColor',
            class: 'ifn-icon',
            fallbackDelay: 3000
        },

        // Tailles disponibles
        sizes: {
            'xs': '12px',
            'sm': '16px', 
            'md': '24px',
            'lg': '32px',
            'xl': '48px',
            'xxl': '64px'
        },

        // Couleurs disponibles selon la charte IFN
        colors: {
            'primary': '#F77F00',     // Orange IFN
            'success': '#009739',     // Vert IFN
            'white': '#FFFFFF',
            'black': '#000000',
            'gray': '#666666'
        },

        /**
         * Initialise le système d'icônes
         */
        init: function() {
            this.loadSprite();
            this.setupAccessibility();
            this.setupLazyLoading();
            this.preloadCommonIcons();
            
            // Événement pour recharger le sprite si nécessaire
            window.addEventListener('online', () => this.preloadAllIcons());
            window.addEventListener('IFN Icons Cache Update', () => {
                this.cache.sprite = null;
                this.loadSprite();
            });
        },

        /**
         * Charge le sprite SVG principal
         */
        loadSprite: function() {
            if (this.cache.sprite) {
                return Promise.resolve(this.cache.sprite);
            }

            return new Promise((resolve, reject) => {
                const spriteId = 'ifn-icons-sprite';
                
                // Vérifier si le sprite existe déjà dans le DOM
                let existingSprite = document.getElementById(spriteId);
                if (existingSprite && existingSprite.tagName === 'svg') {
                    this.cache.sprite = existingSprite;
                    resolve(existingSprite);
                    return;
                }

                // Charger le sprite depuis le fichier SVG
                const xhr = new XMLHttpRequest();
                xhr.open('GET', '/static/src/img/icons/ifn-icons.svg', true);
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const parser = new DOMParser();
                        const svgDoc = parser.parseFromString(xhr.responseText, 'image/svg+xml');
                        const svgElement = svgDoc.querySelector('svg');
                        
                        if (svgElement) {
                            svgElement.id = spriteId;
                            svgElement.style.position = 'absolute';
                            svgElement.style.width = '0';
                            svgElement.style.height = '0';
                            svgElement.style.overflow = 'hidden';
                            
                            // Ajouter au DOM
                            document.body.insertBefore(svgElement, document.body.firstChild);
                            this.cache.sprite = svgElement;
                            resolve(svgElement);
                        } else {
                            reject(new Error('Sprite SVG invalide'));
                        }
                    } else {
                        reject(new Error('Erreur lors du chargement du sprite'));
                    }
                };
                xhr.onerror = () => reject(new Error('Erreur réseau'));
                xhr.send();
            });
        },

        /**
         * Configure l'accessibilité
         */
        setupAccessibility: function() {
            // Ajouter les styles pour les icônes accessibles
            const style = document.createElement('style');
            style.textContent = `
                .ifn-icon {
                    display: inline-block;
                    vertical-align: middle;
                    width: 1em;
                    height: 1em;
                    fill: currentColor;
                    flex-shrink: 0;
                }
                .ifn-icon--hidden {
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
                .ifn-icon--loading {
                    opacity: 0.5;
                    animation: ifn-pulse 1.5s ease-in-out infinite;
                }
                .ifn-icon--error {
                    opacity: 0.3;
                }
                @keyframes ifn-pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        },

        /**
         * Configure le lazy loading
         */
        setupLazyLoading: function() {
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const icon = entry.target;
                            this.loadIconLazy(icon);
                            observer.unobserve(icon);
                        }
                    });
                }, {
                    rootMargin: '50px'
                });

                // Observer tous les éléments avec la classe lazy-icon
                document.querySelectorAll('.lazy-icon').forEach(icon => {
                    observer.observe(icon);
                });
            }
        },

        /**
         * Charge une icône en lazy loading
         */
        loadIconLazy: function(element) {
            const iconName = element.dataset.icon;
            if (iconName) {
                this.renderIcon(iconName, {
                    container: element,
                    showLoading: false
                });
            }
        },

        /**
         * Précharge les icônes communes
         */
        preloadCommonIcons: function() {
            const commonIcons = ['home', 'notifications', 'settings', 'profile', 'search'];
            this.preload(commonIcons);
        },

        /**
         * Précharge une liste d'icônes
         */
        preload: function(iconNames) {
            iconNames.forEach(name => {
                if (!this.cache.loaded.has(name)) {
                    this.loadIconElement(name).catch(err => {
                        console.warn(`Impossible de précharger l'icône ${name}:`, err);
                    });
                }
            });
        },

        /**
         * Précharge toutes les icônes
         */
        preloadAllIcons: function() {
            const allIconNames = Object.keys(this.icons);
            this.preload(allIconNames);
        },

        /**
         * Charge un élément icône
         */
        loadIconElement: function(iconName) {
            if (this.cache.loaded.has(iconName)) {
                return Promise.resolve(this.cache.icons.get(iconName));
            }

            const icon = this.icons[iconName];
            if (!icon) {
                return Promise.reject(new Error(`Icône '${iconName}' introuvable`));
            }

            return new Promise((resolve, reject) => {
                this.loadSprite().then(() => {
                    const svgElement = document.querySelector(`#${icon.id}`);
                    if (svgElement) {
                        this.cache.icons.set(iconName, svgElement.cloneNode(true));
                        this.cache.loaded.add(iconName);
                        resolve(svgElement.cloneNode(true));
                    } else {
                        reject(new Error(`Symbole SVG '${icon.id}' introuvable`));
                    }
                }).catch(reject);
            });
        },

        /**
         * Génère l'URL d'une icône
         */
        getIconURL: function(iconName, options = {}) {
            const icon = this.icons[iconName];
            if (!icon) {
                console.warn(`Icône '${iconName}' introuvable`);
                return this.getFallbackURL(options.fallback);
            }

            // Construire l'URL avec les paramètres
            const params = new URLSearchParams();
            if (options.color) params.set('color', options.color);
            if (options.size) params.set('size', options.size);
            
            const queryString = params.toString();
            return `${icon.svgPath}#${icon.id}${queryString ? '?' + queryString : ''}`;
        },

        /**
         * Rendu d'une icône avec fallback
         */
        renderIcon: function(iconName, options = {}) {
            const {
                size = this.defaults.size,
                color = this.defaults.color,
                className = this.defaults.class,
                container = null,
                fallback = true,
                showLoading = true,
                ariaLabel = null,
                ariaHidden = false,
                title = null
            } = options;

            // Déterminer le conteneur
            let targetContainer = container || document.createElement('div');
            targetContainer.className = className;

            // Attributs ARIA pour l'accessibilité
            if (ariaLabel) {
                targetContainer.setAttribute('aria-label', ariaLabel);
            }
            if (ariaHidden) {
                targetContainer.setAttribute('aria-hidden', 'true');
            }
            if (title) {
                targetContainer.setAttribute('title', title);
            }

            // Classes CSS selon les couleurs IFN
            const colorClass = this.getColorClass(color);
            if (colorClass) {
                targetContainer.classList.add(colorClass);
            }

            // Charger et rendre l'icône
            if (showLoading) {
                targetContainer.classList.add('ifn-icon--loading');
            }

            return this.loadIconElement(iconName).then(iconElement => {
                // Configurer les attributs de l'icône
                iconElement.setAttribute('width', size);
                iconElement.setAttribute('height', size);
                iconElement.classList.add('ifn-icon');

                // Supprimer les classes de chargement
                targetContainer.classList.remove('ifn-icon--loading', 'ifn-icon--error');

                // Vider le conteneur et ajouter l'icône
                targetContainer.innerHTML = '';
                targetContainer.appendChild(iconElement);

                return targetContainer;

            }).catch(error => {
                console.warn(`Erreur avec l'icône '${iconName}':`, error);
                targetContainer.classList.remove('ifn-icon--loading');
                targetContainer.classList.add('ifn-icon--error');

                if (fallback) {
                    return this.renderFallback(iconName, options, targetContainer);
                } else {
                    throw error;
                }
            });
        },

        /**
         * Rendu du fallback
         */
        renderFallback: function(iconName, options, container) {
            const fallbackType = options.fallback || 'text';
            
            if (fallbackType === 'text') {
                const icon = this.icons[iconName];
                const fallback = document.createElement('span');
                fallback.textContent = icon ? icon.name : iconName;
                fallback.style.fontSize = options.size || this.defaults.size;
                fallback.style.color = options.color || this.defaults.color;
                container.appendChild(fallback);
            } else if (fallbackType === 'image') {
                // Fallback vers une image PNG si disponible
                const img = document.createElement('img');
                img.src = this.getIconURL(iconName, { size: options.size });
                img.alt = options.ariaLabel || this.icons[iconName]?.name || iconName;
                img.style.width = options.size || this.defaults.size;
                img.style.height = options.size || this.defaults.size;
                container.appendChild(img);
            }

            return container;
        },

        /**
         * Obtient la classe CSS pour une couleur
         */
        getColorClass: function(color) {
            const colorMap = {
                'primary': 'text-primary',
                'success': 'text-success',
                'white': 'text-white',
                'black': 'text-dark',
                'gray': 'text-muted'
            };
            return colorMap[color] || null;
        },

        /**
         * Obtient l'URL de fallback
         */
        getFallbackURL: function(fallbackType = 'text') {
            if (fallbackType === 'image') {
                return '/static/src/img/icons/icon-192.png'; // Fallback image
            }
            return null;
        },

        /**
         * Recherche d'icônes par nom, description ou tags
         */
        searchIcons: function(query) {
            const results = [];
            const searchTerm = query.toLowerCase();

            Object.entries(this.icons).forEach(([name, icon]) => {
                const searchableText = [
                    name,
                    icon.name,
                    icon.description,
                    ...icon.tags
                ].join(' ').toLowerCase();

                if (searchableText.includes(searchTerm)) {
                    results.push({
                        name,
                        ...icon,
                        relevance: this.calculateRelevance(searchTerm, searchableText)
                    });
                }
            });

            return results.sort((a, b) => b.relevance - a.relevance);
        },

        /**
         * Calcule la pertinence d'un résultat
         */
        calculateRelevance: function(searchTerm, searchableText) {
            let score = 0;
            
            // Exact match dans le nom = score maximum
            if (searchableText.startsWith(searchTerm)) {
                score += 10;
            }
            
            // Inclusion dans les tags
            if (searchableText.includes(searchTerm)) {
                score += 5;
            }
            
            // Distance dans le texte (approximation)
            const termIndex = searchableText.indexOf(searchTerm);
            if (termIndex !== -1) {
                score += Math.max(1, 10 - Math.floor(termIndex / 10));
            }
            
            return score;
        },

        /**
         * Obtient les icônes par catégorie
         */
        getIconsByCategory: function() {
            const categories = {};
            
            Object.entries(this.icons).forEach(([name, icon]) => {
                if (!categories[icon.category]) {
                    categories[icon.category] = [];
                }
                categories[icon.category].push({ name, ...icon });
            });
            
            return categories;
        },

        /**
         * API pour l'usage dans les templates Odoo
         */
        odooAPI: {
            /**
             * Génère le HTML pour une icône (usage dans les templates Odoo)
             */
            iconHTML: function(iconName, options = {}) {
                const icon = IFN_Icons.icons[iconName];
                if (!icon) {
                    return `<span class="ifn-icon-fallback">${iconName}</span>`;
                }

                const size = options.size || IFN_Icons.defaults.size;
                const color = options.color || IFN_Icons.defaults.color;
                const ariaLabel = options.ariaLabel || icon.name;
                
                return `
                    <svg class="ifn-icon" 
                         width="${size}" 
                         height="${size}" 
                         role="img" 
                         aria-label="${ariaLabel}"
                         xmlns="http://www.w3.org/2000/svg">
                        <use href="#${icon.id}" />
                    </svg>
                `;
            }
        }
    };

    // Exposer l'API globalement
    window.IFN_Icons = IFN_Icons;

    // Auto-initialisation si le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => IFN_Icons.init());
    } else {
        IFN_Icons.init();
    }

})(window);