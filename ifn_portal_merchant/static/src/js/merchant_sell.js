/* IFN Portal Merchant Sell JavaScript */
/* =================================== */

odoo.define('ifn_portal_merchant.sell', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var ajax = require('web.ajax');

    var _t = core._t;

    var MerchantSell = publicWidget.Widget.extend({
        selector: '.ifn-merchant-sell',
        events: {
            'click #scan-btn': '_onScanButtonClick',
            'click #voice-btn': '_onVoiceButtonClick',
            'click #checkout-btn': '_onCheckoutClick',
            'click .btn-add-to-cart': '_onAddToCart',
            'click .btn-remove-from-cart': '_onRemoveFromCart',
            'click .btn-quantity-adjust': '_onQuantityAdjust',
            'change #search-input': '_onSearchChange',
            'keypress #search-input': '_onSearchKeypress',
            'keypress #barcode-input': '_onBarcodeKeypress',
            'change input[name="payment-method"]': '_onPaymentMethodChange',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.cart = [];
            this.isVoiceRecording = false;
            this.voiceRecognition = null;
            this.barcodeScanner = null;
        },

        /**
         * Initialize sell page
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initializeComponents();
                self._initializeVoiceRecognition();
                self._initializeBarcodeScanner();
                self._loadRecentProducts();
                self._updateCartDisplay();
                self._checkOfflineStatus();
            });
        },

        /**
         * Initialize components
         */
        _initializeComponents: function () {
            // Initialize tooltips
            this.$('[data-bs-toggle="tooltip"]').tooltip();

            // Initialize payment method buttons
            this._initializePaymentMethods();

            // Setup cart
            this._setupCart();
        },

        /**
         * Initialize voice recognition
         */
        _initializeVoiceRecognition: function () {
            var self = this;

            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.voiceRecognition = new SpeechRecognition();

                this.voiceRecognition.lang = 'fr-FR';
                this.voiceRecognition.continuous = false;
                this.voiceRecognition.interimResults = true;

                this.voiceRecognition.onstart = function() {
                    self._startVoiceRecording();
                };

                this.voiceRecognition.onresult = function(event) {
                    self._handleVoiceResult(event);
                };

                this.voiceRecognition.onerror = function(event) {
                    self._handleVoiceError(event);
                };

                this.voiceRecognition.onend = function() {
                    self._stopVoiceRecording();
                };
            } else {
                this._disableVoiceFeatures();
            }
        },

        /**
         * Initialize barcode scanner
         */
        _initializeBarcodeScanner: function () {
            var self = this;

            // Setup barcode input handler
            this.$('#barcode-input').on('keypress', function(e) {
                if (e.which === 13) { // Enter key
                    var barcode = $(this).val();
                    if (barcode) {
                        self._searchProductByBarcode(barcode);
                        $(this).val('');
                    }
                }
            });
        },

        /**
         * Initialize payment methods
         */
        _initializePaymentMethods: function () {
            this.$('input[name="payment-method"]').each(function() {
                $(this).prop('checked', false);
            });
            this.$('#payment-cash').prop('checked', true);
        },

        /**
         * Setup cart
         */
        _setupCart: function () {
            // Load cart from local storage
            var savedCart = localStorage.getItem('merchant_cart');
            if (savedCart) {
                try {
                    this.cart = JSON.parse(savedCart);
                } catch (e) {
                    this.cart = [];
                }
            }
        },

        /**
         * Load recent products
         */
        _loadRecentProducts: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/products/recent', 'call', {limit: 10})
                .then(function (data) {
                    if (data.success) {
                        self._displayRecentProducts(data.products);
                    }
                });
        },

        /**
         * Display recent products
         */
        _displayRecentProducts: function (products) {
            var container = this.$('#recent-products');
            if (!container.length) {
                return;
            }

            var html = products.map(function(product) {
                return '<div class="col-md-3 mb-3">' +
                    '<div class="card product-card" data-product-id="' + product.id + '">' +
                    '<div class="card-body text-center">' +
                    '<h6 class="card-title">' + product.name + '</h6>' +
                    '<p class="text-primary mb-2">' + self._formatCurrency(product.price) + '</p>' +
                    '<button class="btn btn-primary btn-sm btn-add-to-cart" data-product-id="' + product.id + '">' +
                    '<i class="fa fa-plus"></i> Ajouter' +
                    '</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }.bind(this)).join('');

            container.html(html);
        },

        /**
         * Handle scan button click
         */
        _onScanButtonClick: function (e) {
            e.preventDefault();
            this._startBarcodeScanning();
        },

        /**
         * Handle voice button click
         */
        _onVoiceButtonClick: function (e) {
            e.preventDefault();

            if (this.isVoiceRecording) {
                this._stopVoiceRecording();
            } else {
                this._startVoiceRecording();
            }
        },

        /**
         * Handle checkout click
         */
        _onCheckoutClick: function (e) {
            e.preventDefault();

            if (this.cart.length === 0) {
                this._showNotification('Votre panier est vide', 'warning');
                return;
            }

            var paymentMethod = this.$('input[name="payment-method"]:checked').val();
            this._processCheckout(paymentMethod);
        },

        /**
         * Handle add to cart
         */
        _onAddToCart: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var productId = button.data('product-id');
            this._addProductToCart(productId, 1);
        },

        /**
         * Handle remove from cart
         */
        _onRemoveFromCart: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var productId = button.data('product-id');
            this._removeProductFromCart(productId);
        },

        /**
         * Handle quantity adjustment
         */
        _onQuantityAdjust: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var productId = button.data('product-id');
            var adjustment = button.data('adjustment');
            this._adjustProductQuantity(productId, adjustment);
        },

        /**
         * Handle search change
         */
        _onSearchChange: function (e) {
            var term = $(e.currentTarget).val();
            if (term.length >= 2) {
                this._searchProducts(term);
            }
        },

        /**
         * Handle search keypress
         */
        _onSearchKeypress: function (e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                var term = $(e.currentTarget).val();
                if (term) {
                    this._searchProducts(term);
                }
            }
        },

        /**
         * Handle barcode keypress
         */
        _onBarcodeKeypress: function (e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                var barcode = $(e.currentTarget).val();
                if (barcode) {
                    this._searchProductByBarcode(barcode);
                    $(e.currentTarget).val('');
                }
            }
        },

        /**
         * Handle payment method change
         */
        _onPaymentMethodChange: function (e) {
            this._updatePaymentMethodUI();
        },

        /**
         * Start barcode scanning
         */
        _startBarcodeScanning: function () {
            var self = this;

            // Focus on barcode input
            this.$('#barcode-input').focus();
            this._showNotification('Scannez un code-barres', 'info');
        },

        /**
         * Start voice recording
         */
        _startVoiceRecording: function () {
            if (!this.voiceRecognition) {
                this._showNotification('La reconnaissance vocale n\'est pas supportée', 'error');
                return;
            }

            this.isVoiceRecording = true;
            this.$('#voice-btn').addClass('recording').html('<i class="fa fa-stop"></i> Arrêter');
            this.$('.voice-command-overlay').addClass('active');

            try {
                this.voiceRecognition.start();
            } catch (e) {
                console.error('Voice recognition error:', e);
                this._stopVoiceRecording();
            }
        },

        /**
         * Stop voice recording
         */
        _stopVoiceRecording: function () {
            this.isVoiceRecording = false;
            this.$('#voice-btn').removeClass('recording').html('<i class="fa fa-microphone"></i> Parler');
            this.$('.voice-command-overlay').removeClass('active');

            if (this.voiceRecognition) {
                try {
                    this.voiceRecognition.stop();
                } catch (e) {
                    console.error('Error stopping voice recognition:', e);
                }
            }
        },

        /**
         * Handle voice result
         */
        _handleVoiceResult: function (event) {
            var self = this;
            var finalTranscript = '';

            for (var i = event.resultIndex; i < event.results.length; i++) {
                var transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                }
            }

            if (finalTranscript) {
                this._processVoiceCommand(finalTranscript);
            }
        },

        /**
         * Handle voice error
         */
        _handleVoiceError: function (event) {
            var errorMessage = _t('Erreur de reconnaissance vocale');

            switch (event.error) {
                case 'no-speech':
                    errorMessage = _t('Aucune parole détectée');
                    break;
                case 'audio-capture':
                    errorMessage = _t('Impossible de capturer l\'audio');
                    break;
                case 'not-allowed':
                    errorMessage = _t('Permission microphone refusée');
                    break;
                case 'network':
                    errorMessage = _t('Erreur réseau');
                    break;
            }

            this._showNotification(errorMessage, 'error');
            this._stopVoiceRecording();
        },

        /**
         * Process voice command
         */
        _processVoiceCommand: function (command) {
            var self = this;
            command = command.toLowerCase();

            // Look for product names in the command
            ajax.jsonRpc('/api/merchant/products/search', 'call', {
                term: command,
                voice_search: true
            }).then(function (data) {
                if (data.success && data.products.length > 0) {
                    var product = data.products[0];
                    self._addProductToCart(product.id, 1);
                    self._showNotification(_t('Produit ajouté: %s').replace('%s', product.name), 'success');
                } else {
                    self._showNotification(_t('Produit non trouvé: %s').replace('%s', command), 'warning');
                }
            });
        },

        /**
         * Search products
         */
        _searchProducts: function (term) {
            var self = this;

            this._showLoading('#search-results');

            ajax.jsonRpc('/api/merchant/products/search', 'call', {
                term: term,
                limit: 20
            }).then(function (data) {
                if (data.success) {
                    self._displaySearchResults(data.products);
                } else {
                    self._showSearchError();
                }
            }).always(function () {
                self._hideLoading('#search-results');
            });
        },

        /**
         * Search product by barcode
         */
        _searchProductByBarcode: function (barcode) {
            var self = this;

            ajax.jsonRpc('/api/merchant/products/barcode', 'call', {
                barcode: barcode
            }).then(function (data) {
                if (data.success && data.product) {
                    self._addProductToCart(data.product.id, 1);
                    self._showNotification(_t('Produit ajouté: %s').replace('%s', data.product.name), 'success');
                } else {
                    self._showNotification(_t('Code-barres non trouvé: %s').replace('%s', barcode), 'error');
                }
            });
        },

        /**
         * Display search results
         */
        _displaySearchResults: function (products) {
            var container = this.$('#search-results');
            if (!container.length) {
                return;
            }

            if (products.length === 0) {
                container.html('<p class="text-muted">' + _t('Aucun produit trouvé') + '</p>');
                return;
            }

            var html = products.map(function(product) {
                return '<div class="col-md-3 mb-3">' +
                    '<div class="card product-card" data-product-id="' + product.id + '">' +
                    '<div class="card-body text-center">' +
                    '<h6 class="card-title">' + product.name + '</h6>' +
                    '<p class="text-primary mb-2">' + self._formatCurrency(product.price) + '</p>' +
                    '<p class="text-muted small mb-2">Stock: ' + product.available + '</p>' +
                    '<button class="btn btn-primary btn-sm btn-add-to-cart" data-product-id="' + product.id + '">' +
                    '<i class="fa fa-plus"></i> Ajouter' +
                    '</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }.bind(this)).join('');

            container.html(html);
        },

        /**
         * Add product to cart
         */
        _addProductToCart: function (productId, quantity) {
            var self = this;

            // Get product details
            ajax.jsonRpc('/api/merchant/products/get', 'call', {
                product_id: productId
            }).then(function (data) {
                if (data.success) {
                    var product = data.product;
                    var existingItem = self.cart.find(function(item) {
                        return item.id === productId;
                    });

                    if (existingItem) {
                        existingItem.quantity += quantity;
                    } else {
                        self.cart.push({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            quantity: quantity
                        });
                    }

                    self._saveCart();
                    self._updateCartDisplay();
                    self._showNotification(_t('Produit ajouté au panier'), 'success');
                }
            });
        },

        /**
         * Remove product from cart
         */
        _removeProductFromCart: function (productId) {
            this.cart = this.cart.filter(function(item) {
                return item.id !== productId;
            });

            this._saveCart();
            this._updateCartDisplay();
        },

        /**
         * Adjust product quantity
         */
        _adjustProductQuantity: function (productId, adjustment) {
            var item = this.cart.find(function(item) {
                return item.id === productId;
            });

            if (item) {
                item.quantity += adjustment;
                if (item.quantity <= 0) {
                    this._removeProductFromCart(productId);
                } else {
                    this._saveCart();
                    this._updateCartDisplay();
                }
            }
        },

        /**
         * Update cart display
         */
        _updateCartDisplay: function () {
            var self = this;
            var tbody = this.$('#cart-table tbody');
            var emptyCart = this.$('#empty-cart');
            var checkoutBtn = this.$('#checkout-btn');
            var totalElement = this.$('#cart-total');

            if (this.cart.length === 0) {
                tbody.empty();
                emptyCart.show();
                checkoutBtn.prop('disabled', true);
                totalElement.text('0 F');
                return;
            }

            emptyCart.hide();
            checkoutBtn.prop('disabled', false);

            var html = '';
            var total = 0;

            this.cart.forEach(function(item) {
                var itemTotal = item.price * item.quantity;
                total += itemTotal;

                html += '<tr>' +
                    '<td>' + item.name + '</td>' +
                    '<td>' +
                    '<div class="input-group input-group-sm">' +
                    '<button class="btn btn-outline-secondary btn-quantity-adjust" data-product-id="' + item.id + '" data-adjustment="-1">' +
                    '<i class="fa fa-minus"></i>' +
                    '</button>' +
                    '<input type="number" class="form-control text-center" value="' + item.quantity + '" min="1" readonly/>' +
                    '<button class="btn btn-outline-secondary btn-quantity-adjust" data-product-id="' + item.id + '" data-adjustment="1">' +
                    '<i class="fa fa-plus"></i>' +
                    '</button>' +
                    '</div>' +
                    '</td>' +
                    '<td>' + self._formatCurrency(item.price) + '</td>' +
                    '<td class="fw-bold">' + self._formatCurrency(itemTotal) + '</td>' +
                    '<td>' +
                    '<button class="btn btn-sm btn-outline-danger btn-remove-from-cart" data-product-id="' + item.id + '">' +
                    '<i class="fa fa-trash"></i>' +
                    '</button>' +
                    '</td>' +
                    '</tr>';
            });

            tbody.html(html);
            totalElement.text(this._formatCurrency(total));
        },

        /**
         * Save cart to local storage
         */
        _saveCart: function () {
            localStorage.setItem('merchant_cart', JSON.stringify(this.cart));
        },

        /**
         * Process checkout
         */
        _processCheckout: function (paymentMethod) {
            var self = this;

            var saleData = {
                lines: this.cart.map(function(item) {
                    return {
                        product_id: item.id,
                        quantity: item.quantity,
                        price: item.price
                    };
                }),
                payment_method: paymentMethod
            };

            if (!navigator.onLine) {
                this._processOfflineSale(saleData);
                return;
            }

            this._showLoading();

            ajax.jsonRpc('/api/merchant/sale/create', 'call', saleData)
                .then(function (data) {
                    if (data.success) {
                        self._handleSaleSuccess(data, paymentMethod);
                    } else {
                        self._handleSaleError(data.error);
                    }
                })
                .fail(function () {
                    self._handleSaleError(_t('Erreur réseau'));
                })
                .always(function () {
                    self._hideLoading();
                });
        },

        /**
         * Process offline sale
         */
        _processOfflineSale: function (saleData) {
            var self = this;

            ajax.jsonRpc('/api/merchant/offline/add_sale', 'call', saleData)
                .then(function (data) {
                    if (data.success) {
                        self._clearCart();
                        self._showNotification(_t('Vente enregistrée localement. Synchronisation automatique dès que possible.'), 'info');
                    } else {
                        self._showNotification(_t('Erreur lors de l\'enregistrement de la vente'), 'error');
                    }
                });
        },

        /**
         * Handle sale success
         */
        _handleSaleSuccess: function (data, paymentMethod) {
            var self = this;

            if (paymentMethod === 'mobile_money') {
                this._initMobileMoneyPayment(data.order_id);
            } else {
                this._generateReceipt(data.order_id);
                this._clearCart();
                this._showNotification(_t('Vente effectuée avec succès'), 'success');
            }
        },

        /**
         * Handle sale error
         */
        _handleSaleError: function (error) {
            this._showNotification(error || _t('Erreur lors de la vente'), 'error');
        },

        /**
         * Initialize Mobile Money payment
         */
        _initMobileMoneyPayment: function (orderId) {
            var self = this;

            ajax.jsonRpc('/api/merchant/payment/init', 'call', {
                order_id: orderId,
                provider: 'orange_money' // Could be dynamic
            }).then(function (data) {
                if (data.success) {
                    self._showMobileMoneyModal(data.transaction_id);
                } else {
                    self._showNotification(_t('Erreur lors de l\'initialisation du paiement'), 'error');
                }
            });
        },

        /**
         * Show Mobile Money modal
         */
        _showMobileMoneyModal: function (transactionId) {
            // Implementation for Mobile Money modal
            this._showNotification(_t('Paiement Mobile Money initialisé. Veuillez confirmer sur votre téléphone.'), 'info');
        },

        /**
         * Generate receipt
         */
        _generateReceipt: function (orderId) {
            var self = this;

            ajax.jsonRpc('/api/merchant/receipt/generate', 'call', {
                order_id: orderId
            }).then(function (data) {
                if (data.success) {
                    self._downloadReceipt(data.receipt_url);
                }
            });
        },

        /**
         * Download receipt
         */
        _downloadReceipt: function (url) {
            window.open(url, '_blank');
        },

        /**
         * Clear cart
         */
        _clearCart: function () {
            this.cart = [];
            this._saveCart();
            this._updateCartDisplay();
        },

        /**
         * Update payment method UI
         */
        _updatePaymentMethodUI: function () {
            var selectedMethod = this.$('input[name="payment-method"]:checked').val();

            // Update UI based on selected payment method
            this.$('.payment-method-details').hide();
            this.$('#payment-details-' + selectedMethod).show();
        },

        /**
         * Check offline status
         */
        _checkOfflineStatus: function () {
            if (!navigator.onLine) {
                this._showOfflineIndicator();
            }
        },

        /**
         * Show offline indicator
         */
        _showOfflineIndicator: function () {
            this.$('.offline-indicator').addClass('active');
        },

        /**
         * Disable voice features
         */
        _disableVoiceFeatures: function () {
            this.$('#voice-btn').prop('disabled', true)
                .attr('title', _t('Reconnaissance vocale non supportée'))
                .tooltip();
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
         * Show loading
         */
        _showLoading: function (selector) {
            if (selector) {
                this.$(selector).addClass('loading');
            } else {
                this.$('body').addClass('loading');
            }
        },

        /**
         * Hide loading
         */
        _hideLoading: function (selector) {
            if (selector) {
                this.$(selector).removeClass('loading');
            } else {
                this.$('body').removeClass('loading');
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
        }
    });

    // Register widget
    publicWidget.registry.MerchantSell = MerchantSell;

    return {
        MerchantSell: MerchantSell
    };
});