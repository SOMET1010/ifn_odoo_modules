#!/usr/bin/env python3
"""
Générateur d'icônes IFN PWA
Crée des icônes SVG dans différentes tailles pour le PWA
"""

import os
import base64

def create_icon_svg(size):
    """Crée un SVG pour une taille donnée"""
    svg_template = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
    <!-- Fond -->
    <rect width="{size}" height="{size}" fill="#F77F00" rx="{size//10}"/>

    <!-- Cadre intérieur -->
    <rect x="{size//10}" y="{size//10}" width="{size*8//10}" height="{size*8//10}"
          fill="#009739" rx="{size//15}"/>

    <!-- Texte IFN -->
    <text x="{size//2}" y="{size//2 + size//8}"
          font-family="Arial, sans-serif"
          font-size="{size//4}"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
          dominant-baseline="middle">IFN</text>

    <!-- Ligne décorative Côte d'Ivoire -->
    <rect x="{size//10}" y="{size*8//10}" width="{size*8//10}" height="{size//40}"
          fill="white" opacity="0.8"/>
    <rect x="{size//10}" y="{size*8//10}" width="{size*8//10*2//3}" height="{size//40}"
          fill="#F77F00"/>
    <rect x="{size//10 + size*8//10*2//3}" y="{size*8//10}" width="{size*8//10*1//3}" height="{size//40}"
          fill="#009739"/>
</svg>"""

    return svg_template

def create_icon_base64(svg_content):
    """Convertit le SVG en base64 pour data URI"""
    encoded = base64.b64encode(svg_content.encode('utf-8')).decode('utf-8')
    return f"data:image/svg+xml;base64,{encoded}"

def generate_icons():
    """Génère toutes les tailles d'icônes"""
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]

    # Créer le répertoire des icônes
    icon_dir = os.path.dirname(os.path.abspath(__file__))

    icons = []

    for size in sizes:
        svg_content = create_icon_svg(size)
        svg_file = os.path.join(icon_dir, f"icon-{size}.svg")

        # Sauvegarder le fichier SVG
        with open(svg_file, 'w', encoding='utf-8') as f:
            f.write(svg_content)

        # Créer aussi un PNG placeholder (note: nécessite une bibliothèque de conversion)
        png_file = os.path.join(icon_dir, f"icon-{size}.png")

        # Créer un fichier PNG de placeholder simple
        png_placeholder = f"""# Icône IFN {size}x{size}
# Fichier placeholder - remplacer par un vrai PNG généré depuis le SVG
# Commande recommandée: rsvg-convert icon-{size}.svg -o icon-{size}.png
# Ou avec ImageMagick: convert icon-{size}.svg icon-{size}.png
"""

        with open(png_file + '.txt', 'w') as f:
            f.write(png_placeholder)

        # Ajouter à la liste des icônes pour le manifest
        icons.append({
            'src': f"/ifn_portal_common/static/src/img/icons/icon-{size}.svg",
            'sizes': f"{size}x{size}",
            'type': "image/svg+xml"
        })

    # Générer le manifest PWA mis à jour
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
        "icons": icons,
        "categories": ["business", "finance", "productivity"],
        "lang": "fr",
    }

    # Sauvegarder le manifest
    import json
    manifest_file = os.path.join(icon_dir, '..', '..', '..', '..', 'views', 'manifest.json')
    os.makedirs(os.path.dirname(manifest_file), exist_ok=True)

    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"Généré {len(sizes)} icônes IFN dans {icon_dir}")
    print(f"Manifest PWA généré dans {manifest_file}")

    # Afficher les commandes pour convertir en PNG
    print("\nCommandes pour convertir les SVG en PNG:")
    for size in sizes:
        print(f"rsvg-convert icon-{size}.svg -o icon-{size}.png")

if __name__ == "__main__":
    generate_icons()