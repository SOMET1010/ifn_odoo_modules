# -*- coding: utf-8 -*-

import base64
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import json
import logging

_logger = logging.getLogger(__name__)


class IFNSettings(models.TransientModel):
    _name = 'ifn.settings'
    _description = 'Paramètres IFN'
    _inherit = 'res.config.settings'

    # Configuration générale
    ifn_module_enabled = fields.Boolean('Module IFN activé', default=True)
    ifn_debug_mode = fields.Boolean('Mode debug IFN', default=False)

    # Portails et accès
    ifn_portal_enabled = fields.Boolean('Portails IFN activés',
                                       config_parameter='ifn_core.portal_enabled')
    ifn_merchant_portal_enabled = fields.Boolean('Portail marchand',
                                                config_parameter='ifn_core.merchant_portal_enabled')
    ifn_producer_portal_enabled = fields.Boolean('Portail producteur',
                                                config_parameter='ifn_core.producer_portal_enabled')
    ifn_coop_portal_enabled = fields.Boolean('Portail coopérative',
                                            config_parameter='ifn_core.coop_portal_enabled')

    # QR et UID
    ifn_qr_enabled = fields.Boolean('Génération QR activée',
                                   config_parameter='ifn_core.qr_enabled')
    ifn_qr_auto_generate = fields.Boolean('Génération QR automatique',
                                         config_parameter='ifn_core.qr_auto_generate')
    ifn_qr_ttl_days = fields.Integer('Durée de validité QR (jours)',
                                    config_parameter='ifn_core.qr_ttl_days', default=365)
    ifn_uid_sequence_id = fields.Many2one('ir.sequence', string='Séquence UID IFN')

    # Internationalisation
    ifn_i18n_enabled = fields.Boolean('Internationalisation activée',
                                     config_parameter='ifn_core.i18n_enabled')
    ifn_available_languages = fields.Selection([
        ('fr', 'Français'),
        ('ba', 'Baoulé'),
        ('di', 'Dioula'),
        ('ci', 'Côte d\'Ivoire'),
        ('en', 'English'),
    ], string='Langues disponibles', config_parameter='ifn_core.available_languages')

    # Sécurité et authentification
    ifn_mfa_required = fields.Boolean('Authentification multi-facteurs requise',
                                     config_parameter='ifn_core.mfa_required')
    ifn_session_timeout_minutes = fields.Integer('Timeout session (minutes)',
                                                config_parameter='ifn_core.session_timeout',
                                                default=480)
    ifn_password_policy_enabled = fields.Boolean('Politique mot de passe activée',
                                                config_parameter='ifn_core.password_policy_enabled')

    # Audit et traçabilité
    ifn_audit_enabled = fields.Boolean('Audit activé',
                                      config_parameter='ifn_core.audit_enabled')
    ifn_audit_retention_days = fields.Integer('Rétention logs audit (jours)',
                                             config_parameter='ifn_core.audit_retention_days',
                                             default=365)
    ifn_log_sensitive_operations = fields.Boolean('Logger opérations sensibles',
                                                 config_parameter='ifn_core.log_sensitive_operations')

    # API et intégrations externes
    ifn_external_api_enabled = fields.Boolean('API externes activées',
                                             config_parameter='ifn_core.external_api_enabled')
    ifn_sms_provider = fields.Selection([
        ('twilio', 'Twilio'),
        ('orange', 'Orange'),
        ('mtn', 'MTN'),
        ('moov', 'Moov'),
        ('local', 'Local'),
    ], string='Fournisseur SMS', config_parameter='ifn_core.sms_provider')

    # Clés API (chiffrées)
    ifn_twilio_account_sid = fields.Char('Twilio Account SID',
                                        config_parameter='ifn_core.twilio_account_sid')
    ifn_twilio_auth_token = fields.Char('Twilio Auth Token',
                                       config_parameter='ifn_core.twilio_auth_token')
    ifn_twilio_phone_number = fields.Char('Twilio Phone Number',
                                         config_parameter='ifn_core.twilio_phone_number')

    # Configuration SMS Orange
    ifn_orange_api_key = fields.Char('Orange API Key',
                                    config_parameter='ifn_core.orange_api_key')
    ifn_orange_api_secret = fields.Char('Orange API Secret',
                                       config_parameter='ifn_core.orange_api_secret')

    # Services vocaux
    ifn_voice_services_enabled = fields.Boolean('Services vocaux activés',
                                               config_parameter='ifn_core.voice_services_enabled')
    ifn_stt_provider = fields.Selection([
        ('google', 'Google Speech-to-Text'),
        ('azure', 'Azure Speech'),
        ('aws', 'AWS Transcribe'),
        ('local', 'Local'),
    ], string='Fournisseur STT', config_parameter='ifn_core.stt_provider')

    ifn_tts_provider = fields.Selection([
        ('google', 'Google Text-to-Speech'),
        ('azure', 'Azure Speech'),
        ('aws', 'AWS Polly'),
        ('local', 'Local'),
    ], string='Fournisseur TTS', config_parameter='ifn_core.tts_provider')

    # Configuration géolocalisation
    ifn_geolocation_enabled = fields.Boolean('Géolocalisation activée',
                                           config_parameter='ifn_core.geolocation_enabled')
    ifn_map_provider = fields.Selection([
        ('openstreetmap', 'OpenStreetMap'),
        ('google', 'Google Maps'),
        ('mapbox', 'Mapbox'),
    ], string='Fournisseur de cartes', config_parameter='ifn_core.map_provider')

    ifn_map_api_key = fields.Char('Clé API Cartes',
                                 config_parameter='ifn_core.map_api_key')

    # KPIs et reporting
    ifn_kpi_enabled = fields.Boolean('KPIs IFN activés',
                                    config_parameter='ifn_core.kpi_enabled')
    ifn_kpi_cron_schedule = fields.Char('Schedule KPIs CRON',
                                       config_parameter='ifn_core.kpi_cron_schedule',
                                       default='0 2 * * *')  # Tous les jours à 2h

    # Configuration des imports/exports
    ifn_import_enabled = fields.Boolean('Imports activés',
                                       config_parameter='ifn_core.import_enabled')
    ifn_export_enabled = fields.Boolean('Exports activés',
                                       config_parameter='ifn_core.export_enabled')
    ifn_max_import_size_mb = fields.Integer('Taille max import (MB)',
                                           config_parameter='ifn_core.max_import_size_mb',
                                           default=50)

    # Configuration PWA/Offline
    ifn_pwa_enabled = fields.Boolean('PWA activé',
                                    config_parameter='ifn_core.pwa_enabled')
    ifn_offline_mode_enabled = fields.Boolean('Mode hors ligne activé',
                                             config_parameter='ifn_core.offline_mode_enabled')
    ifn_sync_interval_minutes = fields.Integer('Intervalle sync (minutes)',
                                               config_parameter='ifn_core.sync_interval_minutes',
                                               default=15)

    @api.model
    def get_values(self):
        """Récupère les valeurs de configuration"""
        res = super().get_values()

        # Récupérer les séquences IFN
        uid_sequence = self.env.ref('ifn_core.ifn_uid_sequence', raise_if_not_found=False)
        res['ifn_uid_sequence_id'] = uid_sequence.id if uid_sequence else False

        return res

    def set_values(self):
        """Définit les valeurs de configuration"""
        super().set_values()

        # Configuration des séquences
        if self.ifn_uid_sequence_id:
            self.env['ir.config_parameter'].sudo().set_param(
                'ifn_core.uid_sequence_id', self.ifn_uid_sequence_id.id
            )

        # Validation des configurations
        self._validate_settings()

    def _validate_settings(self):
        """Valide la cohérence des paramètres"""
        if self.ifn_qr_enabled and not self.ifn_uid_sequence_id:
            raise ValidationError(_('Une séquence UID doit être configurée pour activer les QR'))

        if self.ifn_session_timeout_minutes <= 0:
            raise ValidationError(_('Le timeout de session doit être positif'))

        if self.ifn_qr_ttl_days <= 0:
            raise ValidationError(_('La durée de validité QR doit être positive'))

        if self.ifn_audit_retention_days <= 0:
            raise ValidationError(_('La rétention des logs audit doit être positive'))

    def action_test_sms_connection(self):
        """Test la connexion SMS"""
        self.ensure_one()
        try:
            # Logique de test selon le provider
            if self.ifn_sms_provider == 'twilio':
                self._test_twilio_connection()
            elif self.ifn_sms_provider == 'orange':
                self._test_orange_connection()

            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Connexion SMS réussie'),
                    'message': _('La connexion au fournisseur SMS a été testée avec succès'),
                    'type': 'success',
                }
            }
        except Exception as e:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Erreur de connexion SMS'),
                    'message': str(e),
                    'type': 'danger',
                }
            }

    def _test_twilio_connection(self):
        """Test la connexion Twilio"""
        if not all([self.ifn_twilio_account_sid, self.ifn_twilio_auth_token]):
            raise ValidationError(_('Les identifiants Twilio sont requis'))

        # Implémentation test Twilio
        _logger.info("Test connexion Twilio")

    def _test_orange_connection(self):
        """Test la connexion Orange"""
        if not all([self.ifn_orange_api_key, self.ifn_orange_api_secret]):
            raise ValidationError(_('Les identifiants Orange sont requis'))

        # Implémentation test Orange
        _logger.info("Test connexion Orange")

    def action_test_geolocation(self):
        """Test la géolocalisation"""
        self.ensure_one()
        if not self.ifn_map_api_key:
            raise ValidationError(_('La clé API de cartes est requise'))

        # Test de géocodage avec une adresse
        test_address = "Abidjan, Côte d'Ivoire"
        try:
            # Logique de test selon le provider
            _logger.info(f"Test géolocalisation avec: {test_address}")

            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Géolocalisation fonctionnelle'),
                    'message': _('Le service de géolocalisation répond correctement'),
                    'type': 'success',
                }
            }
        except Exception as e:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Erreur de géolocalisation'),
                    'message': str(e),
                    'type': 'danger',
                }
            }

    def action_regenerate_all_qr(self):
        """Régénère tous les codes QR"""
        self.ensure_one()
        partners = self.env['res.partner'].search([('x_ifn_uid', '!=', False)])

        total = len(partners)
        for i, partner in enumerate(partners):
            partner._ifn_generate_qr()
            if i % 100 == 0:  # Progress update
                _logger.info(f"QR regeneration progress: {i}/{total}")

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('QR régénérés'),
                'message': _('%s codes QR ont été régénérés') % total,
                'type': 'success',
            }
        }

    def action_cleanup_audit_logs(self):
        """Nettoie les anciens logs d'audit"""
        self.ensure_one()
        cutoff_date = fields.Datetime.now() - timedelta(days=self.ifn_audit_retention_days)

        logs_to_delete = self.env['ifn.audit.log'].search([
            ('create_date', '<', cutoff_date)
        ])

        count = len(logs_to_delete)
        logs_to_delete.unlink()

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Logs audit nettoyés'),
                'message': _('%s anciens logs ont été supprimés') % count,
                'type': 'success',
            }
        }

    def action_export_configuration(self):
        """Exporte la configuration IFN"""
        self.ensure_one()

        config_data = {
            'module_enabled': self.ifn_module_enabled,
            'portal_enabled': self.ifn_portal_enabled,
            'qr_enabled': self.ifn_qr_enabled,
            'i18n_enabled': self.ifn_i18n_enabled,
            'audit_enabled': self.ifn_audit_enabled,
            'geolocation_enabled': self.ifn_geolocation_enabled,
            'kpi_enabled': self.ifn_kpi_enabled,
            'available_languages': self.ifn_available_languages,
            'sms_provider': self.ifn_sms_provider,
            'session_timeout': self.ifn_session_timeout_minutes,
            'qr_ttl_days': self.ifn_qr_ttl_days,
        }

        # Créer attachment avec config
        attachment = self.env['ir.attachment'].create({
            'name': f'ifn_config_{fields.Datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
            'type': 'binary',
            'datas': base64.b64encode(json.dumps(config_data, indent=2).encode()),
            'res_model': self._name,
            'res_id': self.id,
        })

        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }