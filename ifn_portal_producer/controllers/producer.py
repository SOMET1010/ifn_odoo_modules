# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
from odoo.addons.ifn_portal_common.controllers.portal import IFNPortalCommon


class IFNPortalProducer(IFNPortalCommon):
    """Contrôleur principal pour le portail producteur IFN"""

    def _prepare_portal_values(self):
        """Prépare les valeurs communes pour le portail producteur"""
        values = super()._prepare_portal_values()
        partner = request.env.user.partner_id

        # Vérifier que l'utilisateur est un producteur
        user_groups = request.env.user.groups_id.mapped('xml_id')
        if 'ifn_core.ifn_group_producer' not in user_groups:
            return None

        # Ajouter les informations spécifiques au producteur
        values.update({
            'producer': partner,
            'page_title': 'Portail Producteur',
            'is_producer': True,
        })

        return values

    @http.route('/portal/producer', auth='user', website=True, type='http')
    def dashboard(self, **kwargs):
        """Tableau de bord principal du producteur avec KPIs"""
        values = self._prepare_portal_values()
        if not values:
            return request.redirect('/my')

        partner = request.env.user.partner_id

        # Récupérer les KPIs du producteur
        try:
            stats = request.env['ifn.kpi.snapshot'].sudo().get_producer_kpis(partner.id)
        except (AttributeError, Exception):
            # En cas d'erreur, utiliser des stats par défaut
            stats = {
                'total_production': 0,
                'sale_rate': 0,
                'total_revenue': 0,
                'social_status': 'Non disponible'
            }

        # Récupérer les dernières activités
        try:
            recent_harvests = request.env['ifn.harvest'].sudo().search([
                ('partner_id', '=', partner.id)
            ], order='create_date desc', limit=5)
        except:
            recent_harvests = []

        try:
            recent_orders = request.env['ifn.sale.order'].sudo().search([
                ('partner_id', '=', partner.id)
            ], order='create_date desc', limit=5)
        except:
            recent_orders = []

        values.update({
            'stats': stats,
            'recent_harvests': recent_harvests,
            'recent_orders': recent_orders,
        })

        return request.render('ifn_portal_producer.page_dashboard', values)

    @http.route('/portal/producer/harvest', auth='user', website=True, type='http')
    def harvest(self, **kwargs):
        """Page de gestion des récoltes"""
        values = self._prepare_portal_values()
        if not values:
            return request.redirect('/my')

        partner = request.env.user.partner_id

        # Récupérer toutes les récoltes du producteur
        harvests = request.env['ifn.harvest'].sudo().search([
            ('partner_id', '=', partner.id)
        ], order='date_harvest desc')

        # Produits disponibles pour les récoltes
        products = request.env['product.product'].sudo().search([
            ('ifn_product_type', '=', 'harvest')
        ])

        values.update({
            'harvests': harvests,
            'products': products,
        })

        return request.render('ifn_portal_producer.page_harvest', values)

    @http.route('/portal/producer/sell', auth='user', website=True, type='http')
    def sell(self, **kwargs):
        """Page de mise en vente des produits"""
        values = self._prepare_portal_values()
        if not values:
            return request.redirect('/my')

        partner = request.env.user.partner_id

        # Récoltes disponibles pour la vente
        available_harvests = request.env['ifn.harvest'].sudo().search([
            ('partner_id', '=', partner.id),
            ('state', '=', 'available'),
            ('quantity_available', '>', 0)
        ])

        # Offres actives du producteur
        active_offers = request.env['ifn.sale.offer'].sudo().search([
            ('partner_id', '=', partner.id),
            ('state', 'in', ['draft', 'published'])
        ])

        values.update({
            'available_harvests': available_harvests,
            'active_offers': active_offers,
        })

        return request.render('ifn_portal_producer.page_sell', values)

    @http.route('/portal/producer/orders', auth='user', website=True, type='http')
    def orders(self, **kwargs):
        """Page des commandes reçues"""
        values = self._prepare_portal_values()
        if not values:
            return request.redirect('/my')

        partner = request.env.user.partner_id

        # Commandes du producteur
        orders = request.env['ifn.sale.order'].sudo().search([
            ('partner_id', '=', partner.id)
        ], order='create_date desc')

        values.update({
            'orders': orders,
        })

        return request.render('ifn_portal_producer.page_orders', values)

    @http.route('/portal/producer/payments', auth='user', website=True, type='http')
    def payments(self, **kwargs):
        """Page de l'historique des paiements"""
        values = self._prepare_portal_values()
        if not values:
            return request.redirect('/my')

        partner = request.env.user.partner_id

        # Paiements reçus
        payments = request.env['account.payment'].sudo().search([
            ('partner_id', '=', partner.id),
            ('state', 'in', ['posted', 'sent'])
        ], order='create_date desc')

        # Transactions Mobile Money
        mobile_payments = request.env['ifn.mobile.payment'].sudo().search([
            ('partner_id', '=', partner.id)
        ], order='create_date desc')

        values.update({
            'payments': payments,
            'mobile_payments': mobile_payments,
        })

        return request.render('ifn_portal_producer.page_payments', values)

    @http.route('/portal/producer/social', auth='user', website=True, type='http')
    def social(self, **kwargs):
        """Page de la protection sociale"""
        values = self._prepare_portal_values()
        if not values:
            return request.redirect('/my')

        partner = request.env.user.partner_id

        # Cotisations sociales
        social_contributions = request.env['ifn.social.cotisation'].sudo().search([
            ('partner_id', '=', partner.id)
        ], order='create_date desc')

        # Statut social actuel
        social_status = request.env['ifn.social.status'].sudo().search([
            ('partner_id', '=', partner.id)
        ], limit=1)

        values.update({
            'social_contributions': social_contributions,
            'social_status': social_status,
        })

        return request.render('ifn_portal_producer.page_social', values)

    @http.route('/portal/producer/training', auth='user', website=True, type='http')
    def training(self, **kwargs):
        """Page de formation et certification"""
        values = self._prepare_portal_values()
        if not values:
            return request.redirect('/my')

        partner = request.env.user.partner_id

        # Cours disponibles
        courses = request.env['ifn.training.course'].sudo().search([
            ('state', '=', 'published')
        ])

        # Progression du producteur
        progress_records = request.env['ifn.training.progress'].sudo().search([
            ('partner_id', '=', partner.id)
        ])

        # Certificats obtenus
        certificates = request.env['ifn.training.certificate'].sudo().search([
            ('partner_id', '=', partner.id),
            ('state', '=', 'issued')
        ])

        values.update({
            'courses': courses,
            'progress_records': progress_records,
            'certificates': certificates,
        })

        return request.render('ifn_portal_producer.page_training', values)

    @http.route('/portal/producer/profile', auth='user', website=True, type='http')
    def profile(self, **kwargs):
        """Page de profil du producteur"""
        values = self._prepare_portal_values()
        if not values:
            return request.redirect('/my')

        partner = request.env.user.partner_id

        # Informations du profil
        values.update({
            'partner': partner,
        })

        return request.render('ifn_portal_producer.page_profile', values)

    # --- API endpoints pour les opérations AJAX ---

    @http.route('/portal/producer/api/harvest/create', auth='user', type='json', methods=['POST'])
    def api_create_harvest(self, **kwargs):
        """API pour créer une nouvelle récolte"""
        try:
            partner_id = request.env.user.partner_id.id
            harvest = request.env['ifn.harvest'].sudo().create({
                'partner_id': partner_id,
                'product_id': kwargs.get('product_id'),
                'quantity': kwargs.get('quantity'),
                'quality': kwargs.get('quality'),
                'date_harvest': kwargs.get('date_harvest'),
                'notes': kwargs.get('notes'),
            })

            return {
                'success': True,
                'harvest_id': harvest.id,
                'message': 'Récolte enregistrée avec succès'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Erreur lors de l\'enregistrement de la récolte'
            }

    @http.route('/portal/producer/api/offer/publish', auth='user', type='json', methods=['POST'])
    def api_publish_offer(self, **kwargs):
        """API pour publier une offre de vente"""
        try:
            partner_id = request.env.user.partner_id.id
            offer = request.env['ifn.sale.offer'].sudo().create({
                'partner_id': partner_id,
                'harvest_id': kwargs.get('harvest_id'),
                'price': kwargs.get('price'),
                'quantity': kwargs.get('quantity'),
                'description': kwargs.get('description'),
                'state': 'published',
            })

            return {
                'success': True,
                'offer_id': offer.id,
                'message': 'Offre publiée avec succès'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Erreur lors de la publication de l\'offre'
            }

    @http.route('/portal/producer/api/order/confirm', auth='user', type='json', methods=['POST'])
    def api_confirm_order(self, order_id, **kwargs):
        """API pour confirmer une commande"""
        try:
            order = request.env['ifn.sale.order'].sudo().browse(order_id)
            if order.partner_id.id != request.env.user.partner_id.id:
                return {
                    'success': False,
                    'message': 'Commande non trouvée'
                }

            order.action_confirm_delivery()

            return {
                'success': True,
                'message': 'Livraison confirmée avec succès'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Erreur lors de la confirmation de livraison'
            }

    @http.route('/portal/producer/api/social/payment', auth='user', type='json', methods=['POST'])
    def api_pay_social_contribution(self, contribution_id, **kwargs):
        """API pour payer une cotisation sociale"""
        try:
            contribution = request.env['ifn.social.cotisation'].sudo().browse(contribution_id)
            if contribution.partner_id.id != request.env.user.partner_id.id:
                return {
                    'success': False,
                    'message': 'Cotisation non trouvée'
                }

            # Initier le paiement Mobile Money
            payment_result = contribution.initiate_mobile_payment()

            return {
                'success': True,
                'payment_url': payment_result.get('payment_url'),
                'message': 'Paiement initié avec succès'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Erreur lors de l\'initiation du paiement'
            }