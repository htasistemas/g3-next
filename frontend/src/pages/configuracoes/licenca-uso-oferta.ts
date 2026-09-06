import type { LicencaUsoPlanoId } from "@/types/licenca-uso";

export type OfertaPlano = {
  id: LicencaUsoPlanoId;
  nome: string;
  valorMensal: number;
  implantacao: number;
  destaque?: string;
  resumo: string;
  indicadoPara: string;
  mensagemValor: string;
  funcionalidades: string[];
  limites: string[];
  cta: string;
};

export type ComparativoModulo = {
  modulo: string;
  essencial: string;
  profissional: string;
  premium: string;
  enterprise: string;
};

export const linksComerciais = {
  demonstracao: "https://wa.me/5534992693522?text=Ol%C3%A1%2C%20quero%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20G3N.",
  whatsapp: "https://wa.me/5534992693522?text=Ol%C3%A1%2C%20quero%20falar%20sobre%20os%20planos%20do%20G3N.",
  especialista: "https://wa.me/5534992693522?text=Ol%C3%A1%2C%20quero%20falar%20com%20um%20especialista%20do%20G3N."
};

export const ofertaPlanos: OfertaPlano[] = [
  {
    id: "essencial", nome: "Essencial", valorMensal: 399, implantacao: 497,
    resumo: "A base organizada para começar a operar com segurança.",
    indicadoPara: "Pequenas instituições que precisam organizar a gestão e os cadastros.",
    mensagemValor: "O cliente entra com uma base acessível e pode adicionar módulos especializados quando precisar.",
    funcionalidades: ["Beneficiários e famílias", "Profissionais e voluntários", "Unidades e serviços", "Cadastros institucionais", "Relatórios básicos", "Dashboard básico", "Usuários, permissões e documentos", "Histórico básico"],
    limites: ["Não inclui módulos especializados", "Módulos adicionais podem ser contratados separadamente", "Implantação: R$ 497,00"], cta: "Escolher Essencial"
  },
  {
    id: "profissional", nome: "Profissional", valorMensal: 699, implantacao: 897, destaque: "Mais escolhido",
    resumo: "A operação diária de atendimento em um único ambiente.",
    indicadoPara: "Instituições em crescimento, com atendimentos frequentes, equipe e projetos.",
    mensagemValor: "Você evolui do cadastro para uma operação assistencial completa, com gestão de atendimentos e equipe.",
    funcionalidades: ["Tudo do Essencial", "Atendimentos, evolução e histórico completo", "Encaminhamentos, benefícios e agenda", "Projetos", "Financeiro básico", "Relatórios gerenciais e dashboard", "Controle de equipe e permissões avançadas", "Gestão Educacional incluída", "Painel de Senhas incluído"],
    limites: ["Frente de Caixa, CIPA e outros módulos podem ser adicionados", "Recursos estratégicos avançados ficam no Premium", "Implantação: R$ 897,00"], cta: "Escolher Profissional"
  },
  {
    id: "premium", nome: "Premium", valorMensal: 999, implantacao: 1497,
    resumo: "Gestão completa para controlar a operação e demonstrar resultados.",
    indicadoPara: "Instituições que precisam integrar finanças, captação, transparência e módulos especializados.",
    mensagemValor: "Você amplia a gestão institucional com indicadores, prestação de contas e recursos para toda a operação.",
    funcionalidades: ["Tudo do Profissional", "Financeiro completo e avançado", "Contas, receitas, despesas e centros de custo", "Fluxo e relatórios financeiros", "Prestação de contas, projetos e indicadores", "Transparência, georreferenciamento e captação", "Doações, campanhas e gestão de doadores", "Frente de Caixa / PDV", "CIPA", "RH básico", "Dashboards avançados e Gestão Educacional completa"],
    limites: ["Multiunidades incluídas", "API básica e integrações conforme contratação", "Implantação: R$ 1.497,00"], cta: "Escolher Premium"
  },
  {
    id: "enterprise", nome: "Enterprise", valorMensal: 1499, implantacao: 2497, destaque: "Completo",
    resumo: "A plataforma completa para governança e crescimento institucional.",
    indicadoPara: "Redes, grandes instituições e organizações com operações complexas.",
    mensagemValor: "Todos os módulos ficam liberados, com estrutura multiunidades, integrações, governança e suporte prioritário.",
    funcionalidades: ["Tudo do Premium", "Governança, auditoria, logs e rastreabilidade", "Aprovações e gestão avançada de usuários", "Matriz, filiais e indicadores consolidados", "RH completo, Jurídico e Financeiro completo", "Compras, patrimônio, estoque e almoxarifado", "API, webhooks e importação de dados", "Integrações personalizadas", "Implantação acompanhada, treinamento e consultoria", "Suporte prioritário"],
    limites: ["A partir de R$ 1.499,00/mês", "Sem bloqueio funcional de módulos", "Implantação a partir de R$ 2.497,00"], cta: "Escolher Enterprise"
  }
];

export const comparativoModulos: ComparativoModulo[] = [
  { modulo: "Gestão Assistencial", essencial: "✓", profissional: "✓", premium: "✓", enterprise: "✓" },
  { modulo: "Beneficiários e famílias", essencial: "✓", profissional: "✓", premium: "✓", enterprise: "✓" },
  { modulo: "Profissionais, voluntários e unidades", essencial: "✓", profissional: "✓", premium: "✓", enterprise: "✓" },
  { modulo: "Atendimentos e projetos", essencial: "—", profissional: "✓", premium: "✓", enterprise: "✓" },
  { modulo: "Financeiro", essencial: "Básico", profissional: "Completo", premium: "Avançado", enterprise: "Completo" },
  { modulo: "Gestão Educacional", essencial: "—", profissional: "✓", premium: "✓", enterprise: "✓" },
  { modulo: "Painel de Senhas", essencial: "—", profissional: "✓", premium: "✓", enterprise: "✓" },
  { modulo: "Frente de Caixa / PDV", essencial: "Adicional", profissional: "Adicional", premium: "✓", enterprise: "✓" },
  { modulo: "CIPA", essencial: "Adicional", profissional: "Adicional", premium: "✓", enterprise: "✓" },
  { modulo: "Captação, doações e transparência", essencial: "—", profissional: "—", premium: "✓", enterprise: "✓" },
  { modulo: "Prestação de contas e georreferenciamento", essencial: "—", profissional: "—", premium: "✓", enterprise: "✓" },
  { modulo: "RH", essencial: "—", profissional: "—", premium: "Básico", enterprise: "Completo" },
  { modulo: "Jurídico", essencial: "—", profissional: "—", premium: "—", enterprise: "✓" },
  { modulo: "Multiunidades", essencial: "—", profissional: "Limitado", premium: "✓", enterprise: "✓" },
  { modulo: "API e integrações", essencial: "—", profissional: "—", premium: "Básicas", enterprise: "Avançadas" },
  { modulo: "Auditoria e governança", essencial: "Básica", profissional: "✓", premium: "✓", enterprise: "Avançada" },
  { modulo: "Suporte prioritário", essencial: "—", profissional: "—", premium: "✓", enterprise: "✓" }
];

export const planoPorId = (id: LicencaUsoPlanoId) => ofertaPlanos.find((plano) => plano.id === id) ?? ofertaPlanos[1];
