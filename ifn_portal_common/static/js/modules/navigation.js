/* ================================================== */
/*            IFN PORTAL - NAVIGATION MODULE          */
/* ================================================== */

export default {
    init() {
        console.log('🧭 Initialisation module navigation');
        this.setupMenuToggle();
        this.setupBreadcrumbs();
        this.setupSmoothScrolling();
        this.setupActiveStates();
        this.setupKeyboardNavigation();
    },

    /**
     * Configuration du toggle du menu mobile
     */
    setupMenuToggle() {
        const menuToggle = document.querySelector('[data-menu-toggle]');
        const menu = document.querySelector('[data-menu]');
        
        if (!menuToggle || !menu) return;

        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMenu(menuToggle, menu);
        });

        // Fermeture au clic extérieur
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
                this.closeMenu(menu);
            }
        });

        // Fermeture avec Echap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('show')) {
                this.closeMenu(menu);
                menuToggle.focus();
            }
        });
    },

    /**
     * Bascule l'état du menu
     */
    toggleMenu(toggle, menu) {
        const isOpen = menu.classList.contains('show');
        
        if (isOpen) {
            this.closeMenu(menu);
        } else {
            this.openMenu(menu);
        }
        
        // Mise à jour de l'attribut ARIA
        toggle.setAttribute('aria-expanded', !isOpen);
        
        // Animation
        this.animateMenuToggle(menu, !isOpen);
    },

    /**
     * Ouvrir le menu
     */
    openMenu(menu) {
        menu.classList.add('show');
        menu.setAttribute('aria-hidden', 'false');
        
        // Focus sur le premier lien
        const firstLink = menu.querySelector('a, button');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    },

    /**
     * Fermer le menu
     */
    closeMenu(menu) {
        menu.classList.remove('show');
        menu.setAttribute('aria-hidden', 'true');
    },

    /**
     * Animation du toggle du menu
     */
    animateMenuToggle(menu, opening) {
        const links = menu.querySelectorAll('a');
        
        if (opening) {
            links.forEach((link, index) => {
                link.style.opacity = '0';
                link.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    link.style.transition = 'all 0.3s ease';
                    link.style.opacity = '1';
                    link.style.transform = 'translateX(0)';
                }, index * 50);
            });
        }
    },

    /**
     * Configuration des breadcrumbs
     */
    setupBreadcrumbs() {
        const breadcrumbs = document.querySelector('[data-breadcrumbs]');
        if (!breadcrumbs) return;

        const links = breadcrumbs.querySelectorAll('a');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                // Animation de départ
                link.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    link.style.transform = 'scale(1)';
                }, 100);
            });
        });

        // Génération automatique si manquante
        if (links.length === 0) {
            this.generateBreadcrumbs(breadcrumbs);
        }
    },

    /**
     * Génération automatique des breadcrumbs
     */
    generateBreadcrumbs(container) {
        const path = window.location.pathname;
        const segments = path.split('/').filter(segment => segment);
        
        if (segments.length === 0) return;

        let breadcrumbsHTML = '<a href="/">Accueil</a>';
        let currentPath = '';
        
        segments.forEach((segment, index) => {
            currentPath += '/' + segment;
            const isLast = index === segments.length - 1;
            
            if (isLast) {
                breadcrumbsHTML += `<span aria-current="page">${this.formatSegment(segment)}</span>`;
            } else {
                breadcrumbsHTML += `<a href="${currentPath}">${this.formatSegment(segment)}</a>`;
            }
        });
        
        container.innerHTML = breadcrumbsHTML;
        container.classList.add('breadcrumb', 'mb-0');
        
        // Animation d'apparition
        this.animateBreadcrumbs(container);
    },

    /**
     * Formatage des segments de breadcrumb
     */
    formatSegment(segment) {
        return segment
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    },

    /**
     * Animation des breadcrumbs
     */
    animateBreadcrumbs(container) {
        const items = container.children;
        
        Array.from(items).forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-10px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 100);
        });
    },

    /**
     * Configuration du scroll fluide
     */
    setupSmoothScrolling() {
        // Liens d'ancrage
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const target = document.querySelector(anchor.getAttribute('href'));
                
                if (target) {
                    e.preventDefault();
                    this.smoothScrollTo(target);
                }
            });
        });

        // Bouton "Retour en haut"
        this.setupBackToTop();
    },

    /**
     * Scroll fluide vers un élément
     */
    smoothScrollTo(target, offset = 0) {
        const targetPosition = target.offsetTop - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
        
        // Mise à jour de l'URL
        history.pushState(null, null, '#' + target.id);
        
        // Focus sur l'élément destination
        setTimeout(() => {
            target.setAttribute('tabindex', '-1');
            target.focus();
            target.addEventListener('blur', () => {
                target.removeAttribute('tabindex');
            }, { once: true });
        }, 500);
    },

    /**
     * Configuration du bouton retour en haut
     */
    setupBackToTop() {
        const backToTop = document.createElement('button');
        backToTop.innerHTML = '<i class="fas fa-chevron-up"></i>';
        backToTop.className = 'btn btn-primary position-fixed';
        backToTop.style.cssText = `
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: none;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        backToTop.setAttribute('aria-label', 'Retour en haut');
        backToTop.setAttribute('data-back-to-top', '');
        
        document.body.appendChild(backToTop);

        // Affichage/masquage au scroll
        window.addEventListener('scroll', this.throttle(() => {
            if (window.pageYOffset > 300) {
                backToTop.style.display = 'block';
                backToTop.style.opacity = '1';
            } else {
                backToTop.style.opacity = '0';
                setTimeout(() => {
                    if (window.pageYOffset <= 300) {
                        backToTop.style.display = 'none';
                    }
                }, 300);
            }
        }, 250));

        // Action du clic
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    },

    /**
     * Configuration des états actifs
     */
    setupActiveStates() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link, [data-nav-link]');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            if (href && (href === currentPath || href === currentPath + '/')) {
                this.setActiveLink(link);
            }
            
            // Mise à jour au changement de page (SPA)
            link.addEventListener('click', () => {
                this.setActiveLink(link);
            });
        });
    },

    /**
     * Définit le lien actif
     */
    setActiveLink(activeLink) {
        // Retirer l'état actif de tous les liens
        document.querySelectorAll('.nav-link.active, [data-nav-link].active')
            .forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            });
        
        // Activer le lien
        activeLink.classList.add('active');
        activeLink.setAttribute('aria-current', 'page');
        
        // Animation
        activeLink.style.transform = 'scale(1.05)';
        setTimeout(() => {
            activeLink.style.transform = 'scale(1)';
        }, 200);
    },

    /**
     * Configuration de la navigation clavier
     */
    setupKeyboardNavigation() {
        const focusableElements = document.querySelectorAll(
            '.nav-link, [data-menu-toggle], button, [role="menuitem"]'
        );
        
        // Navigation avec Tab et Shift+Tab
        focusableElements.forEach((element, index) => {
            element.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.focusNextElement(focusableElements, index);
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.focusPreviousElement(focusableElements, index);
                }
            });
        });
    },

    /**
     * Focus sur l'élément suivant
     */
    focusNextElement(elements, currentIndex) {
        const nextIndex = (currentIndex + 1) % elements.length;
        elements[nextIndex].focus();
    },

    /**
     * Focus sur l'élément précédent
     */
    focusPreviousElement(elements, currentIndex) {
        const prevIndex = (currentIndex - 1 + elements.length) % elements.length;
        elements[prevIndex].focus();
    },

    /**
     * Fonction throttle optimisée
     */
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