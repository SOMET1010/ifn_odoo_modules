/* =============================================================================
   IFN Portal Common - Product Selector
   ============================================================================= */

/**
 * Sélecteur de produits interactif avec pictogrammes
 * Fonctionnalités : filtres, recherche, catégorisation, support tactile
 */
(function() {
    'use strict';

    const IFN_ProductSelector = {
        // Configuration
        config: {
            itemsPerPage: 20,
            animationDuration: 300,
            searchDebounce: 300,
            imagePath: '/static/src/img/icons/',
            categories: [
                { id: 'all', name: 'Tous', icon: '🛒' },
                { id: 'production', name: 'Production', icon: '🌱' },
                { id: 'transformation', name: 'Transformation', icon: '🏭' },
                { id: 'distribution', name: 'Distribution', icon: '🚚' },
                { id: 'finance', name: 'Finance', icon: '💰' },
                { id: 'marketing', name: 'Marketing', icon: '📢' }
            ]
        },

        // État global
        state: {
            products: [],
            filteredProducts: [],
            selectedCategory: 'all',
            searchQuery: '',
            selectedProducts: new Set(),
            currentPage: 1,
            totalPages: 0,
            viewMode: 'grid', // grid | list
            sortBy: 'name',
            sortOrder: 'asc'
        },

        // Products avec pictogrammes IFN
        products: [
            {
                id: 'igname',
                name: 'Igname',
                category: 'production',
                icon: 'igname_icon.png',
                description: 'Tubercules d\'igname frais',
                price: 15000,
                unit: 'kg',
                producer: 'Coopérative de Yamoussoukro',
                stock: 500,
                rating: 4.5
            },
            {
                id: 'manioc',
                name: 'Manioc',
                category: 'production',
                icon: 'manioc_icon.png',
                description: 'Manioc frais de qualité',
                price: 8000,
                unit: 'kg',
                producer: 'Producteurs de Bouaké',
                stock: 800,
                rating: 4.2
            },
            {
                id: 'plantain',
                name: 'Plantain',
                category: 'production',
                icon: 'plantain_icon.png',
                description: 'Plantain mûr sélectionné',
                price: 12000,
                unit: 'régime',
                producer: 'Coopérative du Sud',
                stock: 300,
                rating: 4.7
            },
            {
                id: 'tomate',
                name: 'Tomate',
                category: 'production',
                icon: 'tomate_icon.png',
                description: 'Tomates fraîches de saison',
                price: 10000,
                unit: 'kg',
                producer: 'Producteurs d\'Abidjan',
                stock: 200,
                rating: 4.3
            },
            {
                id: 'oignon',
                name: 'Oignon',
                category: 'production',
                icon: 'oignon_icon.png',
                description: 'Oignons de saison',
                price: 18000,
                unit: 'kg',
                producer: 'Producteurs du Nord',
                stock: 150,
                rating: 4.6
            },
            {
                id: 'piment',
                name: 'Piment',
                category: 'production',
                icon: 'piment_icon.png',
                description: 'Piments rouges frais',
                price: 25000,
                unit: 'kg',
                producer: 'Producteurs de Korhogo',
                stock: 80,
                rating: 4.8
            },
            {
                id: 'qualite_service',
                name: 'Contrôle Qualité',
                category: 'marketing',
                icon: 'qualite_icon.png',
                description: 'Services de contrôle qualité',
                price: 50000,
                unit: 'service',
                producer: 'IFN Services',
                stock: 999,
                rating: 4.9
            },
            {
                id: 'rapport_analyse',
                name: 'Rapports d\'analyse',
                category: 'marketing',
                icon: 'rapport_icon.png',
                description: 'Rapports détaillés de marché',
                price: 75000,
                unit: 'rapport',
                producer: 'IFN Analytics',
                stock: 999,
                rating: 4.4
            },
            {
                id: 'reglage_technique',
                name: 'Réglage technique',
                category: 'transformation',
                icon: 'reglage_icon.png',
                description: 'Services de réglage d\'équipements',
                price: 100000,
                unit: 'service',
                producer: 'IFN Technique',
                stock: 999,
                rating: 4.7
            },
            {
                id: 'mobile_money',
                name: 'Mobile Money',
                category: 'finance',
                icon: 'mobile_money_icon.png',
                description: 'Solutions de paiement mobile',
                price: 500,
                unit: 'transaction',
                producer: 'IFN Finance',
                stock: 999,
                rating: 4.1
            },
            {
                id: 'livraison',
                name: 'Livraison',
                category: 'distribution',
                icon: 'delivery_icon.png',
                description: 'Services de livraison rapide',
                price: 2500,
                unit: 'livraison',
                producer: 'IFN Logistics',
                stock: 999,
                rating: 4.3
            },
            {
                id: 'marche_info',
                name: 'Informations marché',
                category: 'marketing',
                icon: 'marche_icon.png',
                description: 'Données en temps réel sur les prix',
                price: 25000,
                unit: 'abonnement',
                producer: 'IFN Market',
                stock: 999,
                rating: 4.6
            }
        ],

        /**
         * Initialisation du sélecteur
         */
        init: function() {
            console.log('[IFN Product Selector] Initialisation...');
            
            this.state.products = [...this.products];
            this.state.filteredProducts = [...this.products];
            
            this.render();
            this.setupEventListeners();
            this.setupTouchSupport();
            
            // Exposer l'API globale
            window.IFN_ProductSelector = this;
            
            console.log('[IFN Product Selector] Initialisation terminée');
        },

        /**
         * Configuration des écouteurs d'événements
         */
        setupEventListeners: function() {
            // Recherche
            const searchInput = document.getElementById('product-search');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.updateSearch(e.target.value);
                    }, this.config.searchDebounce);
                });
            }

            // Filtres de catégorie
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-category]')) {
                    this.filterByCategory(e.target.dataset.category);
                }
                
                // Actions sur les produits
                if (e.target.closest('[data-product-id]')) {
                    const productElement = e.target.closest('[data-product-id]');
                    this.handleProductAction(e.target, productElement.dataset.productId);
                }
                
                // Pagination
                if (e.target.matches('[data-page]')) {
                    this.goToPage(parseInt(e.target.dataset.page));
                }
                
                // Tri
                if (e.target.matches('[data-sort]')) {
                    this.sortProducts(e.target.dataset.sort);
                }
                
                // Mode d'affichage
                if (e.target.matches('[data-view-mode]')) {
                    this.setViewMode(e.target.dataset.viewMode);
                }
            });
        },

        /**
         * Configuration du support tactile
         */
        setupTouchSupport: function() {
            let startX = 0;
            let startY = 0;
            let startTime = 0;

            document.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTime = Date.now();
            });

            document.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const endTime = Date.now();
                
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const deltaTime = endTime - startTime;
                
                // Détection du swipe (mouvement rapide)
                if (deltaTime < 300 && Math.abs(deltaX) > 50) {
                    if (deltaX > 0) {
                        // Swipe vers la droite - page précédente
                        this.previousPage();
                    } else {
                        // Swipe vers la gauche - page suivante
                        this.nextPage();
                    }
                }
            });
        },

        /**
         * Rendu du sélecteur
         */
        render: function() {
            this.updateFilters();
            this.updateProductList();
            this.updatePagination();
            this.updateSortControls();
            this.updateViewMode();
        },

        /**
         * Mise à jour des filtres de catégorie
         */
        updateFilters: function() {
            const filtersContainer = document.getElementById('category-filters');
            if (!filtersContainer) return;

            const filtersHTML = this.config.categories.map(category => `
                <button class="category-filter ${category.id === this.state.selectedCategory ? 'active' : ''}"
                        data-category="${category.id}">
                    <span class="category-icon">${category.icon}</span>
                    <span class="category-name">${category.name}</span>
                </button>
            `).join('');

            filtersContainer.innerHTML = filtersHTML;
        },

        /**
         * Mise à jour de la liste des produits
         */
        updateProductList: function() {
            const container = document.getElementById('product-list');
            if (!container) return;

            // Calculer la pagination
            const startIndex = (this.state.currentPage - 1) * this.config.itemsPerPage;
            const endIndex = startIndex + this.config.itemsPerPage;
            const productsToShow = this.state.filteredProducts.slice(startIndex, endIndex);

            const productsHTML = productsToShow.map(product => this.getProductCardHTML(product)).join('');
            
            container.innerHTML = productsHTML;
            container.className = `product-list ${this.state.viewMode}-view`;
        },

        /**
         * Template d'une carte produit
         */
        getProductCardHTML: function(product) {
            const isSelected = this.state.selectedProducts.has(product.id);
            const iconSrc = `${this.config.imagePath}${product.icon}`;

            return `
                <div class="product-card ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
                    <div class="product-image">
                        <img src="${iconSrc}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCA2MEM2Mi4wOTE0IDYwIDc0IDUyLjA5MTQgNzQgNDBDNzQgMjcuOTA4NiA2Mi4wOTE0IDIwIDUwIDIwQzM3LjkwODYgMjAgMjYgMjcuOTA4NiAyNiA0MEMyNiA1Mi4wOTE0IDM3LjkwODYgNjAgNTAgNjBaTTEwMCA2NUgxMFY3NUgxMDBWNjVaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo='">
                        <div class="product-overlay">
                            <button class="product-action" data-action="details" title="Détails">
                                <span class="icon">👁️</span>
                            </button>
                            <button class="product-action ${isSelected ? 'active' : ''}" data-action="select" title="${isSelected ? 'Désélectionner' : 'Sélectionner'}">
                                <span class="icon">${isSelected ? '✅' : '⭕'}</span>
                            </button>
                            <button class="product-action" data-action="compare" title="Comparer">
                                <span class="icon">⚖️</span>
                            </button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        <div class="product-meta">
                            <span class="product-price">${this.formatPrice(product.price)}</span>
                            <span class="product-unit">/${product.unit}</span>
                        </div>
                        <div class="product-rating">
                            ${this.getStarRatingHTML(product.rating)}
                            <span class="rating-text">${product.rating}</span>
                        </div>
                        <div class="product-footer">
                            <span class="product-stock">
                                <span class="stock-icon">📦</span>
                                Stock: ${product.stock}
                            </span>
                            <button class="btn btn-primary btn-sm" data-action="add-to-cart">
                                Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Template HTML pour les étoiles de notation
         */
        getStarRatingHTML: function(rating) {
            let stars = '';
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;

            for (let i = 0; i < fullStars; i++) {
                stars += '⭐';
            }
            if (hasHalfStar) {
                stars += '☆';
            }
            
            return `<span class="stars">${stars}</span>`;
        },

        /**
         * Formatage du prix
         */
        formatPrice: function(price) {
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF',
                minimumFractionDigits: 0
            }).format(price);
        },

        /**
         * Mise à jour de la pagination
         */
        updatePagination: function() {
            const container = document.getElementById('pagination');
            if (!container) return;

            this.state.totalPages = Math.ceil(this.state.filteredProducts.length / this.config.itemsPerPage);

            let paginationHTML = '';
            
            // Bouton précédent
            paginationHTML += `
                <button class="pagination-btn ${this.state.currentPage <= 1 ? 'disabled' : ''}" 
                        data-page="${this.state.currentPage - 1}" 
                        ${this.state.currentPage <= 1 ? 'disabled' : ''}>
                    ‹ Précédent
                </button>
            `;

            // Numéros de page
            const startPage = Math.max(1, this.state.currentPage - 2);
            const endPage = Math.min(this.state.totalPages, this.state.currentPage + 2);

            if (startPage > 1) {
                paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
                if (startPage > 2) {
                    paginationHTML += `<span class="pagination-ellipsis">...</span>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.state.currentPage ? 'active' : ''}" 
                            data-page="${i}">
                        ${i}
                    </button>
                `;
            }

            if (endPage < this.state.totalPages) {
                if (endPage < this.state.totalPages - 1) {
                    paginationHTML += `<span class="pagination-ellipsis">...</span>`;
                }
                paginationHTML += `<button class="pagination-btn" data-page="${this.state.totalPages}">${this.state.totalPages}</button>`;
            }

            // Bouton suivant
            paginationHTML += `
                <button class="pagination-btn ${this.state.currentPage >= this.state.totalPages ? 'disabled' : ''}" 
                        data-page="${this.state.currentPage + 1}" 
                        ${this.state.currentPage >= this.state.totalPages ? 'disabled' : ''}>
                    Suivant ›
                </button>
            `;

            container.innerHTML = paginationHTML;
        },

        /**
         * Mise à jour des contrôles de tri
         */
        updateSortControls: function() {
            const controls = document.querySelectorAll('[data-sort]');
            controls.forEach(control => {
                control.classList.remove('active');
                if (control.dataset.sort === this.state.sortBy) {
                    control.classList.add('active');
                }
            });
        },

        /**
         * Mise à jour du mode d'affichage
         */
        updateViewMode: function() {
            const controls = document.querySelectorAll('[data-view-mode]');
            controls.forEach(control => {
                control.classList.remove('active');
                if (control.dataset.viewMode === this.state.viewMode) {
                    control.classList.add('active');
                }
            });
        },

        /**
         * Gestion de la recherche
         */
        updateSearch: function(query) {
            this.state.searchQuery = query.toLowerCase().trim();
            this.filterProducts();
        },

        /**
         * Filtrage par catégorie
         */
        filterByCategory: function(category) {
            this.state.selectedCategory = category;
            this.state.currentPage = 1;
            this.filterProducts();
        },

        /**
         * Application des filtres
         */
        filterProducts: function() {
            let filtered = [...this.state.products];

            // Filtre par catégorie
            if (this.state.selectedCategory !== 'all') {
                filtered = filtered.filter(product => product.category === this.state.selectedCategory);
            }

            // Filtre par recherche
            if (this.state.searchQuery) {
                filtered = filtered.filter(product => 
                    product.name.toLowerCase().includes(this.state.searchQuery) ||
                    product.description.toLowerCase().includes(this.state.searchQuery)
                );
            }

            // Tri
            filtered.sort((a, b) => {
                let aValue = a[this.state.sortBy];
                let bValue = b[this.state.sortBy];

                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (this.state.sortOrder === 'asc') {
                    return aValue > bValue ? 1 : -1;
                } else {
                    return aValue < bValue ? 1 : -1;
                }
            });

            this.state.filteredProducts = filtered;
            this.state.currentPage = 1;
            
            this.render();
        },

        /**
         * Tri des produits
         */
        sortProducts: function(sortBy) {
            if (this.state.sortBy === sortBy) {
                // Inverser l'ordre si même critère
                this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.state.sortBy = sortBy;
                this.state.sortOrder = 'asc';
            }
            
            this.filterProducts();
        },

        /**
         * Définir le mode d'affichage
         */
        setViewMode: function(viewMode) {
            this.state.viewMode = viewMode;
            this.render();
        },

        /**
         * Navigation entre les pages
         */
        goToPage: function(page) {
            if (page >= 1 && page <= this.state.totalPages) {
                this.state.currentPage = page;
                this.updateProductList();
                this.updatePagination();
            }
        },

        /**
         * Page suivante
         */
        nextPage: function() {
            if (this.state.currentPage < this.state.totalPages) {
                this.goToPage(this.state.currentPage + 1);
            }
        },

        /**
         * Page précédente
         */
        previousPage: function() {
            if (this.state.currentPage > 1) {
                this.goToPage(this.state.currentPage - 1);
            }
        },

        /**
         * Gestion des actions sur les produits
         */
        handleProductAction: function(element, productId) {
            const action = element.dataset.action;
            
            switch (action) {
                case 'select':
                    this.toggleProductSelection(productId);
                    break;
                case 'details':
                    this.showProductDetails(productId);
                    break;
                case 'compare':
                    this.compareProduct(productId);
                    break;
                case 'add-to-cart':
                    this.addToCart(productId);
                    break;
            }
        },

        /**
         * Basculer la sélection d'un produit
         */
        toggleProductSelection: function(productId) {
            if (this.state.selectedProducts.has(productId)) {
                this.state.selectedProducts.delete(productId);
            } else {
                this.state.selectedProducts.add(productId);
            }
            
            this.updateProductList();
            
            this.trackEvent('product_selection_toggled', {
                productId: productId,
                selected: this.state.selectedProducts.has(productId)
            });
        },

        /**
         * Afficher les détails d'un produit
         */
        showProductDetails: function(productId) {
            const product = this.state.products.find(p => p.id === productId);
            if (!product) return;

            const modal = document.createElement('div');
            modal.className = 'product-details-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${product.name}</h2>
                        <button class="modal-close" data-action="close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="product-details-image">
                            <img src="${this.config.imagePath}${product.icon}" alt="${product.name}">
                        </div>
                        <div class="product-details-info">
                            <p class="product-description">${product.description}</p>
                            <div class="product-price-large">
                                ${this.formatPrice(product.price)}
                                <span class="unit">/${product.unit}</span>
                            </div>
                            <div class="product-specs">
                                <div class="spec-item">
                                    <span class="spec-label">Producteur :</span>
                                    <span class="spec-value">${product.producer}</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label">Stock disponible :</span>
                                    <span class="spec-value">${product.stock} ${product.unit}</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label">Note :</span>
                                    <span class="spec-value">${this.getStarRatingHTML(product.rating)} (${product.rating})</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label">Catégorie :</span>
                                    <span class="spec-value">${this.getCategoryName(product.category)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="compare">Comparer</button>
                        <button class="btn btn-primary" data-action="add-to-cart">Ajouter au panier</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="close"]')) {
                    modal.remove();
                }
                
                if (e.target.matches('[data-action="add-to-cart"]')) {
                    this.addToCart(productId);
                    modal.remove();
                }
                
                if (e.target.matches('[data-action="compare"]')) {
                    this.compareProduct(productId);
                    modal.remove();
                }
            });
        },

        /**
         * Obtenir le nom d'une catégorie
         */
        getCategoryName: function(categoryId) {
            const category = this.config.categories.find(cat => cat.id === categoryId);
            return category ? category.name : categoryId;
        },

        /**
         * Comparer un produit
         */
        compareProduct: function(productId) {
            this.trackEvent('product_comparison_added', { productId });
            this.showToast('Produit ajouté à la comparaison', 'info');
        },

        /**
         * Ajouter au panier
         */
        addToCart: function(productId) {
            const product = this.state.products.find(p => p.id === productId);
            if (!product) return;

            this.trackEvent('product_added_to_cart', {
                productId: productId,
                price: product.price
            });

            this.showToast(`${product.name} ajouté au panier`, 'success');
            
            // Déclencher un événement personnalisé
            document.dispatchEvent(new CustomEvent('product-added-to-cart', {
                detail: { product: product }
            }));
        },

        /**
         * Obtenir les produits sélectionnés
         */
        getSelectedProducts: function() {
            return this.state.products.filter(product => 
                this.state.selectedProducts.has(product.id)
            );
        },

        /**
         * Obtenir les statistiques de filtrage
         */
        getFilterStats: function() {
            return {
                total: this.state.products.length,
                filtered: this.state.filteredProducts.length,
                selected: this.state.selectedProducts.size,
                category: this.getCategoryName(this.state.selectedCategory),
                search: this.state.searchQuery
            };
        },

        /**
         * Tracker les événements
         */
        trackEvent: function(eventName, data) {
            if (window.IFN && window.IFN.track) {
                window.IFN.track(`product_selector_${eventName}`, data);
            }
        },

        /**
         * Afficher une notification toast
         */
        showToast: function(message, type = 'info') {
            if (window.showToast) {
                window.showToast(message, type);
            } else {
                console.log(`[IFN Product Selector] ${type.toUpperCase()}: ${message}`);
            }
        },

        /**
         * Réinitialiser tous les filtres
         */
        resetFilters: function() {
            this.state.selectedCategory = 'all';
            this.state.searchQuery = '';
            this.state.currentPage = 1;
            this.state.selectedProducts.clear();
            this.filterProducts();
        }
    };

    // Initialiser automatiquement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            IFN_ProductSelector.init();
        });
    } else {
        IFN_ProductSelector.init();
    }

})();