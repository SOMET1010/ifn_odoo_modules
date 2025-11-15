/* ================================================== */
/*           IFN PORTAL - BUILD CONFIGURATION         */
/* ================================================== */
/* Configuration des optimisations de build           */

const path = require('path');
const fs = require('fs');

module.exports = {
    // Configuration générale
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'production',
    
    // Chemins des fichiers
    paths: {
        src: './ifn_portal_common/static',
        dist: './ifn_portal_common/static/dist',
        public: './ifn_portal_common/static/public'
    },
    
    // Optimisations CSS
    css: {
        critical: {
            input: 'css/ifn_critical.css',
            output: 'dist/css/critical.min.css',
            minify: true,
            compress: true,
            target: '4kb' // Taille cible gzippée
        },
        lazy: {
            input: 'css/ifn_lazy.css',
            output: 'dist/css/lazy.min.css',
            minify: true,
            compress: true,
            media: 'print, (min-width: 600px)'
        }
    },
    
    // Optimisations JavaScript
    js: {
        core: {
            input: 'js/ifn_optimized.js',
            output: 'dist/js/core.min.js',
            minify: true,
            mangle: true,
            compress: {
                dead_code: true,
                drop_console: true,
                drop_debugger: true
            },
            sourcemap: false
        },
        modules: {
            directory: 'js/modules',
            output: 'dist/js/modules',
            format: 'es6',
            splitting: true
        },
        serviceWorker: {
            input: 'js/sw.js',
            output: 'dist/js/sw.js',
            minify: true,
            version: 'v2.0.0'
        }
    },
    
    // Optimisations Images
    images: {
        formats: {
            webp: {
                quality: 85,
                method: 6,
                preset: 'photo'
            },
            avif: {
                quality: 80,
                method: 6
            },
            jpeg: {
                quality: 85,
                progressive: true,
                subsampling: 1
            }
        },
        sizes: [400, 800, 1200, 1600, 2000],
        lazyLoading: true,
        placeholder: 'svg'
    },
    
    // Cache et Service Worker
    cache: {
        version: 'v2.0.0',
        strategies: {
            static: {
                pattern: /\.(css|js|ico|png|jpg|jpeg|gif|webp|svg)$/,
                strategy: 'cache-first',
                maxAge: 31536000 // 1 an
            },
            api: {
                pattern: /\/api\//,
                strategy: 'network-first',
                maxAge: 300000 // 5 minutes
            },
            html: {
                pattern: /\.html?$/,
                strategy: 'stale-while-revalidate',
                maxAge: 600000 // 10 minutes
            }
        }
    },
    
    // Performance monitoring
    monitoring: {
        coreWebVitals: {
            lcp: { threshold: 2500 },
            fid: { threshold: 100 },
            cls: { threshold: 0.1 }
        },
        tracking: {
            enabled: true,
            analytics: 'gtag',
            endpoint: '/api/analytics'
        }
    },
    
    // Accessibilité
    accessibility: {
        level: 'AA',
        features: {
            keyboardNavigation: true,
            screenReader: true,
            colorContrast: true,
            aria: true,
            focusManagement: true
        },
        testing: {
            axe: true,
            linting: true
        }
    },
    
    // Tests et validation
    testing: {
        lighthouse: {
            thresholds: {
                performance: 90,
                accessibility: 95,
                bestPractices: 90,
                seo: 90
            }
        },
        coverage: {
            statements: 80,
            branches: 75,
            functions: 80,
            lines: 80
        }
    },
    
    // Variables d'environnement
    env: {
        development: {
            sourcemap: true,
            minify: false,
            debug: true,
            cache: false
        },
        production: {
            sourcemap: false,
            minify: true,
            debug: false,
            cache: true
        }
    }
};