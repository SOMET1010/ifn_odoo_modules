# IFN Portal Producer - Portail Producteur Agricole

## 🌾 Description

Le module **IFN Portal Producer** fournit un espace numérique complet pour les producteurs agricoles ruraux dans l'écosystème IFN (Inclusion Financière, Économique et Numérique du secteur informel).

Ce portail permet à chaque producteur agricole de :
- 🌱 Gérer sa production (récoltes, qualité, photos)
- 💰 Vendre directement sur le marché virtuel
- 📊 Suivre ses revenus et indicateurs de performance
- 🛡 Bénéficier de la protection sociale (CNPS/CNAM/CMU)
- 🎓 Se former via des modules interactifs
- 📱 Opérer même en zones faibles connectivité (PWA)

## 🎯 Objectifs

### Fonctionnalités principales
- **Tableau de bord producteur** avec KPIs en temps réel
- **Gestion des récoltes** avec suivi de qualité et photos
- **Mise en vente directe** avec calcul automatique des prix
- **Suivi des commandes** et confirmation de livraison
- **Paiements Mobile Money** (MTN, Orange, Moov, Wave)
- **Protection sociale** avec attestations téléchargeables
- **Formation en ligne** avec certificats reconnus
- **Interface multilingue** (Français, Baoulé, Dioula)
- **Mode hors ligne** complet avec synchronisation automatique

### Public cible
- **Producteurs agricoles** du secteur vivrier rural
- **Agents de suivi** pour supervision
- **Administrateurs IFN** pour gestion et reporting

## 🏗️ Architecture technique

### Structure du module
```
ifn_portal_producer/
├── __init__.py                 # Initialisation
├── __manifest__.py            # Configuration du module
├── controllers/               # Contrôleurs web
│   └── producer.py           # Gestion des routes producteur
├── views/                     # Vues QWeb et templates
│   ├── producer_templates.xml # Templates des pages
│   ├── producer_pages.xml    # Configuration des pages
│   └── producer_menu.xml     # Menus de navigation
├── static/                    # Assets web
│   ├── src/css/              # Styles CSS
│   ├── src/js/               # Scripts JavaScript
│   └── src/xml/              # Templates XML
├── security/                  # Sécurité et permissions
├── data/                      # Données de configuration
├── demo/                      # Données de démonstration
└── i18n/                      # Traductions
    ├── fr.po                 # Français
    ├── ba.po                 # Baoulé
    └── di.po                 # Dioula
```

### Dépendances
- `ifn_core` : Socle données et sécurité IFN
- `ifn_portal_common` : Infrastructure portail commune
- `ifn_inventory_light` : Gestion des récoltes
- `ifn_marketplace` : Place de marché virtuelle
- `ifn_payments_mobile` : Paiements Mobile Money
- `ifn_social_protection` : Protection sociale
- `ifn_training` : Formation en ligne

## 🚀 Installation

### Prérequis
- Odoo 17.0+
- Modules IFN préalablement installés
- Accès administrateur

### Installation
1. Copier le dossier `ifn_portal_producer` dans `addons/`
2. Redémarrer Odoo
3. Activer le mode développeur
4. Mettre à jour la liste des applications
5. Installer "IFN Portal Producer"

### Configuration post-installation
1. Créer les utilisateurs producteurs
2. Configurer les groupes et permissions
3. Définir les produits agricoles
4. Paramétrer les modes de paiement

## 🌐 Routes et fonctionnalités

### Routes principales
```
/portal/producer              # Tableau de bord
/portal/producer/harvest      # Gestion récoltes
/portal/producer/sell         # Mise en vente
/portal/producer/orders       # Commandes reçues
/portal/producer/payments     # Historique paiements
/portal/producer/social        # Protection sociale
/portal/producer/training     # Formation
/portal/producer/profile       # Profil producteur
```

### API Endpoints
```
POST /portal/producer/api/harvest/create     # Créer récolte
POST /portal/producer/api/offer/publish      # Publier offre
POST /portal/producer/api/order/confirm      # Confirmer commande
POST /portal/producer/api/social/payment     # Payer cotisation
GET  /portal/producer/api/dashboard/stats     # KPIs tableau de bord
```

## 🎨 Interface utilisateur

