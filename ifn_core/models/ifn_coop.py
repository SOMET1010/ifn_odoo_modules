# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class IFNCoop(models.Model):
    _name = 'ifn.coop'
    _description = 'Coopérative IFN'
    _order = 'market_id, code'
    _rec_name = 'display_name'
    _sql_constraints = [
        ('code_unique', 'unique(code)', 'Le code de la coopérative doit être unique !'),
    ]

    # Informations générales
    name = fields.Char('Nom de la coopérative', required=True, translate=True)
    code = fields.Char('Code coopérative', required=True, size=10,
                      help='Code interne unique de la coopérative')
    display_name = fields.Char('Nom affiché', compute='_compute_display_name', store=True)

    # Rattachement
    market_id = fields.Many2one('ifn.market', string='Marché de rattachement',
                               required=True, ondelete='cascade')
    market_code = fields.Char(related='market_id.code', store=True, readonly=True)

    # Localisation
    address = fields.Text('Adresse complète')
    city = fields.Char('Ville')
    country_id = fields.Many2one('res.country', string='Pays')

    # Géolocalisation
    partner_latitude = fields.Float('Latitude', digits=(10, 6))
    partner_longitude = fields.Float('Longitude', digits=(10, 6))
    geo_point = fields.GeoPoint('Coordonnées géographiques',
                               compute='_compute_geo_point', store=True)

    # Contact et gestion
    manager_partner_id = fields.Many2one('res.partner', string='Gestionnaire',
                                        domain="[('x_ifn_role', '=', 'coop_manager')]")
    manager_name = fields.Char('Nom du gestionnaire')
    manager_phone = fields.Char('Téléphone du gestionnaire')
    manager_email = fields.Char('Email du gestionnaire')

    # Contact principal de la coopérative
    phone = fields.Char('Téléphone')
    email = fields.Char('Email')
    website = fields.Char('Site web')

    # Informations légales et administratives
    legal_form = fields.Char('Forme juridique')
    registration_number = fields.Char('Numéro d\'enregistrement')
    tax_id = fields.Char('Identifiant fiscal')

    # Configuration et statut
    active = fields.Boolean('Actif', default=True)
    description = fields.Text('Description', translate=True)
    notes = fields.Text('Notes internes')

    # Capacités et services
    capacity_storage = fields.Float('Capacité de stockage (tonnes)')
    has_cold_storage = fields.Boolean('Stockage frigorifique')
    has_processing = fields.Boolean('Unité de transformation')
    services_offered = fields.Text('Services offerts', translate=True)

    # Relations
    partner_ids = fields.One2many('res.partner', 'x_ifn_coop_id',
                                 string='Membres de la coopérative')
    zone_ids = fields.Many2many('ifn.zone', string='Zones couvertes')

    # Statistiques
    member_count = fields.Integer('Nombre de membres',
                                 compute='_compute_counts', store=True)
    active_member_count = fields.Integer('Membres actifs',
                                        compute='_compute_counts', store=True)

    @api.depends('name', 'code', 'market_id')
    def _compute_display_name(self):
        for coop in self:
            if coop.code and coop.market_id.code:
                coop.display_name = f"[{coop.market_id.code}-{coop.code}] {coop.name}"
            elif coop.code:
                coop.display_name = f"[{coop.code}] {coop.name}"
            else:
                coop.display_name = coop.name

    @api.depends('partner_latitude', 'partner_longitude')
    def _compute_geo_point(self):
        for coop in self:
            if coop.partner_latitude and coop.partner_longitude:
                coop.geo_point = fields.GeoPoint.from_latlon(
                    cr=self.env.cr,
                    latitude=coop.partner_latitude,
                    longitude=coop.partner_longitude
                )
            else:
                coop.geo_point = False

    @api.depends('partner_ids', 'partner_ids.active')
    def _compute_counts(self):
        for coop in self:
            coop.member_count = len(coop.partner_ids)
            coop.active_member_count = len(coop.partner_ids.filtered('active'))

    @api.constrains('partner_latitude', 'partner_longitude')
    def _check_coordinates(self):
        for coop in self:
            if coop.partner_latitude and not (-90 <= coop.partner_latitude <= 90):
                raise ValidationError(_('La latitude doit être entre -90 et 90 degrés'))
            if coop.partner_longitude and not (-180 <= coop.partner_longitude <= 180):
                raise ValidationError(_('La longitude doit être entre -180 et 180 degrés'))

    @api.constrains('email', 'manager_email')
    def _check_emails(self):
        for coop in self:
            for email_field in ['email', 'manager_email']:
                email = getattr(coop, email_field)
                if email and '@' not in email:
                    raise ValidationError(_('Veuillez entrer une adresse email valide'))

    @api.constrains('capacity_storage')
    def _check_capacity(self):
        for coop in self:
            if coop.capacity_storage and coop.capacity_storage < 0:
                raise ValidationError(_('La capacité de stockage ne peut pas être négative'))

    @api.onchange('manager_partner_id')
    def _onchange_manager(self):
        """Auto-remplir les infos du gestionnaire depuis le partenaire sélectionné"""
        if self.manager_partner_id:
            self.manager_name = self.manager_partner_id.name
            self.manager_phone = self.manager_partner_id.phone
            self.manager_email = self.manager_partner_id.email

    def action_view_members(self):
        """Action pour voir les membres de la coopérative"""
        self.ensure_one()
        return {
            'name': _('Membres de %s') % self.name,
            'view_mode': 'tree,form',
            'res_model': 'res.partner',
            'domain': [('x_ifn_coop_id', '=', self.id)],
            'type': 'ir.actions.act_window',
            'context': {
                'default_x_ifn_coop_id': self.id,
                'default_x_ifn_market_id': self.market_id.id,
            },
        }

    def action_add_member(self):
        """Assistant pour ajouter un membre à la coopérative"""
        self.ensure_one()
        return {
            'name': _('Ajouter un membre à %s') % self.name,
            'view_mode': 'form',
            'res_model': 'res.partner',
            'type': 'ir.actions.act_window',
            'context': {
                'default_x_ifn_coop_id': self.id,
                'default_x_ifn_market_id': self.market_id.id,
                'form_view_initial_mode': 'edit',
            },
        }

    def name_get(self):
        result = []
        for coop in self:
            if coop.code and coop.market_id.code:
                result.append((coop.id, f"[{coop.market_id.code}-{coop.code}] {coop.name}"))
            elif coop.code:
                result.append((coop.id, f"[{coop.code}] {coop.name}"))
            else:
                result.append((coop.id, coop.name))
        return result

    @api.model
    def name_search(self, name='', args=None, operator='ilike', limit=100):
        args = args or []
        domain = []
        if name:
            domain = ['|', ('name', operator, name), ('code', operator, name)]
        coops = self.search(domain + args, limit=limit)
        return coops.name_get()