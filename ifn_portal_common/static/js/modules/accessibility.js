/* ================================================== */
/*         IFN PORTAL - ACCESSIBILITÉ MODULE          */
/* ================================================== */

export default {
    init() {
        console.log('♿ Initialisation module accessibilité');
        this.setupAriaLabels();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupScreenReaderSupport();
        this.setupSkipLinks();
        this.setupHighContrast();
        this.setupReducedMotion();
        this.monitorAccessibility();
    },

    /**
     * Configuration des labels ARIA
     */
    setupAriaLabels() {
        // Attribution automatique de labels ARIA manquants
        const elementsNeedingLabels = [
            { selector: 'img:not([alt])', generateAlt: this.generateImageAlt },
            { selector: 'button:not([aria-label])', generateLabel: this.generateButtonLabel },
            { selector: 'input:not([aria-label]):not([aria-labelledby])', generateLabel: this.generateInputLabel },
            { selector: 'a[aria-label=""]', removeEmptyLabel: true }
        ];

        elementsNeedingLabels.forEach(rule => {
            const elements = document.querySelectorAll(rule.selector);
            elements.forEach(element => {
                if (rule.generateAlt) {
                    element.setAttribute('alt', rule.generateAlt(element));
                } else if (rule.generateLabel) {
                    element.setAttribute('aria-label', rule.generateLabel(element));
                } else if (rule.removeEmptyLabel) {
                    element.removeAttribute('aria-label');
                }
            });
        });

        // Amélioration des descriptions existantes
        this.enhanceExistingAria();
    },

    /**
     * Génération automatique de texte alternatif pour images
     */
    generateImageAlt(element) {
        const src = element.src || '';
        const filename = src.split('/').pop().split('.')[0];
        const iconKeywords = {
            'icon': 'icône',
            'marchand': 'marchand',
            'producteur': 'producteur',
            'cooperative': 'coopérative',
            'notification': 'notification',
            'rapport': 'rapport',
            'qualite': 'qualité',
            'reglage': 'réglage'
        };

        for (const [key, value] of Object.entries(iconKeywords)) {
            if (filename.toLowerCase().includes(key)) {
                return `Icône ${value}`;
            }
        }

        return filename || 'Image';
    },

    /**
     * Génération de label pour boutons
     */
    generateButtonLabel(element) {
        const text = element.textContent?.trim();
        if (text) return text;

        const icon = element.querySelector('i, [class*="fa-"]');
        if (icon) {
            const classList = icon.className.toLowerCase();
            if (classList.includes('fa-edit')) return 'Modifier';
            if (classList.includes('fa-trash')) return 'Supprimer';
            if (classList.includes('fa-plus')) return 'Ajouter';
            if (classList.includes('fa-refresh')) return 'Actualiser';
            if (classList.includes('fa-search')) return 'Rechercher';
        }

        return 'Bouton';
    },

    /**
     * Génération de label pour champs input
     */
    generateInputLabel(element) {
        const type = element.type;
        const name = element.name || '';
        const placeholder = element.placeholder || '';
        
        if (type === 'email') return 'Adresse email';
        if (type === 'password') return 'Mot de passe';
        if (type === 'search') return 'Rechercher';
        if (name.includes('email')) return 'Adresse email';
        if (name.includes('search')) return 'Rechercher';
        if (placeholder) return placeholder;

        return 'Champ de saisie';
    },

    /**
     * Amélioration des attributs ARIA existants
     */
    enhanceExistingAria() {
        // Ajout de roles manquants
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            if (!card.getAttribute('role')) {
                card.setAttribute('role', 'article');
            }
            if (!card.getAttribute('aria-label')) {
                const title = card.querySelector('h1, h2, h3, h4, h5, h6, .card-title');
                if (title) {
                    card.setAttribute('aria-label', title.textContent.trim());
                }
            }
        });

        // Amélioration des listes
        const lists = document.querySelectorAll('ul:not([role]), ol:not([role])');
        lists.forEach(list => {
            const items = list.children.length;
            if (items > 1) {
                list.setAttribute('role', 'list');
            }
        });

        // Amélioration des alertes et notifications
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => {
            alert.setAttribute('role', 'alert');
            if (!alert.getAttribute('aria-live')) {
                alert.setAttribute('aria-live', 'polite');
            }
        });
    },

    /**
     * Configuration navigation clavier avancée
     */
    setupKeyboardNavigation() {
        // Raccourcis clavier globaux
        this.setupGlobalKeyboardShortcuts();
        
        // Navigation dans les tableaux
        this.setupTableNavigation();
        
        // Navigation dans les modales
        this.setupModalNavigation();
        
        // Navigation dans les onglets
        this.setupTabsNavigation();
    },

    /**
     * Configuration des raccourcis clavier globaux
     */
    setupGlobalKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + M : Menu principal
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                this.focusMainMenu();
            }
            
            // Alt + C : Contenu principal
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                this.focusMainContent();
            }
            
            // Alt + S : Recherche
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                this.focusSearchField();
            }
            
            // Ctrl + Home : Début de page
            if (e.ctrlKey && e.key === 'Home') {
                e.preventDefault();
                this.scrollToTop();
            }
            
            // Ctrl + End : Fin de page
            if (e.ctrlKey && e.key === 'End') {
                e.preventDefault();
                this.scrollToBottom();
            }
            
            // Échap : Fermer éléments actifs
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    },

    /**
     * Focus sur le menu principal
     */
    focusMainMenu() {
        const menu = document.querySelector('nav, .navbar, [role="navigation"]');
        const firstLink = menu?.querySelector('a, button');
        
        if (firstLink) {
            firstLink.focus();
            this.announce('Menu principal ciblé');
        }
    },

    /**
     * Focus sur le contenu principal
     */
    focusMainContent() {
        const main = document.querySelector('main, [role="main"]');
        if (main) {
            main.setAttribute('tabindex', '-1');
            main.focus();
            this.announce('Contenu principal ciblé');
        }
    },

    /**
     * Focus sur le champ de recherche
     */
    focusSearchField() {
        const searchField = document.querySelector('input[type="search"], input[name*="search"], .search input');
        if (searchField) {
            searchField.focus();
            this.announce('Champ de recherche ciblé');
        }
    },

    /**
     * Navigation dans les tableaux
     */
    setupTableNavigation() {
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            const cells = table.querySelectorAll('td, th');
            
            cells.forEach((cell, index) => {
                cell.setAttribute('tabindex', '0');
                cell.addEventListener('keydown', (e) => {
                    this.handleTableNavigation(e, cells, index);
                });
            });
        });
    },

    /**
     * Gestion navigation tableau
     */
    handleTableNavigation(e, cells, currentIndex) {
        const cols = Math.round(Math.sqrt(cells.length));
        
        switch(e.key) {
            case 'ArrowRight':
                e.preventDefault();
                this.focusTableCell(cells, Math.min(currentIndex + 1, cells.length - 1));
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                this.focusTableCell(cells, Math.max(currentIndex - 1, 0));
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.focusTableCell(cells, Math.min(currentIndex + cols, cells.length - 1));
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.focusTableCell(cells, Math.max(currentIndex - cols, 0));
                break;
        }
    },

    /**
     * Focus sur cellule de tableau
     */
    focusTableCell(cells, index) {
        cells.forEach(cell => cell.setAttribute('tabindex', '-1'));
        cells[index].setAttribute('tabindex', '0');
        cells[index].focus();
    },

    /**
     * Configuration navigation modales
     */
    setupModalNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.trapFocus(e);
            }
        });
    },

    /**
     * Piège du focus dans les modales
     */
    trapFocus(e) {
        const activeModal = document.querySelector('.modal.show, [role="dialog"]:not([aria-hidden="true"])');
        if (!activeModal) return;

        const focusableElements = activeModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    },

    /**
     * Gestion de la touche Échap
     */
    handleEscapeKey() {
        // Fermer modales
        const modal = document.querySelector('.modal.show');
        if (modal) {
            const closeBtn = modal.querySelector('[data-bs-dismiss="modal"], .btn-close');
            if (closeBtn) closeBtn.click();
            return;
        }

        // Masquer menus dropdown
        const dropdown = document.querySelector('.dropdown-menu.show');
        if (dropdown) {
            const toggle = dropdown.previousElementSibling;
            if (toggle) toggle.click();
            return;
        }

        // Masquer tooltips
        const tooltip = document.querySelector('.tooltip.show');
        if (tooltip) {
            tooltip.remove();
        }
    },

    /**
     * Configuration de la gestion du focus
     */
    setupFocusManagement() {
        // Sauvegarde et restauration du focus
        this.setupFocusRestoration();
        
        // Indicateurs visuels de focus
        this.setupFocusIndicators();
        
        // Focus visible sur les éléments interactifs
        this.improveFocusVisibility();
    },

    /**
     * Sauvegarde et restauration du focus
     */
    setupFocusRestoration() {
        let lastFocusedElement = null;

        document.addEventListener('focusin', (e) => {
            lastFocusedElement = e.target;
        });

        window.addEventListener('beforeunload', () => {
            if (lastFocusedElement && lastFocusedElement.id) {
                sessionStorage.setItem('lastFocusedElement', lastFocusedElement.id);
            }
        });

        // Restauration du focus au chargement
        const storedId = sessionStorage.getItem('lastFocusedElement');
        if (storedId) {
            const element = document.getElementById(storedId);
            if (element) {
                setTimeout(() => element.focus(), 100);
                sessionStorage.removeItem('lastFocusedElement');
            }
        }
    },

    /**
     * Configuration des indicateurs de focus
     */
    setupFocusIndicators() {
        const style = document.createElement('style');
        style.textContent = `
            .focus-visible {
                outline: 2px solid var(--ifn-orange) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 4px rgba(247, 127, 0, 0.25) !important;
            }
            
            .js-focus-visible :focus:not(.focus-visible) {
                outline: none !important;
            }
            
            .js-focus-visible :focus:not(.focus-visible):focus-visible {
                outline: 2px solid var(--ifn-orange) !important;
                outline-offset: 2px !important;
            }
        `;
        document.head.appendChild(style);

        document.body.classList.add('js-focus-visible');
    },

    /**
     * Amélioration de la visibilité du focus
     */
    improveFocusVisibility() {
        const interactiveElements = document.querySelectorAll(
            'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        interactiveElements.forEach(element => {
            element.classList.add('focus-visible');
        });
    },

    /**
     * Configuration support lecteurs d'écran
     */
    setupScreenReaderSupport() {
        // Régions en direct pour les annonces dynamiques
        this.setupLiveRegions();
        
        // Descriptions des états
        this.setupStateDescriptions();
        
        // Navigation par titres
        this.setupHeadingNavigation();
        
        // Annonce des changements de page
        this.announcePageChanges();
    },

    /**
     * Configuration des régions live
     */
    setupLiveRegions() {
        // Région pour annonces importantes
        const politeRegion = document.createElement('div');
        politeRegion.setAttribute('aria-live', 'polite');
        politeRegion.setAttribute('aria-atomic', 'true');
        politeRegion.className = 'sr-only';
        politeRegion.id = 'sr-announcements';
        document.body.appendChild(politeRegion);

        // Région pour erreurs urgentes
        const assertiveRegion = document.createElement('div');
        assertiveRegion.setAttribute('aria-live', 'assertive');
        assertiveRegion.setAttribute('aria-atomic', 'true');
        assertiveRegion.className = 'sr-only';
        assertiveRegion.id = 'sr-errors';
        document.body.appendChild(assertiveRegion);

        window.srAnnounce = (message, priority = 'polite') => {
            const region = document.getElementById(`sr-${priority === 'assertive' ? 'errors' : 'announcements'}`);
            region.textContent = message;
            
            // Nettoyage après annonce
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        };
    },

    /**
     * Annonce de changements de page
     */
    announcePageChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Annonce des nouveaux contenus importants
                            if (node.classList?.contains('alert') || node.matches('.alert')) {
                                this.announce(node.textContent, 'assertive');
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    /**
     * Configuration des liens de navigation
     */
    setupSkipLinks() {
        const skipLinks = document.createElement('nav');
        skipLinks.setAttribute('aria-label', 'Liens de navigation');
        skipLinks.className = 'skip-nav';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Aller au contenu principal</a>
            <a href="#main-navigation" class="skip-link">Aller à la navigation</a>
            <a href="#search" class="skip-link">Aller à la recherche</a>
        `;

        // Styles pour les liens de navigation
        const style = document.createElement('style');
        style.textContent = `
            .skip-nav {
                position: absolute;
                top: -40px;
                left: 6px;
                z-index: 999;
            }
            
            .skip-link {
                position: absolute;
                top: -40px;
                left: 6px;
                background: #000;
                color: #fff;
                padding: 8px;
                text-decoration: none;
                border-radius: 0 0 4px 4px;
                z-index: 1000;
            }
            
            .skip-link:focus {
                top: 0;
            }
        `;
        document.head.appendChild(style);

        document.body.insertBefore(skipLinks, document.body.firstChild);
    },

    /**
     * Configuration mode contraste élevé
     */
    setupHighContrast() {
        // Détection des préférences utilisateur
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.enableHighContrastMode();
        }

        // Écoute des changements de préférences
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            if (e.matches) {
                this.enableHighContrastMode();
            } else {
                this.disableHighContrastMode();
            }
        });
    },

    /**
     * Activation mode contraste élevé
     */
    enableHighContrastMode() {
        const style = document.createElement('style');
        style.id = 'high-contrast-mode';
        style.textContent = `
            * {
                border-color: #000 !important;
            }
            
            .card, .btn, input, select, textarea {
                border: 2px solid #000 !important;
            }
            
            .btn-primary {
                background: #000 !important;
                color: #fff !important;
            }
            
            .text-muted {
                color: #000 !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('🔍 Mode contraste élevé activé');
    },

    /**
     * Désactivation mode contraste élevé
     */
    disableHighContrastMode() {
        const highContrastStyle = document.getElementById('high-contrast-mode');
        if (highContrastStyle) {
            highContrastStyle.remove();
        }
        
        console.log('🔍 Mode contraste élevé désactivé');
    },

    /**
     * Configuration préférences mouvement réduit
     */
    setupReducedMotion() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.enableReducedMotionMode();
        }

        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            if (e.matches) {
                this.enableReducedMotionMode();
            } else {
                this.disableReducedMotionMode();
            }
        });
    },

    /**
     * Activation mode mouvement réduit
     */
    enableReducedMotionMode() {
        const style = document.createElement('style');
        style.id = 'reduced-motion-mode';
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
            
            .card {
                transition: none !important;
            }
            
            .btn:hover {
                transform: none !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('🚫 Mode mouvement réduit activé');
    },

    /**
     * Désactivation mode mouvement réduit
     */
    disableReducedMotionMode() {
        const reducedMotionStyle = document.getElementById('reduced-motion-mode');
        if (reducedMotionStyle) {
            reducedMotionStyle.remove();
        }
        
        console.log('🚫 Mode mouvement réduit désactivé');
    },

    /**
     * Annonce pour les lecteurs d'écran
     */
    announce(message, priority = 'polite') {
        if (window.srAnnounce) {
            window.srAnnounce(message, priority);
        } else {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', priority);
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = message;
            
            document.body.appendChild(announcement);
            
            setTimeout(() => announcement.remove(), 1000);
        }
    },

    /**
     * Surveillance de l'accessibilité
     */
    monitorAccessibility() {
        // Vérification périodique des violations
        setInterval(() => {
            this.checkAccessibilityIssues();
        }, 30000);

        // Rapport automatique au développeur
        if (typeof gtag !== 'undefined') {
            this.setupAccessibilityTracking();
        }
    },

    /**
     * Vérification des problèmes d'accessibilité
     */
    checkAccessibilityIssues() {
        const issues = [];
        
        // Images sans alt
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
        if (imagesWithoutAlt.length > 0) {
            issues.push(`${imagesWithoutAlt.length} images sans attribut alt`);
        }

        // Liens sans texte descriptif
        const linksWithoutText = document.querySelectorAll('a:not([aria-label]):empty');
        if (linksWithoutText.length > 0) {
            issues.push(`${linksWithoutText.length} liens sans texte descriptif`);
        }

        // Champs sans labels
        const unlabeledInputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])');
        if (unlabeledInputs.length > 0) {
            issues.push(`${unlabeledInputs.length} champs sans labels`);
        }

        if (issues.length > 0) {
            console.warn('⚠️ Problèmes d\'accessibilité détectés:', issues);
        }
    },

    /**
     * Configuration du tracking d'accessibilité
     */
    setupAccessibilityTracking() {
        // Événements pour le tracking
        const events = ['focus', 'blur', 'click', 'keydown'];
        
        events.forEach(event => {
            document.addEventListener(event, this.throttle((e) => {
                const target = e.target;
                const elementInfo = {
                    tagName: target.tagName,
                    id: target.id,
                    className: target.className,
                    hasAriaLabel: !!target.getAttribute('aria-label'),
                    hasAlt: !!target.getAttribute('alt')
                };

                gtag('event', 'accessibility_interaction', {
                    event_category: 'Accessibility',
                    event_label: `${elementInfo.tagName} ${elementInfo.id || elementInfo.className}`,
                    custom_parameters: elementInfo
                });
            }, 1000));
        });
    },

    /**
     * Utilitaires
     */
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.announce('Retour en haut de page');
    },

    scrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        this.announce('Aller en bas de page');
    },

    throttle(func, limit) {
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
};