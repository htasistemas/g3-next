type DadosEndereco = {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  uf?: string;
};

type UnidadeTermo = {
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
  inscricaoMunicipal?: string;
  endereco?: string;
  numeroEndereco?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  coordenadorNome?: string;
  logomarca?: string;
  logomarcaRelatorio?: string;
};

type DisponibilidadeSemanal = {
  dom?: string[];
  seg?: string[];
  ter?: string[];
  qua?: string[];
  qui?: string[];
  sex?: string[];
  sab?: string[];
};

type ProfissionalTermo = {
  nome?: string;
  rg?: string;
  cpf?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  email?: string;
  telefoneCelular?: string;
  telefoneResidencial?: string;
  endereco?: DadosEndereco;
  voluntarioOutraInstituicao?: boolean;
  voluntarioOutraDescricao?: string;
  voluntariadoLocalAtividade?: string;
  voluntariadoPeriodo?: string;
  voluntariadoDisponibilidade?: DisponibilidadeSemanal;
  voluntariadoAtividades?: string[];
  voluntariadoOutros?: string;
  lgpdAceite?: boolean;
  imagemAceite?: boolean;
};

type VinculoTipo = 'VOLUNTARIO' | 'CLT' | 'PJ';

const diasSemana: Array<{ key: keyof DisponibilidadeSemanal; label: string }> = [
  { key: 'dom', label: 'Domingo' },
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terca' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sabado' }
];

const turnos = ['Manha', 'Tarde', 'Noite'];

const atividadesPadrao = [
  'Acolhimento',
  'Triagem',
  'Visitas',
  'Acompanhamento',
  'Oficinas',
  'Campanhas',
  'Administrativo'
];

