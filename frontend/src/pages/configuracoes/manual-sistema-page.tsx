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
          "Use Configurações gerais para manter parâmetros, usuários, IA e o próprio manual atualizados.",
          "No acesso local pela tela de login, o botão Entrar com Google depende do client ID configurado no ambiente do frontend e do backend.",
          "Quando o backend estiver em desenvolvimento sem envio de e-mail configurado, a recuperação de senha conclui localmente e grava a senha temporária no log do servidor."
        ],
        atencoes: [
          "Toda informação crítica deve ser validada antes do salvamento.",
          "Sempre mantenha cadastros e vínculos familiares consistentes para evitar duplicidade de concessão.",
          "Se o login Google ficar indisponível em ambiente local, revise APP_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID e VITE_GOOGLE_CLIENT_ID antes de testar a autenticação.",
          "Em produção, o backend não deve operar com o segredo padrão de desenvolvimento para autenticação; configure APP_AUTH_TOKEN_SECRET próprio antes de publicar.",
          "O envio de e-mail deve permanecer desabilitado enquanto MAIL_PASS não estiver configurada no ambiente da instância.",
          "Essa recuperação local sem e-mail é apenas de apoio ao desenvolvimento; em ambientes com envio ativo, a senha temporária continua sendo enviada ao endereço cadastrado.",
          "Na impressão da ficha cadastral do beneficiário e no recibo de doação entregue, a logomarca do cabeçalho é carregada diretamente do storage local da unidade quando estiver salva como caminho lógico do sistema.",
          "No cadastro da unidade assistencial, a Logomarca da unidade vazado preserva o arquivo original enviado pelo cliente, incluindo SVG e imagens com transparência, enquanto a Logomarca do relatório pode ser normalizada para manter compatibilidade de impressão."
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
          "Na aba Dados pessoais, os campos e o bloco de foto usam layout compacto para reduzir rolagem da tela durante o cadastro.",
          "Revise a aba Documentos e use a regra de obrigatoriedade definida em parâmetros do sistema; quando houver muitos documentos, a rolagem fica dentro do card da lista de documentos.",
          "Ao abrir um beneficiário, leia o aviso de pendências antes de continuar o atendimento.",
          "Na aba Listagem de beneficiários, use os filtros no topo e o botão Limpar para localizar registros. A listagem não exibe mais o resumo do beneficiário selecionado acima dos resultados, mantendo a rolagem apenas na grade de beneficiários."
        ],
        atencoes: [
          "CPF, e-mail, telefone e CEP devem respeitar as máscaras e validações padronizadas.",
          "Pendências de cadastro impactam atendimentos, benefícios e relatórios.",
          "O aviso de pendências abre com rolagem interna quando houver muitos itens, mantendo o botão de fechamento sempre acessível.",
          "Em produção, o envio de documentos depende de permissão de escrita na pasta de storage do servidor e do vínculo válido do usuário autenticado.",
          "Capturas de documentos pela webcam passam por compressão antes do salvamento e exibem mensagem detalhada quando a imagem não puder ser processada.",
          "Ao salvar o cadastro, anexos que não tiverem sido processados corretamente retornam mensagem orientando novo envio, em vez de erro interno genérico.",
          "Falhas na limpeza de arquivos antigos do storage não devem mais derrubar a atualização do cadastro em produção.",
          "A compatibilidade com a base legada de produção foi mantida ignorando no ORM campos de comunicação que ainda não existem em contato_beneficiario."
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
          "A aba Composição familiar usa layout compacto; quando houver muitos beneficiários ou membros, a rolagem permanece dentro da área da composição, sem travar a tela geral.",
          "Quando o membro sair do núcleo, use transferência ou desmembramento para preservar histórico e rastreabilidade."
        ],
        atencoes: [
          "Não marque outro responsável se já existir um responsável ativo.",
          "Membros configurados para usar o endereço da família herdam o endereço principal do núcleo.",
          "A aba Listagem de famílias segue o mesmo padrão visual e estrutural da aba Listagem de beneficiários, com filtros no topo, limpeza rápida e tabela clicável."
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
          "Consulte a listagem de inscrições para localizar cada inscrição individual já incluída, com beneficiário, curso, status, data da inscrição, agendamento e profissional; o agendamento agora fica destacado visualmente como agendado, pendente, cancelado ou finalizado, com filtros rápidos por status acima da tabela.",
          "A aba Catálogo e vagas voltou a usar uma fonte própria de dados, então os cards cadastrados continuam visíveis mesmo quando a listagem estiver filtrada.",
          "Use os dados da inscrição para registrar turma, responsável, datas e observações.",
          "Revise a fila de espera e a situação de vagas para apoiar decisões de encaminhamento.",
          "Os atendimentos agendados não ficam mais dentro da tela de inscrições; quando precisar operar agenda, use o botão Abrir em Agendamentos.",
          "Na aba Presença, gere a data da aula, salve as presenças e use Excluir data de presença quando precisar remover apenas a data gerada sem apagar o curso.",
          "A barra superior da tela usa ações realmente contextuais por aba: a listagem fica com Buscar, Nova, Imprimir e Fechar; as abas de edição mostram apenas as ações que fazem sentido para aquele conteúdo, como Salvar dados da inscrição, Salvar catálogo e vagas, Salvar inscrições e fila ou Imprimir lista de presença."
        ],
        atencoes: [
          "O botão Excluir da barra superior remove todo o curso configurado e exige confirmação específica antes da exclusão.",
          "Na aba Presença, a data exibida na lista e a data impressa na lista de presença agora seguem exatamente o mesmo dia informado, sem recuo por fuso horário."
        ]
      },
      {
        nome: "Agendamentos",
        objetivo: "Centralizar a agenda operacional da instituição com base em cursos, atendimentos e oficinas já cadastrados nas inscrições.",
        comoUsar: [
          "A aba Dashboard agora abre primeiro na tela para mostrar a visão resumida dos agendamentos logo na entrada do módulo.",
          "Na aba Agendamento, escolha o tipo entre curso, atendimento ou oficina para carregar apenas os itens já cadastrados nas inscrições.",
          "Os filtros rápidos foram removidos dessa aba para deixar a operação mais direta; o foco agora é montar o card sem distrações.",
          "Depois selecione o item desejado em cards operacionais exibidos lado a lado, em grade com dois cards por linha, para o sistema preencher automaticamente o resumo com profissional, dias, horário e local na mesma linha, sem redigitação manual.",
          "Use a lista de beneficiários vinculados ao item para marcar quem participará naquela data; a agenda operacional agora usa a própria matrícula da inscrição como referência de seleção, o que evita falhas quando o vínculo do cadastro do beneficiário ainda não estiver totalmente resolvido, além da seleção rápida, resumo dos escolhidos e opção de limpar seleção em um clique.",
          "No topo da aba operacional, acompanhe primeiro o resumo do card com tipo, item, data e quantidade de beneficiários antes de montar a agenda.",
          "Na área principal, o campo Tipo fica ao lado da grade de itens do tipo selecionado, sem campo adicional de curso, atendimento ou oficina, e os beneficiários vinculados passam a aparecer em grade, lado a lado, para agilizar a marcação.",
          "Informe a data do agendamento e use Gerar Agenda para salvar a agenda do dia com os participantes agrupados no mesmo card. Não há um segundo botão de salvar: o clique em Gerar Agenda já persiste o card imediatamente.",
          "Na listagem da agenda gerada, use a data em exibição com os botões de avançar e voltar para navegar pelos dias e ver somente os cards agendados naquela data, evitando uma tela extensa com todos os cards misturados.",
          "Os cards ficam organizados por data e horário, em grade com duas colunas na agenda gerada, com cabeçalho verde, sombreamento visual, uma tarja verde clara para profissional, data, horário e local, lista de beneficiários em formato de tabela e botões compactos em linha única.",
          "Dentro de cada card, os botões por ícone permitem copiar a agenda para outra data, remarcar a agenda, imprimir o agendamento com a lista de presença, acionar WhatsApp, enviar e-mail e remover a agenda da listagem operacional, sempre com popup visual do próprio sistema.",
          "Ao usar o botão de impressão do card, o sistema abre a ficha de presença em nova janela de visualização como folha A4 do G3N, com logomarca do relatório, nome da instituição em tamanho mais discreto, título do relatório ampliado, resumo do agendamento em oito blocos organizados em 4 por linha, tabela de presença com mais espaço para o nome do beneficiário, rodapé institucional e um botão de impressora no topo para disparar a impressão manualmente.",
          "Na lista de beneficiários agendados dentro do card, use o ícone de verificado ou de interrogação dentro da própria coluna de ações, ao lado de mover e excluir, para alternar o status do participante entre confirmado e a confirmar.",
          "Cada beneficiário da agenda também pode ser movido individualmente para outra data ou removido apenas daquele dia, sem precisar alterar todos os participantes do card.",
          "As mensagens preparadas para WhatsApp passaram a exibir a data do agendamento em português do Brasil.",
          "Na aba Dashboard, acompanhe pacientes agendados, frequência média, faltas da semana, sessões do mês, lista de espera, total de cards e confirmados em cards com ícones e leitura centralizada.",
          "Na aba Lista de espera, acompanhe demandas ainda não convertidas em agenda."
        ],
        atencoes: [
          "O agendamento operacional reaproveita dados reais das inscrições; se um beneficiário não estiver vinculado ao item, ele não poderá ser selecionado no card.",
          "O sistema impede duplicidade do mesmo beneficiário dentro do mesmo card e registra auditoria de criação, edição, cancelamento e envios.",
          "O envio por WhatsApp prepara links diretos para contato e o envio por e-mail depende de endereço válido cadastrado no participante."
        ]
      },
      {
        nome: "Recebimento de doações",
        objetivo: "Registrar dados da doação, itens recebidos, recorrência e comunicação com o doador.",
        comoUsar: [
          "Preencha a aba Dados da doação e depois siga para Itens recebidos para lançar os produtos, quantidades e valores antes de concluir o registro.",
          "Na aba Itens recebidos, use Incluir doação e registrar entrada para salvar o registro completo com os itens já lançados e gerar a entrada no almoxarifado quando a doação for de bens de consumo.",
          "No campo Descrição dos itens recebidos, você pode reaproveitar a descrição de um produto já existente no almoxarifado; quando houver correspondência, a nova entrada soma a quantidade no mesmo item.",
          "A descrição lançada também passa por padronização visual antes de criar item novo no almoxarifado, mantendo capitalização mais limpa e consistente.",
          "A barra superior da tela usa nomes específicos por aba para deixar claro quando a ação salva o doador, a doação ou a comunicação."
        ],
        atencoes: [
          "O botão Incluir doação e registrar entrada finaliza o registro quando ele ainda estiver em rascunho para permitir a integração automática com o almoxarifado.",
          "Ao concluir a doação, o sistema agora também invalida o cache do almoxarifado para que a listagem e as movimentações reflitam os novos itens ao abrir a tela.",
          "A identificação de item existente considera diferenças de maiúsculas, minúsculas, espaços e acentos para evitar duplicidade como cesta basica e cesta básica.",
          "O salvamento pela aba Itens recebidos não deve mais bloquear o registro por campo opcional numérico vazio no formulário principal.",
          "Quando faltar algum campo obrigatório real, o sistema continuará informando a pendência nominalmente no alerta."
        ]
      },
      {
        nome: "Ocorrências",
        objetivo: "Registrar e acompanhar ocorrências envolvendo vítima, possível autor, classificação e encaminhamento.",
        comoUsar: [
          "Use Buscar ocorrências para localizar registros já cadastrados e continuar o preenchimento pelas abas da tela.",
          "A barra superior da tela usa nomes específicos por aba, com ações como Salvar vítima, Salvar ocorrência, Salvar possível autor, Salvar classificação e Salvar relato e encaminhamento.",
          "Use Nova ocorrência para iniciar um novo registro sem alterar o comportamento já existente da tela."
        ],
        atencoes: [
          "Os botões Excluir ocorrência e Imprimir ocorrência continuam vinculados ao registro atual selecionado.",
          "A troca de nomes na barra superior foi feita para reduzir ambiguidade operacional, sem alterar a lógica de cadastro, busca, exclusão ou impressão."
        ]
      },
      {
        nome: "Registro de visitas",
        objetivo: "Registrar visitas domiciliares com identificação, condições do domicílio, situação social, registro técnico, anexos e histórico do beneficiário.",
        comoUsar: [
          "Use a aba Listagem das visitas para localizar registros já lançados com filtros por beneficiário, responsável, unidade, situação e data, seguindo o mesmo padrão visual das listagens do sistema.",
          "Na aba Identificação da visita, use um único campo de Beneficiário para digitar a busca e selecionar a pessoa desejada na própria lista de resultados.",
          "Ao iniciar uma nova visita, o campo Responsável já vem preenchido com o usuário logado e o campo Data é carregado automaticamente com a data atual, mas ambos continuam editáveis.",
          "Use Buscar histórico para abrir rapidamente a aba Histórico do beneficiário e localizar visitas já registradas.",
          "A barra superior da tela usa nomes específicos por aba, com ações como Salvar identificação da visita, Salvar condições do domicílio, Salvar situação familiar e social e Salvar registro da visita.",
          "Use Nova visita para iniciar um novo registro sem alterar a lógica já existente da tela."
        ],
        atencoes: [
          "Ao voltar a digitar no campo Beneficiário, a seleção anterior é limpa até que um beneficiário seja escolhido novamente na lista.",
          "Se o navegador bloquear a janela dedicada de impressão, a tela usa a impressão da própria página como contingência para não interromper a operação.",
          "O salvamento da identificação da visita foi ajustado para bases em que a consulta retorna datas e horários como texto, evitando erro interno do servidor no retorno do cadastro.",
          "O backend de visitas também passou a compatibilizar automaticamente colunas faltantes da tabela visita_domiciliar em bases antigas de produção antes de salvar ou consultar registros.",
          "O backend de visitas passou a converter automaticamente os horários para TIME e os blocos de endereço, condições, situação social, registro e anexos para JSONB compatível com PostgreSQL, evitando erro interno do servidor ao salvar novas visitas.",
          "Os botões Excluir visita e Imprimir visita continuam vinculados ao registro atual selecionado.",
          "A troca de nomes na barra superior foi feita para reduzir ambiguidade operacional, sem alterar a lógica de cadastro, histórico, exclusão ou impressão."
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
          "O botão Mapa de apoio e risco cruza violência, cestas entregues, instituições e doadores em visão agregada para leitura estratégica.",
          "A visualização do mapa passou a usar uma base gratuita CARTO Voyager com Leaflet, sem depender de chave ou faturamento.",
          "A abertura da tela foi compatibilizada com runtimes React que ainda não expõem useEffectEvent, evitando erro de navegação ao entrar no georreferenciamento."
        ],
        atencoes: [
          "Os atalhos estratégicos ajustam filtros automaticamente e podem ser combinados com bairro e período.",
          "As camadas Instituições e Doadores ficam disponíveis na lista O que ver no mapa? para aprofundar a análise territorial.",
          "A base gratuita da CARTO é carregada diretamente no navegador e não exige configuração de chave no frontend.",
          "Se o mapa não carregar, valide apenas a conectividade do navegador com os tiles externos da CARTO."
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
          "Quando o item for um kit, use a aba Composição do kit para informar a quantidade de cada componente necessária em 1 unidade do kit, como a composição de 1 cesta básica.",
          "O saldo disponível do kit passa a considerar tanto o que já existe pronto no item quanto o que ainda pode ser montado automaticamente a partir dos componentes cadastrados.",
          "Use a aba Movimentações para registrar entradas, saídas e ajustes de estoque."
        ],
        atencoes: [
          "A consulta de produtos fica centralizada na aba Listagem de produtos.",
          "Cadastros e movimentações devem permanecer coerentes para evitar divergência de saldo.",
          "Em kits com composição, a disponibilidade exibida pode ser maior que o estoque físico do item porque o sistema também considera os componentes suficientes para montar novas unidades."
        ]
      },
      {
        nome: "Controle de veículos",
        objetivo: "Gerenciar cadastro de veículos, mapa de bordo, locais de destino e motoristas autorizados.",
        comoUsar: [
          "Use a aba Cadastro de veículo para registrar placa, modelo, marca, dados do veículo, foto e documento em PDF.",
          "Na aba Listagem de veículos, selecione um item da lista para visualizar o resumo completo e usar a ação Editar veículo.",
          "Na aba Mapa de bordo, registre saídas, chegadas, condutor, destino e quilometragem do deslocamento. O campo Data abre preenchido com a data atual e não permite edição manual.",
          "Ao usar a ação Imprimir mapa de bordo, informe o veículo, a data inicial e a data final do período desejado para gerar o relatório.",
          "Na aba Locais de destino, mantenha os endereços de referência organizados para reaproveitar no mapa de bordo.",
          "Na aba Motoristas autorizados, vincule motorista e veículo com carteira e vencimento quando aplicável.",
          "A barra superior da tela usa nomes específicos por aba, como Salvar veículo, Salvar mapa de bordo, Salvar destino e Salvar motorista autorizado."
        ],
        atencoes: [
          "Na aba Dashboard, a barra superior usa ações próprias do painel e o botão Abrir cadastro de veículo leva diretamente ao cadastro.",
          "Na aba Listagem de veículos, a ação principal da barra superior passa a ser Editar veículo, evitando confusão com o salvamento do cadastro.",
          "Os botões da barra superior foram compactados e balanceados em largura para respeitar melhor o espaço do card e não avançar sobre o título da tela.",
          "O vínculo de motorista autorizado foi ajustado para funcionar tanto em bases que usam cadastro_profissional quanto em bases que usam cadastro_profissionais.",
          "A impressão do mapa de bordo é gerada no próprio navegador sem abrir aba auxiliar, respeita o período informado no modal de impressão e segue o padrão institucional do G3N com nome da instituição, logomarca de relatório e rodapé oficial da unidade."
        ]
      },
      {
        nome: "Empréstimo para eventos",
        objetivo: "Controlar empréstimos de itens para eventos, agenda de reservas, itens vinculados e eventos associados.",
        comoUsar: [
          "Na aba Dados do empréstimo, selecione o evento, informe unidade, período, observações e o responsável pela retirada ou acompanhamento.",
          "Na aba Responsáveis, cadastre previamente os dados da pessoa que pode retirar os produtos, como nome, documento, telefone, e-mail e observações.",
          "Depois disso, na aba Dados do empréstimo, o campo Responsável passa a sugerir os nomes cadastrados na aba Responsáveis.",
          "Na aba Itens vinculados, digite o nome do item para localizar rapidamente patrimônio ou almoxarifado, depois informe quantidade e observação antes de adicionar.",
          "Ao imprimir a partir da aba Dados do empréstimo ou Itens vinculados, o sistema gera o termo de empréstimo no padrão de relatórios do G3N com dados do evento, responsável, período e itens.",
          "Na aba Agenda de empréstimos, consulte a ocupação por período e por dia para verificar reservas já programadas.",
          "A barra superior usa ações específicas por aba, como Buscar empréstimos, Salvar dados do empréstimo, Salvar empréstimo com itens, Salvar responsável e Imprimir termo de empréstimo."
        ],
        atencoes: [
          "Quando o navegador bloquear a janela dedicada de impressão, a tela usa a impressão da própria página como contingência, sem deixar a operação travada em tela em branco.",
          "O módulo passou a manter cadastro próprio de responsáveis para retirada, sem depender apenas da lista de usuários internos.",
          "O cadastro do empréstimo mantém compatibilidade com bases antigas criando automaticamente as colunas e a tabela novas necessárias quando ainda não existirem."
        ]
      },
      {
        nome: "Gestão de documentos",
        objetivo: "Controlar documentos institucionais, anexar arquivos e manter histórico de atualizações do documento.",
        comoUsar: [
          "Cadastre ou selecione um documento na lista para abrir o detalhamento completo.",
          "Use a seção Arquivos do documento para anexar um ou mais arquivos, substituir, visualizar, imprimir ou excluir cada arquivo em um clique.",
          "Após cada alteração relevante, consulte o histórico do documento para acompanhar registros de cadastro, envio, troca e remoção de anexo."
        ],
        atencoes: [
          "O sistema aceita anexos PDF, JPG e PNG e grava apenas o caminho do arquivo no cadastro do documento.",
          "Se o documento já estiver salvo, o anexo é armazenado no storage do sistema e permanece disponível para substituição e exclusão sem duplicar arquivo no banco.",
          "O envio dos anexos na aba Cadastro e edição aceita seleção múltipla e mostra a evolução do upload em barra percentual até a conclusão."
        ]
      },
      {
        nome: "Checklist diário",
        objetivo: "Organizar a rotina administrativa por usuário com execução diária, visão semanal, recorrência e rastreabilidade operacional.",
        comoUsar: [
          "Acesse Setor administrativo > Checklist diário para abrir a central operacional da rotina.",
          "No topo da tela, use os filtros por usuário, unidade, período, status, prioridade, dia da semana, tipo de modelo, somente pendentes e somente atrasados para chegar rapidamente ao recorte desejado.",
          "Use o Modo diário para acompanhar as tarefas do dia, com leitura de pendentes, atrasadas, concluídas, alertas críticos e percentual de conclusão em tempo real.",
          "Quando a atividade estiver pronta, use a ação de concluir no próprio item. O sistema registra data, hora, usuário executor e exige observação quando o modelo pedir esse preenchimento.",
          "Quando a tarefa não puder ser executada, use a dispensa somente se você tiver permissão. O sistema exige motivo e mantém a trilha completa da decisão.",
          "Quando for necessário corrigir uma conclusão ou devolver a atividade para a fila, use a reabertura apenas em perfis autorizados. A auditoria anterior é preservada.",
          "No Modo semanal, acompanhe os cards por dia da semana com resumo de concluídas, pendentes e atrasadas e use a seta de recolher para compactar dias que não precisam de análise naquele momento.",
          "Na aba Modelos, use o resumo superior para acompanhar volume de modelos, ativos e quantidade de atividades do editor atual antes de alterar a rotina.",
          "Clique em Novo modelo para criar um checklist novo ou selecione um modelo existente na coluna da esquerda para editar os dados e as atividades.",
          "Dentro do editor de modelo, ajuste nome, tipo, setor, cargo e as atividades vinculadas em cards separados. Use Adicionar atividade para incluir novos itens da rotina com horário, prioridade, alerta, criticidade e observação obrigatória.",
          "Use a ação Salvar para persistir a criação ou alteração do modelo. Se precisar reaproveitar uma estrutura já pronta, use Clonar no card do modelo desejado.",
          "Hoje o fluxo oficial para retirada de uso do checklist é Ativar ou Inativar o modelo. Não existe exclusão física de modelo na tela atual; a inativação é a forma correta de interromper o uso mantendo rastreabilidade.",
          "Na aba Indicadores, acompanhe o painel gerencial com conclusão geral, itens críticos não concluídos, cumprimento por usuário, unidade, setor e tarefas mais recorrentes sem depender apenas da visão do dia.",
          "Na aba Histórico, acompanhe a trilha de auditoria com resumo das ocorrências, data e hora, origem, status anterior, novo status, observações e motivos registrados em cada evento auditável.",
          "Na aba Configurações, apenas perfis autorizados podem ativar sábado e domingo. Enquanto esses dias estiverem desligados, o sistema não gera tarefas automáticas neles.",
          "Use a geração semanal quando precisar preparar a semana operacional. A geração respeita os modelos ativos, evita duplicidade e mantém o snapshot da atividade gerada."
        ],
        atencoes: [
          "Sábado e domingo permanecem desativados por padrão e não geram tarefas automáticas enquanto estiverem desligados.",
          "Pendência, atraso, conclusão, dispensa e não se aplica são status operacionais reais e devem refletir a execução do dia, não apenas controle visual.",
          "Toda conclusão, dispensa, reabertura, alteração de modelo e atualização de configuração gera histórico de auditoria do checklist.",
          "A geração semanal evita duplicidade por usuário, atividade e data e mantém o snapshot da atividade mesmo após edição posterior do modelo.",
          "Os indicadores do topo e da visão gerencial usam dados reais do banco e devem ser lidos como acompanhamento operacional da rotina."
        ]
      },
      {
        nome: "Fotos e eventos",
        objetivo: "Gerenciar eventos institucionais com álbum persistido, capa do evento, galeria organizada e ações claras por contexto.",
        comoUsar: [
          "Na aba Listagem, use busca e status para localizar rapidamente o evento e acompanhe os indicadores de total de eventos, fotos, álbuns sem capa e evento com mais fotos.",
          "Na listagem de eventos, clique diretamente sobre a linha do evento para abrir a galeria, sem depender de botão de ação separado.",
          "Na aba Cadastro do evento, preencha os dados principais e use Adicionar fotos para fazer upload múltiplo antes mesmo do primeiro salvamento.",
          "Depois do upload, escolha visualmente a capa do álbum ainda no cadastro. A primeira imagem marcada como destaque será persistida como capa real no banco.",
          "Ao salvar, o sistema grava o evento, envia as fotos pendentes, define a capa e mantém o fluxo completo sincronizado entre cadastro, listagem e galeria.",
          "Quando o evento for salvo com sucesso, a tela passa a confirmar corretamente o cadastro sem exibir mensagem indevida de erro, mesmo quando houver fotos pendentes no mesmo fluxo.",
          "Na aba Galeria do evento, o card principal agora mostra a foto em destaque no topo e, abaixo dela, status, capa definida, nome do evento, data, local e as ações Adicionar fotos e Editar evento.",
          "Na aba Galeria do evento, use Adicionar fotos para complementar o álbum, Definir capa para trocar a imagem principal, Reordenar para ajustar a sequência visual e Excluir foto para remover itens específicos.",
          "Use Publicar evento quando o álbum já estiver consistente e o status precisar ser ajustado para realizado sem voltar para o formulário."
        ],
        atencoes: [
          "A capa do evento é persistida por vínculo com a foto cadastrada no álbum e pode ser substituída sem duplicar imagem ou deixar referência órfã.",
          "A remoção da foto principal limpa a capa atual do evento e exige nova definição visual quando necessário.",
          "As fotos ficam armazenadas no storage do sistema com persistência real; o banco guarda apenas os metadados e caminhos do arquivo.",
          "As ações mudam conforme a aba para evitar botões genéricos e reduzir clique desnecessário durante a operação."
        ]
      }
    ]
  },
  {
    id: "financeiro",
    titulo: "Setor financeiro",
    descricao: "Controle financeiro simplificado, com foco em lançamentos e contas bancárias.",
    icon: PiggyBank,
    telas: [
      {
        nome: "Contabilidade / financeiro",
        objetivo: "Permitir que qualquer usuário registre receitas e despesas e acompanhe as contas bancárias com o mínimo de complexidade.",
        comoUsar: [
          "A tela foi simplificada para trabalhar somente com três abas principais: Painel financeiro, Lançamentos e Contas bancárias.",
          "Use Painel financeiro para ver saldo geral, contas a pagar, contas a receber, últimos lançamentos e próximos vencimentos em leitura rápida.",
          "Use Lançamentos para registrar receitas, despesas e ajustes com poucos campos: tipo, datas, conta bancária, natureza, favorecido ou pagador, histórico, valor e status.",
          "Na aba Lançamentos, o campo Valor aplica a máscara brasileira ao sair do campo, convertendo entradas como 1000 para 1.000,00 sem alterar o valor numérico salvo.",
          "O salvamento da aba Lançamentos passou a aceitar somente uma execução por vez, evitando duplicidade de débitos ou créditos quando houver clique repetido no botão de salvar.",
          "No campo Tipo da aba Lançamentos, a opção Estorno não aparece mais na criação manual; o estorno continua disponível apenas como ação específica para lançamentos já baixados.",
          "Quando o tipo for Ajuste, a tela exige informar se o ajuste deve aumentar ou diminuir o saldo da conta antes do salvamento.",
          "Na aba Lançamentos, os cards de resumo mostram rapidamente quantos lançamentos existem, quanto entrou, quanto saiu e o que ainda está em aberto.",
          "Ao salvar um lançamento vinculado a uma conta bancária, os cards de Contas bancárias passam a refletir imediatamente o impacto financeiro esperado daquela conta, mesmo antes da baixa.",
          "O saldo exibido nas contas bancárias usa o saldo real da conta somado apenas à projeção dos lançamentos ainda em aberto, sem duplicar créditos ou débitos já baixados, pagos, recebidos ou conciliados.",
          "Ao efetivar receita, despesa ou ajuste em qualquer conta bancária, o saldo realizado passa a seguir exatamente o valor informado no lançamento, sem duplicar débito ou crédito em nenhuma conta do sistema.",
          "Quando o lançamento for salvo já como Pago, Recebido ou Conciliado, o sistema também atualiza automaticamente o saldo realizado da conta bancária vinculada.",
          "Use Contas bancárias para cadastrar contas e depois acompanhar cada conta em cards com banco, agência, número, saldo atual, Pix, projeto vinculado e status.",
          "Para editar uma conta, clique em Editar no card correspondente. Para iniciar um novo cadastro, use Nova conta bancária na barra superior ou no formulário."
        ],
        atencoes: [
          "As abas Fluxo de caixa, Centro de custo, Conciliação bancária, Integração com compras, Histórico, Anexos, Relatórios, Impressões e Emendas foram retiradas dessa tela para reduzir complexidade operacional.",
          "O estorno continua disponível somente para lançamentos já pagos, recebidos ou conciliados.",
          "O cadastro de centro de custo deixou de fazer parte do fluxo simplificado dessa tela.",
          "Ao salvar um centro de custo no backend, o sistema agora suporta perfis longos de permissões no histórico sem retornar erro interno do servidor.",
          "Se o valor do lançamento for digitado com vírgula, a tela passa a interpretar corretamente o número antes do salvamento."
        ]
      },
      {
        nome: "Recebimento de doações",
        objetivo: "Registrar doações recebidas com doador vinculado, classificação oficial por tipo e organização separada entre dados do registro e itens recebidos.",
        comoUsar: [
          "Na aba Dados da doação, selecione o doador, informe número do recibo, tipo, status e data de recebimento. Ao escolher o tipo, o sistema mostra ao lado o destino de entrada da doação, como Contabilidade, Almoxarifado ou Patrimônio.",
          "Quando o tipo for Doação financeira, a própria aba Dados da doação também exibe a forma de recebimento, com opção de selecionar uma forma existente ou cadastrar uma nova em um clique.",
          "Use apenas os tipos Doação financeira, Doação de bens de consumo e Doação de bens permanentes.",
          "Na aba Dados da doação ficam apenas as informações principais do registro: doador, número do recibo, tipo, status, data de recebimento e observações.",
          "Ao final da aba Dados da doação, a tela exibe um aviso orientando que o próximo passo é abrir a aba Itens recebidos, com botão direto para avançar.",
          "Depois de registrar os dados principais, use a aba Itens recebidos, agora na posição 4, para lançar os produtos, quantidade, valor unitário e valor total da doação.",
          "Na aba Cadastro do doador, os campos visíveis seguem o padrão da migração: digitação livre, normalização visual ao sair do campo e normalização final antes do salvamento.",
          "A barra superior agora muda conforme a aba aberta, mostrando ações exclusivas como Salvar doador, Salvar doação, Buscar registros ou Confirmar mensagem, conforme o contexto atual.",
          "Quando a doação financeira for recorrente, marque Doação recorrente e selecione a periodicidade entre única, diário, semanal, mensal ou anual.",
          "Use Observações como complemento curto do registro quando precisar detalhar a doação."
        ],
        atencoes: [
          "Doações financeiras seguem entrada financeira na Contabilidade.",
          "Doações de bens de consumo seguem entrada no Almoxarifado e doações de bens permanentes seguem entrada no Patrimônio.",
          "Os itens devem ser mantidos apenas na aba Itens recebidos para evitar duplicidade de informação.",
          "Na aba Itens recebidos, o sistema calcula automaticamente o valor total pela quantidade multiplicada pelo valor unitário.",
          "Ao salvar a doação, o sistema consolida os itens lançados para preencher a quantidade total e os valores do registro automaticamente.",
          "Os campos monetários dos itens exibem máscara brasileira e o sistema grava o valor numérico sem formatação visual.",
          "Na aba Itens recebidos existe a ação final de incluir a doação e registrar a entrada logo após a conferência dos itens lançados, usando o mesmo fluxo de salvar da tela.",
          "Se faltar algum dado obrigatório da doação ou nenhum item tiver sido lançado, o sistema avisa em popup antes de concluir o registro.",
          "O botão Salvar da barra superior não é mais genérico para todas as abas, evitando dúvida entre salvar o cadastro do doador e salvar o registro da doação.",
          "Quando faltar algum campo obrigatório da aba Dados da doação, o popup de validação passa a listar claramente quais campos ainda precisam ser preenchidos.",
          "A forma de recebimento volta a aparecer na própria aba Dados da doação para evitar bloqueio invisível ao salvar doações financeiras."
        ]
      },
      {
        nome: "Prestação de contas",
        objetivo: "Organizar a prestação de contas em fluxo guiado, com leitura simples, conferência visual e revisão final antes do envio ou da impressão.",
        comoUsar: [
          "Comece pela aba Listagem para localizar um registro existente ou usar Novo para abrir uma nova prestação.",
          "Na listagem, use os filtros no topo para pesquisar por código, resumo, fontes, aplicações ou documentos, selecione a situação desejada e use Limpar filtros quando precisar reiniciar a busca.",
          "As linhas da tabela são clicáveis e o registro selecionado fica destacado visualmente para reduzir erro de operação.",
          "Na aba Visão geral, informe total recebido, total aplicado, saldo disponível, prestado no mês e o resumo executivo da prestação em linguagem simples.",
          "Na aba Receitas, cadastre cada entrada com fonte, valor, periodicidade e situação para consolidar a composição do total recebido.",
          "Na aba Aplicação dos recursos, detalhe onde o recurso foi utilizado, com percentual e descrição, para facilitar a leitura por quem analisa a prestação.",
          "Na aba Documentos e checklist, lance os comprovantes e monte o checklist de conferência antes de avançar.",
          "Na aba Revisão e envio, acompanhe a situação geral, as pendências encontradas pela tela, a timeline da prestação e os indicadores finais de conferência antes de salvar ou imprimir."
        ],
        atencoes: [
          "Os campos monetários exibem formatação brasileira e a tela alerta quando o saldo informado divergir do saldo calculado pelos totais.",
          "A prestação só fica realmente pronta para conferência quando houver receitas ou total recebido, aplicação ou total aplicado, comprovantes e checklist sem pendências.",
          "A revisão final mostra claramente o que ainda falta, evitando depender de treinamento informal para concluir a operação."
        ]
      },
      {
        nome: "Doações realizadas",
        objetivo: "Consultar o histórico de entregas e imprimir relatórios e recibos das doações realizadas a beneficiários e famílias.",
        comoUsar: [
          "Use a aba Histórico de doações para localizar as entregas já registradas e imprimir a relação completa pelo ícone da impressora da tela.",
          "Quando precisar do comprovante individual, use o ícone da impressora na própria linha da doação para gerar o recibo da entrega.",
          "A impressão da relação segue o padrão visual do G3N, com colunas ajustadas para leitura e melhor aproveitamento da página.",
          "No recibo individual da entrega, o cabeçalho usa a logomarca institucional configurada na unidade, a tabela de itens mantém o rótulo Quant para a quantidade e a seção de assinaturas exibe apenas o campo do recebedor."
        ],
        atencoes: [
          "No relatório da relação, a coluna Quantidade foi ajustada para caber corretamente sem quebrar o conteúdo na impressão.",
          "Os títulos e descrições do PDF seguem o padrão pt-BR e a apresentação visual oficial do sistema.",
          "Se o recibo individual ficar sem logomarca, revise o cadastro da unidade atual e confirme se a logomarca ou a logomarca de relatório está salva no storage do sistema."
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
      },
      {
        nome: "Cadastro de profissionais",
        objetivo: "Cadastrar e atualizar profissionais com dados pessoais, endereço, perfil profissional, agenda e foto do colaborador.",
        comoUsar: [
          "Use a foto 3x4 do profissional apenas em formatos aceitos pelo sistema e finalize o salvamento após revisar os dados principais.",
          "Quando houver falha no processamento ou na vinculação da foto, a tela deve exibir o motivo operacional real retornado pelo backend.",
          "Em produção, após trocar a foto do profissional, o sistema mantém o cadastro mesmo se a limpeza do arquivo antigo falhar no storage."
        ],
        atencoes: [
          "Falhas de storage antigo não devem mais derrubar a atualização do profissional em produção.",
          "Mensagens de erro do cadastro devem priorizar o motivo real da foto ou da gravação, sem cair em erro interno genérico quando houver tratamento possível.",
          "A compatibilidade com bases de produção legadas foi mantida removendo do ORM campos ainda não existentes na tabela cadastro_profissionais."
        ]
      },
      {
        nome: "Cadastro de voluntariado",
        objetivo: "Cadastrar e atualizar voluntários com dados pessoais, disponibilidade, endereço, interesses e foto do cadastro.",
        comoUsar: [
          "Preencha os dados do voluntário e salve normalmente em um clique após revisar nome, CPF, contatos, disponibilidade e área de interesse.",
          "Quando houver foto 3x4, o sistema processa o arquivo antes do salvamento e informa o motivo real caso a imagem não possa ser utilizada.",
          "Em produção, o cadastro foi ajustado para funcionar também em bases legadas que ainda não possuem colunas novas de comunicação na tabela cadastro_voluntario."
        ],
        atencoes: [
          "Falhas tratáveis do cadastro ou da vinculação da foto agora retornam mensagem operacional em vez de apenas erro interno do servidor.",
          "A limpeza de foto antiga no storage não deve mais derrubar a atualização do voluntário em produção.",
          "A compatibilidade com a base legada foi mantida removendo do ORM os campos de comunicação ainda não existentes em alguns bancos de produção."
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
          "Na aba Cadastros, os blocos de evento, barraca e produto agora ficam organizados um abaixo do outro para melhorar a visualizacao e a conferencia durante o preenchimento.",
          "Na aba Cadastros, use o proprio formulario em modo Novo ou Editar. Quando quiser iniciar um cadastro limpo, use o botao Novo evento, Nova barraca ou Novo item.",
          "Abaixo dos formularios, o sistema lista visualmente o evento em edicao, as barracas cadastradas e os produtos vinculados para facilitar a conferencia antes da operacao.",
          "Depois cadastre os participantes do evento com nome, telefone, CPF opcional, responsavel opcional, numero da carteira e status. O sistema gera um token unico para o QR Code e usa o numero da carteira no codigo de barras para facilitar a leitura em leitores fisicos.",
          "Na aba Carteiras, telefone e CPF seguem mascara visual, validacao no blur e no salvamento e normalizacao para persistencia sem mascara, mantendo padrao unico do sistema.",
          "Na mesma aba, recarga, ajuste e transferencia usam digitacao monetaria em padrao brasileiro, destacam visualmente campos invalidos e bloqueiam envio com valor zerado ou motivo incompleto.",
          "Use o bloco Consulta de saldo para selecionar rapidamente um participante e conferir nome, numero da carteira e saldo atual sem precisar iniciar venda ou recarga.",
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
          "CPF e telefone invalidos nao devem ser persistidos na carteira do participante; revise os avisos abaixo dos campos antes de salvar.",
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
          "Na aba Espelho de ponto, use o botão Gerar espelho de ponto PDF para emitir o relatório individual em um clique; administradores podem selecionar o funcionário antes da emissão, enquanto usuários comuns emitem apenas o próprio espelho.",
          "Somente após o cadastro da face o botão Registrar ponto agora fica liberado para a confirmação da batida.",
          "Ao clicar em Registrar ponto agora, informe o usuário e a senha. Se o modo escolhido for Somente senha, a marcação é concluída sem captura facial. Se o modo escolhido for Senha + captura facial, faça também a validação da face atual com prova de vida por duas piscadas ou leve virada do rosto antes do envio.",
          "Na aba Ajuste administrativo, escolha entre Somente senha ou Senha + captura facial antes de salvar a correção do registro."
        ],
        atencoes: [
          "A geração do espelho em PDF usa o endpoint autenticado do registro de ponto e respeita a regra de acesso por usuário: administrador pode emitir para funcionários, demais perfis somente para si mesmos.",
          "No espelho de ponto individual em PDF, o nome do colaborador aparece em destaque e a tabela mantém data e horários em linha única, deixando a ocorrência em fonte reduzida com quebra de linha quando necessário.",
          "A marcação pode ser configurada para Somente senha ou para Senha + captura facial, conforme a necessidade operacional.",
          "Na confirmação da marcação, o sistema exige duas piscadas ou uma leve virada do rosto para reduzir o risco de uso de foto estática no lugar de uma pessoa real.",
          "Se a face capturada na confirmação não conferir com a face cadastrada do usuário, o registro do ponto é recusado. A comparação considera variações controladas de enquadramento e espelhamento para reduzir reprovações indevidas da webcam.",
          "A imagem facial é armazenada em arquivo no storage do sistema e o banco mantém apenas o caminho e os metadados necessários.",
          "Se a câmera do dispositivo não estiver disponível, o cadastro facial e a confirmação do ponto não poderão ser concluídos nesse equipamento.",
          "No ajuste administrativo, quando o modo Somente senha estiver selecionado, o sistema não deve exigir captura facial para concluir o salvamento."
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
          "Os valores mensais vigentes exibidos nos cards são: Essencial R$ 397,00, Profissional R$ 697,00, Premium R$ 997,00 e Enterprise R$ 1.497,00.",
          "Alterne entre mensal e anual para visualizar economia e custo-benefício antes de definir o plano.",
          "Consulte os cards comerciais, o comparativo entre planos, a seção Para quem é, os benefícios e o FAQ para apoiar a decisão.",
          "Ao escolher o plano e a data inicial do contrato, o sistema calcula automaticamente a vigência e prepara a contratação.",
          "Use Gerar cobrança para criar o checkout e acompanhar os quadros de pagamentos pendentes e realizados.",
          "Os alertas de vencimento usam automaticamente o e-mail cadastrado na unidade assistencial principal."
        ],
        atencoes: [
          "A licença fica vinculada ao CNPJ da unidade principal registrada no sistema.",
          "No plano Enterprise, a implantação inicial vigente é de R$ 2.497,00.",
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
          "Use categorias como famílias, beneficiários, benefícios, atendimentos e legislação para acelerar a busca.",
          "Ao lado do botão Enviar, use Nova conversa para limpar o histórico visível atual e começar uma nova conversa em um clique.",
          "Quando GEMINI_API_KEY, IA_PROVIDER e IA_MODEL estiverem configurados no backend, a IA também responde perguntas abertas com apoio do Gemini.",
          "Outros recursos de IA do sistema que dependem do Gemini também passam a usar o mesmo modelo configurado em IA_MODEL.",
          "Perguntas de totalizadores e resumos, como quantos beneficiários existem ou quantos atendimentos houve no mês, passam a consultar o banco real antes de montar a resposta executiva.",
          "Perguntas gerais e orientativas fora do sistema, como legislação, conceitos e boas práticas, também podem ser respondidas pelo Gemini sem depender de uma tela específica.",
          "Perguntas analíticas tendem a sair em formato estruturado, enquanto perguntas gerais passam a ser respondidas em texto mais natural e menos engessado."
        ],
        atencoes: [
          "A IA respeita permissões e usa a mesma base inteligente nos dois pontos de acesso.",
          "Na central Pesquise na IA, a barra de envio foi reorganizada para manter os botões acessíveis sem sobrepor o ícone do robô.",
          "Se a chave Gemini não estiver configurada no backend, a central continua em modo local com sugestões e consultas objetivas ao banco, sem expor segredos no frontend.",
          "As respostas estruturadas usam dados reais de beneficiários, agenda, visitas e atendimentos internos, sem depender de conteúdo inventado."
        ]
      },
      {
        nome: "Usuários e permissões",
        objetivo: "Controlar acesso por perfil e manter segurança operacional.",
        comoUsar: [
          "Cadastre usuários com perfis adequados às rotinas de cada setor.",
          "Revise permissões antes de liberar telas sensíveis, relatórios e dados financeiros.",
          "Na tela de usuários, o título principal agora fica dentro do card superior da própria tela, seguindo o mesmo padrão visual dos demais módulos do G3N.",
          "Na aba Listagem de usuários, as ações do registro foram convertidas para ícones com tooltip, com exclusão isolada no final para reduzir clique acidental.",
          "A exclusão de usuário passou a ser persistida corretamente como exclusão lógica real, sem mensagem falsa de sucesso e com atualização imediata da listagem.",
          "No cadastro de usuário, use o bloco Importar dados de origem para iniciar o cadastro a partir de beneficiário, profissional ou voluntário com vínculo salvo no banco.",
          "O resumo do perfil agora mostra com clareza quais telas e quais ações operacionais ficam liberadas para o usuário selecionado."
        ],
        atencoes: [
          "A exclusão exige confirmação explícita porque a ação é irreversível na operação diária.",
          "O vínculo de origem importada ajuda a evitar duplicidade e deixa rastreável de onde o cadastro do usuário foi criado."
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
      <section className="-mx-1 w-[calc(100%+0.5rem)] space-y-4 sm:mx-0 sm:w-full">
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

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit border-[var(--g3-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Seções do manual</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {secoesFiltradas.map((secao) => {
                const Icon = secao.icon;
                const ativa = secao.id === secaoSelecionada?.id;
                return (
                  <Button
                    key={secao.id}
                    type="button"
                    variant={ativa ? "default" : "outline"}
                    className="h-auto w-full min-w-0 justify-start whitespace-normal px-3 py-3 text-left"
                    onClick={() => setSecaoAtiva(secao.id)}
                  >
                    <span className="flex min-w-0 w-full items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block whitespace-normal break-words text-sm font-semibold leading-snug">{secao.titulo}</span>
                        <span className="block whitespace-normal break-words text-xs leading-snug opacity-80">{secao.descricao}</span>
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
              <Card key={tela.nome} className="w-full border-[var(--g3-border)]">
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






