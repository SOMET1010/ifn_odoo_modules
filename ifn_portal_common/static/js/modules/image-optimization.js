/* ================================================== */
/*       IFN PORTAL - OPTIMISATION IMAGES MODULE      */
/* ================================================== */

export default {
    init() {
        console.log('🖼️ Initialisation optimisation images');
        this.setupLazyLoading();
        this.setupWebPDetection();
        this.setupImageCompression();
        this.setupResponsiveImages();
        this.optimizeExistingImages();
    },

    /**
     * Configuration du lazy loading
     */
    setupLazyLoading() {
        // Vérification du support IntersectionObserver
        if (!('IntersectionObserver' in window)) {
            this.fallbackLazyLoading();
            return;
        }

        // Configuration de l'observer
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    imageObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });

        // Observer toutes les images non encore optimisées
        document.querySelectorAll('img:not([data-optimized])').forEach(img => {
            this.prepareImageForLazyLoading(img);
            imageObserver.observe(img);
        });

        // Observer les images ajoutées dynamiquement
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG') {
                            this.optimizeImage(node);
                        } else {
                            node.querySelectorAll?.('img').forEach(img => {
                                this.optimizeImage(img);
                            });
                        }
                    }
                });
            });
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    /**
     * Préparation des images pour le lazy loading
     */
    prepareImageForLazyLoading(img) {
        // Sauvegarde de l'URL originale
        if (!img.dataset.originalSrc) {
            img.dataset.originalSrc = img.src;
        }

        // Remplacement par une image placeholder
        img.src = this.generatePlaceholder(img);
        
        // Ajout des attributs pour l'accessibilité
        if (!img.getAttribute('alt')) {
            img.setAttribute('alt', 'Image en cours de chargement...');
        }
        
        img.setAttribute('loading', 'lazy');
        img.setAttribute('data-optimized', 'true');
    },

    /**
     * Génération d'un placeholder SVG
     */
    generatePlaceholder(img) {
        const width = img.getAttribute('width') || 300;
        const height = img.getAttribute('height') || 200;
        
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f0f0f0"/>
                <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-family="sans-serif">
                    Chargement...
                </text>
            </svg>
        `;
        
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    },

    /**
     * Chargement optimisé d'une image
     */
    loadImage(img) {
        const originalSrc = img.dataset.originalSrc;
        if (!originalSrc) return;

        // Création d'une nouvelle image pour précharger
        const imageLoader = new Image();
        
        imageLoader.onload = () => {
            // Remplacement de l'image
            img.src = originalSrc;
            img.classList.add('loaded');
            
            // Animation de fade-in
            img.style.transition = 'opacity 0.3s ease';
            img.style.opacity = '1';
            
            // Nettoyage
            delete img.dataset.originalSrc;
            img.removeAttribute('data-optimized');
        };
        
        imageLoader.onerror = () => {
            // Image de fallback en cas d'erreur
            img.src = '/static/images/fallback-image.png';
            img.alt = 'Image non disponible';
        };
        
        // Démarrage du chargement
        imageLoader.src = originalSrc;
    },

    /**
     * Optimisation d'une image individuelle
     */
    optimizeImage(img) {
        if (img.getAttribute('data-optimized')) return;

        // Ajout des attributs de performance
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        img.setAttribute('data-optimized', 'true');

        // Ajout de la gestion d'erreur
        img.addEventListener('error', (e) => {
            e.target.src = '/static/images/fallback-image.png';
            e.target.alt = 'Image non disponible';
        });

        // Ajout du loading completion
        img.addEventListener('load', () => {
            img.classList.add('loaded');
        });
    },

    /**
     * Détection du support WebP
     */
    setupWebPDetection() {
        this.webpSupported = false;
        
        const webp = new Image();
        webp.onload = webp.onerror = () => {
            this.webpSupported = (webp.height === 2);
            console.log(this.webpSupported ? '✅ WebP supporté' : '❌ WebP non supporté');
        };
        webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    },

    /**
     * Configuration de la compression d'images
     */
    setupImageCompression() {
        this.compressionSettings = {
            quality: 0.85,
            maxWidth: 1200,
            maxHeight: 800,
            formats: ['webp', 'jpeg', 'png']
        };
    },

    /**
     * Configuration des images responsives
     */
    setupResponsiveImages() {
        document.querySelectorAll('img').forEach(img => {
            this.convertToResponsiveImage(img);
        });
    },

    /**
     * Conversion d'une image en format responsive
     */
    convertToResponsiveImage(img) {
        const srcset = this.generateSrcset(img.src);
        const sizes = this.generateSizes(img);
        
        img.setAttribute('srcset', srcset);
        img.setAttribute('sizes', sizes);
        
        console.log('🖼️ Image responsive configurée:', img.src);
    },

    /**
     * Génération du srcset
     */
    generateSrcset(originalSrc) {
        const basePath = originalSrc.split('.')[0];
        const extension = originalSrc.split('.').pop();
        
        const sizes = [400, 800, 1200, 1600];
        const srcsetArray = [];
        
        sizes.forEach(width => {
            const webpSrc = `${basePath}-${width}w.webp`;
            const jpegSrc = `${basePath}-${width}w.jpg`;
            
            // WebP si supporté, sinon JPEG
            const bestFormat = this.webpSupported ? webpSrc : jpegSrc;
            
            srcsetArray.push(`${bestFormat} ${width}w`);
        });
        
        return srcsetArray.join(', ');
    },

    /**
     * Génération des tailles
     */
    generateSizes(img) {
        const containerWidth = img.parentElement?.offsetWidth || 1200;
        
        if (containerWidth < 600) {
            return '(max-width: 600px) 100vw, 100vw';
        } else if (containerWidth < 1200) {
            return '(max-width: 1200px) 100vw, 1200px';
        } else {
            return '1200px';
        }
    },

    /**
     * Optimisation des images existantes
     */
    optimizeExistingImages() {
        const images = document.querySelectorAll('img');
        let optimizedCount = 0;

        images.forEach(img => {
            if (!img.hasAttribute('data-optimized')) {
                this.optimizeImage(img);
                optimizedCount++;
            }
        });

        console.log(`✅ ${optimizedCount} images optimisées`);
    },

    /**
     * Lazy loading fallback pour navigateurs anciens
     */
    fallbackLazyLoading() {
        const images = document.querySelectorAll('img');
        
        const checkImages = () => {
            images.forEach(img => {
                const rect = img.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                
                if (isVisible && img.dataset.originalSrc) {
                    this.loadImage(img);
                }
            });
        };

        // Vérification initiale
        checkImages();

        // Vérification au scroll
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    checkImages();
                    ticking = false;
                });
                ticking = true;
            }
        });
    },

    /**
     * Préchargement d'images critiques
     */
    preloadCriticalImages() {
        const criticalImages = [
            '/static/images/logo.png',
            '/static/images/hero-bg.jpg',
            '/static/icons/nav-icon.png'
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });

        console.log('🔄 Images critiques préchargées');
    },

    /**
     * Compression d'image côté client
     */
    compressImage(file, options = {}) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            const config = { ...this.compressionSettings, ...options };
            
            img.onload = () => {
                // Calcul des nouvelles dimensions
                const { width, height } = this.calculateDimensions(
                    img.width, 
                    img.height, 
                    config.maxWidth, 
                    config.maxHeight
                );
                
                canvas.width = width;
                canvas.height = height;
                
                // Dessin de l'image redimensionnée
                ctx.drawImage(img, 0, 0, width, height);
                
                // Conversion en blob
                canvas.toBlob(resolve, `image/${config.formats[0]}`, config.quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    },

    /**
     * Calcul des dimensions optimisées
     */
    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let { width, height } = { width: originalWidth, height: originalHeight };
        
        // Redimensionnement proportionnel
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    },

    /**
     * Conversion d'images en lot
     */
    batchConvertImages(images, format = 'webp') {
        const conversions = Array.from(images).map(img => {
            return this.convertImageFormat(img, format);
        });
        
        return Promise.all(conversions);
    },

    /**
     * Conversion du format d'une image
     */
    convertImageFormat(img, targetFormat) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const imageObj = new Image();
            
            imageObj.onload = () => {
                canvas.width = imageObj.width;
                canvas.height = imageObj.height;
                
                ctx.drawImage(imageObj, 0, 0);
                
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    resolve({ original: img, converted: url, format: targetFormat });
                }, `image/${targetFormat}`);
            };
            
            imageObj.src = img.src;
        });
    },

    /**
     * Nettoyage des URLs d'objets
     */
    cleanup() {
        document.querySelectorAll('img.loaded').forEach(img => {
            if (img.dataset.objectUrl) {
                URL.revokeObjectURL(img.dataset.objectUrl);
                delete img.dataset.objectUrl;
            }
        });
    },

    /**
     * API publique
     */
    loadCriticalImages: () => {
        const module = window.IFN_Portal?.modules?.['image-optimization'];
        if (module) {
            module.preloadCriticalImages();
        }
    },

    compressFile: (file, options) => {
        const module = window.IFN_Portal?.modules?.['image-optimization'];
        if (module) {
            return module.compressImage(file, options);
        }
    },

    convertBatch: (images, format) => {
        const module = window.IFN_Portal?.modules?.['image-optimization'];
        if (module) {
            return module.batchConvertImages(images, format);
        }
    }
};