/* IFN Portal Merchant Stock JavaScript */
/* ====================================== */

odoo.define('ifn_portal_merchant.stock', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var ajax = require('web.ajax');

    var _t = core._t;

    var MerchantStock = publicWidget.Widget.extend({
        selector: '.ifn-merchant-stock',
        events: {
            'click .btn-adjust-stock': '_onAdjustStockClick',
            'click .btn-reorder': '_onReorderClick',
            'click .btn-quick-inventory': '_onQuickInventoryClick',
            'change .stock-quantity-input': '_onQuantityChange',
            'click .btn-save-adjustment': '_onSaveAdjustment',
            'click .btn-cancel-adjustment': '_onCancelAdjustment',
            'submit #stock-search-form': '_onStockSearch',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.stockData = [];
            this.editingProductId = null;
            this.originalQuantities = {};
        },

        /**
         * Initialize stock management
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._loadStockData();
                self._loadStockMovements();
                self._initializeStockAlerts();
                self._checkOfflineStatus();
            });
        },

        /**
         * Load stock data
         */
        _loadStockData: function () {
            var self = this;

            this._showLoading();

            ajax.jsonRpc('/api/merchant/stock/list', 'call', {})
                .then(function (data) {
                    if (data.success) {
                        self.stockData = data.products;
                        self._renderStockTable();
                        self._updateStockStats();
                    } else {
                        self._showStockError(data.error);
                    }
                })
                .fail(function () {
                    self._showStockError(_t('Erreur réseau'));
                })
                .always(function () {
                    self._hideLoading();
                });
        },

        /**
         * Load stock movements
         */
        _loadStockMovements: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/stock/movements', 'call', {
                limit: 10
            }).then(function (data) {
                if (data.success) {
                    self._renderStockMovements(data.movements);
                }
            });
        },

        /**
         * Initialize stock alerts
         */
        _initializeStockAlerts: function () {
            var self = this;

            // Check for stock alerts
            ajax.jsonRpc('/api/merchant/stock/alerts', 'call', {})
                .then(function (data) {
                    if (data.success && data.alerts.length > 0) {
                        self._showStockAlerts(data.alerts);
                    }
                });

            // Set up periodic alert checking
            setInterval(function () {
                if (navigator.onLine) {
                    self._checkStockAlerts();
                }
            }, 60000); // Check every minute
        },

        /**
         * Check stock alerts
         */
        _checkStockAlerts: function () {
            var self = this;

            ajax.jsonRpc('/api/merchant/stock/check_alerts', 'call', {})
                .then(function (data) {
                    if (data.success && data.new_alerts > 0) {
                        self._showNotification(_t('%d nouvelles alertes de stock').replace('%d', data.new_alerts), 'warning');
                        self._loadStockData(); // Refresh data
                    }
                });
        },

        /**
         * Render stock table
         */
        _renderStockTable: function () {
            var self = this;
            var tbody = this.$('#stock-table tbody');

            if (!tbody.length) {
                return;
            }

            if (this.stockData.length === 0) {
                tbody.html('<tr><td colspan="6" class="text-center text-muted">' + _t('Aucun produit en stock') + '</td></tr>');
                return;
            }

            var html = this.stockData.map(function (product) {
                var statusClass = self._getStockStatusClass(product);
                var statusBadge = self._getStockStatusBadge(product);

                return '<tr data-product-id="' + product.id + '">' +
                    '<td>' +
                    '<div class="d-flex align-items-center">' +
                    '<div class="product-info">' +
                    '<strong>' + product.name + '</strong>' +
                    '<br><small class="text-muted">' + (product.code || '') + '</small>' +
                    '</div>' +
                    '</div>' +
                    '</td>' +
                    '<td>' +
                    '<span class="quantity-display" data-quantity="' + product.quantity + '">' + product.quantity + ' ' + product.unit + '</span>' +
                    '<input type="number" class="form-control form-control-sm stock-quantity-input" style="display: none;" value="' + product.quantity + '" min="0" step="1"/>' +
                    '</td>' +
                    '<td>' + product.threshold + ' ' + product.unit + '</td>' +
                    '<td>' + statusBadge + '</td>' +
                    '<td>' +
                    '<div class="stock-percentage">' +
                    '<div class="progress" style="height: 8px;">' +
                    '<div class="progress-bar ' + statusClass + '" role="progressbar" style="width: ' + self._calculateStockPercentage(product) + '%"></div>' +
                    '</div>' +
                    '<small class="text-muted">' + self._calculateStockPercentage(product).toFixed(0) + '%</small>' +
                    '</div>' +
                    '</td>' +
                    '<td>' +
                    '<div class="btn-group btn-group-sm">' +
                    '<button class="btn btn-outline-primary btn-adjust-stock" data-product-id="' + product.id + '" title="Ajuster le stock">' +
                    '<i class="fa fa-edit"></i>' +
                    '</button>' +
                    '<button class="btn btn-outline-success btn-reorder" data-product-id="' + product.id + '" title="Réapprovisionner" ' + (product.status === 'ok' ? 'disabled' : '') + '>' +
                    '<i class="fa fa-redo"></i>' +
                    '</button>' +
                    '<button class="btn btn-outline-info btn-history" data-product-id="' + product.id + '" title="Voir l\'historique">' +
                    '<i class="fa fa-history"></i>' +
                    '</button>' +
                    '</div>' +
                    '</td>' +
                    '</tr>';
            }).join('');

            tbody.html(html);
        },

        /**
         * Get stock status class
         */
        _getStockStatusClass: function (product) {
            if (product.quantity === 0) {
                return 'bg-danger';
            } else if (product.quantity <= product.threshold * 0.5) {
                return 'bg-danger';
            } else if (product.quantity <= product.threshold) {
                return 'bg-warning';
            } else {
                return 'bg-success';
            }
        },

        /**
         * Get stock status badge
         */
        _getStockStatusBadge: function (product) {
            var badgeClass, statusText;

            if (product.quantity === 0) {
                badgeClass = 'bg-danger';
                statusText = _t('Rupture');
            } else if (product.quantity <= product.threshold * 0.5) {
                badgeClass = 'bg-danger';
                statusText = _t('Critique');
            } else if (product.quantity <= product.threshold) {
                badgeClass = 'bg-warning';
                statusText = _t('Bas');
            } else {
                badgeClass = 'bg-success';
                statusText = _t('OK');
            }

            return '<span class="badge ' + badgeClass + '">' + statusText + '</span>';
        },

        /**
         * Calculate stock percentage
         */
        _calculateStockPercentage: function (product) {
            if (product.threshold === 0) {
                return 100;
            }
            return Math.min((product.quantity / product.threshold) * 100, 200); // Cap at 200% for display
        },

        /**
         * Render stock movements
         */
        _renderStockMovements: function (movements) {
            var container = this.$('#stock-movements');

            if (!container.length) {
                return;
            }

            if (movements.length === 0) {
                container.html('<div class="text-center text-muted py-4">' +
                    '<i class="fa fa-history fa-2x mb-3"></i><br>' +
                    _t('Aucun mouvement récent') +
                    '</div>');
                return;
            }

            var html = movements.map(function (movement) {
                var iconClass = movement.type === 'in' ? 'fa-arrow-down text-success' : 'fa-arrow-up text-danger';
                var actionText = movement.type === 'in' ? _t('Entrée') : _t('Sortie');

                return '<div class="timeline-item">' +
                    '<div class="timeline-marker">' +
                    '<i class="fa ' + iconClass + '"></i>' +
                    '</div>' +
                    '<div class="timeline-content">' +
                    '<div class="d-flex justify-content-between align-items-start">' +
                    '<div>' +
                    '<strong>' + movement.product_name + '</strong><br>' +
                    '<span class="badge bg-' + (movement.type === 'in' ? 'success' : 'danger') + ' me-2">' + actionText + '</span>' +
                    '<span class="text-muted">' + Math.abs(movement.quantity) + ' ' + movement.unit + '</span>' +
                    '</div>' +
                    '<div class="text-end">' +
                    '<small class="text-muted">' + new Date(movement.date).toLocaleString() + '</small><br>' +
                    '<span class="text-muted">' + movement.reason + '</span>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }).join('');

            container.html('<div class="stock-timeline">' + html + '</div>');
        },

        /**
         * Update stock statistics
         */
        _updateStockStats: function () {
            var totalProducts = this.stockData.length;
            var criticalProducts = this.stockData.filter(function (p) { return p.status === 'critical'; }).length;
            var lowProducts = this.stockData.filter(function (p) { return p.status === 'low'; }).length;
            var okProducts = this.stockData.filter(function (p) { return p.status === 'ok'; }).length;

            this.$('#total-products').text(totalProducts);
            this.$('#critical-products').text(criticalProducts);
            this.$('#low-products').text(lowProducts);
            this.$('#ok-products').text(okProducts);

            // Update chart if exists
            this._updateStockChart(criticalProducts, lowProducts, okProducts);
        },

        /**
         * Update stock chart
         */
        _updateStockChart: function (critical, low, ok) {
            // Implementation for stock chart using Chart.js or similar
            console.log('Stock stats:', {critical: critical, low: low, ok: ok});
        },

        /**
         * Handle adjust stock click
         */
        _onAdjustStockClick: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var productId = button.data('product-id');
            this._startStockEdit(productId);
        },

        /**
         * Handle reorder click
         */
        _onReorderClick: function (e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            var productId = button.data('product-id');
            this._createReorder(productId);
        },

        /**
         * Handle quick inventory click
         */
        _onQuickInventoryClick: function (e) {
            e.preventDefault();
            this._startQuickInventory();
        },

        /**
         * Handle quantity change
         */
        _onQuantityChange: function (e) {
            var input = $(e.currentTarget);
            var newQuantity = parseFloat(input.val());
            var productId = input.closest('tr').data('product-id');

            if (newQuantity < 0) {
                input.val(0);
            }
        },

        /**
         * Handle save adjustment
         */
        _onSaveAdjustment: function (e) {
            e.preventDefault();
            this._saveStockAdjustment();
        },

        /**
         * Handle cancel adjustment
         */
        _onCancelAdjustment: function (e) {
            e.preventDefault();
            this._cancelStockEdit();
        },

        /**
         * Handle stock search
         */
        _onStockSearch: function (e) {
            e.preventDefault();
            var searchTerm = this.$('#stock-search-input').val().toLowerCase();
            this._filterStockTable(searchTerm);
        },

        /**
         * Start stock edit
         */
        _startStockEdit: function (productId) {
            if (this.editingProductId && this.editingProductId !== productId) {
                this._cancelStockEdit();
            }

            this.editingProductId = productId;
            var row = this.$('tr[data-product-id="' + productId + '"]');
            var quantityDisplay = row.find('.quantity-display');
            var quantityInput = row.find('.stock-quantity-input');
            var adjustBtn = row.find('.btn-adjust-stock');

            // Store original quantity
            this.originalQuantities[productId] = parseFloat(quantityDisplay.data('quantity'));

            // Show input, hide display
            quantityDisplay.hide();
            quantityInput.show().focus();

            // Change button group
            adjustBtn.hide();
            row.find('.btn-reorder').hide();
            row.find('.btn-history').hide();

            // Add save/cancel buttons
            var actionCell = row.find('td:last');
            actionCell.append(
                '<button class="btn btn-success btn-sm btn-save-adjustment me-1" title="Enregistrer">' +
                '<i class="fa fa-check"></i>' +
                '</button>' +
                '<button class="btn btn-secondary btn-sm btn-cancel-adjustment" title="Annuler">' +
                '<i class="fa fa-times"></i>' +
                '</button>'
            );
        },

        /**
         * Save stock adjustment
         */
        _saveStockAdjustment: function () {
            if (!this.editingProductId) {
                return;
            }

            var self = this;
            var row = this.$('tr[data-product-id="' + this.editingProductId + '"]');
            var quantityInput = row.find('.stock-quantity-input');
            var newQuantity = parseFloat(quantityInput.val());
            var originalQuantity = this.originalQuantities[this.editingProductId];
            var adjustment = newQuantity - originalQuantity;

            if (adjustment === 0) {
                this._cancelStockEdit();
                return;
            }

            var adjustmentData = {
                product_id: this.editingProductId,
                adjustment: adjustment,
                new_quantity: newQuantity,
                reason: adjustment > 0 ? _t('Ajustement manuel - Entrée') : _t('Ajustement manuel - Sortie')
            };

            if (!navigator.onLine) {
                this._processOfflineAdjustment(adjustmentData);
                return;
            }

            this._showLoading();

            ajax.jsonRpc('/api/merchant/stock/adjust', 'call', adjustmentData)
                .then(function (data) {
                    if (data.success) {
                        self._handleAdjustmentSuccess(self.editingProductId, newQuantity);
                        self._showNotification(_t('Ajustement de stock enregistré'), 'success');
                    } else {
                        self._showNotification(data.error || _t('Erreur lors de l\'ajustement'), 'error');
                    }
                })
                .fail(function () {
                    self._processOfflineAdjustment(adjustmentData);
                })
                .always(function () {
                    self._hideLoading();
                });
        },

        /**
         * Process offline adjustment
         */
        _processOfflineAdjustment: function (adjustmentData) {
            var self = this;

            // Add to offline queue
            require('ifn_portal_merchant.offline').call('addToQueue', 'stock_adjust', adjustmentData)
                .then(function (result) {
                    if (result.success) {
                        self._handleAdjustmentSuccess(adjustmentData.product_id, adjustmentData.new_quantity);
                        self._showNotification(_t('Ajustement enregistré localement'), 'info');
                    }
                });
        },

        /**
         * Handle adjustment success
         */
        _handleAdjustmentSuccess: function (productId, newQuantity) {
            var row = this.$('tr[data-product-id="' + productId + '"]');
            var quantityDisplay = row.find('.quantity-display');
            var product = this.stockData.find(function (p) { return p.id === productId; });

            if (product) {
                product.quantity = newQuantity;
                product.status = this._calculateStockStatus(product);
            }

            quantityDisplay.text(newQuantity + ' ' + (product ? product.unit : '')).data('quantity', newQuantity);
            this._cancelStockEdit();
            this._updateProductDisplay(productId);
            this._updateStockStats();
        },

        /**
         * Cancel stock edit
         */
        _cancelStockEdit: function () {
            if (!this.editingProductId) {
                return;
            }

            var row = this.$('tr[data-product-id="' + this.editingProductId + '"]');
            var quantityDisplay = row.find('.quantity-display');
            var quantityInput = row.find('.stock-quantity-input');
            var adjustBtn = row.find('.btn-adjust-stock');
            var reorderBtn = row.find('.btn-reorder');
            var historyBtn = row.find('.btn-history');

            // Restore original quantity
            if (this.originalQuantities[this.editingProductId] !== undefined) {
                quantityInput.val(this.originalQuantities[this.editingProductId]);
            }

            // Show display, hide input
            quantityDisplay.show();
            quantityInput.hide();

            // Restore buttons
            adjustBtn.show();
            reorderBtn.show();
            historyBtn.show();

            // Remove save/cancel buttons
            row.find('.btn-save-adjustment, .btn-cancel-adjustment').remove();

            delete this.originalQuantities[this.editingProductId];
            this.editingProductId = null;
        },

        /**
         * Create reorder
         */
        _createReorder: function (productId) {
            var product = this.stockData.find(function (p) { return p.id === productId; });
            if (!product) {
                return;
            }

            // Redirect to purchase page with pre-selected product
            window.location.href = '/portal/merchant/purchase?product=' + productId + '&quantity=' + (product.threshold * 2);
        },

        /**
         * Start quick inventory
         */
        _startQuickInventory: function () {
            var self = this;

            // Show modal for quick inventory
            this._showQuickInventoryModal().then(function (result) {
                if (result) {
                    self._processQuickInventory(result);
                }
            });
        },

        /**
         * Show quick inventory modal
         */
        _showQuickInventoryModal: function () {
            return new Promise(function (resolve) {
                // Implementation for quick inventory modal
                // For now, return mock data
                resolve([
                    {product_id: 1, quantity: 25},
                    {product_id: 2, quantity: 15},
                    {product_id: 3, quantity: 30}
                ]);
            });
        },

        /**
         * Process quick inventory
         */
        _processQuickInventory: function (inventoryData) {
            var self = this;

            inventoryData.forEach(function (item) {
                var product = self.stockData.find(function (p) { return p.id === item.product_id; });
                if (product) {
                    var adjustment = item.quantity - product.quantity;
                    if (Math.abs(adjustment) > 0.01) {
                        var adjustmentData = {
                            product_id: item.product_id,
                            adjustment: adjustment,
                            new_quantity: item.quantity,
                            reason: _t('Inventaire rapide')
                        };

                        if (!navigator.onLine) {
                            require('ifn_portal_merchant.offline').call('addToQueue', 'stock_adjust', adjustmentData);
                        } else {
                            ajax.jsonRpc('/api/merchant/stock/adjust', 'call', adjustmentData);
                        }

                        product.quantity = item.quantity;
                        product.status = self._calculateStockStatus(product);
                    }
                }
            });

            this._renderStockTable();
            this._updateStockStats();
            this._showNotification(_t('Inventaire enregistré'), 'success');
        },

        /**
         * Calculate stock status
         */
        _calculateStockStatus: function (product) {
            if (product.quantity === 0) {
                return 'critical';
            } else if (product.quantity <= product.threshold * 0.5) {
                return 'critical';
            } else if (product.quantity <= product.threshold) {
                return 'low';
            } else {
                return 'ok';
            }
        },

        /**
         * Update product display
         */
        _updateProductDisplay: function (productId) {
            var product = this.stockData.find(function (p) { return p.id === productId; });
            if (!product) {
                return;
            }

            var row = this.$('tr[data-product-id="' + productId + '"]');

            // Update status badge
            var statusBadge = this._getStockStatusBadge(product);
            row.find('td:nth-child(4)').html(statusBadge);

            // Update progress bar
            var percentage = this._calculateStockPercentage(product);
            var statusClass = this._getStockStatusClass(product);
            var progressBar = row.find('.progress-bar');
            progressBar.removeClass('bg-success bg-warning bg-danger').addClass(statusClass);
            progressBar.css('width', percentage + '%');
            progressBar.attr('aria-valuenow', percentage);
            row.find('.stock-percentage small').text(percentage.toFixed(0) + '%');

            // Update reorder button
            var reorderBtn = row.find('.btn-reorder');
            if (product.status === 'ok') {
                reorderBtn.prop('disabled', true);
            } else {
                reorderBtn.prop('disabled', false);
            }
        },

        /**
         * Filter stock table
         */
        _filterStockTable: function (searchTerm) {
            var self = this;
            var rows = this.$('#stock-table tbody tr');

            rows.each(function () {
                var row = $(this);
                var productId = row.data('product-id');
                var product = self.stockData.find(function (p) { return p.id === productId; });

                if (product) {
                    var matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                                     (product.code && product.code.toLowerCase().includes(searchTerm));

                    if (matchesSearch) {
                        row.show();
                    } else {
                        row.hide();
                    }
                }
            });
        },

        /**
         * Show stock alerts
         */
        _showStockAlerts: function (alerts) {
            var self = this;

            alerts.forEach(function (alert) {
                var message = _t('Alerte de stock: %s - %s %s restants')
                    .replace('%s', alert.product_name)
                    .replace('%s', alert.quantity)
                    .replace('%s', alert.unit);

                self._showNotification(message, 'warning');
            });
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
            this._showNotification(_t('Mode hors ligne: Les ajustements seront synchronisés plus tard'), 'warning');
        },

        /**
         * Show loading
         */
        _showLoading: function () {
            $('body').addClass('loading');
        },

        /**
         * Hide loading
         */
        _hideLoading: function () {
            $('body').removeClass('loading');
        },

        /**
         * Show stock error
         */
        _showStockError: function (error) {
            this._showNotification(error || _t('Erreur lors du chargement des stocks'), 'error');
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
        }
    });

    // Register widget
    publicWidget.registry.MerchantStock = MerchantStock;

    return {
        MerchantStock: MerchantStock
    };
});