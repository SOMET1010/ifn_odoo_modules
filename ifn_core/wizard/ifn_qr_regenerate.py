# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
import base64
import io
import qrcode
import json
import logging
from datetime import datetime

_logger = logging.getLogger(__name__)


class IFNQRRegenerateWizard(models.TransientModel):
    _name = 'ifn.qr.regenerate.wizard'
    _description = 'Assistant Régénération QR IFN'

    # Configuration de la régénération
    regenerate_all = fields.Boolean('Régénérer tous les QR', default=False,
                                   help='Régénère les QR codes pour tous les partenaires IFN')
    partner_ids = fields.Many2many('res.partner', string='Partenaires sélectionnés',
                                   help='Partenaires dont les QR seront régénérés')

    # Options de régénération
    update_qr_ref = fields.Boolean('Mettre à jour référence QR', default=True,
                                  help='Génère une nouvelle référence QR pour chaque partenaire')
    update_generation_date = fields.Boolean('Mettre à jour date génération', default=True,
                                          help='Met à jour la date de génération du QR')
    backup_existing = fields.Boolean='False', default=True,
                              help='Sauvegarde les anciens QR codes avant régénération'

    # Filtres
    include_inactive = fields.Boolean('Inclure partenaires inactifs', default=False)
    include_unvalidated = fields.Boolean('Inclure profils non validés', default=True)
    role_filter = fields.Selection([
        ('all', 'Tous les rôles'),
        ('merchant', 'Marchands'),
        ('producer', 'Producteurs'),
        ('coop_manager', 'Gestionnaires Coop'),
        ('agent', 'Agents'),
        ('admin', 'Administrateurs'),
    ], string='Filtre par rôle', default='all')

    # Marchés et Coopératives
    market_filter_id = fields.Many2one('ifn.market', string='Filtrer par marché')
    coop_filter_id = fields.Many2one('ifn.coop', string='Filtrer par coopérative')

    # Statistiques et résultats
    total_partners = fields.Integer('Total partenaires', readonly=True, compute='_compute_stats')
    processed_count = fields.Integer('Nombre traité', readonly=True)
    success_count = fields.Integer('Nombre réussi', readonly=True)
    error_count = fields.Integer('Nombre erreur', readonly=True)
    errors = fields.Text('Erreurs', readonly=True)

    @api.depends('regenerate_all', 'partner_ids', 'role_filter', 'market_filter_id', 'coop_filter_id',
                 'include_inactive', 'include_unvalidated')
    def _compute_stats(self):
        """Calcule le nombre total de partenaires concernés"""
        for wizard in self:
            if wizard.regenerate_all:
                domain = wizard._get_partner_domain()
                wizard.total_partners = self.env['res.partner'].search_count(domain)
            else:
                wizard.total_partners = len(wizard.partner_ids)

    @api.onchange('regenerate_all')
    def _onchange_regenerate_all(self):
        """Réinitialise les partenaires sélectionnés"""
        if self.regenerate_all:
            self.partner_ids = [(5, 0, 0)]  # Vider la liste

    @api.onchange('role_filter', 'market_filter_id', 'coop_filter_id', 'include_inactive', 'include_unvalidated')
    def _onchange_filters(self):
        """Recalcule les statistiques quand les filtres changent"""
        self._compute_stats()

    def _get_partner_domain(self):
        """Retourne le domaine pour la recherche de partenaires"""
        domain = [('x_ifn_role', '!=', False)]

        # Filtre par rôle
        if self.role_filter != 'all':
            domain.append(('x_ifn_role', '=', self.role_filter))

        # Filtre par statut
        if not self.include_unvalidated:
            domain.append(('x_ifn_profile_status', '=', 'validated'))

        # Filtre par activité
        if not self.include_inactive:
            domain.append(('active', '=', True))

        # Filtre par marché
        if self.market_filter_id:
            domain.append(('x_ifn_market_id', '=', self.market_filter_id.id))

        # Filtre par coopérative
        if self.coop_filter_id:
            domain.append(('x_ifn_coop_id', '=', self.coop_filter_id.id))

        return domain

    def action_regenerate_qr(self):
        """Lance la régénération des QR codes"""
        self.ensure_one()

        # Obtenir la liste des partenaires
        if self.regenerate_all:
            domain = self._get_partner_domain()
            partners = self.env['res.partner'].search(domain)
        else:
            partners = self.partner_ids

        if not partners:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Aucun partenaire sélectionné'),
                    'message': _('Veuillez sélectionner au moins un partenaire'),
                    'type': 'warning',
                }
            }

        # Initialiser les compteurs
        self.processed_count = 0
        self.success_count = 0
        self.error_count = 0
        self.errors = ''

        # Traiter chaque partenaire
        for partner in partners:
            try:
                self._regenerate_partner_qr(partner)
                self.success_count += 1
            except Exception as e:
                self.error_count += 1
                error_msg = f"Erreur pour {partner.name}: {str(e)}\n"
                self.errors += error_msg
                _logger.error(f"QR regeneration error for partner {partner.id}: {str(e)}")

            self.processed_count += 1

        # Afficher le résultat
        return self._show_result()

    def _regenerate_partner_qr(self, partner):
        """Régénère le QR code pour un partenaire"""
        partner.ensure_one()

        # Sauvegarder l'ancien QR si demandé
        if self.backup_existing and partner.x_ifn_qr:
            self._backup_qr_code(partner)

        # Générer le nouveau QR
        partner._ifn_generate_qr()

        # Mettre à jour les métadonnées
        if self.update_generation_date:
            partner.x_ifn_qr_generated_date = fields.Datetime.now()

        # Logger l'action
        self.env['ifn.audit.log'].log_action(
            object_model='res.partner',
            object_id=partner.id,
            action='qr_regenerated',
            details=f"QR code regenerated for partner {partner.name} (UID: {partner.x_ifn_uid})"
        )

    def _backup_qr_code(self, partner):
        """Crée une sauvegarde de l'ancien QR code"""
        attachment_name = f"qr_backup_{partner.id}_{partner.x_ifn_uid}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"

        self.env['ir.attachment'].create({
            'name': attachment_name,
            'type': 'binary',
            'datas': partner.x_ifn_qr,
            'res_model': 'res.partner',
            'res_id': partner.id,
            'description': f'Backup QR code for {partner.name} before regeneration',
        })

    def _show_result(self):
        """Affiche le résultat de la régénération"""
        if self.error_count == 0:
            message = _('%s QR codes ont été régénérés avec succès') % self.success_count
            notification_type = 'success'
        else:
            message = _('Régénération terminée: %s réussis, %s erreurs') % (self.success_count, self.error_count)
            notification_type = 'warning'

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Régénération QR terminée'),
                'message': message,
                'type': notification_type,
                'sticky': self.error_count > 0,
            }
        }

    def action_export_errors(self):
        """Exporte les erreurs dans un fichier"""
        if not self.errors:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Aucune erreur'),
                    'message': _('Aucune erreur à exporter'),
                    'type': 'info',
                }
            }

        # Créer un attachment avec les erreurs
        attachment = self.env['ir.attachment'].create({
            'name': f'qr_regeneration_errors_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt',
            'type': 'binary',
            'datas': base64.b64encode(self.errors.encode('utf-8')),
            'res_model': self._name,
            'res_id': self.id,
        })

        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }

    def action_download_report(self):
        """Génère un rapport de régénération"""
        # Créer le contenu du rapport
        report_content = self._generate_regeneration_report()

        # Créer attachment
        attachment = self.env['ir.attachment'].create({
            'name': f'qr_regeneration_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt',
            'type': 'binary',
            'datas': base64.b64encode(report_content.encode('utf-8')),
            'res_model': self._name,
            'res_id': self.id,
        })

        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }

    def _generate_regeneration_report(self):
        """Génère le contenu du rapport de régénération"""
        report = []
        report.append("=" * 60)
        report.append("RAPPORT DE RÉGÉNÉRATION QR CODES IFN")
        report.append("=" * 60)
        report.append(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Utilisateur: {self.env.user.name}")
        report.append("")
        report.append("PARAMÈTRES:")
        report.append(f"- Régénérer tous: {self.regenerate_all}")
        report.append(f"- Mettre à jour référence QR: {self.update_qr_ref}")
        report.append(f"- Mettre à jour date génération: {self.update_generation_date}")
        report.append(f"- Sauvegarder anciens QR: {self.backup_existing}")
        report.append(f"- Filtre rôle: {self.role_filter}")
        report.append(f"- Marché: {self.market_filter_id.name if self.market_filter_id else 'Tous'}")
        report.append(f"- Coopérative: {self.coop_filter_id.name if self.coop_filter_id else 'Toutes'}")
        report.append("")
        report.append("RÉSULTATS:")
        report.append(f"- Total partenaires: {self.total_partners}")
        report.append(f"- Partenaires traités: {self.processed_count}")
        report.append(f"- Succès: {self.success_count}")
        report.append(f"- Erreurs: {self.error_count}")
        report.append(f"- Taux de succès: {(self.success_count / max(self.processed_count, 1) * 100):.2f}%")

        if self.errors:
            report.append("")
            report.append("ERREURS DÉTAILLÉES:")
            report.append("-" * 40)
            report.append(self.errors)

        report.append("")
        report.append("=" * 60)
        report.append("FIN DU RAPPORT")
        report.append("=" * 60)

        return "\n".join(report)