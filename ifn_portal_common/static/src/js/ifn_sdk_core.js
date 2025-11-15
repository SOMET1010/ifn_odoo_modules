/* =============================================================================
   IFN Portal Common - Core SDK (Simplified Version)
   ============================================================================= */

/**
 * SDK IFN simplifié pour éviter les erreurs de dépendances
 * Ce fichier initialise l'espace de nom IFN et les fonctionnalités de base
 */
odoo.define('ifn_portal_common.ifn_sdk_core', ['web.core', 'web.ajax'], function (require) {
    'use strict';

    var core = require('web.core');
    var ajax = require('web.ajax');
    var _t = core._t;

    // Espace de nom global IFN
    window.IFN = window.IFN || {};

    var IFNSDK = {
        // Configuration de base
        config: {
            apiBaseUrl: '/ifn/api',
            toastDuration: 4000,
            enableAnalytics: true,
            enableVoice: false,
        },

        // État de base
        state: {
            isOnline: navigator.onLine,
            userPreferences: {},
            notifications: [],
            lastSync: null,
        },

        /**
         * Initialise le SDK IFN
         */
        init: function (config) {
            console.log('[IFN SDK] Initialisation...');
            Object.assign(this.config, config || {});
            this.initEventListeners();
            this.loadUserPreferences();
            this.setupAPIInterceptors();
            console.log('[IFN SDK] Initialisé avec succès');
        },

        /**
         * Initialise les écouteurs d'événements
         */
        initEventListeners: function () {
            var self = this;

            window.addEventListener('online', function () {
                self.state.isOnline = true;
                self.showToast('Connexion rétablie', 'success', 'En ligne');
            });

            window.addEventListener('offline', function () {
                self.state.isOnline = false;
                self.showToast('Vous êtes hors ligne', 'warning', 'Hors ligne');
            });

            document.addEventListener('visibilitychange', function () {
                if (!document.hidden && self.state.isOnline) {
                    self.syncIfNeeded();
                }
            });
        },

        /**
         * Configure les intercepteurs API
         */
        setupAPIInterceptors: function () {
            var self = this;
            // Pour l'instant, on utilise les appels fetch standards
        },

        /**
         * Charge les préférences utilisateur
         */
        loadUserPreferences: function () {
            var self = this;

            // Utiliser ajax.jsonRpc au lieu de fetch
            ajax.jsonRpc('/ifn_portal_common/get_user_preferences', 'call', {})
                .then(function (preferences) {
                    self.state.userPreferences = preferences;
                    self.applyPreferences(preferences);
                })
                .catch(function () {
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

            if (preferences.language) {
                body.setAttribute('lang', preferences.language);
            }

            if (preferences.high_contrast) {
                body.classList.add('high-contrast');
            } else {
                body.classList.remove('high-contrast');
            }

            body.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
            if (preferences.font_size) {
                body.classList.add('font-size-' + preferences.font_size);
            }

            this.config.enableVoice = preferences.voice_enabled || false;
        },

        /**
         * Appel API simplifié
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
         * Met à jour les préférences utilisateur
         */
        updatePreferences: function (preferences) {
            var self = this;

            return ajax.jsonRpc('/ifn_portal_common/update_preferences', 'call', {
                preferences: preferences
            }).then(function (response) {
                Object.assign(self.state.userPreferences, preferences);
                self.applyPreferences(preferences);
                self.showToast('Préférences mises à jour', 'success', 'Succès');
                return response;
            });
        },

        /**
         * Affiche un toast
         */
        showToast: function (message, type, title) {
            var toast = this.createToast(message, type, title);
            var container = this.getToastContainer();
            container.appendChild(toast);

            setTimeout(function () {
                toast.classList.add('ifn-toast--show');
            }, 100);

            setTimeout(function () {
                this.removeToast(toast);
            }.bind(this), this.config.toastDuration);
        },

        /**
         * Crée un toast
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

            var self = this;
            toast.querySelector('.ifn-toast-close').addEventListener('click', function () {
                self.removeToast(toast);
            });

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
         * Synchronisation si nécessaire
         */
        syncIfNeeded: function () {
            // Implémentation simplifiée
            if (this.state.isOnline) {
                this.state.lastSync = new Date();
            }
        },

        /**
         * Suivi analytics
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
         * Synthèse vocale
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
         * Arrête la synthèse vocale
         */
        stopSpeaking: function () {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        }
    };

    // Exposition globale
    window.IFN = IFNSDK;

    return IFNSDK;
});