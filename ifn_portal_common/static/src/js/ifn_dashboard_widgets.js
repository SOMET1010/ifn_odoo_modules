/* =============================================================================
   IFN Portal Common - Dashboard Widgets
   ============================================================================= */

/**
 * Système de widgets interactifs pour tableaux de bord IFN
 * Fonctionnalités : interactions temps réel, animations, drag & drop, filtres
 */
(function() {
    'use strict';

    const IFN_DashboardWidgets = {
        // Configuration
        config: {
            animationDuration: 300,
            autoRefreshInterval: 30000, // 30 secondes
            maxWidgets: 12,
            gridCols: 12,
            gridRows: 6
        },

        // État global
        state: {
            widgets: new Map(),
            layout: [],
            isEditing: false,
            autoRefresh: true,
            lastUpdate: null
        },

        // Widgets disponibles
        availableWidgets: {
            stats: {
                name: 'Statistiques',
                icon: '📊',
                template: 'stats-template',
                defaultConfig: {
                    title: 'Statistiques',
                    metric: 'users',
                    period: 'month'
                }
            },
            chart: {
                name: 'Graphique',
                icon: '📈',
                template: 'chart-template',
                defaultConfig: {
                    title: 'Graphique',
                    type: 'line',
                    dataSource: 'api/dashboard/stats'
                }
            },
            table: {
                name: 'Tableau',
                icon: '📋',
                template: 'table-template',
                defaultConfig: {
                    title: 'Tableau de données',
                    columns: ['name', 'value', 'status'],
                    dataSource: 'api/dashboard/table'
                }
            },
            progress: {
                name: 'Jauge de progression',
                icon: '⏱️',
                template: 'progress-template',
                defaultConfig: {
                    title: 'Progression',
                    current: 75,
                    target: 100
                }
            },
            list: {
                name: 'Liste',
                icon: '📝',
                template: 'list-template',
                defaultConfig: {
                    title: 'Liste récente',
                    maxItems: 10,
                    dataSource: 'api/dashboard/list'
                }
            },
            map: {
                name: 'Carte',
                icon: '🗺️',
                template: 'map-template',
                defaultConfig: {
                    title: 'Carte',
                    center: [5.345, -4.026],
                    zoom: 10
                }
            }
        },

        /**
         * Initialisation du système de widgets
         */
        init: function() {
            console.log('[IFN Dashboard] Initialisation des widgets...');
            
            this.loadLayout();
            this.setupEventListeners();
            this.initializeGrid();
            this.startAutoRefresh();
            
            // Exposer l'API globale
            window.IFN_DashboardWidgets = this;
            
            console.log('[IFN Dashboard] Initialisation terminée');
        },

        /**
         * Configuration des écouteurs d'événements
         */
        setupEventListeners: function() {
            // Mode édition
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="toggle-edit-mode"]')) {
                    this.toggleEditMode();
                }
                
                if (e.target.matches('[data-action="add-widget"]')) {
                    this.openWidgetSelector();
                }
                
                if (e.target.matches('[data-action="save-layout"]')) {
                    this.saveLayout();
                }
                
                if (e.target.matches('[data-action="reset-layout"]')) {
                    this.resetLayout();
                }
                
                // Actions sur les widgets
                if (e.target.closest('[data-widget-id]')) {
                    this.handleWidgetAction(e.target, e.target.closest('[data-widget-id]').dataset.widgetId);
                }
            });

            // Gestion du drag & drop
            this.setupDragAndDrop();

            // Redimensionnement
            this.setupResize();
        },

        /**
         * Gestion du drag & drop
         */
        setupDragAndDrop: function() {
            let draggedWidget = null;
            let dragOffset = { x: 0, y: 0 };

            document.addEventListener('dragstart', (e) => {
                if (e.target.matches('.widget') && this.state.isEditing) {
                    draggedWidget = e.target;
                    dragOffset = {
                        x: e.clientX - e.target.getBoundingClientRect().left,
                        y: e.clientY - e.target.getBoundingClientRect().top
                    };
                    e.target.classList.add('dragging');
                }
            });

            document.addEventListener('drag', (e) => {
                if (draggedWidget) {
                    const grid = document.querySelector('.dashboard-grid');
                    const gridRect = grid.getBoundingClientRect();
                    
                    let x = e.clientX - gridRect.left - dragOffset.x;
                    let y = e.clientY - gridRect.top - dragOffset.y;
                    
                    // Snap to grid
                    x = Math.max(0, Math.min(x, gridRect.width - draggedWidget.offsetWidth));
                    y = Math.max(0, Math.min(y, gridRect.height - draggedWidget.offsetHeight));
                    
                    draggedWidget.style.left = x + 'px';
                    draggedWidget.style.top = y + 'px';
                }
            });

            document.addEventListener('dragend', (e) => {
                if (draggedWidget) {
                    draggedWidget.classList.remove('dragging');
                    this.updateWidgetPosition(
                        draggedWidget.dataset.widgetId,
                        parseInt(draggedWidget.style.left) / 80,
                        parseInt(draggedWidget.style.top) / 80
                    );
                    draggedWidget = null;
                }
            });
        },

        /**
         * Gestion du redimensionnement
         */
        setupResize: function() {
            const resizeHandles = document.querySelectorAll('.resize-handle');
            
            resizeHandles.forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    if (!this.state.isEditing) return;
                    
                    e.preventDefault();
                    const widget = handle.closest('.widget');
                    const startPos = { x: e.clientX, y: e.clientY };
                    const startSize = { width: widget.offsetWidth, height: widget.offsetHeight };
                    
                    const onMouseMove = (e) => {
                        const deltaX = e.clientX - startPos.x;
                        const deltaY = e.clientY - startPos.y;
                        
                        const newWidth = Math.max(160, startSize.width + deltaX);
                        const newHeight = Math.max(120, startSize.height + deltaY);
                        
                        widget.style.width = newWidth + 'px';
                        widget.style.height = newHeight + 'px';
                    };
                    
                    const onMouseUp = () => {
                        this.updateWidgetSize(
                            widget.dataset.widgetId,
                            widget.offsetWidth / 80,
                            widget.offsetHeight / 80
                        );
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            });
        },

        /**
         * Initialisation de la grille
         */
        initializeGrid: function() {
            const grid = document.querySelector('.dashboard-grid');
            if (!grid) return;

            // Créer les colonnes de la grille
            for (let i = 0; i < this.config.gridCols; i++) {
                for (let j = 0; j < this.config.gridRows; j++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-cell';
                    cell.dataset.col = i;
                    cell.dataset.row = j;
                    grid.appendChild(cell);
                }
            }

            this.renderWidgets();
        },

        /**
         * Création d'un nouveau widget
         */
        createWidget: function(type, config = {}) {
            if (this.state.widgets.size >= this.config.maxWidgets) {
                this.showToast('Nombre maximum de widgets atteint', 'warning');
                return null;
            }

            const widgetId = 'widget_' + Date.now();
            const widgetConfig = {
                ...this.availableWidgets[type].defaultConfig,
                ...config,
                id: widgetId,
                type: type,
                x: 0,
                y: 0,
                width: 4,
                height: 3,
                created: new Date().toISOString()
            };

            this.state.widgets.set(widgetId, widgetConfig);
            this.renderWidget(widgetId);
            
            this.trackEvent('widget_created', {
                widgetId: widgetId,
                type: type
            });

            return widgetId;
        },

        /**
         * Rendu d'un widget
         */
        renderWidget: function(widgetId) {
            const config = this.state.widgets.get(widgetId);
            if (!config) return;

            const widget = document.createElement('div');
            widget.className = `widget widget-${config.type}`;
            widget.dataset.widgetId = widgetId;
            widget.draggable = this.state.isEditing;

            // Position et taille
            widget.style.left = (config.x * 80) + 'px';
            widget.style.top = (config.y * 80) + 'px';
            widget.style.width = (config.width * 80 - 10) + 'px';
            widget.style.height = (config.height * 80 - 10) + 'px';

            widget.innerHTML = this.getWidgetTemplate(config);

            const grid = document.querySelector('.dashboard-grid');
            grid.appendChild(widget);

            // Charger les données
            this.loadWidgetData(widgetId);
        },

        /**
         * Template du widget selon le type
         */
        getWidgetTemplate: function(config) {
            const baseTemplate = `
                <div class="widget-header">
                    <h3 class="widget-title">
                        <span class="widget-icon">${this.availableWidgets[config.type].icon}</span>
                        ${config.title}
                    </h3>
                    <div class="widget-actions">
                        <button class="widget-action" data-action="refresh" title="Actualiser">
                            <span class="icon">🔄</span>
                        </button>
                        <button class="widget-action" data-action="settings" title="Paramètres">
                            <span class="icon">⚙️</span>
                        </button>
                        ${this.state.isEditing ? `
                            <button class="widget-action" data-action="remove" title="Supprimer">
                                <span class="icon">🗑️</span>
                            </button>
                            <div class="resize-handle"></div>
                        ` : ''}
                    </div>
                </div>
                <div class="widget-content">
            `;

            let contentTemplate = '';

            switch (config.type) {
                case 'stats':
                    contentTemplate = `
                        <div class="stats-container">
                            <div class="stat-item">
                                <span class="stat-value" id="${config.id}_value">--</span>
                                <span class="stat-label">${config.metric}</span>
                            </div>
                            <div class="stat-trend" id="${config.id}_trend">
                                <span class="trend-icon">📈</span>
                                <span class="trend-value">+0%</span>
                            </div>
                        </div>
                    `;
                    break;

                case 'chart':
                    contentTemplate = `
                        <div class="chart-container">
                            <canvas id="${config.id}_chart" width="300" height="200"></canvas>
                        </div>
                    `;
                    break;

                case 'table':
                    contentTemplate = `
                        <div class="table-container">
                            <table class="widget-table" id="${config.id}_table">
                                <thead>
                                    <tr>
                                        ${config.columns.map(col => `<th>${col}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    `;
                    break;

                case 'progress':
                    contentTemplate = `
                        <div class="progress-container">
                            <div class="progress-circle">
                                <svg width="120" height="120">
                                    <circle cx="60" cy="60" r="50" class="progress-bg"/>
                                    <circle cx="60" cy="60" r="50" class="progress-bar" 
                                            id="${config.id}_progress" stroke-dasharray="314" stroke-dashoffset="314"/>
                                </svg>
                                <div class="progress-text">
                                    <span id="${config.id}_progress_value">${config.current}%</span>
                                </div>
                            </div>
                        </div>
                    `;
                    break;

                case 'list':
                    contentTemplate = `
                        <div class="list-container">
                            <ul class="widget-list" id="${config.id}_list"></ul>
                        </div>
                    `;
                    break;

                case 'map':
                    contentTemplate = `
                        <div class="map-container">
                            <div class="map" id="${config.id}_map"></div>
                        </div>
                    `;
                    break;
            }

            return baseTemplate + contentTemplate + '</div></div>';
        },

        /**
         * Chargement des données d'un widget
         */
        loadWidgetData: async function(widgetId) {
            const config = this.state.widgets.get(widgetId);
            if (!config || !config.dataSource) return;

            try {
                const response = await fetch(config.dataSource);
                const data = await response.json();

                switch (config.type) {
                    case 'stats':
                        this.updateStatsWidget(widgetId, data);
                        break;
                    case 'chart':
                        this.updateChartWidget(widgetId, data);
                        break;
                    case 'table':
                        this.updateTableWidget(widgetId, data);
                        break;
                    case 'list':
                        this.updateListWidget(widgetId, data);
                        break;
                }
            } catch (error) {
                console.error(`[IFN Dashboard] Erreur chargement widget ${widgetId}:`, error);
                this.showToast('Erreur de chargement des données', 'error');
            }
        },

        /**
         * Mise à jour d'un widget de statistiques
         */
        updateStatsWidget: function(widgetId, data) {
            const valueElement = document.getElementById(`${widgetId}_value`);
            const trendElement = document.getElementById(`${widgetId}_trend`);
            
            if (valueElement) {
                valueElement.textContent = data.value || '--';
            }
            
            if (trendElement && data.trend) {
                const trendIcon = trendElement.querySelector('.trend-icon');
                const trendValue = trendElement.querySelector('.trend-value');
                
                trendIcon.textContent = data.trend > 0 ? '📈' : '📉';
                trendValue.textContent = `${data.trend > 0 ? '+' : ''}${data.trend}%`;
                trendElement.className = `stat-trend ${data.trend > 0 ? 'positive' : 'negative'}`;
            }
        },

        /**
         * Mise à jour d'un widget de graphique
         */
        updateChartWidget: function(widgetId, data) {
            const canvas = document.getElementById(`${widgetId}_chart`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Implementation simplifiée d'un graphique en ligne
            if (data && data.labels && data.values) {
                const padding = 40;
                const chartWidth = canvas.width - padding * 2;
                const chartHeight = canvas.height - padding * 2;
                
                ctx.strokeStyle = '#2196F3';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                data.values.forEach((value, index) => {
                    const x = padding + (index * chartWidth) / (data.values.length - 1);
                    const y = padding + chartHeight - (value / Math.max(...data.values)) * chartHeight;
                    
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                
                ctx.stroke();
            }
        },

        /**
         * Mise à jour d'un widget de tableau
         */
        updateTableWidget: function(widgetId, data) {
            const tbody = document.querySelector(`#${widgetId}_table tbody`);
            if (!tbody || !data) return;

            tbody.innerHTML = data.map(row => `
                <tr>
                    ${Array.isArray(row) ? 
                        row.map(cell => `<td>${cell}</td>`).join('') : 
                        Object.values(row).map(cell => `<td>${cell}</td>`).join('')
                    }
                </tr>
            `).join('');
        },

        /**
         * Mise à jour d'un widget de liste
         */
        updateListWidget: function(widgetId, data) {
            const list = document.getElementById(`${widgetId}_list`);
            if (!list || !data) return;

            list.innerHTML = data.slice(0, 10).map(item => `
                <li class="list-item">
                    <span class="item-text">${item.text || item}</span>
                    <span class="item-time">${this.formatTime(item.time || new Date())}</span>
                </li>
            `).join('');
        },

        /**
         * Gestion des actions sur les widgets
         */
        handleWidgetAction: function(element, widgetId) {
            const action = element.dataset.action;
            
            switch (action) {
                case 'refresh':
                    this.loadWidgetData(widgetId);
                    break;
                case 'settings':
                    this.openWidgetSettings(widgetId);
                    break;
                case 'remove':
                    this.removeWidget(widgetId);
                    break;
            }
        },

        /**
         * Ouvrir les paramètres d'un widget
         */
        openWidgetSettings: function(widgetId) {
            const config = this.state.widgets.get(widgetId);
            if (!config) return;

            const modal = document.createElement('div');
            modal.className = 'widget-settings-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Paramètres du widget</h3>
                        <button class="modal-close" data-action="close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Titre :</label>
                            <input type="text" id="widget-title" value="${config.title}">
                        </div>
                        <div class="form-group">
                            <label>Source de données :</label>
                            <input type="text" id="widget-datasource" value="${config.dataSource || ''}">
                        </div>
                        ${config.type === 'progress' ? `
                            <div class="form-group">
                                <label>Progression actuelle :</label>
                                <input type="number" id="widget-current" value="${config.current}" min="0" max="100">
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" data-action="save">Sauvegarder</button>
                        <button class="btn btn-secondary" data-action="cancel">Annuler</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Gestion des actions du modal
            modal.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="close"]') || e.target.matches('[data-action="cancel"]')) {
                    modal.remove();
                }
                
                if (e.target.matches('[data-action="save"]')) {
                    this.saveWidgetSettings(widgetId, modal);
                }
            });
        },

        /**
         * Sauvegarder les paramètres d'un widget
         */
        saveWidgetSettings: function(widgetId, modal) {
            const config = this.state.widgets.get(widgetId);
            if (!config) return;

            // Mettre à jour la configuration
            config.title = modal.querySelector('#widget-title').value;
            config.dataSource = modal.querySelector('#widget-datasource').value;
            
            if (config.type === 'progress') {
                config.current = parseInt(modal.querySelector('#widget-current').value);
            }

            // Recharger les données
            this.loadWidgetData(widgetId);
            
            modal.remove();
            this.showToast('Paramètres sauvegardés', 'success');
        },

        /**
         * Supprimer un widget
         */
        removeWidget: function(widgetId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer ce widget ?')) {
                this.state.widgets.delete(widgetId);
                const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
                if (widget) widget.remove();
                
                this.trackEvent('widget_removed', { widgetId });
                this.showToast('Widget supprimé', 'success');
            }
        },

        /**
         * Basculer le mode édition
         */
        toggleEditMode: function() {
            this.state.isEditing = !this.state.isEditing;
            
            document.body.classList.toggle('edit-mode', this.state.isEditing);
            
            const widgets = document.querySelectorAll('.widget');
            widgets.forEach(widget => {
                widget.draggable = this.state.isEditing;
            });
            
            this.trackEvent('edit_mode_toggled', { enabled: this.state.isEditing });
        },

        /**
         * Ouvrir le sélecteur de widgets
         */
        openWidgetSelector: function() {
            const modal = document.createElement('div');
            modal.className = 'widget-selector-modal';
            
            let widgetList = '';
            Object.entries(this.availableWidgets).forEach(([key, widget]) => {
                widgetList += `
                    <div class="widget-option" data-widget-type="${key}">
                        <div class="widget-icon">${widget.icon}</div>
                        <div class="widget-name">${widget.name}</div>
                    </div>
                `;
            });
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Ajouter un widget</h3>
                        <button class="modal-close" data-action="close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="widget-options">
                            ${widgetList}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="close"]')) {
                    modal.remove();
                }
                
                if (e.target.closest('.widget-option')) {
                    const type = e.target.closest('.widget-option').dataset.widgetType;
                    this.createWidget(type);
                    modal.remove();
                }
            });
        },

        /**
         * Démarrer l'actualisation automatique
         */
        startAutoRefresh: function() {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
            }
            
            this.autoRefreshInterval = setInterval(() => {
                if (this.state.autoRefresh) {
                    this.refreshAllWidgets();
                }
            }, this.config.autoRefreshInterval);
        },

        /**
         * Actualiser tous les widgets
         */
        refreshAllWidgets: function() {
            this.state.widgets.forEach((config, widgetId) => {
                this.loadWidgetData(widgetId);
            });
            
            this.state.lastUpdate = new Date();
        },

        /**
         * Sauvegarder la mise en page
         */
        saveLayout: function() {
            const layout = [];
            
            this.state.widgets.forEach((config, widgetId) => {
                layout.push(config);
            });
            
            localStorage.setItem('ifn_dashboard_layout', JSON.stringify(layout));
            this.showToast('Mise en page sauvegardée', 'success');
        },

        /**
         * Charger la mise en page
         */
        loadLayout: function() {
            try {
                const saved = localStorage.getItem('ifn_dashboard_layout');
                if (saved) {
                    const layout = JSON.parse(saved);
                    layout.forEach(widgetConfig => {
                        this.state.widgets.set(widgetConfig.id, widgetConfig);
                    });
                }
            } catch (error) {
                console.error('[IFN Dashboard] Erreur chargement layout:', error);
            }
        },

        /**
         * Réinitialiser la mise en page
         */
        resetLayout: function() {
            if (confirm('Réinitialiser la mise en page ? Tous les widgets seront supprimés.')) {
                this.state.widgets.clear();
                document.querySelectorAll('.widget').forEach(widget => widget.remove());
                localStorage.removeItem('ifn_dashboard_layout');
                this.showToast('Mise en page réinitialisée', 'success');
            }
        },

        /**
         * Mettre à jour la position d'un widget
         */
        updateWidgetPosition: function(widgetId, x, y) {
            const config = this.state.widgets.get(widgetId);
            if (config) {
                config.x = Math.round(x);
                config.y = Math.round(y);
            }
        },

        /**
         * Mettre à jour la taille d'un widget
         */
        updateWidgetSize: function(widgetId, width, height) {
            const config = this.state.widgets.get(widgetId);
            if (config) {
                config.width = Math.round(width);
                config.height = Math.round(height);
            }
        },

        /**
         * Formatage du temps
         */
        formatTime: function(time) {
            const now = new Date();
            const date = new Date(time);
            const diff = now - date;
            
            if (diff < 60000) return 'Maintenant';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
            
            return date.toLocaleDateString();
        },

        /**
         * Tracker les événements
         */
        trackEvent: function(eventName, data) {
            if (window.IFN && window.IFN.track) {
                window.IFN.track(`dashboard_${eventName}`, data);
            }
        },

        /**
         * Afficher une notification toast
         */
        showToast: function(message, type = 'info') {
            if (window.showToast) {
                window.showToast(message, type);
            } else {
                console.log(`[IFN Dashboard] ${type.toUpperCase()}: ${message}`);
            }
        }
    };

    // Initialiser automatiquement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            IFN_DashboardWidgets.init();
        });
    } else {
        IFN_DashboardWidgets.init();
    }

})();