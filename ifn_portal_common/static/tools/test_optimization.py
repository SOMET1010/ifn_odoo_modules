#!/usr/bin/env python3
"""
IFN Portal - Tests d'Optimisation et Accessibilité
Validation complète des optimisations de performance et accessibilité
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import re
from urllib.parse import urljoin, urlparse

class PerformanceAccessibilityTester:
    def __init__(self, base_url: str = 'http://localhost:8069'):
        self.base_url = base_url.rstrip('/')
        self.results = {
            'timestamp': time.time(),
            'base_url': base_url,
            'tests': {},
            'summary': {},
            'recommendations': []
        }
        
    def run_all_tests(self) -> Dict:
        """Exécute tous les tests d'optimisation"""
        print(f"🧪 Tests d'optimisation IFN Portal")
        print(f"URL: {self.base_url}")
        print("=" * 50)
        
        # Tests de performance
        self.test_performance()
        self.test_css_optimization()
        self.test_js_optimization()
        self.test_image_optimization()
        self.test_caching()
        self.test_compression()
        
        # Tests d'accessibilité
        self.test_accessibility_structure()
        self.test_keyboard_navigation()
        self.test_color_contrast()
        self.test_aria_labels()
        self.test_screen_reader_support()
        
        # Tests réseau et optimisation
        self.test_network_optimization()
        self.test_service_worker()
        
        # Génération du rapport
        self.generate_report()
        
        return self.results
    
    def test_performance(self):
        """Test des performances de base"""
        print("⏱️ Test des performances...")
        
        try:
            # Test de temps de réponse
            start_time = time.time()
            response = requests.get(f"{self.base_url}/", timeout=30)
            load_time = (time.time() - start_time) * 1000  # ms
            
            tests = {
                'response_time_ms': round(load_time, 2),
                'status_code': response.status_code,
                'content_length': len(response.content),
                'server_header': response.headers.get('Server', 'Unknown'),
                'content_type': response.headers.get('Content-Type', 'Unknown')
            }
            
            # Analyse du contenu HTML
            html_content = response.text
            
            # Vérification CSS critique
            critical_css = bool(re.search(r'<link[^>]*critical\.css', html_content))
            tests['critical_css_loaded'] = critical_css
            
            # Vérification JS optimisé
            optimized_js = bool(re.search(r'<script[^>]*core\.min\.js', html_content))
            tests['optimized_js_loaded'] = optimized_js
            
            # Vérification Service Worker
            sw_present = bool(re.search(r'serviceWorker', html_content))
            tests['service_worker_detected'] = sw_present
            
            # Score de performance (simple estimation)
            performance_score = 100
            if load_time > 3000: performance_score -= 30
            elif load_time > 2000: performance_score -= 20
            elif load_time > 1000: performance_score -= 10
            
            if not critical_css: performance_score -= 15
            if not optimized_js: performance_score -= 15
            if not sw_present: performance_score -= 10
            
            tests['performance_score'] = max(0, performance_score)
            
            self.results['tests']['performance'] = tests
            print(f"  ✅ Temps de réponse: {load_time:.2f}ms")
            print(f"  ✅ Score performance: {performance_score}/100")
            
        except Exception as e:
            self.results['tests']['performance'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_css_optimization(self):
        """Test de l'optimisation CSS"""
        print("🎨 Test d'optimisation CSS...")
        
        try:
            response = requests.get(f"{self.base_url}/")
            html_content = response.text
            
            tests = {
                'critical_css': self.check_file_exists('critical.min.css'),
                'lazy_css': self.check_file_exists('lazy.min.css'),
                'css_critical_inline': bool(re.search(r'<style[^>]*>.*?ifn-', html_content, re.DOTALL)),
                'css_minified': False,
                'gzip_compression': False
            }
            
            # Test de compression CSS
            css_response = requests.get(f"{self.base_url}/static/dist/css/critical.min.css")
            if css_response.status_code == 200:
                tests['css_minified'] = self.is_css_minified(css_response.text)
                tests['gzip_compression'] = 'gzip' in css_response.headers.get('Content-Encoding', '')
            
            self.results['tests']['css_optimization'] = tests
            print(f"  ✅ CSS critique: {tests['critical_css']}")
            print(f"  ✅ CSS minifié: {tests['css_minified']}")
            
        except Exception as e:
            self.results['tests']['css_optimization'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_js_optimization(self):
        """Test de l'optimisation JavaScript"""
        print("⚡ Test d'optimisation JavaScript...")
        
        try:
            tests = {
                'core_js_optimized': self.check_file_exists('core.min.js'),
                'service_worker': self.check_file_exists('sw.min.js'),
                'js_minified': False,
                'es6_modules': False,
                'lazy_loading': False
            }
            
            # Test JS minifié
            js_response = requests.get(f"{self.base_url}/static/dist/js/core.min.js")
            if js_response.status_code == 200:
                tests['js_minified'] = self.is_js_minified(js_response.text)
                tests['es6_modules'] = 'import(' in js_response.text
                tests['lazy_loading'] = 'IntersectionObserver' in js_response.text
            
            self.results['tests']['js_optimization'] = tests
            print(f"  ✅ JS optimisé: {tests['core_js_optimized']}")
            print(f"  ✅ Lazy loading: {tests['lazy_loading']}")
            
        except Exception as e:
            self.results['tests']['js_optimization'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_image_optimization(self):
        """Test de l'optimisation des images"""
        print("🖼️ Test d'optimisation des images...")
        
        try:
            tests = {
                'webp_format': False,
                'avif_format': False,
                'responsive_images': False,
                'lazy_loading': False,
                'compressed_images': False
            }
            
            # Test des formats WebP et AVIF
            webp_response = requests.get(f"{self.base_url}/static/images/logo.webp")
            tests['webp_format'] = webp_response.status_code == 200
            
            avif_response = requests.get(f"{self.base_url}/static/images/logo.avif")
            tests['avif_format'] = avif_response.status_code == 200
            
            # Test lazy loading dans le HTML
            response = requests.get(f"{self.base_url}/")
            html_content = response.text
            tests['lazy_loading'] = 'loading="lazy"' in html_content
            tests['responsive_images'] = 'srcset' in html_content or 'picture' in html_content
            
            self.results['tests']['image_optimization'] = tests
            print(f"  ✅ WebP: {tests['webp_format']}")
            print(f"  ✅ AVIF: {tests['avif_format']}")
            print(f"  ✅ Lazy loading: {tests['lazy_loading']}")
            
        except Exception as e:
            self.results['tests']['image_optimization'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_caching(self):
        """Test des stratégies de cache"""
        print("💾 Test des stratégies de cache...")
        
        try:
            tests = {
                'cache_headers': False,
                'expires_headers': False,
                'etag_headers': False,
                'service_worker_cache': False
            }
            
            # Test des headers de cache
            response = requests.get(f"{self.base_url}/static/dist/css/critical.min.css")
            cache_control = response.headers.get('Cache-Control', '')
            expires = response.headers.get('Expires', '')
            etag = response.headers.get('ETag', '')
            
            tests['cache_headers'] = 'max-age' in cache_control
            tests['expires_headers'] = bool(expires)
            tests['etag_headers'] = bool(etag)
            
            self.results['tests']['caching'] = tests
            print(f"  ✅ Headers cache: {tests['cache_headers']}")
            print(f"  ✅ ETags: {tests['etag_headers']}")
            
        except Exception as e:
            self.results['tests']['caching'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_compression(self):
        """Test de la compression"""
        print("🗜️ Test de compression...")
        
        try:
            tests = {
                'gzip_compression': False,
                'brotli_compression': False,
                'css_compressed': False,
                'js_compressed': False
            }
            
            # Test compression CSS
            css_response = requests.get(f"{self.base_url}/static/dist/css/critical.min.css")
            encoding = css_response.headers.get('Content-Encoding', '')
            tests['gzip_compression'] = 'gzip' in encoding
            tests['css_compressed'] = bool(encoding)
            
            # Test compression JS
            js_response = requests.get(f"{self.base_url}/static/dist/js/core.min.js")
            encoding = js_response.headers.get('Content-Encoding', '')
            tests['js_compressed'] = 'gzip' in encoding
            
            self.results['tests']['compression'] = tests
            print(f"  ✅ Gzip: {tests['gzip_compression']}")
            print(f"  ✅ Compression JS: {tests['js_compressed']}")
            
        except Exception as e:
            self.results['tests']['compression'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_accessibility_structure(self):
        """Test de la structure d'accessibilité"""
        print("♿ Test de structure accessibility...")
        
        try:
            response = requests.get(f"{self.base_url}/")
            html_content = response.text
            
            tests = {
                'has_lang_attribute': bool(re.search(r'<html[^>]*lang=', html_content)),
                'has_title': bool(re.search(r'<title[^>]*>.*?</title>', html_content, re.DOTALL)),
                'has_meta_description': bool(re.search(r'<meta[^>]*name=["\']description["\'][^>]*>', html_content)),
                'has_skip_links': 'skip-link' in html_content or 'skip-nav' in html_content,
                'semantic_headings': False,
                'alt_attributes': False
            }
            
            # Vérification hiérarchie des titres
            h1_count = len(re.findall(r'<h1[^>]*>', html_content))
            tests['semantic_headings'] = h1_count == 1
            
            # Vérification attributs alt
            img_count = len(re.findall(r'<img[^>]*>', html_content))
            img_with_alt = len(re.findall(r'<img[^>]*alt=', html_content))
            tests['alt_attributes'] = img_count == 0 or img_with_alt / img_count > 0.8
            
            self.results['tests']['accessibility_structure'] = tests
            print(f"  ✅ Lang attribute: {tests['has_lang_attribute']}")
            print(f"  ✅ Skip links: {tests['has_skip_links']}")
            print(f"  ✅ Alt attributes: {tests['alt_attributes']:.1%}")
            
        except Exception as e:
            self.results['tests']['accessibility_structure'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_keyboard_navigation(self):
        """Test de la navigation clavier"""
        print("⌨️ Test navigation clavier...")
        
        try:
            response = requests.get(f"{self.base_url}/")
            html_content = response.text
            
            tests = {
                'focusable_elements': False,
                'tabindex_used': False,
                'aria_roles': False,
                'keyboard_shortcuts': False
            }
            
            # Vérification des éléments focusables
            focusable_pattern = r'<button|<a[^>]*href|<input|<select|<textarea'
            focusable_count = len(re.findall(focusable_pattern, html_content, re.IGNORECASE))
            tests['focusable_elements'] = focusable_count > 0
            
            # Vérification tabindex
            tests['tabindex_used'] = 'tabindex=' in html_content
            
            # Vérification ARIA roles
            aria_role_count = len(re.findall(r'role=', html_content))
            tests['aria_roles'] = aria_role_count > 0
            
            self.results['tests']['keyboard_navigation'] = tests
            print(f"  ✅ Éléments focusables: {focusable_count}")
            print(f"  ✅ ARIA roles: {aria_role_count}")
            
        except Exception as e:
            self.results['tests']['keyboard_navigation'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_color_contrast(self):
        """Test approximatif des contrastes de couleur"""
        print("🎨 Test contrastes couleur...")
        
        try:
            response = requests.get(f"{self.base_url}/")
            html_content = response.text
            
            tests = {
                'css_contrast_vars': False,
                'high_contrast_support': False,
                'prefers_reduced_motion': False
            }
            
            # Vérification variables CSS de contraste
            tests['css_contrast_vars'] = '--ifn-orange' in html_content
            
            # Vérification support contraste élevé
            tests['high_contrast_support'] = 'prefers-contrast' in html_content
            
            # Vérification support mouvement réduit
            tests['prefers_reduced_motion'] = 'prefers-reduced-motion' in html_content
            
            self.results['tests']['color_contrast'] = tests
            print(f"  ✅ Variables contraste: {tests['css_contrast_vars']}")
            print(f"  ✅ Contraste élevé: {tests['high_contrast_support']}")
            
        except Exception as e:
            self.results['tests']['color_contrast'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_aria_labels(self):
        """Test des attributs ARIA"""
        print("🏷️ Test attributs ARIA...")
        
        try:
            response = requests.get(f"{self.base_url}/")
            html_content = response.text
            
            tests = {
                'aria_label_present': 'aria-label=' in html_content,
                'aria_labelledby_present': 'aria-labelledby=' in html_content,
                'aria_describedby_present': 'aria-describedby=' in html_content,
                'aria_role_present': 'role=' in html_content,
                'aria_live_present': 'aria-live=' in html_content,
                'aria_expanded_present': 'aria-expanded=' in html_content
            }
            
            # Comptage des usages
            for test_key, test_value in tests.items():
                if test_value:
                    pattern = test_key.replace('_present', '').replace('_', '-')
                    count = len(re.findall(f'{pattern}=', html_content))
                    print(f"    - {pattern}: {count} usages")
            
            self.results['tests']['aria_labels'] = tests
            print(f"  ✅ Total types ARIA: {sum(tests.values())}")
            
        except Exception as e:
            self.results['tests']['aria_labels'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_screen_reader_support(self):
        """Test du support lecteurs d'écran"""
        print("🔊 Test support lecteurs d'écran...")
        
        try:
            response = requests.get(f"{self.base_url}/")
            html_content = response.text
            
            tests = {
                'sr_only_class': 'sr-only' in html_content,
                'aria_live_regions': 'aria-live=' in html_content,
                'screen_reader_optimized': False,
                'heading_structure': False
            }
            
            # Vérification structure des titres
            h1_tags = len(re.findall(r'<h1[^>]*>', html_content))
            h2_tags = len(re.findall(r'<h2[^>]*>', html_content))
            h3_tags = len(re.findall(r'<h3[^>]*>', html_content))
            tests['heading_structure'] = h1_tags >= 1 and (h2_tags + h3_tags) >= 2
            
            # Vérification optimisation globale
            tests['screen_reader_optimized'] = sum([
                tests['sr_only_class'],
                tests['aria_live_regions'],
                tests['heading_structure']
            ]) >= 2
            
            self.results['tests']['screen_reader_support'] = tests
            print(f"  ✅ Classes sr-only: {tests['sr_only_class']}")
            print(f"  ✅ Régions live: {tests['aria_live_regions']}")
            
        except Exception as e:
            self.results['tests']['screen_reader_support'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_network_optimization(self):
        """Test des optimisations réseau"""
        print("🌐 Test optimisations réseau...")
        
        try:
            response = requests.get(f"{self.base_url}/")
            
            tests = {
                'dns_prefetch': False,
                'preconnect': False,
                'preload': False,
                'resource_hints': False
            }
            
            html_content = response.text
            
            # Vérification hints de ressources
            tests['dns_prefetch'] = 'dns-prefetch' in html_content
            tests['preconnect'] = 'preconnect' in html_content
            tests['preload'] = 'preload' in html_content
            tests['resource_hints'] = sum(tests.values()) > 0
            
            self.results['tests']['network_optimization'] = tests
            print(f"  ✅ Resource hints: {tests['resource_hints']}")
            
        except Exception as e:
            self.results['tests']['network_optimization'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    def test_service_worker(self):
        """Test du Service Worker"""
        print("🔧 Test Service Worker...")
        
        try:
            sw_response = requests.get(f"{self.base_url}/static/dist/js/sw.min.js")
            
            tests = {
                'sw_exists': sw_response.status_code == 200,
                'sw_caching': 'cache' in sw_response.text.lower(),
                'sw_network_first': 'network' in sw_response.text.lower(),
                'sw_offline': 'offline' in sw_response.text.lower()
            }
            
            self.results['tests']['service_worker'] = tests
            print(f"  ✅ SW existe: {tests['sw_exists']}")
            print(f"  ✅ Cache strategy: {tests['sw_caching']}")
            
        except Exception as e:
            self.results['tests']['service_worker'] = {'error': str(e)}
            print(f"  ❌ Erreur: {e}")
    
    # Méthodes utilitaires
    
    def check_file_exists(self, filename: str) -> bool:
        """Vérifie si un fichier existe sur le serveur"""
        try:
            response = requests.get(f"{self.base_url}/static/dist/{filename}", timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def is_css_minified(self, css_content: str) -> bool:
        """Test simple de minification CSS"""
        # Critères: peu d'espaces, pas de commentaires longs
        lines = css_content.split('\n')
        avg_line_length = sum(len(line) for line in lines) / len(lines)
        return avg_line_length < 100 and '/*' not in css_content
    
    def is_js_minified(self, js_content: str) -> bool:
        """Test simple de minification JS"""
        # Critères: pas de commentaires //, peu d'espaces
        lines = js_content.split('\n')
        comments = sum(1 for line in lines if line.strip().startswith('//'))
        total_lines = len(lines)
        return comments / total_lines < 0.1 if total_lines > 0 else True
    
    def generate_report(self):
        """Génère le rapport final"""
        print("\n" + "=" * 50)
        print("📊 RAPPORT FINAL")
        print("=" * 50)
        
        # Calcul des scores
        scores = {}
        
        # Score performance
        perf_test = self.results['tests'].get('performance', {})
        scores['performance'] = perf_test.get('performance_score', 0)
        
        # Score accessibilité
        a11y_tests = ['accessibility_structure', 'keyboard_navigation', 
                     'color_contrast', 'aria_labels', 'screen_reader_support']
        a11y_score = 0
        a11y_total = len(a11y_tests)
        
        for test_name in a11y_tests:
            test = self.results['tests'].get(test_name, {})
            if test and 'error' not in test:
                # Score simple basé sur les tests réussis
                passed_tests = sum(1 for v in test.values() if v is True)
                total_tests = len([k for k, v in test.items() if k != 'error'])
                if total_tests > 0:
                    a11y_score += (passed_tests / total_tests) * 100
        
        scores['accessibility'] = a11y_score / a11y_total if a11y_total > 0 else 0
        
        # Score optimisation
        opt_tests = ['css_optimization', 'js_optimization', 'image_optimization', 
                    'caching', 'compression']
        opt_score = 0
        opt_total = len(opt_tests)
        
        for test_name in opt_tests:
            test = self.results['tests'].get(test_name, {})
            if test and 'error' not in test:
                passed_tests = sum(1 for v in test.values() if v is True)
                total_tests = len([k for k, v in test.items() if k != 'error'])
                if total_tests > 0:
                    opt_score += (passed_tests / total_tests) * 100
        
        scores['optimization'] = opt_score / opt_total if opt_total > 0 else 0
        
        # Affichage des résultats
        print(f"\n🎯 SCORES:")
        print(f"Performance:     {scores['performance']:.1f}/100")
        print(f"Accessibilité:   {scores['accessibility']:.1f}/100")
        print(f"Optimisation:    {scores['optimization']:.1f}/100")
        
        overall_score = sum(scores.values()) / len(scores)
        print(f"Score global:    {overall_score:.1f}/100")
        
        # Détermination du niveau
        if overall_score >= 90:
            level = "🟢 EXCELLENT"
        elif overall_score >= 80:
            level = "🟡 TRÈS BON"
        elif overall_score >= 70:
            level = "🟠 BON"
        else:
            level = "🔴 À AMÉLIORER"
        
        print(f"Niveau global:   {level}")
        
        # Sauvegarde du rapport
        self.results['summary'] = {
            'overall_score': overall_score,
            'scores': scores,
            'level': level
        }
        
        # Recommandations
        self.generate_recommendations()
        
        # Affichage des recommandations
        if self.results['recommendations']:
            print(f"\n💡 RECOMMANDATIONS:")
            for rec in self.results['recommendations']:
                print(f"  - {rec}")
        
        # Sauvegarde JSON
        report_file = Path('optimization-test-report.json')
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Rapport détaillé sauvegardé: {report_file}")
    
    def generate_recommendations(self):
        """Génère des recommandations d'amélioration"""
        recommendations = []
        
        # Analyse des résultats pour recommandations
        tests = self.results['tests']
        
        # Performance
        perf_test = tests.get('performance', {})
        if perf_test.get('response_time_ms', 0) > 2000:
            recommendations.append("Optimiser le temps de réponse du serveur")
        
        # CSS
        css_test = tests.get('css_optimization', {})
        if not css_test.get('critical_css'):
            recommendations.append("Implémenter le CSS critique")
        
        # JavaScript
        js_test = tests.get('js_optimization', {})
        if not js_test.get('core_js_optimized'):
            recommendations.append("Optimiser et minifier le JavaScript")
        
        # Images
        img_test = tests.get('image_optimization', {})
        if not img_test.get('webp_format'):
            recommendations.append("Convertir les images au format WebP")
        
        # Accessibilité
        a11y_test = tests.get('accessibility_structure', {})
        if not a11y_test.get('has_lang_attribute'):
            recommendations.append("Ajouter l'attribut lang sur la balise html")
        
        if not a11y_test.get('has_skip_links'):
            recommendations.append("Implémenter les liens de navigation rapide")
        
        self.results['recommendations'] = recommendations

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Tests d\'optimisation IFN Portal')
    parser.add_argument('--url', default='http://localhost:8069',
                       help='URL de base du site à tester')
    parser.add_argument('--output', default='optimization-test-report.json',
                       help='Fichier de sortie du rapport')
    
    args = parser.parse_args()
    
    tester = PerformanceAccessibilityTester(args.url)
    results = tester.run_all_tests()
    
    # Affichage du rapport final
    print(f"\n✅ Tests terminés!")
    print(f"Rapport disponible dans: {args.output}")

if __name__ == '__main__':
    main()