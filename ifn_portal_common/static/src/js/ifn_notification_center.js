/* =============================================================================
   IFN Portal Common - Notification Center
   ============================================================================= */

/**
 * Centre de notifications avec icônes et fonctionnalités avancées
 * Fonctionnalités : notifications temps réel, группировка, filtres, préférences
 */
(function() {
    'use strict';

    const IFN_NotificationCenter = {
        // Configuration
        config: {
            maxNotifications: 100,
            displayDuration: 5000,
            animationDuration: 300,
            imagePath: '/static/src/img/icons/',
            autoMarkAsRead: false,
            soundEnabled: true,
            pollingInterval: 30000 // 30 secondes
        },

        // État global
        state: {
            notifications: [],
            filteredNotifications: [],
            isOpen: false,
            isAnimating: false,
            selectedFilter: 'all',
            selectedCategory: 'all',
            sortBy: 'timestamp',
            sortOrder: 'desc',
            unreadCount: 0,
            categories: new Map(),
            isPolling: false,
            lastUpdate: null
        },

        // Catégories de notifications
        categories: {
            system: {
                id: 'system',
                name: 'Système',
                icon: '⚙️',
                color: '#2196F3',
                priority: 'medium'
            },
            market: {
                id: 'market',
                name: 'Marché',
                icon: '📈',
                color: '#FF9800',
                priority: 'high'
            },
            production: {
                id: 'production',
                name: 'Production',
                icon: '🌱',
                color: '#4CAF50',
                priority: 'medium'
            },
            finance: {
                id: 'finance',
                name: 'Finance',
                icon: '💰',
                color: '#9C27B0',
                priority: 'high'
            },
            quality: {
                id: 'quality',
                name: 'Qualité',
                icon: 'qualite_icon.png',
                color: '#F44336',
                priority: 'high'
            },
            cooperative: {
                id: 'cooperative',
                name: 'Coopérative',
                icon: 'cooperative_icon.png',
                color: '#607D8B',
                priority: 'medium'
            },
            logistics: {
                id: 'logistics',
                name: 'Logistique',
                icon: 'delivery_icon.png',
                color: '#795548',
                priority: 'medium'
            },
            general: {
                id: 'general',
                name: 'Général',
                icon: '📢',
                color: '#9E9E9E',
                priority: 'low'
            }
        },

        // Types de notifications
        types: {
            info: { icon: 'ℹ️', color: '#2196F3' },
            success: { icon: '✅', color: '#4CAF50' },
            warning: { icon: '⚠️', color: '#FF9800' },
            error: { icon: '❌', color: '#F44336' },
            alert: { icon: '🚨', color: '#E91E63' }
        },

        /**
         * Initialisation du centre de notifications
         */
        init: function() {
            console.log('[IFN Notification Center] Initialisation...');
            
            this.loadNotifications();
            this.setupEventListeners();
            this.createNotificationUI();
            this.startPolling();
            this.updateUnreadCount();
            
            // Exposer l'API globale
            window.IFN_NotificationCenter = this;
            
            console.log('[IFN Notification Center] Initialisation terminée');
        },

        /**
         * Configuration des écouteurs d'événements
         */
        setupEventListeners: function() {
            // Ouverture/fermeture du centre
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="toggle-notifications"]')) {
                    this.toggleCenter();
                }
                
                if (e.target.matches('[data-action="close-notifications"]')) {
                    this.closeCenter();
                }
                
                if (e.target.matches('.notification-center-backdrop')) {
                    this.closeCenter();
                }
                
                // Actions sur les notifications
                if (e.target.closest('[data-notification-id]')) {
                    this.handleNotificationAction(e.target, e.target.closest('[data-notification-id]').dataset.notificationId);
                }
                
                // Filtres
                if (e.target.matches('[data-filter]')) {
                    this.setFilter(e.target.dataset.filter);
                }
                
                if (e.target.matches('[data-category]')) {
                    this.setCategory(e.target.dataset.category);
                }
                
                // Actions de gestion
                if (e.target.matches('[data-action="mark-all-read"]')) {
                    this.markAllAsRead();
                }
                
                if (e.target.matches('[data-action="clear-all"]')) {
                    this.clearAllNotifications();
                }
                
                if (e.target.matches('[data-action="settings"]')) {
                    this.openSettings();
                }
                
                // Tri
                if (e.target.matches('[data-sort]')) {
                    this.setSort(e.target.dataset.sort);
                }
            });

            // Gestion clavier
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.state.isOpen) {
                    this.closeCenter();
                }
                
                if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                    e.preventDefault();
                    this.openCenter();
                }
            });

            // Notifications Web Push (si supportées)
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.setupPushNotifications();
                    }
                });
            }
        },

        /**
         * Créer l'interface utilisateur
         */
        createNotificationUI: function() {
            const notificationHTML = `
                <div id="notification-center" class="notification-center">
                    <div class="notification-center-backdrop"></div>
                    <div class="notification-panel">
                        <div class="notification-header">
                            <div class="header-left">
                                <h3 class="notification-title">
                                    <span class="title-icon">🔔</span>
                                    Notifications
                                    <span class="unread-badge" id="unread-badge" style="display: none;">0</span>
                                </h3>
                            </div>
                            <div class="header-right">
                                <button class="notification-action-btn" data-action="settings" title="Paramètres">
                                    <span class="btn-icon">⚙️</span>
                                </button>
                                <button class="notification-close-btn" data-action="close-notifications" title="Fermer">
                                    <span class="btn-icon">✕</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="notification-filters">
                            <div class="filter-tabs">
                                <button class="filter-tab active" data-filter="all">Toutes</button>
                                <button class="filter-tab" data-filter="unread">Non lues</button>
                                <button class="filter-tab" data-filter="important">Importantes</button>
                            </div>
                            
                            <div class="category-filters">
                                <select class="category-select" id="category-filter">
                                    <option value="all">Toutes les catégories</option>
                                    ${Object.values(this.categories).map(cat => `
                                        <option value="${cat.id}">${cat.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="sort-controls">
                                <select class="sort-select" id="sort-select">
                                    <option value="timestamp">Plus récentes</option>
                                    <option value="priority">Priorité</option>
                                    <option value="category">Catégorie</option>
                                </select>
                                <button class="sort-order-btn" id="sort-order-btn" title="Ordre">
                                    <span class="sort-icon">↓</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="notification-actions">
                            <button class="action-btn" data-action="mark-all-read">
                                <span class="btn-icon">✓</span>
                                Tout marquer lu
                            </button>
                            <button class="action-btn" data-action="clear-all">
                                <span class="btn-icon">🗑️</span>
                                Tout supprimer
                            </button>
                        </div>
                        
                        <div class="notification-list" id="notification-list">
                            <!-- Notifications générées dynamiquement -->
                        </div>
                        
                        <div class="notification-footer">
                            <div class="status-info">
                                <span class="last-update">Dernière mise à jour: --</span>
                                <span class="notification-count">0 notifications</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', notificationHTML);
            
            // Remplir les filtres de catégories
            this.populateCategoryFilters();
            
            this.renderNotifications();
        },

        /**
         * Remplir les filtres de catégories
         */
        populateCategoryFilters: function() {
            const categoryFilter = document.getElementById('category-filter');
            if (!categoryFilter) return;

            // Les options sont déjà ajoutées dans le HTML
        },

        /**
         * Rendu des notifications
         */
        renderNotifications: function() {
            this.applyFilters();
            this.updateNotificationList();
            this.updateStatusInfo();
        },

        /**
         * Appliquer les filtres
         */
        applyFilters: function() {
            let filtered = [...this.state.notifications];

            // Filtre par statut de lecture
            switch (this.state.selectedFilter) {
                case 'unread':
                    filtered = filtered.filter(n => !n.read);
                    break;
                case 'important':
                    filtered = filtered.filter(n => n.priority === 'high');
                    break;
            }

            // Filtre par catégorie
            if (this.state.selectedCategory !== 'all') {
                filtered = filtered.filter(n => n.category === this.state.selectedCategory);
            }

            // Tri
            filtered.sort((a, b) => {
                let aValue = a[this.state.sortBy];
                let bValue = b[this.state.sortBy];

                if (this.state.sortBy === 'priority') {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    aValue = priorityOrder[a.priority];
                    bValue = priorityOrder[b.priority];
                }

                if (this.state.sortOrder === 'asc') {
                    return aValue > bValue ? 1 : -1;
                } else {
                    return aValue < bValue ? 1 : -1;
                }
            });

            this.state.filteredNotifications = filtered;
        },

        /**
         * Mise à jour de la liste des notifications
         */
        updateNotificationList: function() {
            const container = document.getElementById('notification-list');
            if (!container) return;

            if (this.state.filteredNotifications.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔔</div>
                        <h4>Aucune notification</h4>
                        <p>Vous êtes à jour !</p>
                    </div>
                `;
                return;
            }

            const notificationsHTML = this.state.filteredNotifications.map(notification => 
                this.renderNotificationItem(notification)
            ).join('');

            container.innerHTML = notificationsHTML;
        },

        /**
         * Rendu d'un élément de notification
         */
        renderNotificationItem: function(notification) {
            const category = this.categories[notification.category] || this.categories.general;
            const type = this.types[notification.type] || this.types.info;
            const iconSrc = `${this.config.imagePath}${category.icon}`;
            const isImageIcon = category.icon.includes('.png');
            const iconHTML = isImageIcon ? 
                `<img src="${iconSrc}" alt="${category.name}" class="notification-icon-img" onerror="this.style.display='none'">` :
                `<span class="notification-icon" style="color: ${type.color}">${category.icon}</span>`;

            return `
                <div class="notification-item ${notification.read ? '' : 'unread'} priority-${notification.priority}" 
                     data-notification-id="${notification.id}">
                    <div class="notification-main">
                        <div class="notification-header-item">
                            <div class="notification-icon-area">
                                ${iconHTML}
                                <span class="notification-type-icon" style="color: ${type.color}">${type.icon}</span>
                            </div>
                            <div class="notification-content">
                                <h4 class="notification-title">${notification.title}</h4>
                                <p class="notification-message">${notification.message}</p>
                                <div class="notification-meta">
                                    <span class="notification-category" style="color: ${category.color}">
                                        ${category.name}
                                    </span>
                                    <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                                    ${notification.priority === 'high' ? '<span class="priority-badge">Important</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="notification-actions">
                        <button class="notification-action-btn" data-action="mark-read" title="${notification.read ? 'Marquer non lu' : 'Marquer lu'}">
                            <span class="action-icon">${notification.read ? '📖' : '📕'}</span>
                        </button>
                        <button class="notification-action-btn" data-action="archive" title="Archiver">
                            <span class="action-icon">📁</span>
                        </button>
                        <button class="notification-action-btn" data-action="delete" title="Supprimer">
                            <span class="action-icon">🗑️</span>
                        </button>
                    </div>
                    ${notification.actions && notification.actions.length > 0 ? `
                        <div class="notification-quick-actions">
                            ${notification.actions.map(action => `
                                <button class="quick-action-btn" data-action="execute" data-action-id="${action.id}">
                                    ${action.label}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        },

        /**
         * Gestion des actions sur les notifications
         */
        handleNotificationAction: function(element, notificationId) {
            const action = element.dataset.action;
            const notification = this.state.notifications.find(n => n.id === notificationId);
            if (!notification) return;

            switch (action) {
                case 'mark-read':
                    this.toggleReadStatus(notificationId);
                    break;
                case 'archive':
                    this.archiveNotification(notificationId);
                    break;
                case 'delete':
                    this.deleteNotification(notificationId);
                    break;
                case 'execute':
                    this.executeQuickAction(notificationId, element.dataset.actionId);
                    break;
            }
        },

        /**
         * Basculer le statut lu/non lu
         */
        toggleReadStatus: function(notificationId) {
            const notification = this.state.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = !notification.read;
                this.saveNotifications();
                this.renderNotifications();
                this.updateUnreadCount();
                this.trackEvent('notification_read_toggled', { notificationId });
            }
        },

        /**
         * Archiver une notification
         */
        archiveNotification: function(notificationId) {
            const notification = this.state.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.archived = true;
                this.saveNotifications();
                this.renderNotifications();
                this.trackEvent('notification_archived', { notificationId });
            }
        },

        /**
         * Supprimer une notification
         */
        deleteNotification: function(notificationId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
                this.state.notifications = this.state.notifications.filter(n => n.id !== notificationId);
                this.saveNotifications();
                this.renderNotifications();
                this.updateUnreadCount();
                this.trackEvent('notification_deleted', { notificationId });
            }
        },

        /**
         * Exécuter une action rapide
         */
        executeQuickAction: function(notificationId, actionId) {
            const notification = this.state.notifications.find(n => n.id === notificationId);
            if (!notification || !notification.actions) return;

            const action = notification.actions.find(a => a.id === actionId);
            if (!action) return;

            // Exécuter l'action (remplacer par la logique réelle)
            this.trackEvent('quick_action_executed', { notificationId, actionId });
            this.showToast(`Action exécutée: ${action.label}`, 'success');
        },

        /**
         * Ouvrir/fermer le centre
         */
        toggleCenter: function() {
            if (this.state.isOpen) {
                this.closeCenter();
            } else {
                this.openCenter();
            }
        },

        /**
         * Ouvrir le centre
         */
        openCenter: function() {
            if (this.state.isOpen) return;

            this.state.isOpen = true;
            const center = document.getElementById('notification-center');
            center.style.display = 'block';
            
            // Animation d'ouverture
            setTimeout(() => {
                center.classList.add('open');
            }, 10);

            this.trackEvent('center_opened');
        },

        /**
         * Fermer le centre
         */
        closeCenter: function() {
            if (!this.state.isOpen) return;

            this.state.isOpen = false;
            const center = document.getElementById('notification-center');
            center.classList.remove('open');
            
            setTimeout(() => {
                center.style.display = 'none';
            }, this.config.animationDuration);

            this.trackEvent('center_closed');
        },

        /**
         * Définir un filtre
         */
        setFilter: function(filter) {
            this.state.selectedFilter = filter;
            
            // Mettre à jour l'interface
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
            
            this.renderNotifications();
            this.trackEvent('filter_changed', { filter });
        },

        /**
         * Définir une catégorie
         */
        setCategory: function(category) {
            this.state.selectedCategory = category;
            this.renderNotifications();
            this.trackEvent('category_changed', { category });
        },

        /**
         * Définir le tri
         */
        setSort: function(sortBy) {
            if (this.state.sortBy === sortBy) {
                this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.state.sortBy = sortBy;
                this.state.sortOrder = 'desc';
            }
            
            // Mettre à jour l'interface
            const sortBtn = document.getElementById('sort-order-btn');
            if (sortBtn) {
                const icon = sortBtn.querySelector('.sort-icon');
                icon.textContent = this.state.sortOrder === 'asc' ? '↑' : '↓';
            }
            
            this.renderNotifications();
            this.trackEvent('sort_changed', { sortBy, order: this.state.sortOrder });
        },

        /**
         * Marquer tout comme lu
         */
        markAllAsRead: function() {
            this.state.notifications.forEach(notification => {
                notification.read = true;
            });
            
            this.saveNotifications();
            this.renderNotifications();
            this.updateUnreadCount();
            this.trackEvent('all_marked_read');
            this.showToast('Toutes les notifications ont été marquées comme lues', 'success');
        },

        /**
         * Supprimer toutes les notifications
         */
        clearAllNotifications: function() {
            if (confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications ?')) {
                this.state.notifications = [];
                this.saveNotifications();
                this.renderNotifications();
                this.updateUnreadCount();
                this.trackEvent('all_cleared');
                this.showToast('Toutes les notifications ont été supprimées', 'success');
            }
        },

        /**
         * Ouvrir les paramètres
         */
        openSettings: function() {
            const modal = document.createElement('div');
            modal.className = 'notification-settings-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Paramètres des notifications</h3>
                        <button class="modal-close" data-action="close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="setting-group">
                            <label class="setting-label">
                                <input type="checkbox" id="sound-enabled" ${this.config.soundEnabled ? 'checked' : ''}>
                                Sons de notification
                            </label>
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">
                                <input type="checkbox" id="auto-mark-read" ${this.config.autoMarkAsRead ? 'checked' : ''}>
                                Marquer automatiquement comme lu
                            </label>
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Fréquence de mise à jour:</label>
                            <select id="polling-interval">
                                <option value="10000">10 secondes</option>
                                <option value="30000" selected>30 secondes</option>
                                <option value="60000">1 minute</option>
                                <option value="300000">5 minutes</option>
                            </select>
                        </div>
                        <div class="setting-group">
                            <h4>Catégories à surveiller:</h4>
                            ${Object.values(this.categories).map(category => `
                                <label class="setting-label">
                                    <input type="checkbox" class="category-enabled" value="${category.id}" checked>
                                    ${category.icon} ${category.name}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" data-action="save">Sauvegarder</button>
                        <button class="btn btn-secondary" data-action="cancel">Annuler</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="close"]') || e.target.matches('[data-action="cancel"]')) {
                    modal.remove();
                }
                
                if (e.target.matches('[data-action="save"]')) {
                    this.saveSettings(modal);
                    modal.remove();
                }
            });
        },

        /**
         * Sauvegarder les paramètres
         */
        saveSettings: function(modal) {
            this.config.soundEnabled = modal.querySelector('#sound-enabled').checked;
            this.config.autoMarkAsRead = modal.querySelector('#auto-mark-read').checked;
            this.config.pollingInterval = parseInt(modal.querySelector('#polling-interval').value);
            
            // Redémarrer le polling si nécessaire
            this.stopPolling();
            this.startPolling();
            
            this.showToast('Paramètres sauvegardés', 'success');
            this.trackEvent('settings_saved');
        },

        /**
         * Ajouter une nouvelle notification
         */
        addNotification: function(notificationData) {
            const notification = {
                id: 'notif_' + Date.now(),
                timestamp: new Date().toISOString(),
                read: false,
                archived: false,
                ...notificationData
            };

            // Ajouter au début de la liste
            this.state.notifications.unshift(notification);

            // Limiter le nombre de notifications
            if (this.state.notifications.length > this.config.maxNotifications) {
                this.state.notifications = this.state.notifications.slice(0, this.config.maxNotifications);
            }

            this.saveNotifications();
            this.renderNotifications();
            this.updateUnreadCount();
            this.showToastNotification(notification);

            this.trackEvent('notification_added', { notificationId: notification.id });
        },

        /**
         * Afficher une notification toast
         */
        showToastNotification: function(notification) {
            const category = this.categories[notification.category] || this.categories.general;
            const type = this.types[notification.type] || this.types.info;

            if (this.config.soundEnabled) {
                this.playNotificationSound();
            }

            // Notification Web Push si permise
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: `${this.config.imagePath}${category.icon}`,
                    tag: notification.id
                });
            }
        },

        /**
         * Jouer un son de notification
         */
        playNotificationSound: function() {
            try {
                const audio = new Audio('/static/src/audio/notification.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {
                    // Ignorer les erreurs de lecture
                });
            } catch (error) {
                // Support audio non disponible
            }
        },

        /**
         * Mettre à jour le compteur de non lus
         */
        updateUnreadCount: function() {
            this.state.unreadCount = this.state.notifications.filter(n => !n.read && !n.archived).length;
            
            const badge = document.getElementById('unread-badge');
            if (badge) {
                if (this.state.unreadCount > 0) {
                    badge.textContent = this.state.unreadCount > 99 ? '99+' : this.state.unreadCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }

            // Mettre à jour le bouton d'ouverture
            const toggleBtn = document.querySelector('[data-action="toggle-notifications"]');
            if (toggleBtn) {
                toggleBtn.classList.toggle('has-unread', this.state.unreadCount > 0);
            }
        },

        /**
         * Démarrer le polling
         */
        startPolling: function() {
            if (this.state.isPolling) return;
            
            this.state.isPolling = true;
            this.pollingInterval = setInterval(() => {
                this.fetchNewNotifications();
            }, this.config.pollingInterval);
        },

        /**
         * Arrêter le polling
         */
        stopPolling: function() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.state.isPolling = false;
            }
        },

        /**
         * Récupérer de nouvelles notifications
         */
        fetchNewNotifications: async function() {
            try {
                // Simulation d'un appel API
                // const response = await fetch('/api/notifications?since=' + this.state.lastUpdate);
                // const newNotifications = await response.json();
                
                // Simulation de nouvelles notifications
                if (Math.random() < 0.1) { // 10% de chance
                    this.addNotification({
                        title: 'Nouvelle information marché',
                        message: 'Prix de l\'igname en hausse de 5%',
                        category: 'market',
                        type: 'info',
                        priority: 'medium',
                        actions: [
                            { id: 'view', label: 'Voir' },
                            { id: 'dismiss', label: 'Ignorer' }
                        ]
                    });
                }

                this.state.lastUpdate = new Date().toISOString();
            } catch (error) {
                console.error('[IFN Notification Center] Erreur polling:', error);
            }
        },

        /**
         * Configurer les notifications push
         */
        setupPushNotifications: function() {
            // Enregistrer le service worker pour les notifications push
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('Service Worker enregistré pour les notifications push');
                }).catch(error => {
                    console.error('Erreur enregistrement Service Worker:', error);
                });
            }
        },

        /**
         * Sauvegarder les notifications
         */
        saveNotifications: function() {
            localStorage.setItem('ifn_notifications', JSON.stringify(this.state.notifications));
        },

        /**
         * Charger les notifications
         */
        loadNotifications: function() {
            try {
                const saved = localStorage.getItem('ifn_notifications');
                if (saved) {
                    this.state.notifications = JSON.parse(saved);
                } else {
                    // Notifications par défaut
                    this.state.notifications = this.getDefaultNotifications();
                }
            } catch (error) {
                console.error('[IFN Notification Center] Erreur chargement notifications:', error);
                this.state.notifications = this.getDefaultNotifications();
            }
        },

        /**
         * Notifications par défaut
         */
        getDefaultNotifications: function() {
            return [
                {
                    id: 'welcome',
                    title: 'Bienvenue sur IFN Portal',
                    message: 'Découvrez toutes les fonctionnalités disponibles',
                    category: 'system',
                    type: 'success',
                    priority: 'medium',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    read: false,
                    archived: false,
                    actions: [
                        { id: 'tour', label: 'Visite guidée' },
                        { id: 'dismiss', label: 'Plus tard' }
                    ]
                },
                {
                    id: 'market-alert',
                    title: 'Alerte prix marché',
                    message: 'Prix de l\'igname en hausse sur le marché d\'Abidjan',
                    category: 'market',
                    type: 'warning',
                    priority: 'high',
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    read: false,
                    archived: false
                }
            ];
        },

        /**
         * Mettre à jour les informations de statut
         */
        updateStatusInfo: function() {
            const footer = document.querySelector('.notification-footer');
            if (!footer) return;

            const count = this.state.filteredNotifications.length;
            const lastUpdate = this.state.lastUpdate || new Date().toISOString();

            footer.innerHTML = `
                <div class="status-info">
                    <span class="last-update">Dernière mise à jour: ${this.formatTime(lastUpdate)}</span>
                    <span class="notification-count">${count} notification${count !== 1 ? 's' : ''}</span>
                </div>
            `;
        },

        /**
         * Formatage du temps
         */
        formatTime: function(timestamp) {
            const now = new Date();
            const date = new Date(timestamp);
            const diff = now - date;
            
            if (diff < 60000) return 'Maintenant';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}j`;
            
            return date.toLocaleDateString();
        },

        /**
         * Tracker les événements
         */
        trackEvent: function(eventName, data) {
            if (window.IFN && window.IFN.track) {
                window.IFN.track(`notification_center_${eventName}`, data);
            }
        },

        /**
         * Afficher une notification toast
         */
        showToast: function(message, type = 'info') {
            if (window.showToast) {
                window.showToast(message, type);
            } else {
                console.log(`[IFN Notification Center] ${type.toUpperCase()}: ${message}`);
            }
        },

        /**
         * Obtenir les statistiques
         */
        getStats: function() {
            return {
                total: this.state.notifications.length,
                unread: this.state.unreadCount,
                filtered: this.state.filteredNotifications.length,
                isPolling: this.state.isPolling,
                lastUpdate: this.state.lastUpdate
            };
        }
    };

    // Initialiser automatiquement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            IFN_NotificationCenter.init();
        });
    } else {
        IFN_NotificationCenter.init();
    }

})();