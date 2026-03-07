import { AppError } from "../../../shared/errors/app-error.js";
import { dashboardFiltrosSchema } from "../dashboard.schema.js";
import { DashboardRepository } from "../repositories/dashboard.repository.js";
import type {
  DashboardAssistenciaResponse,
  DashboardFiltros,
  DashboardTermoAlerta
} from "../dashboard.types.js";

type FaixaEtaria = Record<string, number>;

function arredondarUmaCasa(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function calcularIdade(dataNascimento: Date, dataReferencia = new Date()): number {
  const anoAtual = dataReferencia.getUTCFullYear();
  const mesAtual = dataReferencia.getUTCMonth();
  const diaAtual = dataReferencia.getUTCDate();

  const anoNascimento = dataNascimento.getUTCFullYear();
  const mesNascimento = dataNascimento.getUTCMonth();
  const diaNascimento = dataNascimento.getUTCDate();

  let idade = anoAtual - anoNascimento;
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
    idade -= 1;
  }
  return idade;
}

export class DashboardService {
  private readonly repository = new DashboardRepository();

  async obterAssistencia(rawFilters: unknown): Promise<DashboardAssistenciaResponse> {
    const filters = dashboardFiltrosSchema.parse(rawFilters);
    this.validarPeriodo(filters);

    const [
      totalBeneficiarios,
      totalProfissionais,
      totalVoluntarios,
      totalFamiliasCadastradas,
      totalBensPatrimonio,
      beneficiariosPeriodo,
      porStatus,
      cadastrosCompletos,
      datasNascimento,
      totalSituacaoSocial,
      mediaPessoasBanco,
      rendasFamiliares,
      bairros,
      vulnerabilidades,
      insegurancaAlimentar,
      termosAtivos,
      termosValorTotal,
      termosAlertas,
      valoresAReceber,
      valoresEmCaixa,
      valoresEmBanco,
      cursosAtivos,
      taxaMediaOcupacaoCursos,
      certificadosEmitidos,
      doacoesPeriodo,
      itensDoadoResumo,
      visitasDomiciliares,
      termosVencendo,
      execucaoFinanceira,
      absenteismo
    ] = await Promise.all([
      this.repository.contarBeneficiarios(),
      this.repository.contarProfissionais(),
      this.repository.contarVoluntarios(),
      this.repository.contarFamilias(),
      this.repository.contarBensPatrimonio(),
      this.repository.contarBeneficiariosPeriodo(filters.startDate, filters.endDate),
      this.repository.contarBeneficiariosPorStatus(),
      this.repository.contarCadastroCompleto(),
      this.repository.listarDatasNascimento(),
      this.repository.contarSituacaoSocialTotal(),
      this.repository.calcularMediaPessoas(),
      this.repository.listarRendasFamiliares(),
      this.repository.contarBeneficiariosPorBairro(),
      this.repository.contarVulnerabilidades(),
      this.repository.contarInsegurancaAlimentar(),
      this.repository.contarTermosAtivos(),
      this.repository.somarValorTotalTermosAtivos(),
      this.repository.listarAlertasTermos(),
      this.repository.somarValoresAReceber(),
      this.repository.somarValoresEmCaixa(),
      this.repository.somarValoresEmBanco(),
      this.repository.contarCursosAtivos(),
      this.repository.calcularTaxaMediaOcupacaoCursos(),
      this.repository.contarCertificadosEmitidos(),
      this.repository.contarDoacoesPeriodo(filters.startDate, filters.endDate),
      this.repository.obterResumoItensDoacao(filters.startDate, filters.endDate),
      this.repository.contarVisitasDomiciliares(filters.startDate, filters.endDate),
      this.repository.contarTermosVencendo(),
      this.repository.calcularExecucaoFinanceira(),
      this.repository.calcularAbsenteismo()
    ]);

    const pendentes = porStatus["INCOMPLETO"] ?? 0;
    const bloqueados = porStatus["BLOQUEADO"] ?? 0;
    const emAnalise = porStatus["EM_ANALISE"] ?? 0;
    const desatualizados = porStatus["DESATUALIZADO"] ?? 0;
    const ativos = Math.max(
      0,
      totalBeneficiarios - pendentes - bloqueados - emAnalise - desatualizados
    );

    const cadastroCompletoPercentual =
      totalBeneficiarios === 0 ? 0 : (cadastrosCompletos / totalBeneficiarios) * 100;

    const faixaEtaria = this.calcularFaixaEtaria(datasNascimento);
    const idades = this.calcularIdades(datasNascimento);

    const rendas = this.parseRendas(rendasFamiliares);
    const rendaMediaFamiliar = this.calcularMedia(rendas);
    const mediaPessoas = mediaPessoasBanco || 0;
    const rendaPerCapitaMedia = mediaPessoas > 0 ? rendaMediaFamiliar / mediaPessoas : 0;
    const faixaRenda = this.calcularFaixaRenda(rendas);

    const familiasExtremaPobreza = faixaRenda["Ate 200"] ?? 0;

    return {
      filters: {
        startDate: filters.startDate ?? null,
        endDate: filters.endDate ?? null
      },
      cadastros: {
        beneficiarios: totalBeneficiarios,
        profissionais: totalProfissionais,
        voluntarios: totalVoluntarios,
        familias: totalFamiliasCadastradas,
        bensPatrimonio: totalBensPatrimonio
      },
      top12: {
        beneficiariosAtendidosPeriodo: beneficiariosPeriodo,
        familiasExtremaPobreza,
        rendaMediaFamiliar: arredondarUmaCasa(rendaMediaFamiliar),
        cursosAtivos,
        taxaMediaOcupacaoCursos: arredondarUmaCasa(taxaMediaOcupacaoCursos),
        certificadosEmitidos,
        doacoesPeriodo,
        itensDoadoResumo,
        visitasDomiciliares,
        termosVencendo,
        execucaoFinanceira: arredondarUmaCasa(execucaoFinanceira),
        absenteismo: arredondarUmaCasa(absenteismo)
      },
      atendimento: {
        totalBeneficiarios,
        ativos,
        pendentes,
        bloqueados,
        emAnalise,
        desatualizados,
        cadastroCompletoPercentual: arredondarUmaCasa(cadastroCompletoPercentual),
        beneficiariosPeriodo,
        novosBeneficiarios: beneficiariosPeriodo,
        reincidentes: 0,
        faixaEtaria,
        idades,
        vulnerabilidades,
        bairros
      },
      familias: {
        total: totalSituacaoSocial === 0 ? totalBeneficiarios : totalSituacaoSocial,
        mediaPessoas: arredondarUmaCasa(mediaPessoas),
        rendaMediaFamiliar: arredondarUmaCasa(rendaMediaFamiliar),
        rendaPerCapitaMedia: arredondarUmaCasa(rendaPerCapitaMedia),
        insegurancaAlimentar,
        faixaRenda
      },
      termos: {
        ativos: termosAtivos,
        valorTotal: arredondarUmaCasa(termosValorTotal),
        alertas: this.normalizarAlertasTermos(termosAlertas)
      },
      financeiro: {
        valoresAReceber: arredondarUmaCasa(valoresAReceber),
        valoresEmCaixa: arredondarUmaCasa(valoresEmCaixa),
        valoresEmBanco: arredondarUmaCasa(valoresEmBanco)
      }
    };
  }

