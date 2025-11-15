# -*- coding: utf-8 -*-

from . import models
from . import controllers

def post_init_hook(env):
    """Hook d'initialisation après installation"""
    # Créer les préférences par défaut si nécessaire
    pass

def uninstall_hook(env):
    """Hook de désinstallation"""
    # Nettoyer les données du module
    pass