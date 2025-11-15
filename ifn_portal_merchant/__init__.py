# -*- coding: utf-8 -*-
"""
IFN Portal Merchant
===================

Merchant portal for IFN ecosystem providing:
- Dashboard with KPIs
- Sales management with voice commands
- Stock management with alerts
- Purchase/supply management
- Mobile Money payments
- Social protection integration
- Training modules
- Offline PWA functionality
"""

from . import models
from . import controllers
from . import hooks

# Export hook functions for Odoo
from .hooks import post_init_hook, uninstall_hook