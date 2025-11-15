# IFN Portal Merchant

Portail Marchand vivrier IFN - Une solution complète pour les marchands du réseau IFN.

## Description

Ce module fournit un portail unifié pour les marchands vivriers IFN, leur permettant de :
- Gérer leurs ventes avec scan et commandes vocales
- Suivre leur stock en temps réel avec alertes
- Passer des commandes auprès des coopératives/fournisseurs
- Encaisser par Mobile Money avec suivi des transactions
- Payer leurs cotisations sociales (CNPS/CNAM/CMU)
- Suivre leur formation continue avec certificats
- Accéder à un tableau de bord avec KPIs pertinents

## Fonctionnalités

### 📊 Tableau de Bord
- KPIs en temps réel (CA, ruptures, social, paiements)
- Graphiques d'adoption des commandes vocales
- Actions rapides vers les fonctionnalités principales
- Historique des dernières ventes et encaissements

### 💰 Vente
- Scan code-barres/QR code et recherche vocale
- Panier avec gestion des quantités
- Modes de paiement : Espèces, Mobile Money, Crédit
- Génération automatique de reçus PDF
- Mode hors ligne avec synchronisation automatique

### 📦 Gestion des Stocks
- Affichage des niveaux de stock avec seuils d'alerte
- Ajustements de stock contrôlés
- Inventaire rapide
- Historique des mouvements
- Commandes de réapprovisionnement directes

### 🚚 Approvisionnement
- Catalogue des produits fournisseurs/coopératives
- Commandes avec suivi de statut
- Réception et mise à jour automatique du stock
- Gestion des délais de livraison

### 💳 Encaissements
- Intégration Mobile Money (Orange, MTN, Moov)
- Suivi des transactions en temps réel
- Historique détaillé des paiements
- Génération de reçus automatiques
- Gestion des transactions en attente

### 🛡️ Protection Sociale
- Visualisation du statut des cotisations (CNPS/CNAM/CMU)
- Paiement des cotisations par Mobile Money
- Téléchargement des attestations
- Rappels automatiques des échéances

### 🎓 Formation
- Modules multimédias avec contenu audio/pictos
- Suivi de progression et temps passé
- Quizz et évaluations simples
- Génération de certificats PDF
- Lecteur audio intégré

### 🌐 Accessibilité & Multilingue
- Support du français, baoulé, dioula
- Commandes vocales natives
- Interface adaptée (tailles de police, contraste)
- Conforme WCAG 2.1 AA

### 📱 PWA & Hors Ligne
- Application installable (Progressive Web App)
- Mode hors ligne complet avec queue de synchronisation
- Mise à jour automatique à la reconnexion
- Notifications push

## Installation

1. Copiez le dossier `ifn_portal_merchant` dans le répertoire `addons` d'Odoo
2. Dépendances requises :
   - `ifn_core` - Données et rôles IFN
   - `ifn_portal_common` - Infrastructure portail commune
   - `ifn_marketplace` - Gestion des ventes et produits
   - `ifn_inventory_light` - Gestion des stocks
   - `ifn_payments_mobile` - Intégration Mobile Money
   - `ifn_social_protection` - Protection sociale
   - `ifn_training` - Formation continue

3. Mettez à jour la liste des modules :
   ```bash
   ./odoo-bin -u all -d votre_base
   ```

4. Installez le module via l'interface Odoo ou :
   ```bash
   ./odoo-bin -i ifn_portal_merchant -d votre_base
   ```

## Configuration

### Paramètres Principaux
- **Activer le portail marchand** : Active/désactive l'accès au portail
- **Approuver automatiquement** : Approbation automatique des inscriptions
- **Commandes vocales** : Active la reconnaissance vocale
- **Mode hors ligne** : Active la synchronisation hors ligne

### Mobile Money
- **Fournisseurs** : Configurez les opérateurs disponibles
- **Délai d'attente** : Timeout pour les transactions (secondes)

### Gestion des Stocks
- **Alertes automatiques** : Active les notifications de stock bas
- **Seuil par défaut** : Seuil d'alerte par défaut

## Utilisation

### Accès au Portail
1. Les marchands IFN créent un compte ou utilisent leurs identifiants existants
2. Accédez à : `https://votre-domaine.com/portal/merchant`
3. Configurez vos préférences (langue, notifications, etc.)

