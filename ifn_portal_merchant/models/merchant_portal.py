# -*- coding: utf-8 -*-
"""
IFN Merchant Portal Models
=========================

Extended models for merchant portal functionality.
"""
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, AccessError
import logging

_logger = logging.getLogger(__name__)


class ResPartner(models.Model):
    """Extended partner model for merchant portal."""

    _inherit = 'res.partner'

    # Merchant portal settings
    merchant_portal_enabled = fields.Boolean(
        string="Portal Access Enabled",
        default=True,
        help="Enable portal access for this merchant"
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

    # Voice recognition settings
    voice_enabled = fields.Boolean(
        string="Voice Commands Enabled",
        default=True,
        help="Enable voice commands in merchant portal"
    )
    voice_language = fields.Selection([
        ('fr_FR', 'Français'),
        ('ba_CI', 'Baoulé'),
        ('di_CI', 'Dioula'),
    ], string="Voice Language", default='fr_FR')

    # Notification settings
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
    def update_merchant_login(self, partner_id):
        """Update merchant login statistics."""
        partner = self.browse(partner_id)
        if partner.exists():
            partner.write({
                'merchant_last_login': fields.Datetime.now(),
                'merchant_login_count': partner.merchant_login_count + 1,
            })

    def get_merchant_dashboard_data(self):
        """Get dashboard data for merchant."""
        self.ensure_one()
        if self.ifn_role != 'merchant':
            raise AccessError(_("Access denied: not a merchant"))

        # This would call business module APIs
        return {
            'revenue_stats': self._get_revenue_stats(),
            'stock_alerts': self._get_stock_alerts(),
            'social_status': self._get_social_status(),
            'recent_sales': self._get_recent_sales(),
            'voice_usage': self._get_voice_usage_stats(),
        }

    def _get_revenue_stats(self):
        """Get revenue statistics - mock implementation."""
        # Would call ifn_marketplace API
        return {
            'today': 15000.0,
            'week': 85000.0,
            'month': 320000.0,
        }

    def _get_stock_alerts(self):
        """Get stock alerts - mock implementation."""
        # Would call ifn_inventory_light API
        return 3

    def _get_social_status(self):
        """Get social protection status - mock implementation."""
        # Would call ifn_social_protection API
        return {
            'status': 'paid',
            'due_date': '2024-02-15',
            'amount': 25000.0,
        }

    def _get_recent_sales(self, limit=5):
        """Get recent sales - mock implementation."""
        # Would call ifn_marketplace API
        return [
            {
                'id': 1,
                'date': '2024-01-04 14:30',
                'amount': 2500.0,
                'customer': 'Client Alpha',
                'products': ['Riz'],
            },
            {
                'id': 2,
                'date': '2024-01-04 13:15',
                'amount': 1800.0,
                'customer': 'Client Beta',
                'products': ['Igname'],
            },
        ]

    def _get_voice_usage_stats(self):
        """Get voice usage statistics - mock implementation."""
        total_operations = 100
        voice_operations = 15
        return {
            'total_operations': total_operations,
            'voice_operations': voice_operations,
            'voice_percentage': (voice_operations / total_operations * 100) if total_operations else 0,
        }


class MerchantPortalKpi(models.Model):
    """Merchant Portal KPI tracking."""

    _name = 'ifn.merchant.portal.kpi'
    _description = 'Merchant Portal KPI'
    _order = 'date desc'

    name = fields.Char(string="KPI Name", required=True)
    partner_id = fields.Many2one(
        'res.partner',
        string="Merchant",
        required=True,
        domain="[('ifn_role', '=', 'merchant')]"
    )
    date = fields.Datetime(
        string="Date",
        default=fields.Datetime.now,
        required=True
    )
    kpi_type = fields.Selection([
        ('revenue', 'Revenue'),
        ('sales_count', 'Sales Count'),
        ('stock_alerts', 'Stock Alerts'),
        ('voice_usage', 'Voice Usage'),
        ('social_status', 'Social Status'),
        ('payment_count', 'Payment Count'),
    ], string="KPI Type", required=True)

    value_numeric = fields.Float(string="Numeric Value")
    value_text = fields.Text(string="Text Value")
    metadata = fields.Text(string="Metadata", help="JSON metadata")

    @api.model
    def create_kpi_record(self, partner_id, kpi_type, value, metadata=None):
        """Create a KPI record."""
        return self.create({
            'name': f"{partner_id}_{kpi_type}_{fields.Datetime.now()}",
            'partner_id': partner_id,
            'kpi_type': kpi_type,
            'value_numeric': value if isinstance(value, (int, float)) else 0,
            'value_text': str(value) if not isinstance(value, (int, float)) else '',
            'metadata': metadata,
        })


class MerchantOfflineQueue(models.Model):
    """Offline operation queue for merchants."""

    _name = 'ifn.merchant.offline.queue'
    _description = 'Merchant Offline Operation Queue'
    _order = 'create_date desc'

    partner_id = fields.Many2one(
        'res.partner',
        string="Merchant",
        required=True,
        domain="[('ifn_role', '=', 'merchant')]"
    )
    operation_type = fields.Selection([
        ('sale', 'Sale'),
        ('stock_adjust', 'Stock Adjustment'),
        ('payment', 'Payment'),
        ('purchase', 'Purchase Order'),
        ('social_payment', 'Social Payment'),
    ], string="Operation Type", required=True)

    operation_data = fields.Text(
        string="Operation Data",
        required=True,
        help="JSON data of the operation"
    )
    status = fields.Selection([
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], string="Status", default='pending', required=True)

    retry_count = fields.Integer(string="Retry Count", default=0)
    max_retries = fields.Integer(string="Max Retries", default=3)
    last_error = fields.Text(string="Last Error")
    idempotency_key = fields.Char(
        string="Idempotency Key",
        required=True,
        help="Key to prevent duplicate operations"
    )

    @api.model
    def add_operation(self, partner_id, operation_type, data, idempotency_key=None):
        """Add operation to offline queue."""
        if not idempotency_key:
            idempotency_key = f"{partner_id}_{operation_type}_{hash(str(data))}"

        # Check for existing operation with same key
        existing = self.search([
            ('idempotency_key', '=', idempotency_key),
            ('status', 'in', ['pending', 'processing'])
        ])
        if existing:
            return existing[0]

        return self.create({
            'partner_id': partner_id,
            'operation_type': operation_type,
            'operation_data': json.dumps(data),
            'idempotency_key': idempotency_key,
        })

    def process_queue(self):
        """Process pending operations in the queue."""
        pending_operations = self.search([
            ('status', '=', 'pending'),
            ('retry_count', '<', self.max_retries)
        ])

        for operation in pending_operations:
            operation.process_operation()

    def process_operation(self):
        """Process a single operation."""
        self.ensure_one()
        try:
            self.status = 'processing'
            data = json.loads(self.operation_data)

            # Call appropriate API based on operation type
            if self.operation_type == 'sale':
                result = self._process_sale(data)
            elif self.operation_type == 'stock_adjust':
                result = self._process_stock_adjust(data)
            elif self.operation_type == 'payment':
                result = self._process_payment(data)
            elif self.operation_type == 'purchase':
                result = self._process_purchase(data)
            elif self.operation_type == 'social_payment':
                result = self._process_social_payment(data)
            else:
                raise ValidationError(f"Unknown operation type: {self.operation_type}")

            if result.get('success'):
                self.status = 'completed'
            else:
                self._mark_failed(result.get('error', 'Unknown error'))

        except Exception as e:
            _logger.error("Error processing offline operation %s: %s", self.id, str(e))
            self._mark_failed(str(e))

    def _mark_failed(self, error_msg):
        """Mark operation as failed and increment retry count."""
        self.retry_count += 1
        self.last_error = error_msg
        if self.retry_count >= self.max_retries:
            self.status = 'failed'
        else:
            self.status = 'pending'

    def _process_sale(self, data):
        """Process sale operation - mock implementation."""
        # Would call ifn_marketplace API
        return {'success': True, 'order_id': 12345}

    def _process_stock_adjust(self, data):
        """Process stock adjustment - mock implementation."""
        # Would call ifn_inventory_light API
        return {'success': True}

    def _process_payment(self, data):
        """Process payment - mock implementation."""
        # Would call ifn_payments_mobile API
        return {'success': True, 'transaction_id': 'TXN123'}

    def _process_purchase(self, data):
        """Process purchase order - mock implementation."""
        # Would call ifn_marketplace API
        return {'success': True, 'purchase_id': 67890}

    def _process_social_payment(self, data):
        """Process social payment - mock implementation."""
        # Would call ifn_social_protection API
        return {'success': True, 'payment_id': 11111}