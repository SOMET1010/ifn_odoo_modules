# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError
import io
import base64
from datetime import datetime
import logging


class IFNAttestationReport(models.AbstractModel):
    _name = 'report.ifn_core.ifn_attestation_template'
    _description = 'Rapport Attestation IFN'

    @api.model
    def _get_report_values(self, docids, data=None):
        """Prépare les valeurs pour le template d'attestation"""
        docs = self.env['res.partner'].browse(docids)

        report_data = {
            'docs': docs,
            'date_today': fields.Date.today(),
            'generation_time': fields.Datetime.now(),
            'company': self.env.company,
            'user': self.env.user,
        }

        return report_data

    def _get_partner_attestation_data(self, partner):
        """Retourne les données spécifiques pour l'attestation d'un partenaire"""
        return {
            'partner': partner,
            'uid': partner.x_ifn_uid,
            'role_label': dict(partner._fields['x_ifn_role'].selection).get(partner.x_ifn_role, ''),
            'market_name': partner.x_ifn_market_id.name if partner.x_ifn_market_id else '',
            'coop_name': partner.x_ifn_coop_id.name if partner.x_ifn_coop_id else '',
            'validation_date': partner.x_ifn_validation_date,
            'qr_code': partner.x_ifn_qr,
            'qr_ref': partner.x_ifn_qr_ref,
            'has_geo': bool(partner.x_ifn_geo_lat and partner.x_ifn_geo_lng),
            'geo_lat': partner.x_ifn_geo_lat,
            'geo_lng': partner.x_ifn_geo_lng,
            'language_label': dict(partner._fields['x_ifn_lang_pref'].selection).get(partner.x_ifn_lang_pref, ''),
        }


