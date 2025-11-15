# -*- coding: utf-8 -*-
"""
IFN Portal Merchant - Partner Extension
=====================================

Extension of res.partner model for IFN merchant functionality.
"""
from odoo import models, fields, api, _


class ResPartner(models.Model):
    """Extended partner model for IFN merchants."""

    _inherit = 'res.partner'

    # IFN specific fields
    ifn_role = fields.Selection([
        ('merchant', 'Merchant'),
        ('supplier', 'Supplier'),
        ('cooperative', 'Cooperative'),
        ('admin', 'Administrator'),
        ('customer', 'Customer'),
    ], string="IFN Role", default='customer')

    x_ifn_market_id = fields.Many2one(
        'ir.ui.view',
        string="Market Reference",
        help="Reference to the market where this merchant operates"
    )

    x_ifn_coop_id = fields.Many2one(
        'res.partner',
        string="Cooperative",
        domain="[('is_company', '=', True), ('ifn_role', '=', 'cooperative')]",
        help="Cooperative this merchant belongs to"
    )

    x_ifn_qr_ref = fields.Char(
        string="QR Reference",
        help="Unique QR code reference for IFN identification"
    )

    # Merchant specific preferences
    merchant_portal_enabled = fields.Boolean(
        string="Portal Access Enabled",
        default=True
    )

    merchant_preferences = fields.Text(
        string="Portal Preferences",
        help="JSON string with merchant portal preferences"
    )

    merchant_last_login = fields.Datetime(
        string="Last Portal Login",
        readonly=True
    )

    merchant_login_count = fields.Integer(
        string="Portal Login Count",
        default=0,
        readonly=True
    )

    # Voice settings
    voice_enabled = fields.Boolean(
        string="Voice Commands Enabled",
        default=True
    )

    voice_language = fields.Selection([
        ('fr_FR', 'Français'),
        ('ba_CI', 'Baoulé'),
        ('di_CI', 'Dioula'),
    ], string="Voice Language", default='fr_FR')

    # Notification preferences
    stock_alerts_enabled = fields.Boolean(
        string="Stock Alerts",
        default=True
    )

    payment_notifications_enabled = fields.Boolean(
        string="Payment Notifications",
        default=True
    )

    social_reminders_enabled = fields.Boolean(
        string="Social Protection Reminders",
        default=True
    )

    @api.model
    def create(self, vals):
        """Override create to set default values for IFN merchants."""
        if vals.get('ifn_role') == 'merchant' and not vals.get('x_ifn_qr_ref'):
            vals['x_ifn_qr_ref'] = self._generate_qr_reference()

        return super(ResPartner, self).create(vals)

    def write(self, vals):
        """Override write to update portal login statistics."""
        if 'ifn_role' in vals and vals['ifn_role'] == 'merchant' and not self.x_ifn_qr_ref:
            vals['x_ifn_qr_ref'] = self._generate_qr_reference()

        return super(ResPartner, self).write(vals)

    def _generate_qr_reference(self):
        """Generate unique QR reference for IFN identification."""
        import random
        import string

        prefix = "IFN"
        random_part = ''.join(random.choices(string.digits, k=6))
        return f"{prefix}{random_part}"

    @api.model
    def update_merchant_login(self, partner_id):
        """Update merchant login statistics."""
        partner = self.browse(partner_id)
        if partner.exists():
            partner.write({
                'merchant_last_login': fields.Datetime.now(),
                'merchant_login_count': partner.merchant_login_count + 1,
            })

    def action_view_merchant_portal(self):
        """Action to view merchant portal."""
        self.ensure_one()
        if self.ifn_role != 'merchant':
            raise UserError(_("This partner is not a merchant."))

        return {
            'type': 'ir.actions.act_url',
            'url': '/portal/merchant',
            'target': 'new',
        }