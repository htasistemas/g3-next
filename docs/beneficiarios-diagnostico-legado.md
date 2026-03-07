# Diagnóstico Atual - Cadastro de Beneficiário (Angular/Java)

## 1) Localização da implementação atual
- Frontend Angular:
  - `frontend/src/app/components/beneficiario-cadastro/beneficiario-cadastro.component.ts`
  - `frontend/src/app/components/beneficiario-cadastro/beneficiario-cadastro.component.html`
  - `frontend/src/app/services/beneficiario-api.service.ts`
  - `frontend/src/app/services/report.service.ts`
- Backend Java:
  - `backend/src/main/java/br/com/g3/cadastrobeneficiario/controller/CadastroBeneficiarioController.java`
  - `backend/src/main/java/br/com/g3/cadastrobeneficiario/serviceimpl/CadastroBeneficiarioServiceImpl.java`
  - `backend/src/main/java/br/com/g3/cadastrobeneficiario/mapper/CadastroBeneficiarioMapper.java`
  - `backend/src/main/java/br/com/g3/cadastrobeneficiario/dto/CadastroBeneficiarioCriacaoRequest.java`

## 2) Campos identificados
- Identificação:
  - `codigo`, `status`, `nome_completo`, `nome_social`, `apelido`, `data_nascimento`, `foto_3x4`
  - `sexo_biologico`, `identidade_genero`, `cor_raca`, `estado_civil`, `nacionalidade`
  - `naturalidade_cidade`, `naturalidade_uf`, `nome_mae`, `nome_pai`
- Endereço:
  - `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `ponto_referencia`, `municipio`, `uf`
  - `zona`, `subzona`, `latitude`, `longitude`
- Contato:
  - `telefone_principal`, `telefone_principal_whatsapp`, `telefone_secundario`
  - `telefone_recado_nome`, `telefone_recado_numero`, `email`
  - `permite_contato_tel`, `permite_contato_whatsapp`, `permite_contato_sms`, `permite_contato_email`
  - `horario_preferencial_contato`
- Documentos:
  - `cpf`, `rg_numero`, `rg_orgao_emissor`, `rg_uf`, `rg_data_emissao`, `nis`
  - `certidao_tipo`, `certidao_livro`, `certidao_folha`, `certidao_termo`, `certidao_cartorio`, `certidao_municipio`, `certidao_uf`
  - `titulo_eleitor`, `cnh`, `cartao_sus`
  - `documentos_obrigatorios` (metadados de anexos)
- Situação social/familiar:
  - `mora_com_familia`, `responsavel_legal`, `vinculo_familiar`, `situacao_vulnerabilidade`, `composicao_familiar`
  - `criancas_adolescentes`, `idosos`, `acompanhamento_cras`, `acompanhamento_saude`
  - `participa_comunidade`, `rede_apoio`
- Escolaridade/trabalho:
  - `sabe_ler_escrever`, `nivel_escolaridade`, `estuda_atualmente`, `ocupacao`
  - `situacao_trabalho`, `local_trabalho`, `renda_mensal`, `fonte_renda`
- Saúde:
  - `possui_deficiencia`, `tipo_deficiencia`, `cid_principal`
  - `usa_medicacao_continua`, `descricao_medicacao`, `servico_saude_referencia`
- Benefícios:
  - `recebe_beneficio`, `beneficios_descricao`, `valor_total_beneficios`, `beneficios_recebidos`
- Observações/LGPD:
  - `aceite_lgpd`, `data_aceite_lgpd`, `observacoes`

## 3) Validações identificadas no legado
- Frontend:
  - Obrigatórios: `nome_completo`, `data_nascimento`, `nome_mae`, `cep`, `telefone_principal`, `cpf`, `aceite_lgpd`
  - `cpf`: validação algorítmica completa
  - `cep`: 8 dígitos
  - `email`: formato válido quando preenchido
  - Máscaras em input para CPF/CEP/telefone
  - Bloqueio de salvar durante upload de documentos
- Backend:
  - `@NotBlank/@NotNull` em `nome_completo`, `data_nascimento`, `nome_mae`
  - `@Size` para limite de campos
  - Filtros complementares para CPF/NIS/data
  - Normalização de código sequencial e fallback de comparação

## 4) Endpoints utilizados na tela
- CRUD beneficiário:
  - `GET /api/beneficiarios`
  - `GET /api/beneficiarios/:id`
  - `POST /api/beneficiarios`
  - `PUT /api/beneficiarios/:id`
  - `DELETE /api/beneficiarios/:id`
  - `GET /api/beneficiarios/proximo-codigo`
  - `POST /api/beneficiarios/:id/geocodificar-endereco`
  - `PATCH /api/beneficiarios/:id/aptidao-cesta-basica`
- Impressão/relatórios:
  - `POST /api/reports/beneficiarios/relacao`
  - `POST /api/reports/beneficiarios/ficha`
  - `POST /api/reports/authorization-term`

## 5) Tabelas de banco envolvidas
- Núcleo:
  - `cadastro_beneficiario`
  - `endereco`
  - `contato_beneficiario`
  - `documentos`
  - `situacao_social`
  - `escolaridade_beneficiario`
  - `saude_beneficiario`
  - `beneficios_beneficiario`
  - `observacoes_beneficiario`
- Relacionadas (dependência de domínio):
  - `vinculo_familiar`, `vinculo_familiar_membro`
  - tabelas de prontuário, visitas e doações com FK para beneficiário

## 6) Fluxos mapeados
- Novo:
  - Gera próximo código, limpa formulário, define status base `EM_ANALISE`.
- Salvar:
  - Valida campos/documentos, calcula status (`INCOMPLETO` quando necessário), persiste.
- Editar:
  - Seleção em listagem, carga por ID, patch no formulário.
- Buscar:
  - Filtros por nome/código/cpf/status/data, com fallback para serviço antigo.
- Cancelar:
  - Reset para estado inicial ou última carga selecionada.
- Excluir:
  - Confirmação e remoção por ID.
- Imprimir:
  - Lista e ficha individual via endpoints de relatório.

## 7) Problemas estruturais observados
- Tela muito extensa e acoplada (lógica de formulário, impressão e listagem em um único componente).
- Duplicidade de responsabilidade entre serviços (`beneficiario-api.service` e `beneficiary.service`).
- Uso intenso de estado local e regras espalhadas (status, validações, fallback).
- Complexidade alta para manutenção e evolução gradual.

## 8) Alterações de banco nesta fase
- Não foi realizada nenhuma alteração estrutural de banco.
- Estratégia aplicada: reutilizar schema existente no novo backend Node/Prisma.
