from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    mobile_money_providers = fields.Char(
        string="Fournisseurs Mobile Money",
        config_parameter="ifn_portal_merchant.mobile_money_providers",
        default='["Orange Money", "MTN Mobile Money", "Moov Money"]',
        help="Liste des fournisseurs Mobile Money, sous forme de texte (par exemple JSON ou liste séparée par des virgules).",
    )

    def get_values(self):
        """Charge la valeur stockée dans ir.config_parameter."""
        res = super().get_values()
        icp = self.env["ir.config_parameter"].sudo()
        providers = icp.get_param(
            "ifn_portal_merchant.mobile_money_providers",
            default='["Orange Money", "MTN Mobile Money", "Moov Money"]',
        )
        res.update(
            mobile_money_providers=providers,
        )
        return res

    def set_values(self):
        """Sauvegarde la valeur dans ir.config_parameter."""
        super().set_values()
        icp = self.env["ir.config_parameter"].sudo()
        for record in self:
            icp.set_param(
                "ifn_portal_merchant.mobile_money_providers",
                record.mobile_money_providers or "",
            )
