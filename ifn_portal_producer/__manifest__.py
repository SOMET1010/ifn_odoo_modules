# -*- coding: utf-8 -*-

{
    'name': 'IFN Portal Producer',
    'version': '1.0',
    'summary': 'Module Portal Producteur IFN',
    'description': """
        Module IFN – Portail Producteur
    """,
    'author': 'IFN / Transformation',
    'category': 'Portal',
    'website': 'https://example.com',
    'license': 'LGPL-3',
    'installable': True,
    'application': False,

    # 🔥 Correctif essentiel : on ajoute les modules nécessaires
    'depends': [
        'base',
        'website',
        'uom',
        'product',          # OBLIGATOIRE (résout l’erreur product.product)
        'ifn_portal_common'
    ],

    'data': [
        'security/ir.model.access.csv',
        'data/ifn_producer_data.xml',
        'views/producer_templates.xml',
        'views/producer_portal_views.xml',
    ],

    'assets': {
        'web.assets_frontend': [
            'ifn_portal_producer/static/src/css/producer.css',
            'ifn_portal_producer/static/src/js/producer.js',
        ],
    },
}
