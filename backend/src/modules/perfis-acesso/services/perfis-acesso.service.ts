import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ensurePerfisAcessoEstrutura } from "../repositories/perfis-acesso-estrutura.repository.js";
import type { PerfilAcessoInput } from "../perfis-acesso.types.js";

type Actor = { id?: string; tenant_id?: string; instituicao_id?: string; permissoes?: string[] };
const acaoMap: Record<string, string> = { VISUALIZAR: "VISUALIZAR", INCLUIR: "INCLUIR", CRIAR: "CRIAR", ALTERAR: "ALTERAR", EDITAR: "EDITAR", EXCLUIR: "EXCLUIR", IMPRIMIR: "IMPRIMIR", EXPORTAR: "EXPORTAR", APROVAR: "APROVAR", CANCELAR: "CANCELAR", REABRIR: "REABRIR", EXECUTAR: "EXECUTAR", ADMINISTRAR: "ADMINISTRAR" };

function tenant(actor: Actor) { if (!actor.tenant_id || !actor.instituicao_id) throw new AppError("Contexto institucional invalido.", 403); return actor; }
function idOf(value: string) { const id = BigInt(value); if (id <= 0n) throw new AppError("Identificador invalido.", 422); return id; }

export class PerfisAcessoService {
  async catalogo(actorRaw: Actor) {
    const actor = tenant(actorRaw); await ensurePerfisAcessoEstrutura(prisma);
    const rows = await prisma.$queryRawUnsafe<Array<{ nome: string }>>(`SELECT nome FROM permissao WHERE upper(nome) NOT IN ('ADMINISTRADOR','MASTER_ADMIN') ORDER BY nome`);
    const permissoes = rows.map(({ nome }) => {
      const partes = nome.split("_"); const acaoBruta = partes.pop() ?? "VISUALIZAR"; const recurso = partes.join("_");
      const modulo = recurso.split("_")[0] ?? "GERAL";
      return { codigo: nome, moduloCodigo: modulo, modulo: modulo.replaceAll("_", " "), recursoCodigo: recurso, recurso: recurso.replaceAll("_", " "), acao: acaoMap[acaoBruta] ?? acaoBruta.replaceAll("_", " ") };
    });
    return { tenant_id: actor.tenant_id, permissoes };
  }

