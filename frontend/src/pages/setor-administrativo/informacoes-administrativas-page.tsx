import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  KeyRound,
  Link as LinkIcon,
  ListFilter,
  LockKeyhole,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  X
} from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { informacoesAdministrativasService } from "@/services/informacoes-administrativas.service";
import {
  useExcluirInformacaoAdministrativa,
  useExcluirInformacaoAdministrativaCategoria,
  useInformacoesAdministrativas,
  useInformacoesAdministrativasCategorias,
  useSalvarInformacaoAdministrativaCategoria,
  useSalvarInformacaoAdministrativa
} from "@/features/informacoes-administrativas/use-informacoes-administrativas";
import type {
  InformacaoAdministrativa,
  InformacaoAdministrativaCategoria,
  InformacaoAdministrativaPayload
} from "@/types/informacao-administrativa";

type AbaId = "cadastro" | "listagem" | "categorias";
type FormState = Omit<InformacaoAdministrativaPayload, "senhaConfirmacao"> & { id?: string };
type CategoriaFormState = { id?: string; nome: string; ativo: boolean };
type CampoInteligente = { label: string; placeholder: string };
type ModeloCategoriaInteligente = {
  id: string;
  nome: string;
  resumo: string;
  palavrasBusca: string[];
  campos: {
    titulo: CampoInteligente;
    descricao: CampoInteligente;
    usuarioAcesso: CampoInteligente;
    senhaAcesso: CampoInteligente;
    link: CampoInteligente;
    observacoes: CampoInteligente;
  };
};

const abas: AdminTab[] = [
  { id: "cadastro", label: "Cadastro", icon: Pencil },
  { id: "listagem", label: "Listagem", icon: ListFilter },
  { id: "categorias", label: "Categorias", icon: KeyRound }
];

const formVazio: FormState = {
  categoria: "",
  titulo: "",
  descricao: "",
  usuarioAcesso: "",
  senhaAcesso: "",
  link: "",
  observacoes: ""
};

const categoriaFormVazio: CategoriaFormState = {
  nome: "",
  ativo: true
};

const modeloGenerico: ModeloCategoriaInteligente = {
  id: "geral",
  nome: "Informação administrativa",
  resumo: "Modelo geral para guardar registros internos, acessos, links e observações.",
  palavrasBusca: ["administrativo", "interno", "registro", "acesso", "informacao"],
  campos: {
    titulo: { label: "Título *", placeholder: "Ex.: Acesso administrativo do fornecedor" },
    descricao: { label: "Informações", placeholder: "Descreva a informação principal, configuração ou regra de uso." },
    usuarioAcesso: { label: "Usuário ou login", placeholder: "Informe apenas quando existir credencial própria do item." },
    senhaAcesso: { label: "Senha ou chave", placeholder: "Informe apenas a senha ou chave vinculada a este registro." },
    link: { label: "Link ou endereço", placeholder: "URL, IP, caminho de rede ou endereço de acesso." },
    observacoes: { label: "Observações", placeholder: "Local, responsável, validade, suporte e demais cuidados." }
  }
};

