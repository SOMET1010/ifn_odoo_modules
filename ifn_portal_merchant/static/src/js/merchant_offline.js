/* IFN Portal Merchant Offline JavaScript */
/* ======================================= */

odoo.define('ifn_portal_merchant.offline', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var ajax = require('web.ajax');

    var _t = core._t;

    var MerchantOffline = publicWidget.Widget.extend({
        selector: 'body', // Apply to all pages
        init: function () {
            this._super.apply(this, arguments);
            this.isOnline = navigator.onLine;
            this.syncInProgress = false;
            this.syncRetryCount = 0;
            this.maxSyncRetries = 3;
            this.offlineQueue = [];
            this.syncInterval = null;
        },

        /**
         * Initialize offline functionality
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initializeOfflineStorage();
                self._bindNetworkEvents();
                self._checkPendingOperations();
                self._initializeServiceWorker();
                self._startPeriodicSync();
            });
        },

        /**
         * Initialize offline storage
         */
        _initializeOfflineStorage: function () {
            // Check if localStorage is available
            if (typeof Storage !== 'undefined') {
                this._loadOfflineQueue();
            } else {
                console.warn('LocalStorage not available. Offline features will be limited.');
            }
        },

        /**
         * Bind network events
         */
        _bindNetworkEvents: function () {
            var self = this;

            // Listen for online/offline events
            window.addEventListener('online', function () {
                self._handleOnline();
            });

            window.addEventListener('offline', function () {
                self._handleOffline();
            });

            // Listen for page visibility changes
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden && navigator.onLine) {
                    self._attemptSync();
                }
            });
        },

        /**
         * Initialize service worker for PWA
         */
        _initializeServiceWorker: function () {
            var self = this;

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/ifn_portal_merchant/static/src/js/service-worker.js')
                    .then(function (registration) {
                        console.log('Service Worker registered:', registration);
                        self._listenForServiceWorkerMessages(registration);
                    })
                    .catch(function (error) {
                        console.error('Service Worker registration failed:', error);
                    });
            }
        },

        /**
         * Listen for service worker messages
         */
        _listenForServiceWorkerMessages: function (registration) {
            var self = this;

            if (registration.active) {
                navigator.serviceWorker.addEventListener('message', function (event) {
                    self._handleServiceWorkerMessage(event.data);
                });
            }
        },

        /**
         * Handle service worker message
         */
        _handleServiceWorkerMessage: function (data) {
            switch (data.type) {
                case 'SYNC_REQUEST':
                    this._attemptSync();
                    break;
                case 'QUEUE_UPDATE':
                    this._updateQueueDisplay(data.queueLength);
                    break;
            }
        },

        /**
         * Start periodic sync
         */
        _startPeriodicSync: function () {
            var self = this;

            // Sync every 5 minutes when online
            this.syncInterval = setInterval(function () {
                if (navigator.onLine && !self.syncInProgress) {
                    self._attemptSync();
                }
            }, 5 * 60 * 1000); // 5 minutes
        },

        /**
         * Handle online event
         */
        _handleOnline: function () {
            this.isOnline = true;
            this._hideOfflineIndicator();
            this._showOnlineNotification();
            this._attemptSync();
        },

        /**
         * Handle offline event
         */
        _handleOffline: function () {
            this.isOnline = false;
            this._showOfflineIndicator();
            this._showOfflineNotification();
        },

        /**
         * Check for pending operations
         */
        _checkPendingOperations: function () {
            this._loadOfflineQueue();
            if (this.offlineQueue.length > 0) {
                this._showPendingOperationsNotification();
                if (this.isOnline) {
                    this._attemptSync();
                }
            }
        },

        /**
         * Add operation to offline queue
         */
        addToQueue: function (operationType, data, options) {
            options = options || {};

            var operation = {
                id: this._generateOperationId(),
                type: operationType,
                data: data,
                timestamp: new Date().toISOString(),
                retryCount: 0,
                maxRetries: options.maxRetries || 3,
                idempotencyKey: options.idempotencyKey || this._generateIdempotencyKey(operationType, data)
            };

            // Check for duplicate operations
            if (this._isDuplicateOperation(operation)) {
                return Promise.resolve({success: false, error: 'Duplicate operation'});
            }

            this.offlineQueue.push(operation);
            this._saveOfflineQueue();
            this._updateQueueDisplay(this.offlineQueue.length);

            if (this.isOnline && !this.syncInProgress) {
                return this._attemptSync();
            } else {
                this._showQueuedNotification(operationType);
                return Promise.resolve({success: true, queued: true});
            }
        },

        /**
         * Attempt to sync offline queue
         */
        _attemptSync: function () {
            var self = this;

            if (!this.isOnline || this.syncInProgress || this.offlineQueue.length === 0) {
                return Promise.resolve();
            }

            this.syncInProgress = true;
            this._showSyncingNotification();

            return this._syncOperations()
                .then(function (results) {
                    self._handleSyncResults(results);
                })
                .catch(function (error) {
                    self._handleSyncError(error);
                })
                .finally(function () {
                    self.syncInProgress = false;
                });
        },

        /**
         * Sync operations with server
         */
        _syncOperations: function () {
            var self = this;
            var operations = this.offlineQueue.filter(function (op) {
                return op.retryCount < op.maxRetries;
            });

            if (operations.length === 0) {
                return Promise.resolve([]);
            }

            var syncPromises = operations.map(function (operation) {
                return self._syncOperation(operation);
            });

            return Promise.allSettled(syncPromises);
        },

        /**
         * Sync individual operation
         */
        _syncOperation: function (operation) {
            var self = this;

            var endpoint = this._getEndpointForOperation(operation.type);
            if (!endpoint) {
                return Promise.reject(new Error('Unknown operation type: ' + operation.type));
            }

            return ajax.jsonRpc(endpoint, 'call', operation.data)
                .then(function (result) {
                    if (result.success) {
                        self._removeOperationFromQueue(operation.id);
                        return {success: true, operation: operation, result: result};
                    } else {
                        self._markOperationFailed(operation, result.error);
                        return {success: false, operation: operation, error: result.error};
                    }
                })
                .catch(function (error) {
                    self._markOperationFailed(operation, error.message);
                    return {success: false, operation: operation, error: error.message};
                });
        },

        /**
         * Get endpoint for operation type
         */
        _getEndpointForOperation: function (operationType) {
            var endpoints = {
                'sale': '/api/merchant/sale/create',
                'stock_adjust': '/api/merchant/stock/adjust',
                'payment': '/api/merchant/payment/create',
                'purchase': '/api/merchant/purchase/create',
                'social_payment': '/api/merchant/social/payment'
            };

            return endpoints[operationType];
        },

        /**
         * Handle sync results
         */
        _handleSyncResults: function (results) {
            var successful = results.filter(function (r) {
                return r.status === 'fulfilled' && r.value.success;
            });

            var failed = results.filter(function (r) {
                return r.status === 'rejected' || !r.value.success;
            });

            if (successful.length > 0) {
                this._showSyncSuccessNotification(successful.length);
            }

            if (failed.length > 0) {
                this._showSyncErrorNotification(failed.length);
            }

            this._updateQueueDisplay(this.offlineQueue.length);
        },

        /**
         * Handle sync error
         */
        _handleSyncError: function (error) {
            console.error('Sync error:', error);
            this._showSyncErrorNotification(0);
            this.syncRetryCount++;

            if (this.syncRetryCount < this.maxSyncRetries) {
                // Retry after delay
                setTimeout(this._attemptSync.bind(this), this._getRetryDelay());
            } else {
                this.syncRetryCount = 0;
            }
        },

        /**
         * Mark operation as failed
         */
        _markOperationFailed: function (operation, error) {
            operation.retryCount++;
            operation.lastError = error;
            operation.lastAttempt = new Date().toISOString();

            if (operation.retryCount >= operation.maxRetries) {
                operation.status = 'failed';
            }

            this._saveOfflineQueue();
        },

        /**
         * Remove operation from queue
         */
        _removeOperationFromQueue: function (operationId) {
            this.offlineQueue = this.offlineQueue.filter(function (op) {
                return op.id !== operationId;
            });
            this._saveOfflineQueue();
        },

        /**
         * Load offline queue from storage
         */
        _loadOfflineQueue: function () {
            try {
                var stored = localStorage.getItem('merchant_offline_queue');
                if (stored) {
                    this.offlineQueue = JSON.parse(stored);
                }
            } catch (e) {
                console.error('Error loading offline queue:', e);
                this.offlineQueue = [];
            }
        },

        /**
         * Save offline queue to storage
         */
        _saveOfflineQueue: function () {
            try {
                localStorage.setItem('merchant_offline_queue', JSON.stringify(this.offlineQueue));
            } catch (e) {
                console.error('Error saving offline queue:', e);
            }
        },

        /**
         * Generate unique operation ID
         */
        _generateOperationId: function () {
            return 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        /**
         * Generate idempotency key
         */
        _generateIdempotencyKey: function (operationType, data) {
            var keyData = operationType + JSON.stringify(data);
            return btoa(keyData).substr(0, 32);
        },

        /**
         * Check if operation is duplicate
         */
        _isDuplicateOperation: function (operation) {
            return this.offlineQueue.some(function (op) {
                return op.idempotencyKey === operation.idempotencyKey &&
                       op.status !== 'failed';
            });
        },

        /**
         * Get retry delay with exponential backoff
         */
        _getRetryDelay: function () {
            return Math.min(1000 * Math.pow(2, this.syncRetryCount), 30000); // Max 30 seconds
        },

        /**
         * Show offline indicator
         */
        _showOfflineIndicator: function () {
            $('.offline-indicator').addClass('active');
            $('body').addClass('offline-mode');
        },

        /**
         * Hide offline indicator
         */
        _hideOfflineIndicator: function () {
            $('.offline-indicator').removeClass('active');
            $('body').removeClass('offline-mode');
        },

        /**
         * Update queue display
         */
        _updateQueueDisplay: function (queueLength) {
            var counter = $('.offline-queue-counter');
            if (counter.length) {
                if (queueLength > 0) {
                    counter.text(queueLength).show();
                } else {
                    counter.hide();
                }
            }

            // Update queue items display
            this._displayQueueItems();
        },

        /**
         * Display queue items
         */
        _displayQueueItems: function () {
            var container = $('#offline-queue-items');
            if (!container.length) {
                return;
            }

            if (this.offlineQueue.length === 0) {
                container.html('<p class="text-muted">' + _t('Aucune opération en attente') + '</p>');
                return;
            }

            var html = this.offlineQueue.map(function (op) {
                var statusClass = op.status === 'failed' ? 'text-danger' : 'text-warning';
                var statusText = op.status === 'failed' ? _t('Échoué') : _t('En attente');

                return '<div class="queue-item">' +
                    '<div class="d-flex justify-content-between align-items-center">' +
                    '<div>' +
                    '<strong>' + this._getOperationDisplayName(op.type) + '</strong><br>' +
                    '<small class="text-muted">' + new Date(op.timestamp).toLocaleString() + '</small>' +
                    '</div>' +
                    '<div class="text-end">' +
                    '<span class="' + statusClass + '">' + statusText + '</span><br>' +
                    '<small class="text-muted">Essai ' + op.retryCount + '/' + op.maxRetries + '</small>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }.bind(this)).join('');

            container.html(html);
        },

        /**
         * Get operation display name
         */
        _getOperationDisplayName: function (operationType) {
            var names = {
                'sale': _t('Vente'),
                'stock_adjust': _t('Ajustement de stock'),
                'payment': _t('Paiement'),
                'purchase': _t('Commande d\'achat'),
                'social_payment': _t('Paiement social')
            };

            return names[operationType] || operationType;
        },

        /**
         * Show notifications
         */
        _showOnlineNotification: function () {
            this._showNotification(_t('Connexion rétablie'), 'success');
        },

        _showOfflineNotification: function () {
            this._showNotification(_t('Vous êtes hors ligne. Les actions seront synchronisées automatiquement.'), 'warning');
        },

        _showQueuedNotification: function (operationType) {
            this._showNotification(_t('%s ajoutée à la file d\'attente').replace('%s', this._getOperationDisplayName(operationType)), 'info');
        },

        _showSyncingNotification: function () {
            this._showNotification(_t('Synchronisation en cours...'), 'info');
        },

        _showSyncSuccessNotification: function (count) {
            this._showNotification(_t('%d opérations synchronisées avec succès').replace('%d', count), 'success');
        },

        _showSyncErrorNotification: function (count) {
            this._showNotification(count > 0 ?
                _t('%d opérations n\'ont pas pu être synchronisées').replace('%d', count) :
                _t('Erreur de synchronisation'), 'error');
        },

        _showPendingOperationsNotification: function () {
            this._showNotification(_t('%d opérations en attente de synchronisation').replace('%d', this.offlineQueue.length), 'info');
        },

        /**
         * Show notification
         */
        _showNotification: function (message, type) {
            if (typeof odoo !== 'undefined' && odoo.notification) {
                odoo.notification[type](message);
            } else {
                console.log(type + ': ' + message);
            }
        },

        /**
         * Clear failed operations
         */
        clearFailedOperations: function () {
            this.offlineQueue = this.offlineQueue.filter(function (op) {
                return op.status !== 'failed';
            });
            this._saveOfflineQueue();
            this._updateQueueDisplay(this.offlineQueue.length);
        },

        /**
         * Retry failed operations
         */
        retryFailedOperations: function () {
            this.offlineQueue.forEach(function (op) {
                if (op.status === 'failed') {
                    op.status = 'pending';
                    op.retryCount = 0;
                    op.lastError = null;
                }
            });
            this._saveOfflineQueue();
            this._attemptSync();
        },

        /**
         * Destroy widget
         */
        destroy: function () {
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }
            this._super.apply(this, arguments);
        }
    });

    // Register widget
    publicWidget.registry.MerchantOffline = MerchantOffline;

    return {
        MerchantOffline: MerchantOffline
    };
});