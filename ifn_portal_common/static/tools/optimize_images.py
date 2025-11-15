#!/usr/bin/env python3
"""
IFN Portal - Optimisation des Images
Convertit les images en formats modernes (WebP, AVIF) avec responsive
"""

import os
import sys
from pathlib import Path
import json
from PIL import Image, ImageOps
import argparse
from typing import List, Dict, Tuple

class ImageOptimizer:
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Tailles responsives
        self.sizes = [400, 800, 1200, 1600, 2000]
        
        # Formats de sortie
        self.formats = ['webp', 'avif', 'jpeg']
        
        # Configuration qualité
        self.quality = {
            'webp': 85,
            'avif': 80,
            'jpeg': 85
        }
        
        # Métadonnées
        self.metadata = {
            'version': '2.0.0',
            'optimized_formats': self.formats,
            'sizes': self.sizes,
            'conversion_date': None
        }

    def optimize_directory(self, recursive: bool = True) -> Dict:
        """Optimise toutes les images d'un répertoire"""
        print(f"🔄 Optimisation du répertoire: {self.input_dir}")
        
        # Patterns de fichiers image
        image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'}
        
        if recursive:
            image_files = []
            for ext in image_extensions:
                image_files.extend(self.input_dir.rglob(f'*{ext}'))
        else:
            image_files = []
            for ext in image_extensions:
                image_files.extend(self.input_dir.glob(f'*{ext}'))
        
        if not image_files:
            print("⚠️ Aucune image trouvée")
            return {'total': 0, 'processed': 0, 'errors': 0}
        
        results = {
            'total': len(image_files),
            'processed': 0,
            'errors': 0,
            'original_size': 0,
            'optimized_size': 0,
            'savings': 0,
            'files': []
        }
        
        for image_file in image_files:
            try:
                result = self.optimize_image(image_file)
                if result:
                    results['files'].append(result)
                    results['processed'] += 1
                print(f"✅ Optimisé: {image_file.name}")
            except Exception as e:
                print(f"❌ Erreur {image_file.name}: {e}")
                results['errors'] += 1
        
        # Calcul des statistiques finales
        results['optimization_percentage'] = (
            (results['original_size'] - results['optimized_size']) / 
            results['original_size'] * 100 if results['original_size'] > 0 else 0
        )
        
        # Sauvegarde du rapport
        self.save_report(results)
        
        print(f"📊 Optimisation terminée:")
        print(f"   - Images traitées: {results['processed']}")
        print(f"   - Taille originale: {self.format_size(results['original_size'])}")
        print(f"   - Taille optimisée: {self.format_size(results['optimized_size'])}")
        print(f"   - Économies: {results['optimization_percentage']:.1f}%")
        
        return results

    def optimize_image(self, image_path: Path) -> Dict:
        """Optimise une image individuelle"""
        try:
            # Chargement de l'image
            with Image.open(image_path) as img:
                # Conversion en RGB si nécessaire
                if img.mode in ('RGBA', 'LA'):
                    img = img.convert('RGB')
                
                # Orientation automatique
                img = ImageOps.exif_transpose(img)
                
                original_size = os.path.getsize(image_path)
                
                # Création du nom de base sans extension
                base_name = image_path.stem
                rel_path = image_path.relative_to(self.input_dir)
                output_subdir = self.output_dir / rel_path.parent
                output_subdir.mkdir(parents=True, exist_ok=True)
                
                file_result = {
                    'original': str(rel_path),
                    'sizes': {},
                    'original_size': original_size,
                    'optimized_size': 0
                }
                
                total_optimized_size = 0
                
                # Génération des différentes tailles et formats
                for size in self.sizes:
                    if img.width <= size:
                        continue  # Skip si l'image est plus petite
                    
                    # Redimensionnement
                    resized_img = self.resize_image(img, size)
                    
                    # Sauvegarde dans chaque format
                    for format_name in self.formats:
                        output_filename = f"{base_name}-{size}w.{format_name}"
                        output_path = output_subdir / output_filename
                        
                        # Configuration qualité et optimisation
                        quality = self.quality[format_name]
                        
                        save_kwargs = {
                            'quality': quality,
                            'optimize': True
                        }
                        
                        # Paramètres spécifiques par format
                        if format_name == 'webp':
                            save_kwargs.update({
                                'method': 6,  # Meilleure compression
                                'preset': 'photo'
                            })
                        elif format_name == 'avif':
                            save_kwargs.update({
                                'quality': quality,
                                'method': 6
                            })
                        elif format_name == 'jpeg':
                            save_kwargs.update({
                                'optimize': True,
                                'progressive': True,
                                'subsampling': 1  # 4:2:0
                            })
                        
                        # Sauvegarde
                        resized_img.save(output_path, format_name.upper(), **save_kwargs)
                        
                        optimized_size = os.path.getsize(output_path)
                        total_optimized_size += optimized_size
                        
                        file_result['sizes'][f"{size}w_{format_name}"] = {
                            'path': str(output_path.relative_to(self.output_dir)),
                            'size': optimized_size,
                            'width': resized_img.width,
                            'height': resized_img.height
                        }
                
                # Image originale optimisée (taille originale)
                if img.width > max(self.sizes):
                    for format_name in self.formats:
                        output_filename = f"{base_name}.{format_name}"
                        output_path = output_subdir / output_filename
                        
                        quality = self.quality[format_name]
                        save_kwargs = {'quality': quality, 'optimize': True}
                        
                        if format_name == 'webp':
                            save_kwargs.update({'method': 6, 'preset': 'photo'})
                        elif format_name == 'avif':
                            save_kwargs.update({'quality': quality, 'method': 6})
                        
                        img.save(output_path, format_name.upper(), **save_kwargs)
                        
                        optimized_size = os.path.getsize(output_path)
                        total_optimized_size += optimized_size
                        
                        file_result['sizes'][f"original_{format_name}"] = {
                            'path': str(output_path.relative_to(self.output_dir)),
                            'size': optimized_size,
                            'width': img.width,
                            'height': img.height
                        }
                
                file_result['optimized_size'] = total_optimized_size
                file_result['savings'] = original_size - total_optimized_size
                
                results['original_size'] += original_size
                results['optimized_size'] += total_optimized_size
                
                return file_result
                
        except Exception as e:
            print(f"❌ Erreur lors de l'optimisation de {image_path}: {e}")
            return None

    def resize_image(self, img: Image.Image, target_width: int) -> Image.Image:
        """Redimensionne une image en conservant les proportions"""
        ratio = target_width / img.width
        target_height = int(img.height * ratio)
        
        # Redimensionnement haute qualité
        return img.resize((target_width, target_height), Image.Resampling.LANCZOS)

    def create_responsive_image_tag(self, image_data: Dict) -> str:
        """Génère la balise <img> responsive optimisée"""
        base_name = Path(image_data['original']).stem
        sizes_info = image_data['sizes']
        
        # Génération du srcset
        webp_sources = []
        jpeg_sources = []
        
        for key, info in sizes_info.items():
            if '_w_' in key and info['size'] > 0:
                url = f"/optimized/{info['path']}"
                width = key.split('_')[0].replace('w', '')
                
                if 'webp' in key:
                    webp_sources.append(f"{url} {width}w")
                elif 'jpeg' in key:
                    jpeg_sources.append(f"{url} {width}w")
        
        # Choix de l'image par défaut (WebP si disponible, sinon JPEG)
        default_src = None
        if webp_sources:
            default_src = f"/optimized/{sizes_info[f'{max([int(s.split("w")[0]) for s in webp_sources])}w_webp']['path']}"
        elif jpeg_sources:
            default_src = f"/optimized/{sizes_info[f'{max([int(s.split("w")[0]) for s in jpeg_sources])}w_jpeg']['path']}"
        
        if not default_src:
            return ""
        
        # Génération de la balise
        srcset_attr = ', '.join(webp_sources + jpeg_sources)
        
        alt_text = f"Image {base_name.replace('_', ' ')}"
        
        img_tag = f'''<img 
    src="{default_src}" 
    srcset="{srcset_attr}"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
    alt="{alt_text}"
    loading="lazy"
    decoding="async">'''
        
        return img_tag

    def generate_image_config(self) -> Dict:
        """Génère la configuration des images pour l'application"""
        config = {
            'version': self.metadata['version'],
            'formats': self.formats,
            'sizes': self.sizes,
            'fallback': 'jpeg',
            'lazy_loading': True,
            'preload': [
                '/optimized/images/logo-800w.webp',
                '/optimized/images/hero-1200w.webp'
            ]
        }
        
        config_path = self.output_dir / 'image-config.json'
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        return config

    def create_html_template(self) -> str:
        """Crée un template HTML pour utiliser les images optimisées"""
        template = '''
<!-- Template pour images optimisées -->
<picture>
    <source srcset="/optimized/images/{basename}-{size}w.avif" type="image/avif" sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw">
    <source srcset="/optimized/images/{basename}-{size}w.webp" type="image/webp" sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw">
    <img src="/optimized/images/{basename}-{size}w.jpeg" 
         alt="{alt}" 
         loading="lazy" 
         decoding="async"
         width="{width}" 
         height="{height}">
</picture>

<!-- Utilisation simple (fallback automatique) -->
<img src="/optimized/images/{basename}-{size}w.webp" 
     alt="{alt}"
     loading="lazy" 
     decoding="async"
     onerror="this.src='/optimized/images/{basename}-{size}w.jpeg'">

<!-- Responsive avec srcset -->
<img src="/optimized/images/{basename}-800w.webp"
     srcset="/optimized/images/{basename}-400w.webp 400w,
             /optimized/images/{basename}-800w.webp 800w,
             /optimized/images/{basename}-1200w.webp 1200w,
             /optimized/images/{basename}-1600w.webp 1600w"
     sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
     alt="{alt}"
     loading="lazy"
     decoding="async">
'''
        return template

    def save_report(self, results: Dict):
        """Sauvegarde un rapport détaillé"""
        self.metadata['conversion_date'] = str(Path(__file__).stat().st_mtime)
        
        report = {
            'metadata': self.metadata,
            'results': results,
            'config': self.generate_image_config(),
            'html_template': self.create_html_template()
        }
        
        report_path = self.output_dir / 'optimization-report.json'
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Rapport sauvegardé: {report_path}")

    def format_size(self, size_bytes: int) -> str:
        """Formate la taille en format lisible"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"

    def generate_htaccess_rules(self) -> str:
        """Génère les règles .htaccess pour optimiser la compression"""
        rules = '''
# Optimisation des images
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Redirection WebP si supporté
    RewriteCond %{HTTP_ACCEPT} image/webp
    RewriteCond %{DOCUMENT_ROOT}/$1.webp -f
    RewriteRule (.+)\.(jpe?g|png)$ $1.webp [T=image/webp,E=accept:1]
    
    # Redirection AVIF si supporté  
    RewriteCond %{HTTP_ACCEPT} image/avif
    RewriteCond %{DOCUMENT_ROOT}/$1.avif -f
    RewriteRule (.+)\.(jpe?g|png|webp)$ $1.avif [T=image/avif,E=accept:1]
</IfModule>

# Headers de cache pour images optimisées
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/avif "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>

# Compression Gzip
<IfModule mod_deflate.c>
    AddType image/webp .webp
    AddType image/avif .avif
</IfModule>
'''
        return rules

def main():
    parser = argparse.ArgumentParser(description='Optimiseur d\'images IFN Portal')
    parser.add_argument('input_dir', help='Répertoire d\'entrée des images')
    parser.add_argument('output_dir', help='Répertoire de sortie des images optimisées')
    parser.add_argument('--sizes', nargs='+', type=int, 
                       default=[400, 800, 1200, 1600, 2000],
                       help='Tailles à générer (pixels)')
    parser.add_argument('--formats', nargs='+', 
                       default=['webp', 'avif', 'jpeg'],
                       help='Formats à générer')
    parser.add_argument('--no-recursive', action='store_true',
                       help='Ne pas traiter récursivement')
    
    args = parser.parse_args()
    
    # Initialisation de l'optimiseur
    optimizer = ImageOptimizer(args.input_dir, args.output_dir)
    optimizer.sizes = args.sizes
    optimizer.formats = args.formats
    
    # Optimisation
    results = optimizer.optimize_directory(recursive=not args.no_recursive)
    
    # Génération des fichiers supplémentaires
    htaccess_path = Path(args.output_dir) / '.htaccess'
    with open(htaccess_path, 'w') as f:
        f.write(optimizer.generate_htaccess_rules())
    
    template_path = Path(args.output_dir) / 'html-template.html'
    with open(template_path, 'w') as f:
        f.write(optimizer.create_html_template())
    
    print(f"\n🎉 Optimisation terminée!")
    print(f"📁 Images optimisées dans: {args.output_dir}")
    print(f"📄 Rapport: {args.output_dir}/optimization-report.json")

if __name__ == '__main__':
    main()