  private validarPeriodo(filters: DashboardFiltros) {
    if (!filters.startDate || !filters.endDate) {
      return;
    }

    const inicio = new Date(`${filters.startDate}T00:00:00.000Z`);
    const fim = new Date(`${filters.endDate}T00:00:00.000Z`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      throw new AppError("Datas de filtro invalidas.", 422);
    }
    if (inicio.getTime() > fim.getTime()) {
      throw new AppError("A data final deve ser maior ou igual a data inicial.", 422);
    }
  }

  private calcularFaixaEtaria(datasNascimento: Date[]): FaixaEtaria {
    const faixas: FaixaEtaria = {
      "0-12": 0,
      "13-17": 0,
      "18-29": 0,
      "30-59": 0,
      "60+": 0
    };

    for (const dataNascimento of datasNascimento) {
      const idade = calcularIdade(dataNascimento);
      if (idade < 0) continue;

      if (idade <= 12) {
        faixas["0-12"] += 1;
      } else if (idade <= 17) {
        faixas["13-17"] += 1;
      } else if (idade <= 29) {
        faixas["18-29"] += 1;
      } else if (idade <= 59) {
        faixas["30-59"] += 1;
      } else {
        faixas["60+"] += 1;
      }
    }

    return faixas;
  }

  private calcularIdades(datasNascimento: Date[]) {
    const contador = new Map<number, number>();
    for (const dataNascimento of datasNascimento) {
      const idade = calcularIdade(dataNascimento);
      if (idade < 0) continue;
      contador.set(idade, (contador.get(idade) ?? 0) + 1);
    }

    return [...contador.entries()]
      .sort(([idadeA], [idadeB]) => idadeA - idadeB)
      .reduce<Record<string, number>>((acc, [idade, quantidade]) => {
        acc[String(idade)] = quantidade;
        return acc;
      }, {});
  }

  private parseRendas(rendas: string[]) {
    return rendas
      .map((renda) => this.parseValorMonetario(renda))
      .filter((valor): valor is number => typeof valor === "number");
  }

  private parseValorMonetario(valor: string) {
    if (!valor?.trim()) return null;

    let normalizado = valor.replace("R$", "").trim();
    normalizado = normalizado.replace(/[^0-9,.\-]/g, "");

    if (normalizado.includes(",")) {
      normalizado = normalizado.replaceAll(".", "").replace(",", ".");
    } else if (normalizado.includes(".")) {
      const partes = normalizado.split(".");
      if (partes.length > 2) {
        const decimal = partes.pop();
        normalizado = `${partes.join("")}.${decimal}`;
      }
    }

    const numero = Number(normalizado);
    if (!Number.isFinite(numero)) return null;
    return numero;
  }

  private calcularMedia(valores: number[]) {
    if (!valores.length) return 0;
    const soma = valores.reduce((total, valor) => total + valor, 0);
    return soma / valores.length;
  }

  private calcularFaixaRenda(rendas: number[]) {
    const faixas: Record<string, number> = {
      "Ate 200": 0,
      "201-500": 0,
      "501-1000": 0,
      "Acima 1000": 0
    };

    for (const renda of rendas) {
      if (renda <= 200) {
        faixas["Ate 200"] += 1;
      } else if (renda <= 500) {
        faixas["201-500"] += 1;
      } else if (renda <= 1000) {
        faixas["501-1000"] += 1;
      } else {
        faixas["Acima 1000"] += 1;
      }
    }

    return faixas;
  }

  private normalizarAlertasTermos(alertas: DashboardTermoAlerta[]) {
    return alertas.map((alerta) => ({
      numero: alerta.numero,
      vigenciaFim: alerta.vigenciaFim,
      status: alerta.status
    }));
  }
}
