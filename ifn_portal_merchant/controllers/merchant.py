# -*- coding: utf-8 -*-
"""
IFN Portal Merchant Controllers
==============================

Controllers for merchant portal pages with security checks and API endpoints.
"""
import logging
import json
from datetime import datetime, timedelta
from odoo import http, _
from odoo.http import request
from odoo.exceptions import AccessError, ValidationError, UserError

_logger = logging.getLogger(__name__)


def _ensure_merchant():
    """Ensure user has merchant group and redirect if not."""
    if not request.env.user.has_group('ifn_core.ifn_group_merchant'):
        return request.redirect('/my')
    return None


def _get_merchant_partner():
    """Get the merchant partner associated with current user."""
    partner = request.env.user.partner_id
    if not partner.ifn_role == 'merchant':
        raise AccessError(_("You are not authorized as a merchant."))
    return partner


class IFNMerchantPortal(http.Controller):
    """Main merchant portal controller."""

    @http.route('/portal/merchant', auth='user', website=True, type='http')
    def merchant_home(self, **kw):
        """Merchant dashboard with KPIs."""
        redirect = _ensure_merchant()
        if redirect:
            return redirect

        partner = _get_merchant_partner()

        # Get KPIs data
        kpi_data = self._get_dashboard_kpis(partner)

        values = {
            'partner': partner,
            'kpi_data': kpi_data,
            'page_name': 'merchant_dashboard',
        }
        return request.render('ifn_portal_merchant.page_dashboard', values)

    @http.route('/portal/merchant/sell', auth='user', website=True, type='http')
    def merchant_sell(self, **kw):
        """Sell page - product scanning and cart management."""
        redirect = _ensure_merchant()
        if redirect:
            return redirect

        partner = _get_merchant_partner()

        values = {
            'partner': partner,
            'page_name': 'merchant_sell',
        }
        return request.render('ifn_portal_merchant.page_sell', values)

    @http.route('/portal/merchant/stock', auth='user', website=True, type='http')
    def merchant_stock(self, **kw):
        """Stock management page."""
        redirect = _ensure_merchant()
        if redirect:
            return redirect

        partner = _get_merchant_partner()

        # Get stock data
        stock_data = self._get_stock_data(partner)

        values = {
            'partner': partner,
            'stock_data': stock_data,
            'page_name': 'merchant_stock',
        }
        return request.render('ifn_portal_merchant.page_stock', values)

    @http.route('/portal/merchant/purchase', auth='user', website=True, type='http')
    def merchant_purchase(self, **kw):
        """Purchase/supply page."""
        redirect = _ensure_merchant()
        if redirect:
            return redirect

        partner = _get_merchant_partner()

        values = {
            'partner': partner,
            'page_name': 'merchant_purchase',
        }
        return request.render('ifn_portal_merchant.page_purchase', values)

    @http.route('/portal/merchant/payments', auth='user', website=True, type='http')
    def merchant_payments(self, **kw):
        """Payments history and Mobile Money page."""
        redirect = _ensure_merchant()
        if redirect:
            return redirect

        partner = _get_merchant_partner()

        values = {
            'partner': partner,
            'page_name': 'merchant_payments',
        }
        return request.render('ifn_portal_merchant.page_payments', values)

    @http.route('/portal/merchant/social', auth='user', website=True, type='http')
    def merchant_social(self, **kw):
        """Social protection page."""
        redirect = _ensure_merchant()
        if redirect:
            return redirect

        partner = _get_merchant_partner()

        values = {
            'partner': partner,
            'page_name': 'merchant_social',
        }
        return request.render('ifn_portal_merchant.page_social', values)

    @http.route('/portal/merchant/training', auth='user', website=True, type='http')
    def merchant_training(self, **kw):
        """Training page."""
        redirect = _ensure_merchant()
        if redirect:
            return redirect

        partner = _get_merchant_partner()

        values = {
            'partner': partner,
            'page_name': 'merchant_training',
        }
        return request.render('ifn_portal_merchant.page_training', values)

    @http.route('/portal/merchant/profile', auth='user', website=True, type='http')
    def merchant_profile(self, **kw):
        """Merchant profile page."""
        redirect = _ensure_merchant()
        if redirect:
            return redirect

        partner = _get_merchant_partner()

        values = {
            'partner': partner,
            'page_name': 'merchant_profile',
        }
        return request.render('ifn_portal_merchant.page_profile', values)

    def _get_dashboard_kpis(self, partner):
        """Get dashboard KPIs data."""
        # This will call APIs from business modules
        # For now, return mock data
        return {
            'revenue_today': 15000.0,
            'revenue_week': 85000.0,
            'revenue_month': 320000.0,
            'stock_alerts': 3,
            'social_status': 'paid',  # paid, pending, overdue
            'social_due_date': '2024-02-15',
            'last_sales': [
                {'date': '2024-01-04 14:30', 'amount': 2500.0, 'product': 'Riz'},
                {'date': '2024-01-04 13:15', 'amount': 1800.0, 'product': 'Igname'},
                {'date': '2024-01-04 11:45', 'amount': 3200.0, 'product': 'Manioc'},
                {'date': '2024-01-04 10:20', 'amount': 1500.0, 'product': 'Tomates'},
                {'date': '2024-01-04 09:30', 'amount': 2100.0, 'product': 'Oignons'},
            ],
            'last_payments': [
                {'date': '2024-01-04 15:00', 'amount': 5000.0, 'method': 'Mobile Money', 'status': 'confirmed'},
                {'date': '2024-01-04 12:30', 'amount': 2500.0, 'method': 'Cash', 'status': 'confirmed'},
            ],
            'voice_operations_percent': 15.3,
        }

    def _get_stock_data(self, partner):
        """Get stock data for merchant."""
        # Mock data - will call ifn_inventory_light API
        return {
            'products': [
                {'id': 1, 'name': 'Riz local', 'quantity': 25, 'threshold': 10, 'unit': 'kg', 'status': 'ok'},
                {'id': 2, 'name': 'Igname', 'quantity': 8, 'threshold': 15, 'unit': 'kg', 'status': 'low'},
                {'id': 3, 'name': 'Manioc', 'quantity': 30, 'threshold': 20, 'unit': 'kg', 'status': 'ok'},
                {'id': 4, 'name': 'Tomates', 'quantity': 3, 'threshold': 10, 'unit': 'kg', 'status': 'critical'},
            ],
            'alerts_count': 2,
        }