### Fonctionnalités Clés

#### Vente par Scan/Voix
- Scannez les codes-barres ou utilisez la recherche vocale
- Gérez votre panier en temps réel
- Choisissez votre mode de paiement
- Générez automatiquement les reçus

#### Gestion des Stocks
- Surveillez vos niveaux de stock
- Recevez des alertes automatiques
- Effectuez des ajustements contrôlés
- Commandez directement auprès des fournisseurs

#### Paiement Mobile Money
- Initiez les paiements depuis le portail
- Suivez le statut en temps réel
- Recevez les confirmations automatiques
- Téléchargez les reçus

## API Endpoints

### Ventes
- `POST /api/merchant/sale/create` - Créer une vente
- `POST /api/merchant/sale/{id}/confirm` - Confirmer une vente
- `GET /api/merchant/products/search` - Rechercher des produits

### Stock
- `GET /api/merchant/stock/list` - Lister le stock
- `POST /api/merchant/stock/adjust` - Ajuster le stock
- `GET /api/merchant/stock/alerts` - Obtenir les alertes

### Paiements
- `POST /api/merchant/payment/mobile_money/init` - Initialiser Mobile Money
- `POST /api/merchant/payment/mobile_money/verify` - Vérifier un paiement
- `GET /api/merchant/payments/history` - Historique des paiements

### Social
- `GET /api/merchant/social/status` - Statut cotisations
- `POST /api/merchant/social/pay` - Payer cotisations
- `GET /api/merchant/social/attestation` - Télécharger attestations

## Sécurité

### Contrôle d'Accès
- Accès réservé au groupe `ifn_group_merchant`
- Isolation des données par marchand
- Validation CSRF/XSS sur tous les formulaires
- Journalisation des actions sensibles

### Règles de Sécurité
- Les marchands ne voient que leurs propres données
- ACL granulaires par modèle
- Chiffrement des communications
- Protection contre les injections SQL

## Développement

### Structure du Module
```
ifn_portal_merchant/
├── __init__.py
├── __manifest__.py
├── hooks.py
├── controllers/
│   ├── __init__.py
│   └── merchant.py
├── models/
│   ├── __init__.py
│   ├── merchant_portal.py
│   └── merchant_config.py
├── views/
│   ├── __init__.py
│   ├── merchant_pages.xml
│   ├── merchant_templates.xml
│   └── merchant_dashboard.xml
├── static/src/
│   ├── js/
│   │   ├── merchant_dashboard.js
│   │   ├── merchant_sell.js
│   │   ├── merchant_stock.js
│   │   ├── merchant_purchase.js
│   │   ├── merchant_payments.js
│   │   └── merchant_offline.js
│   ├── css/
│   │   └── merchant.css
│   └── xml/
│       └── merchant.xml
├── security/
│   ├── ir.model.access.csv
│   └── security.xml
├── data/
│   ├── ir_ui_menu.xml
│   └── res_config_settings.xml
├── demo/
│   └── merchant_demo.xml
└── i18n/
    ├── fr.po
    ├── ba_CI.po
    ├── di_CI.po
    └── ifn_portal_merchant.pot
```

### Personnalisation
Le module est conçu pour être facilement extensible :
- Widgets Odoo pour les composants JavaScript
- Templates QWeb pour l'interface
- Modèles Odoo pour la logique métier
- Points d'extension pour les intégrations

## Support

Pour toute question ou demande de support :
- Documentation technique : Voir le wiki IFN
- Rapports de bugs : Créer une issue sur le tracker
- Demandes de fonctionnalités : Contacter l'équipe de développement IFN

## Licence

Ce module est distribué sous licence LGPL-3. Voir le fichier `LICENSE` pour plus de détails.

## Version

- Version actuelle : 1.0.0
- Compatibilité Odoo : 17.0+
- Dernière mise à jour : Janvier 2024

## Roadmap

### v1.1 (Planifié)
- Intégration avancée avec les assistants vocaux
- Tableaux de bord personnalisables
- Notifications push avancées
- Export de données en temps réel

### v1.2 (Planifié)
- Intégration avec les systèmes de comptabilité externes
- Gestion avancée des promotions
- Analytique prédictive
- Support multidevice avancé