const modelosCategorias: ModeloCategoriaInteligente[] = [
  {
    id: "rede",
    nome: "Internet, modem e roteador",
    resumo: "Use para modem, roteador, Wi-Fi, IP de acesso, provedor e configuração de rede.",
    palavrasBusca: [
      "internet",
      "modem",
      "roteador",
      "router",
      "wifi",
      "wi-fi",
      "rede",
      "ip",
      "gateway",
      "provedor",
      "huawei",
      "tplink",
      "tp-link"
    ],
    campos: {
      titulo: { label: "Equipamento ou serviço *", placeholder: "Ex.: Modem Huawei da recepção" },
      descricao: { label: "Configuração de rede", placeholder: "IP, SSID, canal, DNS, provedor, plano e demais parâmetros." },
      usuarioAcesso: { label: "Usuário de acesso", placeholder: "Login do painel do modem, roteador ou provedor." },
      senhaAcesso: { label: "Senha ou chave", placeholder: "Senha do painel, chave Wi-Fi ou senha do provedor." },
      link: { label: "IP, link ou endereço", placeholder: "Ex.: 192.168.1.1 ou link do painel do provedor." },
      observacoes: { label: "Local e observações", placeholder: "Local físico, responsável, etiqueta, data de troca e suporte." }
    }
  },
  {
    id: "email",
    nome: "E-mail institucional",
    resumo: "Use para contas de e-mail, webmail, SMTP, IMAP, recuperação e responsáveis.",
    palavrasBusca: ["email", "e-mail", "webmail", "smtp", "imap", "pop", "gmail", "outlook", "conta"],
    campos: {
      titulo: { label: "Conta ou caixa postal *", placeholder: "Ex.: Financeiro institucional" },
      descricao: { label: "Configurações de e-mail", placeholder: "Servidor, porta, protocolo, recuperação e regras de uso." },
      usuarioAcesso: { label: "E-mail ou login", placeholder: "Conta completa ou usuário do provedor." },
      senhaAcesso: { label: "Senha ou chave de app", placeholder: "Senha, chave de app ou token de acesso." },
      link: { label: "Webmail ou painel", placeholder: "Link do webmail ou painel administrativo." },
      observacoes: { label: "Responsável e observações", placeholder: "Responsável, telefone de recuperação, 2FA e validade." }
    }
  },
  {
    id: "cameras",
    nome: "Câmeras e CFTV",
    resumo: "Use para DVR, NVR, câmeras IP, aplicativo de monitoramento e acesso remoto.",
    palavrasBusca: ["camera", "cameras", "câmera", "câmeras", "cftv", "dvr", "nvr", "monitoramento", "hikvision", "intelbras"],
    campos: {
      titulo: { label: "Equipamento ou sistema *", placeholder: "Ex.: DVR Intelbras portaria" },
      descricao: { label: "Configuração de monitoramento", placeholder: "Canais, IP, portas, app, DDNS e regras de acesso." },
      usuarioAcesso: { label: "Usuário do painel", placeholder: "Login do DVR, NVR, câmera ou aplicativo." },
      senhaAcesso: { label: "Senha de acesso", placeholder: "Senha do equipamento ou aplicativo." },
      link: { label: "Link, IP ou app", placeholder: "IP local, acesso remoto, DDNS ou nome do aplicativo." },
      observacoes: { label: "Local e observações", placeholder: "Ambiente atendido, técnico, manutenção e restrições de acesso." }
    }
  },
  {
    id: "sistema",
    nome: "Sistemas, portais e fornecedores",
    resumo: "Use para sistemas internos, portais externos, fornecedor, suporte e dados de acesso.",
    palavrasBusca: ["sistema", "portal", "fornecedor", "login", "acesso", "erp", "site", "servico", "serviço", "suporte"],
    campos: {
      titulo: { label: "Sistema ou portal *", placeholder: "Ex.: Portal do fornecedor de internet" },
      descricao: { label: "Finalidade e configuração", placeholder: "Para que serve, permissões, perfil e fluxo relacionado." },
      usuarioAcesso: { label: "Usuário ou login", placeholder: "Usuário, e-mail ou código de cliente." },
      senhaAcesso: { label: "Senha, token ou chave", placeholder: "Senha, token, chave API ou credencial de suporte." },
      link: { label: "Link do sistema", placeholder: "URL principal, painel administrativo ou área do cliente." },
      observacoes: { label: "Suporte e observações", placeholder: "Fornecedor, contrato, telefone, vencimento e responsável interno." }
    }
  },
  {
    id: "projeto",
    nome: "Projetos e programas",
    resumo: "Use para projetos sociais, serviços executados, público atendido e vínculos operacionais.",
    palavrasBusca: [
      "projeto",
      "programa",
      "servico",
      "servicos",
      "serviços",
      "musica",
      "música",
      "futebol",
      "volei",
      "vôlei",
      "restaurante",
      "voluntariado",
      "acolhimento",
      "infantil",
      "cadeira",
      "rodas",
      "odontologico",
      "odontológico",
      "gestante",
      "puerpera",
      "puérpera"
    ],
    campos: {
      titulo: { label: "Projeto ou programa *", placeholder: "Ex.: Projeto Sons de Esperança" },
      descricao: { label: "Atividade principal", placeholder: "Ex.: Conservatório de música, restaurante popular ou atendimento odontológico." },
      usuarioAcesso: { label: "Responsável ou setor", placeholder: "Responsável interno, coordenação ou setor vinculado." },
      senhaAcesso: { label: "Código interno", placeholder: "Código, chave de convênio ou referência interna, se houver." },
      link: { label: "Pasta, formulário ou link", placeholder: "Link do Drive, formulário, página pública ou sistema relacionado." },
      observacoes: { label: "Público e observações", placeholder: "Público atendido, local, parceiros, periodicidade e regras de operação." }
    }
  },
  {
    id: "bancario",
    nome: "Informações bancárias",
    resumo: "Use para contas, bancos, agência, operação, Pix, emendas, doações e finalidade financeira.",
    palavrasBusca: [
      "banco",
      "bancario",
      "bancário",
      "conta",
      "corrente",
      "agencia",
      "agência",
      "operacao",
      "operação",
      "pix",
      "cnpj",
      "emenda",
      "doacao",
      "doação",
      "doacoes",
      "doações",
      "caixa",
      "mercado pago",
      "veiculo"
    ],
    campos: {
      titulo: { label: "Conta ou finalidade *", placeholder: "Ex.: Conta corrente para recebimento de doações - Uberlândia" },
      descricao: { label: "Dados bancários", placeholder: "Banco, número do banco, agência, operação, conta, CNPJ, Pix e data de abertura." },
      usuarioAcesso: { label: "Titular ou CNPJ", placeholder: "Ex.: ADRA Uberlândia ou CNPJ da conta." },
      senhaAcesso: { label: "Chave sensível", placeholder: "Use somente se existir chave de acesso bancário autorizada." },
      link: { label: "Link do banco ou extrato", placeholder: "Link de extratos, comprovantes ou painel bancário." },
      observacoes: { label: "Finalidade e observações", placeholder: "Emenda, doação, valor previsto, restrições e responsável financeiro." }
    }
  },
  {
    id: "nuvem",
    nome: "Google Drive, OneDrive e nuvem",
    resumo: "Use para mapeamento de pastas, departamentos, documentos, links compartilhados e acervo digital.",
    palavrasBusca: [
      "drive",
      "google drive",
      "onedrive",
      "sharepoint",
      "nuvem",
      "pasta",
      "documentos",
      "departamento",
      "extratos",
      "comprovantes",
      "lotes",
      "projetos",
      "patrimonio",
      "juridico"
    ],
    campos: {
      titulo: { label: "Pasta ou acervo *", placeholder: "Ex.: Departamento Contábil e Financeiro > Extratos bancários" },
      descricao: { label: "Estrutura da pasta", placeholder: "Caminho completo, subpastas, tipo de documento e regra de organização." },
      usuarioAcesso: { label: "Conta de acesso", placeholder: "Conta Google, Microsoft ou responsável pelo compartilhamento." },
      senhaAcesso: { label: "Senha ou chave", placeholder: "Senha ou chave apenas quando houver credencial própria do acervo." },
      link: { label: "Link da pasta", placeholder: "URL do Google Drive, OneDrive, SharePoint ou pasta compartilhada." },
      observacoes: { label: "Permissões e observações", placeholder: "Quem acessa, nível de permissão, validade do link e cuidados de LGPD." }
    }
  },
  {
    id: "protocolo",
    nome: "Links, protocolos e acessos públicos",
    resumo: "Use para portais de protocolo, requerimentos, links externos, usuário e senha de serviço.",
    palavrasBusca: [
      "link",
      "links",
      "protocolo",
      "protocolos",
      "requerimento",
      "prefeitura",
      "login",
      "usuario",
      "senha",
      "portal",
      "externo"
    ],
    campos: {
      titulo: { label: "Portal ou protocolo *", placeholder: "Ex.: Protocolos da Prefeitura de Uberlândia" },
      descricao: { label: "Uso do acesso", placeholder: "Finalidade, quando usar, tipo de solicitação e fluxo relacionado." },
      usuarioAcesso: { label: "Usuário, CNPJ ou login", placeholder: "CNPJ, e-mail ou usuário do portal." },
      senhaAcesso: { label: "Senha do portal", placeholder: "Senha exclusiva desse portal, nunca a senha do usuário logado." },
      link: { label: "Link do portal", placeholder: "URL de login, requerimento ou consulta." },
      observacoes: { label: "Regras e observações", placeholder: "Responsável, prazos, contatos, documentos exigidos e histórico de uso." }
    }
  },
  {
    id: "compras",
    nome: "Compras web",
    resumo: "Use para lojas, marketplaces, painéis de compra, dados de acesso e regras de compra online.",
    palavrasBusca: [
      "compras",
      "compra",
      "mercado livre",
      "americanas",
      "martins",
      "e-facil",
      "efacil",
      "loja",
      "marketplace",
      "boleto",
      "pedido"
    ],
    campos: {
      titulo: { label: "Loja ou portal *", placeholder: "Ex.: Mercado Livre, E-Facil Martins ou Lojas Americanas" },
      descricao: { label: "Uso do portal", placeholder: "O que comprar, restrições, forma de pagamento e fluxo de aprovação." },
      usuarioAcesso: { label: "E-mail ou usuário", placeholder: "Login usado no portal de compras." },
      senhaAcesso: { label: "Senha do portal", placeholder: "Senha exclusiva do portal, nunca a senha do usuário logado." },
      link: { label: "Link do portal", placeholder: "URL do painel, loja ou área de pedidos." },
      observacoes: { label: "Responsável e observações", placeholder: "Responsável por pedidos, cartão, entrega, notas fiscais e suporte." }
    }
  },
  {
    id: "doacoes",
    nome: "Doações e Pix",
    resumo: "Use para contas de recebimento, página de doação, Pix, QR Code e campanha vinculada.",
    palavrasBusca: [
      "doacao",
      "doação",
      "doacoes",
      "doações",
      "pix",
      "qr code",
      "apoiar",
      "bliiv",
      "risu",
      "mercado pago",
      "caixa",
      "conta",
      "campanha"
    ],
    campos: {
      titulo: { label: "Canal de doação *", placeholder: "Ex.: Pix Caixa, Mercado Pago ou página de doação" },
      descricao: { label: "Dados de recebimento", placeholder: "Banco, agência, operação, conta, chave Pix, CNPJ, e-mail ou QR Code." },
      usuarioAcesso: { label: "Conta ou usuário", placeholder: "E-mail, CNPJ, titular ou usuário do painel de doações." },
      senhaAcesso: { label: "Senha ou chave", placeholder: "Senha do painel de doação, quando houver." },
      link: { label: "Página ou painel", placeholder: "URL da página de doação, painel ou comprovantes." },
      observacoes: { label: "Campanha e observações", placeholder: "Finalidade, unidade, texto para divulgação, suporte e conciliação financeira." }
    }
  },
  {
    id: "certidoes",
    nome: "Certidões e regularidade",
    resumo: "Use para certidões fiscais, trabalhistas, FGTS, TCE, Receita e consultas de regularidade.",
    palavrasBusca: [
      "certidao",
      "certidão",
      "certidoes",
      "certidões",
      "regularidade",
      "fazenda",
      "receita",
      "fgts",
      "tribunal",
      "tce",
      "trabalhista",
      "tst",
      "cnd",
      "cpf",
      "cnpj"
    ],
    campos: {
      titulo: { label: "Certidão ou consulta *", placeholder: "Ex.: Certidão de regularidade FGTS" },
      descricao: { label: "Dados para emissão", placeholder: "CNPJ, órgão emissor, tipo da certidão e finalidade." },
      usuarioAcesso: { label: "Documento ou login", placeholder: "CNPJ, CPF ou login exigido no portal." },
      senhaAcesso: { label: "Senha ou código", placeholder: "Senha, protocolo ou código de acesso, se houver." },
      link: { label: "Link de emissão", placeholder: "URL do portal de emissão ou consulta." },
      observacoes: { label: "Validade e observações", placeholder: "Prazo de validade, rotina de renovação, responsável e pendências." }
    }
  },
  {
    id: "institucional",
    nome: "Dados institucionais",
    resumo: "Use para razão social, nome fantasia, CNPJ, unidade, vínculos institucionais e identificação oficial.",
    palavrasBusca: [
      "razao",
      "razão",
      "social",
      "nome fantasia",
      "fantasia",
      "cnpj",
      "adra",
      "institucional",
      "instituicao",
      "instituição",
      "nucleo",
      "núcleo",
      "agencia",
      "agência"
    ],
    campos: {
      titulo: { label: "Identificação institucional *", placeholder: "Ex.: ADRA núcleo Uberlândia" },
      descricao: { label: "Dados oficiais", placeholder: "Razão social, nome fantasia, CNPJ e identificação da unidade." },
      usuarioAcesso: { label: "Documento principal", placeholder: "CNPJ, inscrição ou código institucional." },
      senhaAcesso: { label: "Código restrito", placeholder: "Código interno ou chave administrativa, se houver." },
      link: { label: "Site ou referência", placeholder: "Site oficial, página institucional ou documento de referência." },
      observacoes: { label: "Observações institucionais", placeholder: "Vínculos, matriz, filial, responsável e demais dados de controle." }
    }
  },
  {
    id: "sede",
    nome: "Sedes, endereços e contatos",
    resumo: "Use para sede administrativa, sede operacional, endereço, CEP, telefone, WhatsApp, site e redes sociais.",
    palavrasBusca: [
      "sede",
      "endereco",
      "endereço",
      "rua",
      "cep",
      "bairro",
      "cidade",
      "uberlandia",
      "uberlândia",
      "telefone",
      "whatsapp",
      "site",
      "facebook",
      "email",
      "e-mail",
      "contato"
    ],
    campos: {
      titulo: { label: "Sede ou canal *", placeholder: "Ex.: Sede operacional Luizote de Freitas" },
      descricao: { label: "Endereço e contato", placeholder: "Rua, número, complemento, CEP, bairro, cidade, UF, telefone e WhatsApp." },
      usuarioAcesso: { label: "Responsável ou canal", placeholder: "Responsável, e-mail principal ou canal de atendimento." },
      senhaAcesso: { label: "Código de acesso", placeholder: "Código de alarme, portaria ou referência interna, se houver." },
      link: { label: "Site, mapa ou rede social", placeholder: "Site, Facebook, Google Maps ou link público relacionado." },
      observacoes: { label: "Observações de localização", placeholder: "Horário de atendimento, referência, uso da sede e cuidados operacionais." }
    }
  },
  {
    id: "credenciamento",
    nome: "Registros e credenciamentos",
    resumo: "Use para CAGEC, Mesa Brasil, CMAS, utilidade pública, CMC, OSC e registros oficiais.",
    palavrasBusca: [
      "registro",
      "registros",
      "credenciamento",
      "cagec",
      "mesa brasil",
      "cmas",
      "utilidade publica",
      "utilidade pública",
      "lei",
      "cmc",
      "osc",
      "secretaria",
      "desenvolvimento social",
      "numero",
      "número"
    ],
    campos: {
      titulo: { label: "Registro ou credenciamento *", placeholder: "Ex.: Registro CAGEC ou CMAS ADRA Uberlândia" },
      descricao: { label: "Dados do registro", placeholder: "Órgão, número, lei, secretaria, finalidade e vínculo institucional." },
      usuarioAcesso: { label: "Contato ou responsável", placeholder: "Nome, e-mail ou setor responsável pelo registro." },
      senhaAcesso: { label: "Código ou protocolo", placeholder: "Número, protocolo ou chave de acompanhamento, se houver." },
      link: { label: "Link de consulta", placeholder: "Portal, certificado, comprovante ou pasta do documento." },
      observacoes: { label: "Validade e observações", placeholder: "Prazo, renovação, pendências, responsável e histórico de atualização." }
    }
  }
];

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function encontrarModeloCategoria(categoria: string) {
  const categoriaNormalizada = normalizarBusca(categoria);
  return (
    modelosCategorias.find((modelo) =>
      modelo.palavrasBusca.some((palavra) => categoriaNormalizada.includes(normalizarBusca(palavra)))
    ) ?? modeloGenerico
  );
}

