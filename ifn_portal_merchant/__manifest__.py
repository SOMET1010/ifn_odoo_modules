# -*- coding: utf-8 -*-
{
    "name": "IFN PORTAL MERCHANT",
    "version": "1.0.0",
    "summary": "Portail Marchand vivrier (vente, stock, appro, paiements, social, formation)",
    "description": """
IFN Portal Merchant
==================

Module portail pour les marchands vivriers IFN fournissant :

* Dashboard avec KPIs (CA, ruptures, social, paiements)
* Vente rapide par scan/voix avec reçus PDF
* Gestion de stock avec alertes et inventaire
* Approvisionnement auprès coopératives/fournisseurs
* Encaissements Mobile Money avec suivi
* Paiement cotisations sociales (CNPS/CNAM/CMU)
* Formation continue avec certificats
* Mode offline PWA avec queue & replay
* Accessibilité WCAG 2.1 AA et i18n FR/BA/DI

Dépend des modules métiers IFN et hérite du layout commun ifn_portal_common.
    """,
    "author": "IFN Development Team",
    "website": "https://ifn.ci",
    "license": "LGPL-3",
    "category": "Portal/IFN",
    "depends": [
        "ifn_core",
        "ifn_portal_common",
        "website",
        "portal",
        "web",
        "contacts",
    ],
    "data": [
        # Security
        "security/groups.xml",
        "security/ir.model.access.csv",
        "security/security.xml",

        # Views
        "views/merchant_pages.xml",
        "views/merchant_templates.xml",
        "views/merchant_dashboard.xml",

        # Data
        "data/ir_ui_menu.xml",
        "data/res_config_settings.xml",
    ],
    "demo": [
        "demo/merchant_demo.xml",
    ],
    "assets": {
        "web.assets_frontend": [
            "ifn_portal_merchant/static/src/js/merchant_dashboard.js",
            "ifn_portal_merchant/static/src/js/merchant_sell.js",
            "ifn_portal_merchant/static/src/js/merchant_stock.js",
            "ifn_portal_merchant/static/src/js/merchant_purchase.js",
            "ifn_portal_merchant/static/src/js/merchant_payments.js",
            "ifn_portal_merchant/static/src/js/merchant_social.js",
            "ifn_portal_merchant/static/src/js/merchant_training.js",
            "ifn_portal_merchant/static/src/js/merchant_offline.js",
            "ifn_portal_merchant/static/src/css/merchant.css",
        ],
        "web.assets_qweb": [
            "ifn_portal_merchant/static/src/xml/merchant.xml",
        ],
        "web.assets_backend": [
            "ifn_portal_merchant/static/src/css/merchant_backend.css",
        ],
    },
    "installable": True,
    "auto_install": False,
    "application": False,
    "sequence": 100,
    "external_dependencies": {
        "bin": [],
        "python": [],
    },
    "post_init_hook": "post_init_hook",
    "uninstall_hook": "uninstall_hook",
}