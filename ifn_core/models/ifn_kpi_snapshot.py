# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from datetime import datetime, timedelta
import json
import logging
import base64

_logger = logging.getLogger(__name__)


class IFNKpiSnapshot(models.Model):
    _name = 'ifn.kpi.snapshot'
    _description = 'Snapshot KPI IFN'
    _order = 'snapshot_date desc'
    _rec_name = 'display_name'
    _sql_constraints = [
        ('unique_date_market', 'unique(snapshot_date, market_id)', 'Snapshot déjà existant pour cette date et marché !'),
        ('unique_date_coop', 'unique(snapshot_date, coop_id)', 'Snapshot déjà existant pour cette date et coopérative !'),
        ('unique_date_global', 'unique(snapshot_date, market_id, coop_id)', 'Snapshot global déjà existant pour cette date !'),
    ]

    # Informations générales
    snapshot_date = fields.Date('Date du snapshot', required=True, index=True)
    snapshot_type = fields.Selection([
        ('daily', 'Quotidien'),
        ('weekly', 'Hebdomadaire'),
        ('monthly', 'Mensuel'),
        ('custom', 'Personnalisé'),
    ], string='Type de snapshot', required=True, default='daily', index=True)

    display_name = fields.Char('Nom affiché', compute='_compute_display_name', store=True)

    # Périmètre du snapshot
    market_id = fields.Many2one('ifn.market', string='Marché', index=True)
    market_name = fields.Char(related='market_id.name', store=True, readonly=True)
    coop_id = fields.Many2one('ifn.coop', string='Coopérative', index=True)
    coop_name = fields.Char(related='coop_id.name', store=True, readonly=True)

    # Si global (market_id et coop_id sont False)
    is_global = fields.Boolean('Snapshot global', compute='_compute_is_global', store=True)

    # KPIs Utilisateurs et partenaires
    total_partners = fields.Integer('Total partenaires', default=0)
    active_partners = fields.Integer('Partenaires actifs', default=0)

    # Répartition par rôle
    merchant_count = fields.Integer('Marchands', default=0)
    producer_count = fields.Integer('Producteurs', default=0)
    coop_manager_count = fields.Integer('Gestionnaires coop', default=0)
    agent_count = fields.Integer('Agents', default=0)
    admin_count = fields.Integer('Administrateurs', default=0)

    # Nouveaux partenaires (période)
    new_partners_today = fields.Integer('Nouveaux partenaires (jour)', default=0)
    new_partners_week = fields.Integer('Nouveaux partenaires (semaine)', default=0)
    new_partners_month = fields.Integer('Nouveaux partenaires (mois)', default=0)

    # KPIs Adoption et engagement
    partners_with_qr = fields.Integer('Partenaires avec QR', default=0)
    qr_generation_rate = fields.Float('Taux génération QR (%)', digits=(5, 2), compute='_compute_rates')
    geo_located_partners = fields.Integer('Partenaires géolocalisés', default=0)
    geo_location_rate = fields.Float('Taux géolocalisation (%)', digits=(5, 2), compute='_compute_rates')

    # KPIs Consentements
    voice_consent_count = fields.Integer('Consentement voix', default=0)
    data_processing_consent_count = fields.Integer('Consentement traitement données', default=0)
    marketing_consent_count = fields.Integer('Consentement marketing', default=0)

    # KPIs Validation profils
    validated_profiles = fields.Integer('Profils validés', default=0)
    pending_validation = fields.Integer('En attente validation', default=0)
    validation_rate = fields.Float('Taux validation (%)', digits=(5, 2), compute='_compute_rates')

    # KPIs Référentiels
    total_markets = fields.Integer('Total marchés', default=0)
    active_markets = fields.Integer('Marchés actifs', default=0)
    total_coops = fields.Integer('Total coopératives', default=0)
    active_coops = fields.Integer('Coopératives actives', default=0)
    total_zones = fields.Integer('Total zones', default=0)

    # KPIs Internationalisation
    language_distribution = fields.Text('Distribution langues', help='JSON de distribution des langues')
    top_language = fields.Char('Langue principale', compute='_compute_language_stats')

    # KPIs Activité et transactions (placeholders pour modules métiers)
    total_transactions = fields.Integer('Total transactions', default=0,
                                       help='Placeholder pour modules métiers')
    active_users_today = fields.Integer('Utilisateurs actifs (jour)', default=0)
    portal_logins_today = fields.Integer('Connexions portail (jour)', default=0)

    # KPIs Qualité et performance
    avg_profile_completion = fields.Float('Taux complétion profil moyen (%)', digits=(5, 2), default=0)
    data_quality_score = fields.Float('Score qualité données (%)', digits=(5, 2), default=0)

    # Métadonnées
    generated_at = fields.Datetime('Généré le', default=fields.Datetime.now, readonly=True)
    generated_by = fields.Many2one('res.users', string='Généré par', default=lambda self: self.env.uid, readonly=True)
    processing_time_seconds = fields.Float('Temps traitement (secondes)', digits=(10, 3), readonly=True)

    # Statut et validation
    status = fields.Selection([
        ('draft', 'Brouillon'),
        ('processed', 'Traité'),
        ('error', 'Erreur'),
        ('validated', 'Validé'),
    ], string='Statut', default='draft', index=True)

    error_message = fields.Text('Message d\'erreur')
    notes = fields.Text('Notes')

    @api.depends('snapshot_date', 'market_id', 'coop_id', 'is_global')
    def _compute_display_name(self):
        for snapshot in self:
            date_str = snapshot.snapshot_date.strftime('%d/%m/%Y')
            if snapshot.is_global:
                snapshot.display_name = f"KPI Global - {date_str}"
            elif snapshot.coop_id:
                snapshot.display_name = f"KPI {snapshot.coop_name} - {date_str}"
            elif snapshot.market_id:
                snapshot.display_name = f"KPI {snapshot.market_name} - {date_str}"
            else:
                snapshot.display_name = f"KPI Snapshot - {date_str}"

    @api.depends('market_id', 'coop_id')
    def _compute_is_global(self):
        for snapshot in self:
            snapshot.is_global = not snapshot.market_id and not snapshot.coop_id

    @api.depends('partners_with_qr', 'total_partners', 'geo_located_partners',
                 'validated_profiles', 'active_partners')
    def _compute_rates(self):
        for snapshot in self:
            if snapshot.total_partners > 0:
                snapshot.qr_generation_rate = (snapshot.partners_with_qr / snapshot.total_partners) * 100
                snapshot.geo_location_rate = (snapshot.geo_located_partners / snapshot.total_partners) * 100
            if snapshot.active_partners > 0:
                snapshot.validation_rate = (snapshot.validated_profiles / snapshot.active_partners) * 100

    def _compute_language_stats(self):
        """Calcule la langue principale"""
        for snapshot in self:
            if snapshot.language_distribution:
                try:
                    lang_data = json.loads(snapshot.language_distribution)
                    if lang_data:
                        snapshot.top_language = max(lang_data.items(), key=lambda x: x[1])[0]
                        continue
                except json.JSONDecodeError:
                    pass
            snapshot.top_language = 'fr'  # Par défaut

    @api.model
    def generate_daily_snapshots(self, target_date=None):
        """Génère les snapshots quotidiens"""
        if target_date is None:
            target_date = fields.Date.today()

        start_time = datetime.now()

        try:
            # Snapshot global
            global_snapshot = self._create_snapshot(target_date, None, None, 'daily')

            # Snapshots par marché
            markets = self.env['ifn.market'].search([('active', '=', True)])
            for market in markets:
                self._create_snapshot(target_date, market.id, None, 'daily')

            # Snapshots par coopérative
            coops = self.env['ifn.coop'].search([('active', '=', True)])
            for coop in coops:
                self._create_snapshot(target_date, None, coop.id, 'daily')

            processing_time = (datetime.now() - start_time).total_seconds()
            _logger.info(f"Daily KPI snapshots generated in {processing_time:.2f} seconds")

            return True

        except Exception as e:
            _logger.error(f"Error generating daily KPI snapshots: {str(e)}")
            return False

    def _create_snapshot(self, target_date, market_id=None, coop_id=None, snapshot_type='daily'):
        """Crée un snapshot KPI"""
        # Vérifier si le snapshot existe déjà
        domain = [
            ('snapshot_date', '=', target_date),
            ('snapshot_type', '=', snapshot_type),
        ]
        if market_id:
            domain.append(('market_id', '=', market_id))
        if coop_id:
            domain.append(('coop_id', '=', coop_id))
        if not market_id and not coop_id:
            domain.append(('market_id', '=', False))
            domain.append(('coop_id', '=', False))

        existing = self.search(domain)
        if existing:
            return existing[0]

        start_time = datetime.now()

        # Créer le snapshot avec les KPIs calculés
        snapshot_vals = self._calculate_kpis(target_date, market_id, coop_id, snapshot_type)
        snapshot_vals.update({
            'snapshot_date': target_date,
            'snapshot_type': snapshot_type,
            'market_id': market_id,
            'coop_id': coop_id,
            'status': 'processed',
            'processing_time_seconds': (datetime.now() - start_time).total_seconds(),
        })

        snapshot = self.create(snapshot_vals)
        return snapshot

    def _calculate_kpis(self, target_date, market_id=None, coop_id=None, snapshot_type='daily'):
        """Calcule les KPIs pour le snapshot"""
        domain = []
        if market_id:
            domain.append(('x_ifn_market_id', '=', market_id))
        if coop_id:
            domain.append(('x_ifn_coop_id', '=', coop_id))

        # Domaine pour partenaires actifs
        active_domain = domain + [('active', '=', True)]

        # KPIs de base
        partners = self.env['res.partner'].search(active_domain)
        total_partners = len(partners)

        # Répartition par rôle
        role_counts = {}
        for role in ['merchant', 'producer', 'coop_manager', 'agent', 'admin']:
            role_domain = active_domain + [('x_ifn_role', '=', role)]
            role_counts[role] = self.env['res.partner'].search_count(role_domain)

        # Nouveaux partenaires
        today_start = fields.Datetime.from_string(target_date)
        today_end = today_start + timedelta(days=1)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)

        new_today = self.env['res.partner'].search_count(
            domain + [('create_date', '>=', today_start), ('create_date', '<', today_end)]
        )
        new_week = self.env['res.partner'].search_count(
            domain + [('create_date', '>=', week_start)]
        )
        new_month = self.env['res.partner'].search_count(
            domain + [('create_date', '>=', month_start)]
        )

        # KPIs adoption
        qr_count = self.env['res.partner'].search_count(
            active_domain + [('x_ifn_qr', '!=', False)]
        )
        geo_count = self.env['res.partner'].search_count(
            active_domain + [('x_ifn_geo_lat', '!=', False)]
        )

        # Consentements
        voice_consent = self.env['res.partner'].search_count(
            active_domain + [('x_ifn_voice_consent', '=', True)]
        )
        data_consent = self.env['res.partner'].search_count(
            active_domain + [('x_ifn_data_processing_consent', '=', True)]
        )
        marketing_consent = self.env['res.partner'].search_count(
            active_domain + [('x_ifn_marketing_consent', '=', True)]
        )

        # Validation profils
        validated_count = self.env['res.partner'].search_count(
            active_domain + [('x_ifn_profile_status', '=', 'validated')]
        )
        pending_count = self.env['res.partner'].search_count(
            active_domain + [('x_ifn_profile_status', '=', 'pending_validation')]
        )

        # Distribution des langues
        lang_distribution = self._calculate_language_distribution(active_domain)

        # KPIs référentiels
        if not market_id and not coop_id:
            # Global stats
            total_markets = self.env['ifn.market'].search_count([])
            active_markets = self.env['ifn.market'].search_count([('active', '=', True)])
            total_coops = self.env['ifn.coop'].search_count([])
            active_coops = self.env['ifn.coop'].search_count([('active', '=', True)])
            total_zones = self.env['ifn.zone'].search_count([])
        else:
            # Stats limitées au périmètre
            total_markets = 1 if market_id else 0
            active_markets = 1 if market_id else 0
            total_coops = 1 if coop_id else 0
            active_coops = 1 if coop_id else 0
            total_zones = 0

        # Assembler les valeurs
        kpi_vals = {
            'total_partners': total_partners,
            'active_partners': len(partners),
            'merchant_count': role_counts.get('merchant', 0),
            'producer_count': role_counts.get('producer', 0),
            'coop_manager_count': role_counts.get('coop_manager', 0),
            'agent_count': role_counts.get('agent', 0),
            'admin_count': role_counts.get('admin', 0),
            'new_partners_today': new_today,
            'new_partners_week': new_week,
            'new_partners_month': new_month,
            'partners_with_qr': qr_count,
            'geo_located_partners': geo_count,
            'voice_consent_count': voice_consent,
            'data_processing_consent_count': data_consent,
            'marketing_consent_count': marketing_consent,
            'validated_profiles': validated_count,
            'pending_validation': pending_count,
            'language_distribution': json.dumps(lang_distribution),
            'total_markets': total_markets,
            'active_markets': active_markets,
            'total_coops': total_coops,
            'active_coops': active_coops,
            'total_zones': total_zones,
        }

        return kpi_vals

    def _calculate_language_distribution(self, domain):
        """Calcule la distribution des langues"""
        partners = self.env['res.partner'].search(domain)
        lang_counts = {}

        for partner in partners:
            lang = partner.x_ifn_lang_pref or 'unknown'
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

        return lang_counts

    def action_view_partners(self):
        """Affiche les partenaires du snapshot"""
        self.ensure_one()
        domain = [('active', '=', True)]
        if self.market_id:
            domain.append(('x_ifn_market_id', '=', self.market_id.id))
        if self.coop_id:
            domain.append(('x_ifn_coop_id', '=', self.coop_id.id))

        return {
            'name': _('Partenaires du snapshot'),
            'view_mode': 'tree,form',
            'res_model': 'res.partner',
            'domain': domain,
            'type': 'ir.actions.act_window',
        }

    def action_export_kpis(self):
        """Exporte les KPIs en CSV"""
        self.ensure_one()

        # Préparer les données CSV
        import csv
        import io

        output = io.StringIO()
        writer = csv.writer(output)

        # En-têtes
        headers = [
            'Snapshot Date', 'Type', 'Market', 'Coop',
            'Total Partners', 'Active Partners',
            'Merchants', 'Producers', 'Coop Managers', 'Agents', 'Admins',
            'New Today', 'New Week', 'New Month',
            'With QR', 'QR Rate (%)', 'Geo Located', 'Geo Rate (%)',
            'Voice Consent', 'Data Consent', 'Marketing Consent',
            'Validated Profiles', 'Pending Validation', 'Validation Rate (%)',
            'Top Language', 'Total Markets', 'Active Markets',
            'Total Coops', 'Active Coops', 'Total Zones'
        ]
        writer.writerow(headers)

        # Données
        row = [
            self.snapshot_date, self.snapshot_type,
            self.market_name or '', self.coop_name or '',
            self.total_partners, self.active_partners,
            self.merchant_count, self.producer_count,
            self.coop_manager_count, self.agent_count, self.admin_count,
            self.new_partners_today, self.new_partners_week, self.new_partners_month,
            self.partners_with_qr, self.qr_generation_rate,
            self.geo_located_partners, self.geo_location_rate,
            self.voice_consent_count, self.data_processing_consent_count,
            self.marketing_consent_count, self.validated_profiles,
            self.pending_validation, self.validation_rate,
            self.top_language, self.total_markets, self.active_markets,
            self.total_coops, self.active_coops, self.total_zones
        ]
        writer.writerow(row)

        # Créer attachment
        csv_content = output.getvalue().encode('utf-8')
        attachment = self.env['ir.attachment'].create({
            'name': f'kpi_snapshot_{self.snapshot_date.strftime("%Y%m%d")}.csv',
            'type': 'binary',
            'datas': base64.b64encode(csv_content),
            'res_model': self._name,
            'res_id': self.id,
        })

        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }

    @api.model
    def get_kpi_trends(self, days=30):
        """Retourne les tendances KPI sur N jours"""
        end_date = fields.Date.today()
        start_date = end_date - timedelta(days=days)

        snapshots = self.search([
            ('snapshot_date', '>=', start_date),
            ('snapshot_date', '<=', end_date),
            ('is_global', '=', True),
            ('snapshot_type', '=', 'daily'),
        ], order='snapshot_date asc')

        trends = {
            'dates': [],
            'total_partners': [],
            'new_partners_daily': [],
            'qr_rates': [],
            'validation_rates': [],
        }

        for snapshot in snapshots:
            trends['dates'].append(snapshot.snapshot_date.strftime('%Y-%m-%d'))
            trends['total_partners'].append(snapshot.total_partners)
            trends['new_partners_daily'].append(snapshot.new_partners_today)
            trends['qr_rates'].append(snapshot.qr_generation_rate)
            trends['validation_rates'].append(snapshot.validation_rate)

        return trends

    @api.model
    def _ifn_generate_monthly_report(self):
        """CRON Job: Génère le rapport mensuel IFN"""
        _logger.info("Generating monthly IFN report")

        # Obtenir le premier jour du mois dernier
        today = fields.Date.today()
        first_day_current_month = today.replace(day=1)
        last_day_previous_month = first_day_current_month - timedelta(days=1)
        first_day_previous_month = last_day_previous_month.replace(day=1)

        # Générer le rapport pour le mois dernier
        report_data = self._generate_monthly_report_data(
            first_day_previous_month, last_day_previous_month
        )

        # Créer attachment avec le rapport
        report_content = self._format_monthly_report(report_data)
        attachment = self.env['ir.attachment'].create({
            'name': f'ifn_monthly_report_{last_day_previous_month.strftime("%Y_%m")}.txt',
            'type': 'binary',
            'datas': base64.b64encode(report_content.encode('utf-8')),
            'res_model': self._name,
            'description': f'Rapport mensuel IFN pour {last_day_previous_month.strftime("%B %Y")}',
        })

        _logger.info(f"Monthly report generated: {attachment.name}")
        return attachment.id

    def _generate_monthly_report_data(self, start_date, end_date):
        """Génère les données du rapport mensuel"""
        # Snapshots du mois
        monthly_snapshots = self.search([
            ('snapshot_date', '>=', start_date),
            ('snapshot_date', '<=', end_date),
            ('is_global', '=', True),
            ('snapshot_type', '=', 'daily'),
        ])

        # KPIs de début et fin de mois
        first_snapshot = monthly_snapshots.sorted('snapshot_date')[:1]
        last_snapshot = monthly_snapshots.sorted('snapshot_date', reverse=True)[:1]

        # Statistiques du mois
        total_new_partners = sum(s.new_partners_today for s in monthly_snapshots)
        avg_qr_rate = sum(s.qr_generation_rate for s in monthly_snapshots) / len(monthly_snapshots) if monthly_snapshots else 0
        avg_validation_rate = sum(s.validation_rate for s in monthly_snapshots) / len(monthly_snapshots) if monthly_snapshots else 0

        # Top activités
        audit_logs = self.env['ifn.audit.log'].search([
            ('create_date', '>=', start_date),
            ('create_date', '<=', end_date),
        ])

        top_actions = {}
        for log in audit_logs:
            action = log.action
            top_actions[action] = top_actions.get(action, 0) + 1

        # Distribution des rôles
        role_distribution = self.env['res.partner']._read_group([
            ('x_ifn_role', '!=', False),
            ('active', '=', True),
        ], ['x_ifn_role'], ['x_ifn_role'])

        return {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'month_name': end_date.strftime('%B %Y'),
            },
            'snapshots': {
                'count': len(monthly_snapshots),
                'first_day': first_snapshot[:1],
                'last_day': last_snapshot[:1],
            },
            'partners': {
                'total_start': first_snapshot.total_partners if first_snapshot else 0,
                'total_end': last_snapshot.total_partners if last_snapshot else 0,
                'new_month': total_new_partners,
                'validated_end': last_snapshot.validated_profiles if last_snapshot else 0,
            },
            'adoption': {
                'qr_rate_avg': round(avg_qr_rate, 2),
                'validation_rate_avg': round(avg_validation_rate, 2),
                'with_qr_end': last_snapshot.partners_with_qr if last_snapshot else 0,
                'geo_located_end': last_snapshot.geo_located_partners if last_snapshot else 0,
            },
            'activities': {
                'total_audit_logs': len(audit_logs),
                'top_actions': sorted(top_actions.items(), key=lambda x: x[1], reverse=True)[:5],
            },
            'role_distribution': dict((role['x_ifn_role'], role['x_ifn_role_count']) for role in role_distribution),
        }

    def _format_monthly_report(self, report_data):
        """Formate le rapport mensuel en texte"""
        lines = []
        lines.append("=" * 80)
        lines.append("RAPPORT MENSUEL IFN")
        lines.append("=" * 80)
        lines.append(f"Période: {report_data['period']['month_name']}")
        lines.append(f"Du {report_data['period']['start_date']} au {report_data['period']['end_date']}")
        lines.append("")

        # Résumé
        lines.append("RÉSUMÉ")
        lines.append("-" * 40)
        lines.append(f"Total partenaires (début mois): {report_data['partners']['total_start']}")
        lines.append(f"Total partenaires (fin mois): {report_data['partners']['total_end']}")
        lines.append(f"Nouveaux partenaires ce mois: {report_data['partners']['new_month']}")
        lines.append(f"Profils validés (fin mois): {report_data['partners']['validated_end']}")
        lines.append("")

        # Adoption
        lines.append("TAUX D'ADOPTION")
        lines.append("-" * 40)
        lines.append(f"Taux moyen QR codes: {report_data['adoption']['qr_rate_avg']}%")
        lines.append(f"Taux moyen validation: {report_data['adoption']['validation_rate_avg']}%")
        lines.append(f"Partenaires avec QR (fin mois): {report_data['adoption']['with_qr_end']}")
        lines.append(f"Partenaires géolocalisés (fin mois): {report_data['adoption']['geo_located_end']}")
        lines.append("")

        # Distribution des rôles
        lines.append("DISTRIBUTION DES RÔLES")
        lines.append("-" * 40)
        for role, count in report_data['role_distribution'].items():
            role_label = dict(self.env['res.partner']._fields['x_ifn_role'].selection).get(role, role)
            lines.append(f"{role_label}: {count}")
        lines.append("")

        # Top activités
        lines.append("PRINCIPALES ACTIVITÉS")
        lines.append("-" * 40)
        for action, count in report_data['activities']['top_actions']:
            action_label = dict(self.env['ifn.audit.log']._fields['action'].selection).get(action, action)
            lines.append(f"{action_label}: {count} fois")
        lines.append(f"Total logs audit: {report_data['activities']['total_audit_logs']}")
        lines.append("")

        lines.append("=" * 80)
        lines.append("FIN DU RAPPORT")
        lines.append("=" * 80)

        return "\n".join(lines)