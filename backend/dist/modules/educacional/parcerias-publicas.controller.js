import { evidenciaPublicaSchema, indicadorPublicoSchema, parceriaPublicaSchema } from "./parcerias-publicas.schema.js";
import { ParceriasPublicasRepository } from "./parcerias-publicas.repository.js";
const repository = new ParceriasPublicasRepository();
const tenant = (request) => request.authUser?.tenant_id ?? "";
export class ParceriasPublicasController {
    async listar(request, response) { return response.json({ itens: await repository.listar(tenant(request)) }); }
    async criarParceria(request, response) { return response.status(201).json({ item: await repository.criarParceria(parceriaPublicaSchema.parse(request.body), tenant(request)) }); }
    async criarIndicador(request, response) { return response.status(201).json({ item: await repository.criarIndicador(indicadorPublicoSchema.parse(request.body), tenant(request)) }); }
    async criarEvidencia(request, response) { return response.status(201).json({ item: await repository.criarEvidencia(evidenciaPublicaSchema.parse(request.body), tenant(request)) }); }
}
