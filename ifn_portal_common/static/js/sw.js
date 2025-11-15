/* ================================================== */
/*         IFN PORTAL - SERVICE WORKER                */
/* ================================================== */
/* Cache et optimisations réseau */

const CACHE_NAME = 'ifn-portal-v2.0.0';
const STATIC_CACHE = 'ifn-static-v2';
const DYNAMIC_CACHE = 'ifn-dynamic-v2';
const IMAGE_CACHE = 'ifn-images-v2';

// Ressources critiques à mettre en cache immédiatement
const CRITICAL_RESOURCES = [
    '/',
    '/static/css/ifn_critical.css',
    '/static/js/ifn_optimized.js',
    '/static/images/logo.png'
];

// Patterns pour les ressources dynamiques
const CACHE_PATTERNS = {
    static: /\.(css|js)$/,
    images: /\.(png|jpg|jpeg|gif|webp|svg)$/,
    api: /\/api\//
};

// Stratégies de cache
const CACHE_STRATEGIES = {
    // Cache First pour ressources statiques
    cacheFirst: ['css', 'js', 'images'],
    
    // Network First pour API
    networkFirst: ['api'],
    
    // Stale While Revalidate pour HTML
    staleWhileRevalidate: ['html']
};

/**
 * Installation du Service Worker
 */
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installation');
    
    event.waitUntil(
        Promise.all([
            // Cache des ressources critiques
            caches.open(STATIC_CACHE).then(cache => {
                console.log('📦 Cache des ressources critiques');
                return cache.addAll(CRITICAL_RESOURCES);
            }),
            
            // Activation immédiate
            self.skipWaiting()
        ])
    );
});

/**
 * Activation du Service Worker
 */
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activation');
    
    event.waitUntil(
        Promise.all([
            // Nettoyage des anciens caches
            cleanupOldCaches(),
            
            // Prise de contrôle des clients
            self.clients.claim(),
            
            // Préchargement des ressources populaires
            preloadPopularResources()
        ])
    );
});

/**
 * Interception des requêtes
 */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorer les requêtes non-HTTP
    if (!request.url.startsWith('http')) return;
    
    // Stratégie de cache selon le type de ressource
    if (CACHE_PATTERNS.api.test(url.pathname)) {
        event.respondWith(networkFirstStrategy(request));
    } else if (CACHE_PATTERNS.images.test(url.pathname)) {
        event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    } else if (CACHE_PATTERNS.static.test(url.pathname)) {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    } else {
        event.respondWith(staleWhileRevalidateStrategy(request));
    }
});

/**
 * Stratégie Cache First (Cache puis réseau)
 */
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Mise à jour en arrière-plan
            updateCacheInBackground(request, cache);
            return cachedResponse;
        }
        
        // Si pas en cache, aller chercher sur le réseau
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.warn('❌ Erreur Cache First:', error);
        
        // Retourner un fallback
        return getOfflineFallback(request);
    }
}

/**
 * Stratégie Network First (Réseau puis cache)
 */
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Mettre en cache la réponse
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.warn('⚠️ Réseau indisponible, utilisation du cache');
        
        // Fallback sur le cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Retourner un fallback générique
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'Fonctionnalité indisponible hors ligne'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stratégie Stale While Revalidate
 */
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Lancer la mise à jour en arrière-plan
    const updatePromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(error => {
        console.warn('⚠️ Mise à jour échouée:', error);
    });
    
    // Retourner immédiatement le cache s'il existe
    return cachedResponse || updatePromise;
}

/**
 * Mise à jour du cache en arrière-plan
 */
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse);
        }
    } catch (error) {
        console.warn('⚠️ Mise à jour background échouée:', error);
    }
}

/**
 * Fallback hors ligne
 */
function getOfflineFallback(request) {
    const url = new URL(request.url);
    
    // Images
    if (CACHE_PATTERNS.images.test(url.pathname)) {
        return new Response(createSVGPlaceholder(), {
            headers: { 'Content-Type': 'image/svg+xml' }
        });
    }
    
    // Pages HTML
    if (request.mode === 'navigate') {
        return new Response(createOfflinePage(), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    // Autres ressources
    return new Response('Ressource indisponible hors ligne', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

/**
 * Nettoyage des anciens caches
 */
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const validCacheNames = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
    
    return Promise.all(
        cacheNames.map(cacheName => {
            if (!validCacheNames.includes(cacheName)) {
                console.log('🗑️ Suppression ancien cache:', cacheName);
                return caches.delete(cacheName);
            }
        })
    );
}

/**
 * Préchargement des ressources populaires
 */
async function preloadPopularResources() {
    const popularResources = [
        '/static/images/icons/*.png',
        '/static/css/ifn_lazy.css',
        '/api/dashboard/stats'
    ];
    
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        
        // Préchargement avec timeout
        const requests = popularResources.map(url => 
            Promise.race([
                fetch(url),
                new Promise(resolve => setTimeout(resolve, 5000))
            ])
        );
        
        const responses = await Promise.allSettled(requests);
        
        responses.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.ok) {
                cache.put(popularResources[index], result.value);
            }
        });
        
        console.log('📋 Préchargement terminé');
        
    } catch (error) {
        console.warn('⚠️ Préchargement échoué:', error);
    }
}

/**
 * Création d'une page hors ligne
 */
function createOfflinePage() {
    return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hors ligne - IFN Portal</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #F77F00 0%, #E67300 100%);
                    color: white;
                    text-align: center;
                }
                .offline-container {
                    max-width: 400px;
                    padding: 2rem;
                }
                .icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h1 {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }
                p {
                    font-size: 1.1rem;
                    line-height: 1.5;
                    margin-bottom: 2rem;
                }
                .retry-btn {
                    background: white;
                    color: #F77F00;
                    border: none;
                    padding: 1rem 2rem;
                    font-size: 1rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .retry-btn:hover {
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="icon">📡</div>
                <h1>Connexion interrompue</h1>
                <p>Il semble que vous soyez hors ligne. Vérifiez votre connexion internet et réessayez.</p>
                <button class="retry-btn" onclick="window.location.reload()">
                    Réessayer
                </button>
            </div>
        </body>
        </html>
    `;
}

/**
 * Création d'un placeholder SVG pour images
 */
function createSVGPlaceholder() {
    return `
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-family="sans-serif" font-size="14">
                Image indisponible
            </text>
        </svg>
    `;
}

/**
 * Gestion des messages du client
 */
self.addEventListener('message', event => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'WARM_UP_CACHE':
            warmUpCache(payload.urls);
            break;
    }
});

/**
 * Obtention du statut des caches
 */
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        status[cacheName] = keys.length;
    }
    
    return status;
}

/**
 * Nettoyage de tous les caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
}

/**
 * Préchauffage du cache
 */
async function warmUpCache(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    const requests = urls.map(url => {
        return fetch(url).then(response => {
            if (response.ok) {
                cache.put(url, response);
                console.log('📋 Préchargé:', url);
            }
        }).catch(error => {
            console.warn('⚠️ Échec préchargement:', url, error);
        });
    });
    
    await Promise.allSettled(requests);
}

/**
 * Push notifications (si supporté)
 */
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nouvelle notification IFN',
        icon: '/static/images/icon-192.png',
        badge: '/static/images/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Voir',
                icon: '/static/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'Fermer',
                icon: '/static/images/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('IFN Portal', options)
    );
});

/**
 * Gestion des clics sur notifications
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('🔧 Service Worker chargé');