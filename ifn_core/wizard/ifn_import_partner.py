# -*- coding: utf-8 -*-

import base64
import csv
import io
import logging
from datetime import datetime

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError

_logger = logging.getLogger(__name__)


class IFNImportPartnerWizard(models.TransientModel):
    _name = 'ifn.import.partner.wizard'
    _description = 'Assistant Import Partenaires IFN'

    # Fichier d'import
    import_file = fields.Binary('Fichier CSV', required=True,
                              help='Fichier CSV contenant les données des partenaires à importer')
    import_filename = fields.Char('Nom du fichier')

    # Configuration de l'import
    has_header = fields.Boolean('Première ligne = en-têtes', default=True,
                               help='Indique si la première ligne du fichier contient les noms des colonnes')
    delimiter = fields.Selection([
        (',', 'Virgule (,)'),
        (';', 'Point-virgule (;)'),
        ('\\t', 'Tabulation'),
    ], string='Séparateur', default=',', required=True)

    encoding = fields.Selection([
        ('utf-8', 'UTF-8'),
        ('iso-8859-1', 'ISO-8859-1 (Latin-1)'),
        ('windows-1252', 'Windows-1252'),
    ], string='Encodage', default='utf-8', required=True)

    # Options d'import
    create_missing_markets = fields.Boolean('Créer marchés manquants', default=True)
    create_missing_coops = fields.Boolean('Créer coopératives manquantes', default=True)
    generate_uid_qr = fields.Boolean('Générer UID et QR', default=True)
    validate_profiles = fields.Boolean('Valider les profils', default=False)
    send_welcome_email = fields.Boolean('Envoyer email bienvenue', default=False)

    # Valeurs par défaut
    default_role = fields.Selection([
        ('merchant', 'Marchand'),
        ('producer', 'Producteur'),
        ('coop_manager', 'Gestionnaire Coop'),
        ('agent', 'Agent'),
        ('admin', 'Administrateur'),
    ], string='Rôle par défaut', default='producer', required=True)

    default_language = fields.Selection([
        ('fr', 'Français'),
        ('ba', 'Baoulé'),
        ('di', 'Dioula'),
        ('ci', 'Côte d\'Ivoire'),
        ('en', 'English'),
    ], string='Langue par défaut', default='fr', required=True)

    default_market_id = fields.Many2one('ifn.market', string='Marché par défaut')
    default_data_consent = fields.Boolean('Consentement données par défaut', default=True)

    # Résultats de l'import
    total_rows = fields.Integer('Total lignes', readonly=True)
    imported_count = fields.Integer('Importés', readonly=True)
    skipped_count = fields.Integer('Ignorés', readonly=True)
    error_count = fields.Integer('Erreurs', readonly=True)
    errors = fields.Text('Erreurs détaillées', readonly=True)

    # Colonnes attendues (pour information)
    expected_columns = fields.Text('Colonnes attendues', readonly=True,
                                  default='Nom,Email,Téléphone,Rôle,Marché,Coopérative,Latitude,Longitude,Ville')

    @api.model
    def default_get(self, fields_list):
        """Définit les valeurs par défaut pour l'assistant"""
        defaults = super().default_get(fields_list)
        defaults['expected_columns'] = self._get_expected_columns_info()
        return defaults

    def _get_expected_columns_info(self):
        """Retourne les informations sur les colonnes attendues"""
        columns = [
            "Nom* - Nom complet du partenaire",
            "Email - Adresse email (optionnel)",
            "Téléphone - Numéro de téléphone",
            "Rôle - merchant/producer/coop_manager/agent/admin",
            "Marché - Nom ou code du marché",
            "Coopérative - Nom de la coopérative",
            "Latitude - Coordonnée GPS",
            "Longitude - Coordonnée GPS",
            "Ville - Ville de résidence",
            "Langue - fr/ba/di/en (défaut: fr)",
            "Consentement - oui/non (défaut: oui)",
        ]
        return "\n".join([f"{i+1}. {col}" for i, col in enumerate(columns)])

    @api.constrains('import_file')
    def _check_import_file(self):
        """Valide le fichier d'import"""
        if self.import_file and self.import_filename:
            if not self.import_filename.lower().endswith('.csv'):
                raise ValidationError(_('Le fichier doit être au format CSV'))

    def action_preview_import(self):
        """Prévisualise l'import sans créer les enregistrements"""
        self.ensure_one()
        try:
            data = self._read_csv_file()
            preview_lines = min(10, len(data))

            return {
                'type': 'ir.actions.act_window',
                'name': 'Prévisualisation Import',
                'view_mode': 'form',
                'res_model': 'ifn.import.partner.preview',
                'target': 'new',
                'context': {
                    'preview_data': data[:preview_lines],
                    'total_rows': len(data),
                    'wizard_id': self.id,
                }
            }
        except Exception as e:
            raise UserError(_('Erreur lors de la lecture du fichier: %s') % str(e))

    def action_import_partners(self):
        """Lance l'import des partenaires"""
        self.ensure_one()

        try:
            data = self._read_csv_file()
            self.total_rows = len(data)

            # Initialiser les compteurs
            self.imported_count = 0
            self.skipped_count = 0
            self.error_count = 0
            self.errors = ''

            # Traiter chaque ligne
            for row_num, row in enumerate(data, 2):  # +2 car on commence à la ligne 2 (après en-tête)
                try:
                    self._import_partner_row(row, row_num)
                    self.imported_count += 1
                except Exception as e:
                    self.error_count += 1
                    error_msg = f"Ligne {row_num}: {str(e)}\n"
                    self.errors += error_msg
                    _logger.error(f"Import error at row {row_num}: {str(e)}")

            # Afficher le résultat
            return self._show_import_result()

        except Exception as e:
            raise UserError(_('Erreur lors de l\'import: %s') % str(e))

    def _read_csv_file(self):
        """Lit le fichier CSV et retourne les données"""
        if not self.import_file:
            raise ValidationError(_('Veuillez sélectionner un fichier à importer'))

        # Décoder le fichier
        file_data = base64.b64decode(self.import_file)

        try:
            csv_data = file_data.decode(self.encoding)
        except UnicodeDecodeError:
            # Essayer avec un autre encodage
            csv_data = file_data.decode('utf-8', errors='replace')

        # Parser le CSV
        csv_reader = csv.DictReader(io.StringIO(csv_data), delimiter=self.delimiter) if self.has_header else csv.reader(io.StringIO(csv_data), delimiter=self.delimiter)

        data = list(csv_reader)

        if not data:
            raise ValidationError(_('Le fichier CSV est vide'))

        return data

    def _import_partner_row(self, row, row_num):
        """Importe une ligne de données de partenaire"""
        # Extraire les données selon le format
        if self.has_header:
            name = self._get_value(row, 'Nom', 'name', 'Name')
            email = self._get_value(row, 'Email', 'email', 'Email')
            phone = self._get_value(row, 'Téléphone', 'phone', 'Phone', 'Tel')
            role = self._get_value(row, 'Rôle', 'role', 'Role') or self.default_role
            market_name = self._get_value(row, 'Marché', 'market', 'Market')
            coop_name = self._get_value(row, 'Coopérative', 'coop', 'Coop', 'Cooperative')
            lat = self._get_value(row, 'Latitude', 'lat', 'latitude')
            lng = self._get_value(row, 'Longitude', 'lng', 'longitude')
            city = self._get_value(row, 'Ville', 'city', 'City')
            lang = self._get_value(row, 'Langue', 'lang', 'language', 'Language') or self.default_language
            consent = self._get_value(row, 'Consentement', 'consent', 'Consent')
        else:
            # Format ordonné
            if len(row) < 3:
                raise ValueError('Au minimum Nom, Email et Téléphone sont requis')

            name = row[0]
            email = row[1] if len(row) > 1 else ''
            phone = row[2] if len(row) > 2 else ''
            role = row[3] if len(row) > 3 else self.default_role
            market_name = row[4] if len(row) > 4 else ''
            coop_name = row[5] if len(row) > 5 else ''
            lat = row[6] if len(row) > 6 else ''
            lng = row[7] if len(row) > 7 else ''
            city = row[8] if len(row) > 8 else ''
            lang = row[9] if len(row) > 9 else self.default_language
            consent = row[10] if len(row) > 10 else ''

        # Validation des champs obligatoires
        if not name:
            raise ValueError('Le nom est obligatoire')

        # Vérifier si le partenaire existe déjà
        existing_partner = self._find_existing_partner(name, email, phone)
        if existing_partner:
            self.skipped_count += 1
            _logger.info(f"Partner already exists: {existing_partner.name} (skipped)")
            return

        # Préparer les valeurs du partenaire
        partner_vals = self._prepare_partner_vals(
            name=name, email=email, phone=phone, role=role,
            market_name=market_name, coop_name=coop_name,
            lat=lat, lng=lng, city=city, lang=lang, consent=consent
        )

        # Créer le partenaire
        partner = self.env['res.partner'].create(partner_vals)

        # Générer UID/QR si demandé
        if self.generate_uid_qr:
            partner._ifn_assign_uid_and_qr()

        # Valider le profil si demandé
        if self.validate_profiles:
            partner.x_ifn_profile_status = 'validated'
            partner.x_ifn_validation_date = fields.Datetime.now()
            partner.x_ifn_validator_id = self.env.user.id

        # Envoyer email de bienvenue si demandé
        if self.send_welcome_email and partner.email:
            self._send_welcome_email(partner)

        _logger.info(f"Successfully imported partner: {partner.name}")

    def _get_value(self, row, *possible_keys):
        """Récupère une valeur d'une ligne CSV en essayant plusieurs clés"""
        for key in possible_keys:
            if key in row and row[key]:
                return row[key].strip()
        return None

    def _find_existing_partner(self, name, email, phone):
        """Cherche si un partenaire existe déjà"""
        domain = []
        if name:
            domain.append(('name', '=', name))
        if email:
            domain.append(('email', '=', email))
        if phone:
            domain.append(('phone', '=', phone))

        if not domain:
            return None

        # Chercher avec OR
        or_domains = []
        if name:
            or_domains.append([('name', '=', name)])
        if email:
            or_domains.append([('email', '=', email)])
        if phone:
            or_domains.append([('phone', '=', phone)])

        if or_domains:
            partners = self.env['res.partner'].search([('id', 'in', self.env['res.partner'].search(domain, limit=1).ids)])
            return partners[:1]

        return None

    def _prepare_partner_vals(self, name, email, phone, role, market_name, coop_name,
                             lat, lng, city, lang, consent):
        """Prépare les valeurs pour la création du partenaire"""
        vals = {
            'name': name,
            'email': email,
            'phone': phone,
            'x_ifn_role': role,
            'x_ifn_lang_pref': lang,
            'is_company': False,
            'x_ifn_data_processing_consent': self.default_data_consent,
            'x_ifn_data_processing_consent_date': fields.Datetime.now(),
        }

        # Géolocalisation
        if lat and lng:
            try:
                vals['x_ifn_geo_lat'] = float(lat)
                vals['x_ifn_geo_lng'] = float(lng)
            except ValueError:
                pass

        # Ville
        if city:
            vals['city'] = city

        # Consentement explicite
        if consent:
            consent_lower = consent.lower()
            if consent_lower in ['oui', 'yes', '1', 'true', 'vrai']:
                vals['x_ifn_data_processing_consent'] = True
                vals['x_ifn_data_processing_consent_date'] = fields.Datetime.now()
            elif consent_lower in ['non', 'no', '0', 'false', 'faux']:
                vals['x_ifn_data_processing_consent'] = False
                vals['x_ifn_data_processing_consent_date'] = fields.Datetime.now()

        # Marché
        market_id = self._find_or_create_market(market_name)
        if market_id:
            vals['x_ifn_market_id'] = market_id

        # Coopérative
        coop_id = self._find_or_create_coop(coop_name, market_id)
        if coop_id:
            vals['x_ifn_coop_id'] = coop_id

        return vals

    def _find_or_create_market(self, market_name):
        """Trouve ou crée un marché"""
        if not market_name:
            return self.default_market_id.id if self.default_market_id else None

        # Chercher par nom ou code
        market = self.env['ifn.market'].search([
            '|', ('name', 'ilike', market_name), ('code', 'ilike', market_name)
        ], limit=1)

        if market:
            return market.id

        # Créer le marché si autorisé
        if self.create_missing_markets:
            return self.env['ifn.market'].create({
                'name': market_name,
                'code': market_name[:10].upper(),
                'active': True,
            }).id

        return self.default_market_id.id if self.default_market_id else None

    def _find_or_create_coop(self, coop_name, market_id):
        """Trouve ou crée une coopérative"""
        if not coop_name:
            return None

        # Chercher par nom
        coop = self.env['ifn.coop'].search([('name', 'ilike', coop_name)], limit=1)

        if coop:
            return coop.id

        # Créer la coopérative si autorisé
        if self.create_missing_coops:
            vals = {
                'name': coop_name,
                'code': coop_name[:10].upper(),
                'active': True,
            }
            if market_id:
                vals['market_id'] = market_id

            return self.env['ifn.coop'].create(vals).id

        return None

    def _send_welcome_email(self, partner):
        """Envoie un email de bienvenue au partenaire"""
        try:
            template = self.env.ref('ifn_core.email_template_partner_welcome', raise_if_not_found=False)
            if template:
                template.send_mail(partner.id, force_send=True)
        except Exception as e:
            _logger.warning(f"Failed to send welcome email to {partner.email}: {str(e)}")

    def _show_import_result(self):
        """Affiche le résultat de l'import"""
        total = self.imported_count + self.skipped_count + self.error_count
        message = _('Import terminé: %s importés, %s ignorés, %s erreurs sur %s total') % (
            self.imported_count, self.skipped_count, self.error_count, total
        )

        notification_type = 'success' if self.error_count == 0 else 'warning'

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Import Terminé'),
                'message': message,
                'type': notification_type,
                'sticky': self.error_count > 0,
            }
        }

    def action_download_template(self):
        """Télécharge le template CSV d'import"""
        template_content = self._generate_csv_template()

        attachment = self.env['ir.attachment'].create({
            'name': 'ifn_import_template.csv',
            'type': 'binary',
            'datas': base64.b64encode(template_content.encode('utf-8')),
            'res_model': self._name,
            'res_id': self.id,
        })

        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }

    def _generate_csv_template(self):
        """Génère le template CSV d'import"""
        headers = ['Nom', 'Email', 'Téléphone', 'Rôle', 'Marché', 'Coopérative', 'Latitude', 'Longitude', 'Ville', 'Langue', 'Consentement']
        example_row = ['Ex: Konan Mari', 'konan.mari@email.com', '+225 07 89 45 12', 'producer', 'Abidjan', 'Coop Café', '5.3600', '-4.0083', 'Abidjan', 'fr', 'oui']

        return ','.join(headers) + '\n' + ','.join(example_row)


class IFNImportPartnerPreview(models.TransientModel):
    _name = 'ifn.import.partner.preview'
    _description = 'Prévisualisation Import Partenaires IFN'
    _auto_delete = True

    preview_data = fields.Text('Données de prévisualisation', readonly=True)
    total_rows = fields.Integer('Total lignes', readonly=True)
    wizard_id = fields.Many2one('ifn.import.partner.wizard', readonly=True)