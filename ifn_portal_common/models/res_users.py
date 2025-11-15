# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class ResUsers(models.Model):
    _inherit = 'res.users'

    # Champs IFN
    ifn_uid = fields.Char(string='UID IFN', help="Identifiant unique IFN")
    ifn_phone_verified = fields.Boolean(string='Téléphone vérifié', default=False)
    ifn_email_verified = fields.Boolean(string='Email vérifié', default=False)
    ifn_kyc_level = fields.Selection([
        ('0', 'Non vérifié'),
        ('1', 'Basique'),
        ('2', 'Standard'),
        ('3', 'Complet'),
    ], string='Niveau KYC', default='0')

    # Préférences portail
    ifn_language = fields.Selection([
        ('fr_FR', 'Français'),
        ('ba_BA', 'Baoulé'),
        ('di_DJ', 'Dioula'),
    ], string='Langue IFN', default='fr_FR')
    ifn_high_contrast = fields.Boolean(string='Contraste élevé', default=False)
    ifn_font_size = fields.Selection([
        ('normal', 'Normal'),
        ('large', 'Grand'),
        ('extra-large', 'Très grand'),
    ], string='Taille de police IFN', default='normal')
    ifn_voice_enabled = fields.Boolean(string='Assistance vocale', default=False)

    # Métadonnées portail
    ifn_last_login = fields.Datetime(string='Dernière connexion portail')
    ifn_login_count = fields.Integer(string='Nombre de connexions portail', default=0)
    ifn_last_device = fields.Char(string='Dernier appareil utilisé')
    ifn_last_ip = fields.Char(string='Dernière adresse IP')

    @api.model
    def create(self, vals):
        """Crée un utilisateur avec les champs IFN"""
        if 'ifn_uid' not in vals:
            # Générer un UID IFN unique
            vals['ifn_uid'] = self._generate_ifn_uid()

        return super(ResUsers, self).create(vals)

    def _generate_ifn_uid(self):
        """Génère un UID IFN unique"""
        import uuid
        return 'IFN-' + str(uuid.uuid4()).upper()[:8]

    def write(self, vals):
        """Met à jour un utilisateur avec validation des champs IFN"""
        if 'ifn_uid' in vals:
            if self.search([('ifn_uid', '=', vals['ifn_uid']), ('id', '!=', self.id)]):
                raise UserError(_('Cet UID IFN existe déjà.'))

        return super(ResUsers, self).write(vals)

    def update_ifn_preferences(self, values):
        """Met à jour les préférences IFN de l'utilisateur"""
        allowed_fields = [
            'ifn_language', 'ifn_high_contrast', 'ifn_font_size', 'ifn_voice_enabled'
        ]

        update_vals = {k: v for k, v in values.items() if k in allowed_fields}
        if update_vals:
            self.write(update_vals)

    def get_ifn_preferences(self):
        """Récupère les préférences IFN de l'utilisateur"""
        return {
            'language': self.ifn_language or 'fr_FR',
            'high_contrast': self.ifn_high_contrast,
            'font_size': self.ifn_font_size or 'normal',
            'voice_enabled': self.ifn_voice_enabled,
        }

    def update_ifn_login_stats(self, device=None, ip=None):
        """Met à jour les statistiques de connexion portail"""
        vals = {
            'ifn_last_login': fields.Datetime.now(),
            'ifn_login_count': self.ifn_login_count + 1,
        }
        if device:
            vals['ifn_last_device'] = device
        if ip:
            vals['ifn_last_ip'] = ip

        self.write(vals)

    def verify_ifn_phone(self):
        """Marque le téléphone comme vérifié"""
        self.write({'ifn_phone_verified': True})

    def verify_ifn_email(self):
        """Marque l'email comme vérifié"""
        self.write({'ifn_email_verified': True})

    def upgrade_ifn_kyc(self, level):
        """Met à niveau le niveau KYC"""
        if level not in ['0', '1', '2', '3']:
            raise UserError(_('Niveau KYC invalide.'))

        current_level = int(self.ifn_kyc_level or '0')
        new_level = int(level)

        if new_level < current_level:
            raise UserError(_('Impossible de rétrograder le niveau KYC.'))

        self.write({'ifn_kyc_level': level})

    @api.model
    def get_ifn_user_by_uid(self, ifn_uid):
        """Récupère un utilisateur par son UID IFN"""
        user = self.search([('ifn_uid', '=', ifn_uid)], limit=1)
        if not user:
            raise UserError(_('Utilisateur avec UID IFN %s non trouvé.') % ifn_uid)
        return user

    def get_ifn_profile_data(self):
        """Récupère les données du profil IFN"""
        self.ensure_one()
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'ifn_uid': self.ifn_uid,
            'phone': self.phone,
            'kyc_level': self.ifn_kyc_level,
            'phone_verified': self.ifn_phone_verified,
            'email_verified': self.ifn_email_verified,
            'preferences': self.get_ifn_preferences(),
            'last_login': self.ifn_last_login,
            'login_count': self.ifn_login_count,
        }