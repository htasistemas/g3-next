import type { LicencaUsoPlanoId } from "@/types/licenca-uso";

export type OfertaPlano = {
  id: LicencaUsoPlanoId;
  nome: string;
  valorMensal: number;
  implantacao: number;
  destaque?: string;
  resumo: string;
  mensagemValor: string;
  funcionalidades: string[];
  cta: string;
};

export const linksComerciais = {
  demonstracao: "https://wa.me/5534992693522?text=Ol%C3%A1%2C%20quero%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20G3N.",
  whatsapp: "https://wa.me/5534992693522?text=Ol%C3%A1%2C%20quero%20falar%20sobre%20os%20planos%20do%20G3N.",
  proposta: "https://wa.me/5534992693522?text=Ol%C3%A1%2C%20quero%20solicitar%20uma%20proposta%20do%20G3N.",
  especialista: "https://wa.me/5534992693522?text=Ol%C3%A1%2C%20quero%20falar%20com%20um%20especialista%20do%20G3N."
};

export const ofertaPlanos: OfertaPlano[] = [
  {
    id: "essencial",
    nome: "Essencial",
    valorMensal: 397,
    implantacao: 497,
    resumo: "Ideal para organizações que querem sair do papel, padronizar o cadastro e começar a operar com base organizada.",
    mensagemValor:
      "Centralize as informações essenciais da instituição sem complexidade e com implantação mais simples.",
    funcionalidades: [
      "Cadastro de beneficiários",
      "Cadastro de profissionais e voluntariado",
      "Unidades assistenciais",
      "Vínculos familiares",
      "Relatórios básicos"
    ],
    cta: "Quero este plano"
  },
  {
    id: "profissional",
    nome: "Profissional",
    valorMensal: 697,
    implantacao: 897,
    destaque: "Mais escolhido",
    resumo:
      "Ideal para instituições que já possuem rotina frequente de atendimentos e precisam de rastreabilidade, indicadores e maior controle da operação.",
    mensagemValor:
      "Ganhe visão operacional e acompanhe melhor quem foi atendido, o que recebeu e como a instituição está evoluindo.",
    funcionalidades: [
      "Tudo do plano Essencial",
      "Histórico completo de atendimentos",
      "Controle de benefícios",
      "Financeiro básico",
      "Dashboard inteligente"
    ],
    cta: "Quero este plano"
  },
  {
    id: "premium",
    nome: "Premium",
    valorMensal: 997,
    implantacao: 1500,
    resumo:
      "Ideal para instituições que precisam integrar atendimento, gestão, captação e prestação de contas em um único ambiente.",
    mensagemValor:
      "Tenha uma gestão mais estratégica, transparente e preparada para expansão, auditoria e apresentação de resultados.",
    funcionalidades: [
      "Tudo do plano Profissional",
      "Prestação de contas completa",
      "Captação de recursos",
      "Georreferenciamento",
      "Central de atendimentos",
      "Recebimento de doações"
    ],
    cta: "Quero este plano"
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    valorMensal: 1497,
    implantacao: 2497,
    resumo: "Ideal para grandes instituições, redes, unidades integradas e operações mais complexas.",
    mensagemValor:
      "Escale a operação da instituição com governança, integração e controle avançado.",
    funcionalidades: [
      "Tudo do plano Premium",
      "Usuários ilimitados",
      "Multiunidades",
      "Integrações por API",
      "Suporte prioritário",
      "Painel de chamada de senha",
      "Controle administrativo",
      "Controle financeiro",
      "Controle jurídico",
      "Controle de recursos humanos",
      "Controle de ponto"
    ],
    cta: "Solicitar proposta"
  }
];

