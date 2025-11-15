# -*- coding: utf-8 -*-
{
    "name": "IFN PORTAL COMMON",
    "version": "17.0.1.0.0",
    "summary": "Socle portail IFN (Website/Portal, PWA, i18n, accessibilité, redirection par rôle)",
    "description": """
Module socle portail IFN Common
===============================

Ce module fournit l'infrastructure portail (Website + Portal) et les composants transverses :
- Navigation, authentification portail, thèmes & charte graphique
- Sélecteur de langue (FR, Baoulé, Dioula)
- PWA/offline (service worker, manifest)
- Redirection par rôle (Marchand, Producteur, Coop)
- Widgets d'accessibilité (pictogrammes, tailles, contraste)
- Base de sync offline→online, gabarits de pages / fragments QWeb
- SDK front minimal: helpers JS pour appels API ifn_*

Couvre les fonctionnalités :
- Routing portail unique /portal avec redirection auto
- Enveloppe UI (header/footer, fil d'Ariane, couleurs 🇨🇮)
- PWA : manifest.json, service worker, cache statique & file d'attente
- Accessibilité : tailles réglables, contraste AA, pictogrammes
- Pages génériques : connexion/inscription, préférences, notifications
- SDK JS avec gestion offline et file d'attente
- Hooks d'intégration (voix, Mobile Money, analytics)
    """,
    "author": "IFN",
    "website": "https://ifn.ci",
    "license": "LGPL-3",
    "category": "Extra Tools",
    "depends": [
        "base",
        "portal",
        "website",
        "web",
        "ifn_core",
        "web_editor",
    ],
    "data": [
        # Security
        "security/ir.model.access.csv",

        # Data
        "data/ir_ui_menu.xml",

        # Website templates - L'ordre est important!
        "views/website_layout.xml",  # Doit être en premier pour surcharger le layout
        "views/website_homepage.xml", # Page d'accueil IFN complète
        "views/website_customization.xml", # Options de personnalisation
        "views/website_templates.xml",
        "views/website_signup.xml",
        "views/website_signup_result.xml",
        "views/website_public_pages.xml",
        "views/portal_layout.xml",
        "views/portal_pages.xml",
        "views/portal_components.xml",
    ],
    "demo": [
        "demo/portal_demo.xml",
    ],
    "assets": {
        "web.assets_frontend": [
            "ifn_portal_common/static/src/css/ifn_portal.css",
            "ifn_portal_common/static/src/css/ifn_accessibility.css",
            "ifn_portal_common/static/src/css/ifn_responsive.css",
            "ifn_portal_common/static/src/css/ifn_toasts.css",
            # Système d'icônes IFN - CSS
            "ifn_portal_common/static/src/css/ifn_icons.css",
            # Système d'icônes IFN - Assets principaux
            "ifn_portal_common/static/src/js/ifn_icons_mapping.js",
            "ifn_portal_common/static/src/js/ifn_sprite_optimized.js",
            "ifn_portal_common/static/src/js/ifn_icon_fallbacks.js",
            "ifn_portal_common/static/src/js/ifn_icon_system.js",
            # JavaScript désactivés temporairement - problèmes de dépendances
            # "ifn_portal_common/static/src/js/ifn_sdk_core.js",
            # "ifn_portal_common/static/src/js/pwa_register.js",
            # "ifn_portal_common/static/src/js/ifn_accessibility.js",
            # "ifn_portal_common/static/src/js/ifn_language_selector.js",
            # "ifn_portal_common/static/src/js/ifn_notifications.js",
            # "ifn_portal_common/static/src/js/ifn_signup.js",
            # "ifn_portal_common/static/src/js/ifn_homepage.js",
            # "ifn_portal_common/static/src/js/ifn_init.js",
        ],
        "web.assets_qweb": [
            "ifn_portal_common/static/src/xml/ifn_portal.xml",
            "ifn_portal_common/static/src/xml/ifn_templates.xml",
            "ifn_portal_common/static/src/xml/ifn_icons_examples.xml",
        ],
        "web.assets_backend": [
            "ifn_portal_common/static/src/css/ifn_admin.css",
        ],
    },
    "installable": True,
    "auto_install": False,
    "application": False,
    "post_init_hook": "post_init_hook",
    "uninstall_hook": "uninstall_hook",
    "external_dependencies": {
        "bin": [],
        "python": [],
    },
    "images": [
        "static/description/banner.png",
        "static/description/main_screenshot.png",
    ],
    "sequence": 100,
}