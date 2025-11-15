/* =============================================================================
   IFN Portal Common - File d'attente offline
   Gestion avancée des actions hors ligne avec IndexedDB
   ============================================================================= */

/**
 * Gestionnaire spécialisé pour la file d'attente offline
 * Fournit des fonctionnalités avancées de synchronisation
 */
odoo.define('ifn_portal_common.ifn_offline_queue', function (require) {
    'use strict';

    var core = require('web.core');
    var ajax = require('web.ajax');
    var _t = core._t;

    var OfflineQueue = {
        // Configuration
        config: {
            dbName: 'IFNPortalOfflineQueue',
            dbVersion: 1,
            storeName: 'ifn_outbox',
            maxQueueSize: 1000,
            maxRetries: 5,
            retryDelays: [5000, 15000, 60000, 300000, 900000], // Délais exponentiels
            batchSize: 5,
            syncInterval: 30000, // 30 secondes
            priorityLevels: ['low', 'normal', 'high', 'critical']
        },

        // État
        state: {
            isOnline: navigator.onLine,
            isProcessing: false,
            queueStats: {
                total: 0,
                pending: 0,
                failed: 0,
                completed: 0
            },
            lastSyncAttempt: null,
            lastSuccessfulSync: null,
            syncInProgress: false
        },

        // Base de données IndexedDB
        db: null,

        // Sync interval
        syncTimer: null,

        /**
         * Initialise la file d'attente offline
         */
        init: function (config) {
            console.log('[IFN Offline Queue] Initialisation...');

            // Fusionner la configuration
            Object.assign(this.config, config || {});

            // Initialiser les composants
            this.initDatabase();
            this.initEventListeners();
            this.startSyncTimer();
            this.updateQueueStats();

            console.log('[IFN Offline Queue] Initialisé avec succès');
        },

        /**
         * Initialise la base de données IndexedDB
         */
        initDatabase: function () {
            var self = this;
            var request = indexedDB.open(this.config.dbName, this.config.dbVersion);

            request.onerror = function () {
                console.error('[IFN Offline Queue] Erreur ouverture base de données');
            };

            request.onsuccess = function (event) {
                self.db = event.target.result;
                console.log('[IFN Offline Queue] Base de données initialisée');
                self.updateQueueStats();
                self.cleanupOldItems();
            };

            request.onupgradeneeded = function (event) {
                var db = event.target.result;

                // Créer l'object store principal
                if (!db.objectStoreNames.contains(self.config.storeName)) {
                    var store = db.createObjectStore(self.config.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Index pour les requêtes optimisées
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('priority', 'priority', { unique: false });
                    store.createIndex('created_at', 'created_at', { unique: false });
                    store.createIndex('retry_count', 'retry_count', { unique: false });
                    store.createIndex('endpoint', 'endpoint', { unique: false });
                }

                // Créer l'object store pour les logs de synchronisation
                if (!db.objectStoreNames.contains('sync_logs')) {
                    var logStore = db.createObjectStore('sync_logs', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                    logStore.createIndex('status', 'status', { unique: false });
                }
            };
        },

        /**
         * Configure les écouteurs d'événements
         */
        initEventListeners: function () {
            var self = this;

            // Événements de connexion
            window.addEventListener('online', function () {
                self.state.isOnline = true;
                self.syncNow();
            });

            window.addEventListener('offline', function () {
                self.state.isOnline = false;
            });

            // Événements de visibilité de page
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden && self.state.isOnline) {
                    self.syncNow();
                }
            });

            // Événements de focus
            window.addEventListener('focus', function () {
                if (self.state.isOnline) {
                    self.syncNow();
                }
            });
        },

        /**
         * Démarre le timer de synchronisation
         */
        startSyncTimer: function () {
            var self = this;
            this.syncTimer = setInterval(function () {
                if (self.state.isOnline && !self.state.syncInProgress) {
                    self.syncNow();
                }
            }, this.config.syncInterval);
        },

        /**
         * Arrête le timer de synchronisation
         */
        stopSyncTimer: function () {
            if (this.syncTimer) {
                clearInterval(this.syncTimer);
                this.syncTimer = null;
            }
        },

        /**
         * Ajoute une action à la file d'attente
         */
        addItem: function (item) {
            var self = this;

            // Valider l'item
            if (!this.validateItem(item)) {
                return Promise.reject(new Error('Item invalide'));
            }

            // Créer l'item avec les métadonnées
            var queueItem = {
                id: item.id || this.generateId(),
                method: item.method || 'POST',
                url: item.url,
                headers: item.headers || {},
                body: item.body,
                endpoint: this.extractEndpoint(item.url),
                priority: item.priority || 'normal',
                status: 'pending',
                retry_count: 0,
                max_retries: item.max_retries || this.config.maxRetries,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_retry: null,
                next_retry: null,
                metadata: item.metadata || {},
                context: item.context || {}
            };

            return new Promise(function (resolve, reject) {
                if (!self.db) {
                    reject(new Error('Base de données non initialisée'));
                    return;
                }

                var transaction = self.db.transaction([self.config.storeName], 'readwrite');
                var store = transaction.objectStore(self.config.storeName);
                var request = store.add(queueItem);

                request.onsuccess = function () {
                    self.updateQueueStats();
                    self.logSyncEvent('item_added', { item_id: queueItem.id, endpoint: queueItem.endpoint });
                    resolve(queueItem);
                };

                request.onerror = function () {
                    reject(new Error('Erreur ajout item'));
                };
            });
        },

        /**
         * Valide un item avant ajout
         */
        validateItem: function (item) {
            if (!item || typeof item !== 'object') {
                return false;
            }

            if (!item.url || typeof item.url !== 'string') {
                return false;
            }

            if (!item.method || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(item.method.toUpperCase())) {
                return false;
            }

            if (item.priority && !this.config.priorityLevels.includes(item.priority)) {
                return false;
            }

            return true;
        },

        /**
         * Extrait l'endpoint d'une URL
         */
        extractEndpoint: function (url) {
            try {
                var urlObj = new URL(url);
                return urlObj.pathname + urlObj.search;
            } catch (e) {
                return url;
            }
        },

        /**
         * Génère un ID unique
         */
        generateId: function () {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        },

        /**
         * Synchronise maintenant
         */
        syncNow: function () {
            if (this.state.syncInProgress || !this.state.isOnline || !this.db) {
                return;
            }

            var self = this;
            this.state.syncInProgress = true;
            this.state.lastSyncAttempt = new Date();

            this.logSyncEvent('sync_started');

            this.getPendingItems().then(function (items) {
                if (items.length === 0) {
                    self.state.syncInProgress = false;
                    self.logSyncEvent('sync_completed_empty');
                    return;
                }

                console.log('[IFN Offline Queue] Synchronisation de', items.length, 'items');
                self.processBatch(items, 0);
            }).catch(function (error) {
                console.error('[IFN Offline Queue] Erreur synchronisation:', error);
                self.state.syncInProgress = false;
                self.logSyncEvent('sync_error', { error: error.message });
            });
        },

        /**
         * Récupère les items en attente
         */
        getPendingItems: function () {
            var self = this;
            return new Promise(function (resolve, reject) {
                if (!self.db) {
                    reject(new Error('Base de données non initialisée'));
                    return;
                }

                var transaction = self.db.transaction([self.config.storeName], 'readonly');
                var store = transaction.objectStore(self.config.storeName);
                var index = store.index('status');
                var request = index.getAll('pending');

                request.onsuccess = function () {
                    var items = request.result;
                    // Trier par priorité et date de création
                    items.sort(function (a, b) {
                        var priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
                        var priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                        if (priorityDiff !== 0) return priorityDiff;
                        return new Date(a.created_at) - new Date(b.created_at);
                    });
                    resolve(items.slice(0, self.config.batchSize));
                };

                request.onerror = function () {
                    reject(new Error('Erreur récupération items'));
                };
            });
        },

        /**
         * Traite un batch d'items
         */
        processBatch: function (items, index) {
            var self = this;

            if (index >= items.length) {
                this.state.syncInProgress = false;
                this.state.lastSuccessfulSync = new Date();
                this.updateQueueStats();
                this.logSyncEvent('sync_completed', { items_processed: items.length });
                return;
            }

            var item = items[index];
            this.processItem(item).then(function (success) {
                if (success) {
                    self.processBatch(items, index + 1);
                } else {
                    // Échec du traitement, arrêter le batch
                    self.state.syncInProgress = false;
                    self.updateQueueStats();
                }
            }).catch(function (error) {
                console.error('[IFN Offline Queue] Erreur traitement item:', error);
                self.processBatch(items, index + 1);
            });
        },

        /**
         * Traite un item individuel
         */
        processItem: function (item) {
            var self = this;
            return new Promise(function (resolve) {
                var originalFetch = window.fetch;

                originalFetch(item.url, {
                    method: item.method,
                    headers: item.headers,
                    body: item.body
                }).then(function (response) {
                    if (response.ok) {
                        self.markItemCompleted(item.id).then(function () {
                            self.logSyncEvent('item_completed', { item_id: item.id, endpoint: item.endpoint });
                            resolve(true);
                        });
                    } else {
                        throw new Error('HTTP ' + response.status);
                    }
                }).catch(function (error) {
                    console.error('[IFN Offline Queue] Erreur item:', item.id, error);
                    self.handleItemError(item, error).then(function (shouldContinue) {
                        resolve(shouldContinue);
                    });
                });
            });
        },

        /**
         * Marque un item comme complété
         */
        markItemCompleted: function (itemId) {
            var self = this;
            return new Promise(function (resolve, reject) {
                if (!self.db) {
                    reject(new Error('Base de données non initialisée'));
                    return;
                }

                var transaction = self.db.transaction([self.config.storeName], 'readwrite');
                var store = transaction.objectStore(self.config.storeName);
                var getRequest = store.get(itemId);

                getRequest.onsuccess = function () {
                    var item = getRequest.result;
                    if (item) {
                        item.status = 'completed';
                        item.updated_at = new Date().toISOString();
                        item.completed_at = new Date().toISOString();

                        var updateRequest = store.put(item);
                        updateRequest.onsuccess = function () {
                            self.updateQueueStats();
                            resolve();
                        };
                        updateRequest.onerror = function () {
                            reject(new Error('Erreur mise à jour item'));
                        };
                    } else {
                        reject(new Error('Item non trouvé'));
                    }
                };

                getRequest.onerror = function () {
                    reject(new Error('Erreur récupération item'));
                };
            });
        },

        /**
         * Gère les erreurs de traitement d'item
         */
        handleItemError: function (item, error) {
            var self = this;
            return new Promise(function (resolve) {
                item.retry_count++;
                item.last_retry = new Date().toISOString();

                if (item.retry_count >= item.max_retries) {
                    // Marquer comme échoué
                    item.status = 'failed';
                    item.failed_at = new Date().toISOString();
                    item.error_message = error.message;

                    self.updateItem(item).then(function () {
                        self.logSyncEvent('item_failed', {
                            item_id: item.id,
                            endpoint: item.endpoint,
                            retry_count: item.retry_count
                        });
                        resolve(false); // Ne pas continuer
                    });
                } else {
                    // Programmer une nouvelle tentative
                    var retryDelay = self.config.retryDelays[Math.min(item.retry_count - 1, self.config.retryDelays.length - 1)];
                    item.next_retry = new Date(Date.now() + retryDelay).toISOString();

                    self.updateItem(item).then(function () {
                        self.logSyncEvent('item_retry_scheduled', {
                            item_id: item.id,
                            endpoint: item.endpoint,
                            retry_count: item.retry_count,
                            next_retry: item.next_retry
                        });
                        resolve(true); // Continuer avec les autres items
                    });
                }
            });
        },

        /**
         * Met à jour un item
         */
        updateItem: function (item) {
            var self = this;
            return new Promise(function (resolve, reject) {
                if (!self.db) {
                    reject(new Error('Base de données non initialisée'));
                    return;
                }

                var transaction = self.db.transaction([self.config.storeName], 'readwrite');
                var store = transaction.objectStore(self.config.storeName);
                var request = store.put(item);

                request.onsuccess = function () {
                    self.updateQueueStats();
                    resolve();
                };

                request.onerror = function () {
                    reject(new Error('Erreur mise à jour item'));
                };
            });
        },

        /**
         * Met à jour les statistiques de la file d'attente
         */
        updateQueueStats: function () {
            var self = this;
            if (!this.db) return;

            var transaction = this.db.transaction([this.config.storeName], 'readonly');
            var store = transaction.objectStore(this.config.storeName);
            var request = store.getAll();

            request.onsuccess = function () {
                var items = request.result;
                self.state.queueStats = {
                    total: items.length,
                    pending: items.filter(i => i.status === 'pending').length,
                    failed: items.filter(i => i.status === 'failed').length,
                    completed: items.filter(i => i.status === 'completed').length
                };

                // Émettre un événement pour l'UI
                var event = new CustomEvent('ifn:queue_stats_updated', {
                    detail: self.state.queueStats
                });
                window.dispatchEvent(event);
            };
        },

        /**
         * Nettoie les anciens items complétés
         */
        cleanupOldItems: function () {
            var self = this;
            if (!this.db) return;

            var cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours
            var transaction = self.db.transaction([self.config.storeName], 'readwrite');
            var store = transaction.objectStore(self.config.storeName);
            var index = store.index('status');
            var request = index.openCursor(IDBKeyRange.only('completed'));

            request.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor) {
                    var item = cursor.value;
                    var completedDate = new Date(item.completed_at);
                    if (completedDate < cutoffDate) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
        },

        /**
         * Enregistre un événement de synchronisation
         */
        logSyncEvent: function (eventType, data) {
            var self = this;
            if (!this.db) return;

            var logEntry = {
                event_type: eventType,
                timestamp: new Date().toISOString(),
                data: data || {},
                queue_stats: self.state.queueStats
            };

            var transaction = this.db.transaction(['sync_logs'], 'readwrite');
            var store = transaction.objectStore('sync_logs');
            store.add(logEntry);
        },

        /**
         * Récupère les statistiques
         */
        getStats: function () {
            return {
                ...this.state.queueStats,
                isOnline: this.state.isOnline,
                isProcessing: this.state.syncInProgress,
                lastSyncAttempt: this.state.lastSyncAttempt,
                lastSuccessfulSync: this.state.lastSuccessfulSync
            };
        },

        /**
         * Vide la file d'attente
         */
        clearQueue: function () {
            var self = this;
            return new Promise(function (resolve, reject) {
                if (!self.db) {
                    reject(new Error('Base de données non initialisée'));
                    return;
                }

                var transaction = self.db.transaction([self.config.storeName], 'readwrite');
                var store = transaction.objectStore(self.config.storeName);
                var request = store.clear();

                request.onsuccess = function () {
                    self.updateQueueStats();
                    self.logSyncEvent('queue_cleared');
                    resolve();
                };

                request.onerror = function () {
                    reject(new Error('Erreur vidage file d\'attente'));
                };
            });
        },

        /**
         * Réessaie les items échoués
         */
        retryFailedItems: function () {
            var self = this;
            return new Promise(function (resolve, reject) {
                if (!self.db) {
                    reject(new Error('Base de données non initialisée'));
                    return;
                }

                var transaction = self.db.transaction([self.config.storeName], 'readwrite');
                var store = transaction.objectStore(self.config.storeName);
                var index = store.index('status');
                var request = index.openCursor(IDBKeyRange.only('failed'));

                var count = 0;
                request.onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        var item = cursor.value;
                        item.status = 'pending';
                        item.retry_count = 0;
                        item.next_retry = null;
                        item.updated_at = new Date().toISOString();

                        cursor.update(item);
                        count++;
                        cursor.continue();
                    } else {
                        if (count > 0) {
                            self.updateQueueStats();
                            self.logSyncEvent('failed_items_retried', { count: count });
                            self.syncNow();
                        }
                        resolve(count);
                    }
                };

                request.onerror = function () {
                    reject(new Error('Erreur réessai items échoués'));
                };
            });
        }
    };

    // Initialisation automatique
    $(document).ready(function () {
        // Attendre que le SDK principal soit chargé
        setTimeout(function () {
            if (window.IFN && window.IFN.config) {
                OfflineQueue.init();

                // Exposer les fonctions
                window.IFN.queue = {
                    add: function (item) { return OfflineQueue.addItem(item); },
                    sync: function () { OfflineQueue.syncNow(); },
                    getStats: function () { return OfflineQueue.getStats(); },
                    clear: function () { return OfflineQueue.clearQueue(); },
                    retryFailed: function () { return OfflineQueue.retryFailedItems(); }
                };
            }
        }, 1000);
    });

    return OfflineQueue;
});