function podeAcessar(permissoes: string[] | undefined, isSuperadmin?: boolean) {
  return !!isSuperadmin || (permissoes ?? []).some((permissao) => ["ADMINISTRADOR", "MASTER_ADMIN"].includes(permissao));
}

export function InformacoesAdministrativasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("cadastro");
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [senhaLiberada, setSenhaLiberada] = useState("");
  const [form, setForm] = useState<FormState>(formVazio);
  const [snapshot, setSnapshot] = useState<FormState>(formVazio);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [mostrarSenhaAcesso, setMostrarSenhaAcesso] = useState(false);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [categoriaForm, setCategoriaForm] = useState<CategoriaFormState>(categoriaFormVazio);
  const [categoriaSnapshot, setCategoriaSnapshot] = useState<CategoriaFormState>(categoriaFormVazio);
  const [confirmarExcluirCategoria, setConfirmarExcluirCategoria] = useState(false);

  const usuarioAutorizado = podeAcessar(usuario?.permissoes, usuario?.is_superadmin);
  const informacoesQuery = useInformacoesAdministrativas(senhaLiberada, !!senhaLiberada && usuarioAutorizado);
  const categoriasQuery = useInformacoesAdministrativasCategorias(senhaLiberada, !!senhaLiberada && usuarioAutorizado);
  const salvarMutation = useSalvarInformacaoAdministrativa();
  const excluirMutation = useExcluirInformacaoAdministrativa();
  const salvarCategoriaMutation = useSalvarInformacaoAdministrativaCategoria();
  const excluirCategoriaMutation = useExcluirInformacaoAdministrativaCategoria();
  const informacoes = informacoesQuery.data ?? [];
  const categorias = categoriasQuery.data ?? [];
  const categoriasAtivas = categorias.filter((item) => item.ativo);
  const modeloCategoria = useMemo(() => encontrarModeloCategoria(form.categoria), [form.categoria]);
  const acaoEmAndamento =
    salvarMutation.isPending ||
    excluirMutation.isPending ||
    salvarCategoriaMutation.isPending ||
    excluirCategoriaMutation.isPending ||
    informacoesQuery.isFetching ||
    categoriasQuery.isFetching;

  const informacoesFiltradas = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return informacoes.filter((item) => {
      const atendeCategoria = categoriaFiltro ? item.categoria === categoriaFiltro : true;
      const modeloItem = encontrarModeloCategoria(item.categoria);
      const alvo = normalizarBusca(
        [
          item.categoria,
          item.titulo,
          item.descricao,
          item.usuarioAcesso,
          item.link,
          item.observacoes,
          modeloItem.nome,
          modeloItem.resumo,
          modeloItem.palavrasBusca.join(" ")
        ].join(" ")
      );
      return atendeCategoria && (!termos.length || termos.every((termo) => alvo.includes(termo)));
    });
  }, [busca, categoriaFiltro, informacoes]);

  useEffect(() => {
    if (form.categoria || !categoriasAtivas.length) return;
    setForm((atual) => ({ ...atual, categoria: categoriasAtivas[0].nome }));
    setSnapshot((atual) => ({ ...atual, categoria: categoriasAtivas[0].nome }));
  }, [categoriasAtivas, form.categoria]);

  async function confirmarAcesso() {
    if (!senhaConfirmacao.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe a senha do usuário logado para liberar a consulta."
      });
      return;
    }

    try {
      const [informacoes, categorias] = await Promise.all([
        informacoesAdministrativasService.listar(senhaConfirmacao),
        informacoesAdministrativasService.listarCategorias(senhaConfirmacao)
      ]);
      queryClient.setQueryData(
        ["informacoes-administrativas", usuario?.tenant_id ?? "sem-tenant"],
        informacoes
      );
      queryClient.setQueryData(
        ["informacoes-administrativas-categorias", usuario?.tenant_id ?? "sem-tenant"],
        categorias
      );
      setSenhaLiberada(senhaConfirmacao);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Acesso liberado",
        texto: "As informações administrativas foram liberadas para esta sessão da tela."
      });
    } catch (error: any) {
      setSenhaLiberada("");
      setPopupMensagem({
        tipo: "erro",
        titulo: "Acesso negado",
        texto: error?.response?.data?.message ?? "Não foi possível confirmar a senha."
      });
    }
  }

  function novo() {
    setForm(formVazio);
    setSnapshot(formVazio);
    setMostrarSenhaAcesso(false);
    setAbaAtiva("cadastro");
  }

  function novaCategoria() {
    setCategoriaForm(categoriaFormVazio);
    setCategoriaSnapshot(categoriaFormVazio);
    setAbaAtiva("categorias");
  }

  function selecionar(item: InformacaoAdministrativa) {
    const proximo: FormState = {
      id: item.id,
      categoria: item.categoria,
      titulo: item.titulo,
      descricao: item.descricao,
      usuarioAcesso: item.usuarioAcesso,
      senhaAcesso: item.senhaAcesso,
      link: item.link,
      observacoes: item.observacoes
    };
    setForm(proximo);
    setSnapshot(proximo);
    setMostrarSenhaAcesso(false);
    setAbaAtiva("cadastro");
  }

  function selecionarCategoria(item: InformacaoAdministrativaCategoria) {
    const proximo: CategoriaFormState = {
      id: item.id,
      nome: item.nome,
      ativo: item.ativo
    };
    setCategoriaForm(proximo);
    setCategoriaSnapshot(proximo);
    setAbaAtiva("categorias");
  }

  function limparFiltros() {
    setBusca("");
    setCategoriaFiltro("");
  }

  function cancelar() {
    if (abaAtiva === "categorias") {
      setCategoriaForm(categoriaSnapshot);
      return;
    }
    setForm(snapshot);
  }

  async function salvar() {
    if (!senhaLiberada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Acesso bloqueado",
        texto: "Confirme a senha antes de salvar informações sigilosas."
      });
      return;
    }

    if (!form.titulo.trim() || !form.categoria.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha categoria e título."
      });
      return;
    }

    try {
      const salvo = await salvarMutation.mutateAsync({
        id: form.id,
        categoria: form.categoria.trim(),
        titulo: form.titulo.trim(),
        descricao: form.descricao?.trim() || undefined,
        usuarioAcesso: form.usuarioAcesso?.trim() || undefined,
        senhaAcesso: form.senhaAcesso?.trim() || undefined,
        link: form.link?.trim() || undefined,
        observacoes: form.observacoes?.trim() || undefined,
        senhaConfirmacao: senhaLiberada
      });
      selecionar(salvo);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Informação administrativa salva com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a informação administrativa."
      });
    }
  }

  async function salvarCategoria() {
    if (!senhaLiberada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Acesso bloqueado",
        texto: "Confirme a senha antes de salvar categorias."
      });
      return;
    }

    if (!categoriaForm.nome.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o nome da categoria."
      });
      return;
    }

    try {
      const salva = await salvarCategoriaMutation.mutateAsync({
        id: categoriaForm.id,
        nome: categoriaForm.nome.trim(),
        ativo: categoriaForm.ativo,
        senhaConfirmacao: senhaLiberada
      });
      selecionarCategoria(salva);
      setForm((atual) => (atual.categoria ? atual : { ...atual, categoria: salva.nome }));
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Categoria salva com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a categoria."
      });
    }
  }

  async function confirmarExclusao() {
    if (!form.id) return;
    try {
      await excluirMutation.mutateAsync({ id: form.id, senhaConfirmacao: senhaLiberada });
      setConfirmarExcluir(false);
      novo();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Informação administrativa excluída com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir a informação administrativa."
      });
    }
  }

  async function confirmarExclusaoCategoria() {
    if (!categoriaForm.id) return;
    try {
      await excluirCategoriaMutation.mutateAsync({ id: categoriaForm.id, senhaConfirmacao: senhaLiberada });
      setConfirmarExcluirCategoria(false);
      setCategoriaForm(categoriaFormVazio);
      setCategoriaSnapshot(categoriaFormVazio);
      if (form.categoria === categoriaForm.nome) {
        setForm((atual) => ({ ...atual, categoria: "" }));
      }
      if (categoriaFiltro === categoriaForm.nome) {
        setCategoriaFiltro("");
      }
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Categoria excluída com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir a categoria."
      });
    }
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  const abaCategoriasAtiva = abaAtiva === "categorias";
  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline", disabled: !senhaLiberada },
    {
      label: abaCategoriasAtiva ? "Nova categoria" : "Novo",
      icon: Plus,
      onClick: abaCategoriasAtiva ? novaCategoria : novo,
      variant: "default",
      disabled: acaoEmAndamento || !senhaLiberada
    },
    {
      label: abaCategoriasAtiva ? "Salvar categoria" : "Salvar",
      icon: Save,
      onClick: () => void (abaCategoriasAtiva ? salvarCategoria() : salvar()),
      variant: "default",
      disabled: acaoEmAndamento || !senhaLiberada
    },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: acaoEmAndamento || !senhaLiberada },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: () => (abaCategoriasAtiva ? setConfirmarExcluirCategoria(true) : setConfirmarExcluir(true)),
      variant: "danger",
      disabled: acaoEmAndamento || !senhaLiberada || (abaCategoriasAtiva ? !categoriaForm.id : !form.id)
    },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  if (!usuarioAutorizado) {
    return (
      <main className="p-4">
        <Card className="border-[var(--g3-border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Acesso restrito
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--g3-muted)]">
            Somente usuários master ou administradores podem acessar informações administrativas.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Administração e gestão"
        pageTitle="Gestão de informações administrativas"
        activeTitle={senhaLiberada ? abas.find((item) => item.id === abaAtiva)?.label : "Confirmação de acesso"}
        activeIcon={senhaLiberada ? undefined : LockKeyhole}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {!senhaLiberada ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <LockKeyhole className="h-4 w-4" />
                  Confirmar acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-[var(--g3-muted)]">
                  Esta tela guarda registros, acessos, senhas, links e dados de controle interno. Confirme a senha do usuário logado para consultar ou alterar os dados.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="senha_confirmacao">Senha do usuário logado</Label>
                  <Input
                    id="senha_confirmacao"
                    name="confirmacao_acesso_informacoes_administrativas"
                    type="password"
                    autoComplete="current-password"
                    value={senhaConfirmacao}
                    onChange={(event) => setSenhaConfirmacao(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void confirmarAcesso();
                    }}
                  />
                </div>
                <Button type="button" onClick={() => void confirmarAcesso()} disabled={informacoesQuery.isFetching}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {informacoesQuery.isFetching ? "Confirmando..." : "Confirmar acesso"}
                </Button>
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)] bg-[var(--g3-card-soft)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Escopo da tela</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[var(--g3-muted)]">
                <p>Use esta área para registros institucionais, internet, e-mails, câmeras, sistemas e links internos.</p>
                <p>O backend exige permissão administrativa e senha confirmada a cada operação.</p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {senhaLiberada && abaAtiva === "cadastro" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  id="categoria"
                  value={form.categoria}
                  onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
                >
                  <option value="">Selecione a categoria</option>
                  {form.categoria && !categoriasAtivas.some((categoria) => categoria.nome === form.categoria) ? (
                    <option value={form.categoria}>{form.categoria}</option>
                  ) : null}
                  {categoriasAtivas.map((categoria) => (
                    <option key={categoria.id} value={categoria.nome}>
                      {categoria.nome}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-[var(--g3-muted)]">{modeloCategoria.resumo}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="titulo">{modeloCategoria.campos.titulo.label}</Label>
                <Input
                  id="titulo"
                  placeholder={modeloCategoria.campos.titulo.placeholder}
                  value={form.titulo}
                  onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="descricao">{modeloCategoria.campos.descricao.label}</Label>
                <Textarea
                  id="descricao"
                  rows={5}
                  placeholder={modeloCategoria.campos.descricao.placeholder}
                  value={form.descricao}
                  onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="usuario_acesso">{modeloCategoria.campos.usuarioAcesso.label}</Label>
                <Input
                  id="usuario_acesso"
                  name={`g3n_info_adm_campo_${form.id ?? "novo"}`}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  placeholder={modeloCategoria.campos.usuarioAcesso.placeholder}
                  value={form.usuarioAcesso}
                  onChange={(event) => setForm((current) => ({ ...current, usuarioAcesso: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="senha_acesso">{modeloCategoria.campos.senhaAcesso.label}</Label>
                <div className="flex gap-2">
                  <Input
                    id="senha_acesso"
                    name={`g3n_info_adm_valor_${form.id ?? "novo"}`}
                    type={mostrarSenhaAcesso ? "text" : "password"}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    placeholder={modeloCategoria.campos.senhaAcesso.placeholder}
                    value={form.senhaAcesso}
                    onChange={(event) => setForm((current) => ({ ...current, senhaAcesso: event.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 px-0"
                    title={mostrarSenhaAcesso ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setMostrarSenhaAcesso((current) => !current)}
                  >
                    {mostrarSenhaAcesso ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="link">{modeloCategoria.campos.link.label}</Label>
                <Input
                  id="link"
                  placeholder={modeloCategoria.campos.link.placeholder}
                  value={form.link}
                  onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="observacoes">{modeloCategoria.campos.observacoes.label}</Label>
                <Textarea
                  id="observacoes"
                  rows={4}
                  placeholder={modeloCategoria.campos.observacoes.placeholder}
                  value={form.observacoes}
                  onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
                />
              </div>
            </div>
          </section>
        ) : null}

        {senhaLiberada && abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-end">
              <div className="space-y-1">
                <Label htmlFor="busca">Buscar</Label>
                <Input
                  id="busca"
                  placeholder="Digite modem, CNPJ, CAGEC, CMAS, sede, banco, Pix, projeto, Drive, certidão, protocolo ou loja"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="categoria_filtro">Categoria</Label>
                <Select
                  id="categoria_filtro"
                  value={categoriaFiltro}
                  onChange={(event) => setCategoriaFiltro(event.target.value)}
                >
                  <option value="">Todas</option>
                  {categoriasAtivas.map((categoria) => (
                    <option key={categoria.id} value={categoria.nome}>
                      {categoria.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={limparFiltros}>
                <Undo2 className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>

            <div className="max-h-[520px] overflow-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Usuário</th>
                    <th className="px-3 py-2 text-left">Link</th>
                    <th className="px-3 py-2 text-left">Atualizado em</th>
                  </tr>
                </thead>
                <tbody>
                  {informacoesQuery.isFetching ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                        Carregando informações...
                      </td>
                    </tr>
                  ) : informacoesFiltradas.length ? (
                    informacoesFiltradas.map((item) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-t border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft)]/60 ${
                          form.id === item.id ? "bg-[var(--g3-primary-soft)]" : "bg-[var(--g3-card)]"
                        }`}
                        onClick={() => selecionar(item)}
                      >
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--g3-card-soft)] px-2 py-1 text-xs font-semibold">
                            <KeyRound className="h-3 w-3" />
                            {item.categoria}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">{item.titulo}</td>
                        <td className="px-3 py-2">{item.usuarioAcesso || "-"}</td>
                        <td className="px-3 py-2">
                          {item.link ? (
                            <span className="inline-flex max-w-[260px] items-center gap-1 truncate">
                              <LinkIcon className="h-3 w-3 shrink-0" />
                              {item.link}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-2">{new Date(item.atualizadoEm).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                        Nenhuma informação administrativa encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {senhaLiberada && abaAtiva === "categorias" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <KeyRound className="h-4 w-4" />
                  {categoriaForm.id ? "Editar categoria inteligente" : "Cadastrar categoria inteligente"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="categoria_nome">Nome da categoria *</Label>
                  <Input
                    id="categoria_nome"
                    value={categoriaForm.nome}
                    onChange={(event) => setCategoriaForm((atual) => ({ ...atual, nome: event.target.value }))}
                  />
                  <p className="text-xs text-[var(--g3-muted)]">
                    O sistema identifica o modelo pelos termos do nome da categoria. Ex.: modem, banco, Pix, Drive, certidão ou compras.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--g3-foreground)]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--g3-border)]"
                    checked={categoriaForm.ativo}
                    onChange={(event) => setCategoriaForm((atual) => ({ ...atual, ativo: event.target.checked }))}
                  />
                  Categoria ativa
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" onClick={() => void salvarCategoria()} disabled={acaoEmAndamento}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar categoria
                  </Button>
                  <Button type="button" variant="outline" onClick={novaCategoria} disabled={acaoEmAndamento}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova categoria
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="max-h-[360px] overflow-auto rounded-lg border border-[var(--g3-border)]">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Modelo aplicado</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Atualizado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriasQuery.isFetching ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                          Carregando categorias...
                        </td>
                      </tr>
                    ) : categorias.length ? (
                      categorias.map((item) => {
                        const modelo = encontrarModeloCategoria(item.nome);
                        return (
                          <tr
                            key={item.id}
                            className={`cursor-pointer border-t border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft)]/60 ${
                              categoriaForm.id === item.id ? "bg-[var(--g3-primary-soft)]" : "bg-[var(--g3-card)]"
                            }`}
                            onClick={() => selecionarCategoria(item)}
                          >
                            <td className="px-3 py-2 font-medium">{item.nome}</td>
                            <td className="px-3 py-2">{modelo.nome}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                  item.ativo
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {item.ativo ? "Ativa" : "Inativa"}
                              </span>
                            </td>
                            <td className="px-3 py-2">{new Date(item.atualizadoEm).toLocaleString("pt-BR")}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                          Nenhuma categoria cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {modelosCategorias.map((modelo) => (
                  <Card key={modelo.id} className="border-[var(--g3-border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{modelo.nome}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-[var(--g3-muted)]">
                      <p>{modelo.resumo}</p>
                      <p className="text-xs">Termos: {modelo.palavrasBusca.slice(0, 8).join(", ")}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar exclusão"
        texto="Esta informação administrativa será removida da listagem. Deseja continuar?"
        processando={excluirMutation.isPending}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />
      <PopupConfirmacao
        aberto={confirmarExcluirCategoria}
        titulo="Confirmar exclusão"
        texto="A categoria será removida apenas se não estiver em uso. Deseja continuar?"
        processando={excluirCategoriaMutation.isPending}
        onCancel={() => setConfirmarExcluirCategoria(false)}
        onConfirm={() => void confirmarExclusaoCategoria()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
