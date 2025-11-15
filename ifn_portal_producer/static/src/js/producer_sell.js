/* ==========================================================================
   IFN Portal Producer - Sell Management JavaScript
   Gestion de la mise en vente des produits
   ========================================================================== */

odoo.define('ifn_portal_producer.sell', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var ProducerSell = publicWidget.Widget.extend({
        selector: '.producer-sell-page',
        events: {
            'click #publishOfferBtn': '_onPublishOffer',
            'submit #sellForm': '_onSubmitSellForm',
            'input input[name="quantity"]': '_onQuantityChange',
            'input input[name="price"]': '_onPriceChange',
            'click .pause-offer-btn': '_onPauseOffer',
            'click .delete-offer-btn': '_onDeleteOffer',
            'click .edit-offer-btn': '_onEditOffer',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.currentHarvest = null;
            this.selectedHarvestId = null;
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);

            // Initialiser les interactions
            this._initializeInteractions();

            // Charger les données existantes
            this._loadOffersData();

            // Gérer le mode hors ligne
            this._handleOfflineMode();

            return this;
        },

        /**
         * Initialise les interactions de la page vente
         */
        _initializeInteractions: function () {
            var self = this;

            // Initialiser les tooltips
            this.$('[data-bs-toggle="tooltip"]').tooltip();

            // Animation des cartes de récolte
            this.$('.harvest-card').hover(
                function () {
                    $(this).addClass('shadow-lg');
                },
                function () {
                    $(this).removeClass('shadow-lg');
                }
            );

            // Validation du formulaire en temps réel
            this._initializeFormValidation();

            // Auto-calcul du total
            this._setupAutoCalculation();
        },

        /**
         * Initialise la validation du formulaire de vente
         */
        _initializeFormValidation: function () {
            var self = this;

            this.$('#sellForm').validate({
                rules: {
                    quantity: {
                        required: true,
                        number: true,
                        min: 0.1,
                        max: function () {
                            return parseFloat(self.$('#availableQuantity').text()) || 0;
                        }
                    },
                    price: {
                        required: true,
                        number: true,
                        min: 1,
                        max: 999999
                    }
                },
                messages: {
                    quantity: {
                        required: "Veuillez indiquer la quantité",
                        number: "Veuillez entrer un nombre valide",
                        min: "La quantité doit être supérieure à 0",
                        max: "La quantité ne peut pas dépasser la quantité disponible"
                    },
                    price: {
                        required: "Veuillez indiquer le prix",
                        number: "Veuillez entrer un nombre valide",
                        min: "Le prix doit être supérieur à 0",
                        max: "Le prix semble trop élevé"
                    }
                },
                errorElement: 'div',
                errorClass: 'invalid-feedback',
                highlight: function (element) {
                    $(element).addClass('is-invalid');
                },
                unhighlight: function (element) {
                    $(element).removeClass('is-invalid');
                }
            });
        },

        /**
         * Configure le calcul automatique du total
         */
        _setupAutoCalculation: function () {
            var self = this;

            function calculateTotal() {
                var quantity = parseFloat(self.$('#sellQuantity').val()) || 0;
                var price = parseFloat(self.$('#sellPrice').val()) || 0;
                var total = quantity * price;

                self.$('#totalPrice').text(total.toLocaleString('fr-FR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }));
            }

            this.$('#sellQuantity, #sellPrice').on('input', calculateTotal);
        },

        /**
         * Affiche le modal de vente avec les données de la récolte
         */
        showSellModal: function (btn) {
            var self = this;
            var harvestId = $(btn).data('harvest-id');

            // Récupérer les détails de la récolte
            rpc.query({
                route: '/portal/producer/api/harvest/details',
                params: { harvest_id: harvestId }
            }).then(function (harvest) {
                if (harvest) {
                    self._populateSellModal(harvest);
                    self.selectedHarvestId = harvestId;

                    // Afficher le modal
                    var modal = new bootstrap.Modal(self.$('#sellModal')[0]);
                    modal.show();
                } else {
                    self._showNotification('Récolte introuvable', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion', 'error');
            });
        },

        /**
         * Remplit le modal de vente avec les données de la récolte
         */
        _populateSellModal: function (harvest) {
            this.currentHarvest = harvest;

            // Mettre à jour les informations
            this.$('#harvestId').val(harvest.id);
            this.$('#availableQuantity').text(harvest.quantity_available);

            // Pré-remplir la quantité avec la quantité disponible
            this.$('#sellQuantity').val(harvest.quantity_available);
            this.$('#sellQuantity').attr('max', harvest.quantity_available);

            // Suggérer un prix basé sur le marché
            this._suggestPrice(harvest.product_id.id);

            // Réinitialiser les autres champs
            this.$('#sellPrice').val('');
            this.$('#totalPrice').text('0');
            this.$('textarea[name="description"]').val('');

            // Effacer les erreurs de validation
            this.$('.is-invalid').removeClass('is-invalid');
            this.$('.invalid-feedback').remove();
        },

        /**
         * Suggère un prix basé sur les données du marché
         */
        _suggestPrice: function (productId) {
            var self = this;
            rpc.query({
                route: '/portal/producer/api/market/price',
                params: { product_id: productId }
            }).then(function (data) {
                if (data && data.suggested_price) {
                    self.$('#sellPrice').val(data.suggested_price);
                    self._updatePriceInfo(data);
                }
            }).fail(function () {
                // Silent fail - l'utilisateur pourra définir son propre prix
            });
        },

        /**
         * Met à jour les informations sur le prix
         */
        _updatePriceInfo: function (priceData) {
            var $priceInfo = this.$('#priceInfo');
            if ($priceInfo.length === 0) {
                $priceInfo = $('<div id="priceInfo" class="alert alert-info mt-2"></div>');
                this.$('#sellPrice').after($priceInfo);
            }

            var info = '<small><i class="fa fa-info-circle me-1"></i>';
            if (priceData.market_average) {
                info += 'Prix moyen du marché: <strong>' + priceData.market_average + ' FCFA/kg</strong><br>';
            }
            if (priceData.last_sold_price) {
                info += 'Votre dernière vente: <strong>' + priceData.last_sold_price + ' FCFA/kg</strong>';
            }
            info += '</small>';

            $priceInfo.html(info);
        },

        /**
         * Gère la publication d'une offre
         */
        _onPublishOffer: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin me-2"></i>Publication...');

            var formData = this._getSellFormData();

            // Validation supplémentaire
            if (!this._validateSellData(formData)) {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-tag me-2"></i>Publier l\'offre');
                return;
            }

            // Préparer les données pour l'API
            var apiData = {
                harvest_id: this.selectedHarvestId,
                quantity: parseFloat(formData.quantity),
                price: parseFloat(formData.price),
                description: formData.description || ''
            };

            this._publishOffer(apiData).then(function (result) {
                if (result.success) {
                    self._showNotification('Offre publiée avec succès', 'success');
                    self._resetSellForm();
                    self._refreshOffersList();

                    // Fermer le modal
                    var modal = bootstrap.Modal.getInstance(self.$('#sellModal')[0]);
                    if (modal) {
                        modal.hide();
                    }

                    // Mettre à jour l'état de la récolte
                    self._updateHarvestStatus(self.selectedHarvestId, 'published');
                } else {
                    self._showNotification(result.message || 'Erreur lors de la publication', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion. L\'offre sera synchronisée ultérieurement.', 'warning');
                self._saveOfferOffline(apiData);
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-tag me-2"></i>Publier l\'offre');
            });
        },

        /**
         * Gère la soumission du formulaire
         */
        _onSubmitSellForm: function (ev) {
            ev.preventDefault();
            this._onPublishOffer(ev);
        },

        /**
         * Récupère les données du formulaire de vente
         */
        _getSellFormData: function () {
            var form = this.$('#sellForm')[0];
            var formData = new FormData(form);
            var data = {};

            formData.forEach(function (value, key) {
                data[key] = value;
            });

            return data;
        },

        /**
         * Valide les données de vente supplémentaires
         */
        _validateSellData: function (data) {
            // Validation métier

            // Vérifier que le prix est raisonnable
            if (data.price < 10) {
                this._showNotification('Le prix semble très bas. Le minimum est de 10 FCFA/kg.', 'warning');
                return false;
            }

            if (data.price > 100000) {
                this._showNotification('Le prix semble très élevé. Veuillez vérifier.', 'warning');
                return false;
            }

            // Vérifier que la quantité est disponible
            var available = parseFloat(this.$('#availableQuantity').text()) || 0;
            if (data.quantity > available) {
                this._showNotification('La quantité demandée dépasse la quantité disponible.', 'error');
                return false;
            }

            // Calculer le total et vérifier
            var total = data.quantity * data.price;
            if (total > 10000000) { // 10 millions FCFA
                this._showNotification('Le montant total semble très élevé. Veuillez vérifier.', 'warning');
                return false;
            }

            return true;
        },

        /**
         * Publie l'offre via API
         */
        _publishOffer: function (data) {
            return rpc.query({
                route: '/portal/producer/api/offer/publish',
                params: data
            });
        },

        /**
         * Sauvegarde l'offre en mode hors ligne
         */
        _saveOfferOffline: function (data) {
            var offlineOffers = JSON.parse(localStorage.getItem('ifn_offline_offers') || '[]');

            // Ajouter un ID temporaire et des métadonnées
            data.temp_id = 'temp_offer_' + Date.now();
            data.created_at = new Date().toISOString();
            data.sync_status = 'pending';
            data.harvest_id = this.selectedHarvestId;

            offlineOffers.push(data);
            localStorage.setItem('ifn_offline_offers', JSON.stringify(offlineOffers));

            // Ajouter à la liste locale
            this._addOfferToList(data, true);

            this._showNotification('Offre enregistrée localement. Synchronisation automatique à la reconnexion.', 'info');

            // Fermer le modal
            var modal = bootstrap.Modal.getInstance(this.$('#sellModal')[0]);
            if (modal) {
                modal.hide();
            }
        },

        /**
         * Gère le changement de quantité
         */
        _onQuantityChange: function (ev) {
            var $input = $(ev.currentTarget);
            var value = parseFloat($input.val());
            var max = parseFloat($input.attr('max')) || 0;

            // Validation en temps réel
            if (value <= 0) {
                $input.addClass('is-invalid');
                this._showFieldError($input, 'La quantité doit être supérieure à 0');
            } else if (value > max) {
                $input.addClass('is-invalid');
                this._showFieldError($input, 'Quantité supérieure à la quantité disponible');
            } else {
                $input.removeClass('is-invalid');
                this._clearFieldError($input);
            }
        },

        /**
         * Gère le changement de prix
         */
        _onPriceChange: function (ev) {
            var $input = $(ev.currentTarget);
            var value = parseFloat($input.val());

            // Validation en temps réel
            if (value <= 0) {
                $input.addClass('is-invalid');
                this._showFieldError($input, 'Le prix doit être supérieur à 0');
            } else if (value > 100000) {
                $input.addClass('is-invalid');
                this._showFieldError($input, 'Prix trop élevé');
            } else {
                $input.removeClass('is-invalid');
                this._clearFieldError($input);
            }

            // Mettre à jour le total automatiquement
            this._updateTotal();
        },

        /**
         * Met à jour le montant total
         */
        _updateTotal: function () {
            var quantity = parseFloat(this.$('#sellQuantity').val()) || 0;
            var price = parseFloat(this.$('#sellPrice').val()) || 0;
            var total = quantity * price;

            this.$('#totalPrice').text(total.toLocaleString('fr-FR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }));
        },

        /**
         * Gère la pause d'une offre
         */
        _onPauseOffer: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var offerId = $btn.data('offer-id');

            if (confirm('Êtes-vous sûr de vouloir mettre cette offre en pause ?')) {
                $btn.prop('disabled', true)
                    .html('<i class="fa fa-spinner fa-spin"></i>');

                rpc.query({
                    route: '/portal/producer/api/offer/pause',
                    params: { offer_id: offerId }
                }).then(function (result) {
                    if (result.success) {
                        self._showNotification('Offre mise en pause', 'success');
                        self._refreshOffersList();
                    } else {
                        self._showNotification('Erreur lors de la mise en pause', 'error');
                    }
                }).fail(function () {
                    self._showNotification('Erreur de connexion', 'error');
                }).always(function () {
                    $btn.prop('disabled', false)
                        .html('<i class="fa fa-pause"></i>');
                });
            }
        },

        /**
         * Gère la suppression d'une offre
         */
        _onDeleteOffer: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var offerId = $btn.data('offer-id');

            if (confirm('Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.')) {
                $btn.prop('disabled', true)
                    .html('<i class="fa fa-spinner fa-spin"></i>');

                rpc.query({
                    route: '/portal/producer/api/offer/delete',
                    params: { offer_id: offerId }
                }).then(function (result) {
                    if (result.success) {
                        self._showNotification('Offre supprimée', 'success');
                        self._refreshOffersList();
                    } else {
                        self._showNotification('Erreur lors de la suppression', 'error');
                    }
                }).fail(function () {
                    self._showNotification('Erreur de connexion', 'error');
                }).always(function () {
                    $btn.prop('disabled', false)
                        .html('<i class="fa fa-trash"></i>');
                });
            }
        },

        /**
         * Gère le mode hors ligne
         */
        _handleOfflineMode: function () {
            var self = this;

            window.addEventListener('online', function () {
                self._syncOfflineOffers();
            });

            // Si on est en ligne, synchroniser les offres en attente
            if (navigator.onLine) {
                this._syncOfflineOffers();
            }
        },

        /**
         * Synchronise les offres hors ligne
         */
        _syncOfflineOffers: function () {
            var self = this;
            var offlineOffers = JSON.parse(localStorage.getItem('ifn_offline_offers') || '[]');

            if (offlineOffers.length === 0) {
                return;
            }

            offlineOffers.forEach(function (offer, index) {
                if (offer.sync_status === 'pending') {
                    self._publishOffer(offer).then(function (result) {
                        if (result.success) {
                            // Mettre à jour le statut de synchronisation
                            offer.sync_status = 'synced';
                            offer.offer_id = result.offer_id;

                            // Mettre à jour le stockage local
                            offlineOffers[index] = offer;
                            localStorage.setItem('ifn_offline_offers', JSON.stringify(offlineOffers));

                            // Mettre à jour l'interface
                            self._updateOfferStatus(offer.temp_id, 'synced');
                        }
                    }).fail(function () {
                        // Garder en statut pending pour réessayer plus tard
                    });
                }
            });
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

        /**
         * Affiche une erreur de champ
         */
        _showFieldError: function ($field, message) {
            var $feedback = $field.siblings('.invalid-feedback');
            if ($feedback.length === 0) {
                $feedback = $('<div class="invalid-feedback"></div>');
                $field.after($feedback);
            }
            $feedback.text(message);
        },

        /**
         * Efface l'erreur d'un champ
         */
        _clearFieldError: function ($field) {
            $field.siblings('.invalid-feedback').remove();
        },

        /**
         * Réinitialise le formulaire de vente
         */
        _resetSellForm: function () {
            this.$('#sellForm')[0].reset();
            this.$('#totalPrice').text('0');
            this.$('#priceInfo').remove();
            this.$('.is-invalid').removeClass('is-invalid');
            this.selectedHarvestId = null;
            this.currentHarvest = null;
        },

        /**
         * Rafraîchit la liste des offres
         */
        _refreshOffersList: function () {
            var self = this;
            rpc.query({
                route: '/portal/producer/api/offer/list',
                params: {}
            }).then(function (data) {
                self._updateOffersList(data);
            });
        },

        /**
         * Met à jour la liste des offres dans l'interface
         */
        _updateOffersList: function (offers) {
            // Implémentation de la mise à jour de la liste
            console.log('Mise à jour de la liste des offres:', offers);
        }
    });

    // Fonction globale pour le modal de vente (appelée depuis le template)
    window.showSellModal = function(btn) {
        var widget = $('body').data('producer-sell-widget');
        if (widget) {
            widget.showSellModal(btn);
        }
    };

    publicWidget.registry.producer_sell = ProducerSell;

    return {
        ProducerSell: ProducerSell,
        showSellModal: window.showSellModal
    };
});