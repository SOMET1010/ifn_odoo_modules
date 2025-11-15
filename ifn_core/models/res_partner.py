# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError
import logging
from datetime import timedelta

_logger = logging.getLogger(__name__)


class ResPartner(models.Model):
    _name = 'res.partner'
    _inherit = ['res.partner', 'ifn.mixin']
    _description = 'Partenaire IFN'

    # Rôle et profil IFN
    x_ifn_role = fields.Selection([
        ('merchant', 'Marchand'),
        ('producer', 'Producteur'),
        ('coop_manager', 'Gestionnaire Coop'),
        ('agent', 'Agent'),
        ('admin', 'Administrateur'),
    ], string='Rôle IFN', index=True, copy=False,
       help='Rôle principal dans l\'écosystème IFN')

    # Rattachement organisationnel
    x_ifn_market_id = fields.Many2one('ifn.market', string='Marché d\'attache',
                                     index=True, copy=False)
    x_ifn_coop_id = fields.Many2one('ifn.coop', string='Coopérative',
                                    index=True, copy=False)
    x_ifn_market_code = fields.Char(related='x_ifn_market_id.code',
                                    store=True, readonly=True)
    x_ifn_coop_code = fields.Char(related='x_ifn_coop_id.code',
                                  store=True, readonly=True)

    # Géolocalisation
    x_ifn_geo_lat = fields.Float('Latitude IFN', digits=(10, 6), copy=False)
    x_ifn_geo_lng = fields.Float('Longitude IFN', digits=(10, 6), copy=False)
    x_ifn_geo_point = fields.GeoPoint('Position géographique IFN',
                                     compute='_compute_ifn_geo_point', store=True)

    # Préférences linguistiques et vocales
    x_ifn_lang_pref = fields.Selection([
        ('fr', 'Français'),
        ('ba', 'Baoulé'),
        ('di', 'Dioula'),
        ('ci', 'Côte d\'Ivoire'),
        ('en', 'English'),
    ], string='Langue préférée', default='fr', required=True)

    x_ifn_voice_consent = fields.Boolean('Consentement voix',
                                        help='Consentement pour utilisation services vocaux')
    x_ifn_voice_consent_date = fields.Datetime('Date consentement voix')
    x_ifn_voice_pronunciation = fields.Char('Prononciation du nom',
                                           help='Transcription phonétique pour NLU')

    # Photo et identité
    x_ifn_photo = fields.Binary('Photo IFN', attachment=True,
                               help='Photo d\'identité IFN')
    x_ifn_id_card_number = fields.Char('Numéro pièce d\'identité')
    x_ifn_id_card_type = fields.Selection([
        ('cni', 'Carte nationale d\'identité'),
        ('passport', 'Passeport'),
        ('driver_license', 'Permis de conduire'),
        ('residence_card', 'Carte de séjour'),
        ('other', 'Autre'),
    ], string='Type de pièce d\'identité')

    # Placeholders sociaux (CNPS/CNAM/CMU)
    x_ifn_cnps_number = fields.Char('Numéro CNPS',
                                   help='Numéro Caisse Nationale de Prévoyance Sociale')
    x_ifn_cnam_number = fields.Char('Numéro CNAM',
                                   help='Numéro Caisse Nationale d\'Assurance Maladie')
    x_ifn_cmu_number = fields.Char('Numéro CMU',
                                  help='Numéro Couverture Médicale Universelle')

    # Consentements et confidentialité
    x_ifn_data_processing_consent = fields.Boolean('Consentement traitement données',
                                                  help='Consentement RGPD')
    x_ifn_data_processing_consent_date = fields.Datetime('Date consentement traitement')
    x_ifn_marketing_consent = fields.Boolean('Consentement marketing')
    x_ifn_marketing_consent_date = fields.Datetime('Date consentement marketing')

    # Statut et validation
    x_ifn_profile_status = fields.Selection([
        ('draft', 'Brouillon'),
        ('pending_validation', 'En attente de validation'),
        ('validated', 'Validé'),
        ('suspended', 'Suspendu'),
        ('archived', 'Archivé'),
    ], string='Statut du profil', default='draft', required=True, index=True)

    x_ifn_validation_date = fields.Datetime('Date validation')
    x_ifn_validator_id = fields.Many2one('res.users', string='Validé par')
    x_ifn_notes = fields.Text('Notes IFN')

    # Configuration et préférences
    x_ifn_notification_preferences = fields.Selection([
        ('sms', 'SMS'),
        ('email', 'Email'),
        ('voice', 'Voix'),
        ('all', 'Tous'),
    ], string='Préférences notification', default='all')

    x_ifn_timezone = fields.Selection([
        ('UTC', 'UTC'),
        ('Africa/Abidjan', 'Abidjan'),
        ('Africa/Accra', 'Accra'),
        ('Africa/Lagos', 'Lagos'),
    ], string='Fuseau horaire', default='Africa/Abidjan')

    # Relations et dépendances
    x_ifn_family_members = fields.One2many('res.partner', 'x_ifn_family_head_id',
                                          string='Membres de la famille')
    x_ifn_family_head_id = fields.Many2one('res.partner', string='Chef de famille',
                                          domain="[('x_ifn_role', 'in', ['merchant', 'producer'])]")

    @api.depends('x_ifn_geo_lat', 'x_ifn_geo_lng')
    def _compute_ifn_geo_point(self):
        for partner in self:
            if partner.x_ifn_geo_lat and partner.x_ifn_geo_lng:
                partner.x_ifn_geo_point = fields.GeoPoint.from_latlon(
                    cr=self.env.cr,
                    latitude=partner.x_ifn_geo_lat,
                    longitude=partner.x_ifn_geo_lng
                )
            else:
                partner.x_ifn_geo_point = False

    @api.constrains('x_ifn_geo_lat', 'x_ifn_geo_lng')
    def _check_ifn_coordinates(self):
        for partner in self:
            if partner.x_ifn_geo_lat and not (-90 <= partner.x_ifn_geo_lat <= 90):
                raise ValidationError(_('La latitude doit être entre -90 et 90 degrés'))
            if partner.x_ifn_geo_lng and not (-180 <= partner.x_ifn_geo_lng <= 180):
                raise ValidationError(_('La longitude doit être entre -180 et 180 degrés'))

    @api.constrains('x_ifn_role')
    def _check_role_compatibility(self):
        """Vérifie les compatibilités de rôles"""
        for partner in self:
            if partner.x_ifn_role == 'coop_manager' and not partner.x_ifn_coop_id:
                raise ValidationError(_('Un gestionnaire de coopérative doit être rattaché à une coopérative'))

    @api.onchange('x_ifn_voice_consent')
    def _onchange_voice_consent(self):
        """Auto-remplit la date de consentement vocal"""
        if self.x_ifn_voice_consent and not self.x_ifn_voice_consent_date:
            self.x_ifn_voice_consent_date = fields.Datetime.now()

    @api.onchange('x_ifn_data_processing_consent')
    def _onchange_data_processing_consent(self):
        """Auto-remplit la date de consentement traitement données"""
        if self.x_ifn_data_processing_consent and not self.x_ifn_data_processing_consent_date:
            self.x_ifn_data_processing_consent_date = fields.Datetime.now()

    @api.onchange('x_ifn_marketing_consent')
    def _onchange_marketing_consent(self):
        """Auto-remplit la date de consentement marketing"""
        if self.x_ifn_marketing_consent and not self.x_ifn_marketing_consent_date:
            self.x_ifn_marketing_consent_date = fields.Datetime.now()

    def action_validate_profile(self):
        """Valide le profil IFN"""
        self.ensure_one()
        if self.x_ifn_profile_status != 'pending_validation':
            raise UserError(_('Seuls les profils en attente peuvent être validés'))

        # Vérifications de validation
        self._ifn_check_validation_requirements()

        self.write({
            'x_ifn_profile_status': 'validated',
            'x_ifn_validation_date': fields.Datetime.now(),
            'x_ifn_validator_id': self.env.uid,
        })

        # Publier événement de validation
        self._ifn_publish_event('ifn.partner.validated')

    def action_request_validation(self):
        """Demande la validation du profil"""
        self.ensure_one()
        if self.x_ifn_profile_status not in ['draft']:
            raise UserError(_('Seuls les profils brouillon peuvent demander validation'))

        self.write({'x_ifn_profile_status': 'pending_validation'})
        self._ifn_publish_event('ifn.partner.validation_requested')

    def _ifn_check_validation_requirements(self):
        """Vérifie les prérequis pour la validation"""
        required_fields = ['name', 'phone', 'x_ifn_role', 'x_ifn_market_id']
        missing_fields = []

        for field in required_fields:
            if not getattr(self, field):
                missing_fields.append(self._fields[field].string)

        if missing_fields:
            raise ValidationError(_('Les champs suivants sont obligatoires pour la validation: %s') % ', '.join(missing_fields))

        if not self.x_ifn_data_processing_consent:
            raise ValidationError(_('Le consentement traitement données est obligatoire'))

    def action_suspend_profile(self):
        """Suspend le profil IFN"""
        self.ensure_one()
        self.write({'x_ifn_profile_status': 'suspended'})
        self._ifn_publish_event('ifn.partner.suspended')

    def action_archive_profile(self):
        """Archive le profil IFN"""
        self.ensure_one()
        self.write({
            'x_ifn_profile_status': 'archived',
            'active': False,
        })
        self._ifn_publish_event('ifn.partner.archived')

    def action_reactivate_profile(self):
        """Réactive le profil IFN"""
        self.ensure_one()
        self.write({'x_ifn_profile_status': 'validated', 'active': True})
        self._ifn_publish_event('ifn.partner.reactivated')

    def action_send_sms(self, message):
        """Envoie un SMS via le système IFN"""
        self.ensure_one()
        if not self.phone:
            raise UserError(_('Aucun numéro de téléphone disponible'))

        # Logique d'envoi SMS à implémenter selon provider
        _logger.info(f"SMS envoyé à {self.phone}: {message}")

    def _ifn_get_notification_channel(self):
        """Retourne le canal de notification préféré"""
        if self.x_ifn_notification_preferences == 'sms' and self.phone:
            return 'sms'
        elif self.x_ifn_notification_preferences == 'email' and self.email:
            return 'email'
        elif self.x_ifn_notification_preferences == 'voice' and self.phone:
            return 'voice'
        elif self.x_ifn_notification_preferences == 'all':
            return 'all'
        return 'email'  # Par défaut

    def _ifn_get_display_name_with_role(self):
        """Retourne le nom d'affichage avec rôle IFN"""
        if self.x_ifn_role:
            role_label = dict(self._fields['x_ifn_role'].selection).get(self.x_ifn_role)
            return f"{self.name} ({role_label})"
        return self.name

    @api.model
    def create(self, vals):
        """Surcharge pour la logique IFN spécifique"""
        # Auto-assigner le rôle depuis le contexte si disponible
        if 'x_ifn_role' not in vals and self.env.context.get('default_ifn_role'):
            vals['x_ifn_role'] = self.env.context['default_ifn_role']

        partner = super().create(vals)

        # Publier événement création partenaire IFN
        if partner.x_ifn_role:
            partner._ifn_publish_event('ifn.partner.created')

        return partner

    def write(self, vals):
        """Surcharge pour la logique IFN spécifique"""
        # Tracker changements de rôle
        old_role = self.x_ifn_role if len(self) == 1 else None
        old_market = self.x_ifn_market_id if len(self) == 1 else None
        old_coop = self.x_ifn_coop_id if len(self) == 1 else None

        result = super().write(vals)

        # Publier événements pour changements importants
        if len(self) == 1:
            if 'x_ifn_role' in vals and vals['x_ifn_role'] != old_role:
                self._ifn_publish_event('ifn.partner.role_changed')
            if 'x_ifn_market_id' in vals and vals['x_ifn_market_id'] != old_market:
                self._ifn_publish_event('ifn.partner.market_changed')
            if 'x_ifn_coop_id' in vals and vals['x_ifn_coop_id'] != old_coop:
                self._ifn_publish_event('ifn.partner.coop_changed')

        return result

    def _get_sensitive_fields(self):
        """Retourne les champs sensibles pour l'audit"""
        return super()._get_sensitive_fields() + [
            'x_ifn_role', 'x_ifn_market_id', 'x_ifn_coop_id',
            'x_ifn_geo_lat', 'x_ifn_geo_lng', 'x_ifn_voice_consent',
            'x_ifn_data_processing_consent', 'x_ifn_id_card_number'
        ]

    @api.model
    def _ifn_refresh_expired_qr_codes(self):
        """CRON Job: Rafraîchit les QR codes expirés"""
        ttl_days = int(self.env['ir.config_parameter'].sudo().get_param(
            'ifn_core.qr_ttl_days', '365'
        ))

        if ttl_days <= 0:
            return

        cutoff_date = fields.Datetime.now() - timedelta(days=ttl_days)
        expired_partners = self.search([
            ('x_ifn_qr_generated_date', '<', cutoff_date),
            ('x_ifn_uid', '!=', False),
            ('active', '=', True)
        ])

        _logger.info(f"Refreshing {len(expired_partners)} expired QR codes")

        for partner in expired_partners:
            try:
                partner._ifn_generate_qr()
                partner._ifn_publish_event('ifn.qr.refreshed')
            except Exception as e:
                _logger.error(f"Failed to refresh QR for partner {partner.id}: {str(e)}")

        return len(expired_partners)

    @api.model
    def _ifn_daily_data_sync(self):
        """CRON Job: Synchronisation quotidienne des données"""
        # Synchroniser les données des partenaires avec les systèmes externes
        _logger.info("Starting daily IFN data synchronization")

        partenaires_sync_count = 0
        partners = self.search([('x_ifn_role', '!=', False), ('active', '=', True)])

        for partner in partners:
            try:
                # Vérifier la cohérence des données
                if partner.x_ifn_coop_id and partner.x_ifn_coop_id.market_id != partner.x_ifn_market_id:
                    _logger.warning(f"Inconsistent data for partner {partner.name}: coop market doesn't match partner market")

                partenaires_sync_count += 1

            except Exception as e:
                _logger.error(f"Sync error for partner {partner.id}: {str(e)}")

        _logger.info(f"Daily sync completed for {partenaires_sync_count} partners")
        return partenaires_sync_count

    @api.model
    def _ifn_send_validation_reminders(self):
        """CRON Job: Envoie des rappels de validation de profil"""
        # Envoyer des rappels pour les profils en attente depuis plus de 7 jours
        cutoff_date = fields.Datetime.now() - timedelta(days=7)
        pending_partners = self.search([
            ('x_ifn_profile_status', '=', 'pending_validation'),
            ('x_ifn_created_date', '<', cutoff_date),
            ('email', '!=', False),
            ('active', '=', True)
        ])

        _logger.info(f"Sending validation reminders to {len(pending_partners)} partners")

        reminder_count = 0
        for partner in pending_partners:
            try:
                # TODO: Envoyer email de rappel
                # template = self.env.ref('ifn_core.email_template_validation_reminder')
                # if template:
                #     template.send_mail(partner.id, force_send=True)
                reminder_count += 1

            except Exception as e:
                _logger.error(f"Failed to send validation reminder to {partner.email}: {str(e)}")

        return reminder_count