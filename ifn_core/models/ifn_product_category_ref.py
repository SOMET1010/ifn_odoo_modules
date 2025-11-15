# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class IFNProductCategoryRef(models.Model):
    _name = 'ifn.product.category.ref'
    _description = 'Catégorie de produit IFN (Référentiel)'
    _order = 'parent_path'
    _parent_name = 'parent_id'
    _parent_store = True
    _rec_name = 'display_name'
    _sql_constraints = [
        ('code_unique', 'unique(code)', 'Le code de la catégorie doit être unique !'),
    ]

    # Informations générales
    name = fields.Char('Nom de la catégorie', required=True, translate=True)
    code = fields.Char('Code catégorie', required=True, size=20,
                      help='Code interne unique de la catégorie')
    display_name = fields.Char('Nom affiché', compute='_compute_display_name', store=True)

    # Hiérarchie
    parent_id = fields.Many2one('ifn.product.category.ref', string='Catégorie parente',
                               ondelete='cascade', index=True)
    parent_path = fields.Char('Chemin hiérarchique', index=True, unaccent=False)
    child_ids = fields.One2many('ifn.product.category.ref', 'parent_id',
                               string='Sous-catégories')
    child_count = fields.Integer('Nombre de sous-catégories',
                                compute='_compute_child_count')

    # Description et classification
    description = fields.Text('Description', translate=True)
    category_type = fields.Selection([
        ('agricultural', 'Produit agricole'),
        ('livestock', 'Élevage'),
        ('processed', 'Produit transformé'),
        ('fishery', 'Pêche/Aquaculture'),
        ('service', 'Service'),
        ('input', 'Intrant agricole'),
        ('equipment', 'Équipement'),
        ('other', 'Autre'),
    ], string='Type de catégorie', required=True, default='agricultural')

    # Codes et normes
    hs_code = fields.Char('Code HS (Système Harmonisé)',
                         help='Code international pour les douanes')
    cpc_code = fields.Char('Code CPC (Classification Centrale des Produits)')
    local_code = fields.Char('Code local/national')

    # Caractéristiques
    perishable = fields.Boolean('Produit périssable', default=False,
                               help='Indique si le produit nécessite un stockage spécial')
    seasonal = fields.Boolean('Produit saisonnier', default=False)
    certification_required = fields.Boolean('Certification requise', default=False)

    # Unités de mesure
    uom_id = fields.Many2one('uom.uom', string='Unité de mesure principale',
                            required=True,
                            default=lambda self: self.env.ref('uom.product_uom_kgm'))
    allowed_uom_ids = fields.Many2many('uom.uom', string='Unités autorisées')

    # Prix et marché
    min_price = fields.Float('Prix minimum', digits='Product Price',
                            help='Prix de référence minimum')
    max_price = fields.Float('Prix maximum', digits='Product Price',
                            help='Prix de référence maximum')
    price_currency_id = fields.Many2one('res.currency', string='Devise',
                                       default=lambda self: self.env.company.currency_id)

    # Configuration et flux
    active = fields.Boolean('Actif', default=True)
    is_commodity = fields.Boolean('Matière première', default=False,
                                 help='Produit de base pour transformation')
    is_final_product = fields.Boolean('Produit final', default=False)
    can_be_exported = fields.Boolean('Exportable', default=True)

    # Stock et logistique
    storage_requirements = fields.Text('Exigences de stockage')
    shelf_life_days = fields.Integer('Durée de conservation (jours)')
    storage_temperature_min = fields.Float('Température min (°C)')
    storage_temperature_max = fields.Float('Température max (°C)')

    # Relations avec les produits standards Odoo
    product_category_id = fields.Many2one('product.category',
                                         string='Catégorie produit Odoo')
    product_template_ids = fields.One2many('product.template',
                                          'ifn_category_ref_id',
                                          string='Produits liés')
    product_count = fields.Integer('Nombre de produits',
                                  compute='_compute_product_count')

    # Taxes et réglementations
    vat_rate = fields.Float('Taux TVA (%)', digits=(5, 2),
                           help='Taux de TVA applicable par défaut')
    excise_tax = fields.Float('Taxe d\'accise (%)', digits=(5, 2))
    import_duty = fields.Float('Droits d\'importation (%)', digits=(5, 2))

    @api.depends('name', 'code', 'parent_id')
    def _compute_display_name(self):
        for category in self:
            if category.parent_id and category.parent_id.display_name:
                category.display_name = f"{category.parent_id.display_name} / {category.name}"
            elif category.code:
                category.display_name = f"[{category.code}] {category.name}"
            else:
                category.display_name = category.name

    @api.depends('child_ids')
    def _compute_child_count(self):
        for category in self:
            category.child_count = len(category.child_ids)

    @api.depends('product_template_ids')
    def _compute_product_count(self):
        for category in self:
            category.product_count = len(category.product_template_ids)

    @api.constrains('parent_id')
    def _check_hierarchy(self):
        for category in self:
            if category.parent_id and category.parent_id.id == category.id:
                raise ValidationError(_('Une catégorie ne peut pas être sa propre parente'))
            # Vérifier les cycles dans la hiérarchie
            parent = category.parent_id
            while parent:
                if parent.id == category.id:
                    raise ValidationError(_('Cycle détecté dans la hiérarchie des catégories'))
                parent = parent.parent_id

    @api.constrains('min_price', 'max_price')
    def _check_prices(self):
        for category in self:
            if category.min_price and category.max_price:
                if category.min_price > category.max_price:
                    raise ValidationError(_('Le prix minimum ne peut pas être supérieur au prix maximum'))

    @api.constrains('shelf_life_days')
    def _check_shelf_life(self):
        for category in self:
            if category.shelf_life_days and category.shelf_life_days <= 0:
                raise ValidationError(_('La durée de conservation doit être positive'))

    @api.constrains('storage_temperature_min', 'storage_temperature_max')
    def _check_temperature(self):
        for category in self:
            if (category.storage_temperature_min and
                category.storage_temperature_max and
                category.storage_temperature_min > category.storage_temperature_max):
                raise ValidationError(_('La température minimale ne peut pas être supérieure à la température maximale'))

    def action_view_children(self):
        """Action pour voir les sous-catégories"""
        self.ensure_one()
        return {
            'name': _('Sous-catégories de %s') % self.name,
            'view_mode': 'tree,form',
            'res_model': 'ifn.product.category.ref',
            'domain': [('parent_id', '=', self.id)],
            'type': 'ir.actions.act_window',
            'context': {'default_parent_id': self.id},
        }

    def action_view_products(self):
        """Action pour voir les produits de cette catégorie"""
        self.ensure_one()
        return {
            'name': _('Produits de %s') % self.name,
            'view_mode': 'tree,form',
            'res_model': 'product.template',
            'domain': [('ifn_category_ref_id', '=', self.id)],
            'type': 'ir.actions.act_window',
        }

    def get_full_code(self):
        """Retourne le code complet avec hiérarchie"""
        self.ensure_one()
        if self.parent_id:
            return f"{self.parent_id.get_full_code()}.{self.code}"
        return self.code

    def name_get(self):
        result = []
        for category in self:
            name = category.display_name
            if category.category_type:
                name = f"{name} ({dict(category._fields['category_type'].selection).get(category.category_type)})}"
            result.append((category.id, name))
        return result

    @api.model
    def name_search(self, name='', args=None, operator='ilike', limit=100):
        args = args or []
        domain = []
        if name:
            domain = ['|', ('name', operator, name), ('code', operator, name)]
        categories = self.search(domain + args, limit=limit)
        return categories.name_get()

    @api.model
    def get_root_categories(self):
        """Retourne les catégories racine"""
        return self.search([('parent_id', '=', False)])

    def get_all_children(self):
        """Retourne récursivement tous les enfants"""
        self.ensure_one()
        children = self.child_ids
        for child in self.child_ids:
            children |= child.get_all_children()
        return children