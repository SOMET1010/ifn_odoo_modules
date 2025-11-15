# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class ResPartner(models.Model):
    _inherit = 'res.partner'

    # Champs IFN
    ifn_uid = fields.Char(string='UID IFN', help="Identifiant unique IFN")
    ifn_member_type = fields.Selection([
        ('merchant', 'Marchand'),
        ('producer', 'Producteur'),
        ('coop_manager', 'Gestionnaire Coop'),
        ('individual', 'Particulier'),
    ], string='Type membre IFN')

    # Champs de contact
    ifn_primary_phone = fields.Char(string='Téléphone principal IFN')
    ifn_secondary_phone = fields.Char(string='Téléphone secondaire IFN')
    ifn_whatsapp = fields.Char(string='WhatsApp')

    # Localisation
    ifn_region = fields.Char(string='Région IFN')
    ifn_department = fields.Char(string='Département IFN')
    ifn_village = fields.Char(string='Village/Commune IFN')
    ifn_coordinates = fields.Char(string='Coordonnées GPS')

    # Vérification
    ifn_verified = fields.Boolean(string='Vérifié IFN', default=False)
    ifn_verification_date = fields.Datetime(string='Date vérification IFN')
    ifn_verified_by = fields.Many2one('res.users', string='Vérifié par IFN')

    # Activité
    ifn_last_activity = fields.Datetime(string='Dernière activité IFN')
    ifn_activity_count = fields.Integer(string='Nombre d\'activités IFN', default=0)

    @api.model
    def create(self, vals):
        """Crée un partenaire avec les champs IFN"""
        if 'ifn_uid' not in vals and vals.get('is_company', False):
            # Générer un UID IFN pour les entreprises
            vals['ifn_uid'] = self._generate_ifn_uid()

        return super(ResPartner, self).create(vals)

    def _generate_ifn_uid(self):
        """Génère un UID IFN unique"""
        import uuid
        return 'IFN-' + str(uuid.uuid4()).upper()[:12]

    def write(self, vals):
        """Met à jour un partenaire avec validation des champs IFN"""
        if 'ifn_uid' in vals:
            if self.search([('ifn_uid', '=', vals['ifn_uid']), ('id', '!=', self.id)]):
                raise UserError(_('Cet UID IFN existe déjà.'))

        return super(ResPartner, self).write(vals)

    def verify_ifn_partner(self, verifier_id=None):
        """Vérifie le partenaire IFN"""
        self.write({
            'ifn_verified': True,
            'ifn_verification_date': fields.Datetime.now(),
            'ifn_verified_by': verifier_id or self.env.user.id,
        })

    def update_ifn_activity(self):
        """Met à jour l'activité IFN"""
        self.write({
            'ifn_last_activity': fields.Datetime.now(),
            'ifn_activity_count': self.ifn_activity_count + 1,
        })

    def get_ifn_profile_data(self):
        """Récupère les données du profil IFN"""
        self.ensure_one()
        return {
            'id': self.id,
            'name': self.name,
            'ifn_uid': self.ifn_uid,
            'member_type': self.ifn_member_type,
            'email': self.email,
            'phone': self.phone,
            'ifn_primary_phone': self.ifn_primary_phone,
            'ifn_whatsapp': self.ifn_whatsapp,
            'region': self.ifn_region,
            'department': self.ifn_department,
            'village': self.ifn_village,
            'verified': self.ifn_verified,
            'verification_date': self.ifn_verification_date,
            'last_activity': self.ifn_last_activity,
            'activity_count': self.ifn_activity_count,
        }

    @api.model
    def get_ifn_partners_by_type(self, member_type):
        """Récupère les partenaires par type de membre"""
        return self.search([('ifn_member_type', '=', member_type)])

    def send_ifn_notification(self, title, message, notification_type='info'):
        """Envoie une notification IFN"""
        # Implémenter l'envoi de notification
        pass

    def generate_ifn_qr_code(self):
        """Génère le QR code IFN"""
        if not self.ifn_uid:
            raise UserError(_('UID IFN requis pour générer le QR code.'))

        # Implémenter la génération de QR code
        qr_data = {
            'uid': self.ifn_uid,
            'name': self.name,
            'type': self.ifn_member_type,
        }

        return qr_data