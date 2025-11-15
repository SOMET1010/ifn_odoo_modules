#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de test pour vérifier que tous les imports du module IFN Core fonctionnent correctement
"""

import sys
import os

# Ajouter le chemin du module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔍 Test des imports du module IFN Core...")

    # Test imports des modèles
    print("\n📦 Modèles:")
    from models import res_partner
    from models import ifn_market
    from models import ifn_coop
    from models import ifn_zone
    from models import ifn_product_category_ref
    from models import ifn_settings
    from models import ifn_audit_log
    from models import ifn_kpi_snapshot
    from models import ifn_mixin
    print("✅ Tous les modèles importés avec succès")

    # Test imports des wizards
    print("\n🧪 Wizards:")
    from wizard import ifn_import_partner
    from wizard import ifn_qr_regenerate
    from wizard import ifn_attestation_wizard
    print("✅ Tous les wizards importés avec succès")

    # Test imports des rapports
    print("\n📊 Rapports:")
    from report import ifn_attestation_report
    print("✅ Rapports importés avec succès")

    # Test des classes principales
    print("\n🏗️  Classes principales:")
    assert hasattr(res_partner, 'ResPartner')
    assert hasattr(ifn_market, 'IFNMarket')
    assert hasattr(ifn_coop, 'IFNCoop')
    assert hasattr(ifn_zone, 'IFNZone')
    print("✅ Classes principales accessibles")

    # Test des attributs clés
    print("\n🔑 Attributs clés:")
    assert hasattr(res_partner.ResPartner, 'x_ifn_role')
    assert hasattr(res_partner.ResPartner, 'x_ifn_uid')
    assert hasattr(res_partner.ResPartner, 'x_ifn_qr')
    assert hasattr(res_partner.ResPartner, 'x_ifn_market_id')
    print("✅ Attributs IFN accessibles")

    print("\n🎉 Tous les tests d'importation réussis !")
    print("✅ Le module IFN Core est prêt pour l'installation")

except ImportError as e:
    print(f"❌ Erreur d'import: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Erreur inattendue: {e}")
    sys.exit(1)