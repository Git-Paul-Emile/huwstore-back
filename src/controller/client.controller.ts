import { StatusCodes } from "http-status-codes";
import { clientService } from "../services/client.service.js";
import { controllerWrapper } from "../utils/controllerWrapper.js";
import { jsonResponse } from "../utils/jsonResponse.js";
import { toCsv } from "../services/csv.service.js";

export const clientController = {
  list: controllerWrapper(async (_req, res) => {
    const clients = await clientService.list();
    jsonResponse(res, StatusCodes.OK, "success", "Clients récupérés.", clients);
  }),

  /**
   * Export du fichier clients. Il remplace le carnet de contacts du telephone :
   * il contient donc les coordonnees, mais rien d'autre - ni mot de passe, ni
   * identifiant technique exploitable ailleurs.
   */
  exportCsv: controllerWrapper(async (_req, res) => {
    const clients = await clientService.list();

    const csv = toCsv(clients, [
      { header: "Nom", value: (c) => c.name },
      { header: "Téléphone", value: (c) => c.phone },
      { header: "E-mail", value: (c) => c.email ?? "" },
      { header: "Ville", value: (c) => c.city ?? "" },
      { header: "Commandes", value: (c) => c.orders },
      { header: "Total dépensé (FCFA)", value: (c) => c.spent },
      { header: "Segment", value: (c) => c.segment },
      { header: "Cliente depuis", value: (c) => new Date(c.since).toLocaleDateString("fr-FR") },
    ]);

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="clientes-${stamp}.csv"`);
    res.status(StatusCodes.OK).send(csv);
  }),
};
