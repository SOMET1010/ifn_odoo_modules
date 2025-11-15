/* =============================================================================
   IFN Portal Common - PWA Registration Service
   ============================================================================= */

/**
 * Gestionnaire PWA pour IFN Portal
 */
odoo.define(
    "ifn_portal_common.pwa_register",
    ["web.core", "web.Dialog", "web.ajax"],
    function (require) {
        "use strict"

        var core = require("web.core")
        var Dialog = require("web.Dialog")
        var ajax = require("web.ajax")
        var _t = core._t

        var PWARegister = {
            // État du PWA
            isInstalled: false,
            isOnline: navigator.onLine,
            swRegistration: null,
            deferredPrompt: null,

            /**
             * Initialise le PWA
             */
            init: function () {
                console.log("[IFN PWA] Initialisation...")

                this.setupEventListeners()
                this.registerServiceWorker()
                this.checkOnlineStatus()
                this.setupInstallPrompt()
            },

            /**
             * Configure les écouteurs d'événements
             */
            setupEventListeners: function () {
                var self = this

                // Événements de connexion
                window.addEventListener("online", function () {
                    self.isOnline = true
                    self.showOnlineMessage()
                    self.syncOfflineActions()
                })

                window.addEventListener("offline", function () {
                    self.isOnline = false
                    self.showOfflineMessage()
                })

                // Événements du Service Worker
                if ("serviceWorker" in navigator) {
                    navigator.serviceWorker.addEventListener(
                        "message",
                        function (event) {
                            self.handleSWMessage(event)
                        }
                    )

                    navigator.serviceWorker.addEventListener(
                        "controllerchange",
                        function () {
                            console.log("[IFN PWA] Service Worker mis à jour")
                            window.location.reload()
                        }
                    )
                }

                // Événements de cycle de vie de la page
                document.addEventListener("visibilitychange", function () {
                    if (!document.hidden && self.swRegistration) {
                        self.checkForUpdates()
                    }
                })

                // Événements beforeunload pour sauvegarder l'état
                window.addEventListener("beforeunload", function () {
                    self.saveState()
                })
            },

            /**
             * Enregistre le Service Worker
             */
            registerServiceWorker: function () {
                if (!("serviceWorker" in navigator)) {
                    console.warn("[IFN PWA] Service Worker non supporté")
                    return
                }

                var self = this
                navigator.serviceWorker
                    .register("/ifn/sw.js", {
                        scope: "/",
                    })
                    .then(function (registration) {
                        console.log(
                            "[IFN PWA] Service Worker enregistré:",
                            registration
                        )
                        self.swRegistration = registration
                        self.isInstalled = true

                        // Vérifier les mises à jour
                        self.checkForUpdates()

                        // Notifier l'utilisateur si une mise à jour est disponible
                        registration.addEventListener(
                            "updatefound",
                            function () {
                                const newWorker = registration.installing
                                console.log(
                                    "[IFN PWA] Nouveau Service Worker trouvé"
                                )

                                newWorker.addEventListener(
                                    "statechange",
                                    function () {
                                        if (
                                            newWorker.state === "installed" &&
                                            navigator.serviceWorker.controller
                                        ) {
                                            self.showUpdateAvailable()
                                        }
                                    }
                                )
                            }
                        )
                    })
                    .catch(function (error) {
                        console.error(
                            "[IFN PWA] Erreur enregistrement Service Worker:",
                            error
                        )
                        self.showRegistrationError(error)
                    })
            },

            /**
             * Configure l'invite d'installation A2HS (Add to Home Screen)
             */
            setupInstallPrompt: function () {
                var self = this

                window.addEventListener("beforeinstallprompt", function (e) {
                    // Empêcher l'invite automatique
                    e.preventDefault()
                    self.deferredPrompt = e
                    self.showInstallBanner()
                })

                window.addEventListener("appinstalled", function () {
                    console.log("[IFN PWA] Application installée avec succès")
                    self.isInstalled = true
                    self.showInstallSuccess()
                    self.deferredPrompt = null
                })
            },

            /**
             * Affiche la bannière d'installation
             */
            showInstallBanner: function () {
                var self = this
                var banner = this.createInstallBanner()
                document.body.appendChild(banner)

                // Animation d'entrée
                setTimeout(function () {
                    banner.classList.add("ifn-install-banner--show")
                }, 100)

                // Fermeture automatique après 10 secondes
                setTimeout(function () {
                    if (banner.parentNode) {
                        self.hideInstallBanner(banner)
                    }
                }, 10000)
            },

            /**
             * Crée la bannière d'installation
             */
            createInstallBanner: function () {
                var self = this
                var banner = document.createElement("div")
                banner.className = "ifn-install-banner"
                banner.innerHTML = `
                <div class="ifn-install-banner__content">
                    <div class="ifn-install-banner__icon">
                        <i class="fa fa-download"></i>
                    </div>
                    <div class="ifn-install-banner__text">
                        <strong>Installez l'application IFN</strong><br>
                        <small>Accédez rapidement à votre espace</small>
                    </div>
                    <div class="ifn-install-banner__actions">
                        <button class="btn btn-sm btn-primary ifn-install-btn">
                            Installer
                        </button>
                        <button class="btn btn-sm btn-outline-secondary ifn-install-dismiss">
                            Plus tard
                        </button>
                    </div>
                </div>
            `

                // Événements
                banner
                    .querySelector(".ifn-install-btn")
                    .addEventListener("click", function () {
                        self.installApp()
                        self.hideInstallBanner(banner)
                    })

                banner
                    .querySelector(".ifn-install-dismiss")
                    .addEventListener("click", function () {
                        self.hideInstallBanner(banner)
                    })

                return banner
            },

            /**
             * Cache la bannière d'installation
             */
            hideInstallBanner: function (banner) {
                banner.classList.remove("ifn-install-banner--show")
                setTimeout(function () {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner)
                    }
                }, 300)
            },

            /**
             * Installe l'application PWA
             */
            installApp: function () {
                if (!this.deferredPrompt) {
                    console.warn(
                        "[IFN PWA] Pas d'invite d'installation disponible"
                    )
                    return
                }

                this.deferredPrompt.prompt()
                var self = this

                this.deferredPrompt.userChoice.then(function (choiceResult) {
                    console.log(
                        "[IFN PWA] Choix installation:",
                        choiceResult.outcome
                    )
                    self.deferredPrompt = null

                    if (choiceResult.outcome === "accepted") {
                        console.log("[IFN PWA] Installation acceptée")
                    } else {
                        console.log("[IFN PWA] Installation refusée")
                    }
                })
            },

            /**
             * Vérifie les mises à jour du Service Worker
             */
            checkForUpdates: function () {
                if (!this.swRegistration) return

                var self = this
                this.swRegistration
                    .update()
                    .then(function () {
                        console.log(
                            "[IFN PWA] Vérification des mises à jour terminée"
                        )
                    })
                    .catch(function (error) {
                        console.error(
                            "[IFN PWA] Erreur vérification mises à jour:",
                            error
                        )
                    })
            },

            /**
             * Affiche la notification de mise à jour disponible
             */
            showUpdateAvailable: function () {
                var self = this
                Dialog.confirm(
                    this,
                    _t(
                        "Une nouvelle version de l'application est disponible. Voulez-vous mettre à jour maintenant ?"
                    ),
                    {
                        confirm_callback: function () {
                            self.updateApp()
                        },
                        title: _t("Mise à jour disponible"),
                    }
                )
            },

            /**
             * Met à jour l'application
             */
            updateApp: function () {
                if (this.swRegistration && this.swRegistration.waiting) {
                    this.swRegistration.waiting.postMessage({
                        type: "SKIP_WAITING",
                    })
                }
            },

            /**
             * Vérifie le statut de connexion
             */
            checkOnlineStatus: function () {
                this.isOnline = navigator.onLine
                this.updateConnectionStatus()
            },

            /**
             * Met à jour l'indicateur de connexion
             */
            updateConnectionStatus: function () {
                var offlineBanner =
                    document.getElementById("ifn-offline-banner")
                if (!offlineBanner) return

                if (this.isOnline) {
                    offlineBanner.classList.add("d-none")
                } else {
                    offlineBanner.classList.remove("d-none")
                }
            },

            /**
             * Affiche le message hors ligne
             */
            showOfflineMessage: function () {
                console.log("[IFN PWA] Mode hors ligne")
                this.updateConnectionStatus()

                // Afficher un toast
                if (window.IFN && window.IFN.showToast) {
                    window.IFN.showToast(
                        "Vous êtes hors ligne. Les actions seront synchronisées automatiquement.",
                        "warning",
                        "Hors ligne"
                    )
                }
            },

            /**
             * Affiche le message en ligne
             */
            showOnlineMessage: function () {
                console.log("[IFN PWA] Mode en ligne")
                this.updateConnectionStatus()

                // Afficher un toast
                if (window.IFN && window.IFN.showToast) {
                    window.IFN.showToast(
                        "Connexion rétablie. Synchronisation des actions en cours...",
                        "success",
                        "En ligne"
                    )
                }
            },

            /**
             * Synchronise les actions hors ligne
             */
            syncOfflineActions: function () {
                if (window.IFN && window.IFN.replayQueue) {
                    window.IFN.replayQueue()
                }
            },

            /**
             * Gère les messages du Service Worker
             */
            handleSWMessage: function (event) {
                if (!event.data) return

                switch (event.data.type) {
                    case "CACHE_UPDATED":
                        console.log("[IFN PWA] Cache mis à jour")
                        this.showUpdateAvailable()
                        break

                    case "OFFLINE_QUEUE_READY":
                        console.log("[IFN PWA] File d'attente hors ligne prête")
                        break

                    default:
                        console.log("[IFN PWA] Message SW:", event.data)
                }
            },

            /**
             * Affiche l'erreur d'enregistrement
             */
            showRegistrationError: function (error) {
                console.error("[IFN PWA] Erreur:", error)

                // Afficher un toast d'erreur uniquement en mode développement
                if (
                    window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1"
                ) {
                    if (window.IFN && window.IFN.showToast) {
                        window.IFN.showToast(
                            "Erreur d'enregistrement du Service Worker: " +
                                error.message,
                            "error",
                            "Erreur PWA"
                        )
                    }
                }
            },

            /**
             * Affiche le succès d'installation
             */
            showInstallSuccess: function () {
                if (window.IFN && window.IFN.showToast) {
                    window.IFN.showToast(
                        "Application IFN installée avec succès !",
                        "success",
                        "Installation réussie"
                    )
                }
            },

            /**
             * Sauvegarde l'état avant de quitter
             */
            saveState: function () {
                try {
                    localStorage.setItem(
                        "ifn_pwa_last_visit",
                        new Date().toISOString()
                    )
                    localStorage.setItem("ifn_pwa_installed", this.isInstalled)
                } catch (error) {
                    console.warn("[IFN PWA] Erreur sauvegarde état:", error)
                }
            },

            /**
             * Restaure l'état
             */
            restoreState: function () {
                try {
                    var lastVisit = localStorage.getItem("ifn_pwa_last_visit")
                    var wasInstalled =
                        localStorage.getItem("ifn_pwa_installed") === "true"

                    if (lastVisit) {
                        console.log(
                            "[IFN PWA] Dernière visite:",
                            new Date(lastVisit)
                        )
                    }

                    if (wasInstalled && !this.isInstalled) {
                        console.log(
                            "[IFN PWA] Installation précédente détectée"
                        )
                    }
                } catch (error) {
                    console.warn("[IFN PWA] Erreur restauration état:", error)
                }
            },

            /**
             * Renvoie les informations PWA
             */
            getInfo: function () {
                return {
                    isInstalled: this.isInstalled,
                    isOnline: this.isOnline,
                    hasServiceWorker: !!this.swRegistration,
                    canInstall: !!this.deferredPrompt,
                    isStandalone:
                        window.matchMedia("(display-mode: standalone)")
                            .matches || window.navigator.standalone === true,
                }
            },
        }

        // Styles CSS pour la bannière d'installation
        var installBannerStyles = `
        .ifn-install-banner {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, var(--ifn-orange) 0%, var(--ifn-green) 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
        }

        .ifn-install-banner.ifn-install-banner--show {
            transform: translateY(0);
            opacity: 1;
        }

        .ifn-install-banner__content {
            display: flex;
            align-items: center;
            padding: 16px;
        }

        .ifn-install-banner__icon {
            margin-right: 12px;
            font-size: 24px;
        }

        .ifn-install-banner__text {
            flex: 1;
        }

        .ifn-install-banner__text strong {
            display: block;
            margin-bottom: 2px;
        }

        .ifn-install-banner__actions {
            display: flex;
            gap: 8px;
            margin-left: 12px;
        }

        .ifn-install-banner .btn {
            min-width: auto;
            font-size: 14px;
            padding: 6px 12px;
        }

        @media (max-width: 576px) {
            .ifn-install-banner {
                bottom: 10px;
                left: 10px;
                right: 10px;
            }

            .ifn-install-banner__content {
                flex-direction: column;
                text-align: center;
                padding: 16px;
            }

            .ifn-install-banner__icon {
                margin-right: 0;
                margin-bottom: 8px;
            }

            .ifn-install-banner__actions {
                margin-left: 0;
                margin-top: 12px;
                width: 100%;
                justify-content: center;
            }
        }
    `

        // Injection des styles
        if (document.head) {
            var style = document.createElement("style")
            style.textContent = installBannerStyles
            document.head.appendChild(style)
        }

        // Initialisation au chargement du document
        $(document).ready(function () {
            // Attendre que le SDK soit chargé
            setTimeout(function () {
                PWARegister.init()
                PWARegister.restoreState()
            }, 1000)
        })

        // Exposition pour le SDK IFN
        window.IFN_PWA = PWARegister

        return PWARegister
    }
)
