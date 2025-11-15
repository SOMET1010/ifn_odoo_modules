/**
 * Sprite SVG optimisé pour les icônes IFN
 * 
 * Ce module gère la génération et l'optimisation du sprite SVG
 * pour améliorer les performances de chargement.
 */

(function(window) {
    'use strict';

    const IFN_IconSprite = {
        // Configuration
        config: {
            spriteId: 'ifn-icons-optimized-sprite',
            storageKey: 'ifn-sprite-cache',
            cacheTTL: 24 * 60 * 60 * 1000, // 24 heures
            compressionLevel: 6
        },

        /**
         * Génère un sprite optimisé
         */
        generateOptimizedSprite: function(icons, options = {}) {
            const {
                minify = true,
                inline = false,
                includeComments = false
            } = options;

            let spriteContent = this.buildSpriteStructure(icons, {
                includeComments,
                optimized: true
            });

            if (minify) {
                spriteContent = this.minifySVG(spriteContent);
            }

            return spriteContent;
        },

        /**
         * Construit la structure du sprite
         */
        buildSpriteStructure: function(icons, options = {}) {
            const { includeComments, optimized } = options;
            
            let svg = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none;">\n';
            
            if (includeComments) {
                svg += '  <!-- Sprite SVG optimisé IFN -->\n';
                svg += `  <!-- Généré le: ${new Date().toISOString()} -->\n`;
                svg += `  <!-- ${icons.length} icônes incluses -->\n\n`;
            }

            // Groupes par catégorie pour l'optimisation
            const categories = this.groupByCategory(icons);
            
            Object.entries(categories).forEach(([category, categoryIcons]) => {
                if (includeComments) {
                    svg += `  <!-- Catégorie: ${category} (${categoryIcons.length} icônes) -->\n`;
                }
                
                categoryIcons.forEach(icon => {
                    svg += this.buildSymbol(icon, optimized);
                });
                
                if (includeComments) {
                    svg += '\n';
                }
            });

            svg += '</svg>';
            return svg;
        },

        /**
         * Groupe les icônes par catégorie
         */
        groupByCategory: function(icons) {
            const grouped = {};
            
            Object.entries(icons).forEach(([name, icon]) => {
                const category = icon.category || 'default';
                if (!grouped[category]) {
                    grouped[category] = {};
                }
                grouped[category][name] = icon;
            });
            
            return grouped;
        },

        /**
         * Construit un symbole SVG
         */
        buildSymbol: function(icon, optimized = false) {
            let symbol = `  <symbol id="${icon.id}" viewBox="0 0 24 24"`;
            
            if (optimized) {
                // Ajouter des métadonnées minimisées
                symbol += ` data-name="${icon.name}" data-cat="${icon.category}"`;
            }
            
            symbol += '>\n';
            
            // Le contenu du symbole (déjà optimisé dans le SVG principal)
            symbol += '    <!-- Contenu du symbole -->';
            symbol += '\n  </symbol>\n\n';
            
            return symbol;
        },

        /**
         * Minifie le SVG
         */
        minifySVG: function(svg) {
            return svg
                // Supprimer les commentaires
                .replace(/<!--[\s\S]*?-->/g, '')
                // Supprimer les espaces多余的
                .replace(/\s+/g, ' ')
                // Supprimer les espaces au début/fin
                .trim()
                // Minimiser les balises vides
                .replace(/\s*><\s*/g, '><')
                // Supprimer les sauts de ligne inutiles
                .replace(/\n/g, '');
        },

        /**
         * Charge le sprite optimisé
         */
        loadOptimizedSprite: function() {
            return new Promise((resolve, reject) => {
                // Vérifier le cache local
                const cached = this.getFromCache();
                if (cached) {
                    this.injectSprite(cached);
                    resolve(cached);
                    return;
                }

                // Charger et optimiser
                this.generateAndCache().then(sprite => {
                    this.injectSprite(sprite);
                    resolve(sprite);
                }).catch(reject);
            });
        },

        /**
         * Génère et met en cache
         */
        generateAndCache: function() {
            return fetch('/static/src/img/icons/ifn-icons.svg')
                .then(response => response.text())
                .then(svgContent => {
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                    const symbols = svgDoc.querySelectorAll('symbol');
                    
                    // Extraire les métadonnées des symboles
                    const icons = {};
                    symbols.forEach(symbol => {
                        const id = symbol.getAttribute('id');
                        icons[id] = {
                            id: id,
                            // Ajouter d'autres métadonnées si nécessaires
                        };
                    });

                    const optimizedSprite = this.generateOptimizedSprite(icons);
                    this.saveToCache(optimizedSprite);
                    
                    return optimizedSprite;
                });
        },

        /**
         * Injecte le sprite dans le DOM
         */
        injectSprite: function(spriteContent) {
            let existingSprite = document.getElementById(this.config.spriteId);
            
            if (existingSprite) {
                existingSprite.remove();
            }

            const spriteElement = document.createElement('div');
            spriteElement.innerHTML = spriteContent;
            const svg = spriteElement.querySelector('svg');
            
            if (svg) {
                svg.id = this.config.spriteId;
                svg.style.cssText = `
                    position: absolute;
                    width: 0;
                    height: 0;
                    overflow: hidden;
                `;
                
                document.body.insertBefore(svg, document.body.firstChild);
            }
        },

        /**
         * Sauvegarde en cache local
         */
        saveToCache: function(content) {
            try {
                const cacheData = {
                    content: content,
                    timestamp: Date.now(),
                    version: '1.0'
                };
                localStorage.setItem(this.config.storageKey, JSON.stringify(cacheData));
            } catch (error) {
                console.warn('Impossible de sauvegarder le sprite en cache:', error);
            }
        },

        /**
         * Récupère du cache local
         */
        getFromCache: function() {
            try {
                const cached = localStorage.getItem(this.config.storageKey);
                if (!cached) return null;

                const cacheData = JSON.parse(cached);
                const isExpired = (Date.now() - cacheData.timestamp) > this.config.cacheTTL;
                
                if (isExpired) {
                    localStorage.removeItem(this.config.storageKey);
                    return null;
                }

                return cacheData.content;
            } catch (error) {
                console.warn('Erreur lors de la lecture du cache:', error);
                return null;
            }
        },

        /**
         * Vide le cache
         */
        clearCache: function() {
            localStorage.removeItem(this.config.storageKey);
        }
    };

    // Exposer l'API
    window.IFN_IconSprite = IFN_IconSprite;

})(window);