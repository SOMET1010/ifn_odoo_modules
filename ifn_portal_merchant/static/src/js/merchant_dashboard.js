/* IFN Portal Merchant Dashboard JavaScript */
/* ====================================== */

odoo.define('ifn_portal_merchant.dashboard', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var ajax = require('web.ajax');
    var rpc = require('web.rpc');

    var _t = core._t;

    var MerchantDashboard = publicWidget.Widget.extend({
        selector: '.ifn-merchant-dashboard',
        init: function () {
            this._super.apply(this, arguments);
            this.refreshInterval = 30000; // 30 seconds
            this.autoRefresh = null;
        },

        /**
         * Initialize dashboard
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initializeDashboard();
                self._bindEvents();
                self._startAutoRefresh();
                self._checkOfflineStatus();
            });
        },

        /**
         * Initialize dashboard components
         */
        _initializeDashboard: function () {
            this._loadKPIs();
            this._loadRecentSales();
            this._loadRecentPayments();
            this._initializeVoiceStats();
        },

        /**
         * Bind event handlers
         */
        _bindEvents: function () {
            var self = this;

            // Quick action buttons
            this.$('.quick-actions .btn').on('click', function (e) {
                self._trackQuickAction($(this).text().trim());
            });

            // KPI cards click
            this.$('.kpi-card').on('click', function () {
                self._handleKPIClick($(this));
            });

            // Refresh button
            this.$('#refresh-dashboard').on('click', function () {
                self._refreshDashboard();
            });

            // Online/offline status
            $(window).on('online offline', function () {
                self._updateConnectionStatus(navigator.onLine);
            });

            // Page visibility
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) {
                    self._stopAutoRefresh();
                } else {
                    self._startAutoRefresh();
                }
            });
        },

        /**
         * Load KPIs data
         */
        _loadKPIs: function () {
            var self = this;
            this._showLoading('.kpi-card');

            ajax.jsonRpc('/api/merchant/kpis', 'call', {})
                .then(function (data) {
                    if (data.success) {
                        self._updateKPIDisplay(data.kpis);
                    } else {
                        console.error('Failed to load KPIs:', data.error);
                        self._showKPIError();
                    }
                })
                .fail(function () {
                    console.error('Network error while loading KPIs');
                    self._showKPIError();
                })
                .always(function () {
                    self._hideLoading('.kpi-card');
                });
        },

        /**
         * Update KPI display
         */
        _updateKPIDisplay: function (kpis) {
            // Update revenue
            this.$('[data-kpi="revenue_today"]').text(this._formatCurrency(kpis.revenue_today));
            this.$('[data-kpi="revenue_week"]').text(this._formatCurrency(kpis.revenue_week));
            this.$('[data-kpi="revenue_month"]').text(this._formatCurrency(kpis.revenue_month));

            // Update stock alerts
            this.$('[data-kpi="stock_alerts"]').text(kpis.stock_alerts);
            if (kpis.stock_alerts > 0) {
                this.$('[data-kpi="stock_alerts"]').addClass('text-danger');
            }

            // Update social status
            this._updateSocialStatus(kpis.social_status);

            // Update voice usage
            this._updateVoiceStats(kpis.voice_operations_percent);
        },

        /**
         * Update social status display
         */
        _updateSocialStatus: function (socialStatus) {
            var statusElement = this.$('[data-kpi="social_status"]');
            var iconElement = statusElement.siblings('i');

            if (socialStatus.status === 'paid') {
                statusElement.removeClass('text-warning').addClass('text-success');
                statusElement.text(_t('À jour'));
                iconElement.removeClass('fa-clock').addClass('fa-check-circle');
            } else {
                statusElement.removeClass('text-success').addClass('text-warning');
                statusElement.text(_t('À payer'));
                iconElement.removeClass('fa-check-circle').addClass('fa-clock');
            }

            this.$('[data-kpi="social_due_date"]').text(socialStatus.due_date);
        },

        /**
         * Update voice statistics
         */
        _updateVoiceStats: function (percentage) {
            this.$('[data-kpi="voice_percentage"]').text(percentage.toFixed(1) + '%');

            // Update progress bar
            var progressBar = this.$('#voice-usage-progress');
            if (progressBar.length) {
                progressBar.css('width', percentage + '%');
                progressBar.attr('aria-valuenow', percentage);
            }
        },

        /**
         * Load recent sales
         */
        _loadRecentSales: function () {
            var self = this;
            var container = this.$('#recent-sales-container');

            ajax.jsonRpc('/api/merchant/recent_sales', 'call', {limit: 5})
                .then(function (data) {
                    if (data.success) {
                        self._renderRecentSales(data.sales);
                    } else {
                        self._showSalesError();
                    }
                })
                .fail(function () {
                    self._showSalesError();
                });
        },

        /**
         * Render recent sales
         */
        _renderRecentSales: function (sales) {
            var container = this.$('#recent-sales-container');
            container.empty();

            if (sales.length === 0) {
                container.append('<p class="text-muted">' + _t('Aucune vente récente') + '</p>');
                return;
            }

            var salesHtml = sales.map(function (sale) {
                return '<div class="list-group-item">' +
                    '<div class="d-flex justify-content-between align-items-center">' +
                    '<div>' +
                    '<strong>' + sale.product + '</strong><br>' +
                    '<small class="text-muted">' + sale.date + '</small>' +
                    '</div>' +
                    '<strong class="text-success">' + self._formatCurrency(sale.amount) + '</strong>' +
                    '</div>' +
                    '</div>';
            }).join('');

            container.append(salesHtml);
        },

        /**
         * Load recent payments
         */
        _loadRecentPayments: function () {
            var self = this;
            var container = this.$('#recent-payments-container');

            ajax.jsonRpc('/api/merchant/recent_payments', 'call', {limit: 5})
                .then(function (data) {
                    if (data.success) {
                        self._renderRecentPayments(data.payments);
                    } else {
                        self._showPaymentsError();
                    }
                })
                .fail(function () {
                    self._showPaymentsError();
                });
        },

        /**
         * Render recent payments
         */
        _renderRecentPayments: function (payments) {
            var container = this.$('#recent-payments-container');
            container.empty();

            if (payments.length === 0) {
                container.append('<p class="text-muted">' + _t('Aucun paiement récent') + '</p>');
                return;
            }

            var paymentsHtml = payments.map(function (payment) {
                var statusClass = payment.status === 'confirmed' ? 'bg-success' : 'bg-warning';
                return '<div class="list-group-item">' +
                    '<div class="d-flex justify-content-between align-items-center">' +
                    '<div>' +
                    '<span class="badge ' + statusClass + ' me-2">' + payment.method + '</span><br>' +
                    '<small class="text-muted">' + payment.date + '</small>' +
                    '</div>' +
                    '<strong>' + self._formatCurrency(payment.amount) + '</strong>' +
                    '</div>' +
                    '</div>';
            }).join('');

            container.append(paymentsHtml);
        },

        /**
         * Initialize voice statistics
         */
        _initializeVoiceStats: function () {
            // Initialize voice usage chart if needed
            this._initializeVoiceChart();
        },

        /**
         * Initialize voice usage chart
         */
        _initializeVoiceChart: function () {
            // This would initialize a chart library like Chart.js
            // For now, we'll just update the display
            var voicePercentage = parseFloat(this.$('[data-kpi="voice_percentage"]').text()) || 0;
            this._updateVoiceStats(voicePercentage);
        },

        /**
         * Handle KPI card click
         */
        _handleKPIClick: function (card) {
            var kpiType = card.data('kpi');

            switch (kpiType) {
                case 'stock_alerts':
                    window.location.href = '/portal/merchant/stock';
                    break;
                case 'social_status':
                    window.location.href = '/portal/merchant/social';
                    break;
                case 'revenue':
                    // Could open a detailed revenue modal
                    this._showRevenueDetails();
                    break;
            }
        },

        /**
         * Show revenue details modal
         */
        _showRevenueDetails: function () {
            // Implementation for revenue details modal
            console.log('Show revenue details');
        },

        /**
         * Track quick action usage
         */
        _trackQuickAction: function (action) {
            ajax.jsonRpc('/api/merchant/track_action', 'call', {
                action: action,
                page: 'dashboard'
            });
        },

        /**
         * Start auto refresh
         */
        _startAutoRefresh: function () {
            var self = this;
            if (this.autoRefresh) {
                return;
            }

            this.autoRefresh = setInterval(function () {
                if (navigator.onLine) {
                    self._refreshDashboard();
                }
            }, this.refreshInterval);
        },

        /**
         * Stop auto refresh
         */
        _stopAutoRefresh: function () {
            if (this.autoRefresh) {
                clearInterval(this.autoRefresh);
                this.autoRefresh = null;
            }
        },

        /**
         * Refresh dashboard data
         */
        _refreshDashboard: function () {
            this._loadKPIs();
            this._loadRecentSales();
            this._loadRecentPayments();
        },

        /**
         * Check offline status
         */
        _checkOfflineStatus: function () {
            if (!navigator.onLine) {
                this._showOfflineMessage();
            }

            // Check for pending offline operations
            this._checkPendingOperations();
        },

        /**
         * Check pending offline operations
         */
        _checkPendingOperations: function () {
            ajax.jsonRpc('/api/merchant/offline/pending_count', 'call', {})
                .then(function (data) {
                    if (data.success && data.count > 0) {
                        this._showPendingOperationsMessage(data.count);
                    }
                }.bind(this));
        },

        /**
         * Show offline message
         */
        _showOfflineMessage: function () {
            var message = _t('Vous êtes hors ligne. Les actions seront synchronisées dès que la connexion sera rétablie.');
            this._showNotification(message, 'warning');
        },

        /**
         * Show pending operations message
         */
        _showPendingOperationsMessage: function (count) {
            var message = _t('%d actions en attente de synchronisation.').replace('%d', count);
            this._showNotification(message, 'info');
        },

        /**
         * Update connection status
         */
        _updateConnectionStatus: function (isOnline) {
            if (isOnline) {
                this._hideOfflineMessage();
                this._syncOfflineOperations();
            } else {
                this._showOfflineMessage();
            }
        },

        /**
         * Sync offline operations
         */
        _syncOfflineOperations: function () {
            ajax.jsonRpc('/api/merchant/offline/sync', 'call', {})
                .then(function (data) {
                    if (data.success) {
                        this._refreshDashboard();
                        this._showNotification('Synchronisation réussie', 'success');
                    }
                }.bind(this));
        },

        /**
         * Show notification
         */
        _showNotification: function (message, type) {
            // Use Odoo's notification service or implement custom
            if (typeof odoo !== 'undefined' && odoo.notification) {
                odoo.notification[type](message);
            } else {
                console.log(type + ': ' + message);
            }
        },

        /**
         * Show loading state
         */
        _showLoading: function (selector) {
            this.$(selector).addClass('loading');
        },

        /**
         * Hide loading state
         */
        _hideLoading: function (selector) {
            this.$(selector).removeClass('loading');
        },

        /**
         * Show KPI error
         */
        _showKPIError: function () {
            this.$('.kpi-card').each(function () {
                $(this).addClass('error');
            });
        },

        /**
         * Show sales error
         */
        _showSalesError: function () {
            this.$('#recent-sales-container').html(
                '<p class="text-danger">' + _t('Erreur lors du chargement des ventes') + '</p>'
            );
        },

        /**
         * Show payments error
         */
        _showPaymentsError: function () {
            this.$('#recent-payments-container').html(
                '<p class="text-danger">' + _t('Erreur lors du chargement des paiements') + '</p>'
            );
        },

        /**
         * Format currency
         */
        _formatCurrency: function (amount) {
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF'
            }).format(amount).replace('XOF', 'F');
        },

        /**
         * Destroy widget
         */
        destroy: function () {
            this._stopAutoRefresh();
            this._super.apply(this, arguments);
        }
    });

    // Register widget
    publicWidget.registry.MerchantDashboard = MerchantDashboard;

    return {
        MerchantDashboard: MerchantDashboard
    };
});