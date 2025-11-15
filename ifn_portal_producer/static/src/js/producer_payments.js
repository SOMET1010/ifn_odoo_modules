/* ==========================================================================
   IFN Portal Producer - Payments Management JavaScript
   Gestion des paiements et transactions Mobile Money
   ========================================================================== */

odoo.define('ifn_portal_producer.payments', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var ProducerPayments = publicWidget.Widget.extend({
        selector: '.producer-payments-page',
        events: {
            'click .download-receipt-btn': '_onDownloadReceipt',
            'click .refresh-payments-btn': '_onRefreshPayments',
            'click .payment-details-btn': '_onShowPaymentDetails',
            'click .filter-payment-btn': '_onFilterPayments',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.paymentsData = [];
            this.mobilePaymentsData = [];
            this.currentFilter = 'all';
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);

            // Initialiser les graphiques et statistiques
            this._initializeCharts();

            // Charger les données de paiement
            this._loadPaymentsData();

            // Configurer les filtres
            this._setupFilters();

            // Gérer le mode hors ligne
            this._handleOfflineMode();

            return this;
        },

        /**
         * Initialise les graphiques de statistiques
         */
        _initializeCharts: function () {
            var self = this;

            // Graphique des revenus mensuels
            this._initializeRevenueChart();

            // Graphique des méthodes de paiement
            this._initializePaymentMethodsChart();

            // Animation des statistiques
            this._animateStatistics();
        },

        /**
         * Initialise le graphique des revenus
         */
        _initializeRevenueChart: function () {
            var ctx = document.getElementById('revenueChart');
            if (!ctx) return;

            var chartData = {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
                datasets: [{
                    label: 'Revenus (FCFA)',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#009739',
                    backgroundColor: 'rgba(0, 151, 57, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
                }]
            };

            // Charger les données réelles
            this._loadRevenueChartData(chartData);

            // Créer le graphique
            try {
                new Chart(ctx, {
                    type: 'line',
                    data: chartData,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.parsed.y.toLocaleString('fr-FR') + ' FCFA';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return value.toLocaleString('fr-FR') + ' FCFA';
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (e) {
                console.warn('Impossible d\'initialiser le graphique des revenus:', e);
            }
        },

        /**
         * Initialise le graphique des méthodes de paiement
         */
        _initializePaymentMethodsChart: function () {
            var ctx = document.getElementById('paymentMethodsChart');
            if (!ctx) return;

            var chartData = {
                labels: ['Mobile Money', 'Virement', 'Espèces'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#F77F00',
                        '#009739',
                        '#007BFF'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            };

            // Charger les données réelles
            this._loadPaymentMethodsChartData(chartData);

            // Créer le graphique
            try {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: chartData,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        var total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        var percentage = ((context.parsed / total) * 100).toFixed(1);
                                        return context.label + ': ' + percentage + '%';
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (e) {
                console.warn('Impossible d\'initialiser le graphique des méthodes de paiement:', e);
            }
        },

        /**
         * Anime les statistiques de paiement
         */
        _animateStatistics: function () {
            var self = this;

            // Animer le total reçu
            this._animateNumber($('.total-received'), 0, this._getTotalReceived(), 'FCFA');

            // Animer le montant en attente
            this._animateNumber($('.pending-amount'), 0, this._getPendingAmount(), 'FCFA');

            // Animer le montant du mois
            this._animateNumber($('.monthly-amount'), 0, this._getMonthlyAmount(), 'FCFA');
        },

        /**
         * Anime un compteur numérique
         */
        _animateNumber: function ($element, start, end, suffix) {
            if ($element.length === 0) return;

            var duration = 2000;
            var startTime = Date.now();

            function update() {
                var elapsed = Date.now() - startTime;
                var progress = Math.min(elapsed / duration, 1);

                // Fonction d'accélération
                var easeOutQuart = 1 - Math.pow(1 - progress, 4);
                var current = Math.round(start + (end - start) * easeOutQuart);

                $element.text(current.toLocaleString('fr-FR') + (suffix ? ' ' + suffix : ''));

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }

            update();
        },

        /**
         * Charge les données de paiement
         */
        _loadPaymentsData: function () {
            var self = this;

            // Afficher l'état de chargement
            this._showLoadingState();

            rpc.query({
                route: '/portal/producer/api/payments/list',
                params: {
                    filter: this.currentFilter
                }
            }).then(function (data) {
                self.paymentsData = data.payments || [];
                self.mobilePaymentsData = data.mobile_payments || [];

                // Mettre à jour l'interface
                self._updatePaymentsList();
                self._updateStatistics();
                self._updateCharts();

                // Cacher l'état de chargement
                self._hideLoadingState();
            }).fail(function () {
                self._showNotification('Erreur lors du chargement des paiements', 'error');
                self._hideLoadingState();
                self._loadOfflinePaymentsData();
            });
        },

        /**
         * Charge les données hors ligne
         */
        _loadOfflinePaymentsData: function () {
            var offlinePayments = JSON.parse(localStorage.getItem('ifn_offline_payments') || '[]');
            this.paymentsData = offlinePayments;
            this._updatePaymentsList();
            this._updateStatistics();
        },

        /**
         * Met à jour la liste des paiements
         */
        _updatePaymentsList: function () {
            var self = this;
            var $paymentsList = this.$('#paymentsList');

            if ($paymentsList.length === 0) return;

            // Vider la liste actuelle
            $paymentsList.empty();

            // Fusionner et trier les paiements
            var allPayments = this._mergeAndSortPayments();

            if (allPayments.length === 0) {
                $paymentsList.html(`
                    <div class="text-center py-5">
                        <i class="fa fa-credit-card fa-3x text-muted mb-3"></i>
                        <h5>Aucun paiement enregistré</h5>
                        <p class="text-muted">Vos paiements apparaîtront ici</p>
                    </div>
                `);
                return;
            }

            // Créer les éléments de la liste
            allPayments.forEach(function (payment) {
                var $paymentItem = self._createPaymentItem(payment);
                $paymentsList.append($paymentItem);
            });

            // Initialiser les tooltips
            $paymentsList.find('[data-bs-toggle="tooltip"]').tooltip();
        },

        /**
         * Fusionne et trie tous les paiements
         */
        _mergeAndSortPayments: function () {
            var allPayments = [];

            // Ajouter les paiements standards
            this.paymentsData.forEach(function (payment) {
                allPayments.push({
                    id: payment.id,
                    type: 'standard',
                    amount: payment.amount,
                    date: payment.date,
                    status: payment.state,
                    method: payment.journal_id ? payment.journal_id.name : 'Inconnu',
                    description: 'Paiement reçu',
                    raw_data: payment
                });
            });

            // Ajouter les paiements Mobile Money
            this.mobilePaymentsData.forEach(function (payment) {
                allPayments.push({
                    id: payment.id,
                    type: 'mobile_money',
                    amount: payment.amount,
                    date: payment.date,
                    status: payment.state,
                    method: payment.operator + ' Mobile Money',
                    description: payment.description || 'Paiement Mobile Money',
                    phone: payment.phone_number,
                    transaction_id: payment.transaction_id,
                    raw_data: payment
                });
            });

            // Trier par date (plus récent en premier)
            return allPayments.sort(function (a, b) {
                return new Date(b.date) - new Date(a.date);
            });
        },

        /**
         * Crée un élément de paiement pour la liste
         */
        _createPaymentItem: function (payment) {
            var statusClass = this._getStatusClass(payment.status);
            var statusIcon = this._getStatusIcon(payment.status);
            var methodIcon = this._getMethodIcon(payment.method);

            var $item = $(`
                <div class="list-group-item payment-item" data-payment-id="${payment.id}">
                    <div class="row align-items-center">
                        <div class="col-md-1 text-center">
                            <i class="fa ${methodIcon} fa-lg text-muted"></i>
                        </div>
                        <div class="col-md-4">
                            <h6 class="mb-1">${payment.description}</h6>
                            <small class="text-muted">
                                <i class="fa fa-calendar me-1"></i>${this._formatDate(payment.date)}
                                ${payment.phone ? '<br><i class="fa fa-phone me-1"></i>' + payment.phone : ''}
                                ${payment.transaction_id ? '<br><i class="fa fa-hashtag me-1"></i>' + payment.transaction_id : ''}
                            </small>
                        </div>
                        <div class="col-md-3 text-center">
                            <small class="text-muted">${payment.method}</small>
                        </div>
                        <div class="col-md-2 text-end">
                            <h5 class="mb-0 text-success">${payment.amount.toLocaleString('fr-FR')} FCFA</h5>
                        </div>
                        <div class="col-md-2 text-end">
                            <span class="badge ${statusClass}">
                                <i class="fa ${statusIcon} me-1"></i>${this._formatStatus(payment.status)}
                            </span>
                            <div class="btn-group mt-2" role="group">
                                <button class="btn btn-sm btn-outline-info payment-details-btn"
                                        data-payment-id="${payment.id}"
                                        data-payment-type="${payment.type}"
                                        data-bs-toggle="tooltip"
                                        title="Détails">
                                    <i class="fa fa-eye"></i>
                                </button>
                                ${payment.status === 'posted' ? `
                                <button class="btn btn-sm btn-outline-success download-receipt-btn"
                                        data-payment-id="${payment.id}"
                                        data-payment-type="${payment.type}"
                                        data-bs-toggle="tooltip"
                                        title="Télécharger reçu">
                                    <i class="fa fa-download"></i>
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `);

            return $item;
        },

        /**
         * Met à jour les statistiques de paiement
         */
        _updateStatistics: function () {
            var stats = this._calculateStatistics();

            // Mettre à jour les cartes de statistiques
            $('.total-received').text(stats.total_received.toLocaleString('fr-FR') + ' FCFA');
            $('.pending-amount').text(stats.pending_amount.toLocaleString('fr-FR') + ' FCFA');
            $('.monthly-amount').text(stats.monthly_amount.toLocaleString('fr-FR') + ' FCFA');

            // Mettre à jour les compteurs
            $('.total-transactions').text(stats.total_transactions);
            $('.success-rate').text(stats.success_rate + '%');
        },

        /**
         * Calcule les statistiques de paiement
         */
        _calculateStatistics: function () {
            var allPayments = this._mergeAndSortPayments();
            var now = new Date();
            var currentMonth = now.getMonth();
            var currentYear = now.getFullYear();

            var stats = {
                total_received: 0,
                pending_amount: 0,
                monthly_amount: 0,
                total_transactions: allPayments.length,
                successful_transactions: 0
            };

            allPayments.forEach(function (payment) {
                // Total reçu
                if (payment.status === 'posted' || payment.status === 'sent') {
                    stats.total_received += payment.amount;
                    stats.successful_transactions++;
                } else if (payment.status === 'pending' || payment.status === 'draft') {
                    stats.pending_amount += payment.amount;
                }

                // Montant du mois courant
                var paymentDate = new Date(payment.date);
                if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
                    if (payment.status === 'posted' || payment.status === 'sent') {
                        stats.monthly_amount += payment.amount;
                    }
                }
            });

            // Calculer le taux de succès
            stats.success_rate = stats.total_transactions > 0
                ? Math.round((stats.successful_transactions / stats.total_transactions) * 100)
                : 0;

            return stats;
        },

        /**
         * Configure les filtres de paiement
         */
        _setupFilters: function () {
            var self = this;

            this.$('.filter-payment-btn').on('click', function () {
                var $btn = $(this);
                var filter = $btn.data('filter');

                // Mettre à jour le filtre actif
                self.$('.filter-payment-btn').removeClass('active');
                $btn.addClass('active');

                // Appliquer le filtre
                self.currentFilter = filter;
                self._loadPaymentsData();
            });
        },

        /**
         * Gère le téléchargement d'un reçu
         */
        _onDownloadReceipt: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var paymentId = $btn.data('payment-id');
            var paymentType = $btn.data('payment-type');

            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin"></i>');

            var route = paymentType === 'mobile_money'
                ? '/portal/producer/api/mobile-payment/receipt'
                : '/portal/producer/api/payment/receipt';

            rpc.query({
                route: route,
                params: { payment_id: paymentId }
            }).then(function (result) {
                if (result.success && result.pdf_url) {
                    // Télécharger le PDF
                    var link = document.createElement('a');
                    link.href = result.pdf_url;
                    link.download = 'recu_paiement_' + paymentId + '.pdf';
                    link.click();

                    self._showNotification('Reçu téléchargé avec succès', 'success');
                } else {
                    self._showNotification('Impossible de télécharger le reçu', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion', 'error');
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-download"></i>');
            });
        },

        /**
         * Gère l'affichage des détails d'un paiement
         */
        _onShowPaymentDetails: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var paymentId = $btn.data('payment-id');
            var paymentType = $btn.data('payment-type');

            // Trouver les données du paiement
            var payment = this._findPaymentById(paymentId, paymentType);
            if (!payment) {
                self._showNotification('Paiement introuvable', 'error');
                return;
            }

            // Afficher le modal de détails
            this._showPaymentDetailsModal(payment);
        },

        /**
         * Affiche le modal des détails de paiement
         */
        _showPaymentDetailsModal: function (payment) {
            var self = this;

            // Créer le contenu du modal
            var modalContent = this._createPaymentDetailsModal(payment);

            // Ajouter le modal à la page
            if ($('#paymentDetailsModal').length === 0) {
                $('body').append(modalContent);
            } else {
                $('#paymentDetailsModal').replaceWith(modalContent);
            }

            // Afficher le modal
            var modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
            modal.show();
        },

        /**
         * Crée le modal des détails de paiement
         */
        _createPaymentDetailsModal: function (payment) {
            return `
                <div class="modal fade" id="paymentDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fa fa-credit-card me-2"></i>
                                    Détails du paiement
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Informations générales</h6>
                                        <table class="table table-sm">
                                            <tr>
                                                <td><strong>ID:</strong></td>
                                                <td>${payment.id}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Date:</strong></td>
                                                <td>${this._formatDate(payment.date)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Montant:</strong></td>
                                                <td class="fw-bold text-success">${payment.amount.toLocaleString('fr-FR')} FCFA</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Méthode:</strong></td>
                                                <td>${payment.method}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Statut:</strong></td>
                                                <td><span class="badge ${this._getStatusClass(payment.status)}">${this._formatStatus(payment.status)}</span></td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Informations complémentaires</h6>
                                        <table class="table table-sm">
                                            ${payment.phone ? `
                                            <tr>
                                                <td><strong>Téléphone:</strong></td>
                                                <td>${payment.phone}</td>
                                            </tr>` : ''}
                                            ${payment.transaction_id ? `
                                            <tr>
                                                <td><strong>Transaction:</strong></td>
                                                <td>${payment.transaction_id}</td>
                                            </tr>` : ''}
                                            <tr>
                                                <td><strong>Description:</strong></td>
                                                <td>${payment.description}</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                                ${payment.status === 'posted' ? `
                                <button type="button" class="btn btn-success" onclick="this.downloadReceipt('${payment.id}', '${payment.type}')">
                                    <i class="fa fa-download me-2"></i>Télécharger le reçu
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Gère le rafraîchissement des paiements
         */
        _onRefreshPayments: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin me-2"></i>Actualisation...');

            this._loadPaymentsData().always(function () {
                setTimeout(function () {
                    $btn.prop('disabled', false)
                        .html('<i class="fa fa-sync-alt me-2"></i>Actualiser');
                }, 1000);
            });
        },

        /**
         * Gère le filtrage des paiements
         */
        _onFilterPayments: function (ev) {
            ev.preventDefault();
            var $btn = $(ev.currentTarget);
            var filter = $btn.data('filter');

            // Mettre à jour le filtre actif
            this.$('.filter-payment-btn').removeClass('active');
            $btn.addClass('active');

            // Appliquer le filtre
            this.currentFilter = filter;
            this._loadPaymentsData();
        },

        /**
         * Gère le mode hors ligne
         */
        _handleOfflineMode: function () {
            var self = this;

            window.addEventListener('online', function () {
                self._showNotification('Connexion rétablie', 'success');
                self._loadPaymentsData();
            });

            window.addEventListener('offline', function () {
                self._showNotification('Mode hors ligne', 'warning');
            });
        },

        /**
         * Affiche l'état de chargement
         */
        _showLoadingState: function () {
            this.$('#paymentsList').html(`
                <div class="text-center py-5">
                    <i class="fa fa-spinner fa-spin fa-2x text-muted mb-3"></i>
                    <p>Chargement des paiements...</p>
                </div>
            `);
        },

        /**
         * Cache l'état de chargement
         */
        _hideLoadingState: function () {
            // Géré par _updatePaymentsList
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

        // Fonctions utilitaires
        _findPaymentById: function (id, type) {
            var payments = type === 'mobile_money' ? this.mobilePaymentsData : this.paymentsData;
            return payments.find(function (p) { return p.id == id; });
        },

        _getStatusClass: function (status) {
            var statusClasses = {
                'posted': 'bg-success',
                'sent': 'bg-info',
                'pending': 'bg-warning',
                'draft': 'bg-secondary',
                'cancelled': 'bg-danger'
            };
            return statusClasses[status] || 'bg-secondary';
        },

        _getStatusIcon: function (status) {
            var statusIcons = {
                'posted': 'fa-check-circle',
                'sent': 'fa-paper-plane',
                'pending': 'fa-clock',
                'draft': 'fa-edit',
                'cancelled': 'fa-times-circle'
            };
            return statusIcons[status] || 'fa-question-circle';
        },

        _getMethodIcon: function (method) {
            if (method.toLowerCase().includes('mobile') || method.toLowerCase().includes('mtn') || method.toLowerCase().includes('orange')) {
                return 'fa-mobile-alt';
            } else if (method.toLowerCase().includes('bank') || method.toLowerCase().includes('virement')) {
                return 'fa-university';
            } else if (method.toLowerCase().includes('cash') || method.toLowerCase().includes('espèce')) {
                return 'fa-money-bill';
            }
            return 'fa-credit-card';
        },

        _formatDate: function (dateString) {
            var date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        _formatStatus: function (status) {
            var statusLabels = {
                'posted': 'Reçu',
                'sent': 'Envoyé',
                'pending': 'En attente',
                'draft': 'Brouillon',
                'cancelled': 'Annulé'
            };
            return statusLabels[status] || status;
        },

        _getTotalReceived: function () {
            return this._calculateStatistics().total_received;
        },

        _getPendingAmount: function () {
            return this._calculateStatistics().pending_amount;
        },

        _getMonthlyAmount: function () {
            return this._calculateStatistics().monthly_amount;
        }
    });

    publicWidget.registry.producer_payments = ProducerPayments;

    return ProducerPayments;
});