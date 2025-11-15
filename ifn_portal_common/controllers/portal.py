# -*- coding: utf-8 -*-
import json
import logging
from odoo import http
from odoo.http import request
from odoo.tools.translate import _

_logger = logging.getLogger(__name__)


class IFNPortalCommon(http.Controller):
    """Contrôleur principal du portail IFN Common avec redirection par rôle"""

    def _prepare_portal_values(self):
        """Prépare les valeurs communes pour les portails IFN"""
        return {
            'user': request.env.user,
            'partner': request.env.user.partner_id,
            'is_portal': True,
        }

    def _get_user_role(self):
        """Détermine le rôle de l'utilisateur basé sur ses groupes"""
        if not request.env.user.has_group('base.group_portal'):
            return None

        user_groups = request.env.user.groups_id.mapped('xml_id')

        if 'ifn_core.group_ifn_merchant' in user_groups:
            return 'merchant'
        elif 'ifn_core.group_ifn_producer' in user_groups:
            return 'producer'
        elif 'ifn_core.group_ifn_coop_manager' in user_groups:
            return 'coop'

        return 'portal'

    @http.route('/portal', auth='user', website=True, sitemap=True)
    def portal_entry(self, **kw):
        """Point d'entrée unique du portail avec redirection par rôle"""
        role = self._get_user_role()

        if role == 'merchant':
            return request.redirect('/portal/merchant')
        elif role == 'producer':
            return request.redirect('/portal/producer')
        elif role == 'coop':
            return request.redirect('/portal/coop')
        else:
            # Afficher la page d'accueil du portail pour les autres utilisateurs
            return self.portal_home(**kw)

    @http.route('/portal/home', auth='user', website=True, sitemap=True)
    def portal_home(self, **kw):
        """Page d'accueil du portail IFN"""
        user = request.env.user
        partner = user.partner_id

        # Statistiques fictives pour l'exemple
        stats = {
            'orders_count': 0,
            'products_count': 0,
            'revenue': '0 XOF',
            'customers_count': 0,
        }

        # Récupérer les notifications non lues
        try:
            # Chercher les messages non lus pour l'utilisateur
            unread_count = request.env['mail.notification'].search_count([
                ('res_partner_id', '=', user.partner_id.id),
                ('is_read', '=', False),
            ])
        except Exception:
            # En cas d'erreur, mettre à 0
            unread_count = 0

        values = {
            'user': user,
            'partner': partner,
            'stats': stats,
            'unread_count': unread_count,
            'page_name': 'portal_home',
        }
        return request.render('ifn_portal_common.ifn_portal_home', values)

    @http.route('/portal/settings', auth='user', website=True, sitemap=True)
    def portal_settings(self, **kw):
        """Page des préférences du portail"""
        user = request.env.user
        partner = user.partner_id

        # Récupérer les préférences actuelles
        preferences = {
            'language': partner.lang or 'fr_FR',
            'high_contrast': user.ifn_high_contrast or False,
            'font_size': user.ifn_font_size or 'normal',
            'voice_enabled': user.ifn_voice_enabled or False,
        }

        values = {
            'user': user,
            'partner': partner,
            'preferences': preferences,
            'page_name': 'portal_settings',
        }
        return request.render('ifn_portal_common.portal_settings', values)

    @http.route('/portal/notifications', auth='user', website=True, sitemap=True)
    def portal_notifications(self, **kw):
        """Centre de notifications"""
        user = request.env.user

        # Récupérer les messages non lus
        try:
            # Chercher les notifications pour l'utilisateur
            notifications = request.env['mail.notification'].search([
                ('res_partner_id', '=', user.partner_id.id),
                ('is_read', '=', False),
            ], order='create_date DESC', limit=50)

            # Récupérer les messages associés
            messages = notifications.mapped('mail_message_id')
        except Exception:
            # En cas d'erreur, liste vide
            messages = request.env['mail.message'].browse()

        values = {
            'user': user,
            'messages': messages,
            'unread_count': len(messages),
            'page_name': 'portal_notifications',
        }
        return request.render('ifn_portal_common.portal_notifications', values)

    @http.route('/portal/documents', auth='user', website=True, sitemap=True)
    def portal_documents(self, **kw):
        """Page des documents"""
        user = request.env.user

        # Documents liés au partenaire
        attachments = request.env['ir.attachment'].search([
            ('res_model', '=', 'res.partner'),
            ('res_id', '=', user.partner_id.id),
            ('res_field', '=', False),  # Documents principaux seulement
        ], order='create_date DESC')

        values = {
            'user': user,
            'attachments': attachments,
            'page_name': 'portal_documents',
        }
        return request.render('ifn_portal_common.portal_documents', values)

    @http.route('/ifn/api/prefs', type='json', auth='user', methods=['POST'], csrf=True)
    def update_preferences(self, **kwargs):
        """API de mise à jour des préférences utilisateur"""
        try:
            user = request.env.user
            partner = user.partner_id

            # Mettre à jour les préférences
            if 'language' in kwargs:
                partner.lang = kwargs['language']
                request.env.context = dict(request.env.context, lang=kwargs['language'])

            if 'high_contrast' in kwargs:
                user.ifn_high_contrast = kwargs['high_contrast']

            if 'font_size' in kwargs:
                user.ifn_font_size = kwargs['font_size']

            if 'voice_enabled' in kwargs:
                user.ifn_voice_enabled = kwargs['voice_enabled']

            return {
                'status': 'success',
                'message': _('Préférences mises à jour avec succès'),
            }

        except Exception as e:
            _logger.error("Erreur mise à jour préférences: %s", e)
            return {
                'status': 'error',
                'message': _('Erreur lors de la mise à jour des préférences'),
            }

    @http.route('/ifn/api/notify/read', type='json', auth='user', methods=['POST'], csrf=True)
    def mark_notification_read(self, message_id, **kwargs):
        """Marquer une notification comme lue"""
        try:
            message = request.env['mail.message'].browse(message_id)
            if message.exists() and message.needaction:
                message.needaction = False

            return {
                'status': 'success',
                'unread_count': request.env['mail.message'].search_count([
                    ('needaction', '=', True),
                    ('res_id', '=', request.env.user.partner_id.id),
                ]),
            }

        except Exception as e:
            _logger.error("Erreur marquer notification lue: %s", e)
            return {'status': 'error'}

    @http.route('/ifn/manifest.webmanifest', type='http', auth='public')
    def pwa_manifest(self, **kwargs):
        """Manifest PWA pour installation application"""
        manifest = {
            "name": "Plateforme IFN",
            "short_name": "IFN",
            "description": "Plateforme numérique IFN pour Marchands, Producteurs et Coopératives",
            "start_url": "/portal",
            "display": "standalone",
            "background_color": "#FFFFFF",
            "theme_color": "#F77F00",
            "orientation": "portrait-primary",
            "scope": "/",
            "icons": [
                {
                    "src": "/ifn_portal_common/static/src/img/icons/icon-72.png",
                    "sizes": "72x72",
                    "type": "image/png"
                },
                {
                    "src": "/ifn_portal_common/static/src/img/icons/icon-96.png",
                    "sizes": "96x96",
                    "type": "image/png"
                },
                {
                    "src": "/ifn_portal_common/static/src/img/icons/icon-128.png",
                    "sizes": "128x128",
                    "type": "image/png"
                },
                {
                    "src": "/ifn_portal_common/static/src/img/icons/icon-144.png",
                    "sizes": "144x144",
                    "type": "image/png"
                },
                {
                    "src": "/ifn_portal_common/static/src/img/icons/icon-152.png",
                    "sizes": "152x152",
                    "type": "image/png"
                },
                {
                    "src": "/ifn_portal_common/static/src/img/icons/icon-192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "/ifn_portal_common/static/src/img/icons/icon-384.png",
                    "sizes": "384x384",
                    "type": "image/png"
                },
                {
                    "src": "/ifn_portal_common/static/src/img/icons/icon-512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ],
            "categories": ["business", "finance", "productivity"],
            "lang": "fr",
        }

        return request.make_json_response(
            manifest,
            headers=[('Content-Type', 'application/manifest+json')]
        )

    @http.route('/ifn/sw.js', type='http', auth='public')
    def service_worker(self, **kwargs):
        """Service Worker pour PWA"""
        sw_content = self._get_service_worker_content()
        return request.make_response(
            sw_content,
            headers=[
                ('Content-Type', 'application/javascript'),
                ('Cache-Control', 'no-cache, no-store, must-revalidate'),
                ('Service-Worker-Allowed', '/')
            ]
        )

    def _get_service_worker_content(self):
        """Génère le contenu du service worker"""
        return """
// IFN Portal Service Worker
const CACHE_NAME = 'ifn-portal-v1.0.0';
const STATIC_CACHE = 'ifn-static-v1.0.0';

// Assets à mettre en cache
const STATIC_ASSETS = [
    '/web/static/src/img/logo.png',
    '/ifn_portal_common/static/src/css/ifn_portal.css',
    '/ifn_portal_common/static/src/css/ifn_accessibility.css',
    '/ifn_portal_common/static/src/js/ifn_sdk.js',
    '/ifn_portal_common/static/src/js/pwa_register.js',
    '/ifn_portal_common/static/src/img/icons/icon-192.png',
    '/ifn_portal_common/static/src/img/icons/icon-512.png',
];

// Installation
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activation
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Stratégie Cache First pour les assets statiques
    if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request);
            })
        );
        return;
    }

    // Stratégie Network First pour les pages HTML
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match('/offline.html') ||
                       new Response('Hors ligne - Vérifiez votre connexion', {
                           status: 503,
                           statusText: 'Service Unavailable'
                       });
            })
        );
        return;
    }

    // Stratégie Network Only pour les autres requêtes
    event.respondWith(fetch(request));
});

// Gestion des messages (pour sync offline)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
"""

    # Routes d'inscription et d'enrôlement
    @http.route('/ifn/signup', type='http', auth='public', website=True, sitemap=True)
    def ifn_signup(self, **kw):
        """Page d'inscription IFN"""
        # Si l'utilisateur est déjà connecté, rediriger vers le portail
        if request.env.user.has_group('base.group_user'):
            return request.redirect('/portal')

        values = {
            'member_types': [
                {'value': 'merchant', 'label': 'Marchand', 'icon': 'fa-shopping-cart'},
                {'value': 'producer', 'label': 'Producteur', 'icon': 'fa-seedling'},
                {'value': 'coop_manager', 'label': 'Gestionnaire Coopérative', 'icon': 'fa-users'},
            ],
            'regions': [
                'Abidjan', 'Bouaké', 'Korhogo', 'San-Pédro', 'Daloa', 'Yamoussoukro',
                'Soubré', 'Gagnoa', 'Man', 'Divo', 'Odienné', 'Agboville', 'Abengourou'
            ],
            'page_name': 'ifn_signup',
        }
        return request.render('ifn_portal_common.ifn_signup', values)

    @http.route('/ifn/signup-alt', type='http', auth='public', website=True, sitemap=True)
    def ifn_signup_alt(self, **kw):
        """Route alternative pour tester si le problème vient de l'URL"""
        # Si l'utilisateur est déjà connecté, rediriger vers le portail
        if request.env.user.has_group('base.group_user'):
            return request.redirect('/portal')

        values = {
            'member_types': [
                {'value': 'merchant', 'label': 'Marchand', 'icon': 'fa-shopping-cart'},
                {'value': 'producer', 'label': 'Producteur', 'icon': 'fa-seedling'},
                {'value': 'coop_manager', 'label': 'Gestionnaire Coopérative', 'icon': 'fa-users'},
            ],
            'regions': [
                'Abidjan', 'Bouaké', 'Korhogo', 'San-Pédro', 'Daloa', 'Yamoussoukro',
                'Soubré', 'Gagnoa', 'Man', 'Divo', 'Odienné', 'Agboville', 'Abengourou'
            ],
            'page_name': 'ifn_signup_alt',
        }
        return request.render('ifn_portal_common.ifn_signup', values)

    @http.route('/ifn/signup/submit', type='http', auth='public', methods=['POST'], website=True, csrf=True)
    def ifn_signup_submit(self, **kw):
        """Soumission du formulaire d'inscription IFN"""
        try:
            # Récupérer les données du formulaire
            member_type = kw.get('member_type')
            first_name = kw.get('first_name', '').strip()
            last_name = kw.get('last_name', '').strip()
            email = kw.get('email', '').strip()
            phone = kw.get('phone', '').strip()
            password = kw.get('password', '')
            confirm_password = kw.get('confirm_password', '')
            region = kw.get('region', '').strip()
            village = kw.get('village', '').strip()

            # Validation des champs obligatoires
            if not all([member_type, first_name, last_name, email, phone, password]):
                return request.render('ifn_portal_common.ifn_signup_error_simple', {
                    'error': 'Veuillez remplir tous les champs obligatoires.',
                    'page_name': 'ifn_signup_error'
                })

            # Validation du mot de passe
            if password != confirm_password:
                return request.render('ifn_portal_common.ifn_signup_error_simple', {
                    'error': 'Les mots de passe ne correspondent pas.',
                    'page_name': 'ifn_signup_error'
                })

            if len(password) < 8:
                return request.render('ifn_portal_common.ifn_signup_error_simple', {
                    'error': 'Le mot de passe doit contenir au moins 8 caractères.',
                    'page_name': 'ifn_signup_error'
                })

            # Vérifier si l'email existe déjà
            existing_user = request.env['res.users'].sudo().search([('login', '=', email)], limit=1)
            if existing_user:
                return request.render('ifn_portal_common.ifn_signup_error_simple', {
                    'error': 'Un compte avec cet email existe déjà.',
                    'page_name': 'ifn_signup_error'
                })

            # Créer le partenaire IFN
            partner_vals = {
                'name': f"{first_name} {last_name}",
                'email': email,
                'phone': phone,
                'ifn_member_type': member_type,
                'ifn_region': region,
                'ifn_village': village,
                'is_company': False,
                'customer': True,
                'supplier': member_type in ['merchant', 'producer'],
            }

            partner = request.env['res.partner'].sudo().create(partner_vals)

            # Générer l'UID IFN pour le partenaire
            ifn_uid = f"IFN-{str(partner.id).zfill(8)}"
            partner.sudo().write({'ifn_uid': ifn_uid})

            # Créer l'utilisateur Odoo
            user_vals = {
                'name': partner.name,
                'login': email,
                'email': email,
                'password': password,
                'partner_id': partner.id,
                'ifn_uid': ifn_uid,
                'ifn_phone_verified': False,
                'ifn_email_verified': False,
                'ifn_kyc_level': '0',
                'ifn_language': 'fr_FR',
                'company_id': request.env.company.id,
                'company_ids': [(6, 0, [request.env.company.id])],
                'groups_id': [(6, 0, [request.env.ref('base.group_portal').id])],
            }

            # Ajouter le groupe IFN approprié
            if member_type == 'merchant':
                group_id = request.env.ref('ifn_core.group_ifn_merchant')
            elif member_type == 'producer':
                group_id = request.env.ref('ifn_core.group_ifn_producer')
            elif member_type == 'coop_manager':
                group_id = request.env.ref('ifn_core.group_ifn_coop_manager')
            else:
                group_id = None

            if group_id:
                user_vals['groups_id'] = [(4, group_id.id)]

            user = request.env['res.users'].sudo().create(user_vals)

            # Envoyer l'email de confirmation
            template = request.env.ref('auth_signup.mail_template_user_signup_account_created')
            if template:
                template.sudo().send_mail(user.id, force_send=True)

            # Créer une notification de bienvenue
            request.env['ifn.portal.notifications'].sudo().create({
                'title': 'Bienvenue sur IFN !',
                'message': f"""
                <p>Bonjour {first_name} {last_name},</p>
                <p>Bienvenue sur la plateforme IFN !</p>
                <p>Votre identifiant unique IFN est : <strong>{ifn_uid}</strong></p>
                <p>Vous pouvez maintenant vous connecter et commencer à utiliser la plateforme.</p>
                <p>Pour finaliser votre inscription, veuillez vérifier votre email et votre téléphone.</p>
                """,
                'notification_type': 'success',
                'priority': 'high',
                'user_id': user.id,
                'category': 'welcome',
            })

            return request.render('ifn_portal_common.ifn_signup_success_simple', {
                'user_name': user.name,
                'ifn_uid': ifn_uid,
                'member_type': dict(partner._fields['ifn_member_type'].selection).get(member_type),
                'email': email,
                'page_name': 'ifn_signup_success'
            })

        except Exception as e:
            _logger.error("Erreur lors de l'inscription IFN: %s", e)
            return request.render('ifn_portal_common.ifn_signup_error_simple', {
                'error': 'Une erreur est survenue lors de votre inscription. Veuillez réessayer.',
                'page_name': 'ifn_signup_error'
            })

    @http.route('/ifn/verify/phone/<token>', type='http', auth='public', website=True)
    def verify_phone(self, token, **kw):
        """Vérification du téléphone par SMS"""
        try:
            # Implémenter la logique de vérification par token SMS
            # Pour l'instant, simuler la vérification
            user = request.env['res.users'].sudo().search([('ifn_uid', '=', token)], limit=1)
            if user:
                user.sudo().write({'ifn_phone_verified': True})
                return request.render('ifn_portal_common.ifn_signup_success_simple', {
                    'message': 'Votre téléphone a été vérifié avec succès.',
                    'page_name': 'ifn_verify_success'
                })
            else:
                return request.render('ifn_portal_common.ifn_signup_error_simple', {
                    'message': 'Lien de vérification invalide.',
                    'page_name': 'ifn_verify_error'
                })
        except Exception as e:
            _logger.error("Erreur vérification téléphone: %s", e)
            return request.render('ifn_portal_common.ifn_signup_error_simple', {
                'message': 'Une erreur est survenue lors de la vérification.',
                'page_name': 'ifn_verify_error'
            })

    @http.route('/ifn/verify/email/<token>', type='http', auth='public', website=True)
    def verify_email(self, token, **kw):
        """Vérification de l'email"""
        try:
            # Implémenter la logique de vérification par token email
            user = request.env['res.users'].sudo().search([('ifn_uid', '=', token)], limit=1)
            if user:
                user.sudo().write({'ifn_email_verified': True})
                return request.render('ifn_portal_common.ifn_signup_success_simple', {
                    'message': 'Votre email a été vérifié avec succès.',
                    'page_name': 'ifn_verify_success'
                })
            else:
                return request.render('ifn_portal_common.ifn_signup_error_simple', {
                    'message': 'Lien de vérification invalide.',
                    'page_name': 'ifn_verify_error'
                })
        except Exception as e:
            _logger.error("Erreur vérification email: %s", e)
            return request.render('ifn_portal_common.ifn_signup_error_simple', {
                'message': 'Une erreur est survenue lors de la vérification.',
                'page_name': 'ifn_verify_error'
            })

    @http.route('/ifn_portal_common/get_user_preferences', type='json', auth='user', methods=['POST'], csrf=True)
    def get_user_preferences(self, **kwargs):
        """API pour récupérer les préférences utilisateur"""
        try:
            user = request.env.user
            partner = user.partner_id

            preferences = {
                'language': partner.lang or 'fr_FR',
                'high_contrast': user.ifn_high_contrast or False,
                'font_size': user.ifn_font_size or 'normal',
                'voice_enabled': user.ifn_voice_enabled or False,
            }

            return {
                'status': 'success',
                'preferences': preferences,
            }

        except Exception as e:
            _logger.error("Erreur récupération préférences: %s", e)
            return {
                'status': 'error',
                'preferences': {
                    'language': 'fr_FR',
                    'high_contrast': False,
                    'font_size': 'normal',
                    'voice_enabled': False,
                }
            }

    @http.route('/ifn_portal_common/update_preferences', type='json', auth='user', methods=['POST'], csrf=True)
    def update_preferences_rpc(self, preferences, **kwargs):
        """API pour mettre à jour les préférences utilisateur (via RPC)"""
        try:
            user = request.env.user
            partner = user.partner_id

            # Mettre à jour les préférences
            if 'language' in preferences:
                partner.lang = preferences['language']
                request.env.context = dict(request.env.context, lang=preferences['language'])

            if 'high_contrast' in preferences:
                user.ifn_high_contrast = preferences['high_contrast']

            if 'font_size' in preferences:
                user.ifn_font_size = preferences['font_size']

            if 'voice_enabled' in preferences:
                user.ifn_voice_enabled = preferences['voice_enabled']

            return {
                'status': 'success',
                'message': _('Préférences mises à jour avec succès'),
            }

        except Exception as e:
            _logger.error("Erreur mise à jour préférences RPC: %s", e)
            return {
                'status': 'error',
                'message': _('Erreur lors de la mise à jour des préférences'),
            }

    @http.route('/ifn/api/analytics/track', type='json', auth='user', methods=['POST'], csrf=True)
    def track_analytics(self, event, payload=None, **kwargs):
        """API pour le suivi analytics"""
        try:
            _logger.info("Analytics track: %s - %s", event, payload)
            return {
                'status': 'success',
                'message': 'Event tracked',
            }
        except Exception as e:
            _logger.error("Erreur analytics: %s", e)
            return {
                'status': 'error',
                'message': 'Analytics tracking failed',
            }

    