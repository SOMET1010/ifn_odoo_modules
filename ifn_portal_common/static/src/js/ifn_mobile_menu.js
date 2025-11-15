/* =============================================================================
   IFN Portal Common - Mobile Menu
   ============================================================================= */

/**
 * Menu mobile avec animations fluides
 * Fonctionnalités : gestes tactiles, animations CSS3, gestion d'état
 */
(function() {
    'use strict';

    const IFN_MobileMenu = {
        // Configuration
        config: {
            animationDuration: 300,
            swipeThreshold: 50,
            backdropOpacity: 0.5,
            maxMenuWidth: 320,
            autoCloseDelay: 3000,
            touchZoneSize: 40
        },

        // État global
        state: {
            isOpen: false,
            isAnimating: false,
            currentPanel: 'main', // main | settings | profile | notifications
            touchStartX: 0,
            touchStartY: 0,
            lastTouchX: 0,
            swipeDirection: null,
            menuHistory: ['main']
        },

        // Panneaux de menu
        panels: {
            main: {
                id: 'main',
                title: 'Menu Principal',
                icon: '📱',
                items: [
                    { id: 'home', label: 'Accueil', icon: '🏠', route: '/', badge: null },
                    { id: 'services', label: 'Services', icon: '🛠️', route: '/services', badge: 'new' },
                    { id: 'notifications', label: 'Notifications', icon: 'notification_icon.png', route: '/notifications', badge: 3 },
                    { id: 'profile', label: 'Mon Profil', icon: '👤', route: '/profile', badge: null },
                    { id: 'settings', label: 'Paramètres', icon: '⚙️', route: '/settings', badge: null },
                    { id: 'help', label: 'Aide', icon: 'help_icon.png', route: '/help', badge: null }
                ]
            },
            settings: {
                id: 'settings',
                title: 'Paramètres',
                icon: '⚙️',
                canBack: true,
                items: [
                    { id: 'language', label: 'Langue', icon: '🌐', action: 'set-language' },
                    { id: 'theme', label: 'Thème', icon: '🎨', action: 'set-theme' },
                    { id: 'notifications', label: 'Notifications', icon: '🔔', action: 'toggle-notifications' },
                    { id: 'privacy', label: 'Confidentialité', icon: '🔒', action: 'open-privacy' },
                    { id: 'about', label: 'À propos', icon: 'ℹ️', action: 'show-about' }
                ]
            },
            profile: {
                id: 'profile',
                title: 'Mon Profil',
                icon: '👤',
                canBack: true,
                items: [
                    { id: 'edit-profile', label: 'Modifier profil', icon: '✏️', action: 'edit-profile' },
                    { id: 'change-password', label: 'Changer mot de passe', icon: '🔑', action: 'change-password' },
                    { id: 'security', label: 'Sécurité', icon: '🛡️', action: 'security-settings' },
                    { id: 'logout', label: 'Se déconnecter', icon: '🚪', action: 'logout', style: 'danger' }
                ]
            },
            notifications: {
                id: 'notifications',
                title: 'Notifications',
                icon: 'notification_icon.png',
                canBack: true,
                items: []
            }
        },

        /**
         * Initialisation du menu mobile
         */
        init: function() {
            console.log('[IFN Mobile Menu] Initialisation...');
            
            this.createMenuStructure();
            this.setupEventListeners();
            this.setupTouchGestures();
            this.loadNotificationBadge();
            
            // Exposer l'API globale
            window.IFN_MobileMenu = this;
            
            console.log('[IFN Mobile Menu] Initialisation terminée');
        },

        /**
         * Créer la structure du menu
         */
        createMenuStructure: function() {
            const menuHTML = `
                <div id="mobile-menu" class="mobile-menu">
                    <div class="menu-backdrop"></div>
                    <div class="menu-container">
                        <div class="menu-header">
                            <button class="menu-toggle" id="menu-toggle">
                                <span class="hamburger-line"></span>
                                <span class="hamburger-line"></span>
                                <span class="hamburger-line"></span>
                            </button>
                            <div class="menu-title">
                                <span id="menu-title">${this.panels[this.state.currentPanel].title}</span>
                            </div>
                            <button class="menu-close" id="menu-close">✕</button>
                        </div>
                        <div class="menu-content">
                            <div class="menu-panel active" id="panel-${this.state.currentPanel}">
                                <!-- Contenu généré dynamiquement -->
                            </div>
                        </div>
                        <div class="menu-footer">
                            <div class="menu-version">IFN Portal v2.0</div>
                            <div class="menu-status">
                                <span class="online-status online">●</span>
                                <span class="status-text">En ligne</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', menuHTML);
            
            // Remplir le panneau principal
            this.renderPanel('main');
        },

        /**
         * Rendu d'un panneau
         */
        renderPanel: function(panelId) {
            const panel = this.panels[panelId];
            if (!panel) return;

            const panelElement = document.getElementById(`panel-${panelId}`);
            if (!panelElement) return;

            let itemsHTML = '';

            switch (panelId) {
                case 'notifications':
                    itemsHTML = this.renderNotificationsPanel();
                    break;
                default:
                    itemsHTML = panel.items.map(item => this.renderMenuItem(item)).join('');
                    break;
            }

            panelElement.innerHTML = `
                <div class="panel-header">
                    <h3>${panel.title}</h3>
                </div>
                <div class="panel-content">
                    <ul class="menu-items">
                        ${itemsHTML}
                    </ul>
                </div>
            `;

            // Mettre à jour le titre
            document.getElementById('menu-title').textContent = panel.title;
        },

        /**
         * Rendu d'un élément de menu
         */
        renderMenuItem: function(item) {
            const hasBadge = item.badge && item.badge !== null;
            const badgeClass = typeof item.badge === 'number' ? 'badge-number' : 'badge-text';
            const badgeContent = typeof item.badge === 'number' ? item.badge : item.badge;

            // Déterminer l'icône (texte ou image)
            let iconHTML = '';
            if (item.icon && item.icon.includes('.png')) {
                iconHTML = `<img src="/static/src/img/icons/${item.icon}" alt="${item.label}" class="menu-icon-img">`;
            } else {
                iconHTML = `<span class="menu-icon">${item.icon || '•'}</span>`;
            }

            return `
                <li class="menu-item ${item.style || ''}">
                    <button class="menu-item-button" 
                            data-action="${item.action || 'navigate'}" 
                            data-route="${item.route || ''}" 
                            data-item-id="${item.id}">
                        <div class="menu-item-content">
                            <div class="menu-item-left">
                                ${iconHTML}
                                <span class="menu-item-label">${item.label}</span>
                            </div>
                            ${hasBadge ? `
                                <div class="menu-item-badge ${badgeClass}">${badgeContent}</div>
                            ` : ''}
                        </div>
                    </button>
                </li>
            `;
        },

        /**
         * Rendu du panneau de notifications
         */
        renderNotificationsPanel: function() {
            // Simulation de notifications
            const notifications = [
                { id: 1, title: 'Nouveau message', message: 'Vous avez reçu un nouveau message', time: '2 min', unread: true },
                { id: 2, title: 'Alerte marché', message: 'Prix de l\'igname en hausse', time: '1h', unread: true },
                { id: 3, title: 'Mise à jour système', message: 'Nouvelle version disponible', time: '2h', unread: false },
                { id: 4, title: 'Rappel', message: 'Réunion cooperative demain', time: '1j', unread: false }
            ];

            return notifications.map(notification => `
                <li class="notification-item ${notification.unread ? 'unread' : ''}">
                    <div class="notification-content">
                        <div class="notification-header">
                            <span class="notification-title">${notification.title}</span>
                            <span class="notification-time">${notification.time}</span>
                        </div>
                        <p class="notification-message">${notification.message}</p>
                    </div>
                    <div class="notification-actions">
                        <button class="notification-action" data-action="mark-read" data-id="${notification.id}">
                            ${notification.unread ? '✓' : '⋯'}
                        </button>
                    </div>
                </li>
            `).join('');
        },

        /**
         * Configuration des écouteurs d'événements
         */
        setupEventListeners: function() {
            // Boutons de contrôle
            document.addEventListener('click', (e) => {
                if (e.target.matches('#menu-toggle')) {
                    this.toggleMenu();
                }
                
                if (e.target.matches('#menu-close')) {
                    this.closeMenu();
                }
                
                if (e.target.matches('.menu-backdrop')) {
                    this.closeMenu();
                }
                
                if (e.target.matches('[data-action="navigate"]')) {
                    this.handleNavigation(e.target);
                }
                
                if (e.target.matches('[data-action="set-language"]')) {
                    this.handleLanguageChange();
                }
                
                if (e.target.matches('[data-action="set-theme"]')) {
                    this.handleThemeChange();
                }
                
                if (e.target.matches('[data-action="toggle-notifications"]')) {
                    this.handleNotificationsToggle();
                }
                
                if (e.target.matches('[data-action="logout"]')) {
                    this.handleLogout();
                }
                
                if (e.target.matches('[data-action="back"]')) {
                    this.goBack();
                }
                
                // Gestion des notifications
                if (e.target.matches('[data-action="mark-read"]')) {
                    this.markNotificationAsRead(e.target.dataset.id);
                }
            });

            // Gestion des touches clavier
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.state.isOpen) {
                    this.closeMenu();
                }
            });

            // Gestion de l'orientation
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.adjustMenuPosition();
                }, 100);
            });
        },

        /**
         * Configuration des gestes tactiles
         */
        setupTouchGestures: function() {
            const menuContainer = document.querySelector('.menu-container');
            
            // Démarrage du geste
            menuContainer.addEventListener('touchstart', (e) => {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.lastTouchX = this.touchStartX;
            }, { passive: true });

            // Mouvement du geste
            menuContainer.addEventListener('touchmove', (e) => {
                if (this.state.isOpen && !this.state.isAnimating) {
                    const touchX = e.touches[0].clientX;
                    const deltaX = touchX - this.touchStartX;
                    
                    // Détection du swipe depuis le bord
                    if (this.touchStartX < this.config.touchZoneSize) {
                        // Slide depuis le bord gauche
                        if (deltaX > 0) {
                            e.preventDefault();
                            this.animateMenuSlide(deltaX);
                        }
                    }
                    
                    this.lastTouchX = touchX;
                }
            }, { passive: false });

            // Fin du geste
            menuContainer.addEventListener('touchend', (e) => {
                if (this.state.isOpen) {
                    const touchX = e.changedTouches[0].clientX;
                    const deltaX = touchX - this.touchStartX;
                    
                    if (deltaX > this.config.swipeThreshold) {
                        this.closeMenu();
                    } else {
                        this.resetMenuPosition();
                    }
                }
            }, { passive: true });
        },

        /**
         * Basculer l'ouverture/fermeture du menu
         */
        toggleMenu: function() {
            if (this.state.isOpen) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        },

        /**
         * Ouvrir le menu
         */
        openMenu: function() {
            if (this.state.isOpen || this.state.isAnimating) return;

            this.state.isAnimating = true;
            
            const menu = document.getElementById('mobile-menu');
            const backdrop = menu.querySelector('.menu-backdrop');
            const container = menu.querySelector('.menu-container');
            
            // Afficher le menu
            menu.style.display = 'block';
            
            // Animation d'ouverture
            this.animateElement(backdrop, 'fadeIn');
            this.animateElement(container, 'slideInLeft');
            
            // Bloquer le scroll du body
            document.body.style.overflow = 'hidden';
            document.body.classList.add('menu-open');
            
            setTimeout(() => {
                this.state.isOpen = true;
                this.state.isAnimating = false;
            }, this.config.animationDuration);
            
            this.trackEvent('menu_opened');
        },

        /**
         * Fermer le menu
         */
        closeMenu: function() {
            if (!this.state.isOpen || this.state.isAnimating) return;

            this.state.isAnimating = true;
            
            const menu = document.getElementById('mobile-menu');
            const backdrop = menu.querySelector('.menu-backdrop');
            const container = menu.querySelector('.menu-container');
            
            // Animation de fermeture
            this.animateElement(backdrop, 'fadeOut');
            this.animateElement(container, 'slideOutLeft');
            
            // Restaurer le scroll du body
            document.body.style.overflow = '';
            document.body.classList.remove('menu-open');
            
            setTimeout(() => {
                menu.style.display = 'none';
                this.state.isOpen = false;
                this.state.isAnimating = false;
            }, this.config.animationDuration);
            
            this.trackEvent('menu_closed');
        },

        /**
         * Animation de glissement du menu
         */
        animateMenuSlide: function(deltaX) {
            const container = document.querySelector('.menu-container');
            const maxSlide = container.offsetWidth;
            const slidePercent = Math.min(deltaX / maxSlide, 1);
            
            container.style.transform = `translateX(${slidePercent * -80}%)`;
            container.style.opacity = 1 - (slidePercent * 0.3);
        },

        /**
         * Réinitialiser la position du menu
         */
        resetMenuPosition: function() {
            const container = document.querySelector('.menu-container');
            container.style.transform = '';
            container.style.opacity = '';
        },

        /**
         * Animation d'élément
         */
        animateElement: function(element, animation) {
            return new Promise(resolve => {
                element.classList.add(animation);
                
                const handleAnimationEnd = () => {
                    element.classList.remove(animation);
                    element.removeEventListener('animationend', handleAnimationEnd);
                    resolve();
                };
                
                element.addEventListener('animationend', handleAnimationEnd);
            });
        },

        /**
         * Gestion de la navigation
         */
        handleNavigation: function(element) {
            const route = element.dataset.route;
            const itemId = element.dataset.itemId;
            
            if (route) {
                this.closeMenu();
                setTimeout(() => {
                    window.location.href = route;
                }, this.config.animationDuration);
            }
            
            // Gestion spécifique à certains items
            switch (itemId) {
                case 'notifications':
                    this.switchPanel('notifications');
                    break;
                case 'settings':
                    this.switchPanel('settings');
                    break;
                case 'profile':
                    this.switchPanel('profile');
                    break;
            }
            
            this.trackEvent('navigation', { route, itemId });
        },

        /**
         * Basculer entre les panneaux
         */
        switchPanel: function(panelId) {
            if (this.state.currentPanel === panelId) return;
            
            // Ajouter l'historique
            this.state.menuHistory.push(panelId);
            
            // Limiter l'historique
            if (this.state.menuHistory.length > 5) {
                this.state.menuHistory.shift();
            }
            
            // Animation de transition
            this.animatePanelTransition(this.state.currentPanel, panelId);
            
            this.state.currentPanel = panelId;
        },

        /**
         * Animation de transition entre panneaux
         */
        animatePanelTransition: function(fromPanel, toPanel) {
            const fromElement = document.getElementById(`panel-${fromPanel}`);
            const toElement = document.getElementById(`panel-${toPanel}`);
            
            if (!fromElement || !toElement) return;
            
            // Cacher l'ancien panneau
            fromElement.classList.remove('active');
            
            // Afficher le nouveau panneau
            toElement.classList.add('active');
            
            // Re-rendre le panneau si nécessaire
            if (!toElement.querySelector('.panel-content')) {
                this.renderPanel(toPanel);
            }
            
            // Mettre à jour les boutons de retour
            this.updateBackButton();
        },

        /**
         * Mettre à jour le bouton de retour
         */
        updateBackButton: function() {
            const header = document.querySelector('.menu-header');
            const backButton = header.querySelector('.menu-back');
            
            if (this.state.menuHistory.length > 1) {
                if (!backButton) {
                    const backBtnHTML = '<button class="menu-back" data-action="back">←</button>';
                    header.insertAdjacentHTML('afterbegin', backBtnHTML);
                }
            } else if (backButton) {
                backButton.remove();
            }
        },

        /**
         * Retourner au panneau précédent
         */
        goBack: function() {
            if (this.state.menuHistory.length <= 1) return;
            
            this.state.menuHistory.pop();
            const previousPanel = this.state.menuHistory[this.state.menuHistory.length - 1];
            
            this.animatePanelTransition(this.state.currentPanel, previousPanel);
            this.state.currentPanel = previousPanel;
            
            this.updateBackButton();
        },

        /**
         * Gestion du changement de langue
         */
        handleLanguageChange: function() {
            const languages = ['Français', 'English', 'Español'];
            const currentLang = localStorage.getItem('ifn_language') || 'Français';
            const currentIndex = languages.indexOf(currentLang);
            const nextLang = languages[(currentIndex + 1) % languages.length];
            
            localStorage.setItem('ifn_language', nextLang);
            this.showToast(`Langue changée: ${nextLang}`, 'success');
            
            this.trackEvent('language_changed', { language: nextLang });
        },

        /**
         * Gestion du changement de thème
         */
        handleThemeChange: function() {
            const themes = ['Clair', 'Sombre', 'Auto'];
            const currentTheme = localStorage.getItem('ifn_theme') || 'Auto';
            const currentIndex = themes.indexOf(currentTheme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            
            localStorage.setItem('ifn_theme', nextTheme);
            this.applyTheme(nextTheme);
            this.showToast(`Thème: ${nextTheme}`, 'success');
            
            this.trackEvent('theme_changed', { theme: nextTheme });
        },

        /**
         * Appliquer un thème
         */
        applyTheme: function(theme) {
            const body = document.body;
            body.className = body.className.replace(/theme-\w+/g, '');
            
            switch (theme) {
                case 'Sombre':
                    body.classList.add('theme-dark');
                    break;
                case 'Clair':
                    body.classList.add('theme-light');
                    break;
                default:
                    body.classList.remove('theme-dark', 'theme-light');
            }
        },

        /**
         * Gestion des notifications
         */
        handleNotificationsToggle: function() {
            const enabled = localStorage.getItem('ifn_notifications') !== 'false';
            const newState = !enabled;
            
            localStorage.setItem('ifn_notifications', newState.toString());
            this.showToast(`Notifications ${newState ? 'activées' : 'désactivées'}`, 'info');
            
            this.trackEvent('notifications_toggled', { enabled: newState });
        },

        /**
         * Gestion de la déconnexion
         */
        handleLogout: function() {
            if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                this.showToast('Déconnexion en cours...', 'info');
                setTimeout(() => {
                    window.location.href = '/logout';
                }, 1000);
            }
        },

        /**
         * Marquer une notification comme lue
         */
        markNotificationAsRead: function(notificationId) {
            const notification = document.querySelector(`[data-id="${notificationId}"]`);
            if (notification) {
                notification.closest('.notification-item').classList.remove('unread');
                notification.textContent = '⋯';
                this.loadNotificationBadge();
            }
        },

        /**
         * Charger le badge de notification
         */
        loadNotificationBadge: function() {
            // Simulation d'un badge de notification
            const badge = document.querySelector('[data-item-id="notifications"] .menu-item-badge');
            if (badge) {
                // Dans une vraie application, ceci viendrait d'une API
                const unreadCount = 3; // Simulation
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            }
        },

        /**
         * Ajuster la position du menu
         */
        adjustMenuPosition: function() {
            // Re-calculer les dimensions si nécessaire
            const container = document.querySelector('.menu-container');
            if (container && window.innerWidth < 768) {
                container.style.maxWidth = `${Math.min(window.innerWidth - 40, this.config.maxMenuWidth)}px`;
            }
        },

        /**
         * Tracker les événements
         */
        trackEvent: function(eventName, data) {
            if (window.IFN && window.IFN.track) {
                window.IFN.track(`mobile_menu_${eventName}`, data);
            }
        },

        /**
         * Afficher une notification toast
         */
        showToast: function(message, type = 'info') {
            if (window.showToast) {
                window.showToast(message, type);
            } else {
                console.log(`[IFN Mobile Menu] ${type.toUpperCase()}: ${message}`);
            }
        },

        /**
         * Obtenir les statistiques du menu
         */
        getMenuStats: function() {
            return {
                isOpen: this.state.isOpen,
                currentPanel: this.state.currentPanel,
                menuHistory: this.state.menuHistory,
                language: localStorage.getItem('ifn_language') || 'Français',
                theme: localStorage.getItem('ifn_theme') || 'Auto',
                notificationsEnabled: localStorage.getItem('ifn_notifications') !== 'false'
            };
        },

        /**
         * Réinitialiser le menu
         */
        reset: function() {
            this.state.currentPanel = 'main';
            this.state.menuHistory = ['main'];
            this.renderPanel('main');
            this.updateBackButton();
        }
    };

    // Initialiser automatiquement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            IFN_MobileMenu.init();
        });
    } else {
        IFN_MobileMenu.init();
    }

})();