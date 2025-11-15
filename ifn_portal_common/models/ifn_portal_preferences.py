# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError


class IFNPortalPreferences(models.Model):
    _name = 'ifn.portal.preferences'
    _description = 'IFN Portal User Preferences'
    _rec_name = 'user_id'
    _order = 'user_id'

    # Champs principaux
    user_id = fields.Many2one('res.users', string='Utilisateur', required=True, ondelete='cascade')
    partner_id = fields.Many2one('res.partner', related='user_id.partner_id', store=True)

    # Préférences de langue
    language = fields.Selection([
        ('fr_FR', 'Français'),
        ('ba_BA', 'Baoulé'),
        ('di_DJ', 'Dioula'),
    ], string='Langue', default='fr_FR', required=True)

    # Préférences d'accessibilité
    high_contrast = fields.Boolean(string='Contraste élevé', default=False)
    font_size = fields.Selection([
        ('normal', 'Normal'),
        ('large', 'Grand'),
        ('extra-large', 'Très grand'),
    ], string='Taille de police', default='normal')

    # Préférences avancées
    voice_enabled = fields.Boolean(string='Assistance vocale', default=False)
    reduced_motion = fields.Boolean(string='Mouvement réduit', default=False)

    # Préférences PWA
    pwa_notifications = fields.Boolean(string='Notifications PWA', default=True)
    offline_mode = fields.Boolean(string='Mode hors ligne', default=True)
    auto_sync = fields.Boolean(string='Synchronisation automatique', default=True)

    # Préférences d'affichage
    items_per_page = fields.Integer(string='Éléments par page', default=20)
    show_tooltips = fields.Boolean(string='Afficher les infobulles', default=True)

    # Consentements
    analytics_consent = fields.Boolean(string='Consentement analytics', default=False)
    marketing_consent = fields.Boolean(string='Consentement marketing', default=False)
    cookies_consent = fields.Boolean(string='Consentement cookies', default=False)

    # Métadonnées
    created_at = fields.Datetime(string='Créé le', default=fields.Datetime.now, readonly=True)
    updated_at = fields.Datetime(string='Mis à jour le', default=fields.Datetime.now, readonly=True)
    last_login = fields.Datetime(string='Dernière connexion', readonly=True)

    # Statistiques
    portal_visits = fields.Integer(string='Visites du portail', default=0, readonly=True)
    mobile_visits = fields.Integer(string='Visites mobile', default=0, readonly=True)
    desktop_visits = fields.Integer(string='Visites desktop', default=0, readonly=True)

    _sql_constraints = [
        ('unique_user', 'UNIQUE(user_id)', 'Chaque utilisateur ne peut avoir qu\'un seul jeu de préférences.'),
    ]

    @api.model
    def get_or_create_preferences(self, user_id):
        """Récupère ou crée les préférences d'un utilisateur"""
        prefs = self.search([('user_id', '=', user_id)])
        if not prefs:
            user = self.env['res.users'].browse(user_id)
            prefs = self.create({
                'user_id': user_id,
                'language': user.lang or 'fr_FR',
            })
        return prefs

    @api.model
    def update_preferences(self, user_id, values):
        """Met à jour les préférences d'un utilisateur"""
        prefs = self.get_or_create_preferences(user_id)

        # Valider les valeurs
        self._validate_preferences(values)

        # Mettre à jour
        prefs.write({
            **values,
            'updated_at': fields.Datetime.now(),
        })

        return prefs

    def _validate_preferences(self, values):
        """Valide les valeurs des préférences"""
        if 'items_per_page' in values:
            if values['items_per_page'] < 5 or values['items_per_page'] > 100:
                raise ValidationError(_('Le nombre d\'éléments par page doit être entre 5 et 100.'))

    def update_portal_visits(self, is_mobile=False):
        """Met à jour les statistiques de visites"""
        self.ensure_one()
        self.write({
            'portal_visits': self.portal_visits + 1,
            'mobile_visits': self.mobile_visits + (1 if is_mobile else 0),
            'desktop_visits': self.desktop_visits + (0 if is_mobile else 1),
            'last_login': fields.Datetime.now(),
        })

    def reset_preferences(self):
        """Réinitialise les préférences aux valeurs par défaut"""
        self.ensure_one()
        default_values = {
            'language': 'fr_FR',
            'high_contrast': False,
            'font_size': 'normal',
            'voice_enabled': False,
            'reduced_motion': False,
            'pwa_notifications': True,
            'offline_mode': True,
            'auto_sync': True,
            'items_per_page': 20,
            'show_tooltips': True,
            'analytics_consent': False,
            'marketing_consent': False,
            'cookies_consent': False,
        }
        self.write(default_values)

    def export_preferences(self):
        """Exporte les préférences au format JSON"""
        self.ensure_one()
        import json
        prefs_data = {
            'user_id': self.user_id.id,
            'preferences': {
                'language': self.language,
                'high_contrast': self.high_contrast,
                'font_size': self.font_size,
                'voice_enabled': self.voice_enabled,
                'reduced_motion': self.reduced_motion,
                'pwa_notifications': self.pwa_notifications,
                'offline_mode': self.offline_mode,
                'auto_sync': self.auto_sync,
                'items_per_page': self.items_per_page,
                'show_tooltips': self.show_tooltips,
                'analytics_consent': self.analytics_consent,
                'marketing_consent': self.marketing_consent,
                'cookies_consent': self.cookies_consent,
            },
            'statistics': {
                'portal_visits': self.portal_visits,
                'mobile_visits': self.mobile_visits,
                'desktop_visits': self.desktop_visits,
                'last_login': self.last_login.isoformat() if self.last_login else None,
            }
        }
        return json.dumps(prefs_data, indent=2, ensure_ascii=False)

    def import_preferences(self, json_data):
        """Importe les préférences depuis JSON"""
        self.ensure_one()
        import json

        try:
            data = json.loads(json_data)
            if 'preferences' in data:
                self.update_preferences(self.user_id.id, data['preferences'])
        except json.JSONDecodeError:
            raise UserError(_('Format JSON invalide.'))

    @api.model
    def get_user_analytics_data(self, user_id):
        """Récupère les données analytics pour un utilisateur"""
        prefs = self.search([('user_id', '=', user_id)])
        if not prefs:
            return {}

        return {
            'user_id': user_id,
            'language': prefs.language,
            'high_contrast': prefs.high_contrast,
            'voice_enabled': prefs.voice_enabled,
            'portal_visits': prefs.portal_visits,
            'mobile_usage_ratio': prefs.mobile_visits / max(prefs.portal_visits, 1),
            'last_login': prefs.last_login,
            'preferences_updated': prefs.updated_at,
        }