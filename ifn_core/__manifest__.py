# -*- coding: utf-8 -*-
{
    "name": "IFN CORE",
    "version": "1.0",
    "summary": "Socle données & sécurité pour IFN (rôles, QR, géoloc, référentiels)",
    "description": """
IFN Core - Socle transverse pour l'écosystème IFN
==========================================

Module cœur fournissant les entités métiers, rôles, sécurité, paramètres,
journalisation, et les hooks techniques communs (QR, géoloc, i18n, PWA/offline,
événements) pour alimenter les portails Marchand, Producteur et Coopérative.

Fonctionnalités principales :
* Gestion des rôles et profils IFN (marchand, producteur, coop, agent, admin)
* Génération d'identifiants uniques (UID) et codes QR
* Géolocalisation des partenaires, marchés et coopératives
* Référentiels (marchés, coopératives, zones, catégories produits)
* Sécurité et traçabilité (RBAC, audit logs)
* Internationalisation et accessibilité
* Bus d'événements pour découplage des modules métiers
* KPIs et tableaux de bord de base
    """,
    "author": "IFN Team",
    "website": "https://ifn.org",
    "license": "LGPL-3",
    "category": "Extra Tools",
    "depends": [
        "base",
        "contacts",
        "portal",
        "web",
        "base_geolocalize",
    ],
    "data": [
    ],
    "demo": [
    ],
    "installable": True,
    "auto_install": False,
    "application": False,
    "external_dependencies": {
        "python": ["qrcode", "Pillow"],
    },
    "pre_init_hook": "pre_init_hook",
    "post_init_hook": "post_init_hook",
}
