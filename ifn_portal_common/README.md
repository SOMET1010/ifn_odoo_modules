# IFN Portal Common

Module socle portail IFN (Website/Portal, PWA, i18n, accessibilité, redirection par rôle)

## 🎯 Finalité

`ifn_portal_common` fournit l'infrastructure portail complète et les composants transverses pour tous les modules IFN. Il sert de base technique pour les portails spécialisés :

- **ifn_portal_merchant** : Portail marchands
- **ifn_portal_producer** : Portail producteurs
- **ifn_portal_coop** : Portail coopératives

## 🚀 Fonctionnalités principales

### 🌐 Navigation & Redirection
- **Point d'entrée unique** `/portal` avec détection automatique du rôle
- **Redirection intelligente** selon les groupes IFN :
  - `ifn_group_merchant` → `/portal/merchant`
  - `ifn_group_producer` → `/portal/producer`
  - `ifn_group_coop_manager` → `/portal/coop`
- **Navigation responsive** avec menu mobile

### 📱 Progressive Web App (PWA)
- **Service Worker** avec stratégies de cache optimisées
- **File d'attente offline** pour les actions POST/PUT/PATCH/DELETE
- **Synchronisation automatique** au retour en ligne
- **Installation mobile** (A2HS - Add to Home Screen)
- **Manifest PWA** complet avec icônes multi-tailles

### 🌍 Multilingue (FR, Baoulé, Dioula) 🇨🇮
- **Support complet** des 3 langues ivoiriennes
- **Sélecteur de langue** persistant avec drapeaux
- **Traductions intégrées** pour tous les éléments UI
- **Formatage localisé** (dates, nombres, monnaie)

### ♿ Accessibilité WCAG 2.1 AA
- **Contraste élevé** mode pour meilleure lisibilité
- **3 tailles de police** : Normal, Grand, Très grand
- **Support lecteurs d'écran** avec ARIA labels
- **Navigation clavier** complète
- **Pictogrammes universels** pour actions principales

### 🎨 Charte Graphique IFN
- **Couleurs officielles** :
  - Orange IFN : `#F77F00`
  - Vert IFN : `#009739`
  - Blanc : `#FFFFFF`
  - Noir : `#212121`
- **Design cohérent** avec composants réutilisables
- **Responsive mobile-first**

### 📊 Centre de Notifications
- **Notifications temps réel** avec badge de compteur
- **Centre de notifications** avec historique
- **Desktop notifications** (navigateur)
- **Filtres et actions** (marquer comme lu, suppression)

### 📄 Gestion Documents
- **Téléchargement** des documents utilisateur
- **Filtrage** par type et date
- **Aperçu** avant téléchargement
- **Support offline** avec synchronisation