function escapeHtml(value?: string | null): string {
  const text = (value ?? '').toString();
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function joinParts(
  parts: Array<string | undefined | null>,
  separator = ' '
): string {
  return parts.filter((part) => part && part.toString().trim().length).join(separator);
}

function hasValue(value?: string | null): boolean {
  return !!value && value.toString().trim().length > 0;
}

function formatarEnderecoUnidade(unidade: UnidadeTermo): string {
  const endereco = joinParts(
    [
      unidade.endereco,
      unidade.numeroEndereco,
      unidade.complemento,
      unidade.bairro,
      unidade.cidade,
      unidade.estado
    ],
    ', '
  );
  return endereco || '';
}

function formatarEnderecoVoluntario(endereco?: DadosEndereco): string {
  if (!endereco) return '';
  return joinParts(
    [
      endereco.logradouro,
      endereco.numero,
      endereco.complemento,
      endereco.bairro,
      endereco.cidade,
      endereco.uf,
      endereco.cep
    ],
    ', '
  );
}

function marcarAceite(valor?: boolean): { sim: string; nao: string } {
  return {
    sim: valor ? 'X' : ' ',
    nao: valor === false ? 'X' : ' '
  };
}

function possuiTurno(
  disponibilidade: DisponibilidadeSemanal | undefined,
  diaKey: keyof DisponibilidadeSemanal,
  turno: string
): boolean {
  if (!disponibilidade) return false;
  const dia = disponibilidade[diaKey];
  return Array.isArray(dia) && dia.includes(turno);
}

function formatarDisponibilidade(disponibilidade?: DisponibilidadeSemanal): string {
  if (!disponibilidade) return '';
  const diasDisponiveis = diasSemana
    .map((dia) => {
      const turnosDia = turnos.filter((turno) => possuiTurno(disponibilidade, dia.key, turno));
      if (!turnosDia.length) return '';
      return `${dia.label}: ${turnosDia.join(', ')}`;
    })
    .filter((value) => value);
  return diasDisponiveis.join(' | ');
}

function renderInfoRow(label: string, value?: string | null): string {
  if (!hasValue(value)) return '';
  return `<div class="info-row"><span class="label">${label}</span> ${escapeHtml(value)}</div>`;
}

function renderInfoRowBoolean(label: string, value?: boolean | null): string {
  if (value === undefined || value === null) return '';
  return `<div class="info-row"><span class="label">${label}</span> ${
    value ? 'Sim' : 'Nao'
  }</div>`;
}

function formatarDataNascimento(valor?: string | null): string {
  if (!valor) return '';
  const texto = valor.toString().trim();
  if (!texto) return '';
  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }
  const brMatch = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[1]}-${brMatch[2]}-${brMatch[3]}`;
  }
  return texto;
}

export function buildTermoVoluntariadoHTML(
  unidade: UnidadeTermo,
  voluntario: ProfissionalTermo,
  usuarioEmissor?: string,
  vinculoTipo: VinculoTipo = 'VOLUNTARIO'
): string {
  const nomeUnidade =
    unidade.razaoSocial ||
    unidade.nomeFantasia ||
    'ADRA - Agencia Adventista de Desenvolvimento e Recursos Assistenciais';
  const enderecoUnidade = formatarEnderecoUnidade(unidade);
  const voluntarioEndereco = formatarEnderecoVoluntario(voluntario.endereco);
  const voluntarioCidadeUf = joinParts(
    [voluntario.endereco?.cidade, voluntario.endereco?.uf],
    ' / '
  );
  const aceiteLgpd = marcarAceite(voluntario.lgpdAceite);
  const aceiteImagem = marcarAceite(voluntario.imagemAceite);
  const atividadesSelecionadas = voluntario.voluntariadoAtividades ?? [];
  const atividadesSelecionadasTexto = atividadesPadrao
    .filter((atividade) => atividadesSelecionadas.includes(atividade))
    .map((atividade) => escapeHtml(atividade))
    .join(', ');
  const disponibilidadeTexto = formatarDisponibilidade(
    voluntario.voluntariadoDisponibilidade
  );
  const voluntarioOutraDescricao = escapeHtml(voluntario.voluntarioOutraDescricao || '');
  const voluntarioOutraInstituicao = renderInfoRowBoolean(
    'Voluntario em outra instituicao?',
    voluntario.voluntarioOutraInstituicao
  );
  const logomarca = unidade.logomarcaRelatorio || unidade.logomarca || '';
  const dataEmissao = new Date().toLocaleString('pt-BR');
  const usuarioEmissorTexto = hasValue(usuarioEmissor)
    ? escapeHtml(usuarioEmissor)
    : 'Sistema';
  const tituloDocumento =
    vinculoTipo === 'CLT'
      ? 'Termo de Cadastro de Profissional - Empregado (CLT)'
      : vinculoTipo === 'PJ'
        ? 'Termo de Cadastro de Prestador de Servico (PJ)'
        : 'Termo de Adesao ao Voluntariado - ADRA';
  const subtituloDocumento =
    vinculoTipo === 'VOLUNTARIO'
      ? 'Nos termos da Lei n.o 9.608/1998'
      : 'Documento de cadastro e responsabilidades';
  const tituloDadosProfissional =
    vinculoTipo === 'VOLUNTARIO' ? 'Dados do voluntario' : 'Dados do profissional';
  const tituloCondicoes =
    vinculoTipo === 'CLT'
      ? [
          'O presente documento registra o cadastro do profissional empregado, nos termos da legislacao trabalhista vigente e do contrato de trabalho firmado entre as partes.',
          'As atividades, jornada, remuneracao, beneficios e demais condicoes serao regidas pelo contrato de trabalho e pela CLT, prevalecendo os instrumentos formais assinados.',
          'O profissional compromete-se a cumprir normas internas, codigo de conduta, politicas de seguranca, confidencialidade e protecao de dados, respondendo por conduta dolosa ou culposa.',
          'A instituicao podera adotar medidas disciplinares em caso de descumprimento de normas internas, respeitados os procedimentos legais aplicaveis.',
          'Eventuais alteracoes de funcao, local de trabalho ou jornada deverao observar a legislacao e os instrumentos formais vigentes.'
        ]
      : vinculoTipo === 'PJ'
        ? [
            'O presente documento registra o cadastro do prestador de servico, sem configuracao de vinculo empregaticio, nos termos da legislacao aplicavel.',
            'A prestacao de servico sera regida por contrato especifico, com autonomia tecnica e administrativa, sem subordinacao hierarquica tipica de relacao de emprego.',
            'O prestador compromete-se a cumprir normas internas, codigo de conduta, politicas de seguranca, confidencialidade e protecao de dados, respondendo por conduta dolosa ou culposa.',
            'A instituicao podera suspender ou rescindir a prestacao conforme contrato, resguardadas as obrigacoes ja assumidas.',
            'As responsabilidades fiscais, trabalhistas e previdenciarias decorrentes da atividade do prestador permanecem sob sua titularidade, conforme contrato.'
          ]
        : [
            'O presente Termo de Adesao ao Voluntariado e celebrado nos termos da Lei n.o 9.608/1998, reconhecendo-se que a atividade voluntaria e nao remunerada e nao gera vinculo empregaticio, obrigacoes trabalhistas, previdenciarias ou assemelhadas.',
            'A colaboracao sera prestada de forma espontanea, livre e gratuita, sem expectativa de contraprestacao, sendo admitido apenas o ressarcimento de despesas previamente autorizadas e comprovadas, conforme a lei aplicavel.',
            'O voluntario compromete-se a observar as politicas internas, codigo de conduta, normas de seguranca, sigilo e protecao de dados da instituicao, respondendo civil e administrativamente por conduta dolosa ou culposa que viole tais diretrizes.',
            'A instituicao podera interromper ou suspender a atividade voluntaria sempre que houver necessidade operacional, descumprimento de normas internas, ou risco a terceiros, sem que isso caracterize inadimplemento ou obrigacao indenizatoria.',
            'O voluntario declara estar apto fisica e mentalmente para o desempenho das atividades, assumindo responsabilidade pelas informacoes prestadas e comunicando previamente qualquer impedimento ou restricao.',
            'As atividades devem respeitar os limites de seguranca e a capacidade do voluntario, sendo vedado o desempenho de tarefas nao autorizadas ou fora do escopo acordado.',
            'Este termo podera ser encerrado por qualquer das partes, a qualquer tempo, mediante comunicacao formal, sem necessidade de justificativa, preservados os atos ja praticados.',
            'Eventuais danos materiais ou pessoais decorrentes de conduta do voluntario, em desacordo com as orientacoes da instituicao, serao de sua responsabilidade, nos termos da legislacao vigente.',
            'Os casos omissos serao resolvidos de comum acordo entre as partes, observada a legislacao aplicavel e o interesse institucional.'
          ];

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${tituloDocumento}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: Arial, sans-serif; color: #000; font-size: 12px; line-height: 1.35; }
        h1, h2 { margin: 0; text-align: center; }
        h1 { font-size: 16px; font-weight: 700; }
        h2 { font-size: 13px; font-weight: 700; margin-top: 6px; }
        .section { margin-top: 12px; }
        .term-subtitle { text-align: center; font-size: 11px; margin: 6px 0 0; }
        .info-row { padding: 2px 0; }
        .label { font-weight: 700; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
        .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 12px; margin-top: 12px; }
        .card__title { margin: 0 0 6px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
        .info-stack { display: grid; gap: 4px; }
        .divider { height: 1px; background: #e5e7eb; margin: 6px 0; }
        .center { text-align: center; }
        .check-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .check { width: 14px; height: 14px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; }
        .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
        .signature-line { border-bottom: 1px solid #000; height: 18px; }
        .small { font-size: 10px; }
        .term-header { display: grid; grid-template-columns: 120px 1fr 120px; align-items: center; gap: 12px; margin-bottom: 8px; }
        .term-header__logo { width: 110px; height: 60px; object-fit: contain; }
        .term-header__title { text-align: center; }
        .term-header__meta { text-align: right; font-size: 10px; }
        .term-header__divider { height: 1px; background: #000; margin: 6px 0 10px; }
        .card--justificado { text-align: justify; }
        .assinatura-espaco { height: 3.6em; }
      </style>
    </head>
    <body>
      <header class="term-header">
        <div>
          ${logomarca ? `<img class="term-header__logo" src="${logomarca}" alt="Logomarca da instituicao" />` : ''}
        </div>
        <div class="term-header__title">
          <h1>${tituloDocumento}</h1>
          <h2>${escapeHtml(nomeUnidade)}</h2>
          <p class="term-subtitle">${subtituloDocumento}</p>
        </div>
        <div class="term-header__meta">Usuario: ${usuarioEmissorTexto}<br/>Emissao: ${dataEmissao}</div>
      </header>
      <div class="term-header__divider"></div>
      <div class="card">
        <h2 class="card__title">Dados da instituicao</h2>
        <div class="info-stack">
          ${renderInfoRow('Razao social:', unidade.razaoSocial)}
          ${renderInfoRow('Nome fantasia:', unidade.nomeFantasia)}
          ${renderInfoRow('CNPJ:', unidade.cnpj)}
          ${renderInfoRow('Inscricao municipal:', unidade.inscricaoMunicipal)}
          ${renderInfoRow('Endereco:', enderecoUnidade)}
          ${renderInfoRow('Cidade/UF:', joinParts([unidade.cidade, unidade.estado], ' / '))}
          ${renderInfoRow('Coordenador:', unidade.coordenadorNome)}
        </div>
      </div>
      <div class="card">
        <h2 class="card__title">${tituloDadosProfissional}</h2>
        <div class="grid">
          ${renderInfoRow('Nome:', voluntario.nome)}
          ${renderInfoRow('RG:', voluntario.rg)}
          ${renderInfoRow('CPF:', voluntario.cpf)}
          ${renderInfoRow('Data de nascimento:', formatarDataNascimento(voluntario.dataNascimento))}
          ${renderInfoRow('Estado civil:', voluntario.estadoCivil)}
          ${renderInfoRow('Email:', voluntario.email)}
          ${renderInfoRow('Celular:', voluntario.telefoneCelular)}
          ${renderInfoRow('Residencial:', voluntario.telefoneResidencial)}
        </div>
        ${renderInfoRow('Endereco completo:', voluntarioEndereco)}
        ${voluntarioOutraInstituicao ? `${voluntarioOutraInstituicao}${voluntarioOutraDescricao ? ` - ${voluntarioOutraDescricao}` : ''}` : ''}
      </div>
      <div class="card">
        <h2 class="card__title">Informacoes gerais</h2>
        <div class="info-stack">
          ${renderInfoRow('Local da atividade requerida:', voluntario.voluntariadoLocalAtividade)}
          ${renderInfoRow('Periodo do voluntariado:', voluntario.voluntariadoPeriodo)}
          ${renderInfoRow('Disponibilidade (max. 16h semanais):', disponibilidadeTexto)}
          ${renderInfoRow('Atividades selecionadas:', atividadesSelecionadasTexto)}
          ${renderInfoRow('Outros:', voluntario.voluntariadoOutros)}
        </div>
      </div>
      <div class="card card--justificado">
        <h2 class="card__title">Condicoes gerais</h2>
        <ol>
          ${tituloCondicoes.map((item) => `<li>${item}</li>`).join('')}
        </ol>
      </div>
      <div class="card">
        <div class="info-stack">
          <p>Declaro estar ciente e de acordo com as condicoes acima.</p>
          <div class="info-row"><span class="label">Local e data:</span> ${voluntarioCidadeUf || 'Cidade/UF nao informada'} - ________________________________</div>
          <div class="assinatura-espaco"></div>
        </div>
      </div>
      <div class="card">
        <h2 class="card__title">LGPD</h2>
        <p>Autorizo o tratamento dos meus dados pessoais para fins de voluntariado, conforme a Lei Geral de Protecao de Dados (Lei n.o 13.709/2018).</p>
        <div class="check-item"><span class="check">${aceiteLgpd.sim}</span> Aceito</div>
        <div class="check-item"><span class="check">${aceiteLgpd.nao}</span> Nao aceito</div>
      </div>
      <div class="card">
        <h2 class="card__title">Cessao de imagem</h2>
        <p>Autorizo o uso da minha imagem e voz, de forma gratuita, para fins institucionais, educativos e de divulgacao da ADRA, em materiais impressos e digitais, midias sociais, relatorios e outros meios, pelo prazo necessario e sem qualquer onus.</p>
        <div class="check-item"><span class="check">${aceiteImagem.sim}</span> Aceito</div>
        <div class="check-item"><span class="check">${aceiteImagem.nao}</span> Nao aceito</div>
      </div>
      <div class="signature">
        <div>
          <div class="signature-line"></div>
          <div class="small center">Voluntario/Responsavel</div>
        </div>
        <div>
          <div class="signature-line"></div>
          <div class="small center">Coordenador da unidade${unidade.coordenadorNome ? `: ${escapeHtml(unidade.coordenadorNome)}` : ''}</div>
        </div>
      </div>
    </body>
  </html>
  `;
}

