import { useMemo, useState } from "react";
import {
  BookOpenText,
  Brain,
  CheckCircle2,
  HeartHandshake,
  Link2,
  PiggyBank,
  Search,
  Settings2,
  ShoppingBasket,
  SlidersHorizontal,
  UserRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminPageLayout, type AdminTab } from "@/components/admin/admin-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ManualSecao = {
  id: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  telas: Array<{
    nome: string;
    objetivo: string;
    comoUsar: string[];
    atencoes?: string[];
  }>;
};

const abas: AdminTab[] = [{ id: "manual", label: "Manual do sistema", icon: BookOpenText }];

const secoesManual: ManualSecao[] = [
  {
    id: "visao-geral",
    titulo: "Visão geral",
    descricao: "Entenda a lógica do G3N e o fluxo recomendado de operação.",
    icon: BookOpenText,
    telas: [
      {
        nome: "Como o G3N está organizado",
        objetivo: "Explica a navegação principal por cadastros, atendimentos, setores e configurações.",
        comoUsar: [
          "Comece pelos cadastros para garantir base confiável de beneficiários, famílias e profissionais.",
          "Use Atendimentos para registrar movimentações sociais, benefícios, inscrições e acompanhamentos.",
          "Use Configurações gerais para manter parâmetros, usuários, IA e o próprio manual atualizados."
        ],
        atencoes: [
          "Toda informação crítica deve ser validada antes do salvamento.",
          "Sempre mantenha cadastros e vínculos familiares consistentes para evitar duplicidade de concessão."
        ]
      }
    ]
  },
  {
    id: "beneficiarios",
    titulo: "Beneficiários",
    descricao: "Cadastro individual, documentos, pendências e visão social do beneficiário.",
    icon: UserRound,
    telas: [
      {
        nome: "Cadastro de beneficiários",
        objetivo: "Cadastrar, revisar e atualizar dados pessoais, documentos, endereço e histórico do beneficiário.",
        comoUsar: [
          "Preencha os dados pessoais principais e confira campos obrigatórios destacados.",
          "Revise a aba de documentos e use a regra de obrigatoriedade definida em parâmetros do sistema.",
          "Ao abrir um beneficiário, leia o aviso de pendências antes de continuar o atendimento."
        ],
        atencoes: [
          "CPF, e-mail, telefone e CEP devem respeitar as máscaras e validações padronizadas.",
          "Pendências de cadastro impactam atendimentos, benefícios e relatórios.",
          "O aviso de pendências abre com rolagem interna quando houver muitos itens, mantendo o botão de fechamento sempre acessível.",
          "Em produção, o envio de documentos depende de permissão de escrita na pasta de storage do servidor e do vínculo válido do usuário autenticado.",
          "Capturas de documentos pela webcam passam por compressão antes do salvamento e exibem mensagem detalhada quando a imagem não puder ser processada.",
          "Ao salvar o cadastro, anexos que não tiverem sido processados corretamente retornam mensagem orientando novo envio, em vez de erro interno genérico."
        ]
      }
    ]
  },
  {
    id: "familias",
    titulo: "Vínculo familiar",
    descricao: "Gestão da família como núcleo principal de atendimento, moradia e concessão.",
    icon: Link2,
    telas: [
      {
        nome: "Vínculo familiar",
        objetivo: "Montar a composição familiar, definir responsável, consolidar endereço e manter histórico do núcleo.",
        comoUsar: [
          "Use a aba Listagem de famílias para localizar um núcleo já cadastrado ou iniciar uma nova família.",
          "Na aba Composição familiar, adicione membros, informe o parentesco e defina um único responsável ativo.",
          "Quando o membro sair do núcleo, use transferência ou desmembramento para preservar histórico e rastreabilidade."
        ],
        atencoes: [
          "Não marque outro responsável se já existir um responsável ativo.",
          "Membros configurados para usar o endereço da família herdam o endereço principal do núcleo."
        ]
      }
    ]
  },
  {
    id: "atendimentos",
    titulo: "Atendimentos",
    descricao: "Tela operacional central do relacionamento com beneficiários e famílias.",
    icon: HeartHandshake,
    telas: [
      {
        nome: "Central de Atendimentos",
        objetivo: "Consultar visão 360º, registrar atendimentos, benefícios, inscrições, encaminhamentos e custos.",
        comoUsar: [
          "Use a busca inteligente para localizar rapidamente o beneficiário por nome, código, CPF, telefone ou família.",
          "Abra a aba Resumo para ver alertas, indicadores e movimentações recentes.",
          "Registre novos atendimentos, benefícios, inscrições e encaminhamentos nas abas específicas para manter o histórico consolidado."
        ],
        atencoes: [
          "Antes de conceder benefícios críticos, confira alertas automáticos de duplicidade no beneficiário e no grupo familiar.",
          "A aba Custos resume impacto mensal, anual e histórico do beneficiário e da família."
        ]
      },
      {
        nome: "Inscrições",
        objetivo: "Gerenciar inscrições em cursos, oficinas e atividades.",
        comoUsar: [
          "Consulte a listagem de inscrições para localizar status, vaga e situação do participante.",
          "Use os dados da inscrição para registrar turma, responsável, datas e observações.",
          "Revise a fila de espera e a situação de vagas para apoiar decisões de encaminhamento.",
          "Na aba Presença, gere a data da aula, salve as presenças e use Excluir data de presença quando precisar remover apenas a data gerada sem apagar o curso."
        ],
        atencoes: [
          "O botão Excluir da barra superior remove todo o curso configurado e exige confirmação específica antes da exclusão."
        ]
      }
    ]
  },
  {
    id: "dashboard",
    titulo: "Dashboard territorial",
    descricao: "Leitura geográfica para localizar vulnerabilidades, rede de apoio e áreas de risco.",
    icon: Search,
    telas: [
      {
        nome: "Georreferenciamento",
        objetivo: "Cruzar camadas do território para localizar beneficiários, famílias, cestas, violência, instituições e doadores em um único mapa.",
        comoUsar: [
          "Use os filtros laterais para escolher camadas, bairros e período antes de atualizar a leitura territorial.",
          "O botão Idosos sozinhos aplica foco em beneficiários e famílias com faixa etária idoso e sinais de vulnerabilidade alimentar.",
          "O botão Aguardando cestas concentra famílias e beneficiários com necessidade urgente de alimentos para apoiar priorização operacional.",
          "O botão Mapa de apoio e risco cruza violência, cestas entregues, instituições e doadores em visão agregada para leitura estratégica."
        ],
        atencoes: [
          "Os atalhos estratégicos ajustam filtros automaticamente e podem ser combinados com bairro e período.",
          "As camadas Instituições e Doadores ficam disponíveis na lista O que ver no mapa? para aprofundar a análise territorial."
        ]
      }
    ]
  },
  {
    id: "administrativo",
    titulo: "Setor administrativo",
    descricao: "Rotinas de apoio operacional e controle interno do G3N.",
    icon: SlidersHorizontal,
    telas: [
      {
        nome: "Almoxarifado",
        objetivo: "Controlar cadastros, kits, movimentações e a visualização consolidada dos produtos armazenados.",
        comoUsar: [
          "Use a aba Listagem de produtos para ver todos os produtos cadastrados no almoxarifado com a quantidade em estoque.",
          "Clique em um produto da listagem para abrir o item no cadastro e continuar edição ou conferência.",
          "Use a aba Movimentações para registrar entradas, saídas e ajustes de estoque."
        ],
        atencoes: [
          "A consulta de produtos fica centralizada na aba Listagem de produtos.",
          "Cadastros e movimentações devem permanecer coerentes para evitar divergência de saldo."
        ]
      },
      {
        nome: "Gestão de documentos",
        objetivo: "Controlar documentos institucionais, anexar o arquivo principal e manter histórico de atualizações do documento.",
        comoUsar: [
          "Cadastre ou selecione um documento na lista para abrir o detalhamento completo.",
          "Use a seção Arquivo do documento para anexar, substituir, visualizar, imprimir ou excluir o arquivo principal em um clique.",
          "Após cada alteração relevante, consulte o histórico do documento para acompanhar registros de cadastro, envio, troca e remoção de anexo."
        ],
        atencoes: [
          "O sistema aceita anexos PDF, JPG e PNG e grava apenas o caminho do arquivo no cadastro do documento.",
          "Se o documento já estiver salvo, o anexo é armazenado no storage do sistema e permanece disponível para substituição e exclusão sem duplicar arquivo no banco."
        ]
      }
    ]
  },
  {
    id: "financeiro",
    titulo: "Setor financeiro",
    descricao: "Controle contábil, lançamentos, fluxo de caixa e operações financeiras do G3N.",
    icon: PiggyBank,
    telas: [
      {
        nome: "Contabilidade / financeiro",
        objetivo: "Gerenciar lançamentos, contas, movimentações, anexos e demais rotinas financeiras em uma única central.",
        comoUsar: [
          "Use a aba Lançamentos para cadastrar, editar, baixar e acompanhar receitas, despesas e ajustes.",
          "Use a aba Centro de custo para cadastrar centros ativos antes de vincular lançamentos e movimentações financeiras.",
          "Quando um lançamento já estiver pago, recebido ou conciliado, use o botão Extornar para alterar o status para estornado em um clique.",
          "Na aba Fluxo de caixa, registre entradas e saídas manuais com descrição, conta, data, valor e centro de custo quando aplicável.",
          "Após o estorno, revise os filtros e a listagem para confirmar o novo status do lançamento antes de seguir com outras ações."
        ],
        atencoes: [
          "O estorno só é permitido para lançamentos com status pago, recebido ou conciliado.",
          "O campo Categoria textual foi removido do fluxo de caixa e o centro de custo deve ser selecionado apenas entre opções ativas cadastradas.",
          "Lançamentos já estornados não devem ser estornados novamente."
        ]
      },
      {
        nome: "Recebimento de doações",
        objetivo: "Registrar doações recebidas com doador vinculado, classificação oficial por tipo e organização separada entre dados do registro e itens recebidos.",
        comoUsar: [
          "Na aba Dados da doação, selecione o doador, informe tipo, status e data de recebimento. Ao escolher o tipo, o sistema mostra ao lado o destino de entrada da doação, como Contabilidade, Almoxarifado ou Patrimônio.",
          "Use apenas os tipos Doação financeira, Doação de bens de consumo e Doação de bens permanentes.",
          "Na aba Dados da doação ficam apenas as informações principais do registro: doador, tipo, status, data de recebimento e observações.",
          "Depois de registrar os dados principais, use a aba Itens recebidos, agora na posição 4, para lançar os produtos, quantidade, valor unitário e valor total da doação.",
          "Na aba Cadastro do doador, os campos visíveis seguem o padrão da migração: digitação livre, normalização visual ao sair do campo e normalização final antes do salvamento.",
          "Quando a doação financeira for recorrente, marque Doação recorrente e selecione a periodicidade entre única, diário, semanal, mensal ou anual.",
          "Use Observações como complemento curto do registro quando precisar detalhar a doação."
        ],
        atencoes: [
          "Doações financeiras seguem entrada financeira na Contabilidade.",
          "Doações de bens de consumo seguem entrada no Almoxarifado e doações de bens permanentes seguem entrada no Patrimônio.",
          "Os itens devem ser mantidos apenas na aba Itens recebidos para evitar duplicidade de informação.",
          "Na aba Itens recebidos, o sistema calcula automaticamente o valor total pela quantidade multiplicada pelo valor unitário.",
          "Ao salvar a doação, o sistema consolida os itens lançados para preencher a quantidade total e os valores do registro automaticamente.",
          "Os campos monetários dos itens exibem máscara brasileira e o sistema grava o valor numérico sem formatação visual."
        ]
      },
      {
        nome: "Cadastro de beneficiários",
        objetivo: "Manter o cadastro social completo do beneficiário com documentos, contatos, endereço e demais informações obrigatórias.",
        comoUsar: [
          "Na aba Documentos, anexe ou capture os arquivos aceitos pelo sistema antes de salvar o cadastro.",
          "Se houver falha no processamento de um documento, o sistema agora informa qual documento apresentou erro e o motivo real retornado pelo backend.",
          "Revise nome do arquivo, tipo aceito, tamanho e integridade do anexo quando houver mensagem específica na tela."
        ],
        atencoes: [
          "A tela não deve mais exibir apenas erro interno do servidor nesse fluxo de documentos quando houver um motivo tratável.",
          "Mensagens de validação e persistência agora priorizam o motivo operacional real do erro."
        ]
      }
    ]
  },
  {
    id: "vendas",
    titulo: "Setor vendas",
    descricao: "Operacao de caixa para vendas de produtos em uma tela exclusiva de atendimento.",
    icon: ShoppingBasket,
    telas: [
      {
        nome: "Frente de caixa",
        objetivo: "Executar vendas em um modo dedicado, com busca de produtos do almoxarifado, lista de itens, subtotal, baixa de estoque, cliente opcional, historico persistido e impressao de notinha simples.",
        comoUsar: [
          "Acesse Setor vendas > Frente de caixa para abrir a operacao em tela exclusiva.",
          "Use a busca principal para localizar produtos por codigo ou nome e informe a quantidade antes de adicionar o item.",
          "Acompanhe a lista de itens, o subtotal e o historico lateral antes de abrir o pagamento e concluir a baixa do estoque.",
          "Use os atalhos do modelo para ajuda, busca, quantidade, pagamento e cancelamento de item.",
          "Ao concluir o pagamento, use a impressao da notinha simples como comprovante da venda."
        ],
        atencoes: [
          "Nesta entrega a frente de caixa usa os produtos reais do almoxarifado e registra a baixa simples de estoque na conclusao da venda.",
          "O fluxo considera impressao de notinha simples, sem emissao de nota fiscal ou TEF, mas com cliente opcional e historico de vendas salvo no sistema.",
          "Ao evoluir o modulo, manter o fluxo com um clique, feedback visual e revisao do manual na mesma entrega."
        ]
      },
      {
        nome: "Historico de vendas",
        objetivo: "Consultar vendas ja registradas, aplicar filtros e reimprimir a notinha simples de cada atendimento.",
        comoUsar: [
          "Acesse Setor vendas > Historico de vendas para abrir a tela de consulta dentro do sistema.",
          "Filtre por cliente, forma de pagamento, data inicial e data final para localizar a venda desejada.",
          "Selecione uma venda da lista para visualizar cliente, pagamento, total e itens vendidos.",
          "Use o botao de impressao para reemitir a notinha simples do atendimento selecionado."
        ],
        atencoes: [
          "A consulta usa o historico persistido pelo modulo de vendas e mostra os dados gravados no fechamento do caixa.",
          "A reimpressao gera apenas comprovante simples, sem valor fiscal.",
          "Ao alterar filtros, manter o uso com um clique e feedback visual durante o carregamento."
        ]
      },
      {
        nome: "Carteira digital do evento",
        objetivo: "Controlar creditos pre-pagos por participante em eventos da instituicao, com QR Code seguro, recarga, consumo nas barracas, extrato, dashboard e fechamento operacional em desktop e celular.",
        comoUsar: [
          "Acesse Setor vendas > Carteira digital do evento para abrir o modulo completo dentro do sistema.",
          "No fluxo administrativo, comece pelo cadastro do evento e defina nome, tipo, periodo, status, regras de recarga, transferencia, estorno, validade do credito, centro de receita e observacoes.",
          "Na aba Cadastros, use o proprio formulario em modo Novo ou Editar. Quando quiser iniciar um cadastro limpo, use o botao Novo evento, Nova barraca ou Novo item.",
          "Depois cadastre os participantes do evento com nome, telefone, CPF opcional, responsavel opcional, numero da carteira e status. O sistema gera um token unico para o QR Code e usa o numero da carteira no codigo de barras para facilitar a leitura em leitores fisicos.",
          "Use a impressao do cartao ou comanda quando precisar entregar o identificador fisico ao participante, com opcao de QR Code e codigo de barras, ou apresente o codigo diretamente no celular.",
          "Cadastre barracas ou pontos de venda e em seguida os itens do evento com categoria, preco, estoque opcional e ordem de exibicao para organizar a operacao.",
          "Para carregar saldo, use a recarga da carteira informando participante, valor, forma de pagamento e observacao. O sistema atualiza o saldo e registra a movimentacao no extrato.",
          "Na operacao da barraca, selecione a barraca, monte a compra com os itens, leia ou informe o token da carteira, confira o nome do participante e o saldo atual e confirme a venda.",
          "Quando a venda for confirmada, o sistema consulta o saldo no banco em tempo real, bloqueia saldo insuficiente, debita o valor aprovado e grava barraca, operador, horario, itens e total.",
          "Use transferencia entre carteiras, ajuste manual, bloqueio, desbloqueio, segunda via, extrato, dashboard e fechamento para controlar todo o evento ate a prestacao de contas.",
          "No celular, priorize a leitura ou digitacao do token, a visualizacao do QR Code em tamanho grande, a consulta rapida de saldo e a operacao objetiva nas barracas.",
          "Passo a passo recomendado: 1. cadastre o evento. 2. cadastre participantes. 3. gere ou imprima os QR Codes. 4. cadastre barracas e itens. 5. faca as recargas. 6. realize as vendas nas barracas. 7. acompanhe extrato e dashboard durante o evento. 8. execute o fechamento ao final.",
          "Perguntas frequentes: se o participante perdeu o QR Code, use segunda via e, se necessario, invalide o codigo anterior. Se o saldo nao for suficiente, interrompa a venda e siga com recarga, ajuste autorizado ou cancelamento. Se houver duvida sobre movimentos da carteira, consulte o extrato completo do participante."
        ],
        atencoes: [
          "O QR Code usa um token seguro e o codigo de barras usa o numero da carteira. Em ambos os casos o saldo permanece salvo e validado exclusivamente no banco.",
          "A venda bloqueia saldo insuficiente, evita saldo negativo por padrao e usa chave de operacao para reduzir duplicidade por clique repetido.",
          "Para registrar recargas e vendas, o evento deve estar com status Ativo na aba de cadastro do proprio modulo.",
          "O modulo persiste eventos, participantes, barracas, itens, vendas, itens da venda e extrato de movimentacoes em banco real, com auditoria do operador.",
          "O QR Code nao leva saldo gravado. Toda validacao financeira e feita no servidor, consultando o banco antes de aprovar consumo, transferencia ou ajuste.",
          "Se o saldo da carteira for insuficiente, a venda deve ser interrompida e o operador deve seguir com recarga, ajuste autorizado ou cancelamento da compra.",
          "Nesta entrega o modulo reaproveita a arquitetura de vendas, usuarios, permissoes, impressao e relatorios do G3N, mas a leitura por camera nativa e a integracao contabil avancada ainda dependem da proxima etapa de evolucao."
        ]
      }
    ]
  },
  {
    id: "rh",
    titulo: "Setor RH",
    descricao: "Rotinas de jornada, confirmação operacional e validação de identidade no registro de ponto.",
    icon: UserRound,
    telas: [
      {
        nome: "Registro de ponto",
        objetivo: "Registrar batidas com horário do servidor, localização do dispositivo e confirmação dupla por senha e face do usuário.",
        comoUsar: [
          "Acesse a aba Cadastro facial para capturar a face pela webcam e salvar o cadastro facial do usuário.",
          "Durante a captura pela câmera, use o molde do rosto na tela para centralizar a face antes de confirmar a imagem.",
          "Depois volte para a aba Registrar ponto para consultar a próxima batida, o espelho do dia e o saldo atual antes de marcar.",
          "Somente após o cadastro da face o botão Registrar ponto agora fica liberado para a confirmação da batida.",
          "Ao clicar em Registrar ponto agora, informe o usuário, a senha e faça a validação da face atual com prova de vida por duas piscadas ou leve virada do rosto antes do envio."
        ],
        atencoes: [
          "A marcação exige simultaneamente senha e validação facial do mesmo usuário autenticado.",
          "Na confirmação da marcação, o sistema exige duas piscadas ou uma leve virada do rosto para reduzir o risco de uso de foto estática no lugar de uma pessoa real.",
          "Se a face capturada na confirmação não conferir com a face cadastrada do usuário, o registro do ponto é recusado.",
          "A imagem facial é armazenada em arquivo no storage do sistema e o banco mantém apenas o caminho e os metadados necessários.",
          "Se a câmera do dispositivo não estiver disponível, o cadastro facial e a confirmação do ponto não poderão ser concluídos nesse equipamento."
        ]
      }
    ]
  },
  {
    id: "configuracoes",
    titulo: "Configurações gerais",
    descricao: "Parâmetros, inteligência artificial, usuários e manutenção do sistema.",
    icon: Settings2,
    telas: [
      {
        nome: "Parâmetros do sistema",
        objetivo: "Definir regras que afetam obrigatoriedade, alertas e comportamento global do G3N.",
        comoUsar: [
          "Use Campos obrigatórios para definir quais documentos e campos devem ser exigidos no cadastro.",
          "Revise parâmetros da Central de Atendimentos para controlar alertas e critérios operacionais.",
          "Salve alterações somente após revisar o impacto nas telas relacionadas."
        ]
      },
      {
        nome: "Licença de uso",
        objetivo: "Apresentar os planos comerciais do G3N em formato de página de vendas e permitir contratação com simulação, vigência e histórico financeiro no mesmo fluxo.",
        comoUsar: [
          "Use o topo comercial da página para comparar os planos, entender o posicionamento de cada faixa e acionar demonstração ou WhatsApp.",
          "Alterne entre mensal e anual para visualizar economia e custo-benefício antes de definir o plano.",
          "Consulte os cards comerciais, o comparativo entre planos, a seção Para quem é, os benefícios e o FAQ para apoiar a decisão.",
          "Ao escolher o plano e a data inicial do contrato, o sistema calcula automaticamente a vigência e prepara a contratação.",
          "Use Gerar cobrança para criar o checkout e acompanhar os quadros de pagamentos pendentes e realizados.",
          "Os alertas de vencimento usam automaticamente o e-mail cadastrado na unidade assistencial principal."
        ],
        atencoes: [
          "A licença fica vinculada ao CNPJ da unidade principal registrada no sistema.",
          "A data final é recalculada automaticamente a partir da data inicial e do ciclo escolhido disponível na página comercial.",
          "Cada checkout gerado entra primeiro no histórico como pendente e migra para realizado quando a InfinitePay confirma o pagamento.",
          "No ciclo anual, a implantação continua isenta conforme a política comercial definida."
        ]
      },
      {
        nome: "Pesquise na IA",
        objetivo: "Usar a central completa da IA com o mesmo núcleo do robô exibido nas telas.",
        comoUsar: [
          "Pesquise por texto livre ou use as perguntas frequentes e categorias sugeridas.",
          "Consulte histórico compartilhado entre a central e o robô Pergunte à IA.",
          "Use categorias como famílias, beneficiários, benefícios, atendimentos e legislação para acelerar a busca."
        ],
        atencoes: [
          "A IA respeita permissões e usa a mesma base inteligente nos dois pontos de acesso."
        ]
      },
      {
        nome: "Usuários e permissões",
        objetivo: "Controlar acesso por perfil e manter segurança operacional.",
        comoUsar: [
          "Cadastre usuários com perfis adequados às rotinas de cada setor.",
          "Revise permissões antes de liberar telas sensíveis, relatórios e dados financeiros."
        ]
      },
      {
        nome: "Atualizacao e recarregamento da interface",
        objetivo: "Orientar a operacao quando houver nova publicacao do frontend e o navegador estiver com arquivos antigos em cache.",
        comoUsar: [
          "Se uma tela exibir erro de carregamento apos atualizacao do sistema, use o botao Atualizar pagina exibido na propria mensagem.",
          "Quando necessario, acesse novamente a Visao geral para recarregar os modulos mais recentes do frontend.",
          "Em novas publicacoes, aguarde a recarga completa da aplicacao antes de retomar a operacao.",
          "No celular, use primeiro a secao desejada no topo e depois toque no item da secao aberta para navegar com menos ruido visual."
        ],
        atencoes: [
          "O sistema tenta se recuperar automaticamente uma vez quando detecta erro de importacao dinamica de modulo.",
          "Se o erro persistir apos a recarga, validar se a publicacao dos arquivos do frontend foi concluida no servidor."
        ]
      }
    ]
  },
  {
    id: "operacao",
    titulo: "Boas práticas operacionais",
    descricao: "Recomendações para manter qualidade de dados, rastreabilidade e segurança.",
    icon: CheckCircle2,
    telas: [
      {
        nome: "Rotina recomendada",
        objetivo: "Padronizar o uso do G3N no dia a dia da instituição.",
        comoUsar: [
          "Atualize cadastros antes de registrar concessões e atendimentos importantes.",
          "Verifique pendências visuais, alertas de família e documentos obrigatórios antes de concluir uma ação.",
          "Use a IA para consultas rápidas e o manual para treinamento, onboarding e revisão de processo."
        ],
        atencoes: [
          "Toda mudança estrutural deve refletir no histórico e na auditoria.",
          "Quando houver novas telas ou mudança de fluxo, o manual do sistema deve ser atualizado."
        ]
      }
    ]
  }
];