### ⚙️ Préférences Utilisateur
- **Langue** (FR/BA/DI)
- **Accessibilité** (contraste, taille police)
- **Assistance vocale** (activation/désactivation)
- **Notifications** (préférences d'affichage)
- **Consentements** (RGPD, analytics, marketing)

## 🔧 Architecture Technique

### Structure des fichiers
```
ifn_portal_common/
├── __manifest__.py              # Configuration du module
├── controllers/
│   └── portal.py                # Contrôleur principal et routes
├── models/
│   ├── res_users.py             # Extension utilisateurs
│   ├── res_partner.py           # Extension partenaires
│   ├── ifn_portal_preferences.py # Préférences utilisateur
│   └── ifn_portal_notifications.py # Notifications
├── views/
│   ├── portal_layout.xml        # Layout principal
│   ├── portal_pages.xml         # Pages du portail
│   ├── portal_components.xml    # Composants réutilisables
│   └── website_templates.xml    # Templates Website
├── static/src/
│   ├── css/
│   │   ├── ifn_portal.css           # Styles principaux
│   │   ├── ifn_accessibility.css   # Accessibilité
│   │   └── ifn_responsive.css       # Responsive
│   ├── js/
│   │   ├── ifn_sdk.js              # SDK JavaScript principal
│   │   ├── ifn_offline_queue.js    # File d'attente offline
│   │   ├── ifn_language_selector.js # Sélecteur de langue
│   │   ├── ifn_accessibility.js    # Gestion accessibilité
│   │   ├── ifn_notifications.js    # Centre notifications
│   │   └── pwa_register.js         # Enregistrement PWA
│   └── img/icons/              # Icônes SVG et PWA
├── hooks/                      # Points d'extension
│   ├── voice_gateway.py        # Assistant vocal
│   ├── analytics.py            # Tracking analytique
│   └── consent_manager.py      # Gestion consentements RGPD
└── security/                   # Droits d'accès
    ├── ir.model.access.csv
    └── ir_ui_menu.xml
```

### Technologies utilisées
- **Backend** : Python 3, Odoo 17
- **Frontend** : HTML5, CSS3, JavaScript ES6+
- **PWA** : Service Worker, IndexedDB, Cache API
- **Accessibilité** : ARIA, WCAG 2.1 AA
- **Internationalisation** : i18n Odoo + JavaScript

## 📋 Prérequis

### Dépendances Odoo
- `base` : Module de base Odoo
- `portal` : Fonctionnalités portail
- `website` : Gestion site web
- `web` : Interface web
- `ifn_core` : Module socle IFN (recommandé)

### Navigateurs supportés
- Chrome 80+ ✅
- Firefox 75+ ✅
- Safari 13+ ✅
- Edge 80+ ✅

### Navigateurs mobiles
- Chrome Mobile (Android) ✅
- Safari Mobile (iOS) ✅

## 🔧 Installation

### 1. Installation du module
```bash
# Copier le module dans addons_odoo
cp -r ifn_portal_common /opt/odoo17/addons_odoo/

# Mettre à jour la liste des modules
cd /opt/odoo17
./odoo-bin -u base --stop-after-init

# Installer le module
./odoo-bin -d votre_database -i ifn_portal_common
```

### 2. Configuration
1. **Activer le mode développeur** pour voir les assets
2. **Vérifier les dépendances** : `ifn_core` doit être installé
3. **Configurer les groupes** IFN dans `ifn_core`
4. **Tester l'accès portail** avec un utilisateur portal

### 3. Déploiement PWA
```bash
# Générer les icônes (Python 3 requis)
cd static/src/img/icons/
python3 generate_icons.py

# Convertir en PNG si nécessaire (optionnel)
# apt-get install librsvg2-bin
for size in 72 96 128 144 152 192 384 512; do
    rsvg-convert icon-${size}.svg -o icon-${size}.png
done
```

## 🎯 Utilisation

### Point d'entrée principal
```
https://votre-domaine.com/portal
```

### Routes principales
| Route | Description | Access |
|-------|-------------|--------|
| `/portal` | Point d'entrée avec redirection par rôle | Utilisateur portal |
| `/portal/settings` | Préférences utilisateur | Utilisateur portal |
| `/portal/notifications` | Centre de notifications | Utilisateur portal |
| `/portal/documents` | Documents utilisateur | Utilisateur portal |
| `/ifn/manifest.webmanifest` | Manifest PWA | Public |
| `/ifn/sw.js` | Service Worker | Public |

### API JavaScript
```javascript
// Initialisation (automatique)
window.IFN.init();

// Notifications
window.IFN.showToast('Message', 'success', 'Titre');

// Appels API avec gestion offline
window.IFN.api('/endpoint', { method: 'POST', body: data });

// Préférences
window.IFN.updatePreferences({ language: 'fr_FR' });

// Langue
window.IFN.changeLanguage('ba_BA');

// Accessibilité
window.IFN.toggleContrast();
window.IFN.cycleFontSize();

// Voice (si activé)
window.IFN.speak('Bonjour');
window.IFN.stopSpeaking();
```

### Événements JavaScript
```javascript
// Écouter les changements de langue
$(window).on('ifn:language_changed', function(event, newLang, oldLang) {
    console.log('Langue changée:', oldLang, '->', newLang);
});

// Écouter les mises à jour de notifications
$(window).on('ifn:notifications_updated', function(event, newNotifications) {
    console.log('Nouvelles notifications:', newNotifications);
});

// Écouter les changements de préférences
$(window).on('ifn:preferences_changed', function(event, prefs) {
    console.log('Préférences mises à jour:', prefs);
});
```

## 🎨 Personnalisation

### Charte graphique
Les couleurs sont définies dans les variables CSS :
```css
:root {
    --ifn-orange: #F77F00;
    --ifn-green: #009739;
    --ifn-white: #FFFFFF;
    --ifn-black: #212121;
}
```

### Templates QWeb
Les templates principaux sont héritables :
- `ifn_portal_common.portal_layout` : Layout de base
- `ifn_portal_common.portal_page` : Structure de page
- `_ifn_header` : Header personnalisable
- `_ifn_footer` : Footer personnalisable

### Hooks d'intégration
```python
# Voice Gateway
voice_result = self.env['ifn.voice.gateway'].process_voice_command(
    user_id, command_text, 'fr_FR'
)

# Analytics
self.env['ifn.analytics'].track_event('custom_action', {
    'param1': 'value1'
})

# Consent Manager
consent_status = self.env['ifn.consent.manager'].get_consent_status(user_id)
```

## 🔍 Tests et Validation

### Tests manuels
1. **Navigation** : Tester la redirection par rôle
2. **PWA** : Installation et fonctionnement offline
3. **Multilingue** : Changement de langue et traductions
4. **Accessibilité** : Contraste élevé, tailles de police
5. **Notifications** : Réception et lecture
6. **Responsive** : Mobile, tablette, desktop

### Tests automatisés
```bash
# Lighthouse (PWA, Performance, Accessibilité, SEO, Best Practices)
npm install -g lighthouse
lighthouse https://votre-domaine.com/portal --output html --output-path ./lighthouse-report.html

# Tests unitaires JavaScript (si configurés)
npm test

# Tests Odoo
./odoo-bin -d test_db -i ifn_portal_common --test-enable
```

### Validation WCAG
- Utiliser [axe DevTools](https://www.deque.com/axe/devtools/) pour Chrome
- Tests avec lecteurs d'écran (NVDA, JAWS, VoiceOver)
- Navigation au clavier uniquement

## 🐛 Dépannage

### Problèmes courants

#### Erreur "Service Worker non enregistré"
```bash
# Vérifier que le service est servi en HTTPS
# Le PWA nécessite HTTPS en production
# En développement, localhost est autorisé
```

#### Notifications non reçues
```javascript
// Vérifier la permission dans le navigateur
console.log(Notification.permission); // doit être "granted"

// Demander la permission
Notification.requestPermission();
```

#### Traductions manquantes
```bash
# Mettre à jour les fichiers .po
cd /opt/odoo17/addons_odoo/ifn_portal_common/i18n/
# Exporter les termes à traduire
# Importer les traductions
```

#### Problèmes de cache PWA
```javascript
// Forcer la mise à jour du Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        registrations.forEach(function(registration) {
            registration.unregister();
        });
    });
}
```

### Logs de debugging
```javascript
// Activer le mode debug dans le SDK
window.IFN.config.debug = true;

// Vérifier l'état PWA
console.log(window.IFN_PWA.getInfo());

// Vérifier les préférences
console.log(window.IFN_Accessibility.getStats());
```

## 📊 Performance

### Métriques cibles
- **LCP (Largest Contentful Paint)** : < 2.5s
- **FID (First Input Delay)** : < 100ms
- **CLS (Cumulative Layout Shift)** : < 0.1
- **TTI (Time to Interactive)** : < 3.8s

### Optimisations implémentées
- **Lazy loading** des images et composants
- **Minification** automatique des assets
- **Cache Service Worker** pour assets statiques
- **Compression** gzip/deflate côté serveur
- **CDN** pour les ressources statiques (recommandé)

## 🔒 Sécurité

### Mesures implémentées
- **CSP (Content Security Policy)** stricte
- **Protection CSRF** sur toutes les routes POST
- **Validation des entrées** côté serveur
- **Anonymisation** des données analytiques
- **Gestion RGPD** avec consentements explicites

### Recommandations de sécurité
- HTTPS obligatoire en production
- Mises à jour régulières du module
- Audit des logs de sécurité
- Tests de pénétration périodiques

## 📚 Documentation additionnelle

### Documentation technique
- [Cahier des charges complet](./cahier_de_charge_ifn_portal_common.txt)
- [Guide d'intégration pour développeurs](./docs/developer_guide.md)
- [API Reference](./docs/api_reference.md)

### Documentation utilisateur
- [Guide utilisateur portail](./docs/user_guide.md)
- [Guide accessibilité](./docs/accessibility_guide.md)
- [FAQ support](./docs/faq.md)

## 🤝 Contribuer

### Normes de développement
- **Python** : PEP 8 + conventions Odoo
- **JavaScript** : ES6+ avec JSDoc
- **CSS** : BEM + variables CSS
- **Tests** : Jest + Odoo Testing Framework

### Processus de contribution
1. Fork du projet
2. Branche feature/nom-de-la-fonctionnalité
3. Tests et documentation
4. Pull request avec description détaillée

## 📄 Licence

Ce module est sous licence LGPL-3.

## 📞 Support

Pour le support technique :
- **Issues GitHub** : [Signaler un problème](https://github.com/ifn/ifn_portal_common/issues)
- **Email** : support@ifn.ci
- **Documentation** : [Wiki IFN](https://docs.ifn.ci)

---

**Développé avec ❤️ pour l'écosystème IFN - Plateforme Numérique Ivoirienne**