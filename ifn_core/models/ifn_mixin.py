# -*- coding: utf-8 -*-

import qrcode
import io
import base64
from datetime import datetime
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class IFNMixin(models.AbstractModel):
    """Mixin des fonctionnalités communes IFN (QR, UID, événements, etc.)"""
    _name = 'ifn.mixin'
    _description = 'Mixin IFN Core'

    # Champs communs pour UID et QR
    x_ifn_uid = fields.Char('UID IFN', copy=False, index=True,
                           help='Identifiant unique IFN')
    x_ifn_qr = fields.Binary('QR IFN', attachment=True,
                            help='Code QR généré pour cet enregistrement')
    x_ifn_qr_ref = fields.Char('Référence QR', copy=False, index=True,
                              help='Hash de référence du QR')
    x_ifn_qr_generated_date = fields.Datetime('Date génération QR', readonly=True)

    # Métadonnées IFN
    x_ifn_created_date = fields.Datetime('Date création IFN', readonly=True,
                                        default=fields.Datetime.now)
    x_ifn_updated_date = fields.Datetime('Dernière mise à jour IFN', readonly=True)
    x_ifn_version = fields.Integer('Version IFN', default=1)

    @api.model_create_multi
    def create(self, vals_list):
        """Surcharge pour générer UID/QR et publier événement"""
        records = super().create(vals_list)
        for record in records:
            if hasattr(record, '_ifn_assign_uid_and_qr'):
                record._ifn_assign_uid_and_qr()
            if hasattr(record, '_ifn_publish_event'):
                record._ifn_publish_event('ifn.record.created')
            record.x_ifn_created_date = fields.Datetime.now()
        return records

    def write(self, vals):
        """Surcharge pour mettre à jour les métadonnées et publier événement"""
        # Détecter les changements de champs sensibles
        sensitive_fields = self._get_sensitive_fields()
        has_sensitive_changes = any(field in vals for field in sensitive_fields)

        result = super().write(vals)

        if has_sensitive_changes and hasattr(self, '_ifn_log_sensitive_change'):
            self._ifn_log_sensitive_change(vals)

        if hasattr(self, '_ifn_publish_event'):
            self._ifn_publish_event('ifn.record.updated')

        # Mettre à jour les métadonnées IFN
        self.write({'x_ifn_updated_date': fields.Datetime.now(),
                   'x_ifn_version': self.x_ifn_version + 1})

        return result

    def _get_sensitive_fields(self):
        """Retourne la liste des champs sensibles à logger"""
        return [
            'x_ifn_role', 'x_ifn_market_id', 'x_ifn_coop_id',
            'x_ifn_geo_lat', 'x_ifn_geo_lng', 'email', 'phone'
        ]

    def _ifn_assign_uid_and_qr(self):
        """Génère et assigne un UID et QR uniques"""
        self.ensure_one()
        if not self.x_ifn_uid:
            self.x_ifn_uid = self._ifn_generate_uid()
        self._ifn_generate_qr()

    def _ifn_generate_uid(self):
        """Génère un UID IFN unique"""
        self.ensure_one()
        # Format: IFN-YYYYMMDD-XXXXX
        date_str = datetime.now().strftime('%Y%m%d')
        sequence = self.env['ir.sequence'].next_by_code('ifn.uid.sequence') or '00001'
        return f"IFN-{date_str}-{sequence.zfill(5)}"

    def _ifn_generate_qr(self):
        """Génère le code QR pour l'enregistrement"""
        self.ensure_one()
        if not self.x_ifn_uid:
            return

        # Données à encoder dans le QR
        qr_data = {
            'uid': self.x_ifn_uid,
            'type': self._name,
            'id': self.id,
            'generated': datetime.now().isoformat(),
        }

        # Convertir en string JSON
        import json
        qr_string = json.dumps(qr_data, separators=(',', ':'))

        # Générer le QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_string)
        qr.make(fit=True)

        # Convertir en image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convertir en base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        # Sauvegarder
        self.x_ifn_qr = qr_base64
        self.x_ifn_qr_ref = self._ifn_generate_qr_ref(qr_string)
        self.x_ifn_qr_generated_date = fields.Datetime.now()

    def _ifn_generate_qr_ref(self, qr_string):
        """Génère une référence unique pour le QR"""
        import hashlib
        return hashlib.md5(qr_string.encode()).hexdigest()[:16]

    def _ifn_publish_event(self, event_type):
        """Publie un événement sur le bus IFN"""
        self.ensure_one()
        if hasattr(self.env, 'bus') and self.env.bus:
            self.env.bus.sendmany(
                [(self.env.cr.dbname, 'ifn_events', event_type, {
                    'model': self._name,
                    'id': self.id,
                    'uid': self.x_ifn_uid,
                    'user_id': self.env.uid,
                    'timestamp': fields.Datetime.now().isoformat(),
                })]
            )

    def _ifn_log_sensitive_change(self, vals):
        """Enregistre les changements sensibles dans l'audit"""
        self.ensure_one()
        if not hasattr(self.env, 'ifn.audit.log'):
            return

        for field_name, new_value in vals.items():
            if field_name in self._get_sensitive_fields():
                old_value = getattr(self, field_name)
                if old_value != new_value:
                    self.env['ifn.audit.log'].create({
                        'object_model': self._name,
                        'object_id': self.id,
                        'user_id': self.env.uid,
                        'action': 'update',
                        'field_name': field_name,
                        'old_value': str(old_value) if old_value else '',
                        'new_value': str(new_value) if new_value else '',
                    })

    def action_regenerate_qr(self):
        """Action pour régénérer le QR code"""
        self.ensure_one()
        self._ifn_generate_qr()
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('QR Code régénéré'),
                'message': _('Le code QR a été régénéré avec succès'),
                'type': 'success',
            }
        }

    def action_print_qr_attestation(self):
        """Action pour imprimer l'attestation avec QR"""
        self.ensure_one()
        return self.env.ref('ifn_core.action_report_ifn_attestation').report_action(self)

    def _ifn_get_display_info(self):
        """Retourne les informations d'affichage standard"""
        self.ensure_one()
        return {
            'uid': self.x_ifn_uid,
            'name': getattr(self, 'name', str(self.id)),
            'qr_ref': self.x_ifn_qr_ref,
            'created_date': self.x_ifn_created_date,
        }