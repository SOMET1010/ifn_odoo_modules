/* =============================================================================
   IFN Portal Common - Initialisation Script
   ============================================================================= */

/**
 * Script d'initialisation pour IFN Portal
 * Évite les problèmes de dépendances en initialisant le SDK après le chargement complet
 */
(function() {
    'use strict';

    function initializeIFN() {
        console.log('[IFN Init] Initialisation du portail IFN...');

        // Vérifier si le SDK est disponible
        if (typeof window.IFN !== 'undefined') {
            console.log('[IFN Init] SDK disponible, initialisation...');

            // Initialiser le SDK avec la configuration par défaut
            window.IFN.init({
                apiBaseUrl: '/ifn/api',
                toastDuration: 4000,
                enableAnalytics: true,
                enableVoice: false
            });

            // Initialiser les autres composants IFN
            initializeIFNComponents();

            // Exposer les fonctions globales
            exposeGlobalFunctions();

            // Tracker la visite de page
            if (window.IFN.track) {
                window.IFN.track('page_view', {
                    page: window.location.pathname,
                    title: document.title,
                    timestamp: new Date().toISOString()
                });
            }

            console.log('[IFN Init] Initialisation terminée avec succès');
        } else {
            console.warn('[IFN Init] SDK non disponible, tentative dans 1 seconde...');
            setTimeout(initializeIFN, 1000);
        }
    }

    function initializeIFNComponents() {
        // Initialiser les composants IFN si disponibles
        try {
            // PWA
            if (window.IFN_PWA && typeof window.IFN_PWA.init === 'function') {
                window.IFN_PWA.init();
                console.log('[IFN Init] PWA initialisé');
            }

            // Accessibility
            if (window.IFN_Accessibility && typeof window.IFN_Accessibility.init === 'function') {
                window.IFN_Accessibility.init();
                console.log('[IFN Init] Accessibilité initialisée');
            }

            // Language Selector
            if (window.IFN_LanguageSelector && typeof window.IFN_LanguageSelector.init === 'function') {
                window.IFN_LanguageSelector.init();
                console.log('[IFN Init] Sélecteur de langue initialisé');
            }

            // Notifications
            if (window.IFN_Notifications && typeof window.IFN_Notifications.init === 'function') {
                window.IFN_Notifications.init();
                console.log('[IFN Init] Notifications initialisées');
            }

        } catch (error) {
            console.error('[IFN Init] Erreur lors de l\'initialisation des composants:', error);
        }
    }

    function exposeGlobalFunctions() {
        // Exposer des fonctions globales pour compatibilité
        if (window.IFN) {
            window.showToast = function(message, type, title) {
                if (window.IFN.showToast) {
                    window.IFN.showToast(message, type, title);
                }
            };

            window.trackEvent = function(event, payload) {
                if (window.IFN.track) {
                    window.IFN.track(event, payload);
                }
            };

            window.updatePreferences = function(preferences) {
                if (window.IFN.updatePreferences) {
                    return window.IFN.updatePreferences(preferences);
                }
                return Promise.resolve();
            };

            window.speakText = function(text, options) {
                if (window.IFN.speak) {
                    window.IFN.speak(text, options);
                }
            };
        }
    }

    function setupEventListeners() {
        // Écouteurs d'événements globaux
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[IFN Init] DOM chargé');
        });

        window.addEventListener('load', function() {
            console.log('[IFN Init] Page entièrement chargée');
            // Démarrer l'initialisation après le chargement complet
            setTimeout(initializeIFN, 500);
        });

        // Gestion des erreurs JavaScript
        window.addEventListener('error', function(event) {
            console.error('[IFN Init] Erreur JavaScript:', event.error);
            if (window.IFN && window.IFN.track) {
                window.IFN.track('javascript_error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error ? event.error.stack : null
                });
            }
        });

        // Gestion des promesses rejetées
        window.addEventListener('unhandledrejection', function(event) {
            console.error('[IFN Init] Promesse rejetée non gérée:', event.reason);
            if (window.IFN && window.IFN.track) {
                window.IFN.track('unhandled_promise_rejection', {
                    reason: event.reason ? event.reason.toString() : 'Unknown'
                });
            }
        });
    }

    // Fonction de diagnostic pour le débogage
    function runDiagnostics() {
        console.log('[IFN Init] === Diagnostic IFN ===');
        console.log('[IFN Init] Navigateur:', navigator.userAgent);
        console.log('[IFN Init] Langue:', navigator.language);
        console.log('[IFN Init] Online:', navigator.onLine);
        console.log('[IFN Init] Support Service Worker:', 'serviceWorker' in navigator);
        console.log('[IFN Init] Support IndexedDB:', 'indexedDB' in window);
        console.log('[IFN Init] Support Speech Synthesis:', 'speechSynthesis' in window);
        console.log('[IFN Init] URL actuelle:', window.location.href);

        // Vérifier les dépendances
        console.log('[IFN Init] jQuery disponible:', typeof $ !== 'undefined');
        console.log('[IFN Init] Odoo core disponible:', typeof odoo !== 'undefined');
        console.log('[IFN Init] SDK IFN disponible:', typeof window.IFN !== 'undefined');
        console.log('[IFN Init] PWA disponible:', typeof window.IFN_PWA !== 'undefined');

        console.log('[IFN Init] =========================');
    }

    // Démarrer le processus
    console.log('[IFN Init] Démarrage du script d\'initialisation IFN');

    // Configurer les écouteurs d'événements
    setupEventListeners();

    // Exposer la fonction de diagnostic
    window.IFN_Diagnostic = runDiagnostics;

    // Lancer le diagnostic après 2 secondes
    setTimeout(runDiagnostics, 2000);

})();