### Design et charte graphique
- **Couleurs IFN** 🇨🇮 : Orange (#F77F00), Vert (#009739)
- **Design responsive** adapté mobile et desktop
- **Accessibilité** WCAG 2.1 AA
- **Support pictogrammes** et icônes universelles
- **Animations** fluides et micro-interactions

### Expérience utilisateur
- **Navigation intuitive** avec menus pictogrammés
- **Feedback visuel** immédiat
- **Gestes tactiles** optimisés pour mobile
- **Mode hors ligne** transparent
- **Notifications** temps réel

## 📱 Mode PWA et Hors Ligne

### Fonctionnalités PWA
- **Installation** sur mobile (Android, KaiOS, iOS)
- **Service Worker** pour mise en cache
- **Notifications push** possibles
- **Mises à jour** automatiques

### Mode hors ligne
- **Récoltes** enregistrées localement
- **Synchronisation** automatique à la reconnexion
- **File d'attente** intelligente
- **Conflits** résolus automatiquement

## 🌍 Multilinguisme

### Langues supportées
- **Français** : Langue principale et interface
- **Baoulé** : Langue locale majoritaire
- **Dioula** : Langue commerciale et marché

### Couverture traduction
- **100%** de l'interface traduite
- **Messages** d'erreur et notifications
- **Contenus** dynamiques
- **Aide contextuelle**

## 🔐 Sécurité

### Contrôle d'accès
- **Rôles** IFN prédéfinis
- **Permissions** granulaires
- **Règles** d'accès par données
- **Audit** complet des actions

### Protection des données
- **Chiffrement** données sensibles
- **Validation** entrées utilisateur
- **Protection** contre CSRF/XSS
- **Journalisation** exhaustive

## 📊 Tableau de bord et KPIs

### Indicateurs clés
- **Production totale** (kg/semaine/mois)
- **Taux de vente** (% récolte écoulée)
- **Revenu cumulé** (FCFA)
- **Temps moyen** de vente (jours)
- **Statut social** (cotisations)
- **Progression formation** (%)

### Visualisations
- **Graphiques** dynamiques
- **Tendances** temporelles
- **Comparaisons** périodes
- **Alertes** intelligentes

## 💰 Paiements Mobile Money

### Opérateurs supportés
- **MTN Mobile Money**
- **Orange Money**
- **Moov Money**
- **Wave**

### Processus
1. **Initiation** depuis le portail
2. **Validation** USSD/WhatsApp
3. **Confirmation** automatique
4. **Reçu** PDF généré
5. **Synchronisation** comptabilité

## 🛡 Protection Sociale

### Couvertures
- **CNPS** : Retraite et prestations
- **CNAM** : Assurance maladie
- **CMU** : Couverture maladie universelle

### Fonctionnalités
- **Suivi** statut cotisations
- **Paiement** Mobile Money
- **Attestations** PDF
- **Historique** complet
- **Alertes** échéances

## 🎓 Formation et Certification

### Contenus
- **Agriculture** durable et techniques
- **Gestion** financière
- **Commercialisation** produits
- **Santé** et sécurité
- **Alphabétisation** numérique

### Modalités
- **Modules** courts (15-60 min)
- **Audio/vidéo** avec pictogrammes
- **Quiz** de validation
- **Certificats** reconnus
- **Progression** sauvegardée

## 📈 Déploiement et Monitoring

### Performance
- **Temps de chargement** < 2.5s sur 3G
- **Cache PWA** < 50 Mo
- **Responsive** 100%
- **Score Lighthouse** > 85

### Monitoring
- **Logs** erreurs et performances
- **KPIs** utilisation
- **Alertes** automatiques
- **Rapports** périodiques

## 🧪 Tests

### Tests inclus
- **Navigation** complète du portail
- **Création** récolte et offre
- **Paiement** Mobile Money (mock)
- **Mode hors ligne** et synchronisation
- **Accessibilité** et responsivité
- **Performance** et charge

### Résultats attendus
- ✅ Tous les tests fonctionnels passent
- ✅ Performance conforme aux exigences
- ✅ Accessibilité validée WCAG 2.1 AA
- ✅ Mode PWA opérationnel

## 🔧 Maintenance

### Mises à jour
- **Déploiement** sans interruption
- **Migration** automatique données
- **Backward compatibility** préservée
- **Documentation** mise à jour

### Support
- **Guide** utilisateur complet
- **FAQ** et dépannage
- **Vidéos** tutorielles
- **Support** technique IFN

## 📞 Support et documentation

### Ressources
- **Documentation** technique complète
- **Guide utilisateur** illustré
- **API** documentation
- **FAQ** et solutions

### Contact support
- **Email** : support@ifn.org
- **Téléphone** : +225 XX XX XX XX
- **Site web** : https://ifn.org
- **Forum** : https://forum.ifn.org

## 📜 Licence

Ce module est sous licence **LGPL-3**. Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont bienvenues ! Veuillez suivre les guidelines :
1. Forker le projet
2. Créer une branche thématique
3. Soumettre une pull request
4. Documenter les changements

## 📋 Changelog

### Version 1.0.0
- 🎉 Version initiale complète
- ✅ Toutes les fonctionnalités du cahier des charges
- ✅ Interface responsive et PWA
- ✅ Multilinguisme FR/BA/DI
- ✅ Mode hors ligne
- ✅ Tests et documentation

---

**Développé avec ❤️ par l'équipe IFN pour l'autonomisation des producteurs agricoles ivoiriens**