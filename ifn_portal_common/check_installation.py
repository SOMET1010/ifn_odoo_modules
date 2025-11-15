#!/usr/bin/env python3
"""
Script de vérification de l'installation d'IFN Portal Common
"""

import os
import sys

def check_file_exists(filepath, description):
    """Vérifie si un fichier existe"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description}: {filepath} (manquant)")
        return False

def check_template_content(filepath, template_id):
    """Vérifie si un template existe dans un fichier XML"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if template_id in content:
                print(f"✅ Template {template_id} trouvé dans {filepath}")
                return True
            else:
                print(f"❌ Template {template_id} manquant dans {filepath}")
                return False
    except Exception as e:
        print(f"❌ Erreur lecture {filepath}: {e}")
        return False

def main():
    print("🔍 Vérification de l'installation d'IFN Portal Common")
    print("=" * 60)

    base_path = "/opt/odoo17/addons_ifn/ifn_portal_common"

    # Vérifier les fichiers principaux
    checks = [
        (f"{base_path}/__manifest__.py", "Manifest du module"),
        (f"{base_path}/controllers/portal.py", "Contrôleur portal"),
        (f"{base_path}/views/website_layout.xml", "Layout website"),
        (f"{base_path}/views/portal_layout.xml", "Layout portail"),
        (f"{base_path}/views/website_templates.xml", "Templates website"),
        (f"{base_path}/views/portal_pages.xml", "Pages portail"),
        (f"{base_path}/static/src/css/ifn_portal.css", "CSS principal"),
    ]

    print("\n📁 Vérification des fichiers:")
    all_files_ok = True
    for filepath, desc in checks:
        if not check_file_exists(filepath, desc):
            all_files_ok = False

    # Vérifier les templates importants
    print("\n🎨 Vérification des templates:")
    template_checks = [
        (f"{base_path}/views/website_layout.xml", "ifn_portal_layout"),
        (f"{base_path}/views/portal_layout.xml", "portal_layout"),
        (f"{base_path}/views/website_templates.xml", "ifn_portal_home"),
        (f"{base_path}/views/portal_pages.xml", "portal_settings"),
    ]

    all_templates_ok = True
    for filepath, template_id in template_checks:
        if not check_template_content(filepath, template_id):
            all_templates_ok = False

    # Vérifier les routes dans le contrôleur
    print("\n🛣️  Vérification des routes:")
    try:
        with open(f"{base_path}/controllers/portal.py", 'r') as f:
            controller_content = f.read()

        routes = [
            "/portal",
            "/portal/home",
            "/portal/settings",
            "/portal/notifications",
            "/ifn/signup"
        ]

        for route in routes:
            if route in controller_content:
                print(f"✅ Route {route} trouvée")
            else:
                print(f"❌ Route {route} manquante")
                all_templates_ok = False

    except Exception as e:
        print(f"❌ Erreur lecture contrôleur: {e}")
        all_templates_ok = False

    # Résumé
    print("\n" + "=" * 60)
    if all_files_ok and all_templates_ok:
        print("🎉 Installation semble complète !")
        print("\n📝 Prochaines étapes:")
        print("1. Redémarrez Odoo si nécessaire")
        print("2. Mettez à jour le module: ifn_portal_common")
        print("3. Accédez à /portal pour tester la page d'accueil")
        print("4. Vérifiez que le CSS s'applique correctement")
    else:
        print("⚠️  Problèmes détectés - vérifiez les erreurs ci-dessus")

    return 0 if (all_files_ok and all_templates_ok) else 1

if __name__ == "__main__":
    sys.exit(main())