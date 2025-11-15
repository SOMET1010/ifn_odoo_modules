# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class IFNZone(models.Model):
    _name = 'ifn.zone'
    _description = 'Zone IFN'
    _order = 'code'
    _rec_name = 'display_name'
    _sql_constraints = [
        ('code_unique', 'unique(code)', 'Le code de la zone doit être unique !'),
    ]

    # Informations générales
    name = fields.Char('Nom de la zone', required=True, translate=True)
    code = fields.Char('Code zone', required=True, size=10,
                      help='Code interne unique de la zone')
    display_name = fields.Char('Nom affiché', compute='_compute_display_name', store=True)

    # Type et hiérarchie
    zone_type = fields.Selection([
        ('administrative', 'Administrative'),
        ('logistical', 'Logistique'),
        ('geographic', 'Géographique'),
        ('market', 'Zone de marché'),
        ('collection', 'Zone de collecte'),
    ], string='Type de zone', default='geographic', required=True)

    parent_id = fields.Many2one('ifn.zone', string='Zone parente',
                               ondelete='cascade')
    child_ids = fields.One2many('ifn.zone', 'parent_id', string='Sous-zones')
    level = fields.Integer('Niveau', compute='_compute_level', store=True)

    # Géolocalisation
    partner_latitude = fields.Float('Latitude centrale', digits=(10, 6))
    partner_longitude = fields.Float('Longitude centrale', digits=(10, 6))
    geo_point = fields.GeoPoint('Coordonnées géographiques',
                               compute='_compute_geo_point', store=True)

    # Géométrie (si utilisation de PostGIS)
    geometry = fields.GeoPolygon('Géométrie de la zone')
    area_km2 = fields.Float('Superficie (km²)', compute='_compute_area', store=True)

    # Relations
    market_ids = fields.Many2many('ifn.market', string='Marchés couverts')
    coop_ids = fields.Many2many('ifn.coop', string='Coopératives couvertes')

    # Statut et configuration
    active = fields.Boolean('Actif', default=True)
    description = fields.Text('Description', translate=True)
    notes = fields.Text('Notes internes')

    # Collecte de données
    collection_days = fields.Char('Jours de collecte',
                                 help='Ex: Lundi, Mercredi, Samedi')
    collection_schedule = fields.Char('Horaires de collecte')
    has_collection_point = fields.Boolean('Point de collecte dédié')

    # Contact local
    contact_name = fields.Char('Contact local')
    contact_phone = fields.Char('Téléphone contact')
    contact_email = fields.Char('Email contact')

    # Statistiques
    market_count = fields.Integer('Nombre de marchés',
                                 compute='_compute_counts', store=True)
    coop_count = fields.Integer('Nombre de coopératives',
                               compute='_compute_counts', store=True)
    partner_count = fields.Integer('Nombre de partenaires',
                                  compute='_compute_partner_count')

    @api.depends('name', 'code')
    def _compute_display_name(self):
        for zone in self:
            if zone.code:
                zone.display_name = f"[{zone.code}] {zone.name}"
            else:
                zone.display_name = zone.name

    @api.depends('parent_id')
    def _compute_level(self):
        for zone in self:
            if zone.parent_id:
                zone.level = zone.parent_id.level + 1
            else:
                zone.level = 0

    @api.depends('partner_latitude', 'partner_longitude')
    def _compute_geo_point(self):
        for zone in self:
            if zone.partner_latitude and zone.partner_longitude:
                zone.geo_point = fields.GeoPoint.from_latlon(
                    cr=self.env.cr,
                    latitude=zone.partner_latitude,
                    longitude=zone.partner_longitude
                )
            else:
                zone.geo_point = False

    @api.depends('geometry')
    def _compute_area(self):
        """Calcul de la superficie si géométrie disponible"""
        for zone in self:
            if zone.geometry:
                try:
                    # Utilisation de PostGIS si disponible
                    zone.area_km2 = self.env.cr.execute("""
                        SELECT ST_Area(ST_Transform(geometry, 4326)) / 1000000
                        FROM ifn_zone WHERE id = %s
                    """, [zone.id])[0][0] or 0.0
                except Exception:
                    zone.area_km2 = 0.0
            else:
                zone.area_km2 = 0.0

    @api.depends('market_ids', 'coop_ids')
    def _compute_counts(self):
        for zone in self:
            zone.market_count = len(zone.market_ids)
            zone.coop_count = len(zone.coop_ids)

    def _compute_partner_count(self):
        """Compte les partenaires dans les marchés/coops de la zone"""
        for zone in self:
            partners = self.env['res.partner']
            if zone.market_ids:
                partners |= self.env['res.partner'].search([
                    ('x_ifn_market_id', 'in', zone.market_ids.ids)
                ])
            if zone.coop_ids:
                partners |= self.env['res.partner'].search([
                    ('x_ifn_coop_id', 'in', zone.coop_ids.ids)
                ])
            zone.partner_count = len(partners)

    @api.constrains('partner_latitude', 'partner_longitude')
    def _check_coordinates(self):
        for zone in self:
            if zone.partner_latitude and not (-90 <= zone.partner_latitude <= 90):
                raise ValidationError(_('La latitude doit être entre -90 et 90 degrés'))
            if zone.partner_longitude and not (-180 <= zone.partner_longitude <= 180):
                raise ValidationError(_('La longitude doit être entre -180 et 180 degrés'))

    @api.constrains('parent_id')
    def _check_hierarchy(self):
        for zone in self:
            if zone.parent_id and zone.parent_id.id == zone.id:
                raise ValidationError(_('Une zone ne peut pas être sa propre parente'))
            # Vérifier les cycles dans la hiérarchie
            parent = zone.parent_id
            while parent:
                if parent.id == zone.id:
                    raise ValidationError(_('Cycle détecté dans la hiérarchie des zones'))
                parent = parent.parent_id

    def action_view_markets(self):
        """Action pour voir les marchés de la zone"""
        self.ensure_one()
        return {
            'name': _('Marchés de %s') % self.name,
            'view_mode': 'tree,form',
            'res_model': 'ifn.market',
            'domain': [('id', 'in', self.market_ids.ids)],
            'type': 'ir.actions.act_window',
        }

    def action_view_coops(self):
        """Action pour voir les coopératives de la zone"""
        self.ensure_one()
        return {
            'name': _('Coopératives de %s') % self.name,
            'view_mode': 'tree,form',
            'res_model': 'ifn.coop',
            'domain': [('id', 'in', self.coop_ids.ids)],
            'type': 'ir.actions.act_window',
        }

    def get_full_name(self):
        """Retourne le nom complet avec hiérarchie"""
        self.ensure_one()
        if self.parent_id:
            return f"{self.parent_id.get_full_name()} / {self.name}"
        return self.name

    def name_get(self):
        result = []
        for zone in self:
            name = zone.display_name
            if zone.level > 0:
                name = f"{name} ({zone.zone_type})"
            result.append((zone.id, name))
        return result

    @api.model
    def name_search(self, name='', args=None, operator='ilike', limit=100):
        args = args or []
        domain = []
        if name:
            domain = ['|', ('name', operator, name), ('code', operator, name)]
        zones = self.search(domain + args, limit=limit)
        return zones.name_get()