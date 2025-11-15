# IFN Core - Socle Transverse pour l'Écosystème IFN

[![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://github.com/ifn/ifn-core)
[![License](https://img.shields.io/badge/license-LGPL--3.0-green.svg)](https://www.gnu.org/licenses/lgpl-3.0.html)
[![Odoo](https://img.shields.io/badge/Odoo-17.0-orange.svg)](https://www.odoo.com/)

## 📋 Description

**IFN Core** est le module cœur de l'écosystème IFN (Inclusion Financière Numérique) pour Odoo 17. Il fournit les entités métiers, rôles, sécurité, paramètres, journalisation et les hooks techniques communs pour alimenter les portails Marchand, Producteur et Coopérative.

### 🎯 Objectif Principal

Fournir un socle unique de données et de sécurité (RBAC) pour l'ensemble de l'écosystème IFN, permettant une gestion décentralisée et sécurisée des différents acteurs de la chaîne de valeur.

## ✨ Fonctionnalités Principales

### 👥 Gestion des Rôles et Profils
- **5 rôles IFN** : Marchand, Producteur, Gestionnaire Coop, Agent, Administrateur
- **Profils détaillés** avec informations géographiques, consentements, et préférences
- **Workflow de validation** avec états et notifications
- **Isolation des données** selon les rôles et organisations

### 🔐 Sécurité et Traçabilité
- **Contrôle d'accès basé sur les rôles (RBAC)**
- **Journalisation complète** de toutes les actions sensibles
- **Audit logs détaillés** avec détection d'anomalies
- **Consentements RGPD-like** avec horodatage
- **Multi-company support** pour déploiement multi-tenant

### 🆔 Identification Numérique
- **Génération automatique UID** (Identifiant Unique IFN)
- **Codes QR** personnalisés et sécurisés
- **Attestations officielles** avec layouts multiples
- **Authentification par QR** pour les portails
- **Gestion du cycle de vie** des identifiants

### 📍 Géolocalisation
- **Coordonnées GPS** pour partenaires, marchés et coopératives
- **Cartographie interactive** avec widgets Leaflet
- **Zones logistiques** et administratives
- **Calcul de distances** et zones de couverture
- **Support multi-formats** de coordonnées

### 🌍 Internationalisation et Accessibilité
- **4 langues supportées** : Français, Baoulé, Dioula, Anglais
- **Interface adaptative** avec pictogrammes
- **Support vocal** (STT/TTS) pour accessibilité
- **Préférences utilisateur** personnalisables
- **Traduction contextuelle** des interfaces

### 📊 Monitoring et KPIs
- **Snapshots quotidiens** automatiques des indicateurs
- **Tableaux de bord** par rôle et organisation
- **Tendances et statistiques** temporelles
- **Rapports mensuels** automatisés
- **Alertes et notifications** intelligentes

### 🔄 Automatisation et Intégration
- **Imports/Exports CSV** guidés avec validation
- **Bus d'événements** pour découplage des modules
- **API REST** pour intégrations externes
- **Webhooks** pour notifications en temps réel
- **Cron jobs** intelligents et configurables

## 📚 Architecture Technique

### 🗂️ Structure du Module

```
ifn_core/
├── __init__.py
├── __manifest__.py
├── models/                  # Modèles de données
│   ├── __init__.py
│   ├── ifn_mixin.py         # Fonctionnalités communes
│   ├── res_partner.py        # Extension partenaires
│   ├── ifn_market.py        # Marchés
│   ├── ifn_coop.py          # Coopératives
│   ├── ifn_zone.py          # Zones géographiques
│   ├── ifn_product_category_ref.py  # Catégories produits
│   ├── ifn_settings.py      # Configuration
│   ├── ifn_audit_log.py     # Audit et traçabilité
│   └── ifn_kpi_snapshot.py  # KPIs et monitoring
├── views/                   # Vues et formulaires
│   ├── ifn_market_views.xml
│   ├── ifn_coop_views.xml
│   ├── ifn_zone_views.xml
│   ├── ifn_product_category_ref_views.xml
│   ├── res_partner_ifn_views.xml
│   ├── ifn_settings_views.xml
│   ├── ifn_kpi_snapshot_views.xml
│   ├── ifn_audit_log_views.xml
│   └── ifn_menu.xml
├── security/                # Sécurité et permissions
│   ├── ir.model.access.csv
│   ├── ifn_security.xml
│   └── ifn_record_rules.xml
├── wizard/                  # Assistants et wizards
│   ├── __init__.py
│   ├── ifn_import_partner.py          # Import partenaires
│   ├── ifn_qr_regenerate.py           # Régénération QR
│   └── ifn_attestation_wizard.py      # Génération attestations
├── report/                  # Rapports et templates
│   ├── __init__.py
│   ├── ifn_attestation_report.py
│   └── ifn_attestation_templates.xml
├── data/                    # Données et configurations
│   ├── ifn_sequences.xml
│   ├── ifn_data_demo.xml
│   └── ifn_cron_data.xml
├── demo/                    # Données de démo
│   └── ifn_demo.xml
├── i18n/                    # Traductions
│   ├── fr.po
│   ├── ba.po
│   ├── di.po
│   └── ifn_core.pot
└── static/                  # Ressources statiques
    └── src/
```

### 🔧 Dépendances

#### Core Odoo
- `base` : Framework de base
- `contacts` : Gestion des contacts
- `portal` : Portail client
- `web` : Interface web
- `base_geolocalize` : Géolocalisation

#### Externes
- `qrcode` : Génération de codes QR
- `Pillow` : Traitement d'images

## 🚀 Installation

### Prérequis
- Odoo 17.0 ou supérieur
- Python 3.8+
- Bibliothèques Python : `qrcode`, `Pillow`

### Installation
1. Copier le module dans le répertoire addons d'Odoo
2. Mettre à jour la liste des modules :
   ```bash
   odoo-bin -u odoo -d votre_bdd -i ifn_core
   ```
3. Configurer les paramètres dans *Apps → IFN → Configuration*
4. Créer les utilisateurs et assigner les rôles appropriés

### Configuration Initiale

#### 1. Activer les fonctionnalités
```python
# Paramètres → IFN → Configuration Générale
ifn_module_enabled = True
ifn_portal_enabled = True
ifn_qr_enabled = True
```

#### 2. Configurer les séquences
```python
# Séquence UID IFN : IFN-YYYYMMDD-XXXXX
# Séquence QR : QR-XXXXXXXX
```

#### 3. Créer les référentiels
- Marchés (Abidjan, Bouaké, Korhogo)
- Coopératives spécialisées
- Zones géographiques
- Catégories de produits

## 📖 Utilisation

### 👤 Gestion des Partenaires

#### Création d'un partenaire
1. Accéder à *IFN → Gestion des Acteurs → Partenaires IFN*
2. Cliquer sur *Nouveau Partenaire IFN*
3. Sélectionner le rôle (Marchand/Producteur/etc.)
4. Remplir les informations obligatoires
5. Ajouter géolocalisation et consentements
6. Valider le profil

#### Workflow de validation
1. **Brouillon** → Remplir les informations
2. **En attente** → Soumettre pour validation
3. **Validé** → Accès complet au système
4. **Suspendu/Archivé** → Gestion du cycle de vie

### 🏪 Gestion des Marchés et Coopératives

#### Marchés
- Créer les points de vente principaux
- Définir les zones de couverture
- Associer les responsables
- Configurer les capacités

#### Coopératives
- Enregistrer les groupements de producteurs
- Définir les services offerts
- Gérer les membres
- Suivre les performances

### 📊 Monitoring et KPIs

#### Snapshots quotidiens
Les KPIs sont générés automatiquement chaque jour à 2h00 :
- Nombre total de partenaires par rôle
- Taux d'adoption (QR, validation)
- Répartition géographique
- Évolution des profils

#### Tableaux de bord
Accès via *IFN → Monitoring et KPIs* :
- Vue globale de l'écosystème
- Tendances temporelles
- Alertes et anomalies
- Rapports personnalisables

### 🔐 Sécurité et Audit

#### Rôles et Permissions
| Rôle | Accès | Restrictions |
|------|-------|-------------|
| Marchand | Profil propre, données marché | Autres marchands |
| Producteur | Profil propre, données coop | Autres producteurs |
| Gestionnaire Coop | Membres de sa coop | Autres coopératives |
| Agent | Lecture globale, actions limitées | Modification des règles |
| Administrateur | Accès complet | - |

#### Journalisation
Toutes les actions sensibles sont journalisées :
- Création/modification profils
- Changements de rôles
- Connexions portail
- Génération QR
- Consentements

## 🔧 Configuration Avancée

### 📝 Paramètres techniques

#### Configuration QR/UID
```python
# Durée de validité QR (jours)
ifn_qr_ttl_days = 365

# Génération automatique
ifn_qr_auto_generate = True

# Taille et qualité QR
# Configurable dans les templates
```

#### Configuration API externes
```python
# SMS Provider (Twilio/Orange/etc.)
ifn_sms_provider = 'twilio'
ifn_twilio_account_sid = 'votre_sid'
ifn_twilio_auth_token = 'votre_token'

# Géolocalisation
ifn_map_provider = 'openstreetmap'
ifn_map_api_key = 'votre_cle'
```

#### Configuration KPIs
```python
# Fréquence des snapshots
ifn_kpi_cron_schedule = '0 2 * * *'  # Quotidien à 2h

# Rétention des logs
ifn_audit_retention_days = 365
```

### 🔄 Automatisations (CRON Jobs)

#### Jobs principaux
1. **ifn_cron_kpi_snapshot_daily** - Snapshots KPIs quotidiens
2. **ifn_cron_audit_rotate** - Nettoyage logs audit
3. **ifn_cron_qr_refresh** - Rafraîchissement QR expirés
4. **ifn_cron_sync_daily** - Synchronisation données
5. **ifn_cron_monthly_report** - Rapports mensuels

#### Configuration personnalisée
```xml
<record id="custom_cron" model="ir.cron">
    <field name="name">IFN: Custom Job</field>
    <field name="model_id" ref="model_ifn_kpi_snapshot"/>
    <field name="state">code</field>
    <field name="code">model.custom_method()</field>
    <field name="interval_number">1</field>
    <field name="interval_type">days</field>
</record>
```

## 🌐 API et Intégrations

### 📡 Endpoints principaux

#### Partenaires
```http
GET /api/ifn/partners
POST /api/ifn/partners
PUT /api/ifn/partners/{id}
DELETE /api/ifn/partners/{id}
```

#### KPIs
```http
GET /api/ifn/kpis/latest
GET /api/ifn/kpis/trends?days=30
GET /api/ifn/kpis/snapshot/{date}
```

#### Audit
```http
GET /api/ifn/audit/logs
GET /api/ifn/audit/security-summary
```

### 📤 Webhooks

#### Événements disponibles
- `ifn.partner.created` - Nouveau partenaire créé
- `ifn.partner.validated` - Profil validé
- `ifn.qr.generated` - QR généré
- `ifn.role.changed` - Changement de rôle

## 🧙 Assistants (Wizards)

### 📥 Import Partenaires
**Objectif** : Importer en masse des partenaires depuis des fichiers CSV/Excel

#### Fonctionnalités
- **Mapping automatique** des colonnes
- **Validation** des données en temps réel
- **Géolocalisation** automatique depuis adresses
- **Création UID/QR** automatique
- **Rapport d'import** détaillé

#### Format de fichier supporté
```csv
Nom,Email,Téléphone,Adresse,Ville,Région
John Doe,john@email.com,12345678,"Abidjan, Cocody",Abidjan,Abidjan
Jane Smith,jane@email.com,87654321,"Bouaké, Centre",Bouaké,Vallée du Bandama
```

#### Accès
`IFN → Outils → Importer Partenaires`

### 🔄 Régénération QR Codes
**Objectif** : Régénérer les codes QR en lot pour des enregistrements existants

#### Fonctionnalités
- **Sélection multiple** par filtres
- **Mise à jour automatique** des références
- **Historique** des régénérations
- **Export** des QR regénérés
- **Annulation** possible si erreur

#### Accès
`IFN → Outils → Régénérer QR Codes`

### 📜 Génération Attestations
**Objectif** : Générer des documents officiels certifiés

#### Types d'attestations
- **Attestation d'inscription** IFN
- **Attestation de conformité** annuelle
- **Certificat de vérification** UID/QR
- **Attestation d'activité** professionnelle

#### Fonctionnalités
- **Templates personnalisables**
- **Génération PDF** officielle
- **Signature numérique** intégrée
- **Envoi automatique** par email
- **Historique** des attestations générées

#### Accès
`IFN → Rapports → Générer Attestations`

### ⚙️ Configuration des Wizards

#### Paramètres généraux
```python
# Configuration dans ifn_settings.py
ifn_import_batch_size = 1000
ifn_qr_regeneration_delay = 60  # secondes
ifn_attestation_watermark = True
```

#### Permissions requises
- **Import Partenaires** : Gestionnaire Coop ou Agent
- **Régénération QR** : Agent ou Administrateur
- **Attestations** : Agent ou Administrateur

## 📄 Rapports et Attestations

### 📋 Types de Rapports Disponibles

#### 🏆 Attestations Officielles
- **Attestation d'inscription IFN** : Document officiel d'inscription
- **Attestation de conformité** : Validation annuelle de conformité
- **Certificat de vérification UID/QR** : Authentification de l'identité
- **Attestation d'activité** : Confirmation d'activité professionnelle
- **Attestation de géolocalisation** : Validation de l'adresse

#### 📊 Rapports d'Activité
- **Rapport mensuel** : Synthèse des activités par période
- **Rapport par zone** : Activités géographiques détaillées
- **Rapport par rôle** : Statistiques par type d'utilisateur
- **Rapport de performance** : KPIs et tendances
- **Rapport d'audit** : Sécurité et conformité

### 🖨️ Templates de Rapports

#### Structure des Templates
```xml
<!-- Exemple de template d'attestation -->
<template id="ifn_attestation_subscription">
    <div class="attestation-header">
        <h1>Attestation d'Inscription IFN</h1>
        <div class="logo">
            <img src="/ifn_core/static/img/logo-ifn.png"/>
        </div>
    </div>
    <div class="attestation-body">
        <p>Le soussigné certifie que :</p>
        <ul>
            <li>Nom : <span t-esc="partner.name"/></li>
            <li>UID IFN : <span t-esc="partner.x_ifn_uid"/></li>
            <li>Date d'inscription : <span t-esc="partner.create_date"/></li>
        </ul>
    </div>
</template>
```

#### Personnalisation des Templates
- **Header/Footer** personnalisables avec logo IFN
- **Watermarks** de sécurité automatiques
- **Codes QR** intégrés automatiquement
- **Signatures numériques** des administrateurs
- **Numéros uniques** de suivi

### 📈 Génération Automatique

#### Rapports Planifiés
```python
# Tâches cron automatiques
ifn_cron_monthly_report    # Rapport mensuel global
ifn_cron_audit_report       # Rapport d'audit mensuel
ifn_cron_compliance_report  # Rapport de conformité annuel
```

#### Déclenchements Automatiques
- **Création partenaire** → Génération attestation
- **Validation profil** → Certificat de vérification
- **Changement rôle** → Mise à jour documents
- **Fin de période** → Rapport d'activité

### 📤 Distribution des Rapports

#### Canaux de Distribution
- **Email automatique** avec pièce jointe PDF
- **Portail IFN** : Téléchargement par l'utilisateur
- **API REST** : Intégration avec systèmes externes
- **Export manuel** : CSV, Excel, PDF
- **Impression directe** : Format papier

#### Configuration d'Envoi
```python
# Configuration des emails
ifn_attestation_email_template = 'ifn.email_template_attestation'
ifn_report_email_recipients = ['admin@ifn.ci', 'audit@ifn.ci']
ifn_report_email_schedule = 'monthly'  # monthly, weekly, daily
```

### 🔍 Audit et Traçabilité

#### Journal des Rapports
- **Création** : Qui, quand, pourquoi
- **Modification** : Historique des changements
- **Consultation** : Qui a accédé aux rapports
- **Téléchargement** : Journal des exports

#### Validation des Rapports
- **Checksum** automatique pour intégrité
- **Versionning** des templates
- **Archivage** légal des documents
- **Signature numérique** pour authenticité

#### Configuration
```python
# Dans les hooks métier
partner._ifn_publish_event('ifn.custom.event', {
    'partner_id': partner.id,
    'custom_data': 'valeur'
})
```

## 🧪 Tests et Qualité

### 🧪 Tests Unitaires
```bash
# Lancer les tests
odoo-bin -u odoo -d test_bdd --test-enable -i ifn_core
```

### 📊 Qualité du Code
- **Coverage** : Tests unitaires pour les modèles critiques
- **Linting** : PEP8 et conventions Odoo
- **Documentation** : Docstrings complets
- **Sécurité** : Validation des entrées et permissions

### ✅ Critères d'Acceptation

#### Fonctionnels
- [x] Création partenaire avec UID/QR fonctionnelle
- [x] Validation des rôles et permissions
- [x] Imports/exports de données sans erreur
- [x] Génération attestations personnalisées

#### Techniques
- [x] Performance avec 10k+ partenaires
- [x] Sécurité des accès cross-roles
- [x] Stabilité des CRON jobs
- [x] Qualité des rapports KPI

#### Qualité
- [x] Code maintenable et documenté
- [x] Architecture extensible
- [x] Support multilingue
- [x] Accessibilité conforme

## 🚨 Dépannage

### 📋 Erreurs communes

#### 1. Erreurs d'installation
```bash
# Bibliothèques manquantes
pip install qrcode Pillow

# Problèmes de permissions
sudo chown -R odoo:odoo /opt/odoo17/addons_ifn/
```

#### 2. Problèmes de QR
```python
# Erreur de génération QR
# Vérifier les dépendances : pip install qrcode[pil]
# Vérifier la configuration : ifn_qr_enabled = True
```

#### 3. Problèmes de permissions
```python
# Erreur d'accès refusé
# Vérifier les groupes utilisateur
# Vérifier les record rules dans ifn_record_rules.xml
```

### 📝 Logs et Monitoring

#### Logs d'application
```bash
# Logs Odoo
tail -f /var/log/odoo/odoo.log

# Logs IFN spécifiques
grep "IFN" /var/log/odoo/odoo.log
```

#### Monitoring KPI
- Accéder à *IFN → Monitoring et KPIs*
- Vérifier les snapshots quotidiens
- Surveiller les alertes de sécurité

## 🤝 Support et Documentation

### 📚 Documentation complémentaire
- [Guide d'administration](docs/administration.md)
- [Guide développeur](docs/developer.md)
- [Référence API](docs/api_reference.md)
- [FAQ](docs/faq.md)

### 🆘 Support technique
- **Email** : support@ifn.org
- **Documentation** : https://docs.ifn.org
- **Issues** : https://github.com/ifn/ifn-core/issues
- **Community** : https://community.ifn.org

## 🗺️ Roadmap

### Version 1.1 (Prévue Q1 2024)
- [ ] Portail mobile PWA
- [ ] Intégration paiements mobiles
- [ ] Advanced analytics
- [ ] Machine learning KPIs

### Version 1.2 (Prévue Q2 2024)
- [ ] Blockchain pour traçabilité
- [ ] AI pour détection fraudes
- [ ] Advanced reporting
- [ ] Multi-devise

## 📄 Licence

Ce module est sous licence **LGPL-3**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🏆 Contributors

- **IFN Development Team** - Développement principal
- **Community Contributors** - Tests et retours
- **Partenaires techniques** - Support et expertise

---

**IFN Core** - Le socle robuste et sécurisé pour votre écosystème d'inclusion financière numérique. 🌟

---

*Pour toute question ou contribution, n'hésitez pas à nous contacter ou rejoindre notre communauté !*