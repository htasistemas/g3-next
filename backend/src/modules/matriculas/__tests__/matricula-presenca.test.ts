import assert from "node:assert/strict";
import test from "node:test";
import { MatriculaService } from "../services/matricula.service.js";
import { montarAuditoriaPresenca } from "../repositories/matricula.repository.js";

test("MatriculaService.salvarPresencasPorData repassa tenant e usuario ao repository", async () => {
  const service = new MatriculaService();
  const chamadas: unknown[][] = [];

  (service as unknown as { repository: { salvarPresencasPorData: (...args: unknown[]) => Promise<unknown> } }).repository =
    {
      async salvarPresencasPorData(...args: unknown[]) {
        chamadas.push(args);
        return {
          data_aula: new Date("2026-07-10T00:00:00.000Z"),
          itens: [
            {
              matricula_id: 99n,
              beneficiario_nome: "Maria da Silva",
              cpf: "12345678900",
              status: "JUSTIFICADO",
              observacao: "Compareceu com atestado"
            }
          ]
        };
      }
    };

  const resultado = await service.salvarPresencasPorData(
    "10",
    "22",
    {
      data_aula: "2026-07-10",
      observacoes: "Acompanhamento da aula",
      presencas: [{ matricula_id: "99", status: "JUSTIFICADO", observacao: "Compareceu com atestado" }]
    },
    "550e8400-e29b-41d4-a716-446655440000",
    { id: "7", nome: "Ana Responsavel" }
  );

  assert.equal(chamadas.length, 1);
  assert.deepEqual(chamadas[0]?.slice(0, 5), [
    10n,
    22n,
    {
      data_aula: "2026-07-10",
      observacoes: "Acompanhamento da aula",
      presencas: [{ matricula_id: "99", status: "JUSTIFICADO", observacao: "Compareceu com atestado" }]
    },
    "550e8400-e29b-41d4-a716-446655440000",
    { id: 7n, nome: "Ana Responsavel" }
  ]);
  assert.deepEqual(resultado, {
    data_aula: "2026-07-10",
    presencas: [
      {
        matricula_id: "99",
        beneficiario_nome: "Maria da Silva",
        cpf: "12345678900",
        status: "JUSTIFICADO",
        observacao: "Compareceu com atestado"
      }
    ]
  });
});

test("montarAuditoriaPresenca consolida os dados de persistencia", () => {
  const auditoria = montarAuditoriaPresenca({
    tenantId: "550e8400-e29b-41d4-a716-446655440000",
    cursoId: 10n,
    presencaDataId: 22n,
    dataAula: new Date("2026-07-10T00:00:00.000Z"),
    matriculaId: 99n,
    beneficiarioId: 123n,
    beneficiarioNome: "Maria da Silva",
    cpf: "12345678900",
    statusAnterior: "AUSENTE",
    statusNovo: "PRESENTE",
    observacao: "Observacao da frequencia",
    usuarioId: 7n,
    usuarioNome: "Ana Responsavel"
  });

  assert.equal(auditoria.tenant_id, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(auditoria.beneficiario_id, 123n);
  assert.equal(auditoria.entidade, "PRESENCA_MATRICULA");
  assert.equal(auditoria.entidade_id, 22n);
  assert.equal(auditoria.acao, "ATUALIZAR");
  assert.equal(auditoria.usuario_id, 7n);
  assert.equal(auditoria.usuario_nome, "Ana Responsavel");
  assert.deepEqual(auditoria.dados_novos, {
    tenantId: "550e8400-e29b-41d4-a716-446655440000",
    cursoId: "10",
    presencaDataId: "22",
    dataAula: "2026-07-10T00:00:00.000Z",
    matriculaId: "99",
    beneficiarioId: "123",
    beneficiarioNome: "Maria da Silva",
    cpf: "12345678900",
    statusAnterior: "AUSENTE",
    statusNovo: "PRESENTE",
    observacao: "Observacao da frequencia",
    usuarioId: "7",
    usuarioNome: "Ana Responsavel"
  });
});
