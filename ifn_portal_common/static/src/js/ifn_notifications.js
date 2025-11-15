/* =============================================================================
   IFN Portal Common - Gestionnaire de notifications
   Notifications temps réel, centre de notifications, gestion des statuts
   ============================================================================= */

/**
 * Gestionnaire de notifications IFN
 * Prend en charge les notifications temps réel, le centre de notifications,
   et la gestion des statuts de lecture
 */
odoo.define(
    "ifn_portal_common.ifn_notifications",
    ["web.core", "web.ajax"],
    function (require) {
        "use strict"

        var core = require("web.core")
        var ajax = require("web.ajax")
        var _t = core._t

        var NotificationManager = {
            // Configuration
            config: {
                refreshInterval: 30000, // 30 secondes
                maxNotifications: 50,
                enableSounds: true,
                enableDesktop: true,
                sounds: {
                    info: "/ifn_portal_common/static/src/sounds/notification-info.mp3",
                    success:
                        "/ifn_portal_common/static/src/sounds/notification-success.mp3",
                    warning:
                        "/ifn_portal_common/static/src/sounds/notification-warning.mp3",
                    error: "/ifn_portal_common/static/src/sounds/notification-error.mp3",
                },
            },

            // État
            state: {
                unreadCount: 0,
                notifications: [],
                isEnabled: false,
                isSupported: false,
                lastSync: null,
                isPolling: false,
            },

            // Timer pour le rafraîchissement
            refreshTimer: null,

            /**
             * Initialise le gestionnaire de notifications
             */
            init: function () {
                console.log("[IFN Notifications] Initialisation...")

                this.checkSupport()
                this.requestPermission()
                this.initEventListeners()
                this.loadNotifications()
                this.startPolling()

                console.log("[IFN Notifications] Initialisé")
            },

            /**
             * Vérifie le support des notifications navigateur
             */
            checkSupport: function () {
                this.state.isSupported =
                    "Notification" in window && "serviceWorker" in navigator
                this.state.isEnabled =
                    this.state.isSupported &&
                    Notification.permission === "granted"

                console.log(
                    "[IFN Notifications] Support:",
                    this.state.isSupported,
                    "Activé:",
                    this.state.isEnabled
                )
            },

            /**
             * Demande la permission pour les notifications desktop
             */
            requestPermission: function () {
                if (!this.state.isSupported) return

                var self = this
                if (Notification.permission === "default") {
                    Notification.requestPermission().then(function (
                        permission
                    ) {
                        self.state.isEnabled = permission === "granted"
                        if (permission === "granted") {
                            self.showNotification(
                                "Notifications activées",
                                "Vous recevrez maintenant les notifications du portail IFN",
                                "success"
                            )
                        }
                    })
                }
            },

            /**
             * Initialise les écouteurs d'événements
             */
            initEventListeners: function () {
                var self = this

                // Écouter les clics sur les badges de notification
                $(document).on(
                    "click",
                    ".ifn-notification-badge, .ifn-notifications-link",
                    function () {
                        self.showNotificationCenter()
                    }
                )

                // Écouter les clics sur les notifications
                $(document).on("click", ".ifn-notification-item", function () {
                    var notificationId = $(this).data("notification-id")
                    self.handleNotificationClick(notificationId)
                })

                // Écouter les actions de marquer comme lu
                $(document).on("click", ".mark-read", function () {
                    var notificationId = $(this).data("message-id")
                    self.markAsRead(notificationId)
                })

                // Écouter "tout marquer comme lu"
                $(document).on("click", "#mark-all-read", function () {
                    self.markAllAsRead()
                })

                // Écouter le rafraîchissement
                $(document).on("click", "#refresh-notifications", function () {
                    self.loadNotifications(true)
                })

                // Service Worker messages
                if ("serviceWorker" in navigator) {
                    navigator.serviceWorker.addEventListener(
                        "message",
                        function (event) {
                            self.handleServiceWorkerMessage(event)
                        }
                    )
                }

                // Événements de focus/blur
                $(window).on("focus", function () {
                    if (self.state.unreadCount > 0) {
                        self.loadNotifications(true)
                    }
                })

                // Écouter les événements IFN
                $(window).on(
                    "ifn:new_notification",
                    function (event, notification) {
                        self.handleNewNotification(notification)
                    }
                )
            },

            /**
             * Charge les notifications depuis le serveur
             */
            loadNotifications: function (forceRefresh) {
                if (!this.isLoggedIn()) return

                var self = this
                var lastSync = this.state.lastSync

                // Éviter les requêtes trop fréquentes
                if (
                    !forceRefresh &&
                    lastSync &&
                    Date.now() - lastSync.getTime() < 5000
                ) {
                    return
                }

                if (window.IFN && window.IFN.api) {
                    window.IFN.api("/notifications")
                        .then(function (data) {
                            self.updateNotifications(data)
                            self.state.lastSync = new Date()
                        })
                        .catch(function (error) {
                            console.error(
                                "[IFN Notifications] Erreur chargement:",
                                error
                            )
                        })
                }
            },

            /**
             * Met à jour les notifications
             */
            updateNotifications: function (data) {
                if (!data || !data.notifications) return

                var oldUnreadCount = this.state.unreadCount
                var newNotifications = []

                // Détecter les nouvelles notifications
                var existingIds = this.state.notifications.map(function (n) {
                    return n.id
                })

                data.notifications.forEach(function (notification) {
                    if (existingIds.indexOf(notification.id) === -1) {
                        newNotifications.push(notification)
                    }
                })

                // Mettre à jour l'état
                this.state.notifications = data.notifications.slice(
                    0,
                    this.config.maxNotifications
                )
                this.state.unreadCount = data.unread_count || 0

                // Mettre à jour l'UI
                this.updateBadge()
                this.updateNotificationCenter()

                // Afficher les nouvelles notifications
                newNotifications.forEach(function (notification) {
                    self.showDesktopNotification(notification)
                    self.playSound(notification.notification_type)
                })

                // Émettre un événement
                if (newNotifications.length > 0) {
                    $(window).trigger("ifn:notifications_updated", [
                        newNotifications,
                    ])
                }
            },

            /**
             * Affiche une notification desktop
             */
            showDesktopNotification: function (notification) {
                if (!this.state.isEnabled || !notification) return

                var options = {
                    body: this.stripHtml(notification.message),
                    icon: this.getIconForType(notification.notification_type),
                    badge: "/ifn_portal_common/static/src/img/icons/icon-96.png",
                    tag: "ifn-notification-" + notification.id,
                    requireInteraction: notification.priority === "urgent",
                    actions: [],
                }

                // Ajouter des actions si disponible
                if (notification.action_url && notification.action_label) {
                    options.actions.push({
                        action: "view",
                        title: notification.action_label,
                    })
                }

                options.actions.push({
                    action: "mark-read",
                    title: "Marquer comme lu",
                })

                var desktopNotif = new Notification(notification.title, options)

                // Gérer les clics
                var self = this
                desktopNotif.onclick = function () {
                    self.handleNotificationClick(notification.id)
                    desktopNotif.close()
                }

                // Fermeture automatique
                if (notification.priority !== "urgent") {
                    setTimeout(function () {
                        desktopNotif.close()
                    }, 5000)
                }
            },

            /**
             * Affiche une notification simple
             */
            showNotification: function (title, message, type, options) {
                options = options || {}
                type = type || "info"

                var notification = {
                    id: Date.now(),
                    title: title,
                    message: message,
                    notification_type: type,
                    priority: options.priority || "normal",
                    created_at: new Date().toISOString(),
                }

                // Afficher notification desktop
                this.showDesktopNotification(notification)

                // Jouer un son
                this.playSound(type)

                // Afficher toast
                if (window.IFN && window.IFN.showToast) {
                    window.IFN.showToast(message, type, title)
                }
            },

            /**
             * Joue un son de notification
             */
            playSound: function (type) {
                if (!this.config.enableSounds || !this.config.sounds[type])
                    return

                try {
                    var audio = new Audio(this.config.sounds[type])
                    audio.volume = 0.3
                    audio.play().catch(function (error) {
                        console.warn(
                            "[IFN Notifications] Erreur lecture son:",
                            error
                        )
                    })
                } catch (error) {
                    console.warn(
                        "[IFN Notifications] Son non disponible:",
                        error
                    )
                }
            },

            /**
             * Met à jour le badge de notification
             */
            updateBadge: function () {
                var $badges = $(".ifn-notification-badge")
                var $links = $(".ifn-notifications-link")

                if (this.state.unreadCount > 0) {
                    $badges.text(this.state.unreadCount).show()
                    $links.addClass("has-notifications")
                } else {
                    $badges.hide()
                    $links.removeClass("has-notifications")
                }

                // Mettre à jour le titre de la page
                if (this.state.unreadCount > 0) {
                    document.title =
                        "(" + this.state.unreadCount + ") " + this.originalTitle
                } else {
                    document.title = this.originalTitle
                }
            },

            /**
             * Affiche le centre de notifications
             */
            showNotificationCenter: function () {
                var self = this
                var modal = this.createNotificationCenterModal()
                $("body").append(modal)

                // Afficher la modale
                modal.modal("show")

                // Charger les notifications
                this.loadNotifications(true)

                // Nettoyer lors de la fermeture
                modal.on("hidden.bs.modal", function () {
                    modal.remove()
                })
            },

            /**
             * Crée la modale du centre de notifications
             */
            createNotificationCenterModal: function () {
                var $modal = $(
                    '<div class="modal fade" id="ifn-notification-center" tabindex="-1">'
                )
                $modal.html(`
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fa fa-bell"/> Notifications
                                <span class="badge badge-primary ml-2">${this.state.unreadCount}</span>
                            </h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>×</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="ifn-notification-actions mb-3">
                                <button class="btn btn-sm btn-outline-primary" id="mark-all-read">
                                    <i class="fa fa-check-double"/> Tout marquer comme lu
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" id="refresh-notifications">
                                    <i class="fa fa-sync"/> Actualiser
                                </button>
                            </div>
                            <div class="ifn-notifications-list">
                                <div class="text-center py-4">
                                    <div class="spinner-border" role="status">
                                        <span class="sr-only">Chargement...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `)

                return $modal
            },

            /**
             * Met à jour le centre de notifications
             */
            updateNotificationCenter: function () {
                var $list = $(".ifn-notifications-list")
                if (!$list.length) return

                if (this.state.notifications.length === 0) {
                    $list.html(`
                    <div class="text-center py-4 text-muted">
                        <i class="fa fa-bell-slash fa-3x mb-3"/>
                        <p>Aucune notification</p>
                    </div>
                `)
                    return
                }

                var html = ""
                this.state.notifications.forEach(
                    function (notification) {
                        html += this.renderNotification(notification)
                    }.bind(this)
                )

                $list.html(html)
            },

            /**
             * Rend une notification
             */
            renderNotification: function (notification) {
                var isRead =
                    notification.read_by &&
                    notification.read_by.indexOf(this.getCurrentUserId()) !== -1
                var iconClass = this.getIconClassForType(
                    notification.notification_type
                )

                return `
                <div class="ifn-notification-item ${isRead ? "read" : "unread"}"
                     data-notification-id="${notification.id}">
                    <div class="notification-icon">
                        <i class="${iconClass}"/>
                    </div>
                    <div class="notification-content">
                        <h6 class="notification-title">
                            ${notification.title}
                            ${
                                notification.priority === "urgent"
                                    ? '<span class="badge badge-danger ml-2">Urgent</span>'
                                    : ""
                            }
                        </h6>
                        <div class="notification-text">
                            ${this.stripHtml(notification.message)}
                        </div>
                        <small class="notification-date">
                            <i class="fa fa-clock"/>
                            ${this.formatDate(notification.created_at)}
                        </small>
                    </div>
                    <div class="notification-actions">
                        ${
                            !isRead
                                ? `
                            <button class="btn btn-sm btn-outline-primary mark-read"
                                    data-message-id="${notification.id}">
                                <i class="fa fa-check"/>
                            </button>
                        `
                                : ""
                        }
                        ${
                            notification.action_url
                                ? `
                            <a href="${notification.action_url}" class="btn btn-sm btn-outline-primary">
                                <i class="fa fa-external-link-alt"/>
                            </a>
                        `
                                : ""
                        }
                    </div>
                </div>
            `
            },

            /**
             * Gère le clic sur une notification
             */
            handleNotificationClick: function (notificationId) {
                var notification = this.state.notifications.find(function (n) {
                    return n.id === notificationId
                })
                if (!notification) return

                // Marquer comme lue
                this.markAsRead(notificationId)

                // Exécuter l'action
                if (notification.action_url) {
                    window.location.href = notification.action_url
                } else {
                    // Fermer le centre de notifications
                    $("#ifn-notification-center").modal("hide")
                }
            },

            /**
             * Marque une notification comme lue
             */
            markAsRead: function (notificationId) {
                var self = this
                if (window.IFN && window.IFN.api) {
                    window.IFN.api("/notify/read", {
                        method: "POST",
                        body: { message_id: notificationId },
                    })
                        .then(function (response) {
                            if (response.status === "success") {
                                self.state.unreadCount =
                                    response.unread_count || 0
                                self.updateBadge()
                                self.updateNotificationCenter()
                            }
                        })
                        .catch(function (error) {
                            console.error(
                                "[IFN Notifications] Erreur marquer lu:",
                                error
                            )
                        })
                }
            },

            /**
             * Marque toutes les notifications comme lues
             */
            markAllAsRead: function () {
                var self = this
                var unreadIds = this.state.notifications
                    .filter(function (n) {
                        return (
                            !n.read_by ||
                            n.read_by.indexOf(self.getCurrentUserId()) === -1
                        )
                    })
                    .map(function (n) {
                        return n.id
                    })

                if (unreadIds.length === 0) return

                // Marquer en lot
                var promises = unreadIds.map(function (id) {
                    return self.markAsRead(id)
                })

                Promise.all(promises).then(function () {
                    self.showNotification(
                        "Notifications",
                        "Toutes marquées comme lues",
                        "success"
                    )
                })
            },

            /**
             * Démarre le polling des notifications
             */
            startPolling: function () {
                var self = this
                this.refreshTimer = setInterval(function () {
                    if (
                        !self.state.isPolling &&
                        document.visibilityState === "visible"
                    ) {
                        self.loadNotifications()
                    }
                }, this.config.refreshInterval)
            },

            /**
             * Arrête le polling
             */
            stopPolling: function () {
                if (this.refreshTimer) {
                    clearInterval(this.refreshTimer)
                    this.refreshTimer = null
                }
            },

            /**
             * Gère les messages du Service Worker
             */
            handleServiceWorkerMessage: function (event) {
                if (!event.data) return

                switch (event.data.type) {
                    case "NOTIFICATION_CLICK":
                        this.handleNotificationClick(event.data.notificationId)
                        break
                    case "NOTIFICATION_CLOSE":
                        this.markAsRead(event.data.notificationId)
                        break
                    case "NEW_NOTIFICATION":
                        this.handleNewNotification(event.data.notification)
                        break
                }
            },

            /**
             * Gère les nouvelles notifications
             */
            handleNewNotification: function (notification) {
                // Ajouter au début de la liste
                this.state.notifications.unshift(notification)
                if (
                    this.state.notifications.length >
                    this.config.maxNotifications
                ) {
                    this.state.notifications = this.state.notifications.slice(
                        0,
                        this.config.maxNotifications
                    )
                }

                // Incrémenter le compteur
                this.state.unreadCount++

                // Mettre à jour l'UI
                this.updateBadge()
                this.updateNotificationCenter()

                // Afficher notification desktop
                this.showDesktopNotification(notification)
                this.playSound(notification.notification_type)
            },

            /**
             * Utilitaires
             */
            isLoggedIn: function () {
                return (
                    window.location.pathname.includes("/web/session") ||
                    window.location.pathname.includes("/portal") ||
                    document.cookie.includes("session_id")
                )
            },

            getCurrentUserId: function () {
                // Récupérer l'ID utilisateur depuis le contexte Odoo
                if (window.odoo && window.odoo.session_info) {
                    return window.odoo.session_info.uid
                }
                return null
            },

            stripHtml: function (html) {
                var div = document.createElement("div")
                div.innerHTML = html
                return div.textContent || div.innerText || ""
            },

            formatDate: function (dateString) {
                var date = new Date(dateString)
                var now = new Date()
                var diff = now - date

                if (diff < 60000) {
                    // < 1 minute
                    return "À l'instant"
                } else if (diff < 3600000) {
                    // < 1 heure
                    return Math.floor(diff / 60000) + " min"
                } else if (diff < 86400000) {
                    // < 1 jour
                    return Math.floor(diff / 3600000) + " h"
                } else {
                    return date.toLocaleDateString("fr-FR")
                }
            },

            getIconForType: function (type) {
                var icons = {
                    info: "/ifn_portal_common/static/src/img/icons/icon-info.svg",
                    success:
                        "/ifn_portal_common/static/src/img/icons/icon-success.svg",
                    warning:
                        "/ifn_portal_common/static/src/img/icons/icon-warning.svg",
                    error: "/ifn_portal_common/static/src/img/icons/icon-error.svg",
                }
                return icons[type] || icons.info
            },

            getIconClassForType: function (type) {
                var classes = {
                    info: "fa fa-info-circle text-info",
                    success: "fa fa-check-circle text-success",
                    warning: "fa fa-exclamation-triangle text-warning",
                    error: "fa fa-exclamation-circle text-danger",
                }
                return classes[type] || classes.info
            },
        }

        // Sauvegarder le titre original
        NotificationManager.originalTitle = document.title

        // Initialisation automatique
        $(document).ready(function () {
            setTimeout(function () {
                NotificationManager.init()

                // Exposer globalement
                window.IFN_Notifications = NotificationManager

                // Exposer les fonctions utilitaires
                window.IFN.showNotification = function (
                    title,
                    message,
                    type,
                    options
                ) {
                    return NotificationManager.showNotification(
                        title,
                        message,
                        type,
                        options
                    )
                }

                window.IFN.getUnreadCount = function () {
                    return NotificationManager.state.unreadCount
                }

                window.IFN.refreshNotifications = function () {
                    return NotificationManager.loadNotifications(true)
                }
            }, 1000)
        })

        return NotificationManager
    }
)
