/**
 * IFN Portal - Interactions Page d'Accueil
 * Gestion des animations, compteurs et tabs
 */

$(document).ready(function() {
    // Initialiser les fonctionnalités de la page d'accueil
    initHomepage();
});

function initHomepage() {
    // Compteurs animés
    initCounters();

    // Tabs solutions
    initSolutionTabs();

    // Animations au scroll
    initScrollAnimations();

    // Smooth scroll pour les ancres
    initSmoothScroll();

    // Animations hero
    initHeroAnimations();
}

// Compteurs animés
function initCounters() {
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-counter'));
                animateCounter(counter, target);
                counterObserver.unobserve(counter);
            }
        });
    }, observerOptions);

    // Observer tous les compteurs
    document.querySelectorAll('[data-counter]').forEach(counter => {
        counterObserver.observe(counter);
    });
}

function animateCounter(element, target) {
    const duration = 2000; // 2 secondes
    const step = target / (duration / 16); // 60 FPS
    let current = 0;

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }

        // Formatage selon le type de nombre
        if (target >= 100000) {
            element.textContent = (current / 1000).toFixed(0) + 'K+';
        } else if (target >= 1000) {
            element.textContent = (current / 1000).toFixed(1) + 'K';
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Tabs solutions
function initSolutionTabs() {
    $('.ifn-solution-tab').click(function() {
        const solution = $(this).data('solution');

        // Mettre à jour le tab actif
        $('.ifn-solution-tab').removeClass('active');
        $(this).addClass('active');

        // Afficher le contenu correspondant
        $('.ifn-solution-content').removeClass('active');
        $(`#solution-${solution}`).addClass('active');
    });
}

// Animations au scroll
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                $(entry.target).addClass('visible');
            }
        });
    }, observerOptions);

    // Observer les éléments à animer
    $('.ifn-feature-card, .ifn-stat-card, .ifn-testimonial-card').each(function() {
        animationObserver.observe(this);
    });
}

// Smooth scroll pour les ancres
function initSmoothScroll() {
    $('a[href^="#"]').click(function(e) {
        const target = $(this.getAttribute('href'));
        if (target.length) {
            e.preventDefault();
            $('html, body').animate({
                scrollTop: target.offset().top - 80
            }, 800);
        }
    });
}

// Animations hero
function initHeroAnimations() {
    // Animation d'entrée du contenu hero
    setTimeout(() => {
        $('.ifn-hero-badge').addClass('slide-up');
    }, 200);

    setTimeout(() => {
        $('.ifn-hero-title').addClass('slide-up');
    }, 400);

    setTimeout(() => {
        $('.ifn-hero-subtitle').addClass('slide-up');
    }, 600);

    setTimeout(() => {
        $('.ifn-hero-buttons').addClass('slide-up');
    }, 800);

    setTimeout(() => {
        $('.ifn-hero-illustration').addClass('slide-up');
    }, 1000);

    // Animation des stats hero
    setTimeout(() => {
        $('.ifn-hero-stat').each(function(index) {
            setTimeout(() => {
                $(this).addClass('slide-up');
            }, index * 100);
        });
    }, 1200);
}

// Animation de particules en arrière-plan (optionnel)
function initHeroParticles() {
    const heroSection = $('.ifn-hero');
    if (heroSection.length === 0) return;

    for (let i = 0; i < 5; i++) {
        const particle = $('<div class="ifn-particle"></div>');
        particle.css({
            position: 'absolute',
            width: Math.random() * 4 + 2 + 'px',
            height: particle.width(),
            background: 'rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            animation: `float ${Math.random() * 3 + 2}s ease-in-out infinite`
        });
        heroSection.append(particle);
    }
}

// Gestion du header sticky
function initStickyHeader() {
    let lastScroll = 0;
    const header = $('.ifn-header');

    $(window).scroll(function() {
        const currentScroll = $(this).scrollTop();

        if (currentScroll > 100) {
            header.addClass('scrolled');
        } else {
            header.removeClass('scrolled');
        }

        lastScroll = currentScroll;
    });
}

// Animation CTA au survol
function initCTAAnimations() {
    $('.ifn-cta').hover(
        function() {
            $(this).find('.ifn-cta-feature').each(function(index) {
                setTimeout(() => {
                    $(this).addClass('pulse');
                }, index * 100);
            });
        },
        function() {
            $(this).find('.ifn-cta-feature').removeClass('pulse');
        }
    );
}

// Effet parallaxe sur hero
function initParallaxEffect() {
    $(window).scroll(function() {
        const scrolled = $(this).scrollTop();
        const heroContent = $('.ifn-hero-content');
        const heroIllustration = $('.ifn-hero-illustration');

        if (scrolled < window.innerHeight) {
            heroContent.css('transform', `translateY(${scrolled * 0.5}px)`);
            heroIllustration.css('transform', `translateY(${scrolled * 0.3}px)`);
        }
    });
}

// Animation d'entrée progressive pour les sections
function initSectionAnimations() {
    const sections = [
        '.ifn-features',
        '.ifn-solutions',
        '.ifn-statistics',
        '.ifn-testimonials',
        '.ifn-cta'
    ];

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                $(entry.target).addClass('section-visible');
            }
        });
    }, { threshold: 0.1 });

    sections.forEach(selector => {
        $(selector).each(function() {
            sectionObserver.observe(this);
        });
    });
}

// Gestion des tooltips pour les features
function initTooltips() {
    $('.ifn-feature-link[title]').each(function() {
        $(this).tooltip({
            placement: 'top',
            trigger: 'hover',
            delay: { show: 300, hide: 100 }
        });
    });
}

// Effet de typing sur le titre hero
function initTypingEffect() {
    const titleElement = $('.ifn-hero-title');
    const originalText = titleElement.text();

    // Remplacer le texte par une version avec effet de typing
    titleElement.empty();

    let charIndex = 0;
    function typeChar() {
        if (charIndex < originalText.length) {
            titleElement.append(originalText[charIndex]);
            charIndex++;
            setTimeout(typeChar, 50);
        }
    }

    setTimeout(typeChar, 1000);
}

// Initialiser toutes les animations avancées
$(document).ready(function() {
    // Fonctions de base déjà initialisées dans initHomepage()

    // Fonctions avancées (optionnelles)
    initStickyHeader();
    initCTAAnimations();
    initParallaxEffect();
    initSectionAnimations();
    initTooltips();

    // Effet de typing (décommenter pour activer)
    // initTypingEffect();

    // Particles en arrière-plan (décommenter pour activer)
    // initHeroParticles();
});

// Gestion du redimensionnement
$(window).resize(function() {
    // Réinitialiser certaines animations si nécessaire
    if ($(this).width() < 768) {
        $('.ifn-hero-stats').addClass('mobile-compact');
    } else {
        $('.ifn-hero-stats').removeClass('mobile-compact');
    }
});

// Optimisation des performances
let ticking = false;
function requestTick() {
    if (!ticking) {
        requestAnimationFrame(updateAnimations);
        ticking = true;
    }
}

function updateAnimations() {
    // Mettre à jour les animations ici
    ticking = false;
}

$(window).scroll(requestTick);