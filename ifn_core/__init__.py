# -*- coding: utf-8 -*-
"""
IFN Core - Module d'initialisation
"""

import logging
from odoo import api

_logger = logging.getLogger(__name__)


def pre_init_hook(cr):
    """Hook d'initialisation avant le chargement du module"""
    _logger.info("IFN Core: Initialisation pré-installation")


def post_init_hook(env):
    """Hook d'initialisation après le chargement du module"""
    _logger.info("IFN Core: Initialisation post-installation")

    # Créer les séquences si elles n'existent pas

    # Séquence UID IFN
    if not env['ir.sequence'].search([('code', '=', 'ifn.uid.sequence')]):
        env['ir.sequence'].create({
            'name': 'IFN UID Sequence',
            'code': 'ifn.uid.sequence',
            'prefix': 'IFN-',
            'padding': 5,
            'number_next': 1,
            'number_increment': 1,
            'use_date_range': True,
        })

    # Séquence QR
    if not env['ir.sequence'].search([('code', '=', 'ifn.qr.sequence')]):
        env['ir.sequence'].create({
            'name': 'IFN QR Reference Sequence',
            'code': 'ifn.qr.sequence',
            'prefix': 'QR-',
            'padding': 8,
            'number_next': 1,
            'number_increment': 1,
            'use_date_range': True,
        })

    # Séquence Marchés
    if not env['ir.sequence'].search([('code', '=', 'ifn.market.sequence')]):
        env['ir.sequence'].create({
            'name': 'IFN Market Sequence',
            'code': 'ifn.market.sequence',
            'prefix': 'MKT',
            'padding': 3,
            'number_next': 1,
            'number_increment': 1,
        })

    # Séquence Coopératives
    if not env['ir.sequence'].search([('code', '=', 'ifn.coop.sequence')]):
        env['ir.sequence'].create({
            'name': 'IFN Cooperative Sequence',
            'code': 'ifn.coop.sequence',
            'prefix': 'COP',
            'padding': 3,
            'number_next': 1,
            'number_increment': 1,
        })

    _logger.info("IFN Core: Séquences créées avec succès")