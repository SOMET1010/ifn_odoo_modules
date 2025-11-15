/* ==========================================================================
   IFN Portal Producer - Harvest Management JavaScript
   Gestion des récoltes et formulaires associés
   ========================================================================== */

odoo.define('ifn_portal_producer.harvest', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var ProducerHarvest = publicWidget.Widget.extend({
        selector: '.producer-harvest-page',
        events: {
            'click #saveHarvestBtn': '_onSaveHarvest',
            'submit #addHarvestForm': '_onSubmitHarvestForm',
            'change input[name="quantity"]': '_onQuantityChange',
            'change select[name="product_id"]': '_onProductChange',
            'click .edit-harvest-btn': '_onEditHarvest',
            'click .delete-harvest-btn': '_onDeleteHarvest',
            'click .sell-harvest-btn': '_onSellHarvest',
            'click .harvest-photo-upload': '_onPhotoUpload',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.currentHarvestId = null;
            this.photoFiles = [];
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);

            // Initialiser le formulaire et la validation
            this._initializeFormValidation();

            // Charger les données existantes
            this._loadHarvestData();

            // Configurer le upload de photos
            this._setupPhotoUpload();

            // Gérer le mode hors ligne
            this._handleOfflineMode();

            return this;
        },

        /**
         * Initialise la validation du formulaire de récolte
         */
        _initializeFormValidation: function () {
            var self = this;

            // Validation en temps réel
            this.$('#addHarvestForm').validate({
                rules: {
                    product_id: {
                        required: true,
                        min: 1
                    },
                    quantity: {
                        required: true,
                        number: true,
                        min: 0.1,
                        max: 999999
                    },
                    quality: {
                        required: true
                    },
                    date_harvest: {
                        required: true,
                        date: true
                    }
                },
                messages: {
                    product_id: {
                        required: "Veuillez sélectionner un produit",
                        min: "Veuillez sélectionner un produit valide"
                    },
                    quantity: {
                        required: "Veuillez indiquer la quantité",
                        number: "Veuillez entrer un nombre valide",
                        min: "La quantité doit être supérieure à 0",
                        max: "La quantité semble trop élevée"
                    },
                    quality: {
                        required: "Veuillez sélectionner la qualité"
                    },
                    date_harvest: {
                        required: "Veuillez indiquer la date de récolte",
                        date: "Veuillez entrer une date valide"
                    }
                },
                errorElement: 'div',
                errorClass: 'invalid-feedback',
                highlight: function (element) {
                    $(element).addClass('is-invalid');
                },
                unhighlight: function (element) {
                    $(element).removeClass('is-invalid');
                },
                submitHandler: function (form) {
                    self._onSubmitHarvestForm();
                    return false;
                }
            });

            // Définir la date par défaut à aujourd'hui
            this.$('input[name="date_harvest"]').val(new Date().toISOString().split('T')[0]);

            // Limiter la date au maximum à aujourd'hui
            this.$('input[name="date_harvest"]').attr('max', new Date().toISOString().split('T')[0]);
        },

        /**
         * Gère la sauvegarde d'une récolte
         */
        _onSaveHarvest: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin me-2"></i>Enregistrement...');

            var formData = this._getFormData();

            // Validation supplémentaire
            if (!this._validateHarvestData(formData)) {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-save me-2"></i>Enregistrer');
                return;
            }

            // Préparer les données pour l'API
            var apiData = {
                product_id: parseInt(formData.product_id),
                quantity: parseFloat(formData.quantity),
                quality: formData.quality,
                date_harvest: formData.date_harvest,
                notes: formData.notes || '',
                photos: this.photoFiles
            };

            this._saveHarvest(apiData).then(function (result) {
                if (result.success) {
                    self._showNotification('Récolte enregistrée avec succès', 'success');
                    self._resetForm();
                    self._refreshHarvestList();

                    // Fermer le modal
                    var modal = bootstrap.Modal.getInstance(self.$('#addHarvestModal')[0]);
                    if (modal) {
                        modal.hide();
                    }
                } else {
                    self._showNotification(result.message || 'Erreur lors de l\'enregistrement', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion. Les données seront synchronisées ultérieurement.', 'warning');
                self._saveHarvestOffline(apiData);
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-save me-2"></i>Enregistrer');
            });
        },

        /**
         * Gère la soumission du formulaire
         */
        _onSubmitHarvestForm: function (ev) {
            ev.preventDefault();
            this._onSaveHarvest(ev);
        },

        /**
         * Récupère les données du formulaire
         */
        _getFormData: function () {
            var form = this.$('#addHarvestForm')[0];
            var formData = new FormData(form);
            var data = {};

            formData.forEach(function (value, key) {
                data[key] = value;
            });

            return data;
        },

        /**
         * Valide les données de récolte supplémentaires
         */
        _validateHarvestData: function (data) {
            // Validation métier

            // Vérifier que la quantité est raisonnable
            if (data.quantity > 100000) {
                this._showNotification('La quantité semble très élevée. Veuillez vérifier.', 'warning');
                return false;
            }

            // Vérifier que la date n'est pas dans le futur
            var harvestDate = new Date(data.date_harvest);
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            if (harvestDate > today) {
                this._showNotification('La date de récolte ne peut pas être dans le futur', 'warning');
                return false;
            }

            // Vérifier que la date n'est pas trop ancienne (plus de 30 jours)
            var thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (harvestDate < thirtyDaysAgo) {
                this._showNotification('La date de récolte semble trop ancienne. Veuillez vérifier.', 'warning');
                return false;
            }

            return true;
        },

        /**
         * Sauvegarde la récolte via API
         */
        _saveHarvest: function (data) {
            return rpc.query({
                route: '/portal/producer/api/harvest/create',
                params: data
            });
        },

        /**
         * Sauvegarde la récolte en mode hors ligne
         */
        _saveHarvestOffline: function (data) {
            var offlineHarvests = JSON.parse(localStorage.getItem('ifn_offline_harvests') || '[]');

            // Ajouter un ID temporaire et des métadonnées
            data.temp_id = 'temp_' + Date.now();
            data.created_at = new Date().toISOString();
            data.sync_status = 'pending';

            offlineHarvests.push(data);
            localStorage.setItem('ifn_offline_harvests', JSON.stringify(offlineHarvests));

            // Ajouter à la liste locale
            this._addHarvestToList(data, true);

            this._showNotification('Récolte enregistrée localement. Synchronisation automatique à la reconnexion.', 'info');
        },

        /**
         * Gère le changement de quantité
         */
        _onQuantityChange: function (ev) {
            var $input = $(ev.currentTarget);
            var value = parseFloat($input.val());

            // Validation en temps réel
            if (value <= 0) {
                $input.addClass('is-invalid');
                this._showFieldError($input, 'La quantité doit être supérieure à 0');
            } else if (value > 100000) {
                $input.addClass('is-invalid');
                this._showFieldError($input, 'Quantité trop élevée');
            } else {
                $input.removeClass('is-invalid');
                this._clearFieldError($input);
            }
        },

        /**
         * Gère le changement de produit
         */
        _onProductChange: function (ev) {
            var $select = $(ev.currentTarget);
            var productId = parseInt($select.val());

            if (productId > 0) {
                $select.removeClass('is-invalid');
                this._clearFieldError($select);

                // Pré-remplir des informations si nécessaire
                this._preloadProductInfo(productId);
            } else {
                $select.addClass('is-invalid');
                this._showFieldError($select, 'Veuillez sélectionner un produit');
            }
        },

        /**
         * Pré-charge des informations sur le produit
         */
        _preloadProductInfo: function (productId) {
            var self = this;
            rpc.query({
                route: '/portal/producer/api/product/info',
                params: { product_id: productId }
            }).then(function (info) {
                if (info && info.unit) {
                    // Mettre à jour l'unité si nécessaire
                    self.$('.quantity-unit').text(info.unit);
                }
            }).fail(function () {
                // Silent fail - continue avec les valeurs par défaut
            });
        },

        /**
         * Configure l'upload de photos
         */
        _setupPhotoUpload: function () {
            var self = this;

            // Initialiser le drag & drop
            this.$('.photo-drop-zone').on('dragover dragenter', function (e) {
                e.preventDefault();
                $(this).addClass('drag-over');
            }).on('dragleave dragend drop', function (e) {
                e.preventDefault();
                $(this).removeClass('drag-over');
            }).on('drop', function (e) {
                e.preventDefault();
                var files = e.originalEvent.dataTransfer.files;
                self._handlePhotoFiles(files);
            });

            // Clic sur le bouton d'upload
            this.$('.harvest-photo-upload').on('click', function () {
                self.$('input[type="file"]').click();
            });

            // Sélection de fichiers
            this.$('input[type="file"]').on('change', function (e) {
                var files = e.target.files;
                self._handlePhotoFiles(files);
            });
        },

        /**
         * Gère les fichiers photo uploadés
         */
        _handlePhotoFiles: function (files) {
            var self = this;
            var validFiles = [];

            // Valider chaque fichier
            Array.from(files).forEach(function (file) {
                if (self._validatePhotoFile(file)) {
                    validFiles.push(file);
                }
            });

            if (validFiles.length === 0) {
                return;
            }

            // Traiter les fichiers valides
            validFiles.forEach(function (file) {
                self._processPhotoFile(file);
            });
        },

        /**
         * Valide un fichier photo
         */
        _validatePhotoFile: function (file) {
            // Vérifier le type
            if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
                this._showNotification('Format d\'image non supporté. Utilisez JPG, PNG ou GIF.', 'error');
                return false;
            }

            // Vérifier la taille (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this._showNotification('L\'image est trop volumineuse. Maximum 5MB.', 'error');
                return false;
            }

            return true;
        },

        /**
         * Traite un fichier photo
         */
        _processPhotoFile: function (file) {
            var self = this;
            var reader = new FileReader();

            reader.onload = function (e) {
                var photoData = {
                    file: file,
                    data_url: e.target.result,
                    name: file.name,
                    size: file.size,
                    type: file.type
                };

                self.photoFiles.push(photoData);
                self._displayPhotoThumbnail(photoData);
            };

            reader.readAsDataURL(file);
        },

        /**
         * Affiche la miniature d'une photo
         */
        _displayPhotoThumbnail: function (photoData) {
            var $thumbnail = $('<div class="photo-thumbnail position-relative me-2 mb-2">' +
                '<img src="' + photoData.data_url + '" class="img-thumbnail" style="width: 80px; height: 80px; object-fit: cover;">' +
                '<button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" style="border-radius: 50%;">' +
                '<i class="fa fa-times"></i>' +
                '</button>' +
                '</div>');

            // Ajouter le gestionnaire de suppression
            $thumbnail.find('button').on('click', function () {
                var index = self.photoFiles.indexOf(photoData);
                if (index > -1) {
                    self.photoFiles.splice(index, 1);
                }
                $thumbnail.remove();
            });

            this.$('.photo-thumbnails').append($thumbnail);
        },

        /**
         * Gère le mode hors ligne
         */
        _handleOfflineMode: function () {
            var self = this;

            window.addEventListener('online', function () {
                self._syncOfflineHarvests();
            });

            // Si on est en ligne, synchroniser les données en attente
            if (navigator.onLine) {
                this._syncOfflineHarvests();
            }
        },

        /**
         * Synchronise les récoltes hors ligne
         */
        _syncOfflineHarvests: function () {
            var self = this;
            var offlineHarvests = JSON.parse(localStorage.getItem('ifn_offline_harvests') || '[]');

            if (offlineHarvests.length === 0) {
                return;
            }

            offlineHarvests.forEach(function (harvest, index) {
                if (harvest.sync_status === 'pending') {
                    self._saveHarvest(harvest).then(function (result) {
                        if (result.success) {
                            // Mettre à jour le statut de synchronisation
                            harvest.sync_status = 'synced';
                            harvest.harvest_id = result.harvest_id;

                            // Mettre à jour le stockage local
                            offlineHarvests[index] = harvest;
                            localStorage.setItem('ifn_offline_harvests', JSON.stringify(offlineHarvests));

                            // Mettre à jour l'interface
                            self._updateHarvestStatus(harvest.temp_id, 'synced');
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
         * Réinitialise le formulaire
         */
        _resetForm: function () {
            this.$('#addHarvestForm')[0].reset();
            this.$('input[name="date_harvest"]').val(new Date().toISOString().split('T')[0]);
            this.photoFiles = [];
            this.$('.photo-thumbnails').empty();
            this.$('.is-invalid').removeClass('is-invalid');
        },

        /**
         * Rafraîchit la liste des récoltes
         */
        _refreshHarvestList: function () {
            var self = this;
            rpc.query({
                route: '/portal/producer/api/harvest/list',
                params: {}
            }).then(function (data) {
                self._updateHarvestList(data);
            });
        },

        /**
         * Met à jour la liste des récoltes dans l'interface
         */
        _updateHarvestList: function (harvests) {
            // Implémentation de la mise à jour de la liste
            // À adapter selon la structure exacte de l'interface
            console.log('Mise à jour de la liste des récoltes:', harvests);
        }
    });

    publicWidget.registry.producer_harvest = ProducerHarvest;

    return ProducerHarvest;
});