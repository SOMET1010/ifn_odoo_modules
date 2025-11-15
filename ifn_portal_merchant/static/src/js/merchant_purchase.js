/* IFN Portal Merchant Purchase JavaScript */
/* ======================================== */

odoo.define('ifn_portal_merchant.purchase', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var ajax = require('web.ajax');

    var _t = core._t;

    var MerchantPurchase = publicWidget.Widget.extend({
        selector: '.ifn-merchant-purchase',
        events: {
            'click .btn-add-to-order': '_onAddToOrder',
            'click .btn-remove-from-order': '_onRemoveFromOrder',
            'click .btn-quantity-adjust': '_onQuantityAdjust',
            'change input[name="supplier-type"]': '_onSupplierTypeChange',
            'click #place-order-btn': '_onPlaceOrder',
            'click .btn-view-supplier': '_onViewSupplier',
            'change .supplier-select': '_onSupplierChange',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.orderItems = [];
            this.selectedSupplier = null;
            this.supplierType = 'coop';
            this.availableProducts = [];
        },

        /**
         * Initialize purchase page
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initializePurchaseFlow();
                self._loadSuppliers();
                self._loadProducts();
                self._updateOrderDisplay();
                self._checkOfflineStatus();
            });
        },

        /**
         * Initialize purchase flow
         */
        _initializePurchaseFlow: function () {
            // Set default supplier type
            this.$('input[name="supplier-type"][value="coop"]').prop('checked', true);

            // Initialize order items from session storage
            this._loadOrderFromStorage();

            // Setup supplier cards
            this._setupSupplierCards();
        },

        /**
         * Load suppliers
         */
        _loadSuppliers: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/suppliers', 'call', {})
                .then(function (data) {
                    if (data.success) {
                        self._displaySuppliers(data.suppliers);
                    }
                });
        },

        /**
         * Load products
         */
        _loadProducts: function () {
            var self = this;

            this._showLoading('#product-catalog');

            ajax.jsonRpc('/api/merchant/products/catalog', 'call', {
                supplier_id: this.selectedSupplier ? this.selectedSupplier.id : null
            }).then(function (data) {
                if (data.success) {
                    self.availableProducts = data.products;
                    self._displayProductCatalog(data.products);
                } else {
                    self._showProductError(data.error);
                }
            }).always(function () {
                self._hideLoading('#product-catalog');
            });
        },

        /**
         * Display suppliers
         */
        _displaySuppliers: function (suppliers) {
            var self = this;

            // Display cooperative supplier
            if (suppliers.cooperative) {
                this._displayCooperativeSupplier(suppliers.cooperative);
            }

            // Display other suppliers
            if (suppliers.others && suppliers.others.length > 0) {
                this._displayOtherSuppliers(suppliers.others);
            }

            // Update supplier select dropdown
            this._updateSupplierSelect(suppliers);
        },

        /**
         * Display cooperative supplier
         */
        _displayCooperativeSupplier: function (cooperative) {
            var coopCard = this.$('#cooperative-supplier');
            if (coopCard.length) {
                coopCard.find('.supplier-name').text(cooperative.name);
                coopCard.find('.supplier-info').text(cooperative.info || '');
                coopCard.data('supplier', cooperative);
            }
        },

        /**
         * Display other suppliers
         */
        _displayOtherSuppliers: function (suppliers) {
            var container = this.$('#other-suppliers');
            if (!container.length) {
                return;
            }

            var html = suppliers.map(function (supplier) {
                return '<div class="col-md-4 mb-3">' +
                    '<div class="card supplier-card" data-supplier-id="' + supplier.id + '">' +
                    '<div class="card-body">' +
                    '<h6 class="card-title">' + supplier.name + '</h6>' +
                    '<p class="card-text small text-muted">' + (supplier.description || '') + '</p>' +
                    '<div class="d-flex justify-content-between align-items-center">' +
                    '<small class="text-muted">' + (supplier.delivery_time || '') + '</small>' +
                    '<button class="btn btn-sm btn-outline-primary btn-select-supplier" data-supplier-id="' + supplier.id + '">' +
                    _t('Sélectionner') +
                    '</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }).join('');

            container.html(html);
        },

        /**
         * Update supplier select dropdown
         */
        _updateSupplierSelect: function (suppliers) {
            var select = this.$('.supplier-select');
            if (!select.length) {
                return;
            }

            var html = '<option value="">' + _t('Choisir un fournisseur') + '</option>';

            if (suppliers.cooperative) {
                html += '<option value="' + suppliers.cooperative.id + '">' + suppliers.cooperative.name + '</option>';
            }

            if (suppliers.others) {
                suppliers.others.forEach(function (supplier) {
                    html += '<option value="' + supplier.id + '">' + supplier.name + '</option>';
                });
            }

            select.html(html);
        },

        /**
         * Display product catalog
         */
        _displayProductCatalog: function (products) {
            var self = this;
            var container = this.$('#product-catalog');

            if (!container.length) {
                return;
            }

            if (products.length === 0) {
                container.html('<div class="col-12 text-center text-muted py-4">' +
                    '<i class="fa fa-box fa-2x mb-3"></i><br>' +
                    _t('Aucun produit disponible') +
                    '</div>');
                return;
            }

            var html = products.map(function (product) {
                var badgeClass = product.stock > 0 ? 'bg-success' : 'bg-warning';
                var stockText = product.stock > 0 ? _t('Disponible') : _t('Sur commande');

                return '<div class="col-md-3 mb-3">' +
                    '<div class="card product-card" data-product-id="' + product.id + '">' +
                    '<div class="card-body text-center">' +
                    '<h6 class="card-title">' + product.name + '</h6>' +
                    '<p class="text-primary mb-1">' + self._formatCurrency(product.price) + '</p>' +
                    '<p class="text-muted small mb-2">' + _t('Livraison: %s').replace('%s', product.delivery_time || _t('2-3 jours')) + '</p>' +
                    '<span class="badge ' + badgeClass + ' mb-2">' + stockText + '</span><br>' +
                    '<div class="input-group input-group-sm">' +
                    '<input type="number" class="form-control product-quantity" placeholder="Qté" value="1" min="1" data-product-id="' + product.id + '"/>' +
                    '<button class="btn btn-primary btn-add-to-order" data-product-id="' + product.id + '">' +
                    '<i class="fa fa-plus"></i>' +
                    '</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }.bind(this)).join('');

            container.html(html);
        },

        /**
         * Setup supplier cards
         */
        _setupSupplierCards: function () {
            var self = this;

            this.$('.supplier-card').on('click', function () {
                var card = $(this);
                var supplier = card.data('supplier');

                self._selectSupplier(supplier);
            });
        },

        /**
         * Select supplier
         */
        _selectSupplier: function (supplier) {
            if (!supplier) {
                return;
            }

            this.selectedSupplier = supplier;

            // Update UI
            this.$('.supplier-card').removeClass('selected border-primary');
            this.$('.supplier-card[data-supplier-id="' + supplier.id + '"]').addClass('selected border-primary');

            // Update radio button
            this.$('input[name="supplier-type"][value="other"]').prop('checked', true);

            // Reload products for this supplier
            this._loadProducts();
        },

        /**
         * Handle supplier type change
         */
        _onSupplierTypeChange: function (e) {
            var supplierType = $(e.currentTarget).val();
            this.supplierType = supplierType;

            if (supplierType === 'coop') {
                this.selectedSupplier = null; // Will use cooperative by default
            } else {
                // Load other suppliers or show selection
                this._showSupplierSelection();
            }

            this._loadProducts();
        },

        /**
         * Handle supplier change
         */
        _onSupplierChange: function (e) {
            var supplierId = $(e.currentTarget).val();
            if (supplierId) {
                // Load supplier details
                ajax.jsonRpc('/api/merchant/supplier/get', 'call', {
                    supplier_id: supplierId
                }).then(function (data) {
                    if (data.success) {
                        this._selectSupplier(data.supplier);
                    }
                }.bind(this));
            } else {
                this.selectedSupplier = null;
                this._loadProducts();
            }
        },

        /**
         * Handle add to order
         */
        _onAddToOrder: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var productId = button.data('product-id');
            var quantityInput = this.$('.product-quantity[data-product-id="' + productId + '"]');
            var quantity = parseInt(quantityInput.val()) || 1;

            this._addProductToOrder(productId, quantity);
        },

        /**
         * Handle remove from order
         */
        _onRemoveFromOrder: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var productId = button.data('product-id');
            this._removeProductFromOrder(productId);
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
         * Handle place order
         */
        _onPlaceOrder: function (e) {
            e.preventDefault();

            if (this.orderItems.length === 0) {
                this._showNotification(_t('Votre commande est vide'), 'warning');
                return;
            }

            if (!this.supplierType && this.supplierType !== 'coop' && !this.selectedSupplier) {
                this._showNotification(_t('Veuillez sélectionner un fournisseur'), 'warning');
                return;
            }

            this._showOrderConfirmationModal();
        },

        /**
         * Handle view supplier
         */
        _onViewSupplier: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var supplierId = button.data('supplier-id');
            this._showSupplierDetails(supplierId);
        },

        /**
         * Add product to order
         */
        _addProductToOrder: function (productId, quantity) {
            var self = this;
            var product = this.availableProducts.find(function (p) { return p.id === productId; });

            if (!product) {
                return;
            }

            var existingItem = this.orderItems.find(function (item) {
                return item.id === productId;
            });

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                this.orderItems.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: quantity,
                    unit: product.unit || 'unité'
                });
            }

            this._saveOrderToStorage();
            this._updateOrderDisplay();
            this._showNotification(_t('Produit ajouté à la commande'), 'success');

            // Reset quantity input
            this.$('.product-quantity[data-product-id="' + productId + '"]').val(1);
        },

        /**
         * Remove product from order
         */
        _removeProductFromOrder: function (productId) {
            this.orderItems = this.orderItems.filter(function (item) {
                return item.id !== productId;
            });

            this._saveOrderToStorage();
            this._updateOrderDisplay();
        },

        /**
         * Adjust product quantity
         */
        _adjustProductQuantity: function (productId, adjustment) {
            var item = this.orderItems.find(function (item) {
                return item.id === productId;
            });

            if (item) {
                item.quantity += adjustment;
                if (item.quantity <= 0) {
                    this._removeProductFromOrder(productId);
                } else {
                    this._saveOrderToStorage();
                    this._updateOrderDisplay();
                }
            }
        },

        /**
         * Update order display
         */
        _updateOrderDisplay: function () {
            var self = this;
            var tbody = this.$('#order-items-table');
            var emptyOrder = this.$('#empty-order');
            var totalElement = this.$('#order-total');
            var itemsElement = this.$('#order-items');
            var checkoutBtn = this.$('#place-order-btn');

            if (this.orderItems.length === 0) {
                tbody.empty();
                emptyOrder.show();
                checkoutBtn.prop('disabled', true);
                totalElement.text('0 F');
                itemsElement.text('0');
                return;
            }

            emptyOrder.hide();
            checkoutBtn.prop('disabled', false);

            var html = '';
            var total = 0;

            this.orderItems.forEach(function (item) {
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
                    '<button class="btn btn-sm btn-outline-danger btn-remove-from-order" data-product-id="' + item.id + '">' +
                    '<i class="fa fa-trash"></i>' +
                    '</button>' +
                    '</td>' +
                    '</tr>';
            });

            tbody.html(html);
            totalElement.text(this._formatCurrency(total));
            itemsElement.text(this.orderItems.length);
        },

        /**
         * Show order confirmation modal
         */
        _showOrderConfirmationModal: function () {
            var self = this;

            var total = this.orderItems.reduce(function (sum, item) {
                return sum + (item.price * item.quantity);
            }, 0);

            var supplierName = this.supplierType === 'coop' ? _t('Ma Coopérative') :
                              (this.selectedSupplier ? this.selectedSupplier.name : '');

            var modalHtml = '<div class="modal fade" id="orderConfirmModal" tabindex="-1">' +
                '<div class="modal-dialog">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title">' + _t('Confirmer la commande') + '</h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
                '</div>' +
                '<div class="modal-body">' +
                '<h6>' + _t('Fournisseur') + ':</h6>' +
                '<p>' + supplierName + '</p>' +
                '<h6>' + _t('Articles') + ':</h6>' +
                '<ul>';

            this.orderItems.forEach(function (item) {
                modalHtml += '<li>' + item.name + ' - ' + item.quantity + ' ' + item.unit + ' - ' + self._formatCurrency(item.price * item.quantity) + '</li>';
            });

            modalHtml += '</ul>' +
                '<h6>' + _t('Total') + ':</h6>' +
                '<p class="fw-bold">' + this._formatCurrency(total) + '</p>' +
                '<p class="text-muted">' + _t('Livraison prévue: 2-3 jours ouvrables') + '</p>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' + _t('Annuler') + '</button>' +
                '<button type="button" class="btn btn-primary" id="confirm-order-btn">' + _t('Confirmer la commande') + '</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';

            // Remove existing modal
            $('#orderConfirmModal').remove();

            // Add modal to body
            $('body').append(modalHtml);

            // Show modal
            var modal = new bootstrap.Modal(document.getElementById('orderConfirmModal'));
            modal.show();

            // Handle confirm button
            $('#confirm-order-btn').on('click', function () {
                self._placeOrder();
                modal.hide();
            });
        },

        /**
         * Place order
         */
        _placeOrder: function () {
            var self = this;

            var orderData = {
                supplier_id: this.selectedSupplier ? this.selectedSupplier.id : null,
                supplier_type: this.supplierType,
                lines: this.orderItems.map(function (item) {
                    return {
                        product_id: item.id,
                        quantity: item.quantity,
                        price: item.price
                    };
                }),
                notes: this.$('#order-notes').val() || ''
            };

            if (!navigator.onLine) {
                this._processOfflineOrder(orderData);
                return;
            }

            this._showLoading();

            ajax.jsonRpc('/api/merchant/purchase/create', 'call', orderData)
                .then(function (data) {
                    if (data.success) {
                        self._handleOrderSuccess(data);
                    } else {
                        self._handleOrderError(data.error);
                    }
                })
                .fail(function () {
                    self._processOfflineOrder(orderData);
                })
                .always(function () {
                    self._hideLoading();
                });
        },

        /**
         * Process offline order
         */
        _processOfflineOrder: function (orderData) {
            var self = this;

            require('ifn_portal_merchant.offline').call('addToQueue', 'purchase', orderData)
                .then(function (result) {
                    if (result.success) {
                        self._clearOrder();
                        self._showNotification(_t('Commande enregistrée localement. Synchronisation automatique dès que possible.'), 'info');
                    }
                });
        },

        /**
         * Handle order success
         */
        _handleOrderSuccess: function (data) {
            this._clearOrder();
            this._showNotification(_t('Commande passée avec succès'), 'success');

            // Show order details or redirect
            if (data.order_id) {
                this._showOrderDetails(data.order_id);
            }
        },

        /**
         * Handle order error
         */
        _handleOrderError: function (error) {
            this._showNotification(error || _t('Erreur lors de la commande'), 'error');
        },

        /**
         * Show order details
         */
        _showOrderDetails: function (orderId) {
            // Redirect to order details page or show modal
            window.location.href = '/portal/merchant/orders/' + orderId;
        },

        /**
         * Show supplier selection
         */
        _showSupplierSelection: function () {
            this.$('#supplier-selection-modal').modal('show');
        },

        /**
         * Show supplier details
         */
        _showSupplierDetails: function (supplierId) {
            var self = this;

            ajax.jsonRpc('/api/merchant/supplier/get', 'call', {
                supplier_id: supplierId
            }).then(function (data) {
                if (data.success) {
                    self._displaySupplierModal(data.supplier);
                }
            });
        },

        /**
         * Display supplier modal
         */
        _displaySupplierModal: function (supplier) {
            var modalHtml = '<div class="modal fade" id="supplierDetailsModal" tabindex="-1">' +
                '<div class="modal-dialog">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title">' + supplier.name + '</h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
                '</div>' +
                '<div class="modal-body">' +
                '<p>' + (supplier.description || '') + '</p>' +
                '<p><strong>' + _t('Délai de livraison') + ':</strong> ' + (supplier.delivery_time || '') + '</p>' +
                '<p><strong>' + _t('Contact') + ':</strong> ' + (supplier.phone || '') + '</p>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' + _t('Fermer') + '</button>' +
                '<button type="button" class="btn btn-primary" id="select-supplier-btn" data-supplier-id="' + supplier.id + '">' + _t('Sélectionner') + '</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';

            // Remove existing modal
            $('#supplierDetailsModal').remove();

            // Add modal to body
            $('body').append(modalHtml);

            // Show modal
            var modal = new bootstrap.Modal(document.getElementById('supplierDetailsModal'));
            modal.show();

            // Handle select button
            $('#select-supplier-btn').on('click', function () {
                this._selectSupplier(supplier);
                modal.hide();
            }.bind(this));
        },

        /**
         * Clear order
         */
        _clearOrder: function () {
            this.orderItems = [];
            this._saveOrderToStorage();
            this._updateOrderDisplay();
        },

        /**
         * Save order to session storage
         */
        _saveOrderToStorage: function () {
            try {
                sessionStorage.setItem('merchant_purchase_order', JSON.stringify(this.orderItems));
            } catch (e) {
                console.error('Error saving order to storage:', e);
            }
        },

        /**
         * Load order from session storage
         */
        _loadOrderFromStorage: function () {
            try {
                var saved = sessionStorage.getItem('merchant_purchase_order');
                if (saved) {
                    this.orderItems = JSON.parse(saved);
                }
            } catch (e) {
                console.error('Error loading order from storage:', e);
                this.orderItems = [];
            }
        },

        /**
         * Check offline status
         */
        _checkOfflineStatus: function () {
            if (!navigator.onLine) {
                this._showOfflineWarning();
            }
        },

        /**
         * Show offline warning
         */
        _showOfflineWarning: function () {
            this._showNotification(_t('Mode hors ligne: Les commandes seront synchronisées plus tard'), 'warning');
        },

        /**
         * Show product error
         */
        _showProductError: function (error) {
            this._showNotification(error || _t('Erreur lors du chargement des produits'), 'error');
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
        }
    });

    // Register widget
    publicWidget.registry.MerchantPurchase = MerchantPurchase;

    return {
        MerchantPurchase: MerchantPurchase
    };
});