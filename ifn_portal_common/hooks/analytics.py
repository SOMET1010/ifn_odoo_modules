# -*- coding: utf-8 -*-

import logging
import json
import hashlib
from datetime import datetime, timedelta
from odoo import api, models, fields, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class IFNAnalytics(models.AbstractModel):
    _name = 'ifn.analytics'
    _description = 'IFN Analytics Hook'

    @api.model
    def track_event(self, event_name, event_data=None, user_id=None, session_id=None):
        """
        Enregistre un événement analytique

        Args:
            event_name: Nom de l'événement
            event_data: Données associées à l'événement
            user_id: ID utilisateur (optionnel)
            session_id: ID de session (optionnel)

        Returns:
            dict: Résultat du tracking
        """
        try:
            # Récupérer l'utilisateur courant si non spécifié
            if not user_id:
                user_id = self.env.user.id if self.env.user != self.env.ref('base.user_root') else None

            # Préparer les données d'événement
            event = {
                'event_name': event_name,
                'user_id': user_id,
                'session_id': session_id or self._get_session_id(),
                'timestamp': datetime.utcnow().isoformat(),
                'url': self._get_current_url(),
                'user_agent': self._get_user_agent(),
                'ip_address': self._get_client_ip(),
                'data': event_data or {}
            }

            # Anonymiser les données sensibles
            event = self._anonymize_event_data(event)

            # Stocker l'événement
            self._store_event(event)

            # Traiter les événements en temps réel si configuré
            if self._is_realtime_enabled():
                self._process_realtime_event(event)

            return {
                'status': 'success',
                'event_id': event.get('id'),
                'message': _('Événement enregistré avec succès')
            }

        except Exception as e:
            _logger.error("Erreur tracking événement %s: %s", event_name, e)
            return {
                'status': 'error',
                'message': _('Erreur lors de l\'enregistrement de l\'événement')
            }

    @api.model
    def track_page_view(self, page_title, page_path, user_id=None):
        """
        Enregistre une vue de page

        Args:
            page_title: Titre de la page
            page_path: Chemin de la page
            user_id: ID utilisateur (optionnel)
        """
        event_data = {
            'page_title': page_title,
            'page_path': page_path,
            'referrer': self._get_referrer(),
            'screen_resolution': self._get_screen_resolution(),
            'viewport_size': self._get_viewport_size()
        }

        return self.track_event('page_view', event_data, user_id)

    @api.model
    def track_user_action(self, action_name, action_data=None, element_type=None, element_id=None):
        """
        Enregistre une action utilisateur

        Args:
            action_name: Nom de l'action
            action_data: Données de l'action
            element_type: Type d'élément (button, link, form, etc.)
            element_id: ID de l'élément
        """
        event_data = {
            'action_name': action_name,
            'element_type': element_type,
            'element_id': element_id,
            **(action_data or {})
        }

        return self.track_event('user_action', event_data)

    @api.model
    def track_form_submission(self, form_name, form_data, success=True, errors=None):
        """
        Enregistre une soumission de formulaire

        Args:
            form_name: Nom du formulaire
            form_data: Données du formulaire
            success: Succès de la soumission
            errors: Erreurs éventuelles
        """
        event_data = {
            'form_name': form_name,
            'form_data': self._sanitize_form_data(form_data),
            'success': success,
            'errors': errors or []
        }

        return self.track_event('form_submission', event_data)

    @api.model
    def track_error(self, error_name, error_message, error_stack=None, context=None):
        """
        Enregistre une erreur

        Args:
            error_name: Nom de l'erreur
            error_message: Message d'erreur
            error_stack: Pile d'appels (stack trace)
            context: Contexte de l'erreur
        """
        event_data = {
            'error_name': error_name,
            'error_message': error_message,
            'error_stack': error_stack,
            'context': context or {}
        }

        return self.track_event('error', event_data)

    @api.model
    def track_performance(self, metric_name, value, unit='ms', context=None):
        """
        Enregistre une métrique de performance

        Args:
            metric_name: Nom de la métrique
            value: Valeur de la métrique
            unit: Unité de mesure
            context: Contexte supplémentaire
        """
        event_data = {
            'metric_name': metric_name,
            'metric_value': value,
            'metric_unit': unit,
            'context': context or {}
        }

        return self.track_event('performance', event_data)

    def _get_session_id(self):
        """Génère ou récupère l'ID de session"""
        # Implémenter la gestion de session selon les besoins
        import uuid
        return str(uuid.uuid4())

    def _get_current_url(self):
        """Récupère l'URL actuelle"""
        # En pratique, ceci viendrait de la requête HTTP
        return '/portal'

    def _get_user_agent(self):
        """Récupère le user agent"""
        # En pratique, ceci viendrait de la requête HTTP
        return 'Mozilla/5.0 (compatible; IFN Portal)'

    def _get_client_ip(self):
        """Récupère l'IP du client"""
        # En pratique, ceci viendrait de la requête HTTP
        return '127.0.0.1'

    def _get_referrer(self):
        """Récupère le referrer"""
        # En pratique, ceci viendrait de la requête HTTP
        return ''

    def _get_screen_resolution(self):
        """Récupère la résolution d'écran"""
        # En pratique, ceci viendrait des données JavaScript
        return '1920x1080'

    def _get_viewport_size(self):
        """Récupère la taille du viewport"""
        # En pratique, ceci viendrait des données JavaScript
        return '1200x800'

    def _anonymize_event_data(self, event):
        """Anonymise les données sensibles de l'événement"""
        # Supprimer ou hacher les données personnelles
        if event.get('data'):
            data = event['data'].copy()

            # Anonymiser les emails
            if 'email' in data:
                data['email'] = self._hash_email(data['email'])

            # Anonymiser les numéros de téléphone
            if 'phone' in data:
                data['phone'] = self._anonymize_phone(data['phone'])

            # Supprimer les mots de passe
            if 'password' in data:
                del data['password']

            event['data'] = data

        # Anonymiser l'IP
        if event.get('ip_address'):
            event['ip_address'] = self._anonymize_ip(event['ip_address'])

        return event

    def _hash_email(self, email):
        """Hache un email pour l'anonymisation"""
        return hashlib.sha256(email.encode()).hexdigest()[:16]

    def _anonymize_phone(self, phone):
        """Anonymise un numéro de téléphone"""
        if len(phone) > 4:
            return phone[:2] + '*' * (len(phone) - 4) + phone[-2:]
        return '****'

    def _anonymize_ip(self, ip):
        """Anonymise une adresse IP"""
        try:
            parts = ip.split('.')
            if len(parts) == 4:
                return f"{parts[0]}.{parts[1]}.xxx.xxx"
        except:
            pass
        return 'xxx.xxx.xxx.xxx'

    def _sanitize_form_data(self, form_data):
        """Nettoie les données de formulaire"""
        if not isinstance(form_data, dict):
            return {}

        sanitized = {}
        sensitive_fields = ['password', 'token', 'secret', 'key', 'credit_card', 'ssn']

        for key, value in form_data.items():
            # Vérifier si c'est un champ sensible
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                sanitized[key] = '[REDACTED]'
            elif isinstance(value, str) and len(value) > 1000:
                # Tronquer les valeurs trop longues
                sanitized[key] = value[:1000] + '...'
            else:
                sanitized[key] = value

        return sanitized

    def _store_event(self, event):
        """
        Stocke l'événement (implémentation à adapter)

        Cette méthode pourrait stocker dans:
        - Une table de base de données dédiée
        - Un fichier de log
        - Un service externe (Google Analytics, Mixpanel, etc.)
        """
        # Implémentation de démonstration - logging
        _logger.info("IFN Analytics Event: %s", json.dumps(event, default=str))

        # En pratique, créer une table ifn_analytics_event et insérer
        # event_id = self.env['ifn.analytics.event'].create(event)

    def _is_realtime_enabled(self):
        """Vérifie si le traitement en temps réel est activé"""
        # Récupérer depuis les paramètres système
        return True

    def _process_realtime_event(self, event):
        """
        Traite un événement en temps réel

        Cette méthode pourrait:
        - Envoyer à un webhook
        - Mettre à jour des dashboards
        - Déclencher des notifications
        """
        # Implémentation de démonstration
        if event['event_name'] == 'error':
            # Envoyer une alerte pour les erreurs critiques
            self._send_error_alert(event)

    def _send_error_alert(self, event):
        """Envoie une alerte pour une erreur"""
        # Implémenter l'envoi d'alerte (email, Slack, etc.)
        _logger.warning("IFN Error Alert: %s", event['data'].get('error_message', 'Unknown error'))

    @api.model
    def get_analytics_dashboard(self, date_from=None, date_to=None, user_id=None):
        """
        Récupère les données pour le dashboard analytique

        Args:
            date_from: Date de début
            date_to: Date de fin
            user_id: ID utilisateur (optionnel)

        Returns:
            dict: Données du dashboard
        """
        # Implémenter la récupération des données analytiques
        # Ceci est une structure de démonstration

        if not date_from:
            date_from = datetime.utcnow() - timedelta(days=30)
        if not date_to:
            date_to = datetime.utcnow()

        return {
            'period': {
                'from': date_from.isoformat(),
                'to': date_to.isoformat()
            },
            'metrics': {
                'total_events': 0,
                'unique_users': 0,
                'page_views': 0,
                'errors': 0,
                'avg_session_duration': 0
            },
            'top_pages': [],
            'top_events': [],
            'user_activity': [],
            'performance_metrics': {}
        }

    @api.model
    def export_analytics_data(self, format='json', filters=None):
        """
        Exporte les données analytiques

        Args:
            format: Format d'export (json, csv, xlsx)
            filters: Filtres à appliquer

        Returns:
            dict: Données exportées
        """
        # Implémenter l'export des données
        filters = filters or {}

        return {
            'format': format,
            'filters': filters,
            'data': [],
            'generated_at': datetime.utcnow().isoformat()
        }

    @api.model
    def cleanup_old_events(self, days_to_keep=90):
        """
        Nettoie les anciens événements analytiques

        Args:
            days_to_keep: Nombre de jours à conserver
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

        # Implémenter le nettoyage
        # self.env['ifn.analytics.event'].search([
        #     ('timestamp', '<', cutoff_date)
        # ]).unlink()

        _logger.info("Nettoyage des événements analytiques antérieurs à %s", cutoff_date)

        return {
            'status': 'success',
            'cutoff_date': cutoff_date.isoformat(),
            'message': _('Anciens événements supprimés')
        }