export function ManualSistemaPage() {
  const [abaAtiva, setAbaAtiva] = useState("manual");
  const [busca, setBusca] = useState("");
  const [secaoAtiva, setSecaoAtiva] = useState(secoesManual[0]?.id ?? "visao-geral");

  const secoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return secoesManual;

    return secoesManual
      .map((secao) => ({
        ...secao,
        telas: secao.telas.filter((tela) => {
          const texto = [secao.titulo, secao.descricao, tela.nome, tela.objetivo, ...tela.comoUsar, ...(tela.atencoes ?? [])]
            .join(" ")
            .toLowerCase();
          return texto.includes(termo);
        })
      }))
      .filter((secao) => secao.telas.length > 0);
  }, [busca]);

  const secaoSelecionada =
    secoesFiltradas.find((secao) => secao.id === secaoAtiva) ?? secoesFiltradas[0] ?? secoesManual[0];
  const IconeSecaoSelecionada = secaoSelecionada.icon;

  return (
    <AdminPageLayout
      tabs={abas}
      activeTab={abaAtiva}
      onChangeTab={(tabId) => setAbaAtiva(tabId)}
      sectionLabel="Configurações gerais"
      pageTitle="Manual do sistema"
      activeTitle="Manual do sistema"
      actions={[
        {
          label: "Ir para Pesquise na IA",
          icon: Brain,
          onClick: () => {
            window.location.href = "/configuracoes/pesquise-na-ia";
          },
          variant: "outline"
        }
      ]}
    >
      <section className="space-y-4">
        <Card className="border-[var(--g3-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpenText className="h-5 w-5 text-[var(--g3-active)]" />
              Manual de operações do G3N
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--g3-muted)]">
              Este manual reúne orientações operacionais do sistema, com foco em assistência social, gestão familiar,
              atendimentos, benefícios, indicadores e configurações. Use a busca para localizar rapidamente uma tela ou processo.
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--g3-muted)]" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar tela, processo, cadastro ou operação"
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Seções do manual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {secoesFiltradas.map((secao) => {
                const Icon = secao.icon;
                const ativa = secao.id === secaoSelecionada?.id;
                return (
                  <Button
                    key={secao.id}
                    type="button"
                    variant={ativa ? "default" : "outline"}
                    className="h-auto w-full justify-start px-3 py-3 text-left"
                    onClick={() => setSecaoAtiva(secao.id)}
                  >
                    <span className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <span className="block text-sm font-semibold">{secao.titulo}</span>
                        <span className="block text-xs opacity-80">{secao.descricao}</span>
                      </span>
                    </span>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-4">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <IconeSecaoSelecionada className="h-5 w-5 text-[var(--g3-active)]" />
                  {secaoSelecionada.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--g3-muted)]">{secaoSelecionada.descricao}</p>
              </CardContent>
            </Card>

            {secaoSelecionada.telas.map((tela) => (
              <Card key={tela.nome} className="border-[var(--g3-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{tela.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-active)]">Objetivo</p>
                    <p className="mt-1 text-sm text-[var(--g3-muted)]">{tela.objetivo}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-active)]">Como utilizar</p>
                    <div className="mt-2 space-y-2">
                      {tela.comoUsar.map((item) => (
                        <div key={item} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm text-[var(--g3-foreground)]">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {tela.atencoes?.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Atenções importantes</p>
                      <div className="mt-2 space-y-2">
                        {tela.atencoes.map((item) => (
                          <div key={item} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="border-[var(--g3-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <SlidersHorizontal className="h-4 w-4 text-[var(--g3-active)]" />
              Atualização contínua do manual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--g3-muted)]">
            <p>Este manual deve acompanhar novas funcionalidades, alterações de fluxo, mudanças de nomenclatura e novas regras do sistema.</p>
            <p>Quando uma tela for criada ou alterada, a orientação correspondente deve ser revisada para manter treinamento, operação e suporte alinhados.</p>
          </CardContent>
        </Card>
      </section>
    </AdminPageLayout>
  );
}






