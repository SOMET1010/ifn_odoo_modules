# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class IFNMarket(models.Model):
    _name = 'ifn.market'
    _description = 'Marché IFN'
    _order = 'code'
    _rec_name = 'display_name'
    _sql_constraints = [
        ('code_unique', 'unique(code)', 'Le code du marché doit être unique !'),
    ]

    # Informations générales
    name = fields.Char('Nom du marché', required=True, translate=True)
    code = fields.Char('Code marché', required=True, size=10,
                      help='Code interne unique du marché')
    display_name = fields.Char('Nom affiché', compute='_compute_display_name', store=True)

    # Localisation
    region = fields.Char('Région', translate=True)
    commune = fields.Char('Commune', translate=True)
    address = fields.Text('Adresse complète')

    # Géolocalisation
    partner_latitude = fields.Float('Latitude', digits=(10, 6))
    partner_longitude = fields.Float('Longitude', digits=(10, 6))
    geo_point = fields.GeoPoint('Coordonnées géographiques',
                               compute='_compute_geo_point', store=True)

    # Contact et gestion
    manager_id = fields.Many2one('res.partner', string='Responsable du marché',
                                domain=[('is_company', '=', True)])
    phone = fields.Char('Téléphone')
    email = fields.Char('Email')

    # Statut et configuration
    active = fields.Boolean('Actif', default=True)
    description = fields.Text('Description', translate=True)

    # Relations
    coop_ids = fields.One2many('ifn.coop', 'market_id', string='Coopératives')
    partner_ids = fields.One2many('res.partner', 'x_ifn_market_id',
                                 string='Partenaires rattachés')

    # Statistiques
    coop_count = fields.Integer('Nombre de coopératives',
                               compute='_compute_counts', store=True)
    partner_count = fields.Integer('Nombre de partenaires',
                                  compute='_compute_counts', store=True)

    @api.depends('name', 'code')
    def _compute_display_name(self):
        for market in self:
            if market.code:
                market.display_name = f"[{market.code}] {market.name}"
            else:
                market.display_name = market.name

    @api.depends('partner_latitude', 'partner_longitude')
    def _compute_geo_point(self):
        for market in self:
            if market.partner_latitude and market.partner_longitude:
                market.geo_point = fields.GeoPoint.from_latlon(
                    cr=self.env.cr,
                    latitude=market.partner_latitude,
                    longitude=market.partner_longitude
                )
            else:
                market.geo_point = False

    @api.depends('coop_ids', 'partner_ids')
    def _compute_counts(self):
        for market in self:
            market.coop_count = len(market.coop_ids)
            market.partner_count = len(market.partner_ids)

    @api.constrains('partner_latitude', 'partner_longitude')
    def _check_coordinates(self):
        for market in self:
            if market.partner_latitude and not (-90 <= market.partner_latitude <= 90):
                raise ValidationError(_('La latitude doit être entre -90 et 90 degrés'))
            if market.partner_longitude and not (-180 <= market.partner_longitude <= 180):
                raise ValidationError(_('La longitude doit être entre -180 et 180 degrés'))

    @api.constrains('email')
    def _check_email(self):
        for market in self:
            if market.email and not '@' in market.email:
                raise ValidationError(_('Veuillez entrer une adresse email valide'))

    def action_view_coops(self):
        """Action pour voir les coopératives du marché"""
        self.ensure_one()
        return {
            'name': _('Coopératives du marché %s') % self.name,
            'view_mode': 'tree,form',
            'res_model': 'ifn.coop',
            'domain': [('market_id', '=', self.id)],
            'type': 'ir.actions.act_window',
            'context': {'default_market_id': self.id},
        }

    def action_view_partners(self):
        """Action pour voir les partenaires du marché"""
        self.ensure_one()
        return {
            'name': _('Partenaires du marché %s') % self.name,
            'view_mode': 'tree,form',
            'res_model': 'res.partner',
            'domain': [('x_ifn_market_id', '=', self.id)],
            'type': 'ir.actions.act_window',
            'context': {'default_x_ifn_market_id': self.id},
        }

    def name_get(self):
        result = []
        for market in self:
            if market.code:
                result.append((market.id, f"[{market.code}] {market.name}"))
            else:
                result.append((market.id, market.name))
        return result

    @api.model
    def name_search(self, name='', args=None, operator='ilike', limit=100):
        args = args or []
        domain = []
        if name:
            domain = ['|', ('name', operator, name), ('code', operator, name)]
        markets = self.search(domain + args, limit=limit)
        return markets.name_get()