  async listar(actorRaw: Actor) {
    const actor = tenant(actorRaw); await ensurePerfisAcessoEstrutura(prisma);
    return prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT p.id::text, p.nome, p.descricao, p.ativo, p.administrativo, p.observacoes, p.alterado_em, count(up.usuario_id)::int AS usuarios_vinculados, count(pp.permissao_id)::int AS permissoes_concedidas FROM perfil_acesso p LEFT JOIN usuario_perfil_acesso up ON up.perfil_id=p.id AND up.tenant_id=p.tenant_id LEFT JOIN perfil_acesso_permissao pp ON pp.perfil_id=p.id WHERE p.tenant_id=$1::uuid AND p.instituicao_id=$2::uuid GROUP BY p.id ORDER BY p.nome`, actor.tenant_id, actor.instituicao_id);
  }

  async buscar(rawId: string, actorRaw: Actor) {
    const actor = tenant(actorRaw); const id = idOf(rawId); await ensurePerfisAcessoEstrutura(prisma);
    const perfil = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id::text, nome, descricao, ativo, administrativo, observacoes, alterado_em FROM perfil_acesso WHERE id=$1 AND tenant_id=$2::uuid AND instituicao_id=$3::uuid`, id, actor.tenant_id, actor.instituicao_id);
    if (!perfil[0]) throw new AppError("Perfil de acesso nao encontrado.", 404);
    const permissoes = await prisma.$queryRawUnsafe<Array<{ codigo: string }>>(`SELECT p.nome AS codigo FROM perfil_acesso_permissao pp JOIN permissao p ON p.id=pp.permissao_id WHERE pp.perfil_id=$1 ORDER BY p.nome`, id);
    return { perfil: perfil[0], permissoes: permissoes.map((item) => item.codigo) };
  }

  async salvar(rawInput: unknown, actorRaw: Actor, rawId?: string) {
    const actor = tenant(actorRaw); const input = rawInput as Partial<PerfilAcessoInput>; const nome = String(input.nome ?? "").trim();
    if (nome.length < 3) throw new AppError("Informe o nome do perfil.", 422);
    const permissoes = [...new Set((Array.isArray(input.permissoes) ? input.permissoes : []).map((p) => p.trim().toUpperCase()).filter(Boolean))];
    await ensurePerfisAcessoEstrutura(prisma);
    const id = rawId ? idOf(rawId) : null;
    const permitidas = await prisma.$queryRawUnsafe<Array<{ id: bigint; nome: string }>>(`SELECT id, nome FROM permissao WHERE upper(nome)=ANY($1::text[])`, permissoes);
    if (permitidas.length !== permissoes.length) throw new AppError("Uma ou mais permissoes nao existem no catalogo.", 422);
    const eAdministrador = actor.permissoes?.includes("ADMINISTRADOR") === true;
    if (!eAdministrador && input.administrativo === true) throw new AppError("Somente um administrador pode criar ou alterar um perfil administrativo.", 403);
    if (!eAdministrador) {
      const permitidasPeloAtor = new Set(actor.permissoes ?? []);
      if (permissoes.some((permission) => !permitidasPeloAtor.has(permission))) throw new AppError("O perfil nao pode conceder permissoes superiores ao acesso do administrador atual.", 403);
    }
    const dependentes = permitidas.filter((p) => /_(INCLUIR|CRIAR|ALTERAR|EDITAR|EXCLUIR|APROVAR|CANCELAR|REABRIR|EXECUTAR|ADMINISTRAR)$/.test(p.nome));
    for (const permission of dependentes) {
      const base = permission.nome.replace(/_(INCLUIR|CRIAR|ALTERAR|EDITAR|EXCLUIR|APROVAR|CANCELAR|REABRIR|EXECUTAR|ADMINISTRAR)$/, "_VISUALIZAR");
      if (!permissoes.includes(base)) throw new AppError(`A permissao ${permission.nome} depende de visualizacao.`, 422);
    }
    const perfilIdSalvo = await prisma.$transaction(async (tx) => {
      let perfilId = id;
      if (perfilId) {
        const exists = await tx.$queryRawUnsafe<Array<{ id: bigint }>>(`SELECT id FROM perfil_acesso WHERE id=$1 AND tenant_id=$2::uuid AND instituicao_id=$3::uuid`, perfilId, actor.tenant_id, actor.instituicao_id);
        if (!exists[0]) throw new AppError("Perfil de acesso nao encontrado.", 404);
        await tx.$executeRawUnsafe(`UPDATE perfil_acesso SET nome=$1, descricao=$2, ativo=$3, administrativo=$4, observacoes=$5, alterado_em=CURRENT_TIMESTAMP, alterado_por=$6 WHERE id=$7`, nome, input.descricao?.trim() || null, input.ativo !== false, input.administrativo === true, input.observacoes?.trim() || null, actor.id ? BigInt(actor.id) : null, perfilId);
        await tx.$executeRawUnsafe(`DELETE FROM perfil_acesso_permissao WHERE perfil_id=$1`, perfilId);
      } else {
        const rows = await tx.$queryRawUnsafe<Array<{ id: bigint }>>(`INSERT INTO perfil_acesso (tenant_id,instituicao_id,nome,descricao,ativo,administrativo,observacoes,criado_por,alterado_por) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$8) RETURNING id`, actor.tenant_id, actor.instituicao_id, nome, input.descricao?.trim() || null, input.ativo !== false, input.administrativo === true, input.observacoes?.trim() || null, actor.id ? BigInt(actor.id) : null); perfilId = rows[0]!.id;
      }
      for (const p of permitidas) await tx.$executeRawUnsafe(`INSERT INTO perfil_acesso_permissao (perfil_id,permissao_id) VALUES ($1,$2)`, perfilId, p.id);
      await tx.$executeRawUnsafe(`INSERT INTO perfil_acesso_auditoria (perfil_id,tenant_id,usuario_id,acao) VALUES ($1,$2::uuid,$3,$4)`, perfilId, actor.tenant_id, actor.id ? BigInt(actor.id) : null, id ? "ALTERAR" : "CRIAR");
      return perfilId!;
    });
    return this.buscar(String(perfilIdSalvo), actor);
  }

  async duplicar(rawId: string, actorRaw: Actor) { const base = await this.buscar(rawId, actorRaw); const nome = `${String(base.perfil.nome)} - cópia`; return this.salvar({ ...base.perfil, nome, permissoes: base.permissoes }, actorRaw); }
  async inativar(rawId: string, actorRaw: Actor) { const actor = tenant(actorRaw); const id = idOf(rawId); await ensurePerfisAcessoEstrutura(prisma); const current = await prisma.$queryRawUnsafe<Array<{ ativo: boolean; administrativo: boolean }>>(`SELECT ativo, administrativo FROM perfil_acesso WHERE id=$1 AND tenant_id=$2::uuid AND instituicao_id=$3::uuid`, id, actor.tenant_id, actor.instituicao_id); if (!current[0]) throw new AppError("Perfil de acesso nao encontrado.", 404); if (current[0].ativo && current[0].administrativo) { const admins = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(`SELECT count(DISTINCT up.usuario_id) AS total FROM usuario_perfil_acesso up JOIN perfil_acesso p ON p.id=up.perfil_id WHERE up.tenant_id=$1::uuid AND p.ativo=TRUE AND p.administrativo=TRUE`, actor.tenant_id); if (Number(admins[0]?.total ?? 0) <= 1) throw new AppError("Nao e permitido inativar o ultimo acesso administrativo da instituicao.", 409); } await prisma.$executeRawUnsafe(`UPDATE perfil_acesso SET ativo=NOT ativo, alterado_em=CURRENT_TIMESTAMP, alterado_por=$1 WHERE id=$2 AND tenant_id=$3::uuid AND instituicao_id=$4::uuid`, actor.id ? BigInt(actor.id) : null, id, actor.tenant_id, actor.instituicao_id); return this.buscar(rawId, actor); }
}

export async function obterPermissoesEfetivas(usuarioId: string, tenantId: string) {
  await ensurePerfisAcessoEstrutura(prisma);
  const rows = await prisma.$queryRawUnsafe<Array<{ nome: string }>>(`SELECT DISTINCT p.nome FROM usuario_perfil_acesso up JOIN perfil_acesso pa ON pa.id=up.perfil_id AND pa.tenant_id=up.tenant_id AND pa.ativo=TRUE JOIN perfil_acesso_permissao pp ON pp.perfil_id=pa.id JOIN permissao p ON p.id=pp.permissao_id WHERE up.usuario_id=$1::bigint AND up.tenant_id=$2::uuid`, usuarioId, tenantId);
  return rows.map((row) => row.nome.toUpperCase());
}