export const comparativoLinhas: Array<{
  nome: string;
  valores: Record<LicencaUsoPlanoId, boolean>;
}> = [
  {
    nome: "Cadastro de beneficiários",
    valores: { essencial: true, profissional: true, premium: true, enterprise: true }
  },
  {
    nome: "Cadastro de profissionais e voluntariado",
    valores: { essencial: true, profissional: true, premium: true, enterprise: true }
  },
  {
    nome: "Unidades assistenciais",
    valores: { essencial: true, profissional: true, premium: true, enterprise: true }
  },
  {
    nome: "Vínculos familiares",
    valores: { essencial: true, profissional: true, premium: true, enterprise: true }
  },
  {
    nome: "Histórico completo de atendimentos",
    valores: { essencial: false, profissional: true, premium: true, enterprise: true }
  },
  {
    nome: "Controle de benefícios",
    valores: { essencial: false, profissional: true, premium: true, enterprise: true }
  },
  {
    nome: "Financeiro básico",
    valores: { essencial: false, profissional: true, premium: true, enterprise: true }
  },
  {
    nome: "Dashboard inteligente",
    valores: { essencial: false, profissional: true, premium: true, enterprise: true }
  },
  {
    nome: "Prestação de contas completa",
    valores: { essencial: false, profissional: false, premium: true, enterprise: true }
  },
  {
    nome: "Captação de recursos",
    valores: { essencial: false, profissional: false, premium: true, enterprise: true }
  },
  {
    nome: "Georreferenciamento",
    valores: { essencial: false, profissional: false, premium: true, enterprise: true }
  },
  {
    nome: "Central de atendimentos",
    valores: { essencial: false, profissional: false, premium: true, enterprise: true }
  },
  {
    nome: "Recebimento de doações",
    valores: { essencial: false, profissional: false, premium: true, enterprise: true }
  },
  {
    nome: "Multiunidades",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  },
  {
    nome: "Integrações por API",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  },
  {
    nome: "Suporte prioritário",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  },
  {
    nome: "Painel de chamada de senha",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  },
  {
    nome: "Controle administrativo",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  },
  {
    nome: "Controle financeiro",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  },
  {
    nome: "Controle jurídico",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  },
  {
    nome: "Controle de recursos humanos",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  },
  {
    nome: "Controle de ponto",
    valores: { essencial: false, profissional: false, premium: false, enterprise: true }
  }
];

export const perfisPlanos = [
  {
    titulo: "Essencial",
    descricao: "Instituições pequenas, em fase de organização, com operação inicial."
  },
  {
    titulo: "Profissional",
    descricao:
      "Instituições em crescimento, com maior volume de atendimentos e necessidade de histórico e indicadores."
  },
  {
    titulo: "Premium",
    descricao:
      "Instituições com exigência de prestação de contas, captação, gestão territorial e visão estratégica."
  },
  {
    titulo: "Enterprise",
    descricao:
      "Instituições com várias unidades, múltiplos setores e necessidade de integração e governança."
  }
];

export const beneficiosComerciais = [
  "Organização centralizada",
  "Redução de retrabalho",
  "Mais controle do atendimento",
  "Mais segurança nas informações",
  "Melhor visão da operação",
  "Mais profissionalismo institucional",
  "Apoio à tomada de decisão"
];

export const provasConfianca = [
  "Sistema especializado no terceiro setor",
  "Implantação orientada",
  "Suporte humanizado",
  "Evolução contínua do sistema",
  "Pensado para a realidade das instituições"
];

export const depoimentosEstrutura = [
  {
    instituicao: "Nome da instituição",
    responsavel: "Nome do responsável",
    cargo: "Cargo",
    depoimento:
      "Espaço pronto para receber um depoimento real sobre ganhos de organização, controle e segurança com o G3N."
  },
  {
    instituicao: "Nome da instituição",
    responsavel: "Nome do responsável",
    cargo: "Cargo",
    depoimento:
      "Espaço pronto para mostrar uma experiência de implantação, evolução operacional e melhoria de atendimento."
  }
];

export const faqComercial = [
  {
    pergunta: "O G3N atende instituições pequenas?",
    resposta:
      "Sim. O plano Essencial foi pensado para instituições que precisam começar com organização, padronização e uma operação simples de implantar."
  },
  {
    pergunta: "Posso começar no Essencial e depois mudar de plano?",
    resposta:
      "Sim. O G3N foi estruturado para crescimento por etapas, permitindo contratar um plano inicial e evoluir conforme a operação da instituição amadurece."
  },
  {
    pergunta: "O sistema permite crescimento por etapas?",
    resposta:
      "Permite. A lógica dos planos foi criada para acompanhar a evolução da gestão, saindo da organização básica até cenários com multiunidades e integração."
  },
  {
    pergunta: "Existe implantação?",
    resposta:
      "Sim. O processo de implantação orienta a configuração inicial e ajuda a instituição a começar o uso do sistema com mais clareza e segurança."
  },
  {
    pergunta: "O suporte está incluso?",
    resposta:
      "Sim. O suporte faz parte da jornada comercial do G3N, com níveis diferentes de atendimento conforme o plano contratado."
  },
  {
    pergunta: "O plano anual tem desconto?",
    resposta:
      "Sim. No anual o G3N aplica economia comercial e melhora o custo-benefício para instituições que desejam previsibilidade."
  },
  {
    pergunta: "O G3N funciona para instituições com mais de uma unidade?",
    resposta:
      "Sim. O plano Enterprise foi pensado justamente para operações com várias unidades, múltiplos setores e maior exigência de governança."
  },
  {
    pergunta: "Posso solicitar demonstração antes de contratar?",
    resposta:
      "Sim. A demonstração é o melhor caminho para entender como o G3N se encaixa na rotina da instituição e qual plano faz mais sentido."
  }
];
