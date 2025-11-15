/* ================================================== */
/*        IFN PORTAL - NOTIFICATIONS MODULE           */
/* ================================================== */

export default {
    init() {
        console.log('🔔 Initialisation module notifications');
        this.notifications = new Map();
        this.container = this.createContainer();
        this.setupGlobalNotifications();
        this.setupToastNotifications();
        this.setupSoundNotifications();
        this.setupVibrationSupport();
        this.setupNotificationPermissions();
    },

    /**
     * Création du conteneur de notifications
     */
    createContainer() {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', 'Notifications');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
        return container;
    },

    /**
     * Configuration des notifications globales
     */
    setupGlobalNotifications() {
        // Notification des erreurs JavaScript
        window.addEventListener('error', (e) => {
            this.show('Une erreur est survenue', {
                type: 'error',
                duration: 5000,
                actions: [
                    { text: 'Détails', action: () => this.showErrorDetails(e) },
                    { text: 'Fermer', action: 'close' }
                ]
            });
        });

        // Notification des promesses rejetées
        window.addEventListener('unhandledrejection', (e) => {
            this.show('Opération échouée', {
                type: 'warning',
                duration: 5000,
                actions: [
                    { text: 'Réessayer', action: () => window.location.reload() },
                    { text: 'Fermer', action: 'close' }
                ]
            });
        });

        // Notification de sauvegarde automatique
        this.setupAutoSaveNotifications();
        
        // Notification de déconnexion imminente
        this.setupSessionNotifications();
    },

    /**
     * Configuration notifications de sauvegarde automatique
     */
    setupAutoSaveNotifications() {
        let autoSaveInterval;
        
        const startAutoSave = () => {
            autoSaveInterval = setInterval(() => {
                if (this.hasUnsavedChanges()) {
                    this.show('Sauvegarde automatique en cours...', {
                        type: 'info',
                        duration: 2000,
                        icon: 'fas fa-save'
                    });
                }
            }, 30000); // Toutes les 30 secondes
        };

        const stopAutoSave = () => {
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
        };

        // Démarrer la sauvegarde automatique
        startAutoSave();
        
        // Arrêter sur page masquée
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAutoSave();
            } else {
                startAutoSave();
            }
        });
    },

    /**
     * Configuration notifications de session
     */
    setupSessionNotifications() {
        // Notification 5 minutes avant expiration
        setTimeout(() => {
            this.show('Votre session expire dans 5 minutes', {
                type: 'warning',
                duration: 0, // Pas de durée automatique
                actions: [
                    { text: 'Prolonger', action: () => this.extendSession() },
                    { text: 'Ignorer', action: 'close' }
                ],
                persistent: true
            });
        }, 25 * 60 * 1000); // 25 minutes

        // Notification de déconnexion
        setTimeout(() => {
            this.show('Vous avez été déconnecté', {
                type: 'info',
                duration: 5000,
                actions: [
                    { text: 'Se reconnecter', action: () => window.location.href = '/login' }
                ]
            });
        }, 30 * 60 * 1000); // 30 minutes
    },

    /**
     * Configuration notifications toast
     */
    setupToastNotifications() {
        // Événement global pour afficher des toasts
        document.addEventListener('show-toast', (e) => {
            const { message, options } = e.detail;
            this.show(message, options);
        });

        // Événement pour masquer tous les toasts
        document.addEventListener('hide-all-toasts', () => {
            this.hideAll();
        });
    },

    /**
     * Configuration notifications sonores
     */
    setupSoundNotifications() {
        this.audioContext = null;
        this.sounds = {
            success: this.createBeepSound(800, 0.1),
            warning: this.createBeepSound(600, 0.2),
            error: this.createBeepSound(400, 0.3),
            info: this.createBeepSound(900, 0.1)
        };

        // Test des sons
        this.testSounds();
    },

    /**
     * Création d'un son de notification
     */
    createBeepSound(frequency, duration) {
        return () => {
            try {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }

                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);
            } catch (error) {
                console.warn('Impossible de jouer le son:', error);
            }
        };
    },

    /**
     * Test des notifications sonores
     */
    testSounds() {
        // Activer les sons uniquement après interaction utilisateur
        const enableSounds = () => {
            console.log('🔊 Notifications sonores activées');
            document.removeEventListener('click', enableSounds);
            document.removeEventListener('keydown', enableSounds);
        };

        document.addEventListener('click', enableSounds, { once: true });
        document.addEventListener('keydown', enableSounds, { once: true });
    },

    /**
     * Configuration support vibration
     */
    setupVibrationSupport() {
        this.vibrationEnabled = 'vibrate' in navigator;
    },

    /**
     * Configuration permissions de notification
     */
    setupNotificationPermissions() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                this.requestNotificationPermission();
            } else if (Notification.permission === 'granted') {
                console.log('✅ Permissions notification accordées');
            }
        }
    },

    /**
     * Demande de permissions de notification
     */
    requestNotificationPermission() {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('✅ Permissions notification accordées');
                    this.show('Notifications activées', {
                        type: 'success',
                        duration: 3000
                    });
                }
            });
        }
    },

    /**
     * Affichage d'une notification
     */
    show(message, options = {}) {
        const config = {
            id: this.generateId(),
            message,
            type: 'info', // info, success, warning, error
            duration: 4000,
            persistent: false,
            icon: null,
            actions: [],
            ...options
        };

        const notification = this.createNotificationElement(config);
        this.container.appendChild(notification);
        this.notifications.set(config.id, notification);

        // Animation d'entrée
        this.animateIn(notification);

        // Notification sonore
        if (config.type && this.sounds[config.type]) {
            this.sounds[config.type]();
        }

        // Vibration
        if (this.vibrationEnabled) {
            navigator.vibrate([100, 50, 100]);
        }

        // Notification desktop
        this.showDesktopNotification(config);

        // Auto-dismiss
        if (config.duration > 0 && !config.persistent) {
            setTimeout(() => {
                this.hide(config.id);
            }, config.duration);
        }

        console.log(`🔔 Notification: ${config.type} - ${message}`);
        return config.id;
    },

    /**
     * Création de l'élément notification
     */
    createNotificationElement(config) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${config.type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', config.type === 'error' ? 'assertive' : 'polite');
        
        const iconClass = this.getIconClass(config.type, config.icon);
        
        notification.innerHTML = `
            <div class="notification-content">
                ${iconClass ? `<i class="${iconClass}" aria-hidden="true"></i>` : ''}
                <div class="notification-message">${config.message}</div>
                ${config.actions.length > 0 ? this.createActionsHTML(config.actions) : ''}
                <button class="notification-close" aria-label="Fermer la notification">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        `;

        // Styles
        notification.style.cssText = `
            background: white;
            border-left: 4px solid ${this.getColor(config.type)};
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 10px;
            padding: 15px;
            pointer-events: auto;
            transform: translateX(100%);
            transition: transform 0.3s ease, opacity 0.3s ease;
            max-width: 400px;
            position: relative;
        `;

        // Event listeners
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hide(config.id);
        });

        config.actions.forEach(action => {
            const button = notification.querySelector(`[data-action="${action.text}"]`);
            if (button) {
                button.addEventListener('click', () => {
                    if (action.action === 'close') {
                        this.hide(config.id);
                    } else if (typeof action.action === 'function') {
                        action.action();
                    }
                });
            }
        });

        return notification;
    },

    /**
     * Création du HTML des actions
     */
    createActionsHTML(actions) {
        return `
            <div class="notification-actions">
                ${actions.map(action => `
                    <button class="notification-action" data-action="${action.text}">
                        ${action.text}
                    </button>
                `).join('')}
            </div>
        `;
    },

    /**
     * Obtention de la classe d'icône
     */
    getIconClass(type, customIcon) {
        if (customIcon) return customIcon;
        
        const icons = {
            success: 'fas fa-check-circle text-success',
            warning: 'fas fa-exclamation-triangle text-warning',
            error: 'fas fa-times-circle text-danger',
            info: 'fas fa-info-circle text-info'
        };
        
        return icons[type] || '';
    },

    /**
     * Obtention de la couleur selon le type
     */
    getColor(type) {
        const colors = {
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#17a2b8'
        };
        
        return colors[type] || '#6c757d';
    },

    /**
     * Animation d'entrée
     */
    animateIn(notification) {
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
    },

    /**
     * Animation de sortie
     */
    animateOut(notification, callback) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(callback, 300);
    },

    /**
     * Masquage d'une notification
     */
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        this.animateOut(notification, () => {
            notification.remove();
            this.notifications.delete(id);
        });
    },

    /**
     * Masquage de toutes les notifications
     */
    hideAll() {
        this.notifications.forEach((notification, id) => {
            this.hide(id);
        });
    },

    /**
     * Notification desktop
     */
    showDesktopNotification(config) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(config.message, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: config.id,
                requireInteraction: config.persistent
            });

            notification.onclick = () => {
                window.focus();
                this.hide(config.id);
                notification.close();
            };

            if (!config.persistent) {
                setTimeout(() => notification.close(), config.duration);
            }
        }
    },

    /**
     * Méthodes utilitaires
     */
    generateId() {
        return 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    hasUnsavedChanges() {
        const forms = document.querySelectorAll('form');
        return Array.from(forms).some(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            return Array.from(inputs).some(input => input.value !== input.defaultValue);
        });
    },

    extendSession() {
        // Appel API pour prolonger la session
        fetch('/api/extend-session', { method: 'POST' })
            .then(() => {
                this.show('Session prolongée', { type: 'success', duration: 3000 });
                this.hideAll();
            })
            .catch(() => {
                this.show('Erreur lors de la prolongation', { type: 'error' });
            });
    },

    showErrorDetails(error) {
        console.error('Détails de l\'erreur:', error);
        this.show('Détails dans la console', { type: 'info' });
    },

    /**
     * API publique
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    },

    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    },

    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error' });
    },

    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }
};