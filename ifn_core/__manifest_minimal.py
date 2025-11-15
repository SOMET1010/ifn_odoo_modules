# -*- coding: utf-8 -*-
{
    "name": "IFN Core (Minimal)",
    "version": "1.0",
    "summary": "Socle minimal IFN pour installation de base",
    "description": """
IFN Core - Version minimale pour installation de base
===============================================

Module cœur IFN avec uniquement les modèles de base pour permettre
l'installation initiale. Les données et vues seront ajoutées après.
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