import { useMemo, useState } from "react";
import {
  BookOpenText,
  Brain,
  CheckCircle2,
  GraduationCap,
  Globe2,
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
          "A navegação principal mantém Painel de indicadores e Cadastros em geral no início; a partir de Atendimentos diários, os setores aparecem em ordem alfabética, com Configurações gerais e Painel master sempre ao final.",
          "Use Atendimentos diários para registrar movimentações sociais, benefícios, inscrições e acompanhamentos.",
          "Use Configurações gerais para manter parâmetros, usuários, backup, IA e o próprio manual atualizados.",
          "Na aba Personalização, use os campos Card da visão geral e Card suave da visão geral para ajustar apenas o dashboard sem alterar o restante do tema.",
          "Na aba Personalização de Configurações gerais, ajuste a paleta para alterar as cores dos cards da tela Visão geral antes de salvar as mudanças.",
          "Os cards iniciais da Visão geral acompanham a cor clara do padrão da unidade, como verde claro ou azul claro, de acordo com a personalização ativa.",
          "Na aba Personalização, o campo Preset oferece novas opções suaves e comerciais: Azul sereno, Verde sage, Turquesa leve, Lavanda suave, Areia premium e Coral acolhedor. Selecione uma opção para aplicar a pré-visualização e salve para confirmar.",
          "Na tela Visão geral, acompanhe também os cards de Termos vencidos, Documentos vencidos, Documentos a vencer, Motoristas autorizados, Itens no almoxarifado, Livros da biblioteca, Quantidade de veículos, Itens no patrimônio, Álbuns e fotos, Empréstimos para eventos e Catálogo e vagas de matrículas para leitura operacional rápida logo na entrada do sistema.",
          "O card Composição financeira da Visão geral exibe valores a receber, em caixa e em banco com base nos saldos e lançamentos financeiros normalizados pelo backend.",
          "O card Empréstimos para eventos mostra a quantidade de eventos ativos em andamento.",
          "O card Catálogo e vagas de matrículas mostra o resumo de cursos no catálogo e vagas disponíveis na grade principal.",
          "Os cards da Visão geral funcionam como atalhos: ao clicar em cada indicador, o sistema abre a tela correspondente para aprofundar a análise ou continuar a operação.",
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
          "O card Famílias em extrema pobreza foi removido da Visão geral para liberar espaço aos indicadores operacionais de termos, documentos, motoristas, almoxarifado, patrimônio e empréstimos para eventos.",
          "Na impressão da ficha cadastral do beneficiário e no recibo de doação entregue, a logomarca do cabeçalho é carregada diretamente do storage persistente da unidade quando estiver salva como caminho lógico do sistema.",
          "Fotos, documentos e demais binários agora devem ser enviados para o storage persistente do sistema, separados por tenant, com o banco guardando apenas metadados e caminhos lógicos para evitar perda em troca de máquina, backup ou atualização de ambiente.",
          "No cadastro da unidade assistencial, a Logomarca da unidade vazado preserva o arquivo original enviado pelo cliente, incluindo SVG e imagens com transparência, enquanto a Logomarca do relatório pode ser normalizada para manter compatibilidade de impressão.",
          "Na aba Salas de atendimento do Cadastro de unidade assistencial, informe o nome da sala e use Incluir sala para montar a lista abaixo; salas vinculadas a uso no sistema não podem ser removidas e devem ser inativadas quando não forem mais utilizadas."
        ]
      }
    ]
  },
  {
    id: "base-g3n-apresentacao",
    titulo: "Base G3N de apresentação",
    descricao: "Clone a base atual no mesmo banco, em um schema isolado, para demonstrações, treinamentos e testes sem expor a identidade da ADRA.",
    icon: Settings2,
    telas: [
      {
        nome: "Preparação da base de apresentação",
        objetivo: "Criar um clone íntegro do tenant ADRA em um schema isolado com branding G3N, logo própria e usuário de acesso dedicado.",
        comoUsar: [
          "Execute `npm run g3n:base` dentro da pasta `backend` para clonar o schema `public` do PostgreSQL atual para `g3n_apresentacao`.",
          "A rotina sempre reconstrói a base de apresentação a partir da ADRA original e não altera os dados do schema `public`.",
          "O processo grava a logomarca G3N em storage, filtra os dados do tenant ADRA para o schema de apresentação e preserva a integridade dos vínculos.",
          "Ao final, o script cria ou atualiza o usuário `g3n@apresentacao.com` e gera o arquivo `.env.g3n-apresentacao` com a `DATABASE_URL` do ambiente de apresentação.",
          "A identidade visual da apresentação usa tons de azul e a logomarca institucional G3N no topo; as demais bases continuam usando a logomarca definida no cadastro da unidade assistencial.",
          "Use a nova base quando quiser demonstrar o sistema sem depender da marca ADRA ou do banco de produção."
        ],
        atencoes: [
          "Se o schema de apresentação já existir, recrie apenas quando necessário usando `G3N_PRESENTATION_REFRESH=true` junto do comando.",
          "O clone depende de `pg_dump`, `pg_restore` e `psql` disponíveis no ambiente local.",
          "A base da ADRA original continua preservada no schema `public`; a versão de apresentação vive apenas em `g3n_apresentacao`.",
          "Para usar a base no backend, aponte `DATABASE_URL` para o mesmo banco `g3n` com `?schema=g3n_apresentacao` ou copie o conteúdo de `.env.g3n-apresentacao` para o ambiente ativo."
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
          "No cabeçalho do cadastro de beneficiário, use o botão Gerar para criar a senha do portal e exibi-la ao lado do status e do código do beneficiário.",
          "O rótulo Senha do portal usa o mesmo estilo visual de Código do beneficiário para manter a leitura padronizada no cabeçalho.",
          "Os campos de preenchimento usam fundo sombreado, borda mais visível, sombra interna leve e realce no foco para melhorar a leitura em monitores com alto contraste ou muito brilho.",
          "A senha do portal do beneficiário é criada no próprio cadastro com 4 dígitos e será usada no acesso do portal do beneficiário e da família junto com o CPF.",
          "Revise a aba Documentos e use a regra de obrigatoriedade definida em parâmetros do sistema; quando houver muitos documentos, a rolagem fica dentro do card da lista de documentos.",
          "Ao abrir um beneficiário, leia o aviso de pendências antes de continuar o atendimento.",
          "Use Cadastro rápido para criar um registro mínimo quando ainda não houver todos os dados. O sistema grava o cadastro como incompleto, calcula a completude e mantém as pendências para revisão posterior.",
          "Antes de concluir um novo cadastro, o sistema consulta possíveis duplicidades por CPF, nome, nascimento, filiação, telefone, RG e endereço. Quando houver candidatos, confira o modal e escolha abrir o cadastro existente, continuar como pessoa diferente, cancelar, atualizar o registro existente ou encaminhar para análise.",
          "O cabeçalho mostra a completude cadastral calculada pelo backend, com barra de progresso, status, pendências e ação para recalcular quando necessário.",
          "Use a aba Consentimentos para registrar aceite, versão do termo, finalidade e canal de coleta. O aceite de LGPD simples permanece compatível, mas a estrutura nova mantém histórico versionado.",
          "Use a aba Família para consultar o vínculo familiar existente, integrantes, parentesco e responsável familiar sem duplicar famílias.",
          "Na aba Família, o botão Abrir famílias direciona para a tela de vínculo familiar cadastrada no sistema, sem abrir rota inexistente.",
          "Nas abas Escolaridade e Trabalho, selecione escolaridade, ocupação com referência CBO e situação de trabalho pelas opções padronizadas; a renda mensal usa máscara monetária brasileira.",
          "Na aba Benefícios, marque Recebe benefício social para selecionar os principais benefícios sociais e informe o valor total com máscara monetária brasileira.",
          "Use a aba Histórico e auditoria para acompanhar criação, edição, alterações de consentimento e demais eventos operacionais do cadastro.",
          "Na aba Listagem de beneficiários, use os filtros no topo e o botão Limpar para localizar registros. A listagem não exibe mais o resumo do beneficiário selecionado acima dos resultados, mantendo a rolagem apenas na grade de beneficiários.",
          "Ao concluir o cadastro de um beneficiário, confira a confirmação visual com o ícone na cor padrão da unidade e o número do cadastro. Clique em Finalizar cadastro para fechar a mensagem e continuar na tela."
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
    titulo: "Famílias e vínculos",
    descricao: "Gestão da família como núcleo principal de atendimento, moradia e concessão.",
    icon: Link2,
    telas: [
      {
        nome: "Famílias e vínculos",
        objetivo: "Montar a composição familiar, definir responsável, consolidar endereço e manter histórico do núcleo.",
        comoUsar: [
          "Use a aba Listagem de famílias para localizar um núcleo já cadastrado ou iniciar uma nova família.",
          "Na aba Composição familiar, adicione membros, informe o parentesco e defina um único responsável ativo.",
          "Na aba Composição familiar, os membros cadastrados continuam listados logo abaixo do card Novo membro, mantendo a leitura natural do fluxo de cadastro.",
          "Quando houver muitos membros, a rolagem acontece na própria tela da aba, sem criar rolagem interna dentro do card de Membros cadastrados.",
          "Quando o membro sair do núcleo, use transferência ou desmembramento para preservar histórico e rastreabilidade."
        ],
        atencoes: [
          "Não marque outro responsável se já existir um responsável ativo.",
          "Membros configurados para usar o endereço da família herdam o endereço principal do núcleo.",
          "A aba Listagem de famílias segue o mesmo padrão visual e estrutural da aba Listagem de beneficiários, com filtros no topo, limpeza rápida e tabela clicável.",
          "A tela Famílias e vínculos agora lista, abre, cria, atualiza, transfere, desmembra e inativa famílias sempre dentro do tenant autenticado, impedindo que uma instituição veja ou altere núcleos familiares de outra."
        ]
      }
    ]
  },
  {
    id: "atendimentos",
    titulo: "Atendimentos diários",
    descricao: "Tela operacional central do relacionamento com beneficiários e famílias.",
    icon: HeartHandshake,
    telas: [
      {
        nome: "Central de atendimentos",
        objetivo: "Consultar visão 360º, registrar atendimentos, benefícios, inscrições, encaminhamentos e custos.",
        comoUsar: [
          "Use a busca inteligente para localizar rapidamente o beneficiário por nome, código, CPF, telefone ou família.",
          "Abra a aba Resumo para ver alertas, indicadores e movimentações recentes.",
          "Registre novos atendimentos, benefícios, inscrições e encaminhamentos nas abas específicas para manter o histórico consolidado."
        ],
        atencoes: [
          "Antes de conceder benefícios críticos, confira alertas automáticos de duplicidade no beneficiário e no grupo familiar.",
          "A aba Custos resume impacto mensal, anual e histórico do beneficiário e da família.",
          "A Central de atendimentos agora carrega busca, visão geral, atendimentos, benefícios, encaminhamentos, histórico, custos, alertas e relatórios sempre dentro da instituição autenticada, sem misturar dados de outros CNPJs."
        ]
      },
      {
        nome: "Histórico geral",
        objetivo: "Concentrar em uma única tela o histórico completo do beneficiário dentro da instituição.",
        comoUsar: [
          "No topo da tela, pesquise o beneficiário por nome, CPF, código ou família e selecione o registro desejado com um clique.",
          "Depois de selecionar, acompanhe os dados cadastrais, os cards de resumo e as abas Visão geral, Benefícios, Atendimentos, Atividades atuais e Agendamentos futuros.",
          "Use os filtros por período, tipo de benefício, status, responsável e tipo de atendimento para refinar a leitura sem duplicar informações já registradas no sistema.",
          "O botão Imprimir ou salvar em PDF prepara a visão consolidada da tela atual para impressão ou geração de PDF pelo navegador."
        ],
        atencoes: [
          "A tela reaproveita dados reais já lançados na Central de atendimentos, em Doações realizadas, em Doações a realizar e em Agendamentos.",
          "Quando não houver movimentações vinculadas ao beneficiário selecionado, o sistema exibe a mensagem Nenhum histórico encontrado para este beneficiário.",
          "Os agendamentos futuros são filtrados pelo beneficiário real da agenda, incluindo cards coletivos onde ele esteja vinculado como participante."
        ]
      },
      {
        nome: "Prontuário eletrônico",
        objetivo: "Registrar atendimentos multiprofissionais em um prontuário único do beneficiário.",
        comoUsar: [
          "Localize o beneficiário por nome, CPF ou código e selecione o cadastro com um clique.",
          "Escolha a especialidade, registre a evolução e use Salvar rascunho para continuar depois.",
          "Finalize somente quando o registro estiver conferido; alterações posteriores devem ser feitas por adendo.",
          "A linha do tempo respeita sigilo e permissões. Conteúdos restritos não são exibidos para perfis sem autorização."
        ],
        atencoes: ["Os atendimentos são persistidos no PostgreSQL, vinculados ao tenant e auditados por ação."]
      },
      {
        nome: "Inscrições em cursos e atendimentos",
        objetivo: "Gerenciar inscrições em cursos, oficinas e atividades.",
        comoUsar: [
          "Consulte a listagem de inscrições para localizar cada inscrição individual já incluída, com beneficiário, curso, status, data da inscrição, agendamento e profissional; a tabela voltou a carregar os lançamentos reais já salvos na instituição, respeitando os filtros aplicados na própria listagem.",
          "O agendamento da inscrição fica destacado visualmente como agendado, pendente, cancelado ou finalizado, com filtros rápidos por status acima da tabela.",
          "A aba Catálogo e vagas voltou a usar uma fonte própria de dados, então os cards cadastrados continuam visíveis mesmo quando a listagem estiver filtrada.",
          "As fotos dos cursos, oficinas e atendimentos são enviadas para o storage autenticado do sistema; o cadastro grava apenas o caminho do arquivo e exibe a imagem na prévia e nos cards do catálogo, com fallback automático para a imagem original quando a miniatura não estiver disponível.",
          "Use os dados da inscrição para registrar turma, responsável, datas e observações.",
          "Quando o tipo for Atendimento, informe o horário inicial, o horário final e a duração de cada atendimento em minutos; o sistema prepara os horários individuais e calcula automaticamente a quantidade de vagas do período.",
          "Os horários de uma mesma especialidade/item e data são gravados em um único card da agenda, com cada beneficiário vinculado ao seu horário individual.",
          "O horário final é considerado como limite do período: das 19:00 às 21:00 com duração de 30 minutos são geradas quatro vagas, às 19:00, 19:30, 20:00 e 20:30.",
          "Na Faixa etária, use a opção Todas as idades para selecionar ou limpar todas as faixas de uma vez.",
          "Revise a fila de espera e a situação de vagas para apoiar decisões de encaminhamento.",
          "A tela global Agendamentos concentra a marcação dos inscritos, com data, horário, profissional e status, sem manter uma aba de agendamento dentro da tela de inscrições.",
          "Na aba Confirmar presença, a data da aula exibe somente datas reais da agenda e da frequência já registrada, sem botão para geração manual.",
          "Ao salvar as presenças, o sistema grava status, observações e auditoria no PostgreSQL e recarrega a mesma lista a partir do backend, sem depender de estado local do navegador.",
          "Na lista de presença, Presente e Ausente são opções independentes e mutuamente exclusivas. Depois que um registro já foi salvo, a primeira alteração exige confirmação explícita e a senha do usuário logado; essa autorização vale somente para a lista selecionada enquanto ela permanecer aberta. Ao trocar de curso ou data, a senha é solicitada novamente. Cada alteração fica registrada na auditoria com data, curso, beneficiário, status anterior, novo status e responsável.",
          "A barra superior da tela usa ações realmente contextuais por aba: a listagem fica com Buscar, Nova, Imprimir e Fechar; as abas de edição mostram apenas as ações que fazem sentido para aquele conteúdo, como Salvar dados da inscrição, Salvar catálogo e vagas, Salvar inscrições e fila ou Imprimir Frequência.",
          "Na impressão de frequência, o relatório agora consolida o acompanhamento por período, mostra presentes, ausentes, justificados e não informados, e não exibe campo de assinatura do beneficiário."
        ],
        atencoes: [
          "O botão Excluir da barra superior remove todo o curso configurado e exige confirmação específica antes da exclusão.",
          "Na aba Confirmar presença, a data exibida na lista e a data impressa na lista de presença agora seguem exatamente o mesmo dia informado, sem recuo por fuso horário.",
          "A tela de Inscrições em cursos e atendimentos agora carrega catálogo, listagem, detalhe, fila de espera, presença, beneficiários, profissionais e salas sempre dentro da instituição autenticada, sem exibir dados de outro CNPJ.",
          "O controle por horário é opcional e não altera cursos, oficinas ou atendimentos que não estejam com esse recurso ativado.",
          "Quando houver inscrições já realizadas e a tabela estiver vazia, revise primeiro os filtros do topo; o botão Limpar filtros restaura a visão completa da listagem."
        ]
      },
      {
        nome: "Agendamentos",
        objetivo: "Centralizar a agenda operacional da instituição com base em cursos, atendimentos e oficinas já cadastrados nas inscrições.",
        comoUsar: [
          "A aba Dashboard agora abre primeiro na tela para mostrar a visão resumida dos agendamentos logo na entrada do módulo.",
          "Na aba Agendamento, escolha o tipo entre curso, atendimento ou oficina para carregar apenas os itens já cadastrados nas inscrições.",
          "Depois de escolher o tipo, use o botão Abrir dados da inscrição caso ainda seja necessário inscrever os beneficiários; o sistema abre diretamente a aba Dados da inscrição.",
          "Os filtros rápidos foram removidos dessa aba para deixar a operação mais direta; o foco agora é montar o card sem distrações.",
          "Depois selecione o item desejado em cards operacionais exibidos lado a lado, em grade com dois cards por linha, para o sistema preencher automaticamente o resumo com profissional, dias, horário e local na mesma linha, sem redigitação manual.",
          "Use a lista de beneficiários vinculados ao item para marcar quem participará naquela data; a agenda operacional agora usa a própria matrícula da inscrição, os identificadores legados salvos no card e, quando necessário, a lista atual de matriculados do item para localizar o cadastro do beneficiário, exibindo no card e na seleção o telefone cadastrado da aba Contato e reaproveitando o mesmo dado nos envios.",
          "No topo da aba operacional, acompanhe primeiro o resumo do card com tipo, item, data e quantidade de beneficiários antes de montar a agenda.",
          "Na área principal, o campo Tipo fica ao lado da grade de itens do tipo selecionado, sem campo adicional de curso, atendimento ou oficina, e os beneficiários vinculados passam a aparecer em grade, lado a lado, para agilizar a marcação.",
          "Ao carregar os beneficiários para a agenda operacional, o sistema prioriza automaticamente os registros de cadastro que já tenham telefone e data de nascimento preenchidos, para evitar que nomes com vínculos incompletos apareçam sem contato ou idade no card.",
          "Informe a data do agendamento e use Gerar Agenda para salvar a agenda do dia com os participantes agrupados no mesmo card. Não há um segundo botão de salvar: o clique em Gerar Agenda já persiste um novo card, mesmo que já exista outra agenda para o mesmo item e data. Para alterar uma agenda existente, use o botão Editar do próprio card e depois Atualizar agenda.",
          "Quando o item for um atendimento com controle por horário, os horários disponíveis são gerados a partir do início, fim e duração configurados no cadastro. Escolha cada beneficiário diretamente no horário desejado; a ordem da lista não define a sequência dos atendimentos. Depois que um horário for ocupado em uma agenda do mesmo atendimento e dia, ele deixa de aparecer como disponível.",
          "Enquanto a agenda está sendo salva, a tela mostra um indicador de progresso com etapas de validação e gravação, para deixar explícito que a ação está em andamento até o banco confirmar a persistência.",
          "Depois de salvar, o card confirmado pelo backend fica destacado por alguns segundos na listagem para facilitar a conferência visual do resultado.",
          "Na listagem da agenda gerada, use a data em exibição com os botões de avançar e voltar para navegar pelos dias e ver somente os cards agendados naquela data, consultando sempre os registros gravados no PostgreSQL para evitar depender de cache, memória ou estado local.",
          "Agendas legadas que tenham sido gravadas sem os identificadores operacionais continuam visíveis e podem ser editadas pelo botão Editar do próprio card.",
          "Os cards ficam organizados por data e horário, em grade com duas colunas na agenda gerada, com cabeçalho verde, sombreamento visual, uma tarja verde clara para profissional, data, horário e local, lista de beneficiários em formato de tabela e botões compactos em linha única.",
          "Abaixo do nome de cada beneficiário, o card exibe a idade calculada a partir da data de nascimento quando esse dado estiver disponível no cadastro.",
          "O botão de confirmação do beneficiário agora mostra o estado atual e, ao clicar em A confirmar, confirma a agenda e muda o indicador para Confirmado.",
          "O botão Copiar agenda recria o card em outra data mantendo os dados do agendamento já persistidos no banco e gravando a nova data apenas após a confirmação do PostgreSQL.",
          "Dentro de cada card, os botões por ícone permitem copiar a agenda para outra data, remarcar a agenda, imprimir o agendamento com o relatório de frequência consolidado, acionar WhatsApp, enviar e-mail e excluir de vez a agenda da base quando necessário, sempre com popup visual do próprio sistema.",
          "Na impressão do agendamento e da lista de presença, Número, Código, Horário e Telefone usam larguras proporcionais ao conteúdo; Beneficiário ocupa a maior área da tabela e Assinatura mantém espaço adequado para preenchimento manual.",
          "Os ícones de WhatsApp e e-mail dos cards da aba Agendamento agora recarregam os contatos atuais do beneficiário antes do envio, inclusive em agendas antigas que ainda não tenham os vínculos auxiliares completos, tratam contatos inválidos individualmente e continuam processando os demais destinatários sem derrubar a ação com erro interno do servidor.",
          "Durante o envio por WhatsApp ou e-mail no card da agenda operacional, a própria tela agora mostra andamento visual do processamento, bloqueia cliques repetidos e informa quando o envio ainda está em curso.",
          "A versão exibida na interface passa a ser lida em runtime a partir da instância do backend, evitando manter número antigo em produção quando apenas o frontend não tiver recompilado com a constante embutida.",
          "Ao usar o botão de impressão do card, o sistema abre o relatório de acompanhamento de frequência em nova janela de visualização como folha A4 do G3N, com logomarca autenticada do relatório, nome da instituição em tamanho mais discreto, título do relatório ampliado, resumo do período em blocos compactos, tabela com presentes, ausentes, justificados e não informados por data e rodapé institucional, sem campo de assinatura do beneficiário.",
          "Na lista de beneficiários agendados dentro do card, use o ícone de verificado ou de interrogação dentro da própria coluna de ações, ao lado de mover e excluir, para alternar o status do participante entre confirmado e a confirmar.",
          "Cada beneficiário da agenda também pode ser remanejado individualmente para outro horário livre ou outra data, ou removido apenas daquele dia, sem precisar alterar todos os participantes do card.",
          "As mensagens preparadas para WhatsApp passaram a exibir a data do agendamento em português do Brasil.",
          "Na aba Dashboard, acompanhe pacientes agendados, frequência média, faltas da semana, sessões do mês, lista de espera, total de cards e confirmados em cards com ícones e leitura centralizada.",
          "Na aba Lista de espera, acompanhe demandas ainda não convertidas em agenda."
        ],
        atencoes: [
          "O agendamento operacional reaproveita dados reais das inscrições; se um beneficiário não estiver vinculado ao item, ele não poderá ser selecionado no card.",
          "Quando o telefone já existir no cadastro do beneficiário, a aba Agendamento e os cards vinculados devem mostrar esse número em vez de exibir Telefone não informado, e o relatório impresso deve usar o mesmo telefone formatado em padrão enxuto. Na ficha de agendamento e no relatório de frequência, a idade sai da coluna separada e passa a aparecer abaixo do nome do beneficiário.",
          "O sistema impede duplicidade do mesmo beneficiário dentro do mesmo card, mantém cards de cursos, atendimentos e oficinas diferentes na mesma data sem sobreposição, valida duplicidade por data, horário, profissional e atendimento, e registra auditoria de criação, edição, cancelamento, exclusão, cópia e envios.",
          "O envio por WhatsApp prepara links diretos para contato e o envio por e-mail depende de endereço válido cadastrado no participante."
        ]
      },
      {
        nome: "Receber doações",
        objetivo: "Registrar dados da doação, itens recebidos, recorrência e comunicação com o doador.",
        comoUsar: [
          "Preencha a aba Dados da doação e depois siga para Itens recebidos para lançar os produtos, quantidades e valores antes de concluir o registro.",
          "Na aba Cadastro do doador, os 4 modelos padrão aparecem primeiro com o nome da instituição e expandem ao clicar para mostrar os dados institucionais já conhecidos.",
          "Os cards das instituições padrão agora usam fundo verde claro para destacar visualmente os atalhos de preenchimento rápido.",
          "Na aba Itens recebidos, use Incluir doação e registrar entrada para salvar o registro completo com os itens já lançados e gerar a entrada no almoxarifado quando a doação for de bens de consumo.",
          "No campo Descrição dos itens recebidos, você pode reaproveitar a descrição de um produto já existente no almoxarifado; quando houver correspondência, a nova entrada soma a quantidade no mesmo item.",
          "A descrição lançada também passa por padronização visual antes de criar item novo no almoxarifado, mantendo capitalização mais limpa e consistente.",
          "A barra superior da tela usa nomes específicos por aba para deixar claro quando a ação salva o doador, a doação ou a comunicação."
        ],
        atencoes: [
          "O botão Incluir doação e registrar entrada finaliza o registro quando ele ainda estiver em rascunho para permitir a integração automática com o almoxarifado.",
          "Ao concluir a doação, o sistema agora também invalida o cache do almoxarifado para que a listagem e as movimentações reflitam os novos itens ao abrir a tela.",
          "A identificação de item existente considera diferenças de maiúsculas, minúsculas, espaços e acentos para evitar duplicidade como cesta basica e cesta básica.",
          "Os modelos padrão do cadastro do doador já trazem nome, telefone, cidade, endereço e observações institucionais quando esses dados foram confirmados em canal oficial.",
          "Se o cadastro do doador falhar por estrutura do banco ou regra de validação, a tela agora exibe a mensagem técnica útil retornada pelo backend em vez de mostrar apenas erro interno do servidor.",
          "O salvamento pela aba Itens recebidos não deve mais bloquear o registro por campo opcional numérico vazio no formulário principal.",
          "Quando faltar algum campo obrigatório real, o sistema continuará informando a pendência nominalmente no alerta.",
          "A tela Receber doações agora lista, abre, salva, exclui e consulta beneficiários, famílias, estoque e carência sempre dentro do tenant autenticado."
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
          "A troca de nomes na barra superior foi feita para reduzir ambiguidade operacional, sem alterar a lógica de cadastro, busca, exclusão ou impressão.",
          "A tela Ocorrências agora lista, abre, salva, exclui, anexa arquivos e gera PDFs sempre dentro do tenant autenticado."
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
          "A tela Registro de visitas agora lista, cadastra, atualiza e exclui visitas sempre dentro do tenant autenticado, impedindo que uma instituição visualize ou altere visitas domiciliares de outra.",
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
        nome: "Indicadores",
        objetivo: "Acompanhar a leitura gerencial da assistência com distribuição por idade, renda, vulnerabilidades, bairros e alertas de termos.",
        comoUsar: [
          "Use os filtros de data inicial e data final no topo da tela e depois clique em Visualizar para atualizar os indicadores do período.",
          "O card Faixa etária agora organiza os beneficiários por fases da vida em leitura direta: 0-12 crianças, 13-17 adolescentes, 18-29 jovens, 30-59 adultos e 60+ idosos.",
          "O gráfico Distribuição por idade continua disponível para análise detalhada por idade exata quando você precisar de leitura mais fina.",
          "Os cards Beneficiários ativos, Cadastro completo e Renda média familiar agora usam medidor KPI em estilo velocímetro de carro, sem ponteiro central para não esconder o valor exibido no meio do gráfico.",
          "O card Ranking de bairros exibe os 12 primeiros bairros no topo e permite rolagem para consultar os demais bairros cadastrados com a respectiva quantidade de beneficiários.",
          "Nomes de bairro iguais com formatação diferente, como caixa alta, caixa baixa ou capitalização inicial, são consolidados em uma única soma antes da exibição.",
          "Use Atualizar para recarregar os dados sem sair da tela quando houver novos cadastros ou mudanças recentes no período."
        ],
        atencoes: [
          "A leitura por faixa etária foi padronizada para fases da vida e não deve mais ser interpretada como lista solta de idades.",
          "Se não houver data de nascimento válida no cadastro, o beneficiário pode ficar fora da consolidação da faixa etária até a regularização do dado.",
          "Os indicadores da tela agora continuam segregados por tenant também no backend de relatórios e consolidações principais, evitando misturar instituição logada com dados de outro CNPJ."
        ]
      },
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
          "Se o mapa não carregar, valide apenas a conectividade do navegador com os tiles externos da CARTO.",
          "O mapa de vulnerabilidade e a busca de vínculos territoriais agora respeitam a instituição autenticada, sem sugerir beneficiários, famílias, profissionais, voluntários, unidades ou doadores de outro tenant."
        ]
      }
    ]
  },
  {
    id: "administrativo",
    titulo: "Administração e gestão",
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
          "Em kits com composição, a disponibilidade exibida pode ser maior que o estoque físico do item porque o sistema também considera os componentes suficientes para montar novas unidades.",
          "A tela Almoxarifado agora lista, gera próximo código, cadastra, atualiza, exclui, movimenta estoque e opera kits sempre dentro do tenant autenticado, impedindo mistura de itens e movimentações entre instituições."
        ]
      },
      {
        nome: "Controle de veículos",
        objetivo: "Gerenciar cadastro de veículos, mapa de bordo, locais de destino, motoristas autorizados e disponibilidade da frota.",
        comoUsar: [
          "Use a aba Cadastro de veículo para registrar placa, modelo, marca, dados do veículo, foto e documento em PDF.",
          "Na aba Listagem de veículos, selecione um item da lista para visualizar o resumo completo e usar a ação Editar veículo.",
          "Na aba Mapa de bordo, registre saídas, chegadas, condutor, destino e quilometragem do deslocamento. O campo Data abre preenchido com a data atual e não permite edição manual.",
          "Ao usar a ação Imprimir mapa de bordo, informe o veículo, a data inicial e a data final do período desejado para gerar o relatório.",
          "Na aba Disponibilidade de veículos, consulte a frota por data e hora, cadastre reservas ou indisponibilidades e abra a agenda filtrada do veículo selecionado.",
          "A consulta de disponibilidade identifica automaticamente veículos disponíveis, reservados ou indisponíveis e mostra a próxima liberação quando houver bloqueio contínuo.",
          "Ao cadastrar uma reserva ou indisponibilidade, use somente os veículos ativos do tenant autenticado e selecione sempre Reserva ou Indisponível; a opção Disponível é calculada pelo sistema.",
          "Na aba Locais de destino, mantenha os endereços de referência organizados para reaproveitar no mapa de bordo.",
          "Na aba Motoristas autorizados, selecione se a origem é Profissional ou Voluntário, digite ao menos duas letras e escolha o cadastro correspondente para vincular o condutor ao veículo.",
          "Na listagem de Motoristas autorizados, cada motorista aparece uma única vez, com os veículos autorizados consolidados no mesmo registro e a categoria da carteira visível na tabela.",
          "A barra superior da tela usa nomes específicos por aba, como Salvar veículo, Salvar mapa de bordo, Salvar destino e Salvar motorista autorizado."
        ],
        atencoes: [
          "Na aba Dashboard, a barra superior usa ações próprias do painel e o botão Abrir cadastro de veículo leva diretamente ao cadastro.",
          "No painel da visão geral da frota, o botão Abrir agenda de disponibilidade leva para a nova aba Disponibilidade de veículos com a consulta semanal como referência inicial.",
          "Na aba Listagem de veículos, a ação principal da barra superior passa a ser Editar veículo, evitando confusão com o salvamento do cadastro.",
          "Os botões da barra superior foram compactados e balanceados em largura para respeitar melhor o espaço do card e não avançar sobre o título da tela.",
          "A busca de Motoristas autorizados usa diretamente os cadastros de profissionais e voluntários, evitando duplicidade de cadastro de condutores.",
          "A impressão do mapa de bordo é gerada no próprio navegador sem abrir aba auxiliar, respeita o período informado no modal de impressão e segue o padrão institucional do G3N com nome da instituição, logomarca de relatório e rodapé oficial da unidade.",
          "A tela Controle de frotas agora lista, cadastra, atualiza e exclui veículos, diário de bordo, locais de destino e motoristas autorizados sempre dentro do tenant autenticado, impedindo mistura de dados entre instituições."
        ]
      },
      {
        nome: "Empréstimos para eventos",
        objetivo: "Controlar empréstimos de itens para eventos, agenda de reservas, itens vinculados e eventos associados.",
        comoUsar: [
          "Na aba Dados do empréstimo, selecione o evento, informe unidade, período, observações e escolha o responsável pela retirada a partir dos nomes cadastrados na aba Responsáveis.",
          "Na aba Eventos, cadastre eventos fixos de catálogo, sem data de início ou fim; informe título, status Ativo ou Inativo, local padrão e Promovido por. As datas pertencem ao empréstimo criado na aba Dados do empréstimo.",
          "Na aba Responsáveis, cadastre previamente os dados da pessoa que pode retirar os produtos, como nome, documento, telefone, e-mail e observações.",
          "Depois disso, na aba Dados do empréstimo, o campo Responsável passa a sugerir os nomes cadastrados na aba Responsáveis.",
          "Use a ação Confirmar reserva para marcar o empréstimo como agendado; depois disso, o fluxo operacional segue para Itens retirados e, por fim, Itens devolvidos.",
          "Ao abrir um empréstimo já cadastrado, o sistema agora reapresenta retirada, devolução, evento e agenda com a mesma data e hora salvas, sem deslocamento de fuso horário.",
          "Na aba Itens vinculados, digite o nome do item ou o número do patrimônio para localizar rapidamente patrimônio ou almoxarifado.",
          "Na aba Itens vinculados, escolha a unidade para listar apenas os patrimônios daquela localidade antes de adicionar os itens ao empréstimo.",
          "Quando a quantidade for maior que 1, marque exatamente os patrimônios correspondentes antes de adicionar ao empréstimo.",
          "Ao selecionar almoxarifado, marque os patrimônios correspondentes à quantidade solicitada.",
          "Itens patrimoniais vindos do almoxarifado são lançados individualmente no empréstimo e no termo, com uma linha para cada número de patrimônio.",
          "Na aba Listagem, as linhas são destacadas por status: agendado em amarelo, retirado em vermelho, devolvido em verde e cancelado em cinza.",
          "Ao imprimir a partir da aba Dados do empréstimo ou Itens vinculados, o sistema gera o termo de empréstimo em layout compacto no padrão de relatórios do G3N, com logomarca da instituição, cabeçalho institucional, corpo com dados do evento, responsável, período, itens e números de patrimônio, assinaturas e rodapé oficial da unidade.",
          "Na aba Agenda de empréstimos, acompanhe o calendário mensal interativo com dias livres, dias ocupados em vermelho e dias de apoio em amarelo para retirada e devolução.",
          "Clique em um dia da agenda para ver retirada sugerida, período do evento, devolução calculada, responsável, itens comprometidos e status de liberação.",
          "Após confirmar a reserva, use Confirmar por WhatsApp ou Confirmar por e-mail para avisar o responsável. O e-mail abre uma pré-visualização antes do envio e inclui as observações do empréstimo na mensagem.",
          "Use Adicionar ao Google Agenda no compromisso para abrir o Google Agenda com título, período, local, responsável e itens já preenchidos.",
          "Quando a data e hora de devolução vencerem sem confirmação de devolução, a tela exibe alerta operacional com ação de WhatsApp e envio de e-mail pelo servidor configurado do G3N para o responsável cadastrado.",
          "As mensagens de confirmação e cobrança informam o nome da instituição, listam os itens, incluem número de patrimônio quando houver e também exibem as observações do empréstimo.",
          "A barra superior usa ações específicas por aba, como Buscar empréstimos, Salvar dados do empréstimo, Salvar empréstimo com itens, Salvar responsável e Imprimir termo de empréstimo."
        ],
        atencoes: [
          "Quando o navegador bloquear a janela dedicada de impressão, a tela usa a impressão da própria página como contingência, sem deixar a operação travada em tela em branco.",
          "O módulo passou a manter cadastro próprio de responsáveis para retirada, sem depender apenas da lista de usuários internos.",
          "O backend agora revalida disponibilidade de itens no salvamento e bloqueia reserva acima do disponível, inclusive quando o mesmo item for informado mais de uma vez no mesmo empréstimo.",
          "A devolução de apoio é calculada no próximo dia útil quando o dia posterior ao evento cair em sábado, domingo ou feriado cadastrado.",
          "As ações de confirmação de reserva, retirada, devolução e cancelamento passaram a respeitar transições válidas de status para evitar movimentações incoerentes.",
          "O cadastro do empréstimo mantém compatibilidade com bases antigas criando automaticamente as colunas e a tabela novas necessárias quando ainda não existirem.",
          "A tela Empréstimos para eventos agora lista, cadastra, atualiza e exclui empréstimos, agenda, eventos, responsáveis, itens vinculados e movimentações sempre dentro do tenant autenticado, impedindo mistura de reservas entre instituições."
        ]
      },
      {
        nome: "Documentos da instituição",
        objetivo: "Controlar documentos institucionais, anexar arquivos e manter histórico de atualizações do documento.",
        comoUsar: [
          "Cadastre ou selecione um documento na lista para abrir o detalhamento completo.",
          "Quando um documento vencido for renovado, atualize a validade e salve o cadastro. A nova data passa a ser considerada exatamente pelo dia informado.",
          "Use o botão Visualizar documento no topo da aba Cadastro e edição para abrir o arquivo principal do cadastro ativo em um clique.",
          "Use a seção Arquivos do documento para anexar um ou mais arquivos, substituir, visualizar, imprimir ou excluir cada arquivo em um clique.",
          "Após cada alteração relevante, consulte o histórico do documento para acompanhar registros de cadastro, envio, troca e remoção de anexo."
        ],
        atencoes: [
          "O sistema aceita anexos PDF, JPG e PNG e grava apenas o caminho do arquivo no cadastro do documento, dentro da pasta do tenant autenticado.",
          "A renovação de documento vencido agora respeita corretamente a data de validade informada, inclusive quando a nova validade for o dia atual.",
          "Os arquivos podem ser selecionados antes do primeiro salvamento e são enviados automaticamente quando você clicar em Salvar, sem exigir um segundo ciclo de gravação.",
          "A tela mantém a fila de arquivos pendentes visível até a conclusão do envio e exibe a barra de progresso enquanto o documento e os anexos estão sendo enviados.",
          "Se o documento já estiver salvo, o anexo permanece disponível para substituição e exclusão sem duplicar arquivo no banco.",
          "A listagem de documentos mostra um clip quando há anexo cadastrado e orienta o usuário quando ainda não existe arquivo vinculado.",
          "A tela Documentos da instituição agora lista, cadastra, atualiza e exclui documentos, anexos, arquivos e histórico sempre dentro do tenant autenticado, impedindo mistura de documentos entre instituições.",
          "Os arquivos dessa tela passam a ficar em /storage/tenants/<tenant>/instituicoes/documentos, mantendo organização por instituição e facilitando backup e restauração."
        ]
      },
      {
        nome: "Ofícios e protocolos",
        objetivo: "Emitir, receber e acompanhar ofícios com protocolo, trâmites, imagens e PDF assinado dentro do fluxo institucional.",
        comoUsar: [
          "Use a listagem para localizar rapidamente os ofícios já cadastrados e abrir o registro completo para edição ou consulta.",
          "Ao criar um novo ofício, o sistema gera o próximo número automaticamente com base na data informada e no tenant da instituição logada.",
          "Na edição do ofício, mantenha identificação, conteúdo, protocolo e trâmites atualizados para preservar a rastreabilidade do documento.",
          "Use PDF assinado para anexar a versão final oficial do ofício e use Imagens quando precisar complementar o registro com arquivos visuais vinculados ao documento.",
          "Na geração do documento, o PDF institucional usa automaticamente o contexto da unidade e os dados da instituição do tenant autenticado."
        ],
        atencoes: [
          "A tela Ofícios e protocolos agora lista, numera, cadastra, atualiza, exclui, protocola, tramita, anexa imagens, guarda PDF assinado e gera documento sempre dentro do tenant autenticado, impedindo mistura de ofícios entre instituições.",
          "A numeração sequencial do ofício passou a ser independente por instituição, evitando colisão de números entre tenants diferentes."
        ]
      },
      {
        nome: "Checklist diário",
        objetivo: "Organizar a rotina administrativa por usuário com execução diária, visão semanal, recorrência e rastreabilidade operacional.",
        comoUsar: [
          "Acesse Administração e gestão > Checklist diário para abrir a central operacional da rotina.",
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
          "Use a geração semanal quando precisar preparar a semana operacional. A geração respeita os modelos ativos, evita duplicidade mesmo quando consultas simultâneas atualizam a tela e mantém o snapshot da atividade gerada."
        ],
        atencoes: [
          "Sábado e domingo permanecem desativados por padrão e não geram tarefas automáticas enquanto estiverem desligados.",
          "Pendência, atraso, conclusão, dispensa e não se aplica são status operacionais reais e devem refletir a execução do dia, não apenas controle visual.",
          "Toda conclusão, dispensa, reabertura, alteração de modelo e atualização de configuração gera histórico de auditoria do checklist.",
          "A geração semanal evita duplicidade por usuário, atividade e data, suporta a montagem completa do lote semanal e mantém o snapshot da atividade mesmo após edição posterior do modelo.",
          "Os indicadores do topo e da visão gerencial usam dados reais do banco e devem ser lidos como acompanhamento operacional da rotina.",
          "A tela Checklist diário agora lista execuções, semana, histórico, modelos, indicadores e configurações sempre dentro do tenant autenticado, impedindo mistura de rotinas administrativas entre instituições."
        ]
      },
      {
        nome: "Fotos de eventos",
        objetivo: "Gerenciar eventos institucionais com álbum persistido, capa do evento, galeria organizada e ações claras por contexto.",
        comoUsar: [
          "Na aba Listagem, use busca e status para localizar rapidamente o evento e acompanhe os indicadores de total de eventos, fotos, álbuns sem capa e evento com mais fotos.",
          "Na aba Mural de eventos, visualize mini cards com a foto principal de cada evento, status, data, local e total de fotos, usando 1 clique no card para abrir a galeria do evento. Quando a capa não estiver definida, o mural usa automaticamente a primeira foto do álbum e carrega a imagem por acesso autenticado, com fallback para o caminho original se a URL autenticada não responder.",
          "Na listagem de eventos, clique diretamente sobre a linha do evento para abrir o álbum, sem depender de botão de ação separado.",
          "Na aba Cadastro do evento, preencha os dados principais e use Adicionar fotos para fazer upload múltiplo antes mesmo do primeiro salvamento.",
          "Se as imagens estiverem organizadas em várias pastas, use Importar pastas para criar um evento novo por pasta; o título vem do nome da pasta, a data vem da data da foto, o status é gravado como Realizado e o campo local recebe o caminho da pasta importada.",
          "A área de importação também aceita arrastar e soltar várias pastas de uma vez, o que agiliza o cadastro em lote sem perder a separação por evento.",
          "Depois do upload, escolha visualmente a capa do álbum ainda no cadastro. A primeira imagem marcada como destaque será persistida como capa real no banco.",
          "Ao salvar, o sistema grava o evento, envia as fotos pendentes, define a capa e mantém o fluxo completo sincronizado entre cadastro, listagem e galeria.",
          "Quando o evento for salvo com sucesso, a tela passa a confirmar corretamente o cadastro sem exibir mensagem indevida de erro, mesmo quando houver fotos pendentes no mesmo fluxo.",
          "Na aba Álbum do evento, o card principal agora mostra a foto em destaque no topo e, abaixo dela, status, capa definida, nome do evento, data, local e as ações Adicionar fotos e Editar evento.",
          "Na aba Álbum do evento, as fotos protegidas também são carregadas por acesso autenticado para que álbuns já cadastrados voltem a exibir todas as imagens.",
          "Na aba Álbum do evento, use Adicionar fotos para complementar o álbum, Definir capa para trocar a imagem principal, Reordenar para ajustar a sequência visual e Excluir foto para remover itens específicos.",
          "Use Publicar evento quando o álbum já estiver consistente e o status precisar ser ajustado para realizado sem voltar para o formulário."
        ],
        atencoes: [
          "A capa do evento é persistida por vínculo com a foto cadastrada no álbum e pode ser substituída sem duplicar imagem ou deixar referência órfã.",
          "Ao carregar a listagem, eventos com fotos cadastradas e capa ausente ou inválida são compatibilizados para voltar a exibir imagem no mural.",
          "A remoção da foto principal limpa a capa atual do evento e exige nova definição visual quando necessário.",
          "As imagens ficam armazenadas em uma arvore unica do storage persistente, organizada em /storage/imagens por tipo e por entidade; o banco guarda apenas os metadados e caminhos do arquivo.",
          "As fotos de evento usam a pasta /storage/imagens/eventos e sao movidas para a pasta definitiva da entidade quando o cadastro recebe identificador valido, mantendo backups e organizacao consistentes.",
          "As ações mudam conforme a aba para evitar botões genéricos e reduzir clique desnecessário durante a operação.",
          "A tela Fotos de eventos agora lista, cadastra, atualiza e exclui eventos, fotos, capa, tags e galeria sempre dentro do tenant autenticado, impedindo mistura de álbuns entre instituições.",
          "A importação por pasta agora interpreta cada pasta como um evento separado, facilitando organizar o backup e o cadastro em lote sem misturar álbuns diferentes.",
          "As imagens do sistema passam por backup diário em pacote compactado às 23:30 quando o agendamento e as credenciais OAuth do Google Drive estiverem configurados.",
          "O backup envia as imagens para a mesma pasta base do Drive usada no restante da rotina e cria automaticamente a estrutura backup servidores/g3n/data do dia para manter banco, arquivos e fotos juntos no mesmo destino.",
          "Para habilitar o envio ao Drive, configure o id da pasta base, o client id, o client secret e o refresh token de uma conta Google dedicada ao backup, ou reutilize as credenciais OAuth já autorizadas se elas estiverem disponíveis no ambiente.",
          "A conta usada no OAuth precisa ter a pasta do Drive compartilhada com permissão de edição para receber os pacotes compactados."
        ]
      },
      {
        nome: "Lembretes diários",
        objetivo: "Organizar lembretes operacionais com execução diária, conclusão, adiamento e visão rápida de pendências.",
        comoUsar: [
          "Use a listagem para acompanhar os lembretes do usuário ou os lembretes marcados para todos os usuários da instituição.",
          "Ao cadastrar um lembrete, informe título, data inicial, hora do aviso e, quando necessário, o usuário responsável.",
          "Use Concluir para encerrar um lembrete já executado e Adiar para mover a próxima execução para nova data e hora sem perder o registro.",
          "O resumo da tela mostra rapidamente quantos lembretes ainda estão pendentes e quantos já estão vencidos no momento."
        ],
        atencoes: [
          "A tela Lembretes diários agora lista, resume, cadastra, atualiza, conclui, adia e exclui lembretes sempre dentro do tenant autenticado, impedindo mistura de lembretes entre instituições.",
          "Quando um lembrete for marcado para todos os usuários, ele continua restrito à instituição logada e não aparece em outros tenants."
        ]
      },
      {
        nome: "Patrimônio",
        objetivo: "Controlar bens patrimoniais com cadastro, atualização de estado e histórico de movimentações por instituição.",
        comoUsar: [
          "Use a listagem para localizar rapidamente o patrimônio e abrir o item para edição ou conferência do cadastro. Quando a busca for apenas numérica, o número patrimonial é comparado de forma exata e a coluna Unidade mostra a qual local cada registro pertence.",
          "Ao cadastrar um bem, selecione primeiro a unidade e depois informe o Número patrimonial; o campo sugere o próximo número da sequência da unidade selecionada, permite informar outro número manualmente e traz ícones ao lado do campo para usar o próximo número ou consultar os números vagos da sequência atual.",
          "Na listagem do patrimônio, use o botão Copiar do item desejado para abrir o cadastro com os dados já preenchidos e alterar apenas o que for necessário antes de salvar.",
          "Use a aba Categorias para cadastrar, editar ou excluir categorias e suas subcategorias de patrimônio, definindo também a taxa anual de depreciação e o status ativo ou inativo.",
          "Na aba Cadastro patrimonial, selecione a Categoria a partir da base cadastrada na aba Categorias; a tela não aceita categoria digitada livremente para evitar duplicidade de nomes.",
          "Depois de selecionar a categoria, o campo Subcategoria passa a listar as subcategorias vinculadas à categoria escolhida.",
          "Ao selecionar uma categoria, a tela sugere a taxa anual de depreciação correspondente e mantém a taxa editável para ajustes do cadastro.",
          "O campo Valor de aquisição usa máscara monetária brasileira e a estimativa contábil considera a data de aquisição, a taxa anual e a depreciação proporcional por meses.",
          "Na aba Localização e custódia, o card de conferência exibe Valor informado em verde quando o bem já tem valor de aquisição lançado, substituindo a referência ao histórico iniciado.",
          "Ao cadastrar um bem, informe unidade antes do número do patrimônio, depois nome, categoria, conservação, status, origem, responsável e demais dados de identificação. Novo cadastro sugere a unidade principal e permite selecionar qualquer unidade cadastrada. O número patrimonial é validado por unidade, então o mesmo código pode existir em unidades diferentes sem gerar conflito.",
          "Os campos Unidade da aba Cadastro patrimonial e da aba Localização e custódia usam a mesma regra de seleção; ao trocar a unidade, a sala é limpa e a lista de salas passa a seguir a nova unidade.",
          "Na aba Localização e custódia, o campo Unidade pode ser trocado a qualquer momento; ao alterar a unidade, a sala é limpa e a seleção passa a seguir a unidade escolhida sem voltar para o valor anterior.",
          "Na aba Localização e custódia, o campo Unidade lista as unidades cadastradas em Cadastro de unidade assistencial e, ao selecionar uma delas, o campo Sala passa a listar as salas cadastradas naquela unidade.",
          "Na aba Cadastro patrimonial, os campos Unidade, Número patrimonial e Nome do bem foram ajustados para manter melhor alinhamento visual no desktop.",
          "Na Visão geral, os cards Empréstimos para eventos e Catálogo e vagas de matrículas aparecem como cards de resumo na grade principal, no mesmo padrão visual de Itens no patrimônio.",
          "Use Registrar movimento para lançar movimentação, manutenção ou baixa, mantendo a trilha operacional do bem ao longo do tempo.",
          "Quando o tipo do movimento for Baixa, o sistema atualiza automaticamente o status do patrimônio para refletir a saída do item.",
          "No botão Imprimir, escolha entre Impressão geral para emitir a relação completa dos bens ou Impressão por local para gerar a lista dos itens vinculados a um ambiente específico, como cozinha, sala ou setor.",
          "As impressões geral e por local exibem o valor de cada patrimônio, totalizam somente no final da relação os valores incorporado, depreciado e geral, e usam linhas zebradas sem grade nos itens.",
          "A Impressão por local usa os locais cadastrados em Cadastro de unidade assistencial e suas salas de atendimento, mantendo os mesmos campos da impressão geral e destacando a localização para uso no mural da sala.",
          "A logomarca dos relatórios patrimoniais é carregada por acesso autenticado antes da impressão para preservar o cabeçalho institucional.",
          "Os relatórios de patrimônio seguem o padrão institucional do G3N com logomarca da unidade, título, corpo tabulado e rodapé oficial da instituição.",
          "O cabeçalho da impressão foi compactado para mostrar os dados do relatório em linha, sem cards, preservando mais espaço para a listagem dos bens."
        ],
        atencoes: [
          "A tela Patrimônio agora lista, cadastra, atualiza e movimenta bens sempre dentro do tenant autenticado, impedindo mistura de patrimônios entre instituições.",
          "O número patrimonial agora bloqueia duplicidade somente dentro da mesma unidade, permitindo o mesmo número em unidades diferentes quando o cadastro estiver corretamente vinculado.",
          "Ao copiar um patrimônio, o sistema mantém os dados do item original como base, mas abre o cadastro sem identificador para evitar sobrescrever o registro existente.",
          "Internamente, o patrimônio passa a guardar o vínculo da unidade por ID, enquanto a tela continua exibindo o nome fantasia para leitura operacional.",
          "Registros antigos sem tenant ou sem unidadeId continuam sendo considerados quando a unidade puder ser resolvida pelo nome, para não ocultar bens já cadastrados no sistema.",
          "Categorias com bens vinculados não podem ser excluídas; nesses casos, mantenha o histórico e use a edição ou inativação da categoria.",
          "A validação do número do patrimônio passou a ser exclusiva por unidade, permitindo o mesmo número em unidades diferentes sem conflito.",
          "A Impressão por local usa a localização atual do cadastro do bem para montar a relação que pode ser fixada no mural do ambiente.",
          "No relatório por local, o cabeçalho também exibe o local selecionado para evitar impressão sem identificação do ambiente."
        ]
      },
      {
        nome: "Tarefas e pendências",
        objetivo: "Controlar tarefas administrativas com checklist, histórico operacional e leitura rápida das pendências da instituição.",
        comoUsar: [
          "Use a listagem para acompanhar as tarefas cadastradas e abrir o item desejado para edição ou atualização do andamento.",
          "Ao cadastrar uma tarefa, informe título, descrição, responsável, prioridade, prazo, status e os itens do checklist quando houver etapas internas.",
          "Use o histórico da tarefa para registrar observações, avanços e ocorrências relevantes sem perder a trilha operacional.",
          "O resumo da tela mostra rapidamente o total de pendências e a quantidade de tarefas já classificadas como em atraso."
        ],
        atencoes: [
          "A tela Tarefas e pendências agora lista, resume, cadastra, atualiza, exclui tarefas, checklist e histórico sempre dentro do tenant autenticado, impedindo mistura de tarefas entre instituições.",
          "Checklist e histórico seguem vinculados apenas às tarefas da instituição logada e não são compartilhados entre tenants."
        ]
      }
    ]
  },
  {
    id: "juridico",
    titulo: "Jurídico e Compliance",
    descricao: "Formalização, acompanhamento e organização documental de instrumentos e planos institucionais.",
    icon: Link2,
    telas: [
      {
        nome: "Termo de fomento",
        objetivo: "Cadastrar, acompanhar e atualizar termos, aditivos e documentos oficiais vinculados aos instrumentos da instituição.",
        comoUsar: [
          "Use a listagem para localizar rapidamente os termos já cadastrados e abrir o registro completo para edição ou consulta.",
          "Na listagem, consulte a coluna Referente a para identificar rapidamente a finalidade ou o projeto relacionado a cada termo.",
          "No campo Responsável pela indicação, informe o nome e o cargo da pessoa que indicou ou articulou o termo, quando aplicável.",
          "Após salvar ou atualizar um termo, a tela retorna automaticamente para a aba Listagem de termos com o registro atualizado.",
          "Ao cadastrar um termo, informe número, tipo, a finalidade no campo Referente a, órgão concedente, vigência, situação, objeto, valor global e responsável interno.",
          "Use os aditivos para registrar alterações de prazo, valor ou condição do instrumento sem perder o histórico do termo principal.",
          "Na aba Documentos, salve o termo e use os campos de upload para armazenar o documento principal e os documentos relacionados no storage do sistema; o banco guarda apenas os metadados e o caminho do arquivo.",
          "Os documentos relacionados e anexos de aditivos ficam vinculados ao termo para manter a organização documental do processo.",
          "Na aba Aditivos, escolha um tipo padronizado e informe o novo valor com máscara monetária brasileira quando houver alteração financeira.",
          "Use Duplicar termo para criar uma nova cópia a partir de um termo existente, preservando os dados base e reiniciando o número e os aditivos.",
          "Quando o termo estiver completo, a ação Imprimir libera o relatório em layout oficial com dados gerais, documento principal, documentos relacionados e aditivos."
        ],
        atencoes: [
          "A tela Termo de fomento agora lista, abre, cadastra, atualiza, exclui termos, aditivos e documentos sempre dentro do tenant autenticado, impedindo mistura de instrumentos entre instituições.",
          "Aditivos e documentos permanecem vinculados apenas ao termo da instituição logada e não podem ser acessados por outro tenant.",
          "A impressão bloqueia a saída quando faltam dados obrigatórios ou o documento principal não está preenchido."
        ]
      },
      {
        nome: "Plano de trabalho",
        objetivo: "Montar e revisar o plano de trabalho por etapas guiadas, com ações de salvamento, validação, envio, aprovação e emissão documental no padrão do G3N.",
        comoUsar: [
          "Use a barra superior da tela conforme a aba atual: cada etapa mostra apenas os botões de ação que fazem sentido para aquele conteúdo.",
          "Na aba Anexos, por exemplo, aparecem ações de documento, PDF, impressão e exportação; nas abas sem anexo esse botão não é exibido.",
          "Na aba Dados da instituição, selecione uma unidade assistencial cadastrada para preencher automaticamente razão social, endereço, contato e representante quando houver dados disponíveis.",
          "No card Dados bancários, selecione uma conta bancária cadastrada para reaproveitar banco, agência, conta, Pix e observações estruturadas no próprio plano.",
          "Na Identificação do plano, o campo Órgão concedente ou parceiro oferece sugestões de órgãos municipais, estaduais e federais, mas também permite digitar manualmente outra instituição.",
          "Na Identificação do plano, selecione Responsável técnico e Responsável legal a partir dos profissionais ativos cadastrados no sistema.",
          "Quando o tipo for Termo de fomento, selecione um termo já cadastrado para vincular ao plano; se ele não existir, clique em Cadastrar termo para abrir a tela de termos de fomento.",
          "Use Salvar rascunho para registrar o plano mesmo com etapas incompletas; a porcentagem de conclusão indica o que ainda precisa ser preenchido. A validação de CPF ocorre quando o campo é informado.",
          "Na barra de progresso e na checklist final, clique em qualquer pendência para abrir a aba correspondente, rolar até o campo ou bloco necessário e posicionar o foco no local de preenchimento.",
          "Nos campos de objeto, justificativa, objetivo geral, objetivos específicos e descrição de metas, use Sugerir com IA para gerar um texto inicial com base no contexto informado. Revise e ajuste o conteúdo antes de salvar ou enviar.",
          "Na aba Apresentação e histórico, use Sugerir com IA nos campos de histórico, finalidade, experiência, registros, público atendido e capacidade técnica. A sugestão considera os dados da instituição e o conteúdo já digitado; ao clicar novamente, a IA aprimora a versão atual e exibe o motivo retornado pelo serviço quando a geração estiver indisponível.",
          "Na aba Justificativa, use Sugerir com IA nos cinco campos para estruturar o problema, causas, indicadores, capacidade de execução e impacto esperado. A segunda solicitação considera o texto revisado.",
          "Nas abas Monitoramento e avaliação e Prestação de contas, use Sugerir com IA nos campos textuais e de orientação. As sugestões consideram metas, objeto, indicadores e o conteúdo já revisado.",
          "As sugestões de IA dos campos textuais são tratadas como geração de conteúdo: elas usam o título do campo, o contexto preenchido e o texto atual, sem executar consultas de beneficiários, localização ou faixa etária.",
          "Ao informar datas de metas ou etapas, o sistema critica imediatamente o período e mostra as datas permitidas conforme o início e o fim da execução do plano.",
          "Órgãos concedentes ou parceiros com nomes longos podem ser salvos normalmente; a tela mantém espaço compatível para nomes completos.",
          "Ao abrir um plano existente pela listagem, os campos antigos ou sem preenchimento são normalizados automaticamente para permitir edição sem erro de navegação.",
          "Na listagem do plano de trabalho, as linhas usam cores por situação: amarelo para Em análise, verde para Aprovado, vermelho para Reprovado, branco para Rascunho, azul para Concluído e cinza para Em execução.",
          "Ao salvar o plano de trabalho, confira o modal padrão de confirmação com o número do cadastro e use Finalizar cadastro para fechá-lo.",
          "Quando o plano estiver completo, use Gerar PDF ou Imprimir nas ações do topo. O relatório possui capa, identificação, dados da instituição, apresentação e histórico, objeto, justificativa, objetivos, metas, etapas, cronograma, aplicação, desembolso, monitoramento, prestação de contas, anexos e declaração/aprovação.",
          "Quando o plano estiver completo para envio e os dados bancários essenciais estiverem preenchidos, a barra superior libera a ação de gerar PDF e imprimir no layout oficial do sistema.",
          "Os botões do topo continuam organizados em grade responsiva para não invadir o título da tela e facilitar a leitura em resoluções menores e maiores."
        ],
        atencoes: [
          "Os botões continuam executando em um clique e respeitam bloqueio temporário durante processamentos para evitar acionamento duplo.",
          "A tela Plano de trabalho agora lista, abre, cadastra, atualiza e exclui planos sempre dentro do tenant autenticado, impedindo mistura de dados entre instituições.",
          "O preenchimento automático usa os dados já cadastrados na unidade assistencial e na conta bancária; campos sem origem equivalente permanecem editáveis manualmente.",
          "Rascunhos aceitam campos ainda vazios e guardam os dados preenchidos para continuidade posterior; o envio para análise continua exigindo os campos obrigatórios e os documentos de conformidade.",
          "Metas, etapas, aplicação de recursos, desembolso e checklist de prestação seguem vinculados apenas aos planos da instituição logada.",
          "Se uma ação estiver desabilitada, revise o status do plano e os campos mínimos obrigatórios antes de tentar novamente."
        ]
      }
    ]
  },
  {
    id: "financeiro",
    titulo: "Contabilidade e finanças",
    descricao: "Controle financeiro simplificado, com foco em lançamentos e contas bancárias.",
    icon: PiggyBank,
    telas: [
      {
        nome: "Autorização de compras",
        objetivo: "Controlar solicitações de compra com itens, aprovação, cotações, reserva bancária e integração com financeiro, almoxarifado e patrimônio.",
        comoUsar: [
          "Use a listagem para localizar rapidamente as solicitações e abrir o processo desejado para edição, aprovação ou conclusão.",
          "Ao cadastrar uma solicitação, informe solicitante, setor, centro de custo, tipo de compra, prioridade, justificativa e os itens que compõem o pedido.",
          "Depois do cadastro, use o fluxo da tela para enviar para aprovação, registrar pareceres, lançar cotações, definir fornecedor vencedor e efetuar a reserva financeira.",
          "Quando a compra for concluída, a tela também pode gerar autorização de pagamento e integrar automaticamente materiais ao almoxarifado e bens ao patrimônio."
        ],
        atencoes: [
          "A tela Autorização de compras agora lista, abre, cadastra, atualiza, cancela, aprova, cota, reserva e conclui compras sempre dentro do tenant autenticado, impedindo mistura de processos entre instituições.",
          "Indicadores, setores solicitantes, orçamento setorial e níveis de aprovação passam a ser tratados por tenant para evitar reaproveitamento de configuração entre instituições.",
          "Cotações, reservas, histórico, anexos e integrações seguem vinculados apenas às compras da instituição logada."
        ]
      },
      {
        nome: "Lançamentos contábeis",
        objetivo: "Permitir que qualquer usuário registre receitas e despesas e acompanhe as contas bancárias com o mínimo de complexidade.",
        comoUsar: [
          "A tela foi simplificada para trabalhar somente com três abas principais: Painel financeiro, Lançamentos e Contas bancárias.",
          "Use Painel financeiro para ver saldo geral, contas a pagar, contas a receber, últimos lançamentos e próximos vencimentos em leitura rápida.",
          "O topo do Painel financeiro agora destaca quatro ações rápidas e autoexplicativas: Lançar entrada, Lançar saída, Programar pagamento e Transferir entre contas.",
          "Use Lançamentos para registrar receitas, despesas e ajustes com poucos campos: tipo, datas, conta bancária, natureza, favorecido ou pagador, histórico, valor e status.",
          "Na aba Lançamentos, o sistema também permite trabalhar no modo Transferência entre contas com formulário separado e mais simples.",
          "Na aba Lançamentos, o campo Valor aplica a máscara brasileira ao sair do campo, convertendo entradas como 1000 para 1.000,00 sem alterar o valor numérico salvo.",
          "O salvamento da aba Lançamentos passou a aceitar somente uma execução por vez, evitando duplicidade de débitos ou créditos quando houver clique repetido no botão de salvar.",
          "No campo Tipo da aba Lançamentos, a opção Estorno não aparece mais na criação manual; o estorno continua disponível apenas como ação específica para lançamentos já baixados.",
          "Quando o tipo for Ajuste, a tela exige informar se o ajuste deve aumentar ou diminuir o saldo da conta antes do salvamento.",
          "Na aba Lançamentos, os cards de resumo mostram rapidamente quantos lançamentos existem, quanto entrou, quanto saiu e o que ainda está em aberto.",
          "Ao salvar um lançamento em aberto, o sistema mantém o valor apenas como previsão financeira. O saldo bancário realizado só muda na baixa do lançamento.",
          "Quando o lançamento for de receita, a baixa soma o valor ao saldo da conta. Quando for despesa, a baixa subtrai o valor do saldo. Ajustes seguem a direção informada no cadastro.",
          "Quando não houver saldo suficiente na conta para um débito, pagamento ou outra saída, o sistema bloqueia a operação e informa que não há saldo para concluir o débito.",
          "Ao efetivar receita, despesa ou ajuste em qualquer conta bancária, o saldo realizado passa a seguir exatamente o valor informado no lançamento, sem duplicar débito ou crédito em nenhuma conta do sistema.",
          "Quando o lançamento for salvo já como Pago, Recebido ou Conciliado, o sistema também atualiza automaticamente o saldo realizado da conta bancária vinculada.",
          "Para excluir um lançamento, o sistema agora pede a senha do usuário autenticado e mantém o registro da exclusão no histórico financeiro para auditoria.",
          "Use Contas bancárias para cadastrar contas e depois acompanhar cada conta em cards com banco, agência, número, saldo atual, Pix, projeto vinculado e status.",
          "Na aba Contas bancárias, o bloco Fechamento mensal permite fechar a competência, gravar o saldo das contas e preparar a abertura do mês seguinte com base nesses saldos.",
          "Para editar uma conta, clique em Editar no card correspondente. Para iniciar um novo cadastro, use Nova conta bancária na barra superior ou no formulário."
        ],
        atencoes: [
          "As abas Fluxo de caixa, Centro de custo, Conciliação bancária, Integração com compras, Histórico, Anexos, Relatórios, Impressões e Emendas foram retiradas dessa tela para reduzir complexidade operacional.",
          "O estorno continua disponível somente para lançamentos já pagos, recebidos ou conciliados.",
          "O cadastro de centro de custo deixou de fazer parte do fluxo simplificado dessa tela.",
          "Quando o salvamento de um lançamento falhar, o popup passa a mostrar o motivo operacional retornado pelo backend, como referência inválida, campo fora do limite ou vínculo já existente, em vez de erro interno genérico.",
          "Ao salvar um centro de custo no backend, o sistema agora suporta perfis longos de permissões no histórico sem retornar erro interno do servidor.",
          "Se o valor do lançamento for digitado com vírgula, a tela passa a interpretar corretamente o número antes do salvamento.",
          "A tela Lançamentos contábeis agora lista contas, lançamentos, movimentações, transferências, conciliações, histórico, compras integradas e emendas sempre dentro do tenant autenticado."
        ]
      },
      {
        nome: "Receber doações",
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
        nome: "Captação de recursos",
        objetivo: "Organizar doadores, campanhas, doações, comprovantes e indicadores da captação sem cruzar dados entre instituições.",
        comoUsar: [
          "Use o Painel de captação para acompanhar arrecadação, recorrência, risco de retenção, campanhas públicas e prioridades comerciais somente da instituição logada.",
          "Na aba Cadastro de doadores, selecione o cadastro com 1 clique para abrir score de relacionamento, risco, próxima ação recomendada, histórico, comprovantes, campanhas e preferências de contato no mesmo fluxo.",
          "Na aba Retenção e tarefas do Cadastro de doadores, registre segmento, status de retenção, motivo de risco, score salvo, próxima ação e a fila operacional de follow-up do doador selecionado.",
          "Use o bloco Recuperação de recorrência para preparar ações rápidas de retenção, reativação ou upgrade e salvar tarefas com responsável e data prevista em 1 clique.",
          "Na gestão de doadores, campanhas, doações e comprovantes, trabalhe normalmente com listagem, cadastro, edição, cobrança, confirmação e emissão de comprovante em um clique por ação.",
          "Na área de configurações, mantenha mensagens, parâmetros de pagamento e regras operacionais da captação conforme a necessidade da instituição atual.",
          "Os relatórios e comprovantes emitidos pela tela passam a usar também os dados institucionais do tenant autenticado."
        ],
        atencoes: [
          "O Painel de captação continua calculando sinais automáticos a partir da base atual, mas a aba Retenção e tarefas agora também grava segmento, status, score salvo, motivo de risco e próximas ações para uso persistente por instituição.",
          "As tarefas de relacionamento da captação ficam vinculadas apenas ao doador e ao tenant autenticado, sem mistura entre instituições.",
          "A tela Captação de recursos agora lista, abre, cadastra, atualiza e movimenta doadores, campanhas, doações, comprovantes, configurações e logs sempre dentro do tenant autenticado.",
          "O portal do doador continua vinculado ao tenant do próprio cadastro para impedir acesso ou geração de cobrança em dados de outra instituição.",
          "Se houver troca de instituição na mesma estação, faça novo login antes de validar a tela para garantir recarga completa do cache por tenant."
        ]
      },
      {
        nome: "Prestação de contas",
        objetivo: "Organizar a prestação de contas em fluxo guiado, com leitura simples, conferência visual e revisão final antes do envio ou da impressão.",
        comoUsar: [
          "Comece pela aba Listagem para localizar um registro existente ou usar Novo para abrir uma nova prestação.",
          "Na listagem, use os filtros no topo para pesquisar por código, resumo, fontes, aplicações ou documentos, selecione a situação desejada e use Limpar filtros quando precisar reiniciar a busca.",
          "As linhas da tabela são clicáveis e o registro selecionado fica destacado visualmente para reduzir erro de operação.",
          "Na aba Visão geral, informe instrumento/parceria, tipo, período, objeto, total recebido, total aplicado, saldo disponível, prestado no mês e o resumo executivo.",
          "Na aba Receitas, cadastre cada entrada com fonte, valor, periodicidade e situação para consolidar a composição do total recebido.",
          "Na aba Aplicação dos recursos, detalhe onde o recurso foi utilizado, com percentual e descrição, para facilitar a leitura por quem analisa a prestação.",
          "Na Visão geral, informe despesas e pagamentos realizados com descrição, fornecedor, documento fiscal, data e valor. O sistema totaliza os lançamentos e mostra a diferença para o total aplicado.",
          "Na aba Documentos e checklist, lance os comprovantes e monte o checklist de conferência antes de avançar.",
          "Para anexar um documento real, salve primeiro a prestação, selecione o arquivo na área Enviar arquivo e clique em Enviar. Depois clique em Adicionar comprovante e salve novamente; os arquivos ficam no storage por tenant e podem ser abertos pelo comprovante.",
          "São aceitos PDF, documentos, planilhas e imagens de até 25 MB. O banco guarda apenas os metadados e o caminho lógico do arquivo.",
          "Na aba Revisão e envio, acompanhe a situação geral, as pendências encontradas pela tela, a timeline da prestação e os indicadores finais de conferência antes de salvar ou imprimir.",
          "Registre o parecer técnico, a conclusão, o responsável, a data, as ressalvas e as recomendações antes de tomar uma decisão formal. A conclusão precisa corresponder à ação escolhida no workflow.",
          "A elaboração e o envio para análise usam as permissões de elaboração. A devolução para diligência usa revisão. Aprovação, aprovação com ressalvas, rejeição e encerramento exigem permissão de aprovação; usuários de leitura podem consultar e auditar sem alterar o processo.",
          "O Histórico de versões do parecer registra cada salvamento do parecer com número da versão, usuário, data, conclusão, texto e ressalvas. Esse histórico é somente leitura e não pode ser apagado pela tela.",
          "Depois de salvar, use Enviar para análise. A prestação pode seguir para diligência, aprovação, aprovação com ressalvas, rejeição e encerramento conforme o workflow.",
          "Use as novas abas profissionais para cadastrar concedentes, parcerias e instrumentos, modelos do concedente, plano de trabalho, rubricas, recebimentos, despesas, metas, documentos, conciliação, diligências, aprovações, relatórios, transparência e auditoria.",
          "Na aba Configurações e IA, configure por tenant os provedores de IA e OCR, URL, modelo, timeout e credencial. A chave fica mascarada na interface e não deve ser exibida integralmente ao usuário.",
          "O Assistente de prestação de contas gera apenas rascunhos e sugestões. Ele não aprova despesas, não inventa documentos e sempre exige validação humana antes do uso em relatório, parecer ou resposta a diligência."
        ],
        atencoes: [
          "Os campos monetários exibem formatação brasileira e a tela alerta quando o saldo informado divergir do saldo calculado pelos totais.",
          "A prestação só fica realmente pronta para envio quando houver identificação do instrumento, período, objeto, receitas ou total recebido, aplicação ou total aplicado, comprovantes e checklist sem pendências.",
          "A revisão final mostra claramente o que ainda falta, evitando depender de treinamento informal para concluir a operação.",
          "A tela Prestação de contas agora separa os dados por instituição e CNPJ da sessão autenticada, incluindo listagem, detalhe, criação, edição, exclusão, recebimentos, destinações, comprovantes, timeline e checklist.",
          "A fundação profissional usa tabelas incrementais com exclusão lógica, auditoria e tenant autenticado. Não publique dados pessoais ou documentos protegidos na área de transparência."
        ]
      },
      {
        nome: "Doações realizadas",
        objetivo: "Registrar, consultar e imprimir o histórico de entregas realizadas a beneficiários e famílias com persistência no PostgreSQL.",
        comoUsar: [
          "Registre a entrega pela tela principal e aguarde a confirmação visual apenas depois do backend concluir a persistência da movimentação e do estoque.",
          "Se a entrega estiver fora da carência configurada, o sistema solicita autorização administrativa antes de concluir o salvamento.",
          "Use a aba Histórico de doações para localizar as entregas já registradas e imprimir a relação completa pelo ícone da impressora da tela.",
          "Quando precisar do comprovante individual, use o ícone da impressora na própria linha da doação para abrir e imprimir o recibo da entrega em um clique, com a logomarca institucional carregada na própria visualização.",
          "A impressão reaproveita a mesma sessão autenticada do operador para gerar o PDF sem exigir novo login durante a consulta.",
          "A impressão da relação segue o padrão visual do G3N, com colunas ajustadas para leitura e melhor aproveitamento da página."
        ],
        atencoes: [
          "O salvamento da entrega é transacional: registro principal, itens, baixa de estoque e retorno da tela precisam concluir juntos para a operação ser considerada realizada.",
          "Em caso de erro, o sistema mantém o formulário e exibe a mensagem operacional real retornada pelo backend.",
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
          "Documentos marcados como obrigatórios em Configurações do sistema precisam ser preenchidos também para chamadas diretas da API, não apenas pela validação visual da tela.",
          "O aceite LGPD deve ser marcado explicitamente pelo usuário responsável antes de salvar o cadastro.",
          "Se houver falha no processamento de um documento, o sistema agora informa qual documento apresentou erro e o motivo real retornado pelo backend.",
          "Revise nome do arquivo, tipo aceito, tamanho e integridade do anexo quando houver mensagem específica na tela."
        ],
        atencoes: [
          "Fotos e documentos do beneficiário ficam vinculados ao tenant da instituição autenticada e não devem ser acessíveis por outro CNPJ.",
          "Quando a foto 3x4 estiver salva, a prévia tenta primeiro a URL autenticada e, se houver falha de leitura, usa o caminho original para evitar sumiço visual da imagem já cadastrada.",
          "Datas de nascimento futuras ou inexistentes são bloqueadas no cadastro.",
          "A tela não deve mais exibir apenas erro interno do servidor nesse fluxo de documentos quando houver um motivo tratável.",
          "Mensagens de validação e persistência agora priorizam o motivo operacional real do erro."
        ]
      },
      {
        nome: "Cadastro de profissionais",
        objetivo: "Cadastrar e atualizar profissionais com dados pessoais, endereço, perfil profissional, agenda e foto do colaborador.",
        comoUsar: [
          "Use a foto 3x4 do profissional apenas em formatos aceitos pelo sistema e finalize o salvamento após revisar os dados principais.",
          "Na aba Listagem de profissionais, use Imprimir listagem para emitir a relação filtrada; nas abas do cadastro selecionado, use Imprimir cadastro para emitir a ficha individual no padrão institucional de relatórios.",
          "Ao concluir o cadastro de um profissional, confira a confirmação visual com o ícone na cor padrão da unidade e o número do cadastro. Clique em Finalizar cadastro para fechar a mensagem e continuar na tela.",
          "Quando houver falha no processamento ou na vinculação da foto, a tela deve exibir o motivo operacional real retornado pelo backend.",
          "Em produção, após trocar a foto do profissional, o sistema mantém o cadastro mesmo se a limpeza do arquivo antigo falhar no storage."
        ],
        atencoes: [
          "Falhas de storage antigo não devem mais derrubar a atualização do profissional em produção.",
          "Mensagens de erro do cadastro devem priorizar o motivo real da foto ou da gravação, sem cair em erro interno genérico quando houver tratamento possível.",
          "A compatibilidade com bases de produção legadas foi mantida removendo do ORM campos ainda não existentes na tabela cadastro_profissionais.",
          "A tela Cadastro de profissionais agora lista, abre, cadastra, atualiza e exclui sempre dentro do tenant autenticado, impedindo que uma instituição visualize ou altere profissionais de outra."
        ]
      },
      {
        nome: "Cadastro de voluntariado",
        objetivo: "Cadastrar e atualizar voluntários com dados pessoais, disponibilidade, endereço, interesses e foto do cadastro.",
        comoUsar: [
          "Preencha os dados do voluntário e salve normalmente em um clique após revisar nome, CPF, contatos, disponibilidade e área de interesse.",
          "Na aba Dados pessoais, selecione o campo Sexo entre as opções disponíveis no cadastro.",
          "Na aba Endereço, informe o CEP com máscara; ao completar um CEP válido, o sistema consulta o endereço e preenche logradouro, bairro, município e UF quando encontrados.",
          "Na aba Escalas, monte a agenda do voluntário escolhendo sala, tipo de atividade, dias da semana, hora inicial e hora final; o sistema calcula a carga semanal estimada e mantém a escala vinculada ao tenant.",
          "Ao salvar uma nova escala, confira o modal com ícone de sucesso e o número do cadastro. Clique em Finalizar cadastro para fechar a confirmação.",
          "A mesma aba agora exibe um mapa semanal com todas as escalas cadastradas no sistema, organizado por dia, sala, unidade e horário para facilitar a leitura da ocupação.",
          "A listagem detalhada do voluntário continua disponível abaixo do mapa para editar ou excluir apenas as escalas do cadastro aberto.",
          "Na aba Listagem de voluntários, use Imprimir para emitir a relação filtrada; nas abas do cadastro selecionado, use Imprimir e escolha entre ficha cadastral ou termo de voluntariado no padrão institucional de relatórios.",
          "Ao concluir o cadastro de um voluntário, confira a confirmação visual com o ícone na cor padrão da unidade e o número do cadastro. Clique em Finalizar cadastro para fechar a mensagem e continuar na tela.",
          "Quando houver foto 3x4, o sistema processa o arquivo antes do salvamento e informa o motivo real caso a imagem não possa ser utilizada.",
          "Em produção, o cadastro foi ajustado para funcionar também em bases legadas que ainda não possuem colunas novas de comunicação na tabela cadastro_voluntario."
        ],
        atencoes: [
          "Falhas tratáveis do cadastro ou da vinculação da foto agora retornam mensagem operacional em vez de apenas erro interno do servidor.",
          "A limpeza de foto antiga no storage não deve mais derrubar a atualização do voluntário em produção.",
          "A compatibilidade com a base legada foi mantida removendo do ORM os campos de comunicação ainda não existentes em alguns bancos de produção.",
          "O mapa semanal da aba Escalas é somente visual na visão geral do sistema; as ações de editar e excluir continuam restritas às escalas do voluntário aberto."
        ]
      }
    ]
  },
  {
    id: "portais-externos",
    titulo: "Portais externos",
    descricao: "Acessos públicos ou restritos para públicos externos da instituição.",
    icon: Globe2,
    telas: [
      {
        nome: "Menu Portais de acesso",
        objetivo: "Centralizar no menu interno os atalhos para todos os portais externos publicados pelo G3N.",
        comoUsar: [
          "Acesse Portais de acesso no menu lateral do G3N.",
          "Clique no portal desejado para abrir a rota pública em nova aba, sem perder a navegação interna do operador.",
          "Use esse menu para validar rapidamente os links externos antes de divulgar os endereços para doadores, voluntários, famílias, parceiros ou sociedade."
        ],
        atencoes: [
          "Os links usam as mesmas rotas públicas configuradas no frontend e validadas no pós-deploy.",
          "Em produção, o domínio público da instalação substitui o localhost; o caminho do portal permanece o mesmo."
        ]
      },
      {
        nome: "Portal do doador",
        objetivo: "Disponibilizar campanhas, dados do doador, doações, comprovantes e pagamento externo.",
        comoUsar: [
          "Use a rota /portal-doador para abrir o portal externo do doador no mesmo padrão visual do Portal da Transparência.",
          "Quando não houver token real disponível para teste, use Acessar demonstração para validar painel, doações, comprovantes, recorrências e preferências sem depender de backend.",
          "Mantenha campanhas, doadores, doações, comprovantes e formas de pagamento atualizados em Captação de recursos antes de divulgar o link.",
          "Quando o acesso vier de uma campanha ou doador identificado, confira se o vínculo do tenant está correto antes de gerar cobrança ou comprovante."
        ],
        atencoes: [
          "O Portal do doador já possui integração com a captação e deve continuar respeitando o tenant do cadastro vinculado.",
          "Dados de doadores e cobranças não devem ser expostos entre instituições diferentes."
        ]
      },
      {
        nome: "Portal do voluntário",
        objetivo: "Preparar o acesso de voluntários a oportunidades, escalas, horas registradas, certificados e termos.",
        comoUsar: [
          "Use a rota /portal-voluntario para abrir a interface externa do voluntário no padrão visual institucional dos portais públicos.",
          "O voluntário informa e-mail ou CPF e senha para acessar a área restrita.",
          "Após o acesso, o portal consulta o cadastro real do voluntário e exibe indicadores, área de interesse, disponibilidade, status e informações resumidas.",
          "Use o módulo Cadastro de voluntários para manter CPF, e-mail, status, disponibilidade, área de interesse e habilidades atualizados."
        ],
        atencoes: [
          "A primeira integração usa identificador e senha informados no portal para localizar o cadastro; a etapa seguinte deve evoluir para autenticação dedicada ou token seguro de convite.",
          "Horas, certificados e documentos devem ser exibidos apenas ao próprio voluntário ou a usuários autorizados."
        ]
      },
      {
        nome: "Portal do beneficiário e família",
        objetivo: "Preparar o acompanhamento externo de atendimentos, agenda familiar, documentos e comunicados.",
        comoUsar: [
          "Use a rota /portal-beneficiario-familia para abrir a interface externa da família acompanhada no mesmo padrão visual do Portal da Transparência.",
          "O beneficiário informa CPF e a senha de 4 dígitos criada no cadastro para acessar o portal.",
          "Se o mesmo CPF e senha estiverem vinculados a mais de uma instituição, o portal apresenta as instituições disponíveis; selecione uma para abrir somente os dados daquele vínculo.",
          "O portal carrega automaticamente as cores padrão da instituição após a autenticação para manter a identidade visual do tenant.",
          "Após o acesso, o portal consulta beneficiário, vínculo familiar, agenda, atendimentos e documentos pendentes em formato resumido.",
          "Mantenha CPF, código familiar, vínculos, contatos, agendamentos e documentos atualizados nos módulos internos para alimentar o portal."
        ],
        atencoes: [
          "Dados sociais são sensíveis e devem exigir autenticação forte, vínculo familiar validado e regra clara de consentimento.",
          "Não publique histórico social, documentos ou comunicados sem permissão explícita da instituição e do titular responsável."
        ]
      },
      {
        nome: "Portal da transparência",
        objetivo: "Publicar projetos, indicadores, documentos públicos, prestação social e evidências autorizadas.",
        comoUsar: [
          "Use /portal-transparencia para buscar uma instituição por nome ou CNPJ, ou /portal-transparencia/{slug} para abrir diretamente o portal público de uma instituição.",
          "O slug é único por instituição e garante que projetos, termos, documentos, campanhas, unidades e valores sejam filtrados pelo tenant correto.",
          "Dentro do portal, a logomarca da instituição selecionada é exibida e o botão Trocar instituição retorna à busca sem listar instituições antes da digitação.",
          "A página publica dados reais cadastrados no G3N e apresenta uma checklist de transparência com sugestões para informações ainda pendentes.",
          "Revise os dados de Termos de fomento, Planos de trabalho, Projetos, Prestação de contas, Documentos da instituição e Captação antes de divulgar a página."
        ],
        atencoes: [
          "O Portal da transparência é público por natureza; publique apenas informações aprovadas para divulgação externa.",
          "Dados pessoais, listas nominais e documentos internos devem permanecer protegidos."
        ]
      },
      {
        nome: "Portal do parceiro e financiador",
        objetivo: "Preparar o acompanhamento de projetos apoiados, metas, documentos, relatórios e comunicação com a equipe.",
        comoUsar: [
          "Use a rota /portal-parceiro-financiador para abrir a área externa de parceiros e financiadores no padrão visual do Portal da Transparência.",
          "O parceiro informa e-mail institucional e senha para acessar projetos autorizados.",
          "Após o acesso, o portal consulta projetos reais relacionados ao parceiro por fonte de recurso, responsável ou nome do projeto.",
          "Use o módulo Projetos para manter fonte de recurso, responsável, status e tarefas atualizados para alimentar o painel externo."
        ],
        atencoes: [
          "Parceiros devem visualizar apenas os projetos, contratos, relatórios e documentos vinculados ao próprio relacionamento.",
          "Prestação financeira e documentos de parceria exigem trilha de auditoria e permissão por instituição."
        ]
      }
    ]
  },
  {
    id: "vendas",
    titulo: "Vendas e Caixa",
    descricao: "Operacao de caixa para vendas de produtos em uma tela exclusiva de atendimento.",
    icon: ShoppingBasket,
    telas: [
      {
        nome: "Frente de caixa",
        objetivo: "Executar vendas em um modo dedicado, com busca de produtos do almoxarifado, lista de itens, subtotal, baixa de estoque, cliente opcional, historico persistido e impressao de notinha simples.",
        comoUsar: [
          "O grupo Vendas e Caixa fica disponível no menu principal para acessar as operações de caixa, histórico de vendas e eventos.",
          "Acesse Vendas e Caixa > Frente de caixa para abrir a operacao em tela exclusiva.",
          "Use a busca principal para localizar produtos por codigo ou nome e informe a quantidade antes de adicionar o item.",
          "Acompanhe a lista de itens, o subtotal e o historico lateral antes de abrir o pagamento e concluir a baixa do estoque.",
          "Use os atalhos do modelo para ajuda, busca, quantidade, pagamento e cancelamento de item.",
          "Ao concluir o pagamento, use a impressao da notinha simples como comprovante da venda."
        ],
        atencoes: [
          "A frente de caixa agora lista o historico e grava vendas apenas dentro da instituicao e do CNPJ autenticados, usando tambem o estoque do almoxarifado do mesmo tenant.",
          "Nesta entrega a frente de caixa usa os produtos reais do almoxarifado e registra a baixa simples de estoque na conclusao da venda.",
          "O fluxo considera impressao de notinha simples, sem emissao de nota fiscal ou TEF, mas com cliente opcional e historico de vendas salvo no sistema.",
          "Ao evoluir o modulo, manter o fluxo com um clique, feedback visual e revisao do manual na mesma entrega."
        ]
      },
      {
        nome: "Histórico de vendas",
        objetivo: "Consultar vendas ja registradas, aplicar filtros e reimprimir a notinha simples de cada atendimento.",
        comoUsar: [
          "Acesse Vendas e Caixa > Histórico de vendas para abrir a tela de consulta dentro do sistema.",
          "Filtre por cliente, forma de pagamento, data inicial e data final para localizar a venda desejada.",
          "Selecione uma venda da lista para visualizar cliente, pagamento, total e itens vendidos.",
          "Use o botao de impressao para reemitir a notinha simples do atendimento selecionado."
        ],
        atencoes: [
          "O historico de vendas agora mostra apenas registros da instituicao e do CNPJ autenticados, incluindo lista, filtros, detalhe e itens vendidos.",
          "A consulta usa o historico persistido pelo modulo de vendas e mostra os dados gravados no fechamento do caixa.",
          "A reimpressao gera apenas comprovante simples, sem valor fiscal.",
          "Ao alterar filtros, manter o uso com um clique e feedback visual durante o carregamento."
        ]
      },
      {
        nome: "Carteira digital do evento",
        objetivo: "Controlar creditos pre-pagos por participante em eventos da instituicao, com QR Code seguro, recarga, consumo nas barracas, extrato, dashboard e fechamento operacional em desktop e celular.",
        comoUsar: [
          "Acesse Vendas e Caixa > Carteira digital do evento para abrir o modulo completo dentro do sistema.",
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
    titulo: "Recursos humanos",
    descricao: "Rotinas de jornada, confirmação operacional e validação de identidade no registro de ponto.",
    icon: UserRound,
    telas: [
      {
        nome: "Contratação",
        objetivo: "Gerenciar candidatos, processo de contratação, entrevistas, documentos, ficha admissional, termos, PPD, carta ao banco e auditoria operacional do RH.",
        comoUsar: [
          "Use a listagem de candidatos para localizar rapidamente um processo pelo nome ou CPF e abrir o cadastro com um clique.",
          "Ao criar um novo candidato, preencha os dados principais e salve para o sistema abrir automaticamente o processo de contratação vinculado.",
          "Dentro do processo, avance pelas abas de entrevista, ficha admissional, documentos, arquivos, termos, PPD e carta ao banco conforme a etapa operacional do RH.",
          "Sempre revise o status do processo antes de salvar para manter a trilha correta entre triagem, andamento, aprovação e demais etapas adotadas pela instituição.",
          "Use a aba de auditoria para acompanhar quem criou, atualizou ou movimentou o processo ao longo da contratação."
        ],
        atencoes: [
          "A tela de Contratação agora lista, abre, cria, atualiza, inativa e movimenta candidatos e processos sempre dentro do tenant autenticado, impedindo cruzamento entre instituições com CNPJs diferentes.",
          "Entrevistas, ficha admissional, documentos, arquivos, termos, PPD, carta ao banco e auditoria seguem o mesmo isolamento institucional do processo principal.",
          "Quando houver bases antigas sem tenant preenchido, o backend faz adequação automática da estrutura e vincula os registros legados ao tenant correspondente antes de operar a tela."
        ]
      },
      {
        nome: "Registro de ponto",
        objetivo: "Registrar batidas com horário do servidor, localização do dispositivo e confirmação dupla por senha e face do usuário.",
        comoUsar: [
          "Ao abrir a tela Registro de ponto, a página inicial já destaca o botão Registrar ponto agora para acelerar a batida sem precisar entrar primeiro na aba específica de marcação.",
          "Acesse a aba Cadastro facial para capturar a face pela webcam e salvar o cadastro facial do usuário.",
          "Durante a captura pela câmera, use o molde do rosto na tela para centralizar a face antes de confirmar a imagem.",
          "Depois volte para a aba Registrar ponto para consultar a próxima batida, o espelho do dia e o saldo atual antes de marcar.",
          "Na aba Espelho de ponto, informe Período inicial, Período final e Funcionário e clique em Buscar registros para consultar exatamente o intervalo selecionado; o período aplicado aparece no cartão do espelho e também é usado no PDF.",
          "O espelho também exibe registros históricos criados antes da migração de tenant, desde que o funcionário pertença ao tenant autenticado.",
          "Na aba Espelho de ponto, use o botão Gerar espelho de ponto PDF para emitir o relatório individual em um clique; administradores podem selecionar o funcionário antes da emissão, enquanto usuários comuns emitem apenas o próprio espelho.",
          "O campo Funcionário da aba Espelho de ponto passou a listar somente usuários ativos e não deletados do sistema, evitando a exibição de cadastros antigos que já não fazem parte da operação atual.",
          "Registros históricos de ponto continuam preservados mesmo quando o usuário deixa de estar ativo no sistema; a limpeza afeta apenas o catálogo de seleção exibido na tela.",
          "No resumo do espelho de ponto, a tela mostra também a média trabalhada por dia, por semana e por mês para facilitar a leitura da jornada do período.",
          "As ocorrências do espelho de ponto são exibidas em texto curto e didático, por exemplo com indicação de atraso ou hora extra vinculada a E1, S1, E2 ou S2, e a marcação sem desvio aparece como Lançado corretamente.",
          "No espelho de ponto individual em PDF, a legenda de ocorrências é exibida com os significados de Falta, Atraso ou Saída Antecipada, Hora Extra, Abono ou Justificativa, Afastamento e Esquecimento.",
          "No espelho de ponto individual em PDF, a logomarca permanece isolada no cabeçalho e as informações de emissão, data, hora e período ficam centralizadas no título do relatório.",
          "Ao registrar o ponto, o sistema calcula automaticamente horas extras, banco de horas e atrasos com base no horário previsto e no horário real da batida, sem exigir confirmação adicional.",
          "Quando a jornada prevista do colaborador não estiver preenchida, o espelho usa a jornada padrão da instituição para não exibir totais zerados indevidamente.",
          "Somente após o cadastro da face o botão Registrar ponto agora fica liberado para a confirmação da batida.",
          "Ao clicar em Registrar ponto agora, informe o usuário e a senha. Se o modo escolhido for Somente senha, a marcação é concluída sem captura facial. Se o modo escolhido for Senha + captura facial, faça também a validação da face atual com prova de vida por duas piscadas ou leve virada do rosto antes do envio.",
          "Na aba Ajuste administrativo, escolha entre Somente senha ou Senha + captura facial antes de salvar a correção do registro.",
          "Na aba Aprovação de horas extras, o RH e os gestores aprovam, negam ou aprovam parcialmente entradas antecipadas sem alterar a marcação original.",
          "Quando a entrada ocorrer antes do horário previsto além da tolerância configurada, o sistema abre o modal de ciência com justificativa obrigatória e mantém a ocorrência pendente até decisão formal."
        ],
        atencoes: [
          "A geração do espelho em PDF usa o endpoint autenticado do registro de ponto e respeita a regra de acesso por usuário: administrador pode emitir para funcionários, demais perfis somente para si mesmos.",
          "A tela Registro de ponto agora lista usuários, carrega configuração, registra batidas, salva face, aplica ajustes, grava ocorrências, abre histórico e gera espelho sempre dentro do tenant autenticado, sem cruzar dados de outra instituição.",
          "O espelho de ponto passou a recalcular horas extras, banco de horas e atrasos a partir do horário previsto e do horário real, mesmo quando a batida ocorre antes ou depois do horário programado.",
          "As faltas do espelho representam o tempo ainda não cumprido nos dias fechados do período e não a simples diferença entre atraso e hora extra.",
          "Se a jornada do colaborador estiver em branco, o sistema usa a jornada padrão para manter o espelho calculado em vez de zerar os totais.",
          "A extra antecipada continua podendo seguir para análise do RH, mas a marcação não exige confirmação extra e não interrompe o fluxo de registro.",
          "No espelho de ponto individual em PDF, período e status do período agora aparecem na mesma linha do cabeçalho para facilitar a leitura.",
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
        nome: "Configurações do sistema",
        objetivo: "Definir regras que afetam obrigatoriedade, alertas e comportamento global do G3N.",
        comoUsar: [
          "Use Campos obrigatórios para definir quais documentos e campos devem ser exigidos no cadastro.",
          "Use a aba Cadastro de beneficiários para configurar prazo de revisão, regras de CPF, exigência de família, análise de duplicidade, alertas e pesos da completude por tenant.",
          "Use a aba Integrações e APIs para ativar provedores futuros, configurar ambiente, URL, timeout, tentativas, credenciais mascaradas e teste estrutural sem executar integração externa real nesta etapa.",
          "Revise parâmetros da Central de atendimentos para controlar alertas e critérios operacionais.",
          "Salve alterações somente após revisar o impacto nas telas relacionadas."
        ],
        atencoes: [
          "A tela Configurações do sistema agora lê e grava personalização, carência, obrigatoriedade e alertas sempre dentro do tenant autenticado.",
          "Os campos Card da visão geral e Card suave da visão geral ajustam somente a aparência dos cards da Visão geral; a paleta global continua controlando o restante da interface.",
          "O padrão inicial dos cards da Visão geral foi definido em cinza claro para facilitar leitura e contraste.",
          "O bloco Cadastros por tipo agora usa as cores padrão do sistema nos segmentos e indicadores, sem azul fixo.",
          "Os cards da tela Visão geral passaram a seguir a paleta definida em Personalização, permitindo alterar suas cores sem depender de estilos fixos do código.",
          "Ao trocar de instituição na mesma estação, a página recarrega os parâmetros da organização logada e não deve reaproveitar dados de outro CNPJ."
        ]
      },
      {
        nome: "Backup e restauração",
        objetivo: "Gerenciar cópias do banco de dados e das imagens geradas pelo sistema com geração, download e restauração guiada.",
        comoUsar: [
          "Use Gerar backup do banco para criar uma cópia completa do PostgreSQL antes de qualquer manutenção crítica.",
          "Use Gerar backup dos arquivos para preservar a árvore completa de documentos e imagens do storage do sistema em arquivo compactado.",
          "Selecione um item do histórico para baixar o arquivo gerado ou iniciar a restauração correspondente.",
          "Na restauração, digite RESTAURAR para liberar a ação e garanta que o ambiente esteja pronto para a intervenção.",
          "Os backups ficam organizados em /storage/backups/sistema para banco e imagens do histórico administrativo, e em /storage/backups/arquivos para a cópia diária local dos arquivos e imagens de usuários."
        ],
        atencoes: [
          "A restauração exige perfil de administrador e pode indisponibilizar temporariamente o banco ou as imagens enquanto o processo ocorre.",
          "O sistema cria um backup preventivo do banco antes de restaurar e preserva a árvore atual das imagens para rollback em caso de falha.",
          "Use a tela apenas quando houver janela operacional adequada e confirme com a equipe antes de substituir o estado atual."
        ]
      },
      {
        nome: "Licença de uso",
        objetivo: "Apresentar os planos comerciais do G3N em formato de página de vendas e permitir contratação com simulação, vigência e histórico financeiro no mesmo fluxo.",
        comoUsar: [
          "Ao clicar em Licença de uso no menu, a página abre direto no conteúdo comercial, sem etapa intermediária de escolha de aba.",
          "Use o topo comercial da página para comparar os planos, entender o posicionamento de cada faixa e acionar demonstração ou WhatsApp.",
          "Os valores mensais vigentes exibidos nos cards são: Essencial R$ 397,00, Profissional R$ 697,00, Premium R$ 997,00 e Enterprise R$ 1.497,00.",
          "Alterne entre mensal e anual para visualizar economia e custo-benefício antes de definir o plano.",
          "Consulte os cards comerciais, o comparativo entre planos, a seção Para quem é, os benefícios e o FAQ para apoiar a decisão.",
          "Ao escolher o plano e a data inicial do contrato, o sistema calcula automaticamente a vigência e prepara a contratação.",
          "Use Gerar cobrança para criar o checkout e acompanhar os quadros de pagamentos pendentes e realizados.",
          "Se a InfinitePay recusar a requisição ou houver falha de comunicação, o sistema mostra a mensagem técnica retornada pela integração em vez de erro interno genérico.",
          "Os alertas de vencimento usam automaticamente o e-mail cadastrado na unidade assistencial principal."
        ],
        atencoes: [
          "A licença fica vinculada ao CNPJ da unidade principal registrada no sistema.",
          "Cada instituição visualiza apenas a própria configuração, os próprios checkouts, o histórico financeiro e os alertas vinculados ao seu tenant/CNPJ.",
          "No plano Enterprise, a implantação inicial vigente é de R$ 2.497,00.",
          "A data final é recalculada automaticamente a partir da data inicial e do ciclo escolhido disponível na página comercial.",
          "Cada checkout gerado entra primeiro no histórico como pendente e migra para realizado quando a InfinitePay confirma o pagamento.",
          "No ciclo anual, a implantação continua isenta conforme a política comercial definida."
        ]
      },
      {
        nome: "Mensagens personalizadas",
        objetivo: "Gerenciar mensagens pré-prontas, sugestões da IA, categorias, destinatários e histórico de envios por WhatsApp e e-mail.",
        comoUsar: [
          "Use o Dashboard de envios para acompanhar totais, falhas, canais e mensagens mais utilizadas.",
          "Na aba Mensagens pré-prontas, filtre, visualize, edite, duplique e ative ou inative modelos reutilizáveis.",
          "Na aba Categorias e assuntos, mantenha categorias, assuntos, tipos de comunicação e tags usados nos modelos.",
          "Ao preparar um envio, selecione destinatário, canal, assunto e conteúdo e confira a prévia final antes de disparar.",
          "Na seleção individual, digite pelo menos duas letras do nome e aguarde a busca automática ou clique em Buscar; depois selecione o destinatário para habilitar a prévia e a confirmação do envio.",
          "A prévia permanece estável após ser carregada e só é atualizada quando a mensagem, o canal ou o destinatário realmente mudam.",
          "Use Configurar envios para verificar a integração de e-mail, o modo de WhatsApp e as regras de conferência."
        ],
        atencoes: [
          "A tela Mensagens personalizadas lista, abre, cria, edita, duplica, inativa, remove e registra histórico sempre dentro do tenant autenticado.",
          "Cada destinatário gera seu próprio registro no histórico com mensagem final, canal, contato e resultado; o dashboard consolida esses registros.",
          "A busca de destinatários considera apenas beneficiários, profissionais, voluntários, doadores e instituições da própria organização logada e permanece compatível com bases legadas sem colunas opcionais de autorização de comunicação.",
          "Ao trocar de instituição na mesma estação, faça novo login para garantir recarga completa do cache da tela por tenant."
        ]
      },
      {
        nome: "Pergunte à IA",
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
          "Na central Pergunte à IA, a barra de envio foi reorganizada para manter os botões acessíveis sem sobrepor o ícone do robô.",
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
          "O vínculo de origem importada ajuda a evitar duplicidade e deixa rastreável de onde o cadastro do usuário foi criado.",
          "A tela Usuários e permissões agora mantém listagem, detalhe, busca de origem, auditoria e ações administrativas somente dentro do tenant autenticado.",
          "O usuário master htasistemas@gmail.com é tratado como administrador superadmin e não deve ser bloqueado por status ou por tentativas inválidas de acesso."
        ]
      },
      {
        nome: "Chamado técnico",
        objetivo: "Registrar, acompanhar e organizar chamados técnicos com histórico, comentários, anexos, vínculos, filtros salvos e catálogo operacional da instituição.",
        comoUsar: [
          "Use a listagem para localizar chamados por código, resumo, cliente, solicitante, situação, prioridade e demais filtros operacionais da tela.",
          "Ao abrir um chamado, acompanhe detalhes, comentários, histórico, vínculos e anexos no mesmo fluxo para manter o atendimento técnico centralizado.",
          "Use comentários e mudanças de situação para registrar evolução real do atendimento, sem depender de anotações externas.",
          "Salve filtros frequentes quando precisar repetir consultas operacionais do suporte da instituição ao longo do dia.",
          "Na abertura ou edição do chamado, selecione responsáveis e parâmetros do catálogo apenas dentro dos usuários disponíveis da própria instituição."
        ],
        atencoes: [
          "A tela Chamado técnico agora lista, exporta, abre, cria, atualiza, desativa, altera situação, comenta, vincula, anexa arquivos e salva filtros sempre dentro do tenant autenticado, sem cruzar chamados entre instituições diferentes.",
          "Comentários, histórico, vínculos, anexos, estado de leitura e filtros salvos seguem o mesmo isolamento institucional do chamado principal.",
          "O catálogo de usuários do chamado técnico também passou a carregar apenas usuários do tenant autenticado."
        ]
      },
      {
        nome: "Painel master",
        objetivo: "Administrar os tenants do G3N em base PostgreSQL compartilhada, com identificação por instituição e operação exclusiva para superadmin.",
        comoUsar: [
          "Use o menu Painel master > Clientes registrados para cadastrar cada cliente do G3N como um tenant separado, com CNPJ, slug, plano, status e contato principal.",
          "Na listagem, pesquise por razão social, nome fantasia, CNPJ, slug, código da instituição ou e-mail e clique na linha para abrir o tenant.",
          "Na aba Cadastro do tenant, revise os dados da instituição, plano contratado, identidade visual e status operacional antes de salvar.",
          "Ao atualizar o e-mail principal de um tenant já existente na aba Cadastro do tenant, o sistema sincroniza esse endereço com o administrador inicial principal para preservar o acesso ao login da instituição.",
          "Ao preencher a razão social, o sistema gera automaticamente o slug e o código da instituição; se necessário, o usuário pode editar ambos manualmente antes do salvamento.",
          "Na criação de um novo tenant, a aba Administração inicial exige o administrador inicial com login, e-mail e senha para liberar o primeiro acesso; a senha informada é gravada com segurança e passa a ser a credencial do primeiro acesso do novo cliente.",
          "O administrador inicial criado nessa etapa já nasce com acesso administrativo efetivo no tenant, inclusive à tela de usuários e às permissões compatíveis com o perfil administrativo.",
          "O salvamento de um tenant novo com Administração inicial agora prepara antes a estrutura de usuários e permissões necessária no backend, evitando falha interna do servidor ao concluir o cadastro.",
          "O login e o e-mail do administrador inicial passaram a respeitar unicidade por tenant, sem bloquear o cadastro apenas porque o mesmo endereço já existe em outra instituição.",
          "Na aba Administração inicial do painel master, o sistema passou a permitir cadastrar usuários adicionais vinculados ao tenant atual, com nome, login, e-mail, senha, perfil de acesso e status.",
          "A listagem de usuários dessa aba mostra os acessos já cadastrados no tenant selecionado e permite registrar novos usuários sem sair do contexto da instituição atual.",
          "Ainda na aba Administração inicial, clicar em um usuário da lista carrega seus dados para edição, permitindo alterar nome, login, e-mail, perfil de acesso e status sem perder o vínculo com o tenant atual.",
          "Na edição de usuários do tenant na tela master, o sistema também passou a oferecer redefinição explícita de senha com confirmação e opção de exigir troca no próximo acesso.",
          "Ao redefinir a senha de um usuário do tenant na tela master, o sistema grava a nova credencial com segurança e mantém o vínculo do usuário com a instituição atual.",
          "Na tela de login, quando o CNPJ e o e-mail informados não corresponderem ao administrador inicial cadastrado, o sistema avisa que o e-mail está vinculado a outra instituição e orienta a revisar a Administração inicial.",
          "Na tela de login, a mensagem de senha inválida passou a indicar de forma mais clara que a credencial informada não confere com o usuário autenticado, facilitando a conferência do cadastro.",
          "Na tela de login, quando o usuário informar apenas o e-mail e a senha, o sistema tenta identificar automaticamente a instituição do acesso se esse e-mail for exclusivo de um único tenant.",
          "Se o mesmo e-mail existir em mais de um cliente, o sistema pede CNPJ, código ou slug para evitar autenticação no tenant errado.",
          "Quando o tenant já existir, use a aba Administração inicial para redefinir a senha provisória do administrador e forçar troca no próximo login.",
          "Ao redefinir a senha do administrador pela tela master, o sistema também reativa esse usuário e zera as tentativas inválidas de login.",
          "Use a ação Desbloquear acesso para reativar uma instituição bloqueada e liberar, em um clique, todos os usuários bloqueados daquele tenant por tentativas inválidas.",
          "A tela de login do sistema agora aceita CNPJ da instituição e e-mail do usuário; quando houver subdomínio configurado, o sistema identifica automaticamente a instituição pelo endereço.",
          "A tela de login passou a usar fluxo em etapas: identificação da instituição, credenciais do usuário e verificação adicional quando necessária.",
          "Todo login de usuário master exige, após a senha correta, a confirmação do código de 6 dígitos enviado ao e-mail cadastrado; o token e a sessão só são emitidos depois dessa confirmação. A regra também se aplica ao login master com Google, e a passkey não substitui essa confirmação.",
          "O botão Entrar com Google é renderizado na etapa de credenciais do usuário, após o container visual existir na tela, evitando que o login fique preso em Preparando login com Google.",
          "Na tela Configurações gerais > Usuários, o campo Exigir autenticação segura por e-mail define individualmente se o usuário deve confirmar o acesso com contrassenha enviada por e-mail.",
          "Quando a autenticação segura estiver desmarcada, o usuário entra apenas com CNPJ, e-mail de acesso e senha.",
          "Na mesma tela de usuários, as opções Permitir biometria facial no login e Exigir biometria facial no login controlam a validação por câmera após a senha, usando a face já cadastrada no usuário.",
          "A tela Configurações gerais > Usuários também permite cadastrar, atualizar e remover a biometria facial diretamente no usuário selecionado, mesmo quando ele não possui vínculo com registro de ponto, profissional, beneficiário ou voluntário.",
          "No cadastro facial pela tela de usuários, o vídeo da webcam permanece montado no popup e recebe o stream da câmera após a autorização do navegador, evitando tela preta durante a captura.",
          "Quando a biometria facial for solicitada no login, a captura abre em um popup sobre a tela para manter o formulário compacto e evitar rolagem desnecessária.",
          "Se a biometria facial for exigida e a face ainda não estiver cadastrada, o acesso é recusado até que o administrador prepare o cadastro facial do usuário.",
          "Após autenticação por senha ou MFA em navegador compatível, o usuário pode cadastrar uma passkey do dispositivo para entrar nas próximas vezes com biometria ou PIN.",
          "A opção Entrar com passkey exige e-mail e instituição para localizar a credencial correta, fica disponível para usuários sem autenticação segura por e-mail marcada e mantém a mesma auditoria de acesso do login tradicional.",
          "O Assistente de acesso orienta dúvidas comuns sobre CNPJ, e-mail, portal correto e segurança sem revelar dados sensíveis.",
          "Quando o usuário informa CNPJ, slug ou código incorreto na autenticação, o sistema agora diferencia se o problema está na instituição localizada ou apenas na senha digitada.",
          "O e-mail master htasistemas@gmail.com pode entrar na tela de login pela ação Acessar como master, sem informar CNPJ, código ou slug; se houver um CNPJ digitado, o sistema desconsidera esse filtro e também ignora status bloqueado ou inativo da instituição vinculada para preservar o acesso administrativo global.",
          "O campo Senha da tela de login agora possui botão de visualizar ou ocultar a senha digitada no mesmo clique, facilitando a conferência antes de entrar.",
          "A autenticação da tela de login ocorre primeiro e o carregamento da rota seguinte acontece em segundo plano, sem bloquear o acesso caso o pré-carregamento da página falhe.",
          "Na recuperação de senha da tela de login, o sistema passou a considerar também a instituição informada no acesso, evitando redefinir senha em tenant incorreto quando houver e-mails iguais em bases diferentes.",
          "No desktop, ao informar o CNPJ, o resumo da instituição aparece abaixo da foto lateral direita para liberar mais espaço útil no formulário de acesso.",
          "Na lateral direita do login, o espaço entre a foto e o card com os dados da instituição foi reduzido para deixar a composição mais próxima e melhor aproveitada.",
          "Os cards de dados da instituição e de apresentação do Sistema G3 na lateral direita também passaram a ficar sem vão entre si, formando um bloco visual contínuo, sem empurrar o card institucional para o rodapé.",
          "A foto lateral do login voltou a usar altura maior para ganhar mais presença visual na composição desktop.",
          "A altura da foto lateral foi ampliada novamente para ocupar mais área vertical no desktop, conforme ajuste visual da tela de acesso.",
          "A tela de login usa rolagem vertical segura, colunas responsivas e indicadores compactos para preservar as informações em celulares, notebooks e monitores maiores.",
          "Os cards laterais do login comunicam benefícios em linguagem de usuário: acesso seguro, dados protegidos e entrada inteligente.",
          "O usuário administrativo padrão htasistemas@gmail.com é tratado como superadmin master no acesso SaaS e pode abrir a tela Clientes registrados mesmo sem depender de configuração manual adicional.",
          "No topo principal do sistema, o cabeçalho passou a exibir nome da instituição e nome do usuário, sem mostrar o plano contratado.",
          "Ao entrar com outra instituição, a unidade principal atual, a logomarca do topo e os dados da visão geral passam a ser recarregados por tenant, evitando reaproveitar cache ou identidade visual da instituição anterior.",
          "A API de unidades assistenciais agora exige o tenant autenticado em leitura e escrita, impedindo que um CNPJ carregue a unidade principal, a logomarca ou os dados institucionais de outro cliente.",
          "Os indicadores da tela Visão geral também passaram a ser calculados por tenant no backend, impedindo que beneficiários, famílias, financeiro, cursos, doações e termos de uma instituição apareçam para outra.",
          "O card Catálogo e vagas de matrículas, assim como os cards de Cursos ativos, Doações no período e Visitas domiciliares, agora consideram apenas o tenant autenticado, inclusive nas tabelas reais de cursos, matrículas, visitas e doações.",
          "Os cards Biblioteca, Patrimônio e Almoxarifado da Visão geral também passaram a depender das tabelas reais segregadas por tenant, impedindo reaproveitamento de acervo, bens e estoque entre instituições.",
          "A segregação da Biblioteca foi estendida também para a base singular biblioteca_livro e para biblioteca_emprestimo, eliminando o vazamento de acervo legado entre instituições.",
          "A própria tela Biblioteca agora lista, cria, atualiza e remove livros e empréstimos sempre dentro do tenant autenticado, impedindo que a RNP visualize ou manipule exemplares e empréstimos da ADRA.",
          "Na aba Cadastro de livros da Biblioteca, use as ações de um clique Imprimir listagem e Imprimir cadastro para emitir, respectivamente, a relação do acervo ou a ficha individual do livro selecionado; nas demais abas, a impressão gera painel ou listagens de empréstimos, devoluções, disponibilidade e alertas em PDF pelo template central de relatórios do G3N, com cabeçalho, metadados e rodapé institucionais.",
          "A tela Agendamentos agora lista agenda, indicadores, lista de espera, participantes e notificações sempre dentro do tenant autenticado, impedindo que uma instituição veja pacientes agendados ou histórico operacional de outra.",
          "As telas Chamada de senhas e Painel de senhas agora emitem, chamam, finalizam e exibem filas, chamadas e configurações sempre dentro do tenant autenticado, impedindo reaproveitamento de senhas entre instituições diferentes.",
          "Na tela Prontuário eletrônico, use Chamar próximo beneficiário para abrir a fila de senhas, conferir o destino informado e escolher um beneficiário específico ou chamar o próximo da fila.",
          "Na aba Agendamento, os cursos e atendimentos são apresentados em cards selecionáveis; o botão Abrir inscrições e lista de espera leva diretamente à aba correspondente antes da geração da agenda.",
          "No campo Tipo de atendimento do Prontuário eletrônico, selecione Atendimento Proativo (Busca Ativa), Atendimento Programado (Acompanhamento), Atividades Coletivas e Comunitárias, Demanda espontânea ou Demanda referenciada; após a seleção, o sistema exibe um popup com a descrição e os exemplos do tipo escolhido.",
          "Ao salvar ou finalizar um atendimento, o horário inicial é convertido corretamente e o registro finalizado passa a aparecer na Linha do tempo do beneficiário.",
          "A tela Receber doações agora lista, abre, cadastra, atualiza, exclui e pesquisa doadores sempre dentro do tenant autenticado, inclusive na integração automática com o almoxarifado, impedindo mistura de doações e doadores entre instituições.",
          "A tela Cadastro de beneficiários agora lista, abre, cadastra, atualiza, exclui e gera o próximo código sempre dentro do tenant autenticado, impedindo que uma instituição veja os beneficiários de outra.",
          "A tela Usuários e permissões agora lista, abre, cadastra, atualiza, altera status, reseta senha e exclui sempre dentro do tenant autenticado, impedindo acesso cruzado entre instituições mesmo quando alguém tenta operar por ID direto.",
          "A tela Configurações do sistema agora salva personalização, carência, obrigatoriedades e alertas por tenant, então mudanças de cor, regras e alertas afetam apenas a instituição logada.",
          "A estrutura da tabela parametros_sistema também foi ajustada para remover o índice global legado por chave, evitando erro interno do servidor ao salvar a mesma configuração em tenants diferentes.",
          "Administradores iniciais de tenants criados antes do ajuste de permissões continuam herdando o acesso administrativo pelo perfil no login, evitando bloqueio indevido da visão geral e de outras telas administrativas."
        ],
        atencoes: [
          "A gestão master de instituições aparece apenas para perfil superadmin.",
          "Use o menu Painel master > Importação de dados para importar beneficiários por CSV, XLSX ou XLS após selecionar explicitamente a instituição de destino.",
          "A importação começa sempre em validação: revise o mapeamento das colunas, os cards de resultado, as linhas com erros e as possíveis duplicidades antes de confirmar.",
          "A confirmação exige a marcação de que os dados serão enviados para a instituição exibida; o backend aplica o tenant selecionado e não aceita tenant_id, instituição ou IDs internos vindos do arquivo.",
          "Na etapa de mapeamento da Importação de dados, a coluna à esquerda representa o arquivo Excel/CSV e o campo à direita representa o cadastro de beneficiários do G3N; a lista inclui todos os campos disponíveis e mostra um exemplo do valor encontrado.",
          "As linhas do mapeamento alternam entre branco e cinza claro para facilitar a conferência visual entre a coluna do arquivo e o campo escolhido no G3N.",
          "O mapeamento usa duas colunas de mesma largura, metade para o arquivo e metade para o cadastro do G3N, facilitando a comparação em telas maiores.",
          "Na tabela de validação, registros já existentes ou possivelmente duplicados podem ser ignorados ou marcados para atualização controlada; o histórico e o relatório CSV ficam disponíveis na aba Histórico de importações.",
          "Registros incompletos ou com dados inválidos também podem ser importados como pendentes para correção posterior no cadastro de beneficiários; os problemas continuam registrados no relatório.",
          "A importação preserva endereço, contatos, documentos e demais campos mapeados, gera código sequencial por tenant e normaliza textos importados sem acentos; o status do cadastro permanece Incompleto até a regularização.",
          "O tenant_id não deve ser digitado manualmente em nenhuma operação do usuário final; ele é derivado da instituição autenticada.",
          "A Importação de dados exige a permissão MASTER_ADMIN no frontend e no backend; administradores de tenant e usuários comuns não podem listar instituições, validar arquivos ou confirmar importações.",
          "Após a confirmação, a importação é processada em lotes no backend e a tela exibe uma barra de progresso com registros processados, importados, atualizados e erros.",
          "Antes de criar um beneficiário, a importação verifica CPF válido e a combinação nome completo mais data de nascimento dentro da tenant selecionada; registros encontrados são ignorados para evitar duplicidade.",
          "Na seleção da instituição da importação, a pesquisa aceita nome, razão social, nome fantasia e CNPJ com ou sem máscara.",
          "No cadastro de beneficiário, o aviso inicial lista os dados principais obrigatórios; ao salvar com pendências, o sistema abre a aba e posiciona o cursor no primeiro campo que precisa ser preenchido.",
          "A validação não grava beneficiários. A gravação só ocorre após a confirmação manual do MASTER e cada linha inválida permanece registrada como pendência.",
          "Toda consulta operacional do sistema passa a depender do tenant autenticado para evitar mistura de dados entre clientes."
        ]
      },
      {
        nome: "Atualização e recarregamento da interface",
        objetivo: "Orientar a operação quando houver nova publicação do frontend e o navegador estiver com arquivos antigos em cache.",
        comoUsar: [
          "Quando uma nova versão for publicada, o sistema compara automaticamente a versão carregada no navegador com a versão informada pelo servidor.",
          "Se houver versão nova, a interface exibe Atualizando sistema e recarrega a aplicação sem exigir limpeza manual de cache do navegador.",
          "Após a recarga automática, retome a operação normalmente na tela aberta.",
          "Se uma tela exibir erro de carregamento após atualização do sistema, use o botão Atualizar página exibido na própria mensagem."
        ],
        atencoes: [
          "A verificação de versão roda em intervalos regulares enquanto o usuário permanece com o sistema aberto.",
          "O index.html, env-config.js e configurações runtime devem continuar publicados com no-store para evitar reaproveitamento de HTML antigo.",
          "Os arquivos de assets versionados por hash podem manter cache longo, pois uma nova build gera novos nomes de arquivos.",
          "Se o erro persistir após a recarga, validar se a publicação dos arquivos do frontend foi concluída no servidor."
        ]
      }
    ]
  },
  {
    id: "educacional",
    titulo: "Gestão educacional — Fase 1",
    descricao: "Gestão educacional integrada, com vínculos de alunos e profissionais, documentos em storage, parcerias públicas e indicadores de prestação de contas.",
    icon: GraduationCap,
    telas: [
      {
        nome: "Visão geral educacional",
        objetivo: "Acompanhar os principais quantitativos da estrutura educacional do tenant autenticado.",
        comoUsar: [
          "Acesse diretamente o submenu Visão geral para consultar alunos, matrículas, turmas, disciplinas e anos letivos abertos.",
          "O menu Gestão educacional mantém os cadastros principais e agrupa as operações relacionadas em abas: Alunos reúne Alunos, Matrículas, Transferências e Autorizações; Diário de classe reúne Diário, Plano de aula, Avaliações e notas e Chamada e frequência; Professores e equipe pedagógica reúne também o Planejamento pedagógico.",
          "Ano letivo, Etapas de ensino, Séries e anos escolares, Disciplinas e Turmas ficam agrupados na tela Estrutura acadêmica e não são repetidos como submenus independentes.",
          "As abas de Alunos, Vida escolar, Estrutura acadêmica, Professores e equipe pedagógica e Gestão escolar seguem a navegação lateral numerada do G3N, com separação visual por assunto e o conteúdo exibido ao lado da aba selecionada.",
          "Na Visão geral educacional, use os filtros de unidade, ano letivo, etapa, turma e turno e clique nos cards para abrir o fluxo relacionado. Os indicadores de frequência, risco, evasão, ocorrências, chamadas pendentes e média são calculados a partir dos registros persistidos.",
          "O backend também calcula disciplinas ativas e anos letivos abertos diretamente no PostgreSQL. A tela não utiliza números simulados.",
          "Ao enturmar, o sistema impede que uma matrícula ativa fique em duas turmas ao mesmo tempo, bloqueia turma lotada e mantém a saída anterior com data de fim para preservar o histórico.",
          "Ao lançar notas, o valor é validado contra o valor máximo da avaliação. Matrículas e turmas vinculadas a unidade devem utilizar somente unidades classificadas como Unidade de ensino.",
          "As migrations educacionais são aplicadas automaticamente durante o deploy, antes da inicialização do backend, garantindo que as tabelas de frequência e demais estruturas existam antes do uso da Visão geral.",
          "No desenvolvimento local, o comando npm run dev também verifica e aplica as migrations educacionais. Em bancos legados sem histórico Prisma, aplica os scripts educacionais idempotentes como compatibilidade.",
          "Use o submenu Alunos para buscar um beneficiário existente e vinculá-lo como aluno sem duplicar seu cadastro. A tela Alunos por instituição e sala apresenta filtros, indicadores e cards expansíveis por unidade, sala/turma e aluno.",
          "A matrícula educacional mantém instituição, sala, ano letivo, turma, turno, número, situação e período do vínculo. Alunos sem sala ou instituição podem ser localizados pelos filtros próprios, enquanto a API sempre valida o tenant e a classificação Unidade de ensino.",
          "A transferência encerra a matrícula anterior sem apagá-la, cria o novo vínculo e registra motivo, data, usuário e valores anteriores/novos no histórico. A capacidade da sala de destino é conferida pelo backend.",
          "Use Professores e equipe pedagógica para abrir o cadastro central de profissionais; os vínculos educacionais serão associados sem duplicar o profissional.",
          "Use Grade curricular para relacionar componentes a ano letivo, etapa e série. Use Horários para registrar a grade semanal da turma; o sistema bloqueia sobreposição para a mesma turma, professor ou sala."
          , "Use Diário de classe para registrar conteúdo por turma, componente e data. Em Chamada/Frequência, vincule a situação do aluno à aula registrada; os registros permanecem salvos no histórico.",
          "Use Plano de aula para registrar tema, objetivos, conteúdo e metodologia. Use Planejamento pedagógico para organizar metas e estratégias por período do ano letivo.",
          "Use Avaliações e notas para cadastrar avaliações por turma e componente curricular e depois lançar a nota do aluno pela matrícula correspondente."
          , "Use Boletins para registrar média, frequência e resultado por período da matrícula. Use Histórico escolar para preservar os resultados anuais do aluno sem sobrescrever anos anteriores."
          , "Use Ocorrências para registrar fatos pedagógicos e providências relacionadas ao aluno. Use Agenda escolar para cadastrar eventos por turma e data."
          , "Use Documentos/Declarações para registrar o documento e seus metadados; o arquivo físico deve permanecer no storage. Use Relatórios e indicadores para consultar os quantitativos reais da instituição."
          , "Os registros de Rotina infantil e Desenvolvimento infantil são pedagógicos e não substituem prontuário ou prescrição médica."
          , "O cadastro mestre passou a se chamar Unidades de atendimento. Cada unidade possui tipo obrigatório: Unidade assistencial ou Unidade de ensino. A filtragem é feita no backend e unidades antigas permanecem assistenciais."
          , "Use Gestão acadêmica para registrar lista de espera, recuperações, resultado final e eventos do calendário escolar. Os registros são vinculados ao ano letivo e permanecem separados por instituição."
          , "O menu Gestão educacional foi organizado em entradas principais: Visão geral; Alunos; Vida escolar; Estrutura acadêmica; Professores e equipe pedagógica; Gestão escolar; Parcerias públicas; e Relatórios e indicadores. As operações relacionadas ficam nas abas internas de cada contexto."
          , "As telas Educacionais agora usam a barra de ações padrão do G3N. Nas abas com formulário, Novo limpa o contexto para um novo registro, Salvar envia o formulário visível, Cancelar limpa os dados ainda não gravados, Imprimir usa o relatório da tela e Fechar retorna à Visão geral. Buscar atualiza a Visão geral ou pesquisa beneficiários na aba Matrículas. As abas laterais usam as mesmas cores e estados visuais do Cadastro de beneficiários. Ao selecionar um grupo, somente o submenu correspondente fica destacado; Visão geral fica ativa apenas na rota inicial do Educacional. Na matrícula, selecione a unidade de ensino e depois uma sala com vagas disponíveis; salas lotadas ficam bloqueadas e o backend confirma a lotação antes de salvar."
          , "Na aba Salas de atendimento, informe as vagas da sala e salve a unidade. A capacidade é normalizada corretamente mesmo quando o navegador envia o valor como texto, e o status da sala permanece ativo até que o usuário escolha inativá-la."
          , "Na aba Dados gerais do Cadastro de unidade de atendimento, as logomarcas da unidade e do relatório ficam lado a lado em telas amplas e se reorganizam verticalmente em telas menores."
          , "Ao concluir o cadastro de uma unidade de atendimento, confira a confirmação visual com o ícone na cor padrão da unidade e o número do cadastro. Clique em Finalizar cadastro para fechar a mensagem e continuar na tela."
          , "Na aba Salas de atendimento, edite o nome e as vagas diretamente nos campos da sala. Use Inativar sala ou Reativar para alterar o status; depois clique em Salvar para persistir as mudanças."
          , "O aquecimento inicial das mensagens personalizadas é executado uma única vez por processo e mantém os modelos-base isolados por instituição."
        ],
        atencoes: [
          "Os dados são isolados por instituição/tenant e não devem ser digitados manualmente.",
          "A migration da Fase 1 cria auditoria para alterações educacionais e preserva o vínculo com beneficiários."
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
          label: "Ir para Pergunte à IA",
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
