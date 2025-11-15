/* =============================================================================
   IFN Portal Common - Sélecteur de langue
   Gestion multilingue (FR, Baoulé, Dioula)
   ============================================================================= */

/**
 * Gestionnaire du sélecteur de langue IFN
 * Prend en charge le français, le baoulé et le dioula
 */
odoo.define(
    "ifn_portal_common.ifn_language_selector",
    ["web.core", "web.ajax"],
    function (require) {
        "use strict"

        var core = require("web.core")
        var ajax = require("web.ajax")
        var _t = core._t

        var LanguageSelector = {
            // Langues supportées
            languages: {
                fr_FR: {
                    code: "fr_FR",
                    name: "Français",
                    flag: "🇫🇷",
                    rtl: false,
                    displayName: "FR",
                },
                ba_BA: {
                    code: "ba_BA",
                    name: "Baoulé",
                    flag: "🇨🇮",
                    rtl: false,
                    displayName: "BA",
                },
                di_DJ: {
                    code: "di_DJ",
                    name: "Dioula",
                    flag: "🇨🇮",
                    rtl: false,
                    displayName: "DI",
                },
            },

            // État actuel
            currentLanguage: "fr_FR",
            defaultLanguage: "fr_FR",
            isRTL: false,

            // Traductions
            translations: {},

            /**
             * Initialise le sélecteur de langue
             */
            init: function () {
                console.log(
                    "[IFN Language] Initialisation sélecteur de langue..."
                )

                this.loadCurrentLanguage()
                this.loadTranslations()
                this.initEventListeners()
                this.updateUI()

                console.log("[IFN Language] Sélecteur initialisé")
            },

            /**
             * Charge la langue actuelle
             */
            loadCurrentLanguage: function () {
                // Essayer de récupérer depuis les préférences utilisateur
                var savedLang = localStorage.getItem("ifn_language")
                if (savedLang && this.languages[savedLang]) {
                    this.currentLanguage = savedLang
                } else {
                    // Langue du navigateur
                    var browserLang =
                        navigator.language || navigator.userLanguage
                    this.currentLanguage =
                        this.detectLanguageFromBrowser(browserLang)
                }

                // Appliquer la langue au document
                this.applyLanguage(this.currentLanguage)
            },

            /**
             * Détecte la langue depuis le navigateur
             */
            detectLanguageFromBrowser: function (browserLang) {
                var lang = browserLang.toLowerCase()

                if (lang.startsWith("fr")) {
                    return "fr_FR"
                } else if (lang.includes("ba") || lang.includes("ci")) {
                    return "ba_BA"
                } else if (lang.includes("dy") || lang.includes("di")) {
                    return "di_DJ"
                }

                return this.defaultLanguage
            },

            /**
             * Charge les traductions
             */
            loadTranslations: function () {
                var self = this

                // Traductions de base pour les éléments d'interface
                this.translations = {
                    fr_FR: {
                        language: "Langue",
                        french: "Français",
                        baoule: "Baoulé",
                        dioula: "Dioula",
                        settings: "Paramètres",
                        notifications: "Notifications",
                        documents: "Documents",
                        home: "Accueil",
                        logout: "Déconnexion",
                        profile: "Profil",
                        save: "Enregistrer",
                        cancel: "Annuler",
                        close: "Fermer",
                        loading: "Chargement...",
                        error: "Erreur",
                        success: "Succès",
                        warning: "Avertissement",
                        info: "Information",
                        offline: "Hors ligne",
                        online: "En ligne",
                        syncing: "Synchronisation...",
                        retry: "Réessayer",
                        yes: "Oui",
                        no: "Non",
                        ok: "OK",
                        search: "Rechercher",
                        filter: "Filtrer",
                        sort: "Trier",
                        export: "Exporter",
                        import: "Importer",
                        add: "Ajouter",
                        edit: "Modifier",
                        delete: "Supprimer",
                        view: "Voir",
                        download: "Télécharger",
                        upload: "Téléverser",
                        send: "Envoyer",
                        receive: "Recevoir",
                        confirm: "Confirmer",
                        validate: "Valider",
                        next: "Suivant",
                        previous: "Précédent",
                        first: "Premier",
                        last: "Dernier",
                        page: "Page",
                        of: "sur",
                        total: "Total",
                        items: "éléments",
                        selected: "sélectionné(s)",
                        no_data: "Aucune donnée",
                        no_results: "Aucun résultat",
                        select_language: "Choisir la langue",
                        language_changed: "Langue changée avec succès",
                        high_contrast: "Contraste élevé",
                        font_size: "Taille de police",
                        normal_size: "Normal",
                        large_size: "Grand",
                        xlarge_size: "Très grand",
                        accessibility: "Accessibilité",
                        voice_enabled: "Assistance vocale",
                    },
                    ba_BA: {
                        language: "Klɛ",
                        french: "Faransɛ",
                        baoule: "Baoulé",
                        dioula: "Julakan",
                        settings: "Anladɛn",
                        notifications: "Kɛlɛkɛlɛ",
                        documents: "Kras",
                        home: "Sɔrɔ",
                        logout: "Fɔl�",
                        profile: "Lakita",
                        save: "San",
                        cancel: "Kan",
                        close: "Fɛn",
                        loading: "Ka ladamu...",
                        error: "Mɛrɛ",
                        success: "Sɔrɔ",
                        warning: "Jɛya",
                        info: "Sɛbɛnni",
                        offline: "Sira tɛ sɔrɔ",
                        online: "Sira bɛ sɔrɔ",
                        syncing: "Ka sɛgɛsɛgɛ...",
                        retry: "San sɔrɔ",
                        yes: "Ayyo",
                        no: "Ayiti",
                        ok: "Ayyo",
                        search: "Hɛrɛ",
                        filter: "Fɔlɔ",
                        sort: "Jɛ",
                        export: "Ka bɔ",
                        import: "Ka sin",
                        add: "Ka ɲɛsin",
                        edit: "Ka baga",
                        delete: "Ka baga",
                        view: "Ka lɛɛ",
                        download: "Ka wale",
                        upload: "ka san",
                        send: "Ka taa",
                        receive: "Ka sɔrɔ",
                        confirm: "Ka ɲini",
                        validate: "Ka sɔrɔ",
                        next: "Sini",
                        previous: "Tɔw",
                        first: "Kɔrɔ",
                        last: "Laban",
                        page: "Ɲɛnajɛ",
                        of: "la",
                        total: "Jamana",
                        items: "dɔw",
                        selected: "wɛrɛw",
                        no_data: "Da tɛ sɔrɔ",
                        no_results: "Jɛlen tɛ sɔrɔ",
                        select_language: "Dɛn klɛ",
                        language_changed: "Klɛ sɔrɔ",
                        high_contrast: "Nɔrɔ taama",
                        font_size: "Srikan hakili",
                        normal_size: "Sɔrɔ",
                        large_size: "Gɛlɛn",
                        xlarge_size: "Gɛlɛn bɛ a",
                        accessibility: "Ka bɛn",
                        voice_enabled: "Ɲɛkɔrɔbɔ",
                    },
                    di_DJ: {
                        language: "Kan",
                        french: "Faransikan",
                        baoule: "Baoulékan",
                        dioula: "Dioula kan",
                        settings: "Reglaji",
                        notifications: "Abarada",
                        documents: "Karatiga",
                        home: "Sɔrɔ",
                        logout: "Sɔrɔ",
                        profile: "I nɛma",
                        save: "Ka dɔn",
                        cancel: "Ka bɔ",
                        close: "Ka fɛn",
                        loading: "Ka daminɛ...",
                        error: "Bonya",
                        success: "Sɔrɔli",
                        warning: "Sariya",
                        info: "Hɛrɛ",
                        offline: "Wɛrɛw ka bɔ",
                        online: "I la",
                        syncing: "Ka sɛgɛsɛgɛ...",
                        retry: "Ka san ka bɔ",
                        yes: "Oy",
                        no: "Ayi",
                        ok: "Oy",
                        search: "Hɛrɛ",
                        filter: "Sɛrɛ",
                        sort: "Lajɛ",
                        export: "Ka bɔ",
                        import: "Ka sɔrɔ",
                        add: "Ka fara",
                        edit: "Ka baga",
                        delete: "Ka bɔ",
                        view: "Ka lɛɛ",
                        download: "Ka wale",
                        upload: "Ka sin",
                        send: "Ka taa",
                        receive: "Ka sɔrɔ",
                        confirm: "Ka ɲini",
                        validate: "Ka sɔrɔ",
                        next: "Sini",
                        previous: "Tɔw",
                        first: "Kɔnɔ",
                        last: "Laban",
                        page: "Kɔnɔ",
                        of: "ka",
                        total: "Jamana",
                        items: "wɛrɛw",
                        selected: "fɔlɔw",
                        no_data: "Data tɛ sɔrɔ",
                        no_results: "Jɛlen tɛ sɔrɔ",
                        select_language: "Fɔ kan",
                        language_changed: "Kan sɔrɔ",
                        high_contrast: "Nɔrɔ taama",
                        font_size: "Hakili bɛ",
                        normal_size: "Sɔrɔ",
                        large_size: "Ba",
                        xlarge_size: "Ba kɛnɛ",
                        accessibility: "Ka bɛn",
                        voice_enabled: "Don cɛ",
                    },
                }
            },

            /**
             * Initialise les écouteurs d'événements
             */
            initEventListeners: function () {
                var self = this

                // Écouter les clics sur les sélecteurs de langue
                $(document).on("click", "[data-lang]", function (e) {
                    e.preventDefault()
                    var lang = $(this).data("lang")
                    self.changeLanguage(lang)
                })

                // Écouter les changements dans les selecteurs
                $(document).on(
                    "change",
                    "#language-select, .language-selector",
                    function () {
                        var lang = $(this).val()
                        self.changeLanguage(lang)
                    }
                )

                // Écouter les changements de langue depuis le SDK
                $(window).on("ifn:language_changed", function (event, lang) {
                    self.changeLanguage(lang)
                })
            },

            /**
             * Change la langue
             */
            changeLanguage: function (langCode) {
                if (
                    !this.languages[langCode] ||
                    langCode === this.currentLanguage
                ) {
                    return
                }

                var self = this
                var oldLang = this.currentLanguage
                this.currentLanguage = langCode

                // Sauvegarder la préférence
                localStorage.setItem("ifn_language", langCode)

                // Appliquer la langue
                this.applyLanguage(langCode)

                // Mettre à jour l'UI
                this.updateUI()

                // Envoyer les préférences au serveur
                this.saveLanguagePreference(langCode)

                // Émettre un événement
                $(window).trigger("ifn:language_changed", [langCode, oldLang])

                console.log(
                    "[IFN Language] Langue changée:",
                    oldLang,
                    "->",
                    langCode
                )

                // Afficher une notification
                if (window.IFN && window.IFN.showToast) {
                    window.IFN.showToast(
                        this.translate("language_changed"),
                        "success",
                        "Langue"
                    )
                }
            },

            /**
             * Applique la langue au document
             */
            applyLanguage: function (langCode) {
                var lang = this.languages[langCode]
                if (!lang) return

                // Mettre à jour l'attribut lang du document
                document.documentElement.lang = langCode
                document.documentElement.setAttribute("data-lang", langCode)

                // Gérer le RTL (Right-to-Left)
                if (lang.rtl) {
                    document.documentElement.dir = "rtl"
                    document.body.classList.add("rtl")
                } else {
                    document.documentElement.dir = "ltr"
                    document.body.classList.remove("rtl")
                }

                // Mettre à jour les éléments avec data-translate
                this.updateTranslations()
            },

            /**
             * Met à jour les traductions dans l'UI
             */
            updateTranslations: function () {
                var self = this
                $("[data-translate]").each(function () {
                    var $element = $(this)
                    var key = $element.data("translate")
                    var translation = self.translate(key)

                    if (translation && translation !== key) {
                        if ($element.is("input, textarea")) {
                            $element.attr("placeholder", translation)
                        } else {
                            $element.text(translation)
                        }
                    }
                })

                // Mettre à jour les titres
                $("[data-translate-title]").each(function () {
                    var $element = $(this)
                    var key = $element.data("translate-title")
                    var translation = self.translate(key)

                    if (translation && translation !== key) {
                        $element.attr("title", translation)
                    }
                })
            },

            /**
             * Traduit une clé
             */
            translate: function (key, params) {
                var translation =
                    this.translations[this.currentLanguage] &&
                    this.translations[this.currentLanguage][key]

                if (!translation) {
                    // Essayer en français
                    translation =
                        this.translations["fr_FR"] &&
                        this.translations["fr_FR"][key]
                }

                if (!translation) {
                    return key // Retourner la clé si pas de traduction
                }

                // Remplacer les paramètres
                if (params && typeof params === "object") {
                    Object.keys(params).forEach(function (param) {
                        translation = translation.replace(
                            "{" + param + "}",
                            params[param]
                        )
                    })
                }

                return translation
            },

            /**
             * Met à jour l'interface utilisateur
             */
            updateUI: function () {
                var self = this
                var currentLang = this.languages[this.currentLanguage]

                // Mettre à jour les sélecteurs de langue
                $(".current-lang").text(currentLang.displayName)
                $(".current-lang-flag").text(currentLang.flag)

                // Mettre à jour les dropdowns
                $("[data-lang]").removeClass("active")
                $('[data-lang="' + this.currentLanguage + '"]').addClass(
                    "active"
                )

                // Mettre à jour les selects
                $("#language-select, .language-selector").val(
                    this.currentLanguage
                )

                // Mettre à jour les liens de langue
                $(".language-link").each(function () {
                    var $link = $(this)
                    var lang = $link.data("lang")
                    var langInfo = self.languages[lang]
                    if (langInfo) {
                        $link.find(".lang-flag").text(langInfo.flag)
                        $link.find(".lang-name").text(langInfo.name)
                    }
                })
            },

            /**
             * Sauvegarde la préférence de langue
             */
            saveLanguagePreference: function (langCode) {
                if (!window.IFN || !window.IFN.api) return

                window.IFN.api("/prefs", {
                    method: "POST",
                    body: {
                        language: langCode,
                    },
                }).catch(function (error) {
                    console.warn(
                        "[IFN Language] Erreur sauvegarde préférence langue:",
                        error
                    )
                })
            },

            /**
             * Formate une date selon la langue
             */
            formatDate: function (date, options) {
                options = options || {}
                var locale = this.currentLanguage.replace("_", "-")

                try {
                    return new Date(date).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        ...options,
                    })
                } catch (e) {
                    return date
                }
            },

            /**
             * Formate un nombre selon la langue
             */
            formatNumber: function (number, options) {
                options = options || {}
                var locale = this.currentLanguage.replace("_", "-")

                try {
                    return new Intl.NumberFormat(locale, options).format(number)
                } catch (e) {
                    return number.toString()
                }
            },

            /**
             * Formate la monnaie selon la langue
             */
            formatCurrency: function (amount, currency) {
                currency = currency || "XOF"
                var locale = this.currentLanguage.replace("_", "-")

                try {
                    return new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: currency === "XOF" ? "XOF" : "EUR",
                    }).format(amount)
                } catch (e) {
                    return amount + " " + currency
                }
            },

            /**
             * Récupère la langue actuelle
             */
            getCurrentLanguage: function () {
                return this.currentLanguage
            },

            /**
             * Récupère les informations de langue
             */
            getLanguageInfo: function (langCode) {
                return this.languages[langCode || this.currentLanguage]
            },

            /**
             * Récupère toutes les langues disponibles
             */
            getAvailableLanguages: function () {
                return Object.keys(this.languages).map(
                    function (code) {
                        return this.languages[code]
                    }.bind(this)
                )
            },

            /**
             * Vérifie si la langue est RTL
             */
            isRTL: function () {
                return (
                    this.languages[this.currentLanguage] &&
                    this.languages[this.currentLanguage].rtl
                )
            },
        }

        // Initialisation automatique
        $(document).ready(function () {
            // Attendre que le SDK soit chargé
            setTimeout(function () {
                LanguageSelector.init()

                // Exposer globalement
                window.IFN_Language = LanguageSelector

                // Exposer les fonctions utilitaires
                window.IFN.t = function (key, params) {
                    return LanguageSelector.translate(key, params)
                }

                window.IFN.formatDate = function (date, options) {
                    return LanguageSelector.formatDate(date, options)
                }

                window.IFN.formatNumber = function (number, options) {
                    return LanguageSelector.formatNumber(number, options)
                }

                window.IFN.formatCurrency = function (amount, currency) {
                    return LanguageSelector.formatCurrency(amount, currency)
                }

                window.IFN.changeLanguage = function (langCode) {
                    return LanguageSelector.changeLanguage(langCode)
                }

                window.IFN.getCurrentLanguage = function () {
                    return LanguageSelector.getCurrentLanguage()
                }
            }, 500)
        })

        return LanguageSelector
    }
)
