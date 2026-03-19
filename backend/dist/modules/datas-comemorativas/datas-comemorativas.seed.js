const origemReferenciaSeed = "Base sazonal G3-Next 2026";
const coresPorTipo = {
    comemorativa: "#2563eb",
    feriado_nacional: "#b91c1c",
    feriado_estadual: "#dc2626",
    feriado_municipal: "#ea580c",
    institucional: "#0f766e",
    personalizado: "#7c3aed"
};
const feriadosNacionais = new Set([
    "Confraternização Universal",
    "Dia Mundial do Trabalho",
    "Tiradentes",
    "Independência do Brasil (1822)",
    "Dia de Nossa Senhora Aparecida",
    "Dia de Finados",
    "Proclamação da República (1889)",
    "Dia Nacional da Consciência Negra",
    "Natal"
]);
const eventosInstitucionais = new Set(["Aniversário da Revelare"]);
function buildSeedKey(mes, dia, titulo) {
    return `${mes}-${dia}-${titulo.trim().replace(/\s+/gu, " ").toLowerCase()}`;
}
const overrides2026 = new Map([
    [
        buildSeedKey(2, 17, "Carnaval"),
        {
            dataEvento: "2026-02-17",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#ea580c",
            prioridadePopup: 6
        }
    ],
    [
        buildSeedKey(2, 18, "Quarta-feira de Cinzas"),
        {
            dataEvento: "2026-02-18",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#92400e",
            prioridadePopup: 5
        }
    ],
    [
        buildSeedKey(3, 20, "Início do Outono"),
        {
            dataEvento: "2026-03-20",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#15803d",
            prioridadePopup: 5
        }
    ],
    [
        buildSeedKey(4, 3, "Sexta-feira Santa"),
        {
            dataEvento: "2026-04-03",
            recorrenteAnual: false,
            tipoEvento: "feriado_nacional",
            corExibicao: "#b91c1c",
            prioridadePopup: 9
        }
    ],
    [
        buildSeedKey(4, 5, "Páscoa"),
        {
            dataEvento: "2026-04-05",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#9333ea",
            prioridadePopup: 8
        }
    ],
    [
        buildSeedKey(5, 10, "Dia das Mães"),
        {
            dataEvento: "2026-05-10",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#be185d",
            prioridadePopup: 7
        }
    ],
    [
        buildSeedKey(5, 20, "Ascensão do Senhor"),
        {
            dataEvento: "2026-05-20",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#7c3aed",
            prioridadePopup: 6
        }
    ],
    [
        buildSeedKey(6, 3, "Dia de Pentecostes"),
        {
            dataEvento: "2026-06-03",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#7c3aed",
            prioridadePopup: 6
        }
    ],
    [
        buildSeedKey(6, 4, "Corpus Christi"),
        {
            dataEvento: "2026-06-04",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#7c3aed",
            prioridadePopup: 7
        }
    ],
    [
        buildSeedKey(6, 21, "Início do inverno"),
        {
            dataEvento: "2026-06-21",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#0891b2",
            prioridadePopup: 5
        }
    ],
    [
        buildSeedKey(8, 9, "Dia dos Pais"),
        {
            dataEvento: "2026-08-09",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#0f766e",
            prioridadePopup: 7
        }
    ],
    [
        buildSeedKey(9, 22, "Início da Primavera"),
        {
            dataEvento: "2026-09-22",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#16a34a",
            prioridadePopup: 5
        }
    ],
    [
        buildSeedKey(12, 21, "Início do Verão"),
        {
            dataEvento: "2026-12-21",
            recorrenteAnual: false,
            tipoEvento: "comemorativa",
            corExibicao: "#ea580c",
            prioridadePopup: 5
        }
    ]
]);
const janeiro2026 = `
01
Confraternização Universal
Dia Mundial da Paz
02
Dia Mundial dos Introvertidos
03
Dia do Juiz de Menores
04
Dia da Abreugrafia
Dia Mundial do Braille
05
Criação da 1ª Tipografia no Brasil
06
Dia da Gratidão
Dia de Reis
07
Dia da Liberdade de Cultos
08
Dia do Fotógrafo
09
Dia do Astronauta
Dia do Fico (1822)
10
Festa de São Gonçalo do Amarante
11
Dia do Controle da Poluição por Agrotóxicos
Dia Internacional do Obrigado
12
Dia do Empresário Contábil
13
Dia Internacional do Leonismo
14
Dia Internacional da Pipa
Dia do Enfermo
15
Dia dos Adultos
Dia Mundial do Compositor
16
Dia dos Cortadores de Cana-de-açúcar
17
Dia dos Tribunais de Contas do Brasil
18
Dia de Santo Irmão Jaime Hilário (mártir de Turón)
19
Dia Internacional do Queijo Quark
Dia de São Mário
20
Dia do Farmacêutico
Inauguração da Primeira Exposição do Museu de Arte Moderna do RJ (1949)
21
Dia Internacional do Moletom
Dia Mundial da Religião
22
Dia de Santo André
23
Dia Internacional da Medicina Integrativa
24
Dia Internacional da Educação
Dia da Constituição
Dia da Previdência Social
Dia Nacional dos Aposentados
Instituição do Casamento Civil no Brasil
25
Criação dos Correios e Telégrafos no Brasil (1663)
Dia do Carteiro
Fundação de São Paulo (1554)
26
Dia da Gula
27
Dia Internacional em Memória às Vítimas do Holocausto
Dia da Elevação do Brasil Vice-Reinado (1763)
28
Dia Internacional da Privacidade de Dados
Dia Internacional do Lego
Dia da Abertura dos Portos (1808)
29
Dia Internacional do Hanseniano
30
Dia da Saudade
Dia do Portuário
Dia Nacional das Histórias em Quadrinhos
31
Dia do Lançamento do 1º Satélite (EUA)
Dia Mundial do Mágico
`;
const fevereiro2026 = `
01
Dia do Publicitário
02
Aniversário da Revelare
Dia de Iemanjá
Dia do Agente Fiscal
03
Dia da Navegação no Rio São Francisco
04
Criação do Facebook (2004)
Dia Mundial contra o Câncer
05
Dia do Datiloscopista
06
Dia Internacional da Tolerância Zero à Mutilação Vaginal
Dia do Agente de Defesa Ambiental
Dia Internacional da Internet Segura
07
Dia do Gráfico
08
Dia do Quadro do Magistério do Exército
09
10
Dia Mundial das Leguminosas
Dia do Atleta Profissional
11
Dia Internacional das Mulheres e Meninas na Ciência
Dia do Zelador
Dia Mundial do Enfermo
12
Dia de Darwin
13
Dia Mundial do Rádio
14
Dia Internacional da Doação de Livros
Dia da Amizade
15
Dia Internacional de Luta contra o Câncer na Infância
16
Dia do Repórter
17
Carnaval
Dia do Aniversário da Casa do Marinheiro
Fim da Semana da Arte Moderna (1922)
18
Quarta-feira de Cinzas
Dia Nacional de Combate ao Alcoolismo
19
Dia do Esportista
20
Dia Mundial da Justiça Social
21
Dia Internacional da Baleia
Dia Internacional da Língua Materna
Data Festiva do Exército
Dia da Conquista do Monte Castelo (1945)
22
Dia do Auxiliar de Serviços Gerais
23
Dia do Rotaryano
24
Promulgação da 1ª Constituição Republicana (1891)
25
Dia da Criação do Ministério das Comunicações
26
Dia do Comediante
27
Dia do Agente Fiscal da Receita Federal
Dia Nacional do Livro Didático
28
Dia da Ressaca
`;
const marco2026 = `
01
Dia da Discriminação Zero
Dia Internacional da Proteção Civil
02
Dia da Oração
Dia Nacional do Turismo
03
Dia Mundial da Vida Selvagem
04
Dia Mundial da Oração
05
Dia do Filatelista Brasileiro
06
Dia Internacional do Optometrista
07
Dia dos Fuzileiros Navais
08
Dia Internacional da Mulher
Dia da Criação da Casa da Moeda do Brasil (1694)
09
Dia Internacional do DJ
10
Dia Internacional da Gaita de Foles
Dia Internacional da Peruca
Dia do Sogro
Dia do Telefone
11
Dia Internacional do Encanamento
Dia Internacional das Vítimas do Terrorismo
12
Dia Internacional da Pochete
Dia do Bibliotecário
13
Dia do Conservacionismo
14
Dia do Vendedor de Livros
Dia dos Animais
Dia Nacional da Poesia
15
Dia Mundial do Consumidor
Dia da Escola
16
Dia Nacional de Conscientização sobre as Mudanças Climáticas
Dia Nacional do Ouvidor
17
18
Dia Nacional da Imigração Judaica e Dia do DeMolay
19
Dia de São José
Dia do Carpinteiro
Dia do Marceneiro
20
Dia Internacional da Felicidade
Início do Outono
Dia do Contador de Histórias
21
Dia Mundial da Poesia
Dia Internacional Contra a Discriminação Racial
Dia internacional da Síndrome de Down
Dia Universal do Teatro
22
Dia Mundial da Água
23
Dia Mundial da Meteorologia
24
Dia Internacional para o Direito à Verdade sobre Graves Violações dos Direitos Humanos e pela Dignidade das Vítimas
Dia Mundial da Tuberculose
25
Dia Internacional em Memória das Vítimas da Escravatura e do Comércio Transatlântico de Escravos
Dia internacional da Solidariedade da Pessoa Detenta ou Desaparecida
Dia Nacional do Oficial de Justiça
26
Dia do Cacau
27
Dia do Circo
28
Dia do Diagramador
Dia do Revisor
29
Primeiro voo no Rio de Janeiro de um balão dirigível, Le Victoria (1882)
30
Dia Mundial da Juventude
31
Aniversário do Golpe Militar (1964)
Dia da Integração Nacional
Dia da Saúde e Nutrição
`;
const abril2026 = `
01
Dia da Abolição da Escravidão dos Índios (1680)
Dia da Mentira
02
Dia do Propagandista
Dia Internacional do Livro Infantil
Dia Mundial de Conscientização do Autismo
03
Sexta-feira Santa
Dia do Atuário
Dia do Desporto Comunitário
04
Dia Nacional do Parkinsoniano
05
Páscoa
Dia das Telecomunicações
Dia do Propagandista Farmacêutico
Dia dos Fabricantes de Materiais de Construção
06
Dia Nacional de Mobilização pela Promoção da Saúde e Qualidade de Vida
07
Dia do Corretor
Dia do Jornalismo
Dia do Médico Legista
Dia Mundial da Saúde
08
Dia da Natação
Dia do Correio
Dia Mundial do Combate ao Câncer
09
Dia Nacional do Aço
10
Dia da Engenharia
11
Dia do Infectologista
12
Dia do Obstetra
13
Dia do Hino Nacional (1º Execução do Hino Nacional Brasileiro -1831)
Dia do Office-Boy
Dia dos Jovens
14
Dia Pan-Americano
15
Dia da Conservação do Solo
Dia do Desarmamento Infantil
Dia Mundial do Desenhista
16
Dia da Voz
17
Dia do Lojista de CD
Dia Internacional de Luta dos Trabalhadores do Campo
18
Dia de Monteiro Lobato
Dia Nacional do Livro Infantil
19
Dia do Exército Brasileiro
Dia do Índio
20
Dia do Diplomata
Dia do Disco
21
Tiradentes
Dia da Latinidade
Dia do Metalúrgico
Dia do Policial Civil
Dia do Policial Militar
22
Descobrimento do Brasil (1500)
Dia da Comunidade Luso-brasileira
Dia do Planeta Terra
Dia do Arteterapeuta
23
Dia de São Jorge
Dia Mundial do Escoteiro
Dia Mundial do Livro e do Direito do Autor
Dia Nacional da Educação de Surdos
24
Dia do Agente de Viagem
Dia Internacional do Jovem Trabalhador
25
Dia Mundial da Malária
Dia da Contabilidade
26
Dia Internacional em Memória do Desastre de Chernobyl
Dia Mundial da Propriedade Intelectual
Dia da 1ª Missa no Brasil
Dia do Goleiro
27
Dia da Empregada Doméstica
Dia do Sacerdote
28
Dia Mundial da Segurança e Saúde no Trabalho
Dia da Sogra
Dia Internacional da Educação
29
Dia Internacional da Dança
30
Dia Internacional do Jazz
Dia do Ferroviário
Dia Nacional da Mulher
`;
const maio2026 = `
01
Dia da Literatura Brasileira
Dia Mundial do Trabalho
02
Dia Mundial do Atum
Dia do Taquígrafo
Dia Nacional do Ex-combatente
03
Dia Mundial da Liberdade de Imprensa
Assinatura da Ata de Constituição do Museu de Arte Moderna RJ (1948)
Dia do Sertanejo
Dia Mundial da Liberdade de Imprensa
04
Dia do Calculista Estrutural
05
Dia da Comunidade
Dia do Artista Pintor
Dia do Marechal Rondon
Dia Nacional do Expedicionário
06
Dia do Cartógrafo
07
Dia do Oftalmologista
Dia do Silêncio
08
Tempo de Recordação e Reconciliação pelos que perderam a vida durante a Segunda Guerra Mundial
Dia do Profissional Marketing
Dia da Vitória
Dia do Artista Plástico
Dia Internacional da Cruz Vermelha
09
Dia da Europa
10
Dia das Mães
Dia da Cavalaria
Dia do Campo
11
Dia Mundial das Aves Migratórias
Dia da Integração do Telégrafo no Brasil
12
Dia Mundial do Enfermeiro
13
Abolição da Escravatura (1888)
Dia da Fraternidade Brasileira
Dia do Automóvel
Dia do Zootecnista
14
Dia Continental do Seguro
15
Dia Internacional das Famílias
Dia do Assistente Social
Dia do Gerente Bancário
16
Dia Internacional da Luz
Dia do Gari
17
Dia Internacional da Comunicação e das Telecomunicações
Dia da Constituição
Dia Internacional contra a Homofobia
18
Dia dos Vidreiros
Dia Internacional dos Museus
Dia Nacional de Enfrentamento ao Abuso e à Exploração Sexual de Crianças e Adolescentes
19
Dia dos Acadêmicos do Direito
Dia Nacional de Combate à Cefaléia
20
Dia Mundial da Abelha
Ascensão do Senhor
Dia do Comissário de Menores
21
Dia Mundial da Diversidade Cultural para o Diálogo e o Desenvolvimento
Dia da Língua Nacional
22
Dia do Apicultor
Dia internacional da Biodiversidade
23
Dia da Juventude Constitucionalista
24
Dia da Infantaria
Dia do Datilógrafo
Dia do Detento
Dia do Telegrafista
Dia do Vestibulando
25
Dia da Indústria
Dia do Massagista
Dia do Trabalhador Rural
26
Dia Nacional do Bombeiro
27
Dia do Profissional Liberal
28
Dia Mundial do Hambúrguer
Assinatura do Decreto de 28 de maio de 1810 (teatro nacional)
29
Dia do Estatístico
Dia do Geógrafo
30
Dia das Bandeiras
Dia do Geólogo
31
Dia Mundial das Comunicações Sociais
Dia do Comissário de Bordo
Dia do Espírito Santo
`;
const junho2026 = `
01
Dia da Imprensa
Dia de Caxias
Primeira Transmissão de TV no Brasil
Semana Mundial do Meio Ambiente
02
03
Dia Mundial da Bicicleta
Dia de Pentecostes
Dia Mundial do Administrador de Pessoal
04
Corpus Christi
Dia Mundial das Crianças Vítimas de Agressão
05
Dia da Ecologia
Dia Mundial do Meio Ambiente
06
Dia de São Marcelino Champagnat (Fundador da Congregação dos Irmãos Maristas)
07
Dia Mundial da Segurança Alimentar
Dia da Liberdade de Imprensa
08
Dia Mundial dos Oceanos
Dia do Citricultor
09
Dia da Imunização
Dia do Porteiro
Dia do Tenista
Dia Nacional de Anchieta
10
Dia da Artilharia
Dia da Língua Portuguesa
Dia da Raça Portuguesa
11
Dia da Marinha Brasileira
Dia do Educador Sanitário
12
Dia Mundial Contra o Trabalho Infantil
Dia dos Namorados
Dia do Correio Aéreo Nacional
13
Dia Mundial de Consciencialização do Albinismo
Dia de Santo Antônio
Dia do Turista
Dia do Economista
Dia Mundial do Softball
14
Dia Mundial do Doador de Sangue
Dia do Solista
Dia Universal de Deus
15
Dia do Paleontólogo
Dia Mundial de Conscientização da Violência contra a Pessoa Idosa
16
Dia da Criança Africana
17
Dia Mundial de Combate à Desertificação e à Seca
Dia do Funcionário Público Aposentado
18
Dia do Químico
Imigração Japonesa
19
Dia do Cinema Brasileiro
20
Dia Mundial do Refugiado
Dia do Revendedor
Dia do Vigilante
Dia Internacional do Surf
21
Dia Internacional do Yoga
Dia da Mídia
Início do inverno
Dia Universal Olímpico
22
Dia do Aeroviário
23
24
Dia das Empresas Gráficas
Dia de São João
Dia Internacional do Leite
25
Dia Mundial do Marinheiro
Dia do Imigrante
26
Dia Internacional contra o Abuso e Tráfico Ilícito de Drogas
Dia Internacional de Apoio às Vítimas de Tortura
Dia do Metrologista
27
Dia das Micro, Pequenas e Médias Empresas
Dia Nacional do Progresso
28
Dia da Renovação Espiritual
Dia Internacional do Orgulho LGBTQIAPN+
29
Dia da Telefonista
Dia de São Pedro e São Paulo
Dia do Papa
Dia do Pescador
30
Dia do Caminhoneiro
`;
const julho2026 = `
01
Dia da vacina BCG
Dia Internacional do Cooperativismo
02
Dia da Independência da Bahia
Dia do Bombeiro Brasileiro
Dia do Hospital
03
Dia Internacional das Cooperativas
Dia de São Tomé (Apóstolo)
04
Dia do Operador de Telemarketing
Independência dos EUA (1776)
05
Dia da Fundação do Exército da Salvação
06
Dia da Criação do IBGE
07
Dia Mundial do Chocolate
Dia do Ingresso das Mulheres nas Fileiras da Marinha
08
Dia do Panificador
09
Dia da Revolução e do Soldado Constitucionalista
10
Dia da Pizza
11
Dia Mundial da População
12
Dia do Engenheiro Florestal
13
Dia do Cantor
Dia do Engenheiro de Saneamento
Dia Mundial do Rock
14
Dia da Liberdade de Pensamento
Dia do Propagandista de Laboratório
15
Dia Nacional dos Clubes
Dia dos Homens
16
Dia do Comerciante
17
Dia de Proteção às Florestas
18
Dia Internacional de Nelson Mandela
Dia Nacional do Trovador
19
Dia da Caridade
Dia Nacional do Futebol
20
Dia do Amigo e Internacional da Amizade
Dia da 1ª Viagem à Lua (1969)
21
Dia dos Mortos da Marinha
22
Dia do Cantor Lírico
Dia do Trabalhador Doméstico
23
Dia do Guarda Rodoviário
24
25
Dia de São Cristóvão
Dia do Colono
Dia do Escritor
Dia do Motorista
26
Dia dos Avós
27
Dia do Motociclista
28
Dia do Agricultor
29
Dia da Identificação
30
Dia Mundial contra o Tráfico de Pessoas
Dia de São Pedro Crisólogo
31
Dia da Campanha do Quilo
`;
const agosto2026 = `
01
Dia Nacional do Selo
02
Dia do início da Semana da Cultura Nordestina
03
Dia do Capoeirista
Dia do Tintureiro
04
Dia da Campanha Educativa de Combate ao Câncer
05
Dia Nacional da Saúde
06
Dia Interamericano do Escotista
Dia Nacional dos Profissionais da Educação
07
Dia Estadual da "Lei Maria da Penha"
Dia Nacional do Documentário Brasileiro
08
Dia do Pároco
Dia Nacional do Elos Internacional da Comunidade Lusíada
09
Dia dos Pais
Dia Internacional dos Povos Indígenas
Dia Internacional dos Povos Indígenas
10
Dia da Solidariedade Cristã
Dia Internacional do Biodiesel
11
Dia da Televisão
Dia do Advogado
Dia do Estudante
Dia do Garçom
Dia Internacional da Logosofia
12
Dia Internacional da Juventude
Dia Nacional das Artes
13
Dia do Economista
Dia do Psiquiatra
14
Dia do Cardiologista
15
Assunção de Nossa Senhora
Dia da Informática
Dia dos Solteiros
16
Dia do Filósofo
17
Dia do Patrimônio Histórico Nacional
Dia Nacional da Construção Social
18
Dia da Revolução Cultural
Dia do Estagiário
Dia Mundial da Libertação Humana
19
Dia Mundial Humanitário
Dia Mundial da Fotografia
Dia do Artista de Teatro
Dia Nacional do Ciclista
20
Dia dos Maçons
21
Dia Internacional de Lembrança e Tributo às Vítimas do Terrorismo
Dia do Início da Semana Nacional da Criança Excepcional
Dia Nacional da Habitação
22
Dia do Folclore
Dia do Supervisor Escolar
23
Dia Internacional em Memória do Tráfico de Escravos e a sua Abolição
Dia da Injustiça
24
Dia da Infância
Dia de São Bartolomeu
Dia dos Artistas
25
Dia do Feirante
Dia do Soldado
26
Dia Internacional da Declaração dos Direitos do Homem e do Cidadão
Dia Internacional da Igualdade da Mulher
27
Dia do Corretor de Imóveis
Dia do Psicólogo
28
Dia da Avicultura
Dia dos Bancários
29
Dia Internacional contra Testes Nucleares
Dia Nacional do Combate do Fumo
30
Dia Internacional das Vítimas de Desaparecimentos Forçados
Dia Nacional de Conscientização sobre a Esclerose Múltipla
31
Dia da Nutricionista
`;
const setembro2026 = `
01
Início da Semana da Pátria
Dia do Profissional de Educação Física
02
Dia do Repórter Fotográfico
03
Dia do Biólogo
Dia do Guarda Civil
04
Dia da Lei Eusébio de Queirós
05
Dia Internacional da Caridade
Dia da Amazônia
Dia Oficial da Farmácia
Dia da Raça Brasileira
06
Dia do Alfaiate
Oficialização da Letra do Hino Nacional
07
Independência do Brasil (1822)
08
Dia Internacional da Alfabetização
09
Dia da Velocidade
Dia do Administrador
Dia do Médico Veterinário
10
Dia Mundial de Prevenção do Suicídio
Dia do Gordo
Fundação do 1º Jornal do Brasil
11
Sancionada Lei de Defesa do Direito do Consumidor (1990)
12
Dia do Operador de Rastreamento
13
Dia do Programador
Dia do Agrônomo
14
Dia da Cruz
Dia do Frevo
15
Dia do Cliente
Dia Nacional do Musicoterapeuta
16
Dia Internacional para a Preservação da Camada de Ozônio
17
Dia da Compreensão Mundial
18
Dia dos Símbolos Nacionais
19
Dia de São Geraldo
Dia do Teatro
20
Dia do Baterista
Dia do Funcionário Municipal
Dia do Gaúcho
21
Dia Internacional da Paz
Dia da Árvore
Dia da Luta Nacional das Pessoas com Deficiências
Dia do Fazendeiro
22
Início da Primavera
Dia da Juventude do Brasil
Dia do Contador
23
Dia Mundial das Línguas Gestuais
Dia do Soldador
Dia do Sorvete
Dia do Técnico em Edificações
Dia do Técnico Industrial
24
Dia do Mototaxista
25
Dia Nacional do Rádio
Dia Nacional do Trânsito
26
Dia Internacional para a Eliminação Total das Armas Nucleares
Dia Mundial do Mar
Dia Interamericano das Relações Públicas
Dia Nacional do Surdo
27
Dia de Cosme e Damião
Dia do Encanador
Dia Mundial de Turismo
Dia Nacional do Idoso
28
Dia Internacional do Acesso Universal à Informação
Dia da Lei do Ventre Livre
29
Dia do Anunciante
Dia do Petróleo
30
Dia da Secretária
Dia da Navegação
Dia Mundial do Tradutor
Dia Nacional do Jornaleiro
`;
const outubro2026 = `
01
Dia de Santa Terezinha
Dia do Vendedor
Dia Nacional do Idoso e Dia Internacional da Terceira Idade
Dia Nacional do Vereador
02
Dia do Anjo da Guarda
Dia Internacional da Não Violência
03
Dia do Petróleo Brasileiro
Dia Mundial do Dentista
Dia Nacional das Abelhas
Dia do Profissional de Organização
04
Dia da Natureza
Dia de São Francisco de Assis
Dia do Barman
Dia do Cão
Dia Mundial dos Animais
05
Dia Mundial dos Professores
Dia das Aves
Dia do Empreendedor
Dia Nacional do MPE
06
Dia do Prefeito
Dia do Tecnólogo
Dia Nacional do Circulista
07
Dia Mundial do Habitat
Dia do Compositor
08
Dia do Nordestino
09
Dia Mundial dos Correios
Dia do Açougueiro e Profissionais do Setor
Dia do Atletismo
10
Dia Mundial da Saúde Mental
Dia Mundial do Lions Clube
Semana da Ciência e Tecnologia
11
Dia do Deficiente Físico
Dia do Teatro Municipal
Dia Internacional da Menina
12
Dia de Nossa Senhora Aparecida
Dia da Criança
Dia do Corretor de Seguros
Dia do Descobrimento da América (1492)
Dia do Engenheiro Agrônomo
Dia Nacional da Leitura
Dia Nacional do Mar
13
Dia Internacional para a Redução de Desastres Naturais
Dia do Fisioterapeuta
Dia do Terapeuta Ocupacional
14
Dia Nacional da Pecuária
15
Dia Internacional da Mulher Rural
Dia do Normalista
Dia do Professor
16
Dia da Ciência e Tecnologia
Dia do Anestesiologista
Dia Estadual do Neuropsicopedagogo
Dia Mundial da Alimentação
17
Dia da Valorização do Queijo de Leite Cru
Dia Internacional para a Erradicação da Pobreza
Dia da Indústria Aeronáutica Brasileira
Dia do Eletricista
Dia do Profissional de Propaganda
18
Dia do Estivador
Dia do Médico
Dia do Pintor
Dia do Securitário
19
Dia do Profissional da Informática
20
Dia Internacional do Bicho Preguiça
Dia Mundial das Estatística
Dia do Arquivista
Dia do Poeta
Dia Internacional do Controlador de Tráfego Aéreo
21
Dia do Contato
Dia Nacional do Economista Doméstico
22
Dia Internacional da Consciência da Gagueira
Dia do Enólogo
Dia do Paraquedista
Dia do Protesto Mundial contra o Uso do Eletrochoque
Dia Internacional de Atenção à Gagueira
Dia Internacional do Radioamador
23
Dia da Força Aérea Brasileira
Dia do Aviador
24
Dia Internacional do Bucho
Dia das Nações Unidas (ONU)
25
Dia Internacional das Artistas
Dia da Democracia
Dia do Dentista Brasileiro
Dia do Sapateiro
26
Dia da Cruz Vermelha
Dia do Trabalhador da Construção Civil
27
Dia Mundial do Patrimônio Audiovisual
28
Dia de São Judas Tadeu
Dia do Funcionário Público
29
Dia do Cerimonialista
Dia Nacional do Livro
30
Dia do Balconista
Dia do Comerciário
Dia do Fisiculturista
31
Dia Mundial das Cidades
Dia da Reforma Luterana
Dia das Bruxas (Halloween)
Dia Mundial do Comissário de Voo
`;
const novembro2026 = `
01
Dia Mundial do Veganismo
Dia de Todos os Santos
02
Dia de Finados
03
Dia do Cabeleireiro
Instituição do Direito e Voto da Mulher (1930)
04
Dia do Inventor
05
Dia da Ciência e Cultura
Dia do Cinema Brasileiro
Dia do Radioamador e Técnico em Eletrônica
Dia Nacional do Designer
06
Dia Nacional do Amigo da Marinha do Brasil
Dia Nacional do Riso
07
Dia do Radialista
08
Dia do Radiologista
Dia Mundial do Urbanismo
09
Dia Mundial da Liberdade
Dia do Técnico em Eletrotécnica
Dia do Hoteleiro
10
Dia do Trigo
11
12
Dia do Diretor de Escola
Dia do Supermercado
13
Dia Mundial da Gentileza
14
Dia Mundial do Combate a Diabetes
Dia Nacional da Alfabetização
15
Proclamação da República (1889)
16
Semana da Música
17
Dia da Criatividade
Dia Internacional do Estudante
18
Dia do Conselheiro Tutelar
19
Dia Mundial do Toalete
Dia da Bandeira
Dia Internacional do Homem
20
Dia do Auditor Interno
Dia do Biomédico
Dia do Esteticista
Dia do Técnico em Contabilidade
Dia Nacional da Consciência Negra
21
Dia Mundial da Filosofia
Dia Mundial da Televisão
Dia Mundial da Televisão
Dia da Homeopatia
Dia das Saudações
22
Dia do Músico
23
Dia do Engenheiro Eletricista
Dia Mundial de Ação de Graças
24
Dia do Quadro Auxiliar de Oficiais
25
Dia Nacional do Doador de Sangue
Dia Internacional de Não Violência contra as Mulheres
26
Dia do Corpo Auxiliar da Marinha
Dia Interamericano do Ministério Público
27
Dia do Técnico da Segurança do Trabalho
28
Dia do Soldado Desconhecido
29
Dia Nacional da Onça-Pintada
Dia Internacional de Solidariedade com o Povo Palestino
30
Dia da Amizade Brasil-Argentina
Dia do Estatuto da Terra
Dia do Síndico
Dia do Teólogo
Dia Nacional do Evangélico
`;
const dezembro2026 = `
01
Dia do Numismata
Dia Internacional da Luta contra a AIDS
02
Dia Internacional para a Abolição da Escravatura
Dia da Astronomia
Dia Nacional das Relações Públicas
Dia Nacional do Samba
Dia Pan-americano da Saúde
03
Dia Internacional do Portador de Deficiência
04
Dia da Propaganda
Dia do Orientador Educacional
Dia do Pedicuro
05
Dia Internacional dos Voluntários para o Desenvolvimento Econômico e Social
06
Dia do Neuropsicopedagogo
Dia da Extensão Rural no Brasil
07
Dia do Médico Cirurgião Plástico
Dia Internacional da Aviação Civil
Dia Internacional da Aviação Civil
08
Dia da Família
Dia da Justiça
Dia Mundial da Imaculada Conceição
09
Dia Internacional contra a Corrupção
Dia Internacional da Comemoração e Dignidade das Vítimas de Genocídio
Dia Internacional da Medicina Veterinária
Dia da Criança Especial
Dia do Alcoólico Recuperado
Dia do Fonoaudiólogo
10
Declaração Universal Direitos Humanos
Dia do Sociólogo
Dia Universal do Palhaço
11
Dia do Engenheiro
12
Dia Mundial da Cobertura Universal de Saúde
Dia Internacional da Criança na Mídia
13
Dia Mundial da Iluminação por Velas
Dia de Santa Luzia
Dia do Cego
Dia do Engenheiro Avaliador
Dia do Marinheiro
Dia do Ótico
Dia do Perito de Engenharia
14
Dia Nacional do Ministério Público
15
Dia do Arquiteto
Dia da Mulher Operadora do Direito (Dia da Advogada)
Dia do Jardineiro
16
Dia do Reservista
17
Dia do Pastor Presbiteriano
18
Dia Internacional dos Migrantes
Dia do Museólogo
19
Dia Estadual da Poesia (Mato Grosso)
20
Dia do Mecânico
21
Início do Verão
Dia do Atleta
22
23
Dia do Vizinho
24
Dia do Órfão
25
Natal
26
Dia da Lembrança
27
Criado o Departamento de Imprensa e Propaganda (DIP - 1939)
28
Dia do Salva-vidas
Dia da Marinha Mercante
29
30
Criação do Vale do Aço (1998)
31
Reveillon
Dia de São Silvestre
`;
const blocosMensais = [
    { mes: 1, texto: janeiro2026 },
    { mes: 2, texto: fevereiro2026 },
    { mes: 3, texto: marco2026 },
    { mes: 4, texto: abril2026 },
    { mes: 5, texto: maio2026 },
    { mes: 6, texto: junho2026 },
    { mes: 7, texto: julho2026 },
    { mes: 8, texto: agosto2026 },
    { mes: 9, texto: setembro2026 },
    { mes: 10, texto: outubro2026 },
    { mes: 11, texto: novembro2026 },
    { mes: 12, texto: dezembro2026 }
];
function createSeedItem(mes, dia, titulo) {
    const override = overrides2026.get(buildSeedKey(mes, dia, titulo));
    const tipoEvento = override?.tipoEvento ??
        (eventosInstitucionais.has(titulo)
            ? "institucional"
            : feriadosNacionais.has(titulo)
                ? "feriado_nacional"
                : "comemorativa");
    const abrangencia = override?.abrangencia ?? (eventosInstitucionais.has(titulo) ? "interna" : "nacional");
    const recorrenteAnual = override?.recorrenteAnual ?? true;
    const dataEvento = override?.dataEvento;
    return {
        titulo,
        dia,
        mes,
        ano: dataEvento ? Number(dataEvento.slice(0, 4)) : undefined,
        dataEvento,
        tipoEvento,
        abrangencia,
        recorrenteAnual,
        fonteOrigem: "seed",
        origemReferencia: origemReferenciaSeed,
        corExibicao: override?.corExibicao ?? coresPorTipo[tipoEvento],
        prioridadePopup: override?.prioridadePopup ??
            (tipoEvento === "feriado_nacional"
                ? 10
                : tipoEvento === "institucional"
                    ? 8
                    : 4),
        exibirNoPopup: true,
        ativo: true
    };
}
function parseMonthBlock({ mes, texto }) {
    const itens = [];
    const vistos = new Set();
    const linhas = texto
        .split(/\r?\n/u)
        .map((linha) => linha.trim())
        .filter(Boolean);
    let diaAtual = null;
    for (const linha of linhas) {
        if (/^\d{2}$/u.test(linha)) {
            diaAtual = Number(linha);
            continue;
        }
        if (!diaAtual) {
            continue;
        }
        const chave = buildSeedKey(mes, diaAtual, linha);
        if (vistos.has(chave)) {
            continue;
        }
        vistos.add(chave);
        itens.push(createSeedItem(mes, diaAtual, linha));
    }
    return itens;
}
export const datasComemorativasSeed = blocosMensais.flatMap(parseMonthBlock);
