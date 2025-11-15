/* ==========================================================================
   IFN Portal Producer - Offline Support JavaScript
   Gestion du mode hors ligne et synchronisation
   ========================================================================== */

odoo.define('ifn_portal_producer.offline', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var ProducerOffline = publicWidget.Widget.extend({
        selector: 'body', // S'applique à toute la page producteur
        init: function () {
            this._super.apply(this, arguments);
            this.isOnline = navigator.onLine;
            this.syncQueue = [];
            this.syncInProgress = false;
            this.offlineQueue = {
                harvests: [],
                offers: [],
                payments: [],
                profile_updates: [],
                social_payments: []
            };
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);

            // Initialiser la gestion hors ligne
            this._initializeOfflineSupport();

            // Écouter les événements de connexion
            this._setupConnectivityListeners();

            // Charger la file d'attente hors ligne
            this._loadOfflineQueue();

            // Synchroniser les données en attente si on est en ligne
            if (this.isOnline) {
                this._syncPendingData();
            }

            // Configurer le Service Worker pour PWA
            this._setupServiceWorker();

            return this;
        },

        /**
         * Initialise le support hors ligne
         */
        _initializeOfflineSupport: function () {
            var self = this;

            // Indicateur de connexion
            this._createConnectivityIndicator();

            // Gestionnaire de file d'attente
            this._initializeQueueManager();

            // Sauvegarde automatique des données
            this._setupAutoSave();

            // Gestion du cache
            this._initializeCache();
        },

        /**
         * Crée l'indicateur de connectivité
         */
        _createConnectivityIndicator: function () {
            var indicator = $(`
                <div class="connectivity-indicator" style="display: none;">
                    <div class="online-indicator bg-success text-white px-3 py-2">
                        <i class="fa fa-wifi me-2"></i>
                        <span>En ligne</span>
                    </div>
                    <div class="offline-indicator bg-warning text-dark px-3 py-2">
                        <i class="fa fa-wifi-slash me-2"></i>
                        <span>Mode hors ligne</span>
                    </div>
                </div>
            `);

            $('body').append(indicator);

            // Afficher le statut actuel
            this._updateConnectivityIndicator();
        },

        /**
         * Met à jour l'indicateur de connectivité
         */
        _updateConnectivityIndicator: function () {
            var $indicator = $('.connectivity-indicator');
            var $online = $indicator.find('.online-indicator');
            var $offline = $indicator.find('.offline-indicator');

            if (this.isOnline) {
                $offline.hide();
                $online.show().fadeIn(300);
            } else {
                $online.hide();
                $offline.show().fadeIn(300);
            }
        },

        /**
         * Configure les écouteurs d'événements de connectivité
         */
        _setupConnectivityListeners: function () {
            var self = this;

            window.addEventListener('online', function () {
                self._onConnectivityChange(true);
            });

            window.addEventListener('offline', function () {
                self._onConnectivityChange(false);
            });

            // Vérifier périodiquement la connectivité
            setInterval(function () {
                self._checkConnectivity();
            }, 30000); // Toutes les 30 secondes
        },

        /**
         * Gère le changement de connectivité
         */
        _onConnectivityChange: function (isOnline) {
            var self = this;
            var wasOffline = !this.isOnline;

            this.isOnline = isOnline;
            this._updateConnectivityIndicator();

            if (isOnline && wasOffline) {
                this._showNotification('Connexion rétablie', 'success');
                this._syncPendingData();
            } else if (!isOnline) {
                this._showNotification('Mode hors ligne - Les données seront synchronisées ultérieurement', 'warning');
                this._enableOfflineMode();
            }
        },

        /**
         * Vérifie la connectivité
         */
        _checkConnectivity: function () {
            var self = this;

            // Tenter de faire une requête simple pour vérifier la connexion
            rpc.query({
                route: '/portal/producer/api/ping',
                params: { timestamp: Date.now() }
            }).then(function () {
                if (!self.isOnline) {
                    self._onConnectivityChange(true);
                }
            }).catch(function () {
                if (self.isOnline) {
                    self._onConnectivityChange(false);
                }
            });
        },

        /**
         * Initialise le gestionnaire de file d'attente
         */
        _initializeQueueManager: function () {
            var self = this;

            // Intercepter les appels API pour les mettre en file d'attente si nécessaire
            this._interceptAPICalls();

            // Configurer la synchronisation automatique
            this._setupAutoSync();

            // Gestion des conflits de synchronisation
            this._setupConflictResolution();
        },

        /**
         * Intercepte les appels API pour la gestion hors ligne
         */
        _interceptAPICalls: function () {
            var self = this;

            // Surcharge des méthodes RPC pour la gestion hors ligne
            var originalQuery = rpc.query;
            rpc.query = function (params) {
                if (!self.isOnline && self._shouldQueueForOffline(params.route)) {
                    return self._queueOfflineRequest(params);
                }
                return originalQuery.call(this, params);
            };
        },

        /**
         * Détermine si une requête doit être mise en file d'attente hors ligne
         */
        _shouldQueueForOffline: function (route) {
            var offlineRoutes = [
                '/portal/producer/api/harvest/create',
                '/portal/producer/api/offer/publish',
                '/portal/producer/api/social/payment',
                '/portal/producer/api/profile/update'
            ];

            return offlineRoutes.some(function (offlineRoute) {
                return route.includes(offlineRoute);
            });
        },

        /**
         * Met en file d'attente une requête hors ligne
         */
        _queueOfflineRequest: function (params) {
            var deferred = $.Deferred();

            var queuedRequest = {
                id: this._generateRequestId(),
                route: params.route,
                params: params.params,
                timestamp: Date.now(),
                retries: 0,
                maxRetries: 3
            };

            // Ajouter à la file d'attente appropriée
            this._addToOfflineQueue(queuedRequest);

            // Retourner une promesse résolue avec des données simulées
            deferred.resolve({
                success: true,
                queued: true,
                temp_id: queuedRequest.id,
                message: 'Action enregistrée localement'
            });

            return deferred.promise();
        },

        /**
         * Ajoute une requête à la file d'attente hors ligne
         */
        _addToOfflineQueue: function (request) {
            var queueType = this._getQueueType(request.route);
            this.offlineQueue[queueType].push(request);
            this._saveOfflineQueue();
        },

        /**
         * Détermine le type de file d'attente pour une route
         */
        _getQueueType: function (route) {
            if (route.includes('harvest')) return 'harvests';
            if (route.includes('offer')) return 'offers';
            if (route.includes('payment')) return 'payments';
            if (route.includes('profile')) return 'profile_updates';
            if (route.includes('social')) return 'social_payments';
            return 'harvests'; // Default
        },

        /**
         * Charge la file d'attente hors ligne
         */
        _loadOfflineQueue: function () {
            try {
                var savedQueue = localStorage.getItem('ifn_offline_queue');
                if (savedQueue) {
                    this.offlineQueue = JSON.parse(savedQueue);
                }
            } catch (e) {
                console.warn('Erreur lors du chargement de la file d\'attente hors ligne:', e);
                this.offlineQueue = {
                    harvests: [],
                    offers: [],
                    payments: [],
                    profile_updates: [],
                    social_payments: []
                };
            }
        },

        /**
         * Sauvegarde la file d'attente hors ligne
         */
        _saveOfflineQueue: function () {
            try {
                localStorage.setItem('ifn_offline_queue', JSON.stringify(this.offlineQueue));
            } catch (e) {
                console.warn('Erreur lors de la sauvegarde de la file d\'attente hors ligne:', e);
                // Gérer le cas où le localStorage est plein
                this._cleanupOldOfflineData();
            }
        },

        /**
         * Nettoie les anciennes données hors ligne
         */
        _cleanupOldOfflineData: function () {
            var self = this;
            var cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 jours

            Object.keys(this.offlineQueue).forEach(function (queueType) {
                self.offlineQueue[queueType] = self.offlineQueue[queueType].filter(function (item) {
                    return item.timestamp > cutoffTime;
                });
            });

            this._saveOfflineQueue();
        },

        /**
         * Configure la synchronisation automatique
         */
        _setupAutoSync: function () {
            var self = this;

            // Synchroniser lors du retour en ligne
            window.addEventListener('online', function () {
                setTimeout(function () {
                    self._syncPendingData();
                }, 1000);
            });

            // Synchroniser périodiquement si on est en ligne
            setInterval(function () {
                if (self.isOnline && !self.syncInProgress) {
                    self._syncPendingData();
                }
            }, 60000); // Toutes les minutes
        },

        /**
         * Synchronise les données en attente
         */
        _syncPendingData: function () {
            var self = this;

            if (this.syncInProgress || !this.isOnline) {
                return;
            }

            this.syncInProgress = true;
            this._showSyncIndicator();

            var syncPromises = [];

            // Synchroniser chaque type de file d'attente
            Object.keys(this.offlineQueue).forEach(function (queueType) {
                if (self.offlineQueue[queueType].length > 0) {
                    syncPromises.push(self._syncQueue(queueType));
                }
            });

            // Attendre que toutes les synchronisations soient terminées
            Promise.allSettled(syncPromises).then(function (results) {
                self._handleSyncResults(results);
                self.syncInProgress = false;
                self._hideSyncIndicator();
            });
        },

        /**
         * Synchronise une file d'attente spécifique
         */
        _syncQueue: function (queueType) {
            var self = this;
            var deferred = $.Deferred();

            var queue = this.offlineQueue[queueType];
            if (queue.length === 0) {
                deferred.resolve({ queueType: queueType, synced: 0, failed: 0 });
                return deferred.promise();
            }

            var syncedCount = 0;
            var failedCount = 0;
            var syncPromises = [];

            queue.forEach(function (request, index) {
                var syncPromise = self._syncRequest(request, queueType, index);
                syncPromises.push(syncPromise);
            });

            Promise.allSettled(syncPromises).then(function (results) {
                results.forEach(function (result) {
                    if (result.status === 'fulfilled' && result.value.success) {
                        syncedCount++;
                    } else {
                        failedCount++;
                    }
                });

                // Supprimer les requêtes synchronisées avec succès
                self.offlineQueue[queueType] = queue.filter(function (request, index) {
                    var result = results[index];
                    return !(result.status === 'fulfilled' && result.value.success);
                });

                self._saveOfflineQueue();
                deferred.resolve({ queueType: queueType, synced: syncedCount, failed: failedCount });
            });

            return deferred.promise();
        },

        /**
         * Synchronise une requête individuelle
         */
        _syncRequest: function (request, queueType, index) {
            var self = this;
            var deferred = $.Deferred();

            // Utiliser la méthode RPC originale
            var originalQuery = rpc.query;
            originalQuery.call(rpc, {
                route: request.route,
                params: request.params
            }).then(function (result) {
                deferred.resolve({ success: true, result: result, request: request });
            }).catch(function (error) {
                request.retries++;
                if (request.retries < request.maxRetries) {
                    // Réessayer plus tard
                    deferred.resolve({ success: false, retry: true, request: request });
                } else {
                    // Abandonner après le nombre maximum de tentatives
                    deferred.resolve({ success: false, retry: false, request: request, error: error });
                }
            });

            return deferred.promise();
        },

        /**
         * Gère les résultats de synchronisation
         */
        _handleSyncResults: function (results) {
            var self = this;
            var totalSynced = 0;
            var totalFailed = 0;

            results.forEach(function (result) {
                if (result.status === 'fulfilled') {
                    totalSynced += result.value.synced;
                    totalFailed += result.value.failed;
                }
            });

            if (totalSynced > 0) {
                this._showNotification(`${totalSynced} élément(s) synchronisé(s) avec succès`, 'success');
            }

            if (totalFailed > 0) {
                this._showNotification(`${totalFailed} élément(s) n'ont pas pu être synchronisés`, 'warning');
            }

            // Mettre à jour l'interface
            this._refreshUIAfterSync();
        },

        /**
         * Configure la résolution de conflits
         */
        _setupConflictResolution: function () {
            var self = this;

            // Détecter les conflits lors de la synchronisation
            this._conflictDetector = {
                detect: function (localData, serverData) {
                    // Logique de détection de conflits
                    return false; // Pas de conflit par défaut
                },
                resolve: function (localData, serverData, strategy) {
                    // Stratégies de résolution: 'local_wins', 'server_wins', 'merge'
                    switch (strategy) {
                        case 'local_wins':
                            return localData;
                        case 'server_wins':
                            return serverData;
                        case 'merge':
                            return self._mergeData(localData, serverData);
                        default:
                            return serverData;
                    }
                }
            };
        },

        /**
         * Fusionne des données locales et serveur
         */
        _mergeData: function (localData, serverData) {
            // Logique de fusion simple - à adapter selon les besoins
            return {
                ...serverData,
                ...localData,
                merged_at: Date.now()
            };
        },

        /**
         * Configure la sauvegarde automatique
         */
        _setupAutoSave: function () {
            var self = this;

            // Sauvegarder automatiquement les formulaires
            this.$('form').on('input change', function () {
                self._autoSaveForm(this);
            });

            // Sauvegarder avant de quitter la page
            window.addEventListener('beforeunload', function () {
                self._saveCurrentState();
            });
        },

        /**
         * Sauvegarde automatiquement un formulaire
         */
        _autoSaveForm: function (form) {
            var $form = $(form);
            var formId = $form.attr('id') || $form.attr('class');
            var formData = $form.serialize();

            localStorage.setItem('ifn_autosave_' + formId, JSON.stringify({
                data: formData,
                timestamp: Date.now()
            }));
        },

        /**
         * Sauvegarde l'état actuel
         */
        _saveCurrentState: function () {
            // Sauvegarder la page actuelle
            localStorage.setItem('ifn_current_page', window.location.pathname);

            // Sauvegarder les données importantes
            this._saveOfflineQueue();
        },

        /**
         * Initialise le cache pour le mode hors ligne
         */
        _initializeCache: function () {
            var self = this;

            // Cache des données fréquemment utilisées
            this.cache = {
                profile: null,
                harvests: [],
                offers: [],
                lastUpdate: null
            };

            // Charger le cache existant
            this._loadCache();

            // Mettre à jour le cache périodiquement
            setInterval(function () {
                if (self.isOnline) {
                    self._updateCache();
                }
            }, 300000); // Toutes les 5 minutes
        },

        /**
         * Charge le cache existant
         */
        _loadCache: function () {
            try {
                var cachedData = localStorage.getItem('ifn_cache');
                if (cachedData) {
                    this.cache = JSON.parse(cachedData);
                }
            } catch (e) {
                console.warn('Erreur lors du chargement du cache:', e);
            }
        },

        /**
         * Met à jour le cache
         */
        _updateCache: function () {
            var self = this;

            // Mettre à jour les données du cache
            rpc.query({
                route: '/portal/producer/api/cache/update',
                params: { last_update: this.cache.lastUpdate }
            }).then(function (data) {
                self.cache = {
                    ...self.cache,
                    ...data,
                    lastUpdate: Date.now()
                };
                localStorage.setItem('ifn_cache', JSON.stringify(self.cache));
            }).catch(function () {
                // Erreur silencieuse - le cache sera mis à jour plus tard
            });
        },

        /**
         * Configure le Service Worker pour PWA
         */
        _setupServiceWorker: function () {
            var self = this;

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/ifn_portal_producer/static/sw.js')
                    .then(function (registration) {
                        console.log('Service Worker enregistré:', registration);
                    })
                    .catch(function (error) {
                        console.warn('Erreur d\'enregistrement du Service Worker:', error);
                    });
            }

            // Gérer les mises à jour du Service Worker
            navigator.serviceWorker.addEventListener('controllerchange', function () {
                self._showNotification('Mise à jour disponible. Actualisation...', 'info');
                window.location.reload();
            });
        },

        /**
         * Active le mode hors ligne
         */
        _enableOfflineMode: function () {
            // Désactiver les fonctionnalités nécessitant une connexion
            this.$('.online-only').prop('disabled', true).addClass('disabled');
            this.$('.offline-only').show();

            // Afficher les indicateurs hors ligne
            this._showOfflineIndicators();
        },

        /**
         * Désactive le mode hors ligne
         */
        _disableOfflineMode: function () {
            // Réactiver les fonctionnalités
            this.$('.online-only').prop('disabled', false).removeClass('disabled');
            this.$('.offline-only').hide();

            // Cacher les indicateurs hors ligne
            this._hideOfflineIndicators();
        },

        /**
         * Affiche les indicateurs hors ligne
         */
        _showOfflineIndicators: function () {
            this.$('.offline-badge').show();
        },

        /**
         * Cache les indicateurs hors ligne
         */
        _hideOfflineIndicators: function () {
            this.$('.offline-badge').hide();
        },

        /**
         * Affiche l'indicateur de synchronisation
         */
        _showSyncIndicator: function () {
            var $indicator = $('.sync-indicator');
            if ($indicator.length === 0) {
                $indicator = $(`
                    <div class="sync-indicator position-fixed top-0 start-50 translate-middle-x bg-info text-white px-3 py-2" style="z-index: 1060; display: none;">
                        <i class="fa fa-sync fa-spin me-2"></i>
                        <span>Synchronisation...</span>
                    </div>
                `);
                $('body').append($indicator);
            }
            $indicator.fadeIn(300);
        },

        /**
         * Cache l'indicateur de synchronisation
         */
        _hideSyncIndicator: function () {
            $('.sync-indicator').fadeOut(300);
        },

        /**
         * Rafraîchit l'interface après synchronisation
         */
        _refreshUIAfterSync: function () {
            // Recharger les données si nécessaire
            if (window.location.pathname.includes('/portal/producer/')) {
                // Éviter le rechargement complet, juste mettre à jour les données
                this._updatePageData();
            }
        },

        /**
         * Met à jour les données de la page
         */
        _updatePageData: function () {
            // Émettre un événement personnalisé pour que les widgets puissent se mettre à jour
            $(document).trigger('offline:sync-completed');
        },

        /**
         * Affiche une notification
         */
        _showNotification: function (message, type) {
            type = type || 'info';

            var $notification = $('<div class="alert alert-' + type + ' alert-dismissible fade show position-fixed" style="top: 70px; right: 20px; z-index: 1050; min-width: 300px;">' +
                '<i class="fa fa-' + (type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle') + ' me-2"></i>' +
                message +
                '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>' +
                '</div>');

            $('body').append($notification);

            setTimeout(function () {
                $notification.alert('close');
            }, 5000);
        },

        /**
         * Génère un ID de requête unique
         */
        _generateRequestId: function () {
            return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    });

    publicWidget.registry.producer_offline = ProducerOffline;

    return ProducerOffline;
});