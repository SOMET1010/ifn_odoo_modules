# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class IFNPortalNotifications(models.Model):
    _name = 'ifn.portal.notifications'
    _description = 'IFN Portal Notifications'
    _order = 'created_at desc'
    _rec_name = 'title'

    # Champs principaux
    title = fields.Char(string='Titre', required=True)
    message = fields.Html(string='Message', required=True)
    notification_type = fields.Selection([
        ('info', 'Information'),
        ('success', 'Succès'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur'),
    ], string='Type', default='info', required=True)

    # Destinataires
    user_ids = fields.Many2many('res.users', string='Utilisateurs')
    partner_ids = fields.Many2many('res.partner', string='Partenaires')
    group_ids = fields.Many2many('res.groups', string='Groupes')
    is_global = fields.Boolean(string='Notification globale', default=False)

    # Statut et priorité
    priority = fields.Selection([
        ('low', 'Basse'),
        ('normal', 'Normale'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    ], string='Priorité', default='normal')
    active = fields.Boolean(string='Active', default=True)

    # Lecture
    read_by_users = fields.Many2many('res.users', relation='ifn_notification_read_rel', column1='notification_id', column2='user_id', string='Lue par')
    read_count = fields.Integer(string='Nombre de lectures', compute='_compute_read_count', store=True)

    # Actions
    action_url = fields.Char(string='URL d\'action')
    action_label = fields.Char(string='Libellé action')
    action_type = fields.Selection([
        ('url', 'URL'),
        ('modal', 'Modale'),
        ('callback', 'Callback'),
    ], string='Type d\'action', default='url')

    # Programmation
    scheduled_date = fields.Datetime(string='Date programmée')
    expire_date = fields.Datetime(string='Date d\'expiration')

    # Métadonnées
    created_at = fields.Datetime(string='Créée le', default=fields.Datetime.now, readonly=True)
    created_by = fields.Many2one('res.users', string='Créée par', default=lambda self: self.env.user)
    category = fields.Char(string='Catégorie')
    tags = fields.Char(string='Tags')

    @api.depends('read_by_users')
    def _compute_read_count(self):
        for notification in self:
            notification.read_count = len(notification.read_by_users)

    def send_notification(self):
        """Envoie la notification"""
        self.ensure_one()

        # Déterminer les destinataires
        recipients = self._get_recipients()

        # Envoyer à chaque destinataire
        for user in recipients:
            self._send_to_user(user)

        # Marquer comme envoyée
        self.active = True

    def _get_recipients(self):
        """Détermine les destinataires de la notification"""
        users = self.env['res.users']

        if self.is_global:
            # Tous les utilisateurs du portail
            users = self.env['res.users'].search([('share', '=', True)])
        elif self.group_ids:
            # Utilisateurs dans les groupes spécifiés
            for group in self.group_ids:
                users |= group.users
        elif self.user_ids:
            # Utilisateurs spécifiés
            users = self.user_ids
        elif self.partner_ids:
            # Utilisateurs liés aux partenaires
            users = self.env['res.users'].search([('partner_id', 'in', self.partner_ids.ids)])

        return users.filtered(lambda u: u.share)  # Uniquement les utilisateurs portail

    def _send_to_user(self, user):
        """Envoie la notification à un utilisateur"""
        # Envoyer une notification interne Odoo
        if hasattr(user, 'partner_id') and user.partner_id:
            self.env['mail.message'].create({
                'model': 'ifn.portal.notifications',
                'res_id': self.id,
                'message_type': 'notification',
                'subtype_id': self.env.ref('mail.mt_comment').id,
                'subject': self.title,
                'body': self.message,
                'partner_ids': [(4, user.partner_id.id)],
                'author_id': self.created_by.partner_id.id,
            })

        # Envoyer un email si configuré
        if user.email:
            template = self.env.ref('ifn_portal_common.email_template_notification', raise_if_not_found=False)
            if template:
                template.send_mail(
                    self.id,
                    email_values={'email_to': user.email},
                    force_send=True
                )

    def mark_as_read(self, user):
        """Marque la notification comme lue par un utilisateur"""
        if user not in self.read_by_users:
            self.read_by_users = [(4, user.id)]

    def mark_as_unread(self, user):
        """Marque la notification comme non lue par un utilisateur"""
        if user in self.read_by_users:
            self.read_by_users = [(3, user.id)]

    @api.model
    def get_user_notifications(self, user, unread_only=False):
        """Récupère les notifications pour un utilisateur"""
        domain = [
            ('active', '=', True),
            '|', ('is_global', '=', True),
            '|', ('user_ids', 'in', user.id),
            '|', ('partner_ids', 'in', user.partner_id.id),
            ('group_ids', 'in', user.groups_id.ids),
        ]

        if unread_only:
            domain.append(('read_by_users', 'not in', user.id))

        # Filtrer par date d'expiration
        domain.append(('expire_date', 'in', [False, fields.Datetime.now()]))

        notifications = self.search(domain)

        # Mettre à jour l'activité utilisateur
        if notifications and hasattr(user.partner_id, 'update_ifn_activity'):
            user.partner_id.update_ifn_activity()

        return notifications

    @api.model
    def get_unread_count(self, user):
        """Récupère le nombre de notifications non lues"""
        return self.search_count([
            ('active', '=', True),
            ('read_by_users', 'not in', user.id),
            '|', ('is_global', '=', True),
            '|', ('user_ids', 'in', user.id),
            '|', ('partner_ids', 'in', user.partner_id.id),
            ('group_ids', 'in', user.groups_id.ids),
            ('expire_date', 'in', [False, fields.Datetime.now()]),
        ])

    def action_view(self):
        """Action de visualisation de la notification"""
        action = {
            'type': 'ir.actions.act_window',
            'name': _('Notification'),
            'res_model': 'ifn.portal.notifications',
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

        if self.action_type == 'url' and self.action_url:
            return {
                'type': 'ir.actions.act_url',
                'url': self.action_url,
                'target': 'self',
            }

        return action

    @api.model
    def create_system_notification(self, title, message, notification_type='info', priority='normal', is_global=True):
        """Crée une notification système"""
        return self.create({
            'title': title,
            'message': message,
            'notification_type': notification_type,
            'priority': priority,
            'is_global': is_global,
            'created_by': self.env.user.id,
        })

    def cleanup_expired_notifications(self):
        """Nettoie les notifications expirées"""
        expired = self.search([
            ('expire_date', '<', fields.Datetime.now()),
            ('active', '=', True),
        ])
        expired.write({'active': False})

        return len(expired)