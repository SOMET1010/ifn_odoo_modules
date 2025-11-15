=====================
IFN Portal Merchant
=====================

Portail Marchand vivrier IFN - Solution complète pour les marchands du réseau IFN.

Description
-----------

Ce module fournit un portail unifié et moderne pour les marchands vivriers IFN, leur permettant de gérer efficacement leurs activités commerciales au quotidien.

Fonctionnalités principales
-------------------------

* **Tableau de Bord** : KPIs en temps réel, graphiques, actions rapides
* **Vente** : Scan code-barres, commandes vocales, panier intelligent, reçus PDF
* **Stock** : Gestion en temps réel, alertes, ajustements, inventaire rapide
* **Approvisionnement** : Commandes fournisseurs/coopératives, suivi livraisons
* **Encaissements** : Mobile Money (Orange, MTN, Moov), suivi temps réel
* **Social** : Cotisations CNPS/CNAM/CMU, attestations, paiements en ligne
* **Formation** : Modules multimédias, progression, certificats, lecteur audio
* **PWA** : Application installable, mode hors ligne, synchronisation automatique

Capture d'écran
---------------

.. image:: https://via.placeholder.com/800x400/28a745/ffffff?text=Tableau+de+Bord+Marchand+IFN
   :alt: Tableau de bord du portail marchand IFN

Installation
-------------

Dépendances requises :

* **ifn_core** : Données de base et rôles IFN
* **ifn_portal_common** : Infrastructure portail commune
* **ifn_marketplace** : Gestion des ventes et produits
* **ifn_inventory_light** : Gestion des stocks
* **ifn_payments_mobile** : Intégration Mobile Money
* **ifn_social_protection** : Protection sociale
* **ifn_training** : Formation continue

Pour installer le module :

1. Copiez le dossier `ifn_portal_merchant` dans votre répertoire `addons`
2. Mettez à jour la liste des modules
3. Installez via l'interface Odoo ou en ligne de commande

.. code-block:: bash

   ./odoo-bin -i ifn_portal_merchant -d votre_base

Configuration
-------------

Paramètres disponibles dans *Settings → IFN → Merchant Portal Settings* :

* **Activer le portail marchand** : Active/désactive l'accès
* **Commandes vocales** : Active la reconnaissance vocale
* **Mode hors ligne** : Active la synchronisation automatique
* **Alertes de stock** : Configure les notifications automatiques
* **Mobile Money** : Configure les opérateurs disponibles

Utilisation
-----------

Accès au portail
~~~~~~~~~~~~~~~~~

Les marchands IFN peuvent accéder au portail via :

URL : ``https://votre-domaine.com/portal/merchant``

Comptes de démonstration
~~~~~~~~~~~~~~~~~~~~~~~

* **Marchand** : marie.konan@ifn.ci / demo123
* **Accès** : Espace Marchand → Tableau de bord

Flux de vente typique
~~~~~~~~~~~~~~~~~~~~~

1. **Scan/Voix** : Identifiez le produit par scan ou commande vocale
2. **Panier** : Ajoutez les produits avec les quantités souhaitées
3. **Paiement** : Choisissez le mode (Espèces/Mobile Money/Crédit)
4. **Reçu** : Générez automatiquement le reçu PDF

API Endpoints
-------------

L'API REST fournit les endpoints suivants :

Ventes
~~~~~~

* ``POST /api/merchant/sale/create`` - Créer une vente
* ``GET /api/merchant/products/search`` - Rechercher des produits
* ``POST /api/merchant/sale/{id}/confirm`` - Confirmer une vente

Stock
~~~~~

* ``GET /api/merchant/stock/list`` - Lister le stock
* ``POST /api/merchant/stock/adjust`` - Ajuster le stock
* ``GET /api/merchant/stock/alerts`` - Obtenir les alertes

Paiements
~~~~~~~~~

* ``POST /api/merchant/payment/mobile_money/init`` - Initialiser paiement
* ``GET /api/merchant/payments/history`` - Historique des paiements

Social
~~~~~~

* ``GET /api/merchant/social/status`` - Statut cotisations
* ``POST /api/merchant/social/pay`` - Payer cotisations

Sécurité
--------

Contrôle d'accès
~~~~~~~~~~~~~~~~

* Accès réservé au groupe ``ifn_group_merchant``
* Isolation complète des données par marchand
* Validation CSRF/XSS sur tous les formulaires
* Journalisation des actions sensibles

Règles ACL
~~~~~~~~~~

* Les marchands voient uniquement leurs propres données
* Permissions granulaires par fonctionnalité
* Audit trail complet des actions

Accessibilité
-------------

Multilinguisme
~~~~~~~~~~~~~~

* **Français** : Langue principale, complète
* **Baoulé** : Interface traduite, pictogrammes adaptés
* **Dioula** : Support complet pour les marchands dioulophones

Commandes vocales
~~~~~~~~~~~~~~~~

* Reconnaissance vocale native via Web Speech API
* Support des dialectes locaux
* Interface adaptée avec gros boutons et pictogrammes

WCAG 2.1 AA
~~~~~~~~~~~~

* Contraste élevé pour les textes
* Navigation au clavier complète
* Lecteur d'écran compatible
* Tailles de police ajustables

Performance
-----------

PWA (Progressive Web App)
~~~~~~~~~~~~~~~~~~~~~~~~~~

* Application installable sur mobile
* Cache intelligent des ressources
* Mode hors ligne complet
* Synchronisation automatique

Optimisations
~~~~~~~~~~~~

* Chargement lazy des données
* Pagination des listes importantes
* Compression des assets
* Service Worker pour le cache

Support et maintenance
---------------------

Documentation
~~~~~~~~~~~~~~~

* **Utilisateur** : Guide complet avec captures d'écran
* **Technique** : API documentation, architecture
* **Développeur** : Guide d'extension et personnalisation

Mises à jour
~~~~~~~~~~

* Mises à jour automatiques via PWA
* Backward compatibility garantie
* Migration transparente des données

Bug Tracker
~~~~~~~~~~~

* Signalement via GitHub Issues
* Support prioritaire pour les bugs critiques
* Corrections déployées dans les 48h

Changelog
---------

Version 1.0.0 (2024-01-04)
-------------------------

* Initial release complète
* Toutes les fonctionnalités du cahier des charges
* Support multilingue FR/BA/DI
* PWA complet avec mode hors ligne
* Intégration Mobile Money
* Formation continue avec certificats

Roadmap
--------

Version 1.1 (Q2 2024)
~~~~~~~~~~~~~~~~~~~~~

* Tableaux de bord personnalisables
* Notifications push avancées
* Intégration assistants vocaux avancés
* Analytique prédictive

Version 1.2 (Q3 2024)
~~~~~~~~~~~~~~~~~~~~~

* Intégration systèmes comptabilité externes
* Gestion avancée des promotions
* Support multidevice étendu
* Export avancé des données

Contributeurs
------------

* Développement : Équipe IFN Development
* Design : IFN UX Team
* Tests : IFN QA Team
* Traduction : IFN Localization Team

Licence
-------

Ce module est distribué sous licence `LGPL-3`_.

.. _LGPL-3: https://www.gnu.org/licenses/lgpl-3.0.en.html

Contact
-------

* **Documentation** : https://docs.ifn.ci/merchant-portal
* **Support** : support@ifn.ci
* **Issues** : https://github.com/ifn/ifn-odoo/issues
* **Community** : https://community.ifn.ci

---

**IFN - Innovations pour la Formation Numérique**
*Digitaliser l'avenir des marchands africains*