/* IFN Portal Merchant Payments JavaScript */
/* ======================================== */

odoo.define('ifn_portal_merchant.payments', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var ajax = require('web.ajax');

    var _t = core._t;

    var MerchantPayments = publicWidget.Widget.extend({
        selector: '.ifn-merchant-payments',
        events: {
            'click #init-momo-payment': '_onInitMobileMoneyPayment',
            'click #record-cash-payment': '_onRecordCashPayment',
            'click #record-credit-payment': '_onRecordCreditPayment',
            'click .btn-download-receipt': '_onDownloadReceipt',
            'click .btn-view-payment-details': '_onViewPaymentDetails',
            'submit #payment-form': '_onPaymentFormSubmit',
            'click .btn-check-payment-status': '_onCheckPaymentStatus',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.activeTransaction = null;
            this.paymentHistory = [];
            this.pollingInterval = null;
        },

        /**
         * Initialize payments page
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initializePaymentMethods();
                self._loadPaymentHistory();
                self._loadPaymentStats();
                self._checkPendingTransactions();
                self._initializeMobileMoneyProviders();
            });
        },

        /**
         * Initialize payment methods
         */
        _initializePaymentMethods: function () {
            // Setup payment method cards
            this._setupPaymentMethodCards();

            // Initialize payment forms
            this._initializePaymentForms();
        },

        /**
         * Setup payment method cards
         */
        _setupPaymentMethodCards: function () {
            var self = this;

            this.$('.payment-method-card').on('click', function () {
                self._selectPaymentMethod($(this));
            });
        },

        /**
         * Initialize payment forms
         */
        _initializePaymentForms: function () {
            // Setup form validation
            this._setupFormValidation();

            // Setup phone number formatting
            this._setupPhoneFormatting();
        },

        /**
         * Load payment history
         */
        _loadPaymentHistory: function () {
            var self = this;

            this._showLoading('#payment-history');

            ajax.jsonRpc('/api/merchant/payments/history', 'call', {
                limit: 20
            }).then(function (data) {
                if (data.success) {
                    self.paymentHistory = data.payments;
                    self._renderPaymentHistory();
                } else {
                    self._showPaymentError(data.error);
                }
            }).always(function () {
                self._hideLoading('#payment-history');
            });
        },

        /**
         * Load payment statistics
         */
        _loadPaymentStats: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/payments/stats', 'call', {})
                .then(function (data) {
                    if (data.success) {
                        self._updatePaymentStats(data.stats);
                    }
                });
        },

        /**
         * Check pending transactions
         */
        _checkPendingTransactions: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/payments/pending', 'call', {})
                .then(function (data) {
                    if (data.success && data.pending.length > 0) {
                        self._showPendingTransactions(data.pending);
                        self._startTransactionPolling();
                    }
                });
        },

        /**
         * Initialize Mobile Money providers
         */
        _initializeMobileMoneyProviders: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/payments/providers', 'call', {})
                .then(function (data) {
                    if (data.success) {
                        self._displayMobileMoneyProviders(data.providers);
                    }
                });
        },

        /**
         * Display Mobile Money providers
         */
        _displayMobileMoneyProviders: function (providers) {
            var container = this.$('#momo-providers');
            if (!container.length) {
                return;
            }

            var html = providers.map(function (provider) {
                return '<div class="col-md-4 mb-3">' +
                    '<div class="card provider-card" data-provider="' + provider.code + '">' +
                    '<div class="card-body text-center">' +
                    '<div class="provider-logo mb-2">' +
                    '<i class="fa fa-mobile-alt fa-2x"></i>' +
                    '</div>' +
                    '<h6>' + provider.name + '</h6>' +
                    '<small class="text-muted">' + (provider.description || '') + '</small>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }).join('');

            container.html(html);

            // Setup provider selection
            container.find('.provider-card').on('click', function () {
                self._selectMobileMoneyProvider($(this).data('provider'));
            });
        },

        /**
         * Render payment history
         */
        _renderPaymentHistory: function () {
            var self = this;
            var container = this.$('#payment-history-container');

            if (!container.length) {
                return;
            }

            if (this.paymentHistory.length === 0) {
                container.html('<div class="text-center text-muted py-4">' +
                    '<i class="fa fa-credit-card fa-2x mb-3"></i><br>' +
                    _t('Aucun paiement récent') +
                    '</div>');
                return;
            }

            var html = this.paymentHistory.map(function (payment) {
                var statusBadge = self._getPaymentStatusBadge(payment);
                var methodBadge = self._getPaymentMethodBadge(payment);

                return '<div class="card mb-2">' +
                    '<div class="card-body">' +
                    '<div class="row align-items-center">' +
                    '<div class="col-md-2">' +
                    methodBadge +
                    '</div>' +
                    '<div class="col-md-3">' +
                    '<strong>' + self._formatCurrency(payment.amount) + '</strong><br>' +
                    '<small class="text-muted">' + new Date(payment.date).toLocaleString() + '</small>' +
                    '</div>' +
                    '<div class="col-md-3">' +
                    '<span class="text-muted">' + (payment.customer_name || _t('Client')) + '</span>' +
                    '</div>' +
                    '<div class="col-md-2">' +
                    statusBadge +
                    '</div>' +
                    '<div class="col-md-2 text-end">' +
                    '<button class="btn btn-sm btn-outline-primary btn-download-receipt" data-payment-id="' + payment.id + '">' +
                    '<i class="fa fa-download"></i> ' + _t('Reçu') +
                    '</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }).join('');

            container.html(html);
        },

        /**
         * Get payment status badge
         */
        _getPaymentStatusBadge: function (payment) {
            var statusClass, statusText;

            switch (payment.status) {
                case 'confirmed':
                    statusClass = 'bg-success';
                    statusText = _t('Confirmé');
                    break;
                case 'pending':
                    statusClass = 'bg-warning';
                    statusText = _t('En attente');
                    break;
                case 'failed':
                    statusClass = 'bg-danger';
                    statusText = _t('Échoué');
                    break;
                case 'cancelled':
                    statusClass = 'bg-secondary';
                    statusText = _t('Annulé');
                    break;
                default:
                    statusClass = 'bg-secondary';
                    statusText = payment.status;
            }

            return '<span class="badge ' + statusClass + '">' + statusText + '</span>';
        },

        /**
         * Get payment method badge
         */
        _getPaymentMethodBadge: function (payment) {
            var methodIcons = {
                'mobile_money': 'fa-mobile-alt',
                'cash': 'fa-money-bill',
                'credit': 'fa-credit-card',
                'bank_transfer': 'fa-university'
            };

            var icon = methodIcons[payment.method] || 'fa-money-bill';
            var methodName = this._getPaymentMethodName(payment.method);

            return '<span class="badge bg-info">' +
                '<i class="fa ' + icon + ' me-1"></i>' +
                methodName +
                '</span>';
        },

        /**
         * Get payment method name
         */
        _getPaymentMethodName: function (method) {
            var names = {
                'mobile_money': _t('Mobile Money'),
                'cash': _t('Espèces'),
                'credit': _t('Crédit'),
                'bank_transfer': _t('Virement bancaire')
            };

            return names[method] || method;
        },

        /**
         * Update payment statistics
         */
        _updatePaymentStats: function (stats) {
            this.$('#total-payments').text(this._formatCurrency(stats.total));
            this.$('#today-payments').text(this._formatCurrency(stats.today));
            this.$('#week-payments').text(this._formatCurrency(stats.week));
            this.$('#month-payments').text(this._formatCurrency(stats.month));

            // Update chart if exists
            this._updatePaymentChart(stats);
        },

        /**
         * Update payment chart
         */
        _updatePaymentChart: function (stats) {
            // Implementation for payment chart using Chart.js or similar
            console.log('Payment stats:', stats);
        },

        /**
         * Show pending transactions
         */
        _showPendingTransactions: function (pending) {
            var self = this;

            pending.forEach(function (transaction) {
                var message = _t('Transaction Mobile Money en attente: %s - %s')
                    .replace('%s', transaction.reference)
                    .replace('%s', self._formatCurrency(transaction.amount));

                self._showNotification(message, 'warning');
            });
        },

        /**
         * Start transaction polling
         */
        _startTransactionPolling: function () {
            var self = this;

            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
            }

            this.pollingInterval = setInterval(function () {
                self._checkTransactionStatus();
            }, 10000); // Check every 10 seconds
        },

        /**
         * Stop transaction polling
         */
        _stopTransactionPolling: function () {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
        },

        /**
         * Check transaction status
         */
        _checkTransactionStatus: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/payments/check_status', 'call', {})
                .then(function (data) {
                    if (data.success && data.updated.length > 0) {
                        self._handleUpdatedTransactions(data.updated);
                    }

                    // Stop polling if no pending transactions
                    if (data.success && data.pending.length === 0) {
                        self._stopTransactionPolling();
                    }
                });
        },

        /**
         * Handle updated transactions
         */
        _handleUpdatedTransactions: function (transactions) {
            var self = this;

            transactions.forEach(function (transaction) {
                var message = '';

                if (transaction.status === 'confirmed') {
                    message = _t('Paiement confirmé: %s - %s')
                        .replace('%s', transaction.reference)
                        .replace('%s', self._formatCurrency(transaction.amount));
                    self._showNotification(message, 'success');
                } else if (transaction.status === 'failed') {
                    message = _t('Paiement échoué: %s')
                        .replace('%s', transaction.reference);
                    self._showNotification(message, 'error');
                }
            });

            // Refresh payment history
            this._loadPaymentHistory();
        },

        /**
         * Handle init Mobile Money payment click
         */
        _onInitMobileMoneyPayment: function (e) {
            e.preventDefault();
            this._showMobileMoneyPaymentModal();
        },

        /**
         * Handle record cash payment click
         */
        _onRecordCashPayment: function (e) {
            e.preventDefault();
            this._showCashPaymentModal();
        },

        /**
         * Handle record credit payment click
         */
        _onRecordCreditPayment: function (e) {
            e.preventDefault();
            this._showCreditPaymentModal();
        },

        /**
         * Handle download receipt click
         */
        _onDownloadReceipt: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var paymentId = button.data('payment-id');
            this._downloadReceipt(paymentId);
        },

        /**
         * Handle view payment details click
         */
        _onViewPaymentDetails: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var paymentId = button.data('payment-id');
            this._showPaymentDetails(paymentId);
        },

        /**
         * Handle payment form submit
         */
        _onPaymentFormSubmit: function (e) {
            e.preventDefault();
            var form = $(e.currentTarget);
            var formData = this._getPaymentFormData(form);

            this._processPayment(formData);
        },

        /**
         * Handle check payment status click
         */
        _onCheckPaymentStatus: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var transactionId = button.data('transaction-id');
            this._checkTransactionStatusById(transactionId);
        },

        /**
         * Show Mobile Money payment modal
         */
        _showMobileMoneyPaymentModal: function () {
            var self = this;

            var modalHtml = '<div class="modal fade" id="momoPaymentModal" tabindex="-1">' +
                '<div class="modal-dialog">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title">' + _t('Paiement Mobile Money') + '</h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
                '</div>' +
                '<div class="modal-body">' +
                '<form id="momo-payment-form">' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Fournisseur') + '</label>' +
                '<div class="row" id="momo-providers">' +
                    '<!-- Providers will be loaded here -->' +
                '</div>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Numéro de téléphone') + '</label>' +
                '<input type="tel" class="form-control" name="phone_number" placeholder="+225 XX XX XX XX XX" required/>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Montant') + '</label>' +
                <input type="number" class="form-control" name="amount" placeholder="0" min="0" step="100" required/>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Client (optionnel)') + '</label>' +
                '<input type="text" class="form-control" name="customer_name" placeholder="Nom du client"/>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Référence (optionnel)') + '</label>' +
                '<input type="text" class="form-control" name="reference" placeholder="Référence de vente"/>' +
                '</div>' +
                '</form>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' + _t('Annuler') + '</button>' +
                '<button type="button" class="btn btn-primary" id="init-momo-btn">' + _t('Initialiser le paiement') + '</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';

            // Remove existing modal
            $('#momoPaymentModal').remove();

            // Add modal to body
            $('body').append(modalHtml);

            // Show modal
            var modal = new bootstrap.Modal(document.getElementById('momoPaymentModal'));
            modal.show();

            // Load providers
            this._loadProvidersForModal();

            // Handle submit
            $('#init-momo-btn').on('click', function () {
                var form = $('#momo-payment-form');
                if (form[0].checkValidity()) {
                    var formData = {
                        provider: $('#selected-provider').val(),
                        phone_number: form.find('[name="phone_number"]').val(),
                        amount: parseFloat(form.find('[name="amount"]').val()),
                        customer_name: form.find('[name="customer_name"]').val(),
                        reference: form.find('[name="reference"]').val()
                    };

                    self._initMobileMoneyPayment(formData);
                    modal.hide();
                } else {
                    form[0].reportValidity();
                }
            });
        },

        /**
         * Load providers for modal
         */
        _loadProvidersForModal: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/payments/providers', 'call', {})
                .then(function (data) {
                    if (data.success) {
                        self._displayProvidersInModal(data.providers);
                    }
                });
        },

        /**
         * Display providers in modal
         */
        _displayProvidersInModal: function (providers) {
            var container = $('#momo-providers');
            if (!container.length) {
                return;
            }

            var html = providers.map(function (provider, index) {
                var checked = index === 0 ? 'checked' : '';
                return '<div class="col-md-4">' +
                    '<div class="form-check">' +
                    '<input class="form-check-input" type="radio" name="provider" id="provider_' + provider.code + '" value="' + provider.code + '" ' + checked + '/>' +
                    '<label class="form-check-label" for="provider_' + provider.code + '">' +
                    provider.name +
                    '</label>' +
                    '</div>' +
                    '</div>';
            }).join('');

            container.html(html);
            $('#selected-provider').val(providers[0].code);
        },

        /**
         * Show cash payment modal
         */
        _showCashPaymentModal: function () {
            var self = this;

            var modalHtml = '<div class="modal fade" id="cashPaymentModal" tabindex="-1">' +
                '<div class="modal-dialog">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title">' + _t('Encaissement en espèces') + '</h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
                '</div>' +
                '<div class="modal-body">' +
                '<form id="cash-payment-form">' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Montant') + '</label>' +
                '<input type="number" class="form-control" name="amount" placeholder="0" min="0" step="100" required/>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Client') + '</label>' +
                '<input type="text" class="form-control" name="customer_name" placeholder="Nom du client" required/>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Référence de vente') + '</label>' +
                '<input type="text" class="form-control" name="reference" placeholder="Référence"/>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="form-label">' + _t('Notes (optionnel)') + '</label>' +
                '<textarea class="form-control" name="notes" rows="3"></textarea>' +
                '</div>' +
                '</form>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' + _t('Annuler') + '</button>' +
                '<button type="button" class="btn btn-success" id="record-cash-btn">' + _t('Enregistrer') + '</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';

            // Remove existing modal
            $('#cashPaymentModal').remove();

            // Add modal to body
            $('body').append(modalHtml);

            // Show modal
            var modal = new bootstrap.Modal(document.getElementById('cashPaymentModal'));
            modal.show();

            // Handle submit
            $('#record-cash-btn').on('click', function () {
                var form = $('#cash-payment-form');
                if (form[0].checkValidity()) {
                    var formData = {
                        amount: parseFloat(form.find('[name="amount"]').val()),
                        customer_name: form.find('[name="customer_name"]').val(),
                        reference: form.find('[name="reference"]').val(),
                        notes: form.find('[name="notes"]').val()
                    };

                    self._recordCashPayment(formData);
                    modal.hide();
                } else {
                    form[0].reportValidity();
                }
            });
        },

        /**
         * Show credit payment modal
         */
        _showCreditPaymentModal: function () {
            // Implementation similar to cash payment modal but with additional fields
            // for credit terms (due date, interest rate, etc.)
        },

        /**
         * Initialize Mobile Money payment
         */
        _initMobileMoneyPayment: function (paymentData) {
            var self = this;

            if (!navigator.onLine) {
                this._processOfflinePayment('mobile_money', paymentData);
                return;
            }

            this._showLoading();

            ajax.jsonRpc('/api/merchant/payment/mobile_money/init', 'call', paymentData)
                .then(function (data) {
                    if (data.success) {
                        self._handleMobileMoneyInitSuccess(data);
                    } else {
                        self._showPaymentError(data.error);
                    }
                })
                .fail(function () {
                    self._processOfflinePayment('mobile_money', paymentData);
                })
                .always(function () {
                    self._hideLoading();
                });
        },

        /**
         * Handle Mobile Money init success
         */
        _handleMobileMoneyInitSuccess: function (data) {
            this.activeTransaction = data.transaction;
            this._showMobileMoneyStatusModal(data.transaction);
            this._startTransactionPolling();
        },

        /**
         * Show Mobile Money status modal
         */
        _showMobileMoneyStatusModal: function (transaction) {
            var self = this;

            var modalHtml = '<div class="modal fade" id="momoStatusModal" tabindex="-1" data-bs-backdrop="static">' +
                '<div class="modal-dialog">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title">' + _t('Statut du paiement Mobile Money') + '</h5>' +
                '</div>' +
                '<div class="modal-body text-center">' +
                '<div class="mb-3">' +
                '<i class="fa fa-mobile-alt fa-3x text-primary"></i>' +
                '</div>' +
                '<h6>' + _t('Transaction en cours...') + '</h6>' +
                '<p class="text-muted">' + _t('Veuillez confirmer le paiement sur votre téléphone') + '</p>' +
                '<div class="mb-3">' +
                '<strong>' + _t('Référence') + ':</strong> ' + transaction.reference + '<br>' +
                    '<strong>' + _t('Montant') + ':</strong> ' + this._formatCurrency(transaction.amount) + '<br>' +
                    '<strong>' + _t('Téléphone') + ':</strong> ' + transaction.phone_number +
                '</div>' +
                '<div class="progress mb-3">' +
                '<div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%"></div>' +
                '</div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" id="cancel-payment-btn">' + _t('Annuler') + '</button>' +
                '<button type="button" class="btn btn-primary btn-check-payment-status" data-transaction-id="' + transaction.id + '">' +
                _t('Vérifier le statut') +
                '</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';

            // Remove existing modal
            $('#momoStatusModal').remove();

            // Add modal to body
            $('body').append(modalHtml);

            // Show modal
            var modal = new bootstrap.Modal(document.getElementById('momoStatusModal'));
            modal.show();

            // Handle cancel button
            $('#cancel-payment-btn').on('click', function () {
                self._cancelPayment(transaction.id);
                modal.hide();
            });
        },

        /**
         * Record cash payment
         */
        _recordCashPayment: function (paymentData) {
            var self = this;

            if (!navigator.onLine) {
                this._processOfflinePayment('cash', paymentData);
                return;
            }

            this._showLoading();

            ajax.jsonRpc('/api/merchant/payment/cash/record', 'call', paymentData)
                .then(function (data) {
                    if (data.success) {
                        self._handleCashPaymentSuccess(data);
                    } else {
                        self._showPaymentError(data.error);
                    }
                })
                .fail(function () {
                    self._processOfflinePayment('cash', paymentData);
                })
                .always(function () {
                    self._hideLoading();
                });
        },

        /**
         * Handle cash payment success
         */
        _handleCashPaymentSuccess: function (data) {
            this._showNotification(_t('Paiement en espèces enregistré'), 'success');
            this._loadPaymentHistory();
            this._loadPaymentStats();

            if (data.receipt_url) {
                this._downloadReceiptFromUrl(data.receipt_url);
            }
        },

        /**
         * Process offline payment
         */
        _processOfflinePayment: function (method, paymentData) {
            var self = this;

            require('ifn_portal_merchant.offline').call('addToQueue', 'payment', {
                method: method,
                ...paymentData
            }).then(function (result) {
                if (result.success) {
                    self._showNotification(_t('Paiement enregistré localement'), 'info');
                }
            });
        },

        /**
         * Cancel payment
         */
        _cancelPayment: function (transactionId) {
            var self = this;

            ajax.jsonRpc('/api/merchant/payment/cancel', 'call', {
                transaction_id: transactionId
            }).then(function (data) {
                if (data.success) {
                    self._showNotification(_t('Paiement annulé'), 'info');
                }
            });
        },

        /**
         * Check transaction status by ID
         */
        _checkTransactionStatusById: function (transactionId) {
            var self = this;

            ajax.jsonRpc('/api/merchant/payment/status', 'call', {
                transaction_id: transactionId
            }).then(function (data) {
                if (data.success) {
                    self._handleTransactionStatusUpdate(data.transaction);
                }
            });
        },

        /**
         * Handle transaction status update
         */
        _handleTransactionStatusUpdate: function (transaction) {
            if (transaction.status === 'confirmed') {
                this._showNotification(_t('Paiement confirmé'), 'success');
                $('#momoStatusModal').modal('hide');
                this._loadPaymentHistory();
                this._loadPaymentStats();
            } else if (transaction.status === 'failed') {
                this._showNotification(_t('Paiement échoué'), 'error');
                $('#momoStatusModal').modal('hide');
            }
        },

        /**
         * Download receipt
         */
        _downloadReceipt: function (paymentId) {
            window.open('/api/merchant/payment/receipt/' + paymentId, '_blank');
        },

        /**
         * Download receipt from URL
         */
        _downloadReceiptFromUrl: function (url) {
            window.open(url, '_blank');
        },

        /**
         * Show payment details
         */
        _showPaymentDetails: function (paymentId) {
            // Implementation for payment details modal
        },

        /**
         * Get payment form data
         */
        _getPaymentFormData: function (form) {
            var formData = {};
            form.serializeArray().forEach(function (item) {
                formData[item.name] = item.value;
            });
            return formData;
        },

        /**
         * Setup form validation
         */
        _setupFormValidation: function () {
            // Bootstrap form validation
            var forms = document.querySelectorAll('.needs-validation');
            Array.prototype.slice.call(forms).forEach(function (form) {
                form.addEventListener('submit', function (event) {
                    if (!form.checkValidity()) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    form.classList.add('was-validated');
                }, false);
            });
        },

        /**
         * Setup phone formatting
         */
        _setupPhoneFormatting: function () {
            $('input[type="tel"]').on('input', function (e) {
                var value = $(e.target).val();
                // Format phone number (Côte d'Ivoire format)
                var formatted = value.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '+225 $1 $2 $3 $4 $5');
                $(e.target).val(formatted);
            });
        },

        /**
         * Show payment error
         */
        _showPaymentError: function (error) {
            this._showNotification(error || _t('Erreur lors du paiement'), 'error');
        },

        /**
         * Show loading
         */
        _showLoading: function (selector) {
            if (selector) {
                this.$(selector).addClass('loading');
            } else {
                $('body').addClass('loading');
            }
        },

        /**
         * Hide loading
         */
        _hideLoading: function (selector) {
            if (selector) {
                this.$(selector).removeClass('loading');
            } else {
                $('body').removeClass('loading');
            }
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
            this._stopTransactionPolling();
            this._super.apply(this, arguments);
        }
    });

    // Register widget
    publicWidget.registry.MerchantPayments = MerchantPayments;

    return {
        MerchantPayments: MerchantPayments
    };
});