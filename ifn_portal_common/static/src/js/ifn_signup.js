/**
 * IFN Portal - Formulaire d'inscription par étapes
 * Gestion du multi-step form avec validation
 */

$(document).ready(function() {
    // État du formulaire
    let currentStep = 1;
    const totalSteps = 4;
    const formData = {};

    // Initialiser le formulaire
    function initSignupForm() {
        showStep(1);
        setupEventListeners();
        setupPasswordStrength();
    }

    // Afficher une étape spécifique
    function showStep(step) {
        // Masquer toutes les étapes
        $('.ifn-form-step').removeClass('active');

        // Afficher l'étape actuelle
        $(`#step-member-type, #step-personal-info, #step-location, #step-security`)
            .eq(step - 1)
            .addClass('active');

        // Mettre à jour les boutons
        updateButtons(step);

        // Mettre à jour l'indicateur d'étapes si présent
        updateStepIndicator(step);

        currentStep = step;
    }

    // Mettre à jour les boutons de navigation
    function updateButtons(step) {
        const prevBtn = $('#prev-step');
        const nextBtn = $('#next-step');
        const submitBtn = $('#submit-form');

        // Gérer le bouton précédent
        if (step === 1) {
            prevBtn.hide();
        } else {
            prevBtn.show();
        }

        // Gérer les boutons suivant/soumettre
        if (step === totalSteps) {
            nextBtn.hide();
            submitBtn.show();
        } else {
            nextBtn.show();
            submitBtn.hide();
        }
    }

    // Mettre à jour l'indicateur d'étapes
    function updateStepIndicator(step) {
        $('.ifn-step').removeClass('active completed');

        for (let i = 1; i < step; i++) {
            $(`.ifn-step:nth-child(${i})`).addClass('completed');
        }

        $(`.ifn-step:nth-child(${step})`).addClass('active');
    }

    // Valider une étape
    function validateStep(step) {
        let isValid = true;
        let errorMessage = '';

        switch (step) {
            case 1:
                // Type de membre
                const memberType = $('input[name="member_type"]:checked').val();
                if (!memberType) {
                    errorMessage = 'Veuillez sélectionner un type de membre';
                    isValid = false;
                }
                break;

            case 2:
                // Informations personnelles
                const firstName = $('#first_name').val().trim();
                const lastName = $('#last_name').val().trim();
                const email = $('#email').val().trim();
                const phone = $('#phone').val().trim();

                if (!firstName || !lastName || !email || !phone) {
                    errorMessage = 'Veuillez remplir tous les champs obligatoires';
                    isValid = false;
                } else if (!validateEmail(email)) {
                    errorMessage = 'Veuillez entrer une adresse email valide';
                    isValid = false;
                } else if (!validatePhone(phone)) {
                    errorMessage = 'Veuillez entrer un numéro de téléphone valide (format: +225 XX XX XX XX XX)';
                    isValid = false;
                }
                break;

            case 3:
                // Localisation
                const region = $('#region').val();
                if (!region) {
                    errorMessage = 'Veuillez sélectionner une région';
                    isValid = false;
                }
                break;

            case 4:
                // Sécurité
                const password = $('#password').val();
                const confirmPassword = $('#confirm_password').val();
                const terms = $('#terms').is(':checked');

                if (!password || !confirmPassword) {
                    errorMessage = 'Veuillez remplir tous les champs de mot de passe';
                    isValid = false;
                } else if (password.length < 8) {
                    errorMessage = 'Le mot de passe doit contenir au moins 8 caractères';
                    isValid = false;
                } else if (!validatePassword(password)) {
                    errorMessage = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
                    isValid = false;
                } else if (password !== confirmPassword) {
                    errorMessage = 'Les mots de passe ne correspondent pas';
                    isValid = false;
                } else if (!terms) {
                    errorMessage = 'Veuillez accepter les conditions d\'utilisation';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            showError(errorMessage);
        }

        return isValid;
    }

    // Valider l'email
    function validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Valider le téléphone (format ivoirien)
    function validatePhone(phone) {
        // Accepte les formats: +225 XX XX XX XX XX, 225XXXXXXXXX, ou 0X XX XX XX XX
        const regex = /^(\+225|225|0)[0-9]{8,10}$/;
        return regex.test(phone.replace(/[\s-]/g, ''));
    }

    // Valider le mot de passe
    function validatePassword(password) {
        // Au moins 8 caractères, une majuscule, une minuscule et un chiffre
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return regex.test(password);
    }

    // Calculer la force du mot de passe
    function calculatePasswordStrength(password) {
        let strength = 0;

        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        return strength;
    }

    // Afficher l'indicateur de force du mot de passe
    function updatePasswordStrength(password) {
        const strength = calculatePasswordStrength(password);
        const progressBar = $('#password-strength .progress-bar');
        const strengthText = $('#strength-text');

        // Supprimer les classes existantes
        progressBar.removeClass('bg-danger bg-warning bg-success');

        if (strength <= 2) {
            progressBar.addClass('bg-danger');
            progressBar.css('width', '33%');
            strengthText.text('Faible');
            $('#password-strength').removeClass('password-strength-medium password-strength-strong')
                               .addClass('password-strength-weak');
        } else if (strength <= 4) {
            progressBar.addClass('bg-warning');
            progressBar.css('width', '66%');
            strengthText.text('Moyen');
            $('#password-strength').removeClass('password-strength-weak password-strength-strong')
                               .addClass('password-strength-medium');
        } else {
            progressBar.addClass('bg-success');
            progressBar.css('width', '100%');
            strengthText.text('Fort');
            $('#password-strength').removeClass('password-strength-weak password-strength-medium')
                               .addClass('password-strength-strong');
        }
    }

    // Afficher un message d'erreur
    function showError(message) {
        // Créer ou mettre à jour l'alerte d'erreur
        let alert = $('#ifn-form-error');
        if (alert.length === 0) {
            alert = $(`
                <div id="ifn-form-error" class="alert alert-danger alert-dismissible fade show" role="alert">
                    <strong>Erreur:</strong> <span class="error-message"></span>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `);
            $('.ifn-form').prepend(alert);
        }

        alert.find('.error-message').text(message);
        alert.show();

        // Faire défiler vers le haut
        $('.ifn-form')[0].scrollIntoView({ behavior: 'smooth' });

        // Masquer l'alerte après 5 secondes
        setTimeout(() => {
            alert.fadeOut();
        }, 5000);
    }

    // Configurer les écouteurs d'événements
    function setupEventListeners() {
        // Bouton suivant
        $('#next-step').click(function() {
            if (validateStep(currentStep)) {
                // Sauvegarder les données de l'étape actuelle
                saveStepData(currentStep);
                showStep(currentStep + 1);
            }
        });

        // Bouton précédent
        $('#prev-step').click(function() {
            showStep(currentStep - 1);
        });

        // Validation en temps réel
        $('#email').blur(function() {
            const email = $(this).val().trim();
            if (email && !validateEmail(email)) {
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });

        $('#phone').blur(function() {
            const phone = $(this).val().trim();
            if (phone && !validatePhone(phone)) {
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });

        // Soumission du formulaire
        $('#ifn-signup-form').submit(function(e) {
            // Valider toutes les étapes avant la soumission
            for (let i = 1; i <= totalSteps; i++) {
                if (!validateStep(i)) {
                    e.preventDefault();
                    showStep(i);
                    return false;
                }
            }

            // Sauvegarder les données finales
            saveStepData(totalSteps);

            // Afficher l'indicateur de chargement
            const submitBtn = $('#submit-form');
            const originalText = submitBtn.html();
            submitBtn.html('<i class="fa fa-spinner fa-spin"/> Inscription en cours...')
                      .prop('disabled', true);

            // Restaurer le bouton en cas d'erreur
            setTimeout(() => {
                submitBtn.html(originalText).prop('disabled', false);
            }, 10000);
        });

        // Navigation par clavier
        $(document).keydown(function(e) {
            if (e.key === 'Enter' && currentStep < totalSteps) {
                e.preventDefault();
                $('#next-step').click();
            }
        });
    }

    // Configurer la force du mot de passe
    function setupPasswordStrength() {
        $('#password').on('input', function() {
            const password = $(this).val();
            updatePasswordStrength(password);
        });

        $('#confirm_password').on('input', function() {
            const password = $('#password').val();
            const confirmPassword = $(this).val();

            if (confirmPassword && password !== confirmPassword) {
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });
    }

    // Sauvegarder les données d'une étape
    function saveStepData(step) {
        switch (step) {
            case 1:
                formData.member_type = $('input[name="member_type"]:checked').val();
                break;

            case 2:
                formData.first_name = $('#first_name').val().trim();
                formData.last_name = $('#last_name').val().trim();
                formData.email = $('#email').val().trim();
                formData.phone = $('#phone').val().trim();
                break;

            case 3:
                formData.region = $('#region').val();
                formData.village = $('#village').val().trim();
                break;

            case 4:
                // Les mots de passe sont gérés par le formulaire HTML
                break;
        }
    }

    // Fonction utilitaire pour formater le téléphone
    function formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');

        if (value.startsWith('225')) {
            value = '+' + value;
        } else if (value.startsWith('0')) {
            value = '+225' + value.substring(1);
        } else if (value.length > 0) {
            value = '+225' + value;
        }

        input.value = value;
    }

    // Initialiser si le formulaire existe
    if ($('#ifn-signup-form').length > 0) {
        initSignupForm();
    }
});