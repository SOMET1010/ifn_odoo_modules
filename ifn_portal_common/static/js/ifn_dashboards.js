/* ================================================== */
/*          IFN DASHBOARDS - INTERACTIVITÉ           */
/* ================================================== */

(function() {
    'use strict';

    // Configuration globale
    const IFN_CONFIG = {
        refreshInterval: 30000, // 30 secondes
        animationDuration: 300,
        charts: {},
        notifications: []
    };

    // ==================================================
    //                 INITIALISATION                  //
    // ==================================================

    document.addEventListener('DOMContentLoaded', function() {
        initializeDashboards();
        setupEventListeners();
        startRealTimeUpdates();
        initializeCharts();
        setupKeyboardNavigation();
    });

    // ==================================================
    //               DASHBOARDS SETUP                  //
    // ==================================================

    function initializeDashboards() {
        // Détection du type de dashboard
        const dashboardType = detectDashboardType();
        
        if (dashboardType) {
            console.log('Initialisation dashboard:', dashboardType);
            initSpecificDashboard(dashboardType);
            applyTheme(dashboardType);
        }

        // Animation d'entrée des cards
        animateCardsOnLoad();
        
        // Mise à jour des compteurs
        updateCounters();
    }

    function detectDashboardType() {
        const title = document.querySelector('.ifn-dashboard-header h1');
        if (!title) return null;

        const titleText = title.textContent.toLowerCase();
        
        if (titleText.includes('marchand')) return 'marchand';
        if (titleText.includes('producteur')) return 'producteur';
        if (titleText.includes('coopérative') || titleText.includes('cooperative')) return 'cooperative';
        if (titleText.includes('produits') || titleText.includes('visualisation')) return 'produits';
        
        return null;
    }

    function initSpecificDashboard(type) {
        switch(type) {
            case 'marchand':
                initMarchandDashboard();
                break;
            case 'producteur':
                initProducteurDashboard();
                break;
            case 'cooperative':
                initCooperativeDashboard();
                break;
            case 'produits':
                initProduitsDashboard();
                break;
        }
    }

    function applyTheme(type) {
        const body = document.body;
        body.classList.remove('theme-marchand', 'theme-producteur', 'theme-cooperative');
        
        const themeMap = {
            'marchand': 'theme-marchand',
            'producteur': 'theme-producteur',
            'cooperative': 'theme-cooperative'
        };
        
        if (themeMap[type]) {
            body.classList.add(themeMap[type]);
        }
    }

    // ==================================================
    //               DASHBOARDS SPÉCIFIQUES            //
    // ==================================================

    function initMarchandDashboard() {
        // Surveillance des stocks faibles
        monitorStockLevels();
        
        // Mise à jour automatique des ventes
        updateSalesMetrics();
        
        // Notifications pour nouvelles commandes
        setupOrderNotifications();
    }

    function initProducteurDashboard() {
        // Suivi des maturité des cultures
        trackCropMaturity();
        
        // Alertes de récolte
        setupHarvestAlerts();
        
        // Mise à jour des rendements
        updateYieldMetrics();
    }

    function initCooperativeDashboard() {
        // Suivi des performances membres
        monitorMemberPerformance();
        
        // Planification collective
        setupCollectivePlanning();
        
        // Métriques de groupe
        updateGroupMetrics();
    }

    function initProduitsDashboard() {
        // Filtrage dynamique des produits
        setupProductFilters();
        
        // Tri des produits
        setupProductSorting();
        
        // Mode d'affichage
        setupViewModes();
    }

    // ==================================================
    //               EVENT LISTENERS                   //
    // ==================================================

    function setupEventListeners() {
        // Boutons d'action rapide
        document.addEventListener('click', function(e) {
            if (e.target.closest('[data-action]')) {
                e.preventDefault();
                handleQuickAction(e.target.closest('[data-action]'));
            }
        });

        // Boutons de filtres
        document.addEventListener('click', function(e) {
            if (e.target.matches('.btn-outline-primary')) {
                handleFilterClick(e.target);
            }
        });

        // Cartes produit au survol
        document.addEventListener('mouseenter', function(e) {
            if (e.target.closest('.ifn-product-card, .ifn-culture-card, .ifn-member-card')) {
                handleCardHover(e.target.closest('.ifn-product-card, .ifn-culture-card, .ifn-member-card'));
            }
        }, true);

        // Resize pour responsivité
        window.addEventListener('resize', debounce(handleResize, 250));

        // Scroll pour animations
        window.addEventListener('scroll', throttle(handleScroll, 100));
    }

    function handleQuickAction(button) {
        const action = button.getAttribute('data-action');
        const card = button.closest('.card');
        
        // Animation de feedback
        button.classList.add('btn-loading');
        
        setTimeout(() => {
            button.classList.remove('btn-loading');
            
            // Exécution de l'action
            executeAction(action, card);
        }, IFN_CONFIG.animationDuration);
    }

    function executeAction(action, context) {
        const actions = {
            'edit': () => openEditModal(context),
            'analyze': () => openAnalyticsModal(context),
            'add': () => openAddModal(context),
            'delete': () => confirmDelete(context),
            'refresh': () => refreshData(context)
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    // ==================================================
    //               MONITORING & ALERTES              //
    // ==================================================

    function monitorStockLevels() {
        const stockBars = document.querySelectorAll('.progress-bar');
        
        stockBars.forEach(bar => {
            const width = parseInt(bar.style.width);
            const card = bar.closest('.card');
            
            if (width < 25) {
                // Stock critique
                showAlert(card, 'Stock critique', 'warning');
            } else if (width < 50) {
                // Stock faible
                showAlert(card, 'Stock faible', 'info');
            }
        });
    }

    function showAlert(card, message, type) {
        const existingAlert = card.querySelector('.ifn-alert');
        if (existingAlert) return; // Éviter les doublons

        const alert = document.createElement('div');
        alert.className = `ifn-alert alert alert-${type} alert-dismissible fade show position-absolute`;
        alert.style.top = '10px';
        alert.style.right = '10px';
        alert.style.zIndex = '1000';
        alert.innerHTML = `
            <i class="fa fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        card.style.position = 'relative';
        card.appendChild(alert);

        // Auto-dismiss après 5 secondes
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // ==================================================
    //               ANIMATIONS & EFFETS               //
    // ==================================================

    function animateCardsOnLoad() {
        const cards = document.querySelectorAll('.card');
        
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    function handleCardHover(card) {
        // Effet de glow au survol
        card.style.transition = 'all 0.3s ease';
        
        // Animation des métriques
        const metrics = card.querySelectorAll('.fw-bold');
        metrics.forEach(metric => {
            metric.style.transform = 'scale(1.05)';
        });
        
        setTimeout(() => {
            metrics.forEach(metric => {
                metric.style.transform = 'scale(1)';
            });
        }, 200);
    }

    function updateCounters() {
        const counters = document.querySelectorAll('.counter');
        
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 16);
        });
    }

    // ==================================================
    //               FILTRES & TRI                     //
    // ==================================================

    function setupProductFilters() {
        const filterButtons = document.querySelectorAll('.btn-outline-primary');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Mise à jour interface
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Filtrage
                const category = this.textContent.trim();
                filterProducts(category);
            });
        });
    }

    function filterProducts(category) {
        const productCards = document.querySelectorAll('.ifn-product-visual-card');
        
        productCards.forEach(card => {
            const cardCategory = getCardCategory(card);
            
            if (category === 'Tous' || cardCategory === category) {
                card.style.display = 'block';
                card.style.animation = 'fadeInUp 0.5s ease';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function getCardCategory(card) {
        const icon = card.querySelector('i');
        if (!icon) return 'Autres';
        
        const iconClass = icon.className;
        
        if (iconClass.includes('fa-carrot')) return 'Céréales';
        if (iconClass.includes('fa-apple-alt') && card.textContent.includes('Tomate')) return 'Légumes';
        if (iconClass.includes('fa-seedling')) return 'Céréales';
        if (iconClass.includes('fa-pepper-hot')) return 'Épices';
        if (iconClass.includes('fa-apple-alt')) return 'Fruits';
        
        return 'Autres';
    }

    function setupProductSorting() {
        // Tri par prix, stock, popularité
        const sortingOptions = ['Prix', 'Stock', 'Popularité', 'Croissance'];
        
        sortingOptions.forEach(option => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-secondary btn-sm ms-2';
            button.textContent = `Trier par ${option}`;
            button.addEventListener('click', () => sortProducts(option));
        });
    }

    function sortProducts(criteria) {
        const container = document.querySelector('.row.g-4');
        const cards = Array.from(container.children);
        
        cards.sort((a, b) => {
            const valueA = getSortValue(a, criteria);
            const valueB = getSortValue(b, criteria);
            
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return criteria === 'Prix' ? valueB - valueA : valueA - valueB;
            }
            
            return valueA.localeCompare(valueB);
        });
        
        // Réorganisation DOM
        cards.forEach(card => container.appendChild(card));
        
        // Animation
        cards.forEach((card, index) => {
            card.style.animation = `fadeInUp 0.5s ease ${index * 0.1}s both`;
        });
    }

    function getSortValue(card, criteria) {
        switch(criteria) {
            case 'Prix':
                const priceText = card.querySelector('.fw-bold.text-success').textContent;
                return parseInt(priceText.replace(/\D/g, ''));
            case 'Stock':
                const stockText = card.querySelector('.fw-bold').textContent;
                return parseInt(stockText.replace(/\D/g, ''));
            case 'Croissance':
                const growthText = card.querySelector('.text-success, .text-danger');
                return parseInt(growthText.textContent.replace(/[^\d]/g, ''));
            default:
                return 0;
        }
    }

    // ==================================================
    //               MISE À JOUR TEMPS RÉEL           //
    // ==================================================

    function startRealTimeUpdates() {
        setInterval(() => {
            updateMetrics();
            refreshAlerts();
        }, IFN_CONFIG.refreshInterval);
    }

    function updateMetrics() {
        // Simulation de mise à jour des métriques
        const metrics = document.querySelectorAll('.card-body .fw-bold');
        
        metrics.forEach(metric => {
            const currentValue = parseInt(metric.textContent.replace(/[^\d]/g, ''));
            if (currentValue && Math.random() > 0.7) {
                // Légère variation pour simulation
                const variation = Math.floor((Math.random() - 0.5) * currentValue * 0.02);
                const newValue = Math.max(0, currentValue + variation);
                
                animateMetricChange(metric, newValue);
            }
        });
    }

    function animateMetricChange(element, newValue) {
        const originalText = element.textContent;
        
        element.style.transition = 'all 0.3s ease';
        element.style.transform = 'scale(1.1)';
        element.style.color = '#28a745';
        
        setTimeout(() => {
            element.textContent = originalText.replace(/\d+/, newValue);
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 150);
    }

    // ==================================================
    //               ACCESSIBILITÉ                     //
    // ==================================================

    function setupKeyboardNavigation() {
        document.addEventListener('keydown', function(e) {
            // Navigation avec flèches
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const cards = document.querySelectorAll('.ifn-product-card, .ifn-culture-card, .ifn-member-card');
                const focusedCard = document.activeElement.closest('.ifn-product-card, .ifn-culture-card, .ifn-member-card');
                
                if (focusedCard) {
                    e.preventDefault();
                    const currentIndex = Array.from(cards).indexOf(focusedCard);
                    let nextIndex;
                    
                    if (e.key === 'ArrowDown') {
                        nextIndex = (currentIndex + 1) % cards.length;
                    } else {
                        nextIndex = (currentIndex - 1 + cards.length) % cards.length;
                    }
                    
                    cards[nextIndex].focus();
                }
            }
            
            // Activation avec Entrée
            if (e.key === 'Enter' && document.activeElement.closest('.card')) {
                e.preventDefault();
                const actionButton = document.activeElement.closest('.card').querySelector('.btn');
                if (actionButton) {
                    actionButton.click();
                }
            }
        });
    }

    // ==================================================
    //               MODALES & DIALOGUES               //
    // ==================================================

    function openEditModal(card) {
        const modal = createModal('Modifier', card);
        showModal(modal);
    }

    function openAnalyticsModal(card) {
        const modal = createAnalyticsModal(card);
        showModal(modal);
    }

    function openAddModal(card) {
        const modal = createAddModal(card);
        showModal(modal);
    }

    function createModal(title, card) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Contenu pour ${title} - ${getCardTitle(card)}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-primary">Sauvegarder</button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    function getCardTitle(card) {
        const titleElement = card.querySelector('h6, .card-title');
        return titleElement ? titleElement.textContent.trim() : 'Element';
    }

    // ==================================================
    //               UTILITAIRES                       //
    // ==================================================

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    function handleResize() {
        // Recalcul des layouts
        updateCardLayouts();
    }

    function handleScroll() {
        // Animations au scroll
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            const cardTop = card.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (cardTop < windowHeight * 0.8) {
                card.classList.add('visible');
            }
        });
    }

    function updateCardLayouts() {
        // Responsivité dynamique
        const containerWidth = document.querySelector('.container').offsetWidth;
        
        if (containerWidth < 768) {
            document.body.classList.add('mobile-layout');
        } else {
            document.body.classList.remove('mobile-layout');
        }
    }

    // ==================================================
    //               GESTION ERREURS                   //
    // ==================================================

    window.addEventListener('error', function(e) {
        console.error('Erreur Dashboard IFN:', e.error);
        
        // Notification utilisateur
        showNotification('Une erreur est survenue', 'error');
    });

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} position-fixed`;
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // ==================================================
    //               EXPORT GLOBAL                     //
    // ==================================================

    // Exposure des fonctions pour debugging
    window.IFN_Dashboards = {
        config: IFN_CONFIG,
        refresh: updateMetrics,
        filter: filterProducts,
        sort: sortProducts,
        showAlert: showAlert,
        notify: showNotification
    };

})();