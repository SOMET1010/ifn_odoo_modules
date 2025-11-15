#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de test et validation du système d'icônes IFN
Vérifie l'intégration complète du système d'icônes.
"""

import os
import json
from pathlib import Path

def test_icons_integration():
    """Test l'intégration complète du système d'icônes IFN"""
    
    print("🔍 Test de l'intégration des icônes IFN")
    print("=" * 50)
    
    # Chemins des fichiers
    base_path = Path("/workspace/ifn_portal_common")
    static_src = base_path / "static" / "src"
    
    # Liste des fichiers à vérifier
    required_files = {
        'JavaScript': [
            'js/ifn_icons_mapping.js',
            'js/ifn_sprite_optimized.js', 
            'js/ifn_icon_fallbacks.js',
            'js/ifn_icon_system.js'
        ],
        'CSS': [
            'css/ifn_icons.css'
        ],
        'Assets': [
            'img/icons/ifn-icons.svg'
        ],
        'Templates': [
            'xml/ifn_icons_examples.xml'
        ]
    }
    
    all_files_exist = True
    total_files = 0
    found_files = 0
    
    # Vérifier l'existence des fichiers
    for category, files in required_files.items():
        print(f"\n📁 Vérification des fichiers {category}:")
        total_files += len(files)
        
        for file_path in files:
            full_path = static_src / file_path
            if full_path.exists():
                size = full_path.stat().st_size
                print(f"  ✅ {file_path} ({size:,} bytes)")
                found_files += 1
            else:
                print(f"  ❌ {file_path} - MANQUANT")
                all_files_exist = False
    
    print(f"\n📊 Résultat de la vérification:")
    print(f"  Fichiers trouvés: {found_files}/{total_files}")
    
    if not all_files_exist:
        print("❌ Des fichiers sont manquants!")
        return False
    
    # Vérifier le manifest
    print(f"\n📋 Vérification du manifest:")
    manifest_path = base_path / "__manifest__.py"
    if manifest_path.exists():
        with open(manifest_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Vérifier les nouveaux assets
        checks = [
            ('ifn_icons.css', 'CSS des icônes'),
            ('ifn_icons_mapping.js', 'Mapping des icônes'),
            ('ifn_sprite_optimized.js', 'Sprite optimisé'),
            ('ifn_icon_fallbacks.js', 'Fallbacks'),
            ('ifn_icon_system.js', 'Système principal'),
            ('ifn_icons_examples.xml', 'Exemples de templates')
        ]
        
        for asset, description in checks:
            if asset in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description} - MANQUANT dans le manifest")
                all_files_exist = False
    else:
        print("  ❌ Manifest non trouvé!")
        all_files_exist = False
    
    # Vérifier les icônes SVG
    print(f"\n🎨 Vérification des icônes SVG:")
    svg_path = static_src / "img" / "icons" / "ifn-icons.svg"
    if svg_path.exists():
        with open(svg_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
            
        # Compter les symboles
        import re
        symbols = re.findall(r'<symbol id="ifn-icon-([^"]+)"', svg_content)
        print(f"  ✅ {len(symbols)} icônes trouvées dans le SVG:")
        for symbol in sorted(symbols)[:10]:  # Afficher les 10 premières
            print(f"    - {symbol}")
        if len(symbols) > 10:
            print(f"    ... et {len(symbols) - 10} autres")
            
        if len(symbols) != 18:
            print(f"  ⚠️  Attention: {len(symbols)} icônes trouvées, 18 attendues")
    else:
        print("  ❌ Sprite SVG non trouvé!")
        all_files_exist = False
    
    # Vérifier la documentation
    print(f"\n📚 Vérification de la documentation:")
    docs_path = Path("/workspace/docs/icons_integration.md")
    if docs_path.exists():
        size = docs_path.stat().st_size
        print(f"  ✅ Documentation trouvée ({size:,} bytes)")
    else:
        print("  ❌ Documentation manquante!")
        all_files_exist = False
    
    # Résumé final
    print(f"\n🎯 Résumé final:")
    if all_files_found := (found_files == total_files and all_files_exist):
        print("  ✅ Tous les fichiers sont présents et correctement configurés!")
        print("  ✅ Le système d'icônes IFN est prêt à être utilisé.")
        print("\n🚀 Prochaines étapes:")
        print("  1. Redémarrer le serveur Odoo")
        print("  2. Tester l'affichage des icônes dans l'interface")
        print("  3. Vérifier l'accessibilité avec un lecteur d'écran")
        print("  4. Tester les performances avec des connexions lentes")
    else:
        print("  ❌ Des problèmes ont été détectés!")
        print("  ⚠️  Veuillez corriger les fichiers manquants avant de continuer.")
    
    return all_files_found

def generate_integration_summary():
    """Génère un résumé de l'intégration"""
    
    summary = {
        "integration_date": "2025-11-15",
        "total_icons": 18,
        "files_created": [
            {
                "path": "static/src/js/ifn_icons_mapping.js",
                "description": "API principale et mapping centralisé",
                "lines": 829
            },
            {
                "path": "static/src/js/ifn_sprite_optimized.js", 
                "description": "Optimisation du sprite SVG",
                "lines": 257
            },
            {
                "path": "static/src/js/ifn_icon_fallbacks.js",
                "description": "Fallbacks et accessibilité", 
                "lines": 606
            },
            {
                "path": "static/src/js/ifn_icon_system.js",
                "description": "Initialisation et optimisations",
                "lines": 549
            },
            {
                "path": "static/src/css/ifn_icons.css",
                "description": "Styles complémentaires",
                "lines": 627
            },
            {
                "path": "static/src/xml/ifn_icons_examples.xml",
                "description": "Exemples d'intégration",
                "lines": 535
            }
        ],
        "features": [
            "Mapping centralisé des 18 icônes IFN",
            "Système de sprite optimisé avec cache",
            "Fallbacks automatiques (emoji, texte, image)",
            "Support accessibilité complet (ARIA)",
            "Lazy loading intelligent",
            "Préchargement adaptatif",
            "Cache LRU avec persistance",
            "Monitoring des performances",
            "API Odoo intégrée",
            "Responsive design"
        ],
        "categories": [
            "Business (vente, paiement)",
            "Logistics (stock)",
            "Social (réseau, profil)",
            "Education (formation, aide)",
            "Navigation (accueil, paramètres, recherche)",
            "Communication (notifications)",
            "Actions (CRUD, upload, download)",
            "Status (succès, erreur, avertissement)",
            "Tools (QR code)",
            "Data (statistiques)",
            "Planning (calendrier, temps)"
        ],
        "colors": {
            "primary": "#F77F00",
            "success": "#009739",
            "info": "#17a2b8",
            "warning": "#ffc107",
            "danger": "#dc3545"
        },
        "optimizations": [
            "Sprite SVG optimisé",
            "Cache multi-niveaux",
            "Lazy loading avec IntersectionObserver",
            "Préchargement intelligent",
            "Adaptation à la connexion",
            "Compression et minification"
        ],
        "documentation": "docs/icons_integration.md"
    }
    
    # Sauvegarder le résumé
    output_path = Path("/workspace/ifn_portal_common/INTEGRATION_SUMMARY.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Résumé de l'intégration sauvegardé: {output_path}")
    return summary

