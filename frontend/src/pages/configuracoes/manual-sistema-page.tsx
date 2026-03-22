import { useMemo, useState } from "react";
import {
  BookOpenText,
  Brain,
  CheckCircle2,
  HeartHandshake,
  Link2,
  Search,
  Settings2,
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
          "O aviso de pendências abre com rolagem interna quando houver muitos itens, mantendo o botão de fechamento sempre acessível."
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
          "Revise a fila de espera e a situação de vagas para apoiar decisões de encaminhamento."
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
        objetivo: "Controlar a licença comercial do G3N por CNPJ da instituição principal, ciclo de cobrança e alertas de vencimento.",
        comoUsar: [
          "Selecione o plano comercial do G3N e defina se a cobrança será mensal, semestral ou anual.",
          "Confirme o CNPJ da instituição principal, as datas de vigência e os e-mails que receberão alertas de vencimento.",
          "Use a seção de recebimento para manter os mesmos parâmetros operacionais de cobrança via InfinityPay usados no fluxo financeiro compartilhado.",
          "Gere o checkout da licença pelo próprio G3N para abrir o link de pagamento e usar a rota interna de retorno do pagamento.",
          "A webhook da InfinitePay já pode ser preenchida automaticamente com a rota pública do próprio G3N."
        ],
        atencoes: [
          "A licença fica vinculada ao CNPJ da unidade principal registrada no sistema.",
          "Os alertas são enviados somente por e-mail e não bloqueiam a operação do G3N quando a licença estiver próxima do vencimento ou vencida.",
          "No ciclo anual, a implantação pode ser registrada como isenta conforme a política comercial definida."
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
