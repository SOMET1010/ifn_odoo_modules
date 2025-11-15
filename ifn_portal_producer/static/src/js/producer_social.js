/* ==========================================================================
   IFN Portal Producer - Social Protection JavaScript
   Gestion de la protection sociale (CNPS/CNAM/CMU)
   ========================================================================== */

odoo.define('ifn_portal_producer.social', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var ProducerSocial = publicWidget.Widget.extend({
        selector: '.producer-social-page',
        events: {
            'click .pay-contribution-btn': '_onPayContribution',
            'click .download-attestation-btn': '_onDownloadAttestation',
            'click .view-contribution-details': '_onViewContributionDetails',
            'click .refresh-social-btn': '_onRefreshSocial',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.contributionsData = [];
            this.socialStatus = null;
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);

            // Initialiser l'interface
            this._initializeInterface();

            // Charger les données sociales
            this._loadSocialData();

            // Configurer les graphiques de cotisations
            this._initializeContributionCharts();

            // Gérer le mode hors ligne
            this._handleOfflineMode();

            return this;
        },

        /**
         * Initialise l'interface de protection sociale
         */
        _initializeInterface: function () {
            // Initialiser les animations
            this._initializeAnimations();

            // Configurer les tooltips
            this.$('[data-bs-toggle="tooltip"]').tooltip();

            // Animation du statut social
            this._animateSocialStatus();
        },

        /**
         * Initialise les animations de la page
         */
        _initializeAnimations: function () {
            var self = this;

            // Animation des cartes de statut
            this.$('.status-card').each(function (index) {
                var $card = $(this);
                setTimeout(function () {
                    $card.addClass('fade-in-up');
                }, index * 200);
            });

            // Animation des statistiques
            this.$('.contribution-stat').each(function () {
                var $stat = $(this);
                var targetValue = parseInt($stat.data('target')) || 0;
                self._animateNumber($stat, 0, targetValue);
            });
        },

        /**
         * Anime un compteur numérique
         */
        _animateNumber: function ($element, start, end) {
            if ($element.length === 0) return;

            var duration = 1500;
            var startTime = Date.now();

            function update() {
                var elapsed = Date.now() - startTime;
                var progress = Math.min(elapsed / duration, 1);

                var easeOutQuart = 1 - Math.pow(1 - progress, 4);
                var current = Math.round(start + (end - start) * easeOutQuart);

                $element.text(current.toLocaleString('fr-FR'));

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }

            update();
        },

        /**
         * Anime le statut social
         */
        _animateSocialStatus: function () {
            var $statusCard = this.$('.social-status-card');
            if ($statusCard.length === 0) return;

            // Effet de pulsation si le statut est à jour
            if ($statusCard.hasClass('status-up-to-date')) {
                $statusCard.addClass('pulse');
                setTimeout(function () {
                    $statusCard.removeClass('pulse');
                }, 3000);
            }
        },

        /**
         * Charge les données de protection sociale
         */
        _loadSocialData: function () {
            var self = this;

            // Afficher l'état de chargement
            this._showLoadingState();

            rpc.query({
                route: '/portal/producer/api/social/data',
                params: {}
            }).then(function (data) {
                self.socialStatus = data.social_status;
                self.contributionsData = data.contributions || [];

                // Mettre à jour l'interface
                self._updateSocialStatus(data.social_status);
                self._updateContributionsList(data.contributions);
                self._updateStatistics(data);

                // Cacher l'état de chargement
                self._hideLoadingState();
            }).fail(function () {
                self._showNotification('Erreur lors du chargement des données sociales', 'error');
                self._hideLoadingState();
                self._loadOfflineSocialData();
            });
        },

        /**
         * Charge les données hors ligne
         */
        _loadOfflineSocialData: function () {
            var offlineData = JSON.parse(localStorage.getItem('ifn_offline_social_data') || '{}');
            this.socialStatus = offlineData.social_status;
            this.contributionsData = offlineData.contributions || [];

            this._updateSocialStatus(this.socialStatus);
            this._updateContributionsList(this.contributionsData);
        },

        /**
         * Met à jour l'affichage du statut social
         */
        _updateSocialStatus: function (socialStatus) {
            if (!socialStatus) return;

            var $statusCard = this.$('.social-status-card');
            if ($statusCard.length === 0) return;

            // Mettre à jour le statut général
            var isUpToDate = socialStatus.is_up_to_date || false;
            var statusText = isUpToDate ? 'Vos cotisations sont à jour' : 'Vous avez des cotisations en retard';
            var statusClass = isUpToDate ? 'success' : 'warning';
            var statusIcon = isUpToDate ? 'check-circle' : 'exclamation-triangle';

            $statusCard.removeClass('bg-success bg-warning bg-danger').addClass('bg-' + statusClass + ' text-white');
            $statusCard.find('.status-text').html(`
                <h5>
                    <i class="fa fa-${statusIcon} me-2"></i>
                    Statut CNPS/CNAM/CMU
                </h5>
                <p class="mb-0">${statusText}</p>
            `);

            // Mettre à jour les détails du statut
            this._updateStatusDetails(socialStatus);

            // Mettre à jour les indicateurs de couverture
            this._updateCoverageIndicators(socialStatus);
        },

        /**
         * Met à jour les détails du statut social
         */
        _updateStatusDetails: function (socialStatus) {
            var $details = this.$('.social-status-details');
            if ($details.length === 0) return;

            var detailsHtml = '<div class="row mt-3">';

            // CNPS
            if (socialStatus.cnps_status) {
                detailsHtml += `
                    <div class="col-md-4 mb-2">
                        <small>CNPS:</small>
                        <div class="badge ${this._getCoverageBadgeClass(socialStatus.cnps_status)}">
                            ${this._formatCoverageStatus(socialStatus.cnps_status)}
                        </div>
                    </div>
                `;
            }

            // CNAM
            if (socialStatus.cnam_status) {
                detailsHtml += `
                    <div class="col-md-4 mb-2">
                        <small>CNAM:</small>
                        <div class="badge ${this._getCoverageBadgeClass(socialStatus.cnam_status)}">
                            ${this._formatCoverageStatus(socialStatus.cnam_status)}
                        </div>
                    </div>
                `;
            }

            // CMU
            if (socialStatus.cmu_status) {
                detailsHtml += `
                    <div class="col-md-4 mb-2">
                        <small>CMU:</small>
                        <div class="badge ${this._getCoverageBadgeClass(socialStatus.cmu_status)}">
                            ${this._formatCoverageStatus(socialStatus.cmu_status)}
                        </div>
                    </div>
                `;
            }

            detailsHtml += '</div>';
            $details.html(detailsHtml);
        },

        /**
         * Met à jour les indicateurs de couverture
         */
        _updateCoverageIndicators: function (socialStatus) {
            var $indicators = this.$('.coverage-indicators');
            if ($indicators.length === 0) return;

            var indicatorsHtml = '<div class="row mt-3">';

            // Taux de couverture
            if (socialStatus.coverage_rate !== undefined) {
                indicatorsHtml += `
                    <div class="col-md-6">
                        <div class="text-center">
                            <h4>${socialStatus.coverage_rate}%</h4>
                            <small class="text-muted">Taux de couverture</small>
                        </div>
                    </div>
                `;
            }

            // Prochaine échéance
            if (socialStatus.next_due_date) {
                var daysUntilDue = this._calculateDaysUntilDue(socialStatus.next_due_date);
                var urgencyClass = daysUntilDue <= 7 ? 'text-danger' : daysUntilDue <= 30 ? 'text-warning' : 'text-info';

                indicatorsHtml += `
                    <div class="col-md-6">
                        <div class="text-center">
                            <h4 class="${urgencyClass}">${daysUntilDue} jours</h4>
                            <small class="text-muted">Prochaine échéance</small>
                        </div>
                    </div>
                `;
            }

            indicatorsHtml += '</div>';
            $indicators.html(indicatorsHtml);
        },

        /**
         * Met à jour la liste des cotisations
         */
        _updateContributionsList: function (contributions) {
            var self = this;
            var $contributionsList = this.$('#contributionsList');

            if ($contributionsList.length === 0) return;

            $contributionsList.empty();

            if (!contributions || contributions.length === 0) {
                $contributionsList.html(`
                    <div class="text-center py-5">
                        <i class="fa fa-heart fa-3x text-muted mb-3"></i>
                        <h5>Aucune cotisation enregistrée</h5>
                        <p class="text-muted">Votre historique de cotisations apparaîtra ici</p>
                    </div>
                `);
                return;
            }

            // Trier par période (plus récent en premier)
            var sortedContributions = contributions.sort(function (a, b) {
                return new Date(b.period) - new Date(a.period);
            });

            sortedContributions.forEach(function (contribution) {
                var $contributionItem = self._createContributionItem(contribution);
                $contributionsList.append($contributionItem);
            });

            // Initialiser les tooltips
            $contributionsList.find('[data-bs-toggle="tooltip"]').tooltip();
        },

        /**
         * Crée un élément de cotisation pour la liste
         */
        _createContributionItem: function (contribution) {
            var statusClass = this._getContributionStatusClass(contribution.state);
            var statusIcon = this._getContributionStatusIcon(contribution.state);
            var typeLabel = this._formatContributionType(contribution.contribution_type);

            var $item = $(`
                <div class="list-group-item contribution-item" data-contribution-id="${contribution.id}">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <h6 class="mb-1">${typeLabel}</h6>
                            <small class="text-muted">${this._formatPeriod(contribution.period)}</small>
                        </div>
                        <div class="col-md-3">
                            <span class="badge ${statusClass}">
                                <i class="fa ${statusIcon} me-1"></i>
                                ${this._formatContributionStatus(contribution.state)}
                            </span>
                        </div>
                        <div class="col-md-3 text-center">
                            <h5 class="mb-0">${contribution.amount.toLocaleString('fr-FR')} FCFA</h5>
                        </div>
                        <div class="col-md-2 text-center">
                            <small class="text-muted">
                                ${contribution.due_date ? 'Échéance: ' + this._formatDate(contribution.due_date) : ''}
                            </small>
                        </div>
                        <div class="col-md-2 text-end">
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-info view-contribution-details"
                                        data-contribution-id="${contribution.id}"
                                        data-bs-toggle="tooltip"
                                        title="Détails">
                                    <i class="fa fa-eye"></i>
                                </button>
                                ${contribution.state === 'pending' ? `
                                <button class="btn btn-sm btn-success pay-contribution-btn"
                                        data-contribution-id="${contribution.id}"
                                        data-bs-toggle="tooltip"
                                        title="Payer maintenant">
                                    <i class="fa fa-mobile-alt"></i>
                                </button>` : ''}
                                ${contribution.state === 'paid' ? `
                                <button class="btn btn-sm btn-outline-primary download-attestation-btn"
                                        data-contribution-id="${contribution.id}"
                                        data-bs-toggle="tooltip"
                                        title="Télécharger l'attestation">
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
         * Initialise les graphiques de cotisations
         */
        _initializeContributionCharts: function () {
            var self = this;

            // Graphique des cotisations mensuelles
            this._initializeMonthlyContributionsChart();

            // Graphique de répartition par type
            this._initializeContributionsByTypeChart();
        },

        /**
         * Initialise le graphique des cotisations mensuelles
         */
        _initializeMonthlyContributionsChart: function () {
            var ctx = document.getElementById('monthlyContributionsChart');
            if (!ctx) return;

            var chartData = {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
                datasets: [{
                    label: 'Cotisations payées',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: '#009739',
                    borderColor: '#009739',
                    borderWidth: 1
                }, {
                    label: 'Cotisations en attente',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: '#F77F00',
                    borderColor: '#F77F00',
                    borderWidth: 1
                }]
            };

            // Charger les données réelles
            this._loadMonthlyContributionsData(chartData);

            try {
                new Chart(ctx, {
                    type: 'bar',
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
                                        return context.dataset.label + ': ' + context.parsed.y.toLocaleString('fr-FR') + ' FCFA';
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
                console.warn('Impossible d\'initialiser le graphique des cotisations mensuelles:', e);
            }
        },

        /**
         * Initialise le graphique de répartition par type
         */
        _initializeContributionsByTypeChart: function () {
            var ctx = document.getElementById('contributionsByTypeChart');
            if (!ctx) return;

            var chartData = {
                labels: ['CNPS', 'CNAM', 'CMU'],
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
            this._loadContributionsByTypeData(chartData);

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
                                        var percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                        return context.label + ': ' + percentage + '%';
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (e) {
                console.warn('Impossible d\'initialiser le graphique de répartition par type:', e);
            }
        },

        /**
         * Gère le paiement d'une cotisation
         */
        _onPayContribution: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var contributionId = $btn.data('contribution-id');

            // Trouver les détails de la cotisation
            var contribution = this.contributionsData.find(function (c) { return c.id == contributionId; });
            if (!contribution) {
                self._showNotification('Cotisation introuvable', 'error');
                return;
            }

            // Afficher le modal de paiement
            this._showPaymentModal(contribution);
        },

        /**
         * Affiche le modal de paiement Mobile Money
         */
        _showPaymentModal: function (contribution) {
            var self = this;

            var modalContent = `
                <div class="modal fade" id="paymentModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fa fa-mobile-alt me-2"></i>
                                    Payer la cotisation
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info">
                                    <h6>Détails de la cotisation</h6>
                                    <p><strong>Type:</strong> ${this._formatContributionType(contribution.contribution_type)}</p>
                                    <p><strong>Période:</strong> ${this._formatPeriod(contribution.period)}</p>
                                    <p><strong>Montant:</strong> <span class="fw-bold">${contribution.amount.toLocaleString('fr-FR')} FCFA</span></p>
                                </div>

                                <form id="mobilePaymentForm">
                                    <div class="mb-3">
                                        <label class="form-label">Opérateur Mobile Money</label>
                                        <select class="form-select" name="operator" required>
                                            <option value="">Choisir un opérateur...</option>
                                            <option value="mtn">MTN Mobile Money</option>
                                            <option value="orange">Orange Money</option>
                                            <option value="moov">Moov Money</option>
                                            <option value="wave">Wave</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Numéro de téléphone</label>
                                        <input type="tel" class="form-control" name="phone_number"
                                               placeholder="+225 XX XX XX XX XX" required/>
                                        <small class="text-muted">Format: +225 suivie de 8 chiffres</small>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Code PIN (optionnel)</label>
                                        <input type="password" class="form-control" name="pin"
                                               placeholder="Entrez votre code PIN Mobile Money"/>
                                        <small class="text-muted">Requis pour certains opérateurs</small>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                                <button type="button" class="btn btn-success" id="confirmPaymentBtn">
                                    <i class="fa fa-mobile-alt me-2"></i>
                                    Confirmer le paiement
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Ajouter le modal à la page
            if ($('#paymentModal').length === 0) {
                $('body').append(modalContent);
            } else {
                $('#paymentModal').replaceWith(modalContent);
            }

            // Afficher le modal
            var modal = new bootstrap.Modal(document.getElementById('paymentModal'));
            modal.show();

            // Gérer la confirmation du paiement
            $('#confirmPaymentBtn').one('click', function () {
                self._confirmMobilePayment(contribution.id);
            });

            // Valider le formulaire
            $('#mobilePaymentForm').validate({
                rules: {
                    operator: {
                        required: true
                    },
                    phone_number: {
                        required: true,
                        pattern: /^\\+225[0-9]{8}$/
                    }
                },
                messages: {
                    phone_number: {
                        pattern: "Veuillez entrer un numéro valide au format +225 XX XX XX XX"
                    }
                }
            });
        },

        /**
         * Confirme le paiement Mobile Money
         */
        _confirmMobilePayment: function (contributionId) {
            var self = this;

            var $btn = $('#confirmPaymentBtn');
            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin me-2"></i>Traitement...');

            var formData = $('#mobilePaymentForm').serialize();

            rpc.query({
                route: '/portal/producer/api/social/payment',
                params: {
                    contribution_id: contributionId,
                    form_data: formData
                }
            }).then(function (result) {
                if (result.success) {
                    self._showNotification('Paiement initié avec succès', 'success');

                    // Rediriger vers la page de paiement ou afficher les instructions
                    if (result.payment_url) {
                        window.open(result.payment_url, '_blank');
                    } else if (result.instructions) {
                        self._showPaymentInstructions(result.instructions);
                    }

                    // Fermer le modal
                    var modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Recharger les données après un délai
                    setTimeout(function () {
                        self._loadSocialData();
                    }, 5000);
                } else {
                    self._showNotification(result.message || 'Erreur lors de l\'initiation du paiement', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion', 'error');
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-mobile-alt me-2"></i>Confirmer le paiement');
            });
        },

        /**
         * Affiche les instructions de paiement
         */
        _showPaymentInstructions: function (instructions) {
            var instructionsHtml = `
                <div class="modal fade" id="instructionsModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fa fa-info-circle me-2"></i>
                                    Instructions de paiement
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info">
                                    ${instructions}
                                </div>
                                <p class="text-muted">
                                    Votre paiement sera automatiquement détecté et votre cotisation sera mise à jour.
                                    Cela peut prendre quelques minutes.
                                </p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Compris</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if ($('#instructionsModal').length === 0) {
                $('body').append(instructionsHtml);
            } else {
                $('#instructionsModal').replaceWith(instructionsHtml);
            }

            var modal = new bootstrap.Modal(document.getElementById('instructionsModal'));
            modal.show();
        },

        /**
         * Gère le téléchargement d'une attestation
         */
        _onDownloadAttestation: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var contributionId = $btn.data('contribution-id');

            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin"></i>');

            rpc.query({
                route: '/portal/producer/api/social/attestation',
                params: { contribution_id: contributionId }
            }).then(function (result) {
                if (result.success && result.pdf_url) {
                    // Télécharger le PDF
                    var link = document.createElement('a');
                    link.href = result.pdf_url;
                    link.download = 'attestation_sociale_' + contributionId + '.pdf';
                    link.click();

                    self._showNotification('Attestation téléchargée avec succès', 'success');
                } else {
                    self._showNotification('Impossible de télécharger l\'attestation', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion', 'error');
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-download"></i>');
            });
        },

        /**
         * Gère l'affichage des détails d'une cotisation
         */
        _onViewContributionDetails: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var contributionId = $btn.data('contribution-id');

            var contribution = this.contributionsData.find(function (c) { return c.id == contributionId; });
            if (!contribution) {
                self._showNotification('Cotisation introuvable', 'error');
                return;
            }

            // Afficher le modal de détails
            this._showContributionDetailsModal(contribution);
        },

        /**
         * Affiche le modal des détails de cotisation
         */
        _showContributionDetailsModal: function (contribution) {
            var modalContent = `
                <div class="modal fade" id="contributionDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fa fa-heart me-2"></i>
                                    Détails de la cotisation
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Informations générales</h6>
                                        <table class="table table-sm">
                                            <tr>
                                                <td><strong>Type:</strong></td>
                                                <td>${this._formatContributionType(contribution.contribution_type)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Période:</strong></td>
                                                <td>${this._formatPeriod(contribution.period)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Montant:</strong></td>
                                                <td class="fw-bold">${contribution.amount.toLocaleString('fr-FR')} FCFA</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Statut:</strong></td>
                                                <td><span class="badge ${this._getContributionStatusClass(contribution.state)}">${this._formatContributionStatus(contribution.state)}</span></td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Informations de paiement</h6>
                                        <table class="table table-sm">
                                            ${contribution.due_date ? `
                                            <tr>
                                                <td><strong>Date d'échéance:</strong></td>
                                                <td>${this._formatDate(contribution.due_date)}</td>
                                            </tr>` : ''}
                                            ${contribution.payment_date ? `
                                            <tr>
                                                <td><strong>Date de paiement:</strong></td>
                                                <td>${this._formatDate(contribution.payment_date)}</td>
                                            </tr>` : ''}
                                            ${contribution.payment_method ? `
                                            <tr>
                                                <td><strong>Méthode:</strong></td>
                                                <td>${contribution.payment_method}</td>
                                            </tr>` : ''}
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                                ${contribution.state === 'pending' ? `
                                <button type="button" class="btn btn-success" onclick="this.payContribution('${contribution.id}')">
                                    <i class="fa fa-mobile-alt me-2"></i>Payer maintenant
                                </button>` : ''}
                                ${contribution.state === 'paid' ? `
                                <button type="button" class="btn btn-primary" onclick="this.downloadAttestation('${contribution.id}')">
                                    <i class="fa fa-download me-2"></i>Télécharger l'attestation
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if ($('#contributionDetailsModal').length === 0) {
                $('body').append(modalContent);
            } else {
                $('#contributionDetailsModal').replaceWith(modalContent);
            }

            var modal = new bootstrap.Modal(document.getElementById('contributionDetailsModal'));
            modal.show();
        },

        // Fonctions utilitaires
        _getCoverageBadgeClass: function (status) {
            var classes = {
                'active': 'bg-success',
                'pending': 'bg-warning',
                'inactive': 'bg-secondary',
                'suspended': 'bg-danger'
            };
            return classes[status] || 'bg-secondary';
        },

        _formatCoverageStatus: function (status) {
            var labels = {
                'active': 'Actif',
                'pending': 'En attente',
                'inactive': 'Inactif',
                'suspended': 'Suspendu'
            };
            return labels[status] || status;
        },

        _formatContributionType: function (type) {
            var types = {
                'cnps': 'CNPS - Retraite',
                'cnam': 'CNAM - Santé',
                'cmu': 'CMU - Universelle'
            };
            return types[type] || type;
        },

        _formatContributionStatus: function (status) {
            var statuses = {
                'pending': 'En attente',
                'paid': 'Payée',
                'cancelled': 'Annulée',
                'refunded': 'Remboursée'
            };
            return statuses[status] || status;
        },

        _getContributionStatusClass: function (status) {
            var classes = {
                'pending': 'bg-warning',
                'paid': 'bg-success',
                'cancelled': 'bg-danger',
                'refunded': 'bg-info'
            };
            return classes[status] || 'bg-secondary';
        },

        _getContributionStatusIcon: function (status) {
            var icons = {
                'pending': 'fa-clock',
                'paid': 'fa-check-circle',
                'cancelled': 'fa-times-circle',
                'refunded': 'fa-undo'
            };
            return icons[status] || 'fa-question-circle';
        },

        _formatPeriod: function (period) {
            // Format attendu: YYYY-MM
            if (!period) return '';
            var [year, month] = period.split('-');
            var monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
            return monthNames[parseInt(month) - 1] + ' ' + year;
        },

        _formatDate: function (dateString) {
            if (!dateString) return '';
            var date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        },

        _calculateDaysUntilDue: function (dueDate) {
            var due = new Date(dueDate);
            var now = new Date();
            var diffTime = due - now;
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(0, diffDays);
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

    publicWidget.registry.producer_social = ProducerSocial;

    return ProducerSocial;
});