class IFNPartnerAttestationWizard(models.TransientModel):
    _name = 'ifn.partner.attestation.wizard'
    _description = 'Assistant Génération Attestation Partenaire'

    # Configuration
    partner_ids = fields.Many2many('res.partner', string='Partenaires',
                                   domain=[('x_ifn_role', '!=', False),
                                           ('x_ifn_profile_status', '=', 'validated'),
                                           ('x_ifn_uid', '!=', False)])

    # Options d'attestation
    attestation_type = fields.Selection([
        ('standard', 'Attestation Standard'),
        ('member_card', 'Carte de Membre'),
        ('qr_certificate', 'Certificat QR'),
        ('full_profile', 'Profil Complet'),
    ], string='Type d\'attestation', default='standard', required=True)

    include_photo = fields.Boolean('Inclure photo', default=True)
    include_geo = fields.Boolean('Inclure coordonnées GPS', default=False)
    include_qr = fields.Boolean('Inclure code QR', default=True)
    include_validation = fields.Boolean('Inclure détails validation', default=True)

    # Format et sortie
    report_format = fields.Selection([
        ('pdf', 'PDF'),
        ('html', 'HTML'),
    ], string='Format', default='pdf', required=True)

    # Layout
    layout_template = fields.Selection([
        ('modern', 'Moderne'),
        ('classic', 'Classique'),
        ('minimal', 'Minimal'),
    ], string='Modèle de mise en page', default='modern', required=True)

    # Options avancées
    watermark = fields.Boolean('Filigrane de sécurité', default=False)
    background_color = fields.Selection([
        ('white', 'Blanc'),
        ('cream', 'Crème'),
        ('light_blue', 'Bleu clair'),
        ('light_gray', 'Gris clair'),
    ], string='Couleur de fond', default='white')

    footer_text = fields.Text('Texte pied de page',
                             default='Ce document certifie l\'authenticité des informations IFN.')

    # Résultats
    generated_count = fields.Integer('Attestations générées', readonly=True)
    error_count = fields.Integer('Erreurs', readonly=True)
    errors = fields.Text('Erreurs détaillées', readonly=True)

    def action_generate_attestations(self):
        """Génère les attestations pour les partenaires sélectionnés"""
        self.ensure_one()

        if not self.partner_ids:
            raise UserError(_('Veuillez sélectionner au moins un partenaire'))

        # Initialiser les compteurs
        self.generated_count = 0
        self.error_count = 0
        self.errors = ''

        # Vérifier que tous les partenaires ont les informations requises
        invalid_partners = self.partner_ids.filtered(
            lambda p: not p.x_ifn_uid or p.x_ifn_profile_status != 'validated'
        )

        if invalid_partners:
            names = ', '.join(invalid_partners.mapped('name'))
            raise UserError(_('Les partenaires suivants n\'ont pas de UID ou un profil validé: %s') % names)

        # Générer les attestations
        for partner in self.partner_ids:
            try:
                self._generate_single_attestation(partner)
                self.generated_count += 1
            except Exception as e:
                self.error_count += 1
                error_msg = f"Erreur pour {partner.name}: {str(e)}\n"
                self.errors += error_msg

        # Afficher le résultat
        return self._show_generation_result()

    def _generate_single_attestation(self, partner):
        """Génère une attestation pour un partenaire"""
        # Préparer le contexte du rapport
        report_context = {
            'wizard': self,
            'partner': partner,
            'attestation_data': self._prepare_attestation_data(partner),
            'company': self.env.company,
            'generation_date': fields.Date.today(),
            'generation_time': fields.Datetime.now(),
        }

        # Sélectionner le template selon le type et le layout
        template_ref = self._get_template_ref()

        # Générer le rapport
        report = self.env.ref(template_ref)._render_qweb_pdf([partner.id], data=report_context)

        # Créer un attachment avec l'attestation
        filename = self._generate_filename(partner)

        attachment = self.env['ir.attachment'].create({
            'name': filename,
            'type': 'binary',
            'datas': base64.b64encode(report[0]),
            'res_model': 'res.partner',
            'res_id': partner.id,
            'description': f'Attestation IFN - {partner.name}',
        })

        # Logger l'action
        self.env['ifn.audit.log'].log_action(
            object_model='res.partner',
            object_id=partner.id,
            action='attestation_generated',
            details=f"Attestation {self.attestation_type} generated for {partner.name}"
        )

        return attachment

    def _get_template_ref(self):
        """Retourne la référence du template selon le type et layout"""
        template_mapping = {
            ('standard', 'modern'): 'ifn_core.ifn_attestation_modern_template',
            ('standard', 'classic'): 'ifn_core.ifn_attestation_classic_template',
            ('standard', 'minimal'): 'ifn_core.ifn_attestation_minimal_template',
            ('member_card', 'modern'): 'ifn_core.ifn_member_card_modern_template',
            ('member_card', 'classic'): 'ifn_core.ifn_member_card_classic_template',
            ('qr_certificate', 'modern'): 'ifn_core.ifn_qr_certificate_modern_template',
            ('full_profile', 'modern'): 'ifn_core.ifn_full_profile_modern_template',
        }

        key = (self.attestation_type, self.layout_template)
        return template_mapping.get(key, 'ifn_core.ifn_attestation_modern_template')

    def _prepare_attestation_data(self, partner):
        """Prépare les données pour l'attestation"""
        return {
            'partner': partner,
            'uid': partner.x_ifn_uid,
            'role_label': dict(partner._fields['x_ifn_role'].selection).get(partner.x_ifn_role, ''),
            'role_color': self._get_role_color(partner.x_ifn_role),
            'market_name': partner.x_ifn_market_id.name if partner.x_ifn_market_id else '',
            'coop_name': partner.x_ifn_coop_id.name if partner.x_ifn_coop_id else '',
            'validation_date': partner.x_ifn_validation_date,
            'validator_name': partner.x_ifn_validator_id.name if partner.x_ifn_validator_id else '',
            'qr_code': partner.x_ifn_qr,
            'qr_ref': partner.x_ifn_qr_ref,
            'has_geo': bool(partner.x_ifn_geo_lat and partner.x_ifn_geo_lng),
            'geo_lat': partner.x_ifn_geo_lat,
            'geo_lng': partner.x_ifn_geo_lng,
            'language_label': dict(partner._fields['x_ifn_lang_pref'].selection).get(partner.x_ifn_lang_pref, ''),
            'has_photo': bool(partner.x_ifn_photo),
            'photo': partner.x_ifn_photo,
            'creation_date': partner.x_ifn_created_date,
            'profile_status': partner.x_ifn_profile_status,
            'voice_consent': partner.x_ifn_voice_consent,
            'data_consent': partner.x_ifn_data_processing_consent,
        }

    def _get_role_color(self, role):
        """Retourne la couleur associée au rôle"""
        role_colors = {
            'merchant': '#FF6B35',  # Orange
            'producer': '#4CAF50',  # Vert
            'coop_manager': '#2196F3',  # Bleu
            'agent': '#9C27B0',   # Violet
            'admin': '#F44336',   # Rouge
        }
        return role_colors.get(role, '#757575')  # Gris par défaut

    def _generate_filename(self, partner):
        """Génère le nom de fichier pour l'attestation"""
        safe_name = partner.name.replace(' ', '_').replace('/', '_')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        type_prefix = {
            'standard': 'Attestation',
            'member_card': 'CarteMembre',
            'qr_certificate': 'CertificatQR',
            'full_profile': 'ProfilComplet',
        }.get(self.attestation_type, 'Attestation')

        return f"{type_prefix}_{safe_name}_{partner.x_ifn_uid}_{timestamp}.pdf"

    def _show_generation_result(self):
        """Affiche le résultat de la génération"""
        if self.error_count == 0:
            message = _('%s attestation(s) générée(s) avec succès') % self.generated_count
            notification_type = 'success'
        else:
            message = _('Génération terminée: %s réussies, %s erreurs') % (self.generated_count, self.error_count)
            notification_type = 'warning'

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Génération d\'Attestations'),
                'message': message,
                'type': notification_type,
                'sticky': self.error_count > 0,
            }
        }

    def action_download_all_attestations(self):
        """Crée un ZIP avec toutes les attestations générées"""
        if self.generated_count == 0:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Aucune attestation'),
                    'message': _('Aucune attestation n\'a été générée'),
                    'type': 'warning',
                }
            }

        # TODO: Implémenter la création de ZIP avec toutes les attestations
        # Pour l'instant, retourner une notification
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Fonctionnalité en développement'),
                'message': _('Le téléchargement groupé sera disponible prochainement'),
                'type': 'info',
            }
        }

    def action_preview_attestation(self):
        """Prévisualise l'attestation pour le premier partenaire"""
        if not self.partner_ids:
            raise UserError(_('Veuillez sélectionner au moins un partenaire'))

        partner = self.partner_ids[0]

        return {
            'type': 'ir.actions.report',
            'report_name': self._get_template_ref(),
            'report_type': 'qweb-pdf',
            'res_ids': [partner.id],
            'data': {
                'wizard_id': self.id,
                'preview_mode': True,
            },
            'context': self.env.context,
        }