class IFNMerchantAPI(http.Controller):
    """API endpoints for merchant operations."""

    @http.route('/api/merchant/products/search', auth='user', type='json', methods=['POST'])
    def api_search_products(self, term='', **kw):
        """Search products by barcode, QR code, or voice."""
        redirect = _ensure_merchant()
        if redirect:
            return {'error': 'Unauthorized'}

        try:
            # Call ifn_marketplace API
            products = request.env['product.product'].search([
                ('barcode', 'ilike', term),
                ('name', 'ilike', term),
                ('default_code', 'ilike', term)
            ], limit=10)

            result = []
            for product in products:
                result.append({
                    'id': product.id,
                    'name': product.name,
                    'barcode': product.barcode or '',
                    'price': product.list_price,
                    'uom': product.uom_id.name,
                    'available': product.virtual_available,
                })

            return {'success': True, 'products': result}

        except Exception as e:
            _logger.error("Product search error: %s", str(e))
            return {'success': False, 'error': str(e)}

    @http.route('/api/merchant/sale/create', auth='user', type='json', methods=['POST'])
    def api_create_sale(self, **kwargs):
        """Create a new sale order."""
        redirect = _ensure_merchant()
        if redirect:
            return {'error': 'Unauthorized'}

        try:
            partner = _get_merchant_partner()
            sale_data = json.loads(request.httprequest.data)

            # Call ifn_marketplace API to create sale
            # Mock implementation
            order_vals = {
                'partner_id': sale_data.get('customer_id', partner.id),
                'order_line': [],
                'state': 'draft',
            }

            for line in sale_data.get('lines', []):
                order_vals['order_line'].append((0, 0, {
                    'product_id': line['product_id'],
                    'product_uom_qty': line['quantity'],
                    'price_unit': line['price'],
                }))

            # This would call the actual API
            return {
                'success': True,
                'order_id': 12345,
                'message': 'Order created successfully'
            }

        except Exception as e:
            _logger.error("Sale creation error: %s", str(e))
            return {'success': False, 'error': str(e)}

    @http.route('/api/merchant/stock/adjust', auth='user', type='json', methods=['POST'])
    def api_adjust_stock(self, **kwargs):
        """Adjust stock quantities."""
        redirect = _ensure_merchant()
        if redirect:
            return {'error': 'Unauthorized'}

        try:
            data = json.loads(request.httprequest.data)

            # Call ifn_inventory_light API
            # Mock implementation
            return {
                'success': True,
                'message': 'Stock adjusted successfully'
            }

        except Exception as e:
            _logger.error("Stock adjustment error: %s", str(e))
            return {'success': False, 'error': str(e)}

    @http.route('/api/merchant/payment/init', auth='user', type='json', methods=['POST'])
    def api_init_payment(self, **kwargs):
        """Initialize Mobile Money payment."""
        redirect = _ensure_merchant()
        if redirect:
            return {'error': 'Unauthorized'}

        try:
            data = json.loads(request.httprequest.data)

            # Call ifn_payments_mobile API
            # Mock implementation
            return {
                'success': True,
                'transaction_id': f'TXN_{datetime.now().strftime("%Y%m%d%H%M%S")}',
                'status': 'pending',
                'message': 'Payment initiated'
            }

        except Exception as e:
            _logger.error("Payment initialization error: %s", str(e))
            return {'success': False, 'error': str(e)}