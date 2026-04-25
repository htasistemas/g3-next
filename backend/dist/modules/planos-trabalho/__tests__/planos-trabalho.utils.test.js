import test from "node:test";
import assert from "node:assert/strict";
import { garantirConformidadeParaEnvio, totalAplicacaoRecursos, totalDesembolso } from "../planos-trabalho.utils.js";
function criarPlanoBase() {
    return {
        titulo: "Plano piloto",
        tipoParceria: "Termo de Fomento",
        orgaoParceiro: "Prefeitura Municipal",
        periodoInicio: "2026-05-01",
        periodoFim: "2026-12-31",
        status: "EM_ANALISE",
        responsavelTecnico: "Ana Souza",
        responsavelLegal: "Carlos Silva",
        razaoSocial: "Instituto Social",
        cnpj: "12345678000195",
        representanteLegal: "Carlos Silva",
        representanteCpf: "52998224725",
        descricaoObjeto: "Executar serviço socioassistencial",
        areaAtuacao: "Assistência social",
        localExecucao: "Uberlândia",
        publicoAlvo: "Famílias em vulnerabilidade",
        problemaSocial: "Baixo acesso a serviços",
        objetivoGeral: "Ampliar atendimento",
        objetivosEspecificos: [
            {
                descricao: "Melhorar acesso",
                resultadoEsperado: "Mais famílias atendidas",
                metasVinculadas: ["Meta 1"]
            }
        ],
        metas: [
            {
                numeroMeta: "Meta 1",
                descricao: "Atender famílias",
                indicadorResultado: "Famílias atendidas",
                unidadeMedida: "famílias",
                quantidadePrevista: 50,
                meioVerificacao: "Lista",
                dataInicio: "2026-05-01",
                dataFim: "2026-12-31",
                responsavel: "Ana Souza",
                situacao: "Planejada",
                etapas: [
                    {
                        nome: "Atendimento",
                        responsavel: "Ana Souza"
                    }
                ]
            }
        ],
        aplicacaoRecursos: [
            {
                categoriaDespesa: "Serviços de terceiros",
                item: "Oficina",
                valorTotal: 1000
            }
        ],
        desembolso: [
            {
                mesAno: "05/2026",
                valorPrevisto: 1000
            }
        ],
        instrumentosMonitoramento: ["Relatório técnico"],
        checklistPrestacao: [
            {
                descricao: "Relatório",
                obrigatorio: true,
                concluido: false
            }
        ],
        declaracaoVeracidade: true
    };
}
test("planos-trabalho.utils calcula totais", () => {
    const plano = criarPlanoBase();
    assert.equal(totalAplicacaoRecursos(plano), 1000);
    assert.equal(totalDesembolso(plano), 1000);
});
test("planos-trabalho.utils bloqueia envio com desembolso divergente", () => {
    const plano = criarPlanoBase();
    plano.desembolso = [{ mesAno: "05/2026", valorPrevisto: 800 }];
    assert.throws(() => garantirConformidadeParaEnvio(plano), /desembolso/i);
});
