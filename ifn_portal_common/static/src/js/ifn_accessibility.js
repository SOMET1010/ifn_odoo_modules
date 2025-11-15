/* =============================================================================
   IFN Portal Common - Gestionnaire d'accessibilité
   Fonctionnalités WCAG 2.1 AA : contraste, tailles, pictogrammes
   ============================================================================= */

/**
 * Gestionnaire d'accessibilité IFN
 * Prend en charge le contraste élevé, les tailles de police,
   les pictogrammes et l'assistance vocale
 */
odoo.define(
    "ifn_portal_common.ifn_accessibility",
    ["web.core", "web.ajax"],
    function (require) {
        "use strict"

        var core = require("web.core")
        var ajax = require("web.ajax")
        var _t = core._t

        var AccessibilityManager = {
            // Configuration
            config: {
                fontSizes: {
                    normal: { base: 16, scale: 1.0 },
                    large: { base: 18, scale: 1.125 },
                    "extra-large": { base: 20, scale: 1.25 },
                    xxlarge: { base: 24, scale: 1.5 },
                },
                contrastModes: {
                    normal: { name: "Normal", class: "" },
                    high: { name: "Élevé", class: "high-contrast" },
                    "extra-high": {
                        name: "Très élevé",
                        class: "extra-high-contrast",
                    },
                },
                skipLinks: [
                    {
                        href: "#main-content",
                        text: "Aller au contenu principal",
                    },
                    { href: "#navigation", text: "Aller à la navigation" },
                    { href: "#search", text: "Aller à la recherche" },
                ],
            },

            // État actuel
            state: {
                fontSize: "normal",
                contrastMode: "normal",
                voiceEnabled: false,
                reducedMotion: false,
                screenReader: false,
                keyboardNav: false,
                preferences: {},
            },

            /**
             * Initialise le gestionnaire d'accessibilité
             */
            init: function () {
                console.log("[IFN Accessibility] Initialisation...")

                this.detectUserPreferences()
                this.loadSavedPreferences()
                this.initEventListeners()
                this.initSkipLinks()
                this.applyPreferences()
                this.setupKeyboardNavigation()
                this.initVoiceAssistant()

                console.log("[IFN Accessibility] Initialisé avec succès")
            },

            /**
             * Détecte les préférences système du navigateur
             */
            detectUserPreferences: function () {
                // Mouvement réduit
                if (
                    window.matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                ) {
                    this.state.reducedMotion = true
                    document.body.classList.add("reduced-motion")
                }

                // Contraste élevé
                if (window.matchMedia("(prefers-contrast: high)").matches) {
                    this.state.contrastMode = "high"
                }

                // Mode sombre
                if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                    document.body.classList.add("dark-mode")
                }

                // Détecter les lecteurs d'écran (heuristique)
                this.detectScreenReader()
            },

            /**
             * Détecte si un lecteur d'écran est actif
             */
            detectScreenReader: function () {
                var self = this
                var testElement = document.createElement("div")
                testElement.setAttribute("aria-live", "polite")
                testElement.setAttribute("aria-atomic", "true")
                testElement.style.position = "absolute"
                testElement.style.left = "-10000px"
                testElement.textContent = "screen reader test"
                document.body.appendChild(testElement)

                setTimeout(function () {
                    if (testElement.offsetHeight === 0) {
                        self.state.screenReader = true
                        document.body.classList.add("screen-reader-active")
                    }
                    document.body.removeChild(testElement)
                }, 100)
            },

            /**
             * Charge les préférences sauvegardées
             */
            loadSavedPreferences: function () {
                try {
                    var saved = localStorage.getItem("ifn_accessibility_prefs")
                    if (saved) {
                        this.state.preferences = JSON.parse(saved)
                        this.state.fontSize =
                            this.state.preferences.fontSize || "normal"
                        this.state.contrastMode =
                            this.state.preferences.contrastMode || "normal"
                        this.state.voiceEnabled =
                            this.state.preferences.voiceEnabled || false
                    }
                } catch (e) {
                    console.warn(
                        "[IFN Accessibility] Erreur chargement préférences:",
                        e
                    )
                }
            },

            /**
             * Initialise les écouteurs d'événements
             */
            initEventListeners: function () {
                var self = this

                // Contrôle du contraste
                $(document).on("click", ".ifn-contrast-toggle", function () {
                    self.toggleContrast()
                })

                // Contrôle de la taille de police
                $(document).on("click", ".ifn-font-size-toggle", function () {
                    self.cycleFontSize()
                })

                // Contrôles des paramètres
                $(document).on("change", "#high-contrast", function () {
                    var enabled = $(this).is(":checked")
                    self.setContrastMode(enabled ? "high" : "normal")
                })

                $(document).on("change", "#font-size", function () {
                    var size = $(this).val()
                    self.setFontSize(size)
                })

                $(document).on("change", "#voice-enabled", function () {
                    var enabled = $(this).is(":checked")
                    self.setVoiceEnabled(enabled)
                })

                // Raccourcis clavier
                $(document).on("keydown", function (e) {
                    self.handleKeyboardShortcuts(e)
                })

                // Suivi du focus pour la navigation au clavier
                $(document).on(
                    "focus",
                    "a, button, input, select, textarea, [tabindex]",
                    function () {
                        self.state.keyboardNav = true
                        document.body.classList.add("keyboard-nav")
                    }
                )

                $(document).on("mousedown", function () {
                    self.state.keyboardNav = false
                    document.body.classList.remove("keyboard-nav")
                })

                // Écouter les changements de préférences depuis le SDK
                $(window).on(
                    "ifn:preferences_changed",
                    function (event, prefs) {
                        self.updatePreferences(prefs)
                    }
                )
            },

            /**
             * Initialise les liens d'évitement (skip links)
             */
            initSkipLinks: function () {
                var self = this
                var skipLinksContainer = $('<div class="skip-links"></div>')

                this.config.skipLinks.forEach(function (link) {
                    var skipLink = $("<a>")
                        .attr("href", link.href)
                        .text(link.text)
                        .addClass("skip-link")
                        .appendTo(skipLinksContainer)
                })

                $("body").prepend(skipLinksContainer)
            },

            /**
             * Configure la navigation au clavier
             */
            setupKeyboardNavigation: function () {
                var self = this

                // Gérer les pièges à focus (focus traps) pour les modales
                $(document).on("keydown", ".modal", function (e) {
                    if (e.key === "Tab") {
                        self.handleModalTabKey(e)
                    }
                })

                // Améliorer la visibilité du focus
                document.addEventListener("focusin", function (e) {
                    if (self.state.keyboardNav) {
                        self.highlightFocusedElement(e.target)
                    }
                })
            },

            /**
             * Initialise l'assistant vocal
             */
            initVoiceAssistant: function () {
                if ("speechSynthesis" in window) {
                    window.IFN_Voice = {
                        speak: this.speak.bind(this),
                        stop: this.stopSpeaking.bind(this),
                        isSpeaking: this.isSpeaking.bind(this),
                    }
                }
            },

            /**
             * Applique les préférences actuelles
             */
            applyPreferences: function () {
                this.setFontSize(this.state.fontSize)
                this.setContrastMode(this.state.contrastMode)
                this.setVoiceEnabled(this.state.voiceEnabled)
            },

            /**
             * Bascule le mode contraste
             */
            toggleContrast: function () {
                var modes = Object.keys(this.config.contrastModes)
                var currentIndex = modes.indexOf(this.state.contrastMode)
                var nextIndex = (currentIndex + 1) % modes.length
                var nextMode = modes[nextIndex]

                this.setContrastMode(nextMode)
            },

            /**
             * Définit le mode de contraste
             */
            setContrastMode: function (mode) {
                if (!this.config.contrastModes[mode]) return

                // Supprimer toutes les classes de contraste
                Object.values(this.config.contrastModes).forEach(function (
                    config
                ) {
                    if (config.class) {
                        document.body.classList.remove(config.class)
                    }
                })

                // Ajouter la nouvelle classe
                var modeConfig = this.config.contrastModes[mode]
                if (modeConfig.class) {
                    document.body.classList.add(modeConfig.class)
                }

                this.state.contrastMode = mode
                this.state.preferences.contrastMode = mode
                this.savePreferences()

                // Mettre à jour l'UI
                this.updateContrastUI(mode)

                // Annoncer le changement
                this.announceChange("Mode de contraste : " + modeConfig.name)

                // Émettre un événement
                $(window).trigger("ifn:contrast_changed", [mode])
            },

            /**
             * Fait défiler les tailles de police
             */
            cycleFontSize: function () {
                var sizes = Object.keys(this.config.fontSizes)
                var currentIndex = sizes.indexOf(this.state.fontSize)
                var nextIndex = (currentIndex + 1) % sizes.length
                var nextSize = sizes[nextIndex]

                this.setFontSize(nextSize)
            },

            /**
             * Définit la taille de police
             */
            setFontSize: function (size) {
                if (!this.config.fontSizes[size]) return

                // Supprimer toutes les classes de taille
                Object.keys(this.config.fontSizes).forEach(function (sizeKey) {
                    document.body.classList.remove("font-size-" + sizeKey)
                })

                // Ajouter la nouvelle classe
                document.body.classList.add("font-size-" + size)

                // Mettre à jour la taille de base
                var sizeConfig = this.config.fontSizes[size]
                document.documentElement.style.setProperty(
                    "--ifn-font-size-base",
                    sizeConfig.base + "px"
                )

                this.state.fontSize = size
                this.state.preferences.fontSize = size
                this.savePreferences()

                // Mettre à jour l'UI
                this.updateFontSizeUI(size)

                // Annoncer le changement
                var sizeNames = {
                    normal: "Normal",
                    large: "Grand",
                    "extra-large": "Très grand",
                    xxlarge: "Extra grand",
                }
                this.announceChange("Taille de police : " + sizeNames[size])

                // Émettre un événement
                $(window).trigger("ifn:font_size_changed", [size])
            },

            /**
             * Active/désactive l'assistance vocale
             */
            setVoiceEnabled: function (enabled) {
                this.state.voiceEnabled = enabled
                this.state.preferences.voiceEnabled = enabled
                this.savePreferences()

                // Mettre à jour l'UI
                this.updateVoiceUI(enabled)

                // Annoncer le changement
                if (enabled) {
                    this.announceChange("Assistance vocale activée")
                    this.speak("Assistance vocale activée")
                } else {
                    this.stopSpeaking()
                    this.announceChange("Assistance vocale désactivée")
                }

                // Émettre un événement
                $(window).trigger("ifn:voice_changed", [enabled])
            },

            /**
             * Lit un texte à voix haute
             */
            speak: function (text, options) {
                if (!this.state.voiceEnabled || !window.speechSynthesis) return

                options = options || {}
                var utterance = new SpeechSynthesisUtterance(text)

                // Configuration
                utterance.lang = options.lang || "fr-FR"
                utterance.rate = options.rate || 1
                utterance.pitch = options.pitch || 1
                utterance.volume = options.volume || 1

                // Utiliser une voix française si disponible
                var voices = speechSynthesis.getVoices()
                var frenchVoice = voices.find(function (voice) {
                    return voice.lang.startsWith("fr")
                })
                if (frenchVoice) {
                    utterance.voice = frenchVoice
                }

                window.speechSynthesis.speak(utterance)
            },

            /**
             * Arrête la lecture vocale
             */
            stopSpeaking: function () {
                if (window.speechSynthesis) {
                    window.speechSynthesis.cancel()
                }
            },

            /**
             * Vérifie si une lecture est en cours
             */
            isSpeaking: function () {
                return window.speechSynthesis && window.speechSynthesis.speaking
            },

            /**
             * Annonce un changement aux lecteurs d'écran
             */
            announceChange: function (message) {
                var announcement = $("<div>")
                    .attr("aria-live", "polite")
                    .attr("aria-atomic", "true")
                    .addClass("sr-only")
                    .text(message)

                $("body").append(announcement)

                setTimeout(function () {
                    announcement.remove()
                }, 1000)
            },

            /**
             * Gère les raccourcis clavier
             */
            handleKeyboardShortcuts: function (e) {
                // Alt + C : Basculer le contraste
                if (e.altKey && e.key === "c") {
                    e.preventDefault()
                    this.toggleContrast()
                }

                // Alt + F : Changer la taille de police
                if (e.altKey && e.key === "f") {
                    e.preventDefault()
                    this.cycleFontSize()
                }

                // Alt + V : Activer/désactiver la voix
                if (e.altKey && e.key === "v") {
                    e.preventDefault()
                    this.setVoiceEnabled(!this.state.voiceEnabled)
                }

                // Alt + S : Lire le contenu actuel
                if (e.altKey && e.key === "s") {
                    e.preventDefault()
                    this.readCurrentContent()
                }

                // Échap : Arrêter la lecture vocale
                if (e.key === "Escape") {
                    this.stopSpeaking()
                }
            },

            /**
             * Lit le contenu actuel de la page
             */
            readCurrentContent: function () {
                if (!this.state.voiceEnabled) return

                var title = $("title").text()
                var mainContent = $("main, #main-content, .ifn-main")
                    .first()
                    .text()
                var text = title + ". " + mainContent

                this.speak(text)
            },

            /**
             * Gère la touche Tab dans les modales
             */
            handleModalTabKey: function (e) {
                var $modal = $(e.currentTarget)
                var $focusableElements = $modal.find(
                    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
                var $firstElement = $focusableElements.first()
                var $lastElement = $focusableElements.last()

                if (e.shiftKey) {
                    if ($(e.target).is($firstElement)) {
                        e.preventDefault()
                        $lastElement.focus()
                    }
                } else {
                    if ($(e.target).is($lastElement)) {
                        e.preventDefault()
                        $firstElement.focus()
                    }
                }
            },

            /**
             * Met en évidence l'élément focusé
             */
            highlightFocusedElement: function (element) {
                // Supprimer les précédentes mises en évidence
                $(".focus-highlighted").removeClass("focus-highlighted")

                // Ajouter la classe à l'élément actuel
                $(element).addClass("focus-highlighted")
            },

            /**
             * Met à jour l'UI du contraste
             */
            updateContrastUI: function (mode) {
                var modeConfig = this.config.contrastModes[mode]

                $(".ifn-contrast-toggle").removeClass("active")
                $(
                    '.ifn-contrast-toggle[data-contrast="' + mode + '"]'
                ).addClass("active")

                $("#high-contrast").prop("checked", mode === "high")
            },

            /**
             * Met à jour l'UI de la taille de police
             */
            updateFontSizeUI: function (size) {
                $("#font-size").val(size)
                $(".ifn-font-size-toggle").removeClass("active")
                $('.ifn-font-size-toggle[data-size="' + size + '"]').addClass(
                    "active"
                )
            },

            /**
             * Met à jour l'UI de l'assistance vocale
             */
            updateVoiceUI: function (enabled) {
                $("#voice-enabled").prop("checked", enabled)
                $(".ifn-voice-toggle").toggleClass("active", enabled)
            },

            /**
             * Met à jour les préférences
             */
            updatePreferences: function (prefs) {
                if (prefs.high_contrast !== undefined) {
                    this.setContrastMode(
                        prefs.high_contrast ? "high" : "normal"
                    )
                }
                if (prefs.font_size) {
                    this.setFontSize(prefs.font_size)
                }
                if (prefs.voice_enabled !== undefined) {
                    this.setVoiceEnabled(prefs.voice_enabled)
                }
            },

            /**
             * Sauvegarde les préférences
             */
            savePreferences: function () {
                try {
                    localStorage.setItem(
                        "ifn_accessibility_prefs",
                        JSON.stringify(this.state.preferences)
                    )
                } catch (e) {
                    console.warn(
                        "[IFN Accessibility] Erreur sauvegarde préférences:",
                        e
                    )
                }
            },

            /**
             * Réinitialise toutes les préférences
             */
            resetPreferences: function () {
                this.state.fontSize = "normal"
                this.state.contrastMode = "normal"
                this.state.voiceEnabled = false
                this.state.preferences = {}

                // Supprimer les classes
                document.body.className = document.body.className.replace(
                    /\b(font-size|high|extra-high)-contrast\b/g,
                    ""
                )

                // Sauvegarder
                this.savePreferences()

                // Appliquer
                this.applyPreferences()

                // Annoncer
                this.announceChange(
                    "Préférences d'accessibilité réinitialisées"
                )
            },

            /**
             * Génère un rapport d'accessibilité
             */
            generateAccessibilityReport: function () {
                var report = {
                    timestamp: new Date().toISOString(),
                    settings: {
                        fontSize: this.state.fontSize,
                        contrastMode: this.state.contrastMode,
                        voiceEnabled: this.state.voiceEnabled,
                    },
                    system: {
                        reducedMotion: this.state.reducedMotion,
                        screenReader: this.state.screenReader,
                        keyboardNav: this.state.keyboardNav,
                    },
                    recommendations: this.generateRecommendations(),
                }

                return report
            },

            /**
             * Génère des recommandations d'accessibilité
             */
            generateRecommendations: function () {
                var recommendations = []

                if (this.state.contrastMode === "normal") {
                    recommendations.push({
                        type: "contrast",
                        message:
                            "Activez le mode contraste élevé pour une meilleure lisibilité",
                        action: "toggleContrast",
                    })
                }

                if (this.state.fontSize === "normal") {
                    recommendations.push({
                        type: "fontSize",
                        message:
                            "Augmentez la taille de police pour une meilleure lecture",
                        action: "increaseFontSize",
                    })
                }

                if (!this.state.voiceEnabled && "speechSynthesis" in window) {
                    recommendations.push({
                        type: "voice",
                        message:
                            "Activez l'assistance vocale pour une meilleure accessibilité",
                        action: "enableVoice",
                    })
                }

                return recommendations
            },

            /**
             * Valide l'accessibilité d'un élément
             */
            validateElement: function (element) {
                var $element = $(element)
                var issues = []

                // Vérifier les attributs alt sur les images
                if ($element.is("img") && !$element.attr("alt")) {
                    issues.push({
                        type: "missing-alt",
                        message: "Attribut alt manquant sur l'image",
                        severity: "error",
                    })
                }

                // Vérifier les labels sur les inputs
                if (
                    $element.is("input, select, textarea") &&
                    !$element.attr("aria-label") &&
                    !$element.attr("aria-labelledby")
                ) {
                    var id = $element.attr("id")
                    var hasLabel = id && $('label[for="' + id + '"]').length > 0
                    if (!hasLabel) {
                        issues.push({
                            type: "missing-label",
                            message:
                                "Label manquant pour le champ de formulaire",
                            severity: "warning",
                        })
                    }
                }

                // Vérifier le contraste des couleurs (simplifié)
                if ($element.css("color")) {
                    // Ici on pourrait ajouter une vérification de contraste réelle
                }

                return issues
            },

            /**
             * Améliore un élément pour l'accessibilité
             */
            enhanceElement: function (element, options) {
                options = options || {}
                var $element = $(element)

                // Ajouter des attributs ARIA si manquants
                if (options.role && !$element.attr("role")) {
                    $element.attr("role", options.role)
                }

                if (options.label && !$element.attr("aria-label")) {
                    $element.attr("aria-label", options.label)
                }

                if (options.describedby && !$element.attr("aria-describedby")) {
                    $element.attr("aria-describedby", options.describedby)
                }

                // Ajouter des états ARIA
                if (options.expanded !== undefined) {
                    $element.attr("aria-expanded", options.expanded)
                }

                if (options.selected !== undefined) {
                    $element.attr("aria-selected", options.selected)
                }

                return $element
            },
        }

        // Initialisation automatique
        $(document).ready(function () {
            // Attendre que les autres modules soient chargés
            setTimeout(function () {
                AccessibilityManager.init()

                // Exposer globalement
                window.IFN_Accessibility = AccessibilityManager

                // Exposer les fonctions utilitaires
                window.IFN.toggleContrast = function () {
                    return AccessibilityManager.toggleContrast()
                }

                window.IFN.cycleFontSize = function () {
                    return AccessibilityManager.cycleFontSize()
                }

                window.IFN.speak = function (text, options) {
                    return AccessibilityManager.speak(text, options)
                }

                window.IFN.stopSpeaking = function () {
                    return AccessibilityManager.stopSpeaking()
                }

                window.IFN.validateAccessibility = function (element) {
                    return AccessibilityManager.validateElement(element)
                }

                window.IFN.enhanceAccessibility = function (element, options) {
                    return AccessibilityManager.enhanceElement(element, options)
                }
            }, 500)
        })

        return AccessibilityManager
    }
)
