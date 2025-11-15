/* ==========================================================================
   IFN Portal Producer - Training JavaScript
   Gestion de la formation et certification
   ========================================================================== */

odoo.define('ifn_portal_producer.training', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var ProducerTraining = publicWidget.Widget.extend({
        selector: '.producer-training-page',
        events: {
            'click .start-course-btn': '_onStartCourse',
            'click .continue-course-btn': '_onContinueCourse',
            'click .download-certificate-btn': '_onDownloadCertificate',
            'click .course-details-btn': '_onShowCourseDetails',
            'click .filter-course-btn': '_onFilterCourses',
        },

        init: function () {
            this._super.apply(this, arguments);
            this.coursesData = [];
            this.progressData = [];
            this.certificatesData = [];
            this.currentFilter = 'all';
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);

            // Initialiser l'interface
            this._initializeInterface();

            // Charger les données de formation
            this._loadTrainingData();

            // Configurer les animations
            this._setupAnimations();

            // Gérer le mode hors ligne
            this._handleOfflineMode();

            return this;
        },

        /**
         * Initialise l'interface de formation
         */
        _initializeInterface: function () {
            // Initialiser les animations des statistiques
            this._animateStatistics();

            // Configurer les tooltips
            this.$('[data-bs-toggle="tooltip"]').tooltip();

            // Initialiser les graphiques de progression
            this._initializeProgressCharts();
        },

        /**
         * Anime les statistiques de formation
         */
        _animateStatistics: function () {
            var self = this;

            // Animer le nombre de cours disponibles
            this._animateNumber($('.courses-available'), 0, this.coursesData.length);

            // Animer le nombre de cours en cours
            var inProgress = this.progressData.filter(function (p) { return p.completion_percentage < 100; }).length;
            this._animateNumber($('.courses-in-progress'), 0, inProgress);

            // Animer la progression globale
            var globalProgress = this._calculateGlobalProgress();
            this._animateNumber($('.global-progress'), 0, globalProgress, '%');

            // Animer le nombre de certificats
            this._animateNumber($('.certificates-earned'), 0, this.certificatesData.length);
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

                $element.text(current + (suffix || ''));

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }

            update();
        },

        /**
         * Calcule la progression globale de formation
         */
        _calculateGlobalProgress: function () {
            if (this.progressData.length === 0) return 0;

            var totalProgress = this.progressData.reduce(function (sum, progress) {
                return sum + progress.completion_percentage;
            }, 0);

            return Math.round(totalProgress / this.progressData.length);
        },

        /**
         * Charge les données de formation
         */
        _loadTrainingData: function () {
            var self = this;

            // Afficher l'état de chargement
            this._showLoadingState();

            rpc.query({
                route: '/portal/producer/api/training/data',
                params: {
                    filter: this.currentFilter
                }
            }).then(function (data) {
                self.coursesData = data.courses || [];
                self.progressData = data.progress || [];
                self.certificatesData = data.certificates || [];

                // Mettre à jour l'interface
                self._updateCoursesList(data.courses);
                self._updateProgressList(data.progress);
                self._updateCertificatesList(data.certificates);
                self._updateStatistics();

                // Cacher l'état de chargement
                self._hideLoadingState();
            }).fail(function () {
                self._showNotification('Erreur lors du chargement des données de formation', 'error');
                self._hideLoadingState();
                self._loadOfflineTrainingData();
            });
        },

        /**
         * Charge les données hors ligne
         */
        _loadOfflineTrainingData: function () {
            var offlineData = JSON.parse(localStorage.getItem('ifn_offline_training_data') || '{}');
            this.coursesData = offlineData.courses || [];
            this.progressData = offlineData.progress || [];
            this.certificatesData = offlineData.certificates || [];

            this._updateCoursesList(this.coursesData);
            this._updateProgressList(this.progressData);
            this._updateCertificatesList(this.certificatesData);
        },

        /**
         * Met à jour la liste des cours disponibles
         */
        _updateCoursesList: function (courses) {
            var self = this;
            var $coursesList = this.$('#coursesList');

            if ($coursesList.length === 0) return;

            $coursesList.empty();

            if (!courses || courses.length === 0) {
                $coursesList.html(`
                    <div class="text-center py-5">
                        <i class="fa fa-book fa-3x text-muted mb-3"></i>
                        <h5>Aucun cours disponible</h5>
                        <p class="text-muted">Revenez plus tard pour découvrir de nouveaux cours</p>
                    </div>
                `);
                return;
            }

            var coursesHtml = '<div class="row">';
            courses.forEach(function (course) {
                coursesHtml += self._createCourseCard(course);
            });
            coursesHtml += '</div>';

            $coursesList.html(coursesHtml);
        },

        /**
         * Crée une carte de cours
         */
        _createCourseCard: function (course) {
            var progress = this._getCourseProgress(course.id);
            var progressPercentage = progress ? progress.completion_percentage : 0;
            var isCompleted = progressPercentage >= 100;
            var isStarted = progressPercentage > 0;

            var cardHtml = `
                <div class="col-md-4 mb-3">
                    <div class="card course-card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title">${course.name}</h6>
                                <span class="badge ${this._getCourseLevelBadgeClass(course.level)}">
                                    ${this._formatCourseLevel(course.level)}
                                </span>
                            </div>
                            <p class="card-text small text-muted">${course.description || ''}</p>

                            <div class="course-meta mb-3">
                                <div class="d-flex justify-content-between text-muted small">
                                    <span><i class="fa fa-clock me-1"></i>${course.duration || 0} min</span>
                                    <span><i class="fa fa-signal me-1"></i>${this._formatCourseLevel(course.level)}</span>
                                </div>
                            </div>

                            ${isStarted ? `
                            <div class="progress mb-3" style="height: 6px;">
                                <div class="progress-bar ${isCompleted ? 'bg-success' : 'bg-primary'}"
                                     role="progressbar"
                                     style="width: ${progressPercentage}%">
                                </div>
                            </div>
                            <small class="text-muted">${progressPercentage}% complété</small>
                            ` : ''}

                            <div class="d-flex justify-content-between align-items-center mt-auto">
                                ${isCompleted ? `
                                <button class="btn btn-sm btn-outline-success" disabled>
                                    <i class="fa fa-check me-1"></i>Terminé
                                </button>
                                ` : isStarted ? `
                                <button class="btn btn-sm btn-primary continue-course-btn"
                                        data-course-id="${course.id}">
                                    <i class="fa fa-play me-1"></i>Continuer
                                </button>
                                ` : `
                                <button class="btn btn-sm btn-primary start-course-btn"
                                        data-course-id="${course.id}">
                                    <i class="fa fa-play me-1"></i>Commencer
                                </button>
                                `}
                                <button class="btn btn-sm btn-outline-info course-details-btn"
                                        data-course-id="${course.id}">
                                    <i class="fa fa-info-circle"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            return cardHtml;
        },

        /**
         * Met à jour la liste des certificats
         */
        _updateCertificatesList: function (certificates) {
            var self = this;
            var $certificatesList = this.$('#certificatesList');

            if ($certificatesList.length === 0) return;

            $certificatesList.empty();

            if (!certificates || certificates.length === 0) {
                $certificatesList.html(`
                    <div class="text-center py-5">
                        <i class="fa fa-certificate fa-3x text-muted mb-3"></i>
                        <h5>Aucun certificat obtenu</h5>
                        <p class="text-muted">Terminez des cours pour obtenir des certificats</p>
                    </div>
                `);
                return;
            }

            var certificatesHtml = '<div class="row">';
            certificates.forEach(function (certificate) {
                certificatesHtml += self._createCertificateCard(certificate);
            });
            certificatesHtml += '</div>';

            $certificatesList.html(certificatesHtml);
        },

        /**
         * Crée une carte de certificat
         */
        _createCertificateCard: function (certificate) {
            return `
                <div class="col-md-4 mb-3">
                    <div class="card border-success h-100">
                        <div class="card-body text-center">
                            <i class="fa fa-certificate fa-3x text-success mb-3"></i>
                            <h6 class="card-title">${certificate.course_name || 'Certificat'}</h6>
                            <p class="text-muted small mb-2">
                                Obtenu le ${this._formatDate(certificate.date_issued)}
                            </p>
                            <div class="text-muted small mb-3">
                                Certificat n° ${certificate.certificate_number || certificate.id}
                            </div>
                            <button class="btn btn-outline-success btn-sm download-certificate-btn"
                                    data-certificate-id="${certificate.id}">
                                <i class="fa fa-download me-1"></i>Télécharger
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Initialise les graphiques de progression
         */
        _initializeProgressCharts: function () {
            var self = this;

            // Graphique de progression par type de cours
            this._initializeProgressByTypeChart();

            // Graphique des temps de formation
            this._initializeTrainingTimeChart();
        },

        /**
         * Initialise le graphique de progression par type
         */
        _initializeProgressByTypeChart: function () {
            var ctx = document.getElementById('progressByTypeChart');
            if (!ctx) return;

            var chartData = this._getProgressByTypeData();

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
                                        return context.dataset.label + ': ' + context.parsed.y + '%';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (e) {
                console.warn('Impossible d\'initialiser le graphique de progression par type:', e);
            }
        },

        /**
         * Initialise le graphique des temps de formation
         */
        _initializeTrainingTimeChart: function () {
            var ctx = document.getElementById('trainingTimeChart');
            if (!ctx) return;

            var chartData = this._getTrainingTimeData();

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
                                        return context.parsed.y + ' min';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return value + ' min';
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (e) {
                console.warn('Impossible d\'initialiser le graphique des temps de formation:', e);
            }
        },

        /**
         * Gère le début d'un cours
         */
        _onStartCourse: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var courseId = $btn.data('course-id');

            // Vérifier la connectivité
            if (!navigator.onLine) {
                self._showNotification('Mode hors ligne - Impossible de démarrer un nouveau cours', 'warning');
                return;
            }

            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin me-1"></i>Chargement...');

            rpc.query({
                route: '/portal/producer/api/training/start',
                params: { course_id: courseId }
            }).then(function (result) {
                if (result.success) {
                    // Rediriger vers la page du cours
                    window.location.href = result.course_url || '/portal/producer/training/course/' + courseId;
                } else {
                    self._showNotification(result.message || 'Erreur lors du démarrage du cours', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion', 'error');
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-play me-1"></i>Commencer');
            });
        },

        /**
         * Gère la continuation d'un cours
         */
        _onContinueCourse: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var courseId = $btn.data('course-id');

            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin me-1"></i>Chargement...');

            rpc.query({
                route: '/portal/producer/api/training/continue',
                params: { course_id: courseId }
            }).then(function (result) {
                if (result.success) {
                    // Rediriger vers la page du cours
                    window.location.href = result.course_url || '/portal/producer/training/course/' + courseId;
                } else {
                    self._showNotification(result.message || 'Erreur lors de la continuation du cours', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion', 'error');
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-play me-1"></i>Continuer');
            });
        },

        /**
         * Gère le téléchargement d'un certificat
         */
        _onDownloadCertificate: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var certificateId = $btn.data('certificate-id');

            $btn.prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin"></i>');

            rpc.query({
                route: '/portal/producer/api/training/certificate',
                params: { certificate_id: certificateId }
            }).then(function (result) {
                if (result.success && result.pdf_url) {
                    // Télécharger le PDF
                    var link = document.createElement('a');
                    link.href = result.pdf_url;
                    link.download = 'certificat_' + certificateId + '.pdf';
                    link.click();

                    self._showNotification('Certificat téléchargé avec succès', 'success');
                } else {
                    self._showNotification('Impossible de télécharger le certificat', 'error');
                }
            }).fail(function () {
                self._showNotification('Erreur de connexion', 'error');
            }).always(function () {
                $btn.prop('disabled', false)
                    .html('<i class="fa fa-download"></i>');
            });
        },

        /**
         * Affiche les détails d'un cours
         */
        _onShowCourseDetails: function (ev) {
            ev.preventDefault();
            var self = this;

            var $btn = $(ev.currentTarget);
            var courseId = $btn.data('course-id');

            var course = this.coursesData.find(function (c) { return c.id == courseId; });
            if (!course) {
                self._showNotification('Cours introuvable', 'error');
                return;
            }

            // Afficher le modal de détails
            this._showCourseDetailsModal(course);
        },

        /**
         * Affiche le modal des détails du cours
         */
        _showCourseDetailsModal: function (course) {
            var progress = this._getCourseProgress(course.id);
            var progressPercentage = progress ? progress.completion_percentage : 0;

            var modalContent = `
                <div class="modal fade" id="courseDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fa fa-book me-2"></i>
                                    ${course.name}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-8">
                                        <h6>Description</h6>
                                        <p>${course.description || 'Aucune description disponible'}</p>

                                        <h6>Objectifs</h6>
                                        <ul>
                                            ${(course.objectives || ['Apprendre les bases', 'Acquérir des compétences pratiques']).map(function(obj) {
                                                return '<li>' + obj + '</li>';
                                            }).join('')}
                                        </ul>

                                        <h6>Contenu</h6>
                                        <div class="course-content">
                                            ${(course.modules || [
                                                {name: 'Module 1: Introduction', duration: 15},
                                                {name: 'Module 2: Théorie', duration: 30},
                                                {name: 'Module 3: Pratique', duration: 45}
                                            ]).map(function(module) {
                                                return `
                                                <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                                                    <span>${module.name}</span>
                                                    <span class="badge bg-secondary">${module.duration} min</span>
                                                </div>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card">
                                            <div class="card-body">
                                                <h6>Informations</h6>
                                                <table class="table table-sm">
                                                    <tr>
                                                        <td><strong>Niveau:</strong></td>
                                                        <td><span class="badge ${this._getCourseLevelBadgeClass(course.level)}">${this._formatCourseLevel(course.level)}</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Durée:</strong></td>
                                                        <td>${course.duration || 0} minutes</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Langue:</strong></td>
                                                        <td>${course.language || 'Français'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Format:</strong></td>
                                                        <td>${course.format || 'Vidéo + Audio'}</td>
                                                    </tr>
                                                </table>

                                                ${progressPercentage > 0 ? `
                                                <h6 class="mt-3">Progression</h6>
                                                <div class="progress mb-2">
                                                    <div class="progress-bar bg-primary"
                                                         role="progressbar"
                                                         style="width: ${progressPercentage}%">
                                                    </div>
                                                </div>
                                                <small class="text-muted">${progressPercentage}% complété</small>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                                ${progressPercentage >= 100 ? `
                                <button class="btn btn-success" disabled>
                                    <i class="fa fa-check me-2"></i>Cours terminé
                                </button>
                                ` : progressPercentage > 0 ? `
                                <button class="btn btn-primary" onclick="this.continueCourse('${course.id}')">
                                    <i class="fa fa-play me-2"></i>Continuer
                                </button>
                                ` : `
                                <button class="btn btn-primary" onclick="this.startCourse('${course.id}')">
                                    <i class="fa fa-play me-2"></i>Commencer
                                </button>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if ($('#courseDetailsModal').length === 0) {
                $('body').append(modalContent);
            } else {
                $('#courseDetailsModal').replaceWith(modalContent);
            }

            var modal = new bootstrap.Modal(document.getElementById('courseDetailsModal'));
            modal.show();
        },

        /**
         * Gère le filtrage des cours
         */
        _onFilterCourses: function (ev) {
            ev.preventDefault();
            var $btn = $(ev.currentTarget);
            var filter = $btn.data('filter');

            // Mettre à jour le filtre actif
            this.$('.filter-course-btn').removeClass('active');
            $btn.addClass('active');

            // Appliquer le filtre
            this.currentFilter = filter;
            this._loadTrainingData();
        },

        /**
         * Configure les animations
         */
        _setupAnimations: function () {
            var self = this;

            // Animation au scroll
            this.$('.course-card, .certificate-card').each(function (index) {
                var $card = $(this);
                $card.addClass('fade-in-up');
                $card.css('animation-delay', (index * 0.1) + 's');
            });

            // Effet de hover sur les cartes
            this.$('.course-card, .certificate-card').hover(
                function () {
                    $(this).addClass('shadow-lg');
                },
                function () {
                    $(this).removeClass('shadow-lg');
                }
            );
        },

        /**
         * Gère le mode hors ligne
         */
        _handleOfflineMode: function () {
            var self = this;

            window.addEventListener('online', function () {
                self._showNotification('Connexion rétablie', 'success');
                self._loadTrainingData();
            });

            window.addEventListener('offline', function () {
                self._showNotification('Mode hors ligne - Accès limité', 'warning');
            });
        },

        // Fonctions utilitaires
        _getCourseProgress: function (courseId) {
            return this.progressData.find(function (p) { return p.course_id == courseId; });
        },

        _getCourseLevelBadgeClass: function (level) {
            var classes = {
                'beginner': 'bg-success',
                'intermediate': 'bg-warning',
                'advanced': 'bg-danger'
            };
            return classes[level] || 'bg-secondary';
        },

        _formatCourseLevel: function (level) {
            var levels = {
                'beginner': 'Débutant',
                'intermediate': 'Intermédiaire',
                'advanced': 'Avancé'
            };
            return levels[level] || level;
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

        _getProgressByTypeData: function () {
            // Simulation de données - à remplacer par des vraies données
            return {
                labels: ['Agriculture', 'Gestion', 'Technologie', 'Santé', 'Finances'],
                datasets: [{
                    label: 'Progression moyenne',
                    data: [75, 60, 45, 80, 55],
                    backgroundColor: '#009739'
                }]
            };
        },

        _getTrainingTimeData: function () {
            // Simulation de données - à remplacer par des vraies données
            return {
                labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
                datasets: [{
                    label: 'Temps de formation (min)',
                    data: [120, 180, 150, 200],
                    borderColor: '#F77F00',
                    backgroundColor: 'rgba(247, 127, 0, 0.1)',
                    tension: 0.4
                }]
            };
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

    publicWidget.registry.producer_training = ProducerTraining;

    return ProducerTraining;
});