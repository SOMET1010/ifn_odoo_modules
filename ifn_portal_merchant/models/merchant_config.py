# -*- coding: utf-8 -*-
"""
IFN Merchant Configuration Models
================================

Configuration models for merchant portal settings.
"""
from odoo import models, fields, api, _
import json


class MerchantNotification(models.Model):
    """Merchant notification template and settings."""

    _name = 'ifn.merchant.notification'
    _description = 'Merchant Notification'
    _order = 'create_date desc'

    name = fields.Char(string="Notification Name", required=True)
    partner_id = fields.Many2one(
        'res.partner',
        string="Merchant",
        domain="[('ifn_role', '=', 'merchant')]"
    )
    notification_type = fields.Selection([
        ('stock_alert', 'Stock Alert'),
        ('payment_received', 'Payment Received'),
        ('payment_failed', 'Payment Failed'),
        ('social_reminder', 'Social Protection Reminder'),
        ('order_delivered', 'Order Delivered'),
        ('training_available', 'Training Available'),
    ], string="Notification Type", required=True)

    title = fields.Char(string="Title", required=True)
    message = fields.Text(string="Message", required=True)
    priority = fields.Selection([
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ], string="Priority", default='medium')

    status = fields.Selection([
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ], string="Status", default='draft')

    sent_date = fields.Datetime(string="Sent Date")
    read_date = fields.Datetime(string="Read Date")
    retry_count = fields.Integer(string="Retry Count", default=0)

    # Delivery methods
    email_sent = fields.Boolean(string="Email Sent")
    sms_sent = fields.Boolean(string="SMS Sent")
    push_sent = fields.Boolean(string="Push Notification Sent")

    @api.model
    def create_notification(self, partner_id, notification_type, title, message, priority='medium'):
        """Create a new notification for merchant."""
        notification = self.create({
            'partner_id': partner_id,
            'notification_type': notification_type,
            'title': title,
            'message': message,
            'priority': priority,
        })

        notification.send_notification()
        return notification

    def send_notification(self):
        """Send notification through available channels."""
        self.ensure_one()
        try:
            # Send email if partner has email
            if self.partner_id.email:
                self._send_email()

            # Send SMS if partner has phone
            if self.partner_id.mobile:
                self._send_sms()

            # Send push notification if merchant has portal access
            if self.partner_id.merchant_portal_enabled:
                self._send_push()

            self.status = 'sent'
            self.sent_date = fields.Datetime.now()

        except Exception as e:
            self.status = 'failed'
            self.retry_count += 1

    def _send_email(self):
        """Send email notification."""
        template = self.env.ref('ifn_portal_merchant.email_template_merchant_notification')
        if template:
            template.send_mail(self.id, force_send=True)
            self.email_sent = True

    def _send_sms(self):
        """Send SMS notification - mock implementation."""
        # Would integrate with SMS provider
        self.sms_sent = True

    def _send_push(self):
        """Send push notification - mock implementation."""
        # Would integrate with push notification service
        self.push_sent = True


class MerchantTrainingProgress(models.Model):
    """Merchant training progress tracking."""

    _name = 'ifn.merchant.training.progress'
    _description = 'Merchant Training Progress'
    _order = 'start_date desc'

    partner_id = fields.Many2one(
        'res.partner',
        string="Merchant",
        required=True,
        domain="[('ifn_role', '=', 'merchant')]"
    )
    training_course_id = fields.Many2one(
        'ifn.training.course',
        string="Training Course",
        required=True
    )

    start_date = fields.Datetime(
        string="Start Date",
        default=fields.Datetime.now,
        required=True
    )
    completion_date = fields.Datetime(string="Completion Date")

    status = fields.Selection([
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], string="Status", default='not_started')

    progress_percentage = fields.Float(
        string="Progress (%)",
        default=0.0
    )

    time_spent = fields.Float(
        string="Time Spent (minutes)",
        default=0.0
    )

    certificate_id = fields.Many2one(
        'ir.attachment',
        string="Certificate"
    )

    last_access_date = fields.Datetime(string="Last Access")

    def update_progress(self, percentage, time_spent_increment=0):
        """Update training progress."""
        self.ensure_one()

        self.progress_percentage = min(percentage, 100.0)
        self.time_spent += time_spent_increment
        self.last_access_date = fields.Datetime.now()

        if self.status == 'not_started':
            self.status = 'in_progress'

        if self.progress_percentage >= 100.0:
            self.complete_training()

    def complete_training(self):
        """Mark training as completed and generate certificate."""
        self.status = 'completed'
        self.completion_date = fields.Datetime.now()
        self._generate_certificate()

    def _generate_certificate(self):
        """Generate training certificate."""
        # Mock implementation - would generate PDF certificate
        certificate_content = f"""
        Certificate of Completion

        This certifies that {self.partner_id.name}
        has successfully completed the training course:

        {self.training_course_id.name}

        Completion Date: {self.completion_date}

        Duration: {self.time_spent} minutes
        """

        attachment = self.env['ir.attachment'].create({
            'name': f'Certificate_{self.partner_id.name}_{self.training_course_id.name}.pdf',
            'type': 'binary',
            'datas': certificate_content.encode('utf-8'),
            'res_model': self._name,
            'res_id': self.id,
            'mimetype': 'application/pdf',
        })

        self.certificate_id = attachment.id