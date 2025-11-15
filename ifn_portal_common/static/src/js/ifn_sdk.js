/* =============================================================================
   IFN Portal Common - SDK JavaScript
   Gestion offline, file d'attente, API et utilitaires
   ============================================================================= */

/**
 * SDK IFN pour les applications portail
 * Fournit un ensemble d'outils pour la gestion offline,
 * les appels API, les notifications et l'accessibilité
 */
odoo.define('ifn_portal_common.ifn_sdk', function (require) {
    'use strict';

    var core = require('web.core');
    var ajax = require('web.ajax');
    var Dialog = require('web.Dialog');
    var _t = core._t;

    // Espace de nom global IFN
    window.IFN = window.IFN || {};

    var IFNSDK = {
        // Configuration
        config: {
            apiBaseUrl: '/ifn/api',
            offlineQueueName: 'ifn_outbox',
            maxRetries: 3,
            retryDelay: 5000,
            toastDuration: 4000,
            enableAnalytics: true,
            enableVoice: false,
        },

        // État
        state: {
            isOnline: navigator.onLine,
            queue: [],
            processing: false,
            userPreferences: {},
            notifications: [],
            lastSync: null,
        },

        // Base de données IndexedDB pour la file d'attente
        db: null,

        /**
         * Initialise le SDK IFN
         */
        init: function (config) {
            console.log('[IFN SDK] Initialisation...');

            // Fusionner la configuration
            Object.assign(this.config, config || {});

            // Initialiser les composants
            this.initIndexedDB();
            this.initEventListeners();
            this.loadUserPreferences();
            this.setupAPIInterceptors();

            console.log('[IFN SDK] Initialisé avec succès');
        },

        /**
         * Initialise IndexedDB pour la file d'attente offline
         */
        initIndexedDB: function () {
            if (!window.indexedDB) {
                console.warn('[IFN SDK] IndexedDB non supporté');
                return;
            }

            var request = indexedDB.open('IFNPortalDB', 1);
            var self = this;

            request.onerror = function () {
                console.error('[IFN SDK] Erreur ouverture IndexedDB');
            };

            request.onsuccess = function (event) {
                self.db = event.target.result;
                console.log('[IFN SDK] IndexedDB initialisé');
                self.loadOfflineQueue();
            };

            request.onupgradeneeded = function (event) {
                var db = event.target.result;

                // Créer l'object store pour la file d'attente
                if (!db.objectStoreNames.contains(self.config.offlineQueueName)) {
                    var objectStore = db.createObjectStore(self.config.offlineQueueName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    objectStore.createIndex('method', 'method', { unique: false });
                    objectStore.createIndex('url', 'url', { unique: false });
                    objectStore.createIndex('created_at', 'created_at', { unique: false });
                }

                // Créer l'object store pour les préférences
                if (!db.objectStoreNames.contains('preferences')) {
                    var prefStore = db.createObjectStore('preferences', { keyPath: 'key' });
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
                self.replayQueue();
            });

            window.addEventListener('offline', function () {
                self.state.isOnline = false;
            });

            // Événements de cycle de vie
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden && self.state.isOnline) {
                    self.replayQueue();
                }
            });
        },

        /**
         * Configure les intercepteurs API
         */
        setupAPIInterceptors: function () {
            var self = this;
            var originalFetch = window.fetch;

            window.fetch = function (url, options) {
                options = options || {};

                // Ajouter les headers par défaut
                options.headers = Object.assign({
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-IFN-SDK': '1.0.0'
                }, options.headers || {});

                // Gérer les requêtes hors ligne
                if (!self.state.isOnline && self.shouldQueueRequest(options.method, url)) {
                    return self.queueRequest(url, options);
                }

                // Gérer les erreurs réseau
                return originalFetch(url, options).catch(function (error) {
                    if (self.shouldQueueRequest(options.method, url)) {
                        return self.queueRequest(url, options);
                    }
                    throw error;
                });
            };
        },

        /**
         * Détermine si une requête doit être mise en file d'attente
         */
        shouldQueueRequest: function (method, url) {
            if (!method || !url) return false;

            // Mettre en file d'attente les méthodes qui modifient les données
            var queueableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
            var isQueueableMethod = queueableMethods.includes(method.toUpperCase());

            // Mettre en file d'attente uniquement les requêtes API IFN
            var isAPIRequest = url.includes('/ifn/api/') || url.includes('/web/dataset/call_kw/');

            return isQueueableMethod && isAPIRequest;
        },

        /**
         * Met en file d'attente une requête hors ligne
         */
        queueRequest: function (url, options) {
            var self = this;
            var request = {
                url: url,
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body,
                created_at: new Date().toISOString(),
                retries: 0,
                id: Date.now() + Math.random()
            };

            console.log('[IFN SDK] Mise en file d\'attente:', request);

            if (this.db) {
                var transaction = this.db.transaction([this.config.offlineQueueName], 'readwrite');
                var objectStore = transaction.objectStore(this.config.offlineQueueName);
                var addRequest = objectStore.add(request);

                addRequest.onsuccess = function () {
                    self.showToast('Action enregistrée hors ligne', 'info', 'Hors ligne');
                };

                addRequest.onerror = function () {
                    console.error('[IFN SDK] Erreur mise en file d\'attente');
                };
            }

            // Retourner une promesse résolue pour ne pas bloquer l'interface
            return Promise.resolve({
                queued: true,
                id: request.id,
                message: 'Action mise en file d\'attente'
            });
        },

        /**
         * Charge la file d'attente hors ligne
         */
        loadOfflineQueue: function () {
            if (!this.db) return;

            var self = this;
            var transaction = this.db.transaction([this.config.offlineQueueName], 'readonly');
            var objectStore = transaction.objectStore(this.config.offlineQueueName);
            var request = objectStore.getAll();

            request.onsuccess = function (event) {
                self.state.queue = event.target.result;
                console.log('[IFN SDK] File d\'attente chargée:', self.state.queue.length, 'éléments');
            };
        },

        /**
         * Rejoue la file d'attente hors ligne
         */
        replayQueue: function () {
            if (!this.state.isOnline || this.state.processing || !this.db) {
                return;
            }

            var self = this;
            this.state.processing = true;

            var transaction = this.db.transaction([this.config.offlineQueueName], 'readonly');
            var objectStore = transaction.objectStore(this.config.offlineQueueName);
            var request = objectStore.getAll();

            request.onsuccess = function (event) {
                var queue = event.target.result;
                if (queue.length === 0) {
                    self.state.processing = false;
                    return;
                }

                console.log('[IFN SDK] Rejeu de', queue.length, 'actions hors ligne');
                self.showToast('Synchronisation des actions...', 'info', 'Synchronisation');

                self.processQueueItem(queue, 0);
            };
        },

        /**
         * Traite un élément de la file d'attente
         */
        processQueueItem: function (queue, index) {
            var self = this;

            if (index >= queue.length) {
                self.state.processing = false;
                self.showToast('Synchronisation terminée', 'success', 'Terminé');
                self.state.lastSync = new Date();
                return;
            }

            var item = queue[index];
            var originalFetch = window.fetch;

            originalFetch(item.url, {
                method: item.method,
                headers: item.headers,
                body: item.body
            }).then(function (response) {
                if (response.ok) {
                    self.removeQueueItem(item.id);
                    self.processQueueItem(queue, index + 1);
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            }).catch(function (error) {
                console.error('[IFN SDK] Erreur rejeu:', error);
                self.handleQueueError(item, queue, index);
            });
        },

        /**
         * Gère les erreurs de la file d'attente
         */
        handleQueueError: function (item, queue, index) {
            var self = this;

            if (item.retries >= this.config.maxRetries) {
                console.error('[IFN SDK] Échec après', this.config.maxRetries, 'tentatives');
                self.showToast('Erreur de synchronisation', 'error', 'Erreur');
                self.state.processing = false;
                return;
            }

            // Incrémenter le compteur de tentatives
            item.retries++;
            this.updateQueueItem(item);

            // Retenter après un délai
            setTimeout(function () {
                self.processQueueItem(queue, index);
            }, this.config.retryDelay);
        },

        /**
         * Met à jour un élément de la file d'attente
         */
        updateQueueItem: function (item) {
            if (!this.db) return;

            var transaction = this.db.transaction([this.config.offlineQueueName], 'readwrite');
            var objectStore = transaction.objectStore(this.config.offlineQueueName);
            objectStore.put(item);
        },

        /**
         * Supprime un élément de la file d'attente
         */
        removeQueueItem: function (id) {
            if (!this.db) return;

            var transaction = this.db.transaction([this.config.offlineQueueName], 'readwrite');
            var objectStore = transaction.objectStore(this.config.offlineQueueName);
            objectStore.delete(id);
        },

        /**
         * API simplifiée pour les appels serveur
         */
        api: function (endpoint, options) {
            options = options || {};
            var url = this.config.apiBaseUrl + endpoint;

            var defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            var finalOptions = Object.assign(defaultOptions, options);

            if (finalOptions.body && typeof finalOptions.body === 'object') {
                finalOptions.body = JSON.stringify(finalOptions.body);
            }

            return fetch(url, finalOptions)
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.json();
                });
        },

        /**
         * Charge les préférences utilisateur
         */
        loadUserPreferences: function () {
            var self = this;

            this.api('/prefs').then(function (preferences) {
                self.state.userPreferences = preferences;
                self.applyPreferences(preferences);
            }).catch(function () {
                // Préférences par défaut
                var defaultPrefs = {
                    language: 'fr_FR',
                    high_contrast: false,
                    font_size: 'normal',
                    voice_enabled: false
                };
                self.state.userPreferences = defaultPrefs;
                self.applyPreferences(defaultPrefs);
            });
        },

        /**
         * Applique les préférences utilisateur
         */
        applyPreferences: function (preferences) {
            var body = document.body;

            // Langue
            if (preferences.language) {
                body.setAttribute('lang', preferences.language);
            }

            // Contraste élevé
            if (preferences.high_contrast) {
                body.classList.add('high-contrast');
            } else {
                body.classList.remove('high-contrast');
            }

            // Taille de police
            body.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
            if (preferences.font_size) {
                body.classList.add('font-size-' + preferences.font_size);
            }

            // Voice
            this.config.enableVoice = preferences.voice_enabled || false;
        },

        /**
         * Met à jour les préférences utilisateur
         */
        updatePreferences: function (preferences) {
            var self = this;
            return this.api('/prefs', {
                method: 'POST',
                body: preferences
            }).then(function (response) {
                Object.assign(self.state.userPreferences, preferences);
                self.applyPreferences(preferences);
                self.showToast('Préférences mises à jour', 'success', 'Succès');
                return response;
            });
        },

        /**
         * Affiche un toast de notification
         */
        showToast: function (message, type, title) {
            var toast = this.createToast(message, type, title);
            var container = this.getToastContainer();
            container.appendChild(toast);

            // Animation d'entrée
            setTimeout(function () {
                toast.classList.add('ifn-toast--show');
            }, 100);

            // Auto-suppression
            setTimeout(function () {
                this.removeToast(toast);
            }.bind(this), this.config.toastDuration);
        },

        /**
         * Crée un élément toast
         */
        createToast: function (message, type, title) {
            var toast = document.createElement('div');
            toast.className = 'ifn-toast ifn-toast-' + (type || 'info');
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');

            var iconClasses = {
                success: 'fa fa-check-circle',
                error: 'fa fa-exclamation-circle',
                warning: 'fa fa-exclamation-triangle',
                info: 'fa fa-info-circle'
            };

            toast.innerHTML = `
                <div class="ifn-toast-icon">
                    <i class="${iconClasses[type] || iconClasses.info}"></i>
                </div>
                <div class="ifn-toast-content">
                    ${title ? '<div class="ifn-toast-title">' + title + '</div>' : ''}
                    <div class="ifn-toast-message">${message}</div>
                </div>
                <button type="button" class="ifn-toast-close" aria-label="Fermer">
                    <i class="fa fa-times"></i>
                </button>
            `;

            // Événement de fermeture
            toast.querySelector('.ifn-toast-close').addEventListener('click', function () {
                this.removeToast(toast);
            }.bind(this));

            return toast;
        },

        /**
         * Récupère le conteneur de toasts
         */
        getToastContainer: function () {
            var container = document.getElementById('ifn-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'ifn-toast-container';
                container.className = 'ifn-toast-container';
                container.setAttribute('aria-live', 'polite');
                document.body.appendChild(container);
            }
            return container;
        },

        /**
         * Supprime un toast
         */
        removeToast: function (toast) {
            if (!toast || !toast.parentNode) return;

            toast.classList.remove('ifn-toast--show');
            setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        },

        /**
         * Gestionnaire de voix (si activé)
         */
        speak: function (text, options) {
            if (!this.config.enableVoice || !window.speechSynthesis) {
                return;
            }

            options = options || {};
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = options.lang || 'fr-FR';
            utterance.rate = options.rate || 1;
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || 1;

            window.speechSynthesis.speak(utterance);
        },

        /**
         * Arrête la lecture vocale
         */
        stopSpeaking: function () {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        },

        /**
         * Tracking analytics (si activé)
         */
        track: function (event, payload) {
            if (!this.config.enableAnalytics) return;

            var data = {
                event: event,
                payload: payload || {},
                timestamp: new Date().toISOString(),
                url: window.location.href,
                user_agent: navigator.userAgent
            };

            this.api('/analytics/track', {
                method: 'POST',
                body: data
            }).catch(function (error) {
                console.warn('[IFN SDK] Erreur tracking:', error);
            });
        },

        /**
         * Fonctions utilitaires
         */
        utils: {
            formaterDate: function (date) {
                return new Date(date).toLocaleDateString('fr-FR');
            },

            formaterMonnaie: function (montant, devise) {
                devise = devise || 'XOF';
                return new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: devise === 'XOF' ? 'XOF' : 'EUR'
                }).format(montant);
            },

            formaterNombre: function (nombre) {
                return new Intl.NumberFormat('fr-FR').format(nombre);
            },

            genererUID: function () {
                return Date.now().toString(36) + Math.random().toString(36).substr(2);
            },

            validerEmail: function (email) {
                var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return re.test(email);
            },

            validerTelephone: function (tel) {
                var re = /^\+?[\d\s-]{10,}$/;
                return re.test(tel);
            },

            debounce: function (func, wait) {
                var timeout;
                return function executedFunction() {
                    var context = this;
                    var args = arguments;
                    var later = function () {
                        timeout = null;
                        func.apply(context, args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            },

            throttle: function (func, limit) {
                var inThrottle;
                return function () {
                    var args = arguments;
                    var context = this;
                    if (!inThrottle) {
                        func.apply(context, args);
                        inThrottle = true;
                        setTimeout(function () { inThrottle = false; }, limit);
                    }
                };
            }
        }
    };

    // Initialisation automatique
    $(document).ready(function () {
        // Attendre que les autres modules soient chargés
        setTimeout(function () {
            IFNSDK.init();

            // Exposer les fonctions globales
            window.IFN.showToast = function (message, type, title) {
                IFNSDK.showToast(message, type, title);
            };

            window.IFN.track = function (event, payload) {
                IFNSDK.track(event, payload);
            };

            window.IFN.api = function (endpoint, options) {
                return IFNSDK.api(endpoint, options);
            };

            window.IFN.updatePreferences = function (preferences) {
                return IFNSDK.updatePreferences(preferences);
            };

            window.IFN.replayQueue = function () {
                IFNSDK.replayQueue();
            };

            window.IFN.speak = function (text, options) {
                IFNSDK.speak(text, options);
            };

            // Tracking de page vue
            IFNSDK.track('page_view', {
                page: window.location.pathname,
                title: document.title
            });
        }, 500);
    });

    return IFNSDK;
});