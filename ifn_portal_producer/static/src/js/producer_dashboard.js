/* ==========================================================================
   IFN Portal Producer - Dashboard JavaScript
   Gestion du tableau de bord producteur
   ========================================================================== */

odoo.define('ifn_portal_producer.dashboard', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var ProducerDashboard = publicWidget.Widget.extend({
        selector: '.producer-dashboard',
        init: function () {
            this._super.apply(this, arguments);
            this.kpiUpdateInterval = null;
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);

            // Initialiser les animations au chargement
            this._initializeAnimations();

            // Démarrer la mise à jour automatique des KPIs
            this._startKpiUpdates();

            // Gérer les états de connexion
            this._handleConnectivity();

            return this;
        },

        willStart: function () {
            return this._loadInitialData();
        },

        destroy: function () {
            this._stopKpiUpdates();
            this._super.apply(this, arguments);
        },

        /**
         * Charge les données initiales du dashboard
         */
        _loadInitialData: function () {
            var self = this;
            return rpc.query({
                route: '/portal/producer/api/dashboard/stats',
                params: {}
            }).then(function (data) {
                self._updateKpiDisplay(data);
            }).fail(function () {
                console.warn('Impossible de charger les KPIs initiaux');
            });
        },

        /**
         * Initialise les animations des éléments du dashboard
         */
        _initializeAnimations: function () {
            var self = this;

            // Animation des cartes KPIs
            this.$('.kpi-card').each(function (index) {
                var $card = $(this);
                setTimeout(function () {
                    $card.addClass('fade-in-up');
                }, index * 100);
            });

            // Animation des boutons d'action
            this.$('.action-btn').each(function (index) {
                var $btn = $(this);
                setTimeout(function () {
                    $btn.addClass('fade-in-up');
                }, (index + 4) * 100);
            });

            // Animation des cartes d'activités récentes
            this.$('.card').not('.kpi-card').each(function (index) {
                var $card = $(this);
                setTimeout(function () {
                    $card.addClass('fade-in-up');
                }, (index + 10) * 50);
            });

            // Effet de pulsation sur les éléments importants
            this._addPulseEffect();
        },

        /**
         * Ajoute un effet de pulsation sur les éléments importants
         */
        _addPulseEffect: function () {
            // Pulsation sur les nouveaux KPIs ou alertes
            this.$('.kpi-card').each(function () {
                var $card = $(this);
                var value = parseInt($card.find('.card-title').text());

                // Ajouter un effet si la valeur est significative
                if (value > 1000) {
                    $card.addClass('pulse');
                    setTimeout(function () {
                        $card.removeClass('pulse');
                    }, 3000);
                }
            });
        },

        /**
         * Démarre la mise à jour automatique des KPIs
         */
        _startKpiUpdates: function () {
            var self = this;
            this.kpiUpdateInterval = setInterval(function () {
                self._updateKpis();
            }, 30000); // Mise à jour toutes les 30 secondes
        },

        /**
         * Arrête la mise à jour automatique des KPIs
         */
        _stopKpiUpdates: function () {
            if (this.kpiUpdateInterval) {
                clearInterval(this.kpiUpdateInterval);
                this.kpiUpdateInterval = null;
            }
        },

        /**
         * Met à jour les KPIs via API
         */
        _updateKpis: function () {
            var self = this;

            // Vérifier la connectivité avant de faire l'appel
            if (!navigator.onLine) {
                return;
            }

            rpc.query({
                route: '/portal/producer/api/dashboard/stats',
                params: { last_update: this.lastKpiUpdate }
            }).then(function (data) {
                if (data && data.has_changes) {
                    self._updateKpiDisplay(data);
                    self._showNotification('Nouvelles données disponibles', 'info');
                }
            }).fail(function () {
                console.warn('Échec de la mise à jour des KPIs');
            });
        },

        /**
         * Met à jour l'affichage des KPIs avec les nouvelles données
         */
        _updateKpiDisplay: function (data) {
            var self = this;

            // Mettre à jour la production totale
            if (data.total_production !== undefined) {
                this._animateNumber(
                    this.$('.kpi-card').eq(0).find('.card-title'),
                    data.total_production,
                    'kg'
                );
            }

            // Mettre à jour le taux de vente
            if (data.sale_rate !== undefined) {
                this._animateNumber(
                    this.$('.kpi-card').eq(1).find('.card-title'),
                    data.sale_rate,
                    '%'
                );
            }

            // Mettre à jour le revenu cumulé
            if (data.total_revenue !== undefined) {
                this._animateNumber(
                    this.$('.kpi-card').eq(2).find('.card-title'),
                    data.total_revenue,
                    ' FCFA'
                );
            }

            // Mettre à jour le statut social
            if (data.social_status !== undefined) {
                this.$('.kpi-card').eq(3).find('.card-title').text(data.social_status);
            }

            this.lastKpiUpdate = new Date().toISOString();
        },

        /**
         * Anime un nombre avec un effet de compteur
         */
        _animateNumber: function ($element, targetValue, suffix) {
            var currentValue = parseInt($element.text().replace(/[^\d]/g, '')) || 0;
            var increment = (targetValue - currentValue) / 20;
            var current = currentValue;
            var step = 0;

            var animation = setInterval(function () {
                step++;
                current += increment;

                if (step >= 20) {
                    current = targetValue;
                    clearInterval(animation);
                }

                $element.text(Math.round(current).toLocaleString() + (suffix || ''));
            }, 30);
        },

        /**
         * Gère les états de connexion et le mode hors ligne
         */
        _handleConnectivity: function () {
            var self = this;

            // Écouter les changements de connexion
            window.addEventListener('online', function () {
                self._hideOfflineIndicator();
                self._showNotification('Connexion rétablie', 'success');
                self._startKpiUpdates();
            });

            window.addEventListener('offline', function () {
                self._showOfflineIndicator();
                self._showNotification('Mode hors ligne - Les données seront synchronisées ultérieurement', 'warning');
                self._stopKpiUpdates();
            });

            // État initial
            if (!navigator.onLine) {
                this._showOfflineIndicator();
            }
        },

        /**
         * Affiche l'indicateur hors ligne
         */
        _showOfflineIndicator: function () {
            if (!$('.offline-indicator').length) {
                $('<div class="offline-indicator">' +
                  '<i class="fa fa-wifi me-2"></i>Mode hors ligne' +
                  '</div>').appendTo('body');
            }
            $('.offline-indicator').addClass('show');
        },

        /**
         * Cache l'indicateur hors ligne
         */
        _hideOfflineIndicator: function () {
            $('.offline-indicator').removeClass('show');
            setTimeout(function () {
                $('.offline-indicator').remove();
            }, 300);
        },

        /**
         * Affiche une notification à l'utilisateur
         */
        _showNotification: function (message, type) {
            type = type || 'info';

            // Créer l'élément de notification
            var $notification = $('<div class="alert alert-' + type + ' alert-dismissible fade show position-fixed" style="top: 70px; right: 20px; z-index: 1050; min-width: 300px;">' +
                '<i class="fa fa-' + (type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle') + ' me-2"></i>' +
                message +
                '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>' +
                '</div>');

            // Ajouter à la page
            $('body').append($notification);

            // Auto-suppression après 5 secondes
            setTimeout(function () {
                $notification.alert('close');
            }, 5000);
        },

        /**
         * Gère le rafraîchissement manuel des données
         */
        _handleManualRefresh: function () {
            var self = this;
            this.$('.refresh-kpis-btn').on('click', function () {
                var $btn = $(this);
                $btn.prop('disabled', true)
                    .html('<i class="fa fa-spinner fa-spin me-2"></i>Actualisation...');

                self._updateKpis().always(function () {
                    setTimeout(function () {
                        $btn.prop('disabled', false)
                            .html('<i class="fa fa-sync-alt me-2"></i>Actualiser');
                    }, 1000);
                });
            });
        },

        /**
         * Initialise les interactions avec les boutons d'action
         */
        _initializeActionButtons: function () {
            var self = this;

            // Clics sur les boutons d'action avec tracking
            this.$('.action-btn').on('click', function () {
                var $btn = $(this);
                var action = $btn.text().trim();

                // Ajouter un effet visuel
                $btn.addClass('active');
                setTimeout(function () {
                    $btn.removeClass('active');
                }, 200);

                // Tracker l'action (pour analytics)
                self._trackAction('dashboard_action', {
                    action_type: action,
                    timestamp: new Date().toISOString()
                });
            });
        },

        /**
         * Tracker les actions utilisateur (pour analytics futur)
         */
        _trackAction: function (actionType, data) {
            // Pour l'instant, juste logger en console
            // Dans le futur, envoyer à un service d'analytics
            console.log('IFN Analytics:', actionType, data);

            // Stocker localement pour synchronisation ultérieure
            var actions = JSON.parse(localStorage.getItem('ifn_actions') || '[]');
            actions.push({
                type: actionType,
                data: data,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('ifn_actions', JSON.stringify(actions));
        }
    });

    // Enregistrer le widget
    publicWidget.registry.producer_dashboard = ProducerDashboard;

    return ProducerDashboard;
});