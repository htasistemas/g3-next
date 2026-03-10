const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const scanTargets = [
  "src/pages",
  "src/features",
  "src/services",
  "src/lib",
  "src/components",
  "src/routes",
  "src/types",
  "src/app/app-shell.tsx"
];

const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".html"]);
const replacements = [
  ["N�o", "Não"],
  ["n�o", "não"],
  ["s�o", "são"],
  ["ser�", "será"],
  ["est�", "está"],
  ["h�", "há"],
  ["j�", "já"],
  ["s�", "só"],
  ["Padr�o", "Padrão"],
  ["padr�o", "padrão"],
  ["vis�o", "visão"],
  ["gest�o", "gestão"],
  ["conex�o", "conexão"],
  ["prote��o", "proteção"],
  ["informa��es", "informações"],
  ["informa��o", "informação"],
  ["configura��es", "configurações"],
  ["Configura��es", "Configurações"],
  ["Configura��o", "Configuração"],
  ["par�metros", "parâmetros"],
  ["Par�metros", "Parâmetros"],
  ["homologa��o", "homologação"],
  ["migra��o", "migração"],
  ["Migra��o", "Migração"],
  ["usu�rio", "usuário"],
  ["Usu�rio", "Usuário"],
  ["usu�rios", "usuários"],
  ["Usu�rios", "Usuários"],
  ["benefici�rio", "beneficiário"],
  ["Benefici�rio", "Beneficiário"],
  ["benefici�rios", "beneficiários"],
  ["Benefici�rios", "Beneficiários"],
  ["benef�cios", "benefícios"],
  ["Benef�cios", "Benefícios"],
  ["fam�lia", "família"],
  ["Fam�lia", "Família"],
  ["fam�lias", "famílias"],
  ["Fam�lias", "Famílias"],
  ["Munic�pio", "Município"],
  ["munic�pio", "município"],
  ["munic�pios", "municípios"],
  ["�rea", "Área"],
  ["�rg�o", "Órgão"],
  ["�ltimas", "Últimas"],
  ["�ltimo", "Último"],
  ["Valida��o", "Validação"],
  ["Confirma��o", "Confirmação"],
  ["Aten��o", "Atenção"],
  ["Autoriza��o", "Autorização"],
  ["autoriza��o", "autorização"],
  ["a��o", "ação"],
  ["A��o", "Ação"],
  ["A��es", "Ações"],
  ["Situa��o", "Situação"],
  ["situa��o", "situação"],
  ["Descri��o", "Descrição"],
  ["descri��o", "descrição"],
  ["Descri��es", "Descrições"],
  ["Identifica��o", "Identificação"],
  ["Classifica��o", "Classificação"],
  ["Tipifica��o", "Tipificação"],
  ["visualiza��o", "visualização"],
  ["impress�o", "impressão"],
  ["relat�rio", "relatório"],
  ["Relat�rio", "Relatório"],
  ["Distribui��o", "Distribuição"],
  ["Posi��o", "Posição"],
  ["Ocupa��o", "Ocupação"],
  ["Composi��o", "Composição"],
  ["devolu��o", "devolução"],
  ["Devolu��o", "Devolução"],
  ["exclu�do", "excluído"],
  ["Exclu�do", "Excluído"],
  ["exclu�da", "excluída"],
  ["Exclu�da", "Excluída"],
  ["conclu�do", "concluído"],
  ["Conclu�do", "Concluído"],
  ["matr�cula", "matrícula"],
  ["Matr�cula", "Matrícula"],
  ["presen�a", "presença"],
  ["inscri��o", "inscrição"],
  ["execu��o", "execução"],
  ["inova��o", "inovação"],
  ["contempor�nea", "contemporânea"],
  ["ocorr�ncia", "ocorrência"],
  ["Ocorr�ncia", "Ocorrência"],
  ["ocorr�ncias", "ocorrências"],
  ["Ocorr�ncias", "Ocorrências"],
  ["viol�ncia", "violência"],
  ["Viol�ncia", "Violência"],
  ["v�tima", "vítima"],
  ["V�tima", "Vítima"],
  ["t�tulo", "título"],
  ["T�tulo", "Título"],
  ["t�cnico", "técnico"],
  ["T�cnico", "Técnico"],
  ["hist�rico", "histórico"],
  ["Hist�rico", "Histórico"],
  ["hor�rio", "horário"],
  ["Hor�rio", "Horário"],
  ["n�mero", "número"],
  ["N�mero", "Número"],
  ["c�digo", "código"],
  ["C�digo", "Código"],
  ["pr�xima", "próxima"],
  ["Pr�xima", "Próxima"],
  ["Pr�prio", "Próprio"],
  ["pr�prio", "próprio"],
  ["im�vel", "imóvel"],
  ["Im�vel", "Imóvel"],
  ["inseguran�a", "insegurança"],
  ["sens�veis", "sensíveis"],
  ["dispon�veis", "disponíveis"],
  ["indispon�vel", "indisponível"],
  ["poss�vel", "possível"],
  ["irrevers�vel", "irreversível"],
  ["liga��o", "ligação"],
  ["medica��o", "medicação"],
  ["cont�nua", "contínua"],
  ["visualiza��o", "visualização"],
  ["servi�os", "serviços"],
  ["revoga��o", "revogação"],
  ["documenta��o", "documentação"],
  ["divulga��o", "divulgação"],
  ["banc�ria", "bancária"],
  ["cota��o", "cotação"],
  ["doa��o", "doação"],
  ["Doa��o", "Doação"],
  ["doa��es", "doações"],
  ["Doa��es", "Doações"],
  ["volunt�rio", "voluntário"],
  ["Volunt�rio", "Voluntário"],
  ["Manh�", "Manhã"],
  ["Uni�o", "União"],
  ["est�vel", "estável"],
  ["m�e", "mãe"],
  ["M�e", "Mãe"],
  ["sa�de", "saúde"],
  ["Sa�de", "Saúde"],
  ["v�nculo", "vínculo"],
  ["V�nculo", "Vínculo"],
  ["d�vidas", "dívidas"],
  ["Not�cias", "Notícias"],
  ["An�lise", "Análise"],
  ["Personaliza��o", "Personalização"],
  ["Cart�o", "Cartão"],
  ["Certid�o", "Certidão"],
  ["Empr�stimo", "Empréstimo"],
  ["empr�stimo", "empréstimo"],
  ["Empr�stimos", "Empréstimos"],
  ["empr�stimos", "empréstimos"],
  ["Padr�o Verde", "Padrão Verde"],
  ["Bot�o", "Botão"],
  ["Informa��o", "Informação"],
  ["Marca��o", "Marcação"],
  ["Condi��es", "Condições"],
  ["situa��o", "situação"],
  ["Situa��o", "Situação"],
  ["Observa��es", "Observações"],
  ["observa��es", "observações"],
  ["Op��es", "Opções"],
  ["Den�ncia", "Denúncia"],
  ["evolu��o", "evolução"],
  ["Evolu��o", "Evolução"],
  ["edi��o", "edição"],
  ["Edi��o", "Edição"],
  ["prim�rio", "primário"],
  ["Prim�rio", "Primário"],
  ["m�dia", "média"],
  ["M�dia", "Média"],
  ["m�xima", "máxima"],
  ["M�xima", "Máxima"],
  ["Execu��o", "Execução"],
  ["Pr�-", "Pré-"],
  ["v�lido", "válido"],
  ["V�lido", "Válido"],
  ["v�lida", "válida"],
  ["V�lida", "Válida"],
  ["bot�o", "botão"],
  ["Bot�o", "Botão"],
  ["Institui��o", "Instituição"],
  ["institui��o", "instituição"],
  ["Sele��o", "Seleção"],
  ["sele��o", "seleção"],
  ["Inscri��o", "Inscrição"],
  ["inscri��o", "inscrição"],
  ["Ol�", "Olá"],
  ["diferen�a", "diferença"],
  ["recorr�ncia", "recorrência"],
  ["unit�rio", "unitário"],
  ["bloquear�", "bloqueará"],
  ["ficar�", "ficará"],
  ["cota��es", "cotações"],
  ["Lan�amento", "Lançamento"],
  ["lan�amento", "lançamento"],
  ["vig�ncia", "vigência"],
  ["compet�ncia", "competência"],
  ["geogr�fica", "geográfica"],
  ["Fun��o", "Função"],
  ["fun��o", "função"],
  ["Obrigat�rio", "Obrigatório"],
  ["obrigat�rio", "obrigatório"],
  ["Ap�s", "Após"],
  ["Raz�o", "Razão"],
  ["raz�o", "razão"],
  ["endere�o", "endereço"],
  ["Endere�o", "Endereço"],
  ["gestáo", "gestão"],
  ["Gestáo", "Gestão"],
  ["sensóveis", "sensíveis"],
  ["permissóes", "permissões"],
  ["possóvel", "possível"],
  ["irreversóvel", "irreversível"],
  ["Responsóvel", "Responsável"],
  ["responsóvel", "responsável"],
  ["seráo", "serão"],
  [" � ", " é "]
];

function collectFiles(targetPath, output) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (allowedExtensions.has(path.extname(targetPath))) output.push(targetPath);
    return;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, output);
      continue;
    }
    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
      output.push(fullPath);
    }
  }
}

function repairContent(content) {
  let next = content;

  if (/Ã.|ï¿½/.test(next)) {
    next = Buffer.from(next, "latin1").toString("utf8");
  }

  for (const [source, target] of replacements) {
    next = next.replaceAll(source, target);
  }

  return next;
}

const files = [];
for (const target of scanTargets) {
  collectFiles(path.join(projectRoot, target), files);
}

const changed = [];
for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  const repaired = repairContent(content);
  if (repaired === content) continue;

  fs.writeFileSync(filePath, repaired, "utf8");
  changed.push(path.relative(projectRoot, filePath));
}

if (!changed.length) {
  console.log("Nenhum arquivo precisou de reparo.");
  process.exit(0);
}

console.log(`Arquivos reparados: ${changed.length}`);
for (const file of changed) {
  console.log(`- ${file}`);
}
