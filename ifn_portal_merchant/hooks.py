# -*- coding: utf-8 -*-
"""
IFN Portal Merchant Hooks
========================

Installation and uninstallation hooks for the module.
"""

import logging
from odoo import api

_logger = logging.getLogger(__name__)


def post_init_hook(env):
    """Called after the module is installed."""
    _logger.info("IFN Portal Merchant installed successfully")

    # Set default configuration values
    config_values = {
        'ifn_portal_merchant.merchant_portal_enabled': True,
        'ifn_portal_merchant.merchant_voice_enabled': True,
        'ifn_portal_merchant.merchant_offline_enabled': True,
        'ifn_portal_merchant.stock_alert_enabled': True,
        'ifn_portal_merchant.stock_alert_threshold_default': 10,
        'ifn_portal_merchant.mobile_money_timeout': 300,
        'ifn_portal_merchant.mobile_money_providers': '["Orange Money", "MTN Mobile Money", "Moov Money"]'
    }

    for key, value in config_values.items():
        env['ir.config_parameter'].sudo().set_param(key, value)

    _logger.info("Default merchant portal configuration created")


def uninstall_hook(env):
    """Called before the module is uninstalled."""
    _logger.info("IFN Portal Merchant uninstalling...")

    # Clean up configuration parameters
    config_params = [
        'ifn_portal_merchant.merchant_portal_enabled',
        'ifn_portal_merchant.merchant_voice_enabled',
        'ifn_portal_merchant.merchant_offline_enabled',
        'ifn_portal_merchant.stock_alert_enabled',
        'ifn_portal_merchant.stock_alert_threshold_default',
        'ifn_portal_merchant.mobile_money_timeout',
        'ifn_portal_merchant.mobile_money_providers'
    ]

    for param in config_params:
        env['ir.config_parameter'].sudo().search([('key', '=', param)]).unlink()

    _logger.info("IFN Portal Merchant uninstalled successfully")