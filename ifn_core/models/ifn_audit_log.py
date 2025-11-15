# -*- coding: utf-8 -*-

import base64
from odoo import models, fields, api, _
import json
import logging

_logger = logging.getLogger(__name__)


class IFNAuditLog(models.Model):
    _name = 'ifn.audit.log'
    _description = 'Log d\'audit IFN'
    _order = 'create_date desc'
    _rec_name = 'display_name'
    _sql_constraints = [
        ('unique_event_id', 'unique(event_id)', 'L\'ID d\'événement doit être unique !'),
    ]

    # Informations générales
    event_id = fields.Char('ID Événement', required=True, index=True,
                          help='Identifiant unique de l\'événement d\'audit')
    display_name = fields.Char('Nom affiché', compute='_compute_display_name', store=True)

    # Objet audité
    object_model = fields.Char('Modèle objet', required=True, index=True,
                              help='Modèle de l\'objet audité')
    object_id = fields.Integer('ID objet', required=True, index=True,
                              help='ID de l\'objet audité')
    object_name = fields.Char('Nom objet', compute='_compute_object_name', store=True)
    object_reference = fields.Char('Référence objet', compute='_compute_object_reference',
                                  store=True, index=True)

    # Action et utilisateur
    action = fields.Selection([
        ('create', 'Création'),
        ('write', 'Modification'),
        ('unlink', 'Suppression'),
        ('validate', 'Validation'),
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('qr_generated', 'QR généré'),
        ('role_changed', 'Rôle modifié'),
        ('permission_change', 'Permission modifiée'),
        ('data_export', 'Export de données'),
        ('data_import', 'Import de données'),
        ('password_change', 'Mot de passe modifié'),
        ('profile_status_change', 'Statut profil modifié'),
        ('consent_given', 'Consentement donné'),
        ('consent_revoked', 'Consentement révoqué'),
        ('sensitive_access', 'Accès données sensibles'),
    ], string='Action', required=True, index=True)

    user_id = fields.Many2one('res.users', string='Utilisateur', required=True,
                             index=True, ondelete='cascade')
    user_name = fields.Char(related='user_id.name', store=True, readonly=True)
    partner_id = fields.Many2one('res.partner', string='Partenaire IFN',
                                related='user_id.partner_id', store=True)

    # Détails de l'action
    field_name = fields.Char('Nom champ', help='Champ modifié (pour action write)')
    old_value = fields.Text('Ancienne valeur')
    new_value = fields.Text('Nouvelle valeur')
    details = fields.Text('Détails', help='Détails additionnels de l\'action')

    # Métadonnées
    ip_address = fields.Char('Adresse IP', help='Adresse IP source')
    user_agent = fields.Text('User Agent', help='Navigateur/client utilisé')
    session_id = fields.Char('ID Session', help='Identifiant de session')

    # Géolocalisation
    geo_latitude = fields.Float('Latitude', digits=(10, 6))
    geo_longitude = fields.Float('Longitude', digits=(10, 6))

    # Catégories et criticité
    category = fields.Selection([
        ('security', 'Sécurité'),
        ('data_protection', 'Protection données'),
        ('access_control', 'Contrôle accès'),
        ('business', 'Métier'),
        ('system', 'Système'),
        ('compliance', 'Conformité'),
    ], string='Catégorie', required=True, default='business', index=True)

    severity = fields.Selection([
        ('low', 'Faible'),
        ('medium', 'Moyen'),
        ('high', 'Élevé'),
        ('critical', 'Critique'),
    ], string='Sévérité', required=True, default='low', index=True)

    # Statut et traitement
    reviewed = fields.Boolean('Vérifié', default=False, index=True)
    reviewed_by = fields.Many2one('res.users', string='Vérifié par')
    reviewed_date = fields.Datetime('Date vérification')
    review_notes = fields.Text('Notes de vérification')

    # Flags et alertes
    is_anomaly = fields.Boolean('Anomalie détectée', default=False, index=True)
    is_suspicious = fields.Boolean('Activité suspecte', default=False, index=True)
    requires_action = fields.Boolean('Action requise', default=False, index=True)

    # Corrélation d'événements
    related_log_ids = fields.One2many('ifn.audit.log', 'parent_log_id',
                                     string='Logs connexes')
    parent_log_id = fields.Many2one('ifn.audit.log', string='Log parent')

    @api.depends('object_model', 'object_id', 'action', 'create_date')
    def _compute_display_name(self):
        for log in self:
            action_label = dict(self._fields['action'].selection).get(log.action, log.action)
            model_label = self.env[log.object_model]._description if log.object_model else 'Inconnu'
            log.display_name = f"{action_label} - {model_label} #{log.object_id} - {log.create_date.strftime('%Y-%m-%d %H:%M:%S')}"

    @api.depends('object_model', 'object_id')
    def _compute_object_name(self):
        for log in self:
            if log.object_model and log.object_id:
                try:
                    model = self.env[log.object_model]
                    record = model.browse(log.object_id)
                    if record.exists():
                        if hasattr(record, 'name'):
                            log.object_name = record.name
                        elif hasattr(record, 'display_name'):
                            log.object_name = record.display_name
                        else:
                            log.object_name = f"{log.object_model} #{log.object_id}"
                    else:
                        log.object_name = f"{log.object_model} #{log.object_id} (supprimé)"
                except Exception:
                    log.object_name = f"{log.object_model} #{log.object_id}"
            else:
                log.object_name = 'Inconnu'

    @api.depends('object_model', 'object_id')
    def _compute_object_reference(self):
        for log in self:
            if log.object_model and log.object_id:
                log.object_reference = f"{log.object_model},{log.object_id}"
            else:
                log.object_reference = ''

    @api.model
    def create(self, vals):
        """Création avec génération d'ID événement unique"""
        if not vals.get('event_id'):
            vals['event_id'] = self._generate_event_id()

        # Auto-détection IP et User Agent depuis le contexte
        if not vals.get('ip_address') and self.env.context.get('audit_ip'):
            vals['ip_address'] = self.env.context['audit_ip']
        if not vals.get('user_agent') and self.env.context.get('audit_user_agent'):
            vals['user_agent'] = self.env.context['audit_user_agent']

        # Auto-détection de la sévérité selon l'action
        if not vals.get('severity'):
            vals['severity'] = self._detect_severity(vals.get('action'))

        log = super().create(vals)

        # Vérification d'anomalies
        log._check_for_anomalies()

        return log

    def _generate_event_id(self):
        """Génère un ID d'événement unique"""
        import uuid
        return str(uuid.uuid4())

    def _detect_severity(self, action):
        """Détecte automatiquement la sévérité selon l'action"""
        severity_mapping = {
            'login': 'low',
            'logout': 'low',
            'create': 'medium',
            'write': 'medium',
            'validate': 'medium',
            'qr_generated': 'medium',
            'unlink': 'high',
            'role_changed': 'high',
            'permission_change': 'high',
            'password_change': 'high',
            'data_export': 'high',
            'data_import': 'high',
            'profile_status_change': 'high',
            'consent_revoked': 'high',
            'sensitive_access': 'high',
            'consent_given': 'medium',
        }
        return severity_mapping.get(action, 'medium')

    def _check_for_anomalies(self):
        """Vérifie les anomalies potentielles"""
        self.ensure_one()

        # Anomalie: accès depuis nouvelle IP
        recent_logs = self.search([
            ('user_id', '=', self.user_id.id),
            ('create_date', '>=', fields.Datetime.now() - timedelta(hours=24)),
            ('ip_address', '!=', self.ip_address),
        ], limit=5)

        if self.ip_address and not any(log.ip_address == self.ip_address for log in recent_logs):
            self.is_anomaly = True
            self.requires_action = True

        # Anomalie: activité suspecte (horaires inhabituels)
        hour = self.create_date.hour
        if hour < 6 or hour > 22:  # Activité nocturne
            self.is_suspicious = True

        # Critique: modification de permissions par non-admin
        if self.action in ['role_changed', 'permission_change'] and not self.user_id.has_group('base.group_system'):
            self.severity = 'critical'
            self.requires_action = True

    def action_mark_reviewed(self):
        """Marque le log comme vérifié"""
        self.write({
            'reviewed': True,
            'reviewed_by': self.env.uid,
            'reviewed_date': fields.Datetime.now(),
            'requires_action': False,
        })

    def action_ignore_anomaly(self):
        """Ignore l'anomalie détectée"""
        self.write({
            'is_anomaly': False,
            'is_suspicious': False,
            'requires_action': False,
        })

    def action_investigate(self):
        """Ouvre l'assistant d'investigation"""
        self.ensure_one()
        return {
            'name': _('Investigation du log %s') % self.event_id,
            'view_mode': 'form',
            'res_model': 'ifn.audit.log',
            'res_id': self.id,
            'type': 'ir.actions.act_window',
            'target': 'new',
            'context': {'investigation_mode': True},
        }

    def action_view_object(self):
        """Affiche l'objet audité"""
        self.ensure_one()
        if self.object_model and self.object_id:
            try:
                model = self.env[self.object_model]
                record = model.browse(self.object_id)
                if record.exists():
                    return {
                        'name': _('Objet audité'),
                        'view_mode': 'form',
                        'res_model': self.object_model,
                        'res_id': self.object_id,
                        'type': 'ir.actions.act_window',
                    }
            except Exception:
                pass

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Objet non trouvé'),
                'message': _('L\'objet audité n\'existe plus ou est inaccessible'),
                'type': 'warning',
            }
        }

    @api.model
    def log_action(self, object_model, object_id, action, user_id=None, **kwargs):
        """Crée un log d'audit pour une action"""
        values = {
            'object_model': object_model,
            'object_id': object_id,
            'action': action,
            'user_id': user_id or self.env.uid,
        }

        # Ajout des champs optionnels
        optional_fields = [
            'field_name', 'old_value', 'new_value', 'details',
            'category', 'severity', 'ip_address', 'user_agent',
            'geo_latitude', 'geo_longitude'
        ]

        for field in optional_fields:
            if field in kwargs:
                values[field] = kwargs[field]

        return self.create(values)

    @api.model
    def cleanup_old_logs(self, days_to_keep=None):
        """Nettoie les anciens logs d'audit"""
        if days_to_keep is None:
            days_to_keep = int(self.env['ir.config_parameter'].sudo().get_param(
                'ifn_core.audit_retention_days', '365'
            ))

        cutoff_date = fields.Datetime.now() - timedelta(days=days_to_keep)
        logs_to_delete = self.search([('create_date', '<', cutoff_date)])

        count = len(logs_to_delete)
        if count > 0:
            # Archivage avant suppression
            self._export_logs_for_backup(logs_to_delete)
            logs_to_delete.unlink()
            _logger.info(f"Cleaned up {count} old audit logs older than {cutoff_date}")

        return count

    def _export_logs_for_backup(self, logs):
        """Exporte les logs pour backup avant suppression"""
        if not logs:
            return

        # Créer fichier CSV pour backup
        import csv
        import io

        output = io.StringIO()
        writer = csv.writer(output)

        # En-têtes
        headers = ['event_id', 'create_date', 'object_model', 'object_id', 'action',
                  'user_id', 'field_name', 'old_value', 'new_value', 'severity']
        writer.writerow(headers)

        # Données
        for log in logs:
            row = [
                log.event_id, log.create_date, log.object_model, log.object_id,
                log.action, log.user_id.id, log.field_name, log.old_value,
                log.new_value, log.severity
            ]
            writer.writerow(row)

        # Créer attachment backup
        backup_content = output.getvalue().encode('utf-8')
        self.env['ir.attachment'].create({
            'name': f'ifn_audit_backup_{fields.Datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
            'type': 'binary',
            'datas': base64.b64encode(backup_content),
            'res_model': 'ifn.audit.log',
            'description': f'Backup de {len(logs)} logs d\'audit',
        })

    @api.model
    def get_security_summary(self, date_from=None, date_to=None):
        """Retourne un résumé de sécurité"""
        if not date_from:
            date_from = fields.Datetime.now() - timedelta(days=30)
        if not date_to:
            date_to = fields.Datetime.now()

        logs = self.search([
            ('create_date', '>=', date_from),
            ('create_date', '<=', date_to),
        ])

        summary = {
            'total_logs': len(logs),
            'critical_events': len(logs.filtered(lambda l: l.severity == 'critical')),
            'suspicious_activities': len(logs.filtered('is_suspicious')),
            'anomalies': len(logs.filtered('is_anomaly')),
            'unreviewed': len(logs.filtered(lambda l: not l.reviewed and l.requires_action)),
            'top_actions': self._get_top_actions(logs),
            'top_users': self._get_top_users(logs),
        }

        return summary

    def _get_top_actions(self, logs):
        """Retourne les actions les plus fréquentes"""
        action_counts = {}
        for log in logs:
            action_counts[log.action] = action_counts.get(log.action, 0) + 1
        return sorted(action_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    def _get_top_users(self, logs):
        """Retourne les utilisateurs les plus actifs"""
        user_counts = {}
        for log in logs:
            user_counts[log.user_id.name] = user_counts.get(log.user_id.name, 0) + 1
        return sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:10]