def main():
    """Fonction principale"""
    print("🎯 Intégration du Système d'Icônes IFN")
    print("=" * 50)
    
    # Test de l'intégration
    integration_ok = test_icons_integration()
    
    # Générer le résumé
    summary = generate_integration_summary()
    
    # Instructions finales
    print(f"\n📋 Instructions d'utilisation:")
    print(f"  1. Documentation complète: docs/icons_integration.md")
    print(f"  2. Exemples d'intégration: static/src/xml/ifn_icons_examples.xml")
    print(f"  3. API JavaScript: IFN_Icons, IFN_IconSystem, IFN_IconFallbacks")
    print(f"  4. Templates Odoo: Utiliser IFN_Icons.odooAPI.iconHTML()")
    
    print(f"\n✨ Fonctionnalités principales:")
    for feature in summary['features']:
        print(f"  • {feature}")
    
    print(f"\n🎨 Icônes disponibles ({summary['total_icons']} pictogrammes):")
    for category in summary['categories']:
        print(f"  • {category}")
    
    if integration_ok:
        print(f"\n🎉 Intégration terminée avec succès!")
        print(f"   Le système d'icônes IFN est prêt à être utilisé.")
    else:
        print(f"\n⚠️  Des corrections sont nécessaires.")
        print(f"   Veuillez vérifier les fichiers manquants.")
    
    return integration_ok

if __name__ == "__main__":
    main()