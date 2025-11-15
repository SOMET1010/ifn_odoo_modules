/* ==========================================================================
   IFN Portal Producer - Profile JavaScript
   Gestion du profil producteur
   ========================================================================== */

odoo.define('ifn_portal_producer.profile', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var ProducerProfile = publicWidget.Widget.extend({
        selector: '.producer-profile-page',
        events: {
            'submit #profileForm': '_onSubmitProfile',
            'click .update-profile-btn': '_onUpdateProfile',
            'click .download-qr-btn': '_onDownloadQR',
            'click .change-language-btn': '_onChangeLanguage',
            'change input[type="file"]': '_onPhotoUpload',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.profileData = null;
            this.photoFile = null;
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);

            // Initialiser l'interface
            this._initializeInterface();

            // Charger les données du profil
            this._loadProfileData();

            // Configurer les interactions
            this._setupInteractions();

            // Gérer le mode hors ligne
            this._handleOfflineMode();

            return this;
        },

        /**
         * Initialise l'interface du profil
         */
        _initializeInterface: function () {
            // Initialiser la validation du formulaire
            this._initializeFormValidation();

            // Configurer les tooltips
            this.$('[data-bs-toggle="tooltip"]').tooltip();

            // Initialiser le preview de photo
            this._setupPhotoPreview();

            // Animation des éléments
            this._animateProfileElements();
        },

        /**
         * Initialise la validation du formulaire de profil
         */
        _initializeFormValidation: function () {
            var self = this;

            this.$('#profileForm').validate({
                rules: {
                    phone: {
                        required: false,
                        pattern: /^\\+225[0-9]{8}$/
                    },
                    email: {
                        required: false,
                        email: true
                    }
                },
                messages: {
                    phone: {
                        pattern: "Veuillez entrer un numéro valide au format +225 XX XX XX XX"
                    },
                    email: {
                        email: "Veuillez entrer une adresse email valide"
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
         * Anime les éléments du profil
         */
        _animateProfileElements: function () {
            var self = this;

            // Animation des cartes
            this.$('.card').each(function (index) {
                var $card = $(this);
                setTimeout(function () {
                    $card.addClass('fade-in-up');
                }, index * 200);
            });

            // Animation du QR code
            this.$('.qr-code-placeholder').addClass('pulse');
            setTimeout(function () {
                self.$('.qr-code-placeholder').removeClass('pulse');
            }, 3000);
        },

        /**
         * Configure les interactions
         */
        _setupInteractions: function () {
            var self = this;

            // Preview en temps réel des changements
            this.$('input, select, textarea').on('input change', function () {
                self._updatePreview();
            });

            // Gestion de la géolocalisation
            this.$('.get-location-btn').on('click', function () {
                self._getCurrentLocation();
            });

            // Toggle de l'édition
            this.$('.edit-profile-btn').on('click', function () {
                self._toggleEditMode();
            });
        },

        /**
         * Charge les données du profil
         */
        _loadProfileData: function () {
            var self = this;

            // Afficher l'état de chargement
            this._showLoadingState();

            rpc.query({
                route: '/portal/producer/api/profile/data',
                params: {}
            }).then(function (data) {
                self.profileData = data;

                // Mettre à jour l'interface
                self._updateProfileDisplay(data);
                self._updateQRCode(data);

                // Cacher l'état de chargement
                self._hideLoadingState();
            }).fail(function () {
                self._showNotification('Erreur lors du chargement du profil', 'error');
                self._hideLoadingState();
                self._loadOfflineProfileData();
            });
        },

        /**
         * Charge les données du profil hors ligne
         */
        _loadOfflineProfileData: function () {
            var offlineData = JSON.parse(localStorage.getItem('ifn_offline_profile_data') || '{}');
            this.profileData = offlineData;
            this._updateProfileDisplay(offlineData);
        },

        /**
         * Met à jour l'affichage du profil
         */
        _updateProfileDisplay: function (data) {
            if (!data) return;

            // Mettre à jour les champs du formulaire
            this.$('input[name="name"]').val(data.name || '');
            this.$('input[name="phone"]').val(data.phone || '');
            this.$('input[name="email"]').val(data.email || '');
            this.$('input[name="city"]').val(data.city || '');
            this.$('select[name="lang"]').val(data.lang || 'fr');

            // Mettre à jour les informations supplémentaires
            this._updateAdditionalInfo(data);

            // Mettre à jour les statistiques
            this._updateStatistics(data);
        },

        /**
         * Met à jour les informations supplémentaires
         */
        _updateAdditionalInfo: function (data) {
            // Informations sur la coopérative
            if (data.cooperative) {
                this.$('.cooperative-info').text(data.cooperative.name).show();
            }

            // Informations sur la localisation
            if (data.latitude && data.longitude) {
                this.$('.location-info').html(`
                    <i class="fa fa-map-marker-alt me-1"></i>
                    ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}
                `).show();
            }

            // Date d'inscription
            if (data.create_date) {
                this.$('.member-since').text('Membre depuis ' + new Date(data.create_date).getFullYear());
            }

            // Type de producteur
            if (data.producer_type) {
                this.$('.producer-type').text(this._formatProducerType(data.producer_type));
            }
        },

        /**
         * Met à jour les statistiques du producteur
         */
        _updateStatistics: function (data) {
            if (!data.statistics) return;

            var stats = data.statistics;

            this._animateNumber($('.total-harvests'), 0, stats.total_harvests || 0);
            this._animateNumber($('.total-sales'), 0, stats.total_sales || 0);
            this._animateNumber($('.total-revenue'), 0, stats.total_revenue || 0, ' FCFA');
            this._animateNumber($('.completion-rate'), 0, stats.training_completion || 0, '%');
        },

        /**
         * Anime un compteur numérique
         */
        _animateNumber: function ($element, start, end, suffix) {
            if ($element.length === 0) return;

            var duration = 1500;
            var startTime = Date.now();

            function update() {
                var elapsed = Date.now() - startTime;
                var progress = Math.min(elapsed / duration, 1);

                var easeOutQuart = 1 - Math.pow(1 - progress, 4);
                var current = Math.round(start + (end - start) * easeOutQuart);

                $element.text(current.toLocaleString('fr-FR') + (suffix || ''));

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }

            update();
        },

        /**
         * Met à jour le QR code
         */
        _updateQRCode: function (data) {
            var self = this;

            if (!data.qr_code) return;

            // Générer le QR code
            this._generateQRCode(data.qr_code).then(function (qrCodeUrl) {
                self.$('.qr-code-placeholder').html(`
                    <img src="${qrCodeUrl}" alt="QR Code" class="img-fluid" style="max-width: 200px;">
                `);
            }).fail(function () {
                // Afficher un placeholder en cas d'erreur
                self.$('.qr-code-placeholder').html(`
                    <i class="fa fa-qrcode fa-5x text-muted"></i>
                `);
            });
        },

        /**
         * Génère un QR code
         */
        _generateQRCode: function (data) {
            return new Promise(function (resolve, reject) {
                // Utiliser une API de génération de QR code ou une librairie
                // Pour l'instant, simulation avec une image placeholder
                var qrCodeUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
                resolve(qrCodeUrl);
            });
        },

        /**
         * Configure le preview de photo
         */
        _setupPhotoPreview: function () {
            var self = this;

            this.$('.photo-upload-btn').on('click', function () {
                self.$('input[type="file"]').click();
            });
        },

        /**
         * Gère l'upload de photo
         */
        _onPhotoUpload: function (ev) {
            var self = this;
            var file = ev.target.files[0];

            if (!file) return;

            // Valider le fichier
            if (!this._validatePhotoFile(file)) {
                return;
            }

            // Prévisualiser la photo
            this._previewPhoto(file);

            // Stocker le fichier pour l'upload
            this.photoFile = file;
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

            // Vérifier la taille (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                this._showNotification('L\'image est trop volumineuse. Maximum 2MB.', 'error');
                return false;
            }

            return true;
        },

        /**
         * Prévisualise la photo
         */
        _previewPhoto: function (file) {
            var self = this;
            var reader = new FileReader();

            reader.onload = function (e) {
                self.$('.photo-preview').html(`
                    <img src="${e.target.result}" alt="Photo de profil" class="img-thumbnail" style="max-width: 150px; max-height: 150px;">
                    <button type="button" class="btn btn-sm btn-danger mt-2 remove-photo-btn">
                        <i class="fa fa-times me-1"></i>Supprimer
                    </button>
                `);

                // Gérer la suppression de photo
                self.$('.remove-photo-btn').one('click', function () {
                    self._removePhoto();
                });
            };

            reader.readAsDataURL(file);
        },

        /**
         * Supprime la photo
         */
        _removePhoto: function () {
            this.photoFile = null;
            this.$('input[type="file"]').val('');
            this.$('.photo-preview').html(`
                <div class="text-center text-muted">
                    <i class="fa fa-camera fa-2x mb-2"></i>
                    <p>Aucune photo</p>
                </div>
            `);
        },

        /**
         * Gère la soumission du formulaire de profil
         */
        _onSubmitProfile: function (ev) {
            ev.preventDefault();
            this._onUpdateProfile();
        },

        /**
         * Gère la mise à jour du profil
         */
        _onUpdateProfile: function () {
            var self = this;

            if (!this.$('#profileForm').valid()) {
                return;
            }

            var $btn = this.$('.update-profile-btn');
            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin me-2"></i>Mise à jour...');

            var formData = this._getFormData();

            // Préparer les données pour l'API
            var apiData = {
                profile: formData,
                photo: this.photoFile
            };

            this._updateProfile(apiData).then(function (result) {
                if (result.success) {
                    self._showNotification('Profil mis à jour avec succès', 'success');
                    self.profileData = result.profile_data;
                    self._updateProfileDisplay(result.profile_data);
                } else {
                    self._showNotification(result.message || 'Erreur lors de la mise à jour', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion. Les données seront synchronisées ultérieurement.', 'warning');
                self._saveProfileOffline(apiData);
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-save me-2"></i>Enregistrer');
            });
        },

        /**
         * Récupère les données du formulaire
         */
        _getFormData: function () {
            var form = this.$('#profileForm')[0];
            var formData = new FormData(form);
            var data = {};

            formData.forEach(function (value, key) {
                data[key] = value;
            });

            return data;
        },

        /**
         * Met à jour le profil via API
         */
        _updateProfile: function (data) {
            return rpc.query({
                route: '/portal/producer/api/profile/update',
                params: data
            });
        },

        /**
         * Sauvegarde le profil en mode hors ligne
         */
        _saveProfileOffline: function (data) {
            var offlineProfile = {
                ...data.profile,
                temp_photo: data.photo ? data.photo.name : null,
                updated_at: new Date().toISOString(),
                sync_status: 'pending'
            };

            localStorage.setItem('ifn_offline_profile_update', JSON.stringify(offlineProfile));
            this._showNotification('Profil enregistré localement. Synchronisation automatique à la reconnexion.', 'info');
        },

        /**
         * Gère le téléchargement du QR code
         */
        _onDownloadQR: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin"></i>');

            // Récupérer l'image du QR code
            var $qrImage = this.$('.qr-code-placeholder img');
            if ($qrImage.length === 0) {
                self._showNotification('QR code non disponible', 'error');
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-download me-1"></i>Télécharger');
                return;
            }

            // Créer un lien de téléchargement
            var link = document.createElement('a');
            link.href = $qrImage.attr('src');
            link.download = 'qr_code_producteur_' + (this.profileData?.id || 'profile') + '.png';
            link.click();

            self._showNotification('QR code téléchargé avec succès', 'success');

            $btn.prop('disabled', false)
                .html('<i class="fa fa-download me-1"></i>Télécharger');
        },

        /**
         * Gère le changement de langue
         */
        _onChangeLanguage: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var language = $btn.data('language');

            if (confirm('Changer la langue rechargera la page. Continuer ?')) {
                // Mettre à jour la langue via API
                rpc.query({
                    route: '/portal/producer/api/profile/language',
                    params: { language: language }
                }).then(function (result) {
                    if (result.success) {
                        // Recharger la page avec la nouvelle langue
                        window.location.href = window.location.pathname + '?lang=' + language;
                    } else {
                        self._showNotification('Erreur lors du changement de langue', 'error');
                    }
                }).fail(function () {
                    self._showNotification('Erreur de connexion', 'error');
                });
            }
        },

        /**
         * Obtient la localisation actuelle
         */
        _getCurrentLocation: function () {
            var self = this;

            if (!navigator.geolocation) {
                self._showNotification('La géolocalisation n\'est pas supportée par votre navigateur', 'error');
                return;
            }

            var $btn = self.$('.get-location-btn');
            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin me-1"></i>Localisation...');

            navigator.geolocation.getCurrentPosition(
                function (position) {
                    var latitude = position.coords.latitude;
                    var longitude = position.coords.longitude;

                    // Mettre à jour les champs de localisation
                    self.$('input[name="latitude"]').val(latitude);
                    self.$('input[name="longitude"]').val(longitude);

                    // Obtenir l'adresse à partir des coordonnées
                    self._reverseGeocode(latitude, longitude);

                    self._showNotification('Localisation obtenue avec succès', 'success');

                    $btn.prop('disabled', false)
                        .html('<i class="fa fa-map-marker-alt me-1"></i>Ma position');
                },
                function (error) {
                    var errorMessage = 'Erreur de localisation: ';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Accès refusé';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Position indisponible';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Délai d\'attente dépassé';
                            break;
                        default:
                            errorMessage += 'Erreur inconnue';
                            break;
                    }

                    self._showNotification(errorMessage, 'error');
                    $btn.prop('disabled', false)
                        .html('<i class="fa fa-map-marker-alt me-1"></i>Ma position');
                }
            );
        },

        /**
         * Effectue un reverse geocoding
         */
        _reverseGeocode: function (latitude, longitude) {
            var self = this;

            // Utiliser une API de géocodage (Nominatim, etc.)
            // Pour l'instant, simulation
            var mockAddress = 'Abidjan, Côte d\'Ivoire';
            self.$('input[name="city"]').val(mockAddress);
        },

        /**
         * Bascule le mode d'édition
         */
        _toggleEditMode: function () {
            var isEditing = this.$('input, select, textarea').prop('disabled');

            if (isEditing) {
                this.$('input, select, textarea').prop('disabled', false);
                this.$('.edit-profile-btn').html('<i class="fa fa-times me-2"></i>Annuler');
                this.$('.update-profile-btn').show();
            } else {
                this.$('input, select, textarea').prop('disabled', true);
                this.$('.edit-profile-btn').html('<i class="fa fa-edit me-2"></i>Modifier');
                this.$('.update-profile-btn').hide();
                this._updateProfileDisplay(this.profileData);
            }
        },

        /**
         * Met à jour le preview en temps réel
         */
        _updatePreview: function () {
            // Mettre à jour le preview des informations
            var name = this.$('input[name="name"]').val();
            var email = this.$('input[name="email"]').val();
            var phone = this.$('input[name="phone"]').val();

            this.$('.preview-name').text(name || 'Nom non spécifié');
            this.$('.preview-email').text(email || 'Email non spécifié');
            this.$('.preview-phone').text(phone || 'Téléphone non spécifié');
        },

        /**
         * Gère le mode hors ligne
         */
        _handleOfflineMode: function () {
            var self = this;

            window.addEventListener('online', function () {
                self._showNotification('Connexion rétablie', 'success');
                self._syncOfflineProfile();
            });

            window.addEventListener('offline', function () {
                self._showNotification('Mode hors ligne', 'warning');
            });

            // Synchroniser les données en attente si on est en ligne
            if (navigator.onLine) {
                this._syncOfflineProfile();
            }
        },

        /**
         * Synchronise le profil hors ligne
         */
        _syncOfflineProfile: function () {
            var offlineProfile = JSON.parse(localStorage.getItem('ifn_offline_profile_update') || '{}');

            if (offlineProfile.sync_status === 'pending') {
                this._updateProfile({
                    profile: offlineProfile,
                    photo: offlineProfile.temp_photo ? { name: offlineProfile.temp_photo } : null
                }).then(function (result) {
                    if (result.success) {
                        localStorage.removeItem('ifn_offline_profile_update');
                        // Mettre à jour l'interface avec les nouvelles données
                    }
                }).fail(function () {
                    // Garder en attente pour réessayer plus tard
                });
            }
        },

        // Fonctions utilitaires
        _formatProducerType: function (type) {
            var types = {
                'individual': 'Producteur individuel',
                'cooperative': 'Membre de coopérative',
                'association': 'Membre d\'association'
            };
            return types[type] || type;
        },

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
        }
    });

    publicWidget.registry.producer_profile = ProducerProfile;

    return ProducerProfile;
});