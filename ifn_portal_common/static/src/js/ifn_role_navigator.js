/* =============================================================================
   IFN Portal Common - Role Navigator
   ============================================================================= */

/**
 * Navigateur de rôles avec pictogrammes
 * Fonctionnalités : navigation contextuelle, permissions, historique de navigation
 */
(function() {
    'use strict';

    const IFN_RoleNavigator = {
        // Configuration
        config: {
            animationDuration: 300,
            historyLimit: 50,
            imagePath: '/static/src/img/icons/',
            autoSaveHistory: true
        },

        // État global
        state: {
            currentRole: 'citizen',
            availableRoles: [],
            navigationHistory: [],
            currentPath: [],
            permissions: new Map(),
            isTransitioning: false
        },

        // Rôles disponibles avec pictogrammes
        roles: {
            citizen: {
                id: 'citizen',
                name: 'Citoyen',
                icon: 'sunshine_icon.png',
                description: 'Accès aux services publics de base',
                color: '#4CAF50',
                permissions: ['view_info', 'basic_services', 'news'],
                menuItems: [
                    { id: 'home', label: 'Accueil', icon: '🏠', route: '/' },
                    { id: 'services', label: 'Services', icon: '🛠️', route: '/services' },
                    { id: 'news', label: 'Actualités', icon: '📰', route: '/news' },
                    { id: 'profile', label: 'Mon Profil', icon: '👤', route: '/profile' }
                ]
            },
            producer: {
                id: 'producer',
                name: 'Producteur',
                icon: 'producteur_icon.png',
                description: 'Gestion de production agricole',
                color: '#8BC34A',
                permissions: ['view_info', 'basic_services', 'news', 'production', 'market_info'],
                menuItems: [
                    { id: 'home', label: 'Accueil', icon: '🏠', route: '/' },
                    { id: 'production', label: 'Production', icon: '🌱', route: '/production' },
                    { id: 'inventory', label: 'Inventaire', icon: '📦', route: '/inventory' },
                    { id: 'market', label: 'Marché', icon: '📈', route: '/market' },
                    { id: 'finance', label: 'Finance', icon: '💰', route: '/finance' },
                    { id: 'profile', label: 'Mon Profil', icon: '👤', route: '/profile' }
                ]
            },
            trader: {
                id: 'trader',
                name: 'Marchand',
                icon: 'marchand_icon.png',
                description: 'Commerce et distribution',
                color: '#FF9800',
                permissions: ['view_info', 'basic_services', 'news', 'trading', 'logistics'],
                menuItems: [
                    { id: 'home', label: 'Accueil', icon: '🏠', route: '/' },
                    { id: 'trading', label: 'Commerce', icon: '🛒', route: '/trading' },
                    { id: 'suppliers', label: 'Fournisseurs', icon: '🏭', route: '/suppliers' },
                    { id: 'orders', label: 'Commandes', icon: '📋', route: '/orders' },
                    { id: 'logistics', label: 'Logistique', icon: '🚚', route: '/logistics' },
                    { id: 'profile', label: 'Mon Profil', icon: '👤', route: '/profile' }
                ]
            },
            cooperative: {
                id: 'cooperative',
                name: 'Coopérative',
                icon: 'cooperative_icon.png',
                description: 'Gestion coopérative',
                color: '#2196F3',
                permissions: ['view_info', 'basic_services', 'news', 'management', 'coordination'],
                menuItems: [
                    { id: 'home', label: 'Accueil', icon: '🏠', route: '/' },
                    { id: 'members', label: 'Membres', icon: '👥', route: '/members' },
                    { id: 'production', label: 'Production', icon: '🌱', route: '/production' },
                    { id: 'quality', label: 'Qualité', icon: 'qualite_icon.png', route: '/quality' },
                    { id: 'reports', label: 'Rapports', icon: 'rapport_icon.png', route: '/reports' },
                    { id: 'profile', label: 'Mon Profil', icon: '👤', route: '/profile' }
                ]
            },
            admin: {
                id: 'admin',
                name: 'Administrateur',
                icon: 'help_icon.png',
                description: 'Administration système',
                color: '#F44336',
                permissions: ['all'],
                menuItems: [
                    { id: 'dashboard', label: 'Tableau de bord', icon: '📊', route: '/admin/dashboard' },
                    { id: 'users', label: 'Utilisateurs', icon: '👥', route: '/admin/users' },
                    { id: 'roles', label: 'Rôles', icon: '🔐', route: '/admin/roles' },
                    { id: 'analytics', label: 'Analytique', icon: '📈', route: '/admin/analytics' },
                    { id: 'settings', label: 'Paramètres', icon: '⚙️', route: '/admin/settings' }
                ]
            }
        },

        // Transition entre rôles
        roleTransitions: {
            citizen: ['producer', 'trader'],
            producer: ['citizen', 'trader', 'cooperative'],
            trader: ['citizen', 'producer', 'cooperative'],
            cooperative: ['producer', 'trader'],
            admin: []
        },

        /**
         * Initialisation du navigateur
         */
        init: function() {
            console.log('[IFN Role Navigator] Initialisation...');
            
            this.loadUserRole();
            this.loadNavigationHistory();
            this.setupEventListeners();
            this.render();
            
            // Exposer l'API globale
            window.IFN_RoleNavigator = this;
            
            console.log('[IFN Role Navigator] Initialisation terminée');
        },

        /**
         * Configuration des écouteurs d'événements
         */
        setupEventListeners: function() {
            document.addEventListener('click', (e) => {
                // Changement de rôle
                if (e.target.matches('[data-role]')) {
                    this.changeRole(e.target.dataset.role);
                }
                
                // Navigation de menu
                if (e.target.closest('[data-route]')) {
                    const routeElement = e.target.closest('[data-route]');
                    this.navigate(routeElement.dataset.route, routeElement);
                }
                
                // Historique de navigation
                if (e.target.matches('[data-history]')) {
                    this.navigateToHistory(e.target.dataset.history);
                }
                
                // Actions rapides
                if (e.target.matches('[data-quick-action]')) {
                    this.executeQuickAction(e.target.dataset.quickAction);
                }
            });

            // Gestion des touches clavier
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                            e.preventDefault();
                            this.quickNavigate(parseInt(e.key));
                            break;
                        case 'h':
                            e.preventDefault();
                            this.showNavigationHistory();
                            break;
                    }
                }
            });
        },

        /**
         * Rendu du navigateur
         */
        render: function() {
            this.updateRoleDisplay();
            this.updateNavigationMenu();
            this.updateBreadcrumb();
            this.updateRoleSwitcher();
            this.updateQuickActions();
        },

        /**
         * Mise à jour de l'affichage du rôle actuel
         */
        updateRoleDisplay: function() {
            const currentRoleElement = document.getElementById('current-role');
            const role = this.getCurrentRole();
            
            if (currentRoleElement && role) {
                const roleIconSrc = `${this.config.imagePath}${role.icon}`;
                currentRoleElement.innerHTML = `
                    <div class="role-display">
                        <img src="${roleIconSrc}" alt="${role.name}" class="role-icon" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTIwIDEyQzI0LjIwOTE0IDEyIDI4IDE1Ljc5MDkgMjggMjBDMjggMjQuMjA5MSAyNC4yMDkxNCAyOCAyMCAyOEMxNS43OTA5IDI4IDEyIDI0LjIwOTEgMTIgMjBDMTIgMTUuNzkwOSAxNS43OTA5IDEyIDIwIDEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=='">
                        <span class="role-name">${role.name}</span>
                    </div>
                `;
            }
        },

        /**
         * Mise à jour du menu de navigation
         */
        updateNavigationMenu: function() {
            const menuContainer = document.getElementById('navigation-menu');
            const role = this.getCurrentRole();
            
            if (!menuContainer || !role) return;

            const menuHTML = role.menuItems.map((item, index) => `
                <li class="nav-item">
                    <a href="#" class="nav-link" data-route="${item.route}" data-index="${index}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-label">${item.label}</span>
                        ${index < 5 ? `<span class="nav-shortcut">Ctrl+${index + 1}</span>` : ''}
                    </a>
                </li>
            `).join('');

            menuContainer.innerHTML = menuHTML;
        },

        /**
         * Mise à jour du breadcrumb
         */
        updateBreadcrumb: function() {
            const breadcrumb = document.getElementById('breadcrumb');
            if (!breadcrumb) return;

            const breadcrumbHTML = this.state.currentPath.map((path, index) => `
                ${index > 0 ? '<span class="breadcrumb-separator">/</span>' : ''}
                <span class="breadcrumb-item">${path}</span>
            `).join('');

            breadcrumb.innerHTML = breadcrumbHTML;
        },

        /**
         * Mise à jour du sélecteur de rôles
         */
        updateRoleSwitcher: function() {
            const roleSwitcher = document.getElementById('role-switcher');
            if (!roleSwitcher) return;

            const currentRoleId = this.state.currentRole;
            const availableRoles = Object.values(this.roles).filter(role => 
                role.id === currentRoleId || this.canSwitchToRole(role.id)
            );

            const switcherHTML = availableRoles.map(role => `
                <button class="role-option ${role.id === currentRoleId ? 'active' : ''}" 
                        data-role="${role.id}" title="${role.description}">
                    <img src="${this.config.imagePath}${role.icon}" alt="${role.name}" 
                         class="role-option-icon" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNSIgcj0iMTUiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE1IDhDMTguMTIzNTYgOCAyMCA5Ljg3NjQ0IDIwIDEzQzIwIDE2LjEyMzYgMTguMTIzNTYgMTggMTUgMThDMTIuODc2NCAxOCAxMCAxNi4xMjM2IDEwIDEzQzEwIDkuODY1OTcgMTIuODc2NCA4IDE1IDhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'">
                    <span class="role-option-name">${role.name}</span>
                </button>
            `).join('');

            roleSwitcher.innerHTML = `
                <div class="role-switcher-header">
                    <span>Changer de rôle</span>
                </div>
                <div class="role-options">
                    ${switcherHTML}
                </div>
            `;
        },

        /**
         * Mise à jour des actions rapides
         */
        updateQuickActions: function() {
            const quickActionsContainer = document.getElementById('quick-actions');
            if (!quickActionsContainer) return;

            const role = this.getCurrentRole();
            if (!role) return;

            // Actions rapides spécifiques au rôle
            let actions = [];
            switch (role.id) {
                case 'producer':
                    actions = [
                        { id: 'add_production', label: 'Nouvelle production', icon: '🌱' },
                        { id: 'check_market', label: 'Vérifier marché', icon: '📈' },
                        { id: 'view_inventory', label: 'Inventaire', icon: '📦' }
                    ];
                    break;
                case 'trader':
                    actions = [
                        { id: 'new_order', label: 'Nouvelle commande', icon: '📋' },
                        { id: 'track_delivery', label: 'Suivi livraison', icon: '🚚' },
                        { id: 'manage_suppliers', label: 'Fournisseurs', icon: '🏭' }
                    ];
                    break;
                case 'cooperative':
                    actions = [
                        { id: 'member_stats', label: 'Statistiques', icon: '📊' },
                        { id: 'quality_report', label: 'Rapport qualité', icon: 'qualite_icon.png' },
                        { id: 'meeting_planning', label: 'Réunions', icon: '👥' }
                    ];
                    break;
                case 'admin':
                    actions = [
                        { id: 'user_management', label: 'Utilisateurs', icon: '👥' },
                        { id: 'system_settings', label: 'Paramètres', icon: '⚙️' },
                        { id: 'view_logs', label: 'Logs', icon: '📋' }
                    ];
                    break;
                default:
                    actions = [
                        { id: 'view_services', label: 'Voir services', icon: '🛠️' },
                        { id: 'check_news', label: 'Actualités', icon: '📰' }
                    ];
            }

            const actionsHTML = actions.map(action => `
                <button class="quick-action" data-quick-action="${action.id}">
                    <span class="action-icon">${action.icon}</span>
                    <span class="action-label">${action.label}</span>
                </button>
            `).join('');

            quickActionsContainer.innerHTML = actionsHTML;
        },

        /**
         * Obtenir le rôle actuel
         */
        getCurrentRole: function() {
            return this.roles[this.state.currentRole];
        },

        /**
         * Changer de rôle
         */
        changeRole: function(newRoleId) {
            if (!this.canSwitchToRole(newRoleId)) {
                this.showToast('Vous n\'avez pas les permissions pour ce rôle', 'warning');
                return;
            }

            if (this.state.currentRole === newRoleId) return;

            const oldRole = this.state.currentRole;
            this.state.currentRole = newRoleId;

            // Animation de transition
            this.animateRoleTransition(oldRole, newRoleId).then(() => {
                this.onRoleChanged(newRoleId);
            });

            this.trackEvent('role_changed', {
                from: oldRole,
                to: newRoleId
            });
        },

        /**
         * Vérifier si on peut changer vers un rôle
         */
        canSwitchToRole: function(roleId) {
            const currentTransitions = this.roleTransitions[this.state.currentRole] || [];
            return currentTransitions.includes(roleId) || roleId === 'admin';
        },

        /**
         * Animation de transition entre rôles
         */
        animateRoleTransition: async function(fromRole, toRole) {
            this.state.isTransitioning = true;

            const overlay = document.createElement('div');
            overlay.className = 'role-transition-overlay';
            overlay.innerHTML = `
                <div class="transition-content">
                    <div class="transition-icon">
                        <img src="${this.config.imagePath}${this.roles[toRole].icon}" alt="${this.roles[toRole].name}">
                    </div>
                    <h3>Passage au rôle ${this.roles[toRole].name}</h3>
                    <div class="transition-progress"></div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Animation d'apparition
            await this.animateElement(overlay, 'fadeIn');

            // Délai pour l'effet visuel
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Animation de disparition
            await this.animateElement(overlay, 'fadeOut');
            overlay.remove();

            this.state.isTransitioning = false;
        },

        /**
         * Animation d'élément
         */
        animateElement: function(element, animation) {
            return new Promise(resolve => {
                element.classList.add(animation);
                element.addEventListener('animationend', () => {
                    element.classList.remove(animation);
                    resolve();
                });
            });
        },

        /**
         * Actions après changement de rôle
         */
        onRoleChanged: function(newRoleId) {
            this.saveUserRole();
            this.render();
            
            // Déclencher un événement personnalisé
            document.dispatchEvent(new CustomEvent('role-changed', {
                detail: { role: newRoleId }
            }));
        },

        /**
         * Navigation vers une route
         */
        navigate: function(route, element) {
            // Ajouter à l'historique
            this.addToHistory(route);

            // Mettre à jour le breadcrumb
            this.updateBreadcrumbFromRoute(route);

            // Simulation de navigation (remplacer par router réel)
            this.simulateNavigation(route, element);

            this.trackEvent('navigation', { route });
        },

        /**
         * Simulation de navigation
         */
        simulateNavigation: function(route, element) {
            // Mettre en surbrillance l'élément actif
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            if (element) {
                element.classList.add('active');
            }

            // Charger le contenu (simulation)
            this.loadRouteContent(route);
        },

        /**
         * Charger le contenu d'une route
         */
        loadRouteContent: function(route) {
            const contentArea = document.getElementById('main-content');
            if (!contentArea) return;

            // Animation de chargement
            contentArea.classList.add('loading');

            // Simulation de chargement asynchrone
            setTimeout(() => {
                contentArea.classList.remove('loading');
                contentArea.innerHTML = `
                    <div class="route-content">
                        <h2>${this.getRouteTitle(route)}</h2>
                        <p>Contenu pour ${route}</p>
                        <div class="route-features">
                            ${this.getRouteFeatures(route)}
                        </div>
                    </div>
                `;
            }, 500);
        },

        /**
         * Obtenir le titre d'une route
         */
        getRouteTitle: function(route) {
            const titles = {
                '/': 'Accueil',
                '/services': 'Services',
                '/news': 'Actualités',
                '/profile': 'Mon Profil',
                '/production': 'Production',
                '/inventory': 'Inventaire',
                '/market': 'Marché',
                '/finance': 'Finance',
                '/trading': 'Commerce',
                '/suppliers': 'Fournisseurs',
                '/orders': 'Commandes',
                '/logistics': 'Logistique',
                '/members': 'Membres',
                '/quality': 'Qualité',
                '/reports': 'Rapports',
                '/admin/dashboard': 'Tableau de bord',
                '/admin/users': 'Gestion des utilisateurs',
                '/admin/roles': 'Gestion des rôles',
                '/admin/analytics': 'Analytique',
                '/admin/settings': 'Paramètres'
            };

            return titles[route] || 'Page';
        },

        /**
         * Obtenir les fonctionnalités d'une route
         */
        getRouteFeatures: function(route) {
            const features = {
                '/production': `
                    <div class="feature-grid">
                        <div class="feature-card">
                            <h4>Gestion des cultures</h4>
                            <p>Suivez vos productions en temps réel</p>
                        </div>
                        <div class="feature-card">
                            <h4>Planification</h4>
                            <p>Planifiez vos semis et récoltes</p>
                        </div>
                    </div>
                `,
                '/market': `
                    <div class="feature-grid">
                        <div class="feature-card">
                            <h4>Prix en temps réel</h4>
                            <p>Suivez l'évolution des prix du marché</p>
                        </div>
                        <div class="feature-card">
                            <h4>Demandes d'achat</h4>
                            <p>Consultez les demandes des acheteurs</p>
                        </div>
                    </div>
                `
            };

            return features[route] || '<p>Fonctionnalités disponibles dans cette section.</p>';
        },

        /**
         * Navigation rapide par raccourci clavier
         */
        quickNavigate: function(index) {
            const role = this.getCurrentRole();
            if (!role || !role.menuItems[index - 1]) return;

            const menuItem = role.menuItems[index - 1];
            this.navigate(menuItem.route);
        },

        /**
         * Mise à jour du breadcrumb depuis une route
         */
        updateBreadcrumbFromRoute: function(route) {
            const role = this.getCurrentRole();
            const menuItem = role.menuItems.find(item => item.route === route);
            
            if (menuItem) {
                this.state.currentPath = [role.name, menuItem.label];
            } else {
                this.state.currentPath = [role.name, route];
            }
        },

        /**
         * Ajouter à l'historique de navigation
         */
        addToHistory: function(route) {
            this.state.navigationHistory.unshift({
                route: route,
                timestamp: new Date().toISOString(),
                role: this.state.currentRole
            });

            // Limiter l'historique
            if (this.state.navigationHistory.length > this.config.historyLimit) {
                this.state.navigationHistory = this.state.navigationHistory.slice(0, this.config.historyLimit);
            }

            if (this.config.autoSaveHistory) {
                this.saveNavigationHistory();
            }
        },

        /**
         * Naviguer vers l'historique
         */
        navigateToHistory: function(index) {
            const historyItem = this.state.navigationHistory[index];
            if (historyItem) {
                this.navigate(historyItem.route);
            }
        },

        /**
         * Afficher l'historique de navigation
         */
        showNavigationHistory: function() {
            const modal = document.createElement('div');
            modal.className = 'history-modal';
            
            const historyHTML = this.state.navigationHistory.map((item, index) => `
                <div class="history-item" data-history="${index}">
                    <span class="history-route">${item.route}</span>
                    <span class="history-role">${this.roles[item.role].name}</span>
                    <span class="history-time">${this.formatTime(item.timestamp)}</span>
                </div>
            `).join('');

            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Historique de navigation</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="history-list">
                            ${historyHTML || '<p>Aucun élément dans l\'historique</p>'}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target.matches('.modal-close') || e.target.matches('.history-item')) {
                    modal.remove();
                }
            });
        },

        /**
         * Exécuter une action rapide
         */
        executeQuickAction: function(actionId) {
            const actions = {
                add_production: () => this.navigate('/production'),
                check_market: () => this.navigate('/market'),
                view_inventory: () => this.navigate('/inventory'),
                new_order: () => this.navigate('/orders'),
                track_delivery: () => this.navigate('/logistics'),
                manage_suppliers: () => this.navigate('/suppliers'),
                member_stats: () => this.navigate('/admin/analytics'),
                quality_report: () => this.navigate('/quality'),
                meeting_planning: () => this.navigate('/members'),
                user_management: () => this.navigate('/admin/users'),
                system_settings: () => this.navigate('/admin/settings'),
                view_logs: () => this.showToast('Logs non disponibles pour le moment', 'info'),
                view_services: () => this.navigate('/services'),
                check_news: () => this.navigate('/news')
            };

            if (actions[actionId]) {
                actions[actionId]();
                this.trackEvent('quick_action', { actionId });
            }
        },

        /**
         * Sauvegarder le rôle utilisateur
         */
        saveUserRole: function() {
            localStorage.setItem('ifn_user_role', this.state.currentRole);
        },

        /**
         * Charger le rôle utilisateur
         */
        loadUserRole: function() {
            const savedRole = localStorage.getItem('ifn_user_role');
            if (savedRole && this.roles[savedRole]) {
                this.state.currentRole = savedRole;
            }
        },

        /**
         * Sauvegarder l'historique de navigation
         */
        saveNavigationHistory: function() {
            localStorage.setItem('ifn_navigation_history', JSON.stringify(this.state.navigationHistory));
        },

        /**
         * Charger l'historique de navigation
         */
        loadNavigationHistory: function() {
            try {
                const saved = localStorage.getItem('ifn_navigation_history');
                if (saved) {
                    this.state.navigationHistory = JSON.parse(saved);
                }
            } catch (error) {
                console.error('[IFN Role Navigator] Erreur chargement historique:', error);
            }
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
                window.IFN.track(`role_navigator_${eventName}`, data);
            }
        },

        /**
         * Afficher une notification toast
         */
        showToast: function(message, type = 'info') {
            if (window.showToast) {
                window.showToast(message, type);
            } else {
                console.log(`[IFN Role Navigator] ${type.toUpperCase()}: ${message}`);
            }
        },

        /**
         * Obtenir les statistiques de navigation
         */
        getNavigationStats: function() {
            return {
                currentRole: this.state.currentRole,
                totalNavigations: this.state.navigationHistory.length,
                currentPath: this.state.currentPath,
                availableRoles: Object.keys(this.roles).length
            };
        }
    };

    // Initialiser automatiquement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            IFN_RoleNavigator.init();
        });
    } else {
        IFN_RoleNavigator.init();
    }

})();