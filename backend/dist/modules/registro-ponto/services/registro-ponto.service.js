import PDFDocument from "pdfkit";
import bcrypt from "bcryptjs";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { parseBase64Payload } from "../../arquivos/services/storage-utils.js";
import { registroPontoAjusteSchema, registroPontoHoraExtraCienciaSchema, registroPontoHoraExtraConfiguracaoSchema, registroPontoHoraExtraDecisaoSchema, registroPontoHoraExtraFiltroSchema, registroPontoFaceSchema, registroPontoFiltersSchema, registroPontoHorarioUsuarioSchema, registroPontoMarcarSchema, registroPontoOcorrenciaSchema, registroPontoRelatorioMensalSchema } from "../registro-ponto.schema.js";
import { ensureRegistroPontoEstrutura } from "../repositories/registro-ponto-estrutura.repository.js";
import { RegistroPontoRepository } from "../repositories/registro-ponto.repository.js";
import { calcularMenorDistanciaFace, facesConferem, gerarAssinaturaFace } from "./registro-ponto-face.js";
export class RegistroPontoService {
    repository = new RegistroPontoRepository();
    async listar(rawFilters, atorRaw) {
        const filters = registroPontoFiltersSchema.parse(rawFilters);
        const ator = this.parseAtor(atorRaw);
        return this.repository.listar(filters, ator);
    }
    async listarEspelho(rawFilters, atorRaw) {
        const filters = registroPontoFiltersSchema.parse(rawFilters);
        const ator = this.parseAtor(atorRaw);
        return this.repository.listarEspelho(filters, ator);
    }
    async listarUsuarios(rawTermo, atorRaw) {
        const termo = typeof rawTermo === "string" ? rawTermo : undefined;
        const ator = this.parseAtor(atorRaw);
        return this.repository.listarUsuarios(termo, ator.tenant_id);
    }
    async buscarHorarioUsuario(atorRaw) {
        const ator = this.parseAtor(atorRaw);
        return this.repository.buscarHorarioUsuario(ator);
    }
    async salvarHorarioUsuario(rawInput, atorRaw, origem) {
        const input = registroPontoHorarioUsuarioSchema.parse(rawInput ?? {});
        const ator = this.parseAtor(atorRaw);
        return this.repository.salvarHorarioUsuario(input, ator, origem);
    }
    async buscarAlertaPendencia(atorRaw) {
        const ator = this.parseAtor(atorRaw);
        return this.repository.buscarAlertaPendencia(ator);
    }
    async buscarConfiguracaoHoraExtra(atorRaw) {
        const ator = this.parseAtor(atorRaw);
        return this.repository.buscarConfiguracaoHoraExtra(ator);
    }
    async salvarConfiguracaoHoraExtra(rawInput, atorRaw, origem) {
        const input = registroPontoHoraExtraConfiguracaoSchema.parse(rawInput ?? {});
        const ator = this.parseAtor(atorRaw);
        return this.repository.salvarConfiguracaoHoraExtra(input, ator, origem);
    }
    async buscarFaceUsuario(atorRaw) {
        const ator = this.parseAtor(atorRaw);
        const usuario = await this.buscarUsuarioConfirmacao(ator.id, ator.tenant_id);
        if (!usuario) {
            throw new AppError("Usuario autenticado nao encontrado.", 404);
        }
        return this.mapFaceStatus(usuario);
    }
    async salvarFaceUsuario(rawInput, atorRaw) {
        const input = registroPontoFaceSchema.parse(rawInput ?? {});
        const ator = this.parseAtor(atorRaw);
        const usuario = await this.buscarUsuarioConfirmacao(ator.id, ator.tenant_id);
        if (!usuario) {
            throw new AppError("Usuario autenticado nao encontrado.", 404);
        }
        const { buffer } = parseBase64Payload(input.face_imagem, "image/jpeg");
        const faceHash = await gerarAssinaturaFace(buffer);
        const resultado = await storageService.salvarArquivo({
            scope: "colaborador_face",
            conteudo: input.face_imagem,
            nomeOriginal: `usuario-${ator.id?.toString() ?? "sem-id"}-face.jpg`,
            mimeType: "image/jpeg",
            entidadeId: ator.id,
            usuarioUploadId: ator.id,
            observacao: "Cadastro de face do usuario para registro de ponto"
        });
        try {
            await prisma.$executeRaw `
        UPDATE usuarios
           SET face_hash = ${faceHash},
               face_foto_url = ${resultado.caminhoArquivo},
               face_cadastrada_em = NOW(),
               atualizado_em = NOW()
         WHERE id = ${ator.id}
           AND tenant_id::text = ${ator.tenant_id}
      `;
            await storageService.vincularEntidade(resultado.caminhoArquivo, ator.id);
            if (usuario.face_foto_url &&
                this.isManagedStoragePath(usuario.face_foto_url) &&
                usuario.face_foto_url !== resultado.caminhoArquivo) {
                await storageService.desativarPorCaminho(usuario.face_foto_url, ator.id);
            }
        }
        catch (error) {
            await storageService.rollbackArquivos([resultado.caminhoArquivo]);
            throw error;
        }
        const status = await this.buscarFaceUsuario(atorRaw);
        return {
            mensagem: "Face cadastrada com sucesso.",
            ...status
        };
    }
    async marcarPonto(rawInput, atorRaw, origem) {
        const input = registroPontoMarcarSchema.parse(rawInput ?? {});
        const ator = this.parseAtor(atorRaw);
        await this.validarConfirmacaoUsuario(input.usuario_login, input.senha, input.modo_confirmacao === "face" ? input.face_imagem : undefined, ator);
        return this.repository.marcarPonto(input, ator, origem);
    }
    async ajustarRegistro(rawRegistroId, rawInput, atorRaw, origem) {
        const input = registroPontoAjusteSchema.parse(rawInput);
        const ator = this.parseAtor(atorRaw);
        await this.validarConfirmacaoUsuario(input.usuario_login, input.senha, input.modo_confirmacao === "face" ? input.face_imagem : undefined, ator);
        return this.repository.ajustarRegistro(rawRegistroId, input, ator, origem);
    }
    async adicionarOcorrencia(rawRegistroId, rawInput, atorRaw, origem) {
        const input = registroPontoOcorrenciaSchema.parse(rawInput);
        const ator = this.parseAtor(atorRaw);
        return this.repository.adicionarOcorrencia(rawRegistroId, input, ator, origem);
    }
    async listarHorasExtras(rawFilters, atorRaw) {
        const filters = registroPontoHoraExtraFiltroSchema.parse(rawFilters ?? {});
        const ator = this.parseAtor(atorRaw);
        return this.repository.listarHorasExtras(filters, ator);
    }
    async registrarCienciaHoraExtra(rawId, rawInput, atorRaw, origem) {
        const input = registroPontoHoraExtraCienciaSchema.parse(rawInput ?? {});
        const ator = this.parseAtor(atorRaw);
        return this.repository.registrarCienciaHoraExtra(rawId, input, ator, origem);
    }
    async decidirHoraExtra(rawId, rawInput, atorRaw, origem) {
        const input = registroPontoHoraExtraDecisaoSchema.parse(rawInput ?? {});
        const ator = this.parseAtor(atorRaw);
        return this.repository.decidirHoraExtra(rawId, input, ator, origem);
    }
    async listarRelatorioMensal(rawFilters, atorRaw) {
        const filters = registroPontoRelatorioMensalSchema.parse(rawFilters ?? {});
        const ator = this.parseAtor(atorRaw);
        return this.repository.listarRelatorioMensal(filters, ator);
    }
    async exportarRelatorioMensal(rawFilters, formato, atorRaw) {
        const relatorio = await this.listarRelatorioMensal(rawFilters, atorRaw);
        if (formato === "excel") {
            const html = this.montarHtmlRelatorioMensal(relatorio);
            return {
                filename: `relatorio-horas-extras-${new Date().toISOString().slice(0, 10)}.xls`,
                contentType: "application/vnd.ms-excel",
                buffer: Buffer.from(html, "utf8")
            };
        }
        const pdf = await this.montarPdfRelatorioMensal(relatorio);
        return {
            filename: `relatorio-horas-extras-${new Date().toISOString().slice(0, 10)}.pdf`,
            contentType: "application/pdf",
            buffer: pdf
        };
    }
    async buscarHistorico(rawRegistroId, atorRaw) {
        const ator = this.parseAtor(atorRaw);
        return this.repository.buscarHistorico(rawRegistroId, ator);
    }
    parseAtor(atorRaw) {
        const nome_usuario = atorRaw.nomeUsuario?.trim();
        if (!nome_usuario) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const tenant_id = atorRaw.tenant_id?.trim();
        if (!tenant_id) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        const idNumerico = Number(atorRaw.id);
        const id = Number.isInteger(idNumerico) && idNumerico > 0 ? BigInt(idNumerico) : undefined;
        return {
            id,
            nome_usuario,
            tenant_id,
            permissoes: atorRaw.permissoes ?? []
        };
    }
    async validarConfirmacaoUsuario(login, senha, faceImagem, ator) {
        if (!ator.id) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const usuario = await this.buscarUsuarioConfirmacao(ator.id, ator.tenant_id);
        if (!usuario) {
            throw new AppError("Usuario autenticado nao encontrado.", 404);
        }
        const loginNormalizado = login.trim().toLowerCase();
        const nomeUsuarioNormalizado = usuario.nome_usuario.trim().toLowerCase();
        const emailNormalizado = usuario.email?.trim().toLowerCase();
        const loginConfere = loginNormalizado === nomeUsuarioNormalizado ||
            (emailNormalizado ? loginNormalizado === emailNormalizado : false);
        if (!loginConfere) {
            throw new AppError("Usuario ou senha invalidos para confirmar o registro de ponto.", 401);
        }
        const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaConfere) {
            throw new AppError("Usuario ou senha invalidos para confirmar o registro de ponto.", 401);
        }
        if (faceImagem) {
            if (!usuario.face_hash) {
                throw new AppError("Cadastre a face do usuario antes de usar validacao facial.", 400);
            }
            const { buffer } = parseBase64Payload(faceImagem, "image/jpeg");
            const faceHashAtual = await gerarAssinaturaFace(buffer);
            const distancia = calcularMenorDistanciaFace(usuario.face_hash, faceHashAtual);
            if (!facesConferem(usuario.face_hash, faceHashAtual)) {
                throw new AppError(`A validacao facial nao conferiu com a face cadastrada para este usuario. Distancia calculada: ${distancia}.`, 401);
            }
        }
    }
    async buscarUsuarioConfirmacao(usuarioId, tenantId) {
        if (!usuarioId || !tenantId) {
            return null;
        }
        await ensureRegistroPontoEstrutura(prisma);
        const rows = await prisma.$queryRaw `
      SELECT
        id,
        nome_usuario,
        email,
        senha_hash,
        face_hash,
        face_foto_url,
        face_cadastrada_em
      FROM usuarios
      WHERE id = ${usuarioId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `;
        return rows[0] ?? null;
    }
    mapFaceStatus(usuario) {
        return {
            face_cadastrada: Boolean(usuario.face_hash && usuario.face_foto_url),
            face_url: usuario.face_foto_url ?? undefined,
            face_cadastrada_em: usuario.face_cadastrada_em?.toISOString()
        };
    }
    isManagedStoragePath(valor) {
        if (!valor?.trim())
            return false;
        const normalized = valor.trim();
        return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
    }
    montarHtmlRelatorioMensal(relatorio) {
        const linhas = relatorio.registros
            .map((item) => {
            const justificativas = item.justificativas.join(" | ");
            const batidas = item.batidas_reais.join(" | ");
            return `
          <tr>
            <td>${item.usuario_nome}</td>
            <td>${item.data_referencia}</td>
            <td>${item.jornada_prevista ?? ""}</td>
            <td>${batidas}</td>
            <td>${item.horas_extras_pendentes_minutos}</td>
            <td>${item.horas_extras_aprovadas_minutos}</td>
            <td>${item.horas_extras_negadas_minutos}</td>
            <td>${item.saldo_banco_horas_aprovado_minutos}</td>
            <td>${justificativas}</td>
            <td>${item.ciencia_funcionario ? "Sim" : "Não"}</td>
            <td>${item.aprovacao_gestor_rh ? "Sim" : "Não"}</td>
          </tr>`;
        })
            .join("");
        return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatorio mensal de horas extras</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 6px; vertical-align: top; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Relatorio mensal de horas extras</h1>
          <p>Total de funcionarios: ${relatorio.totais.funcionarios}</p>
          <table>
            <thead>
              <tr>
                <th>Funcionario</th>
                <th>Data</th>
                <th>Jornada prevista</th>
                <th>Batidas reais</th>
                <th>Pendentes</th>
                <th>Aprovadas</th>
                <th>Negadas</th>
                <th>Banco aprovado</th>
                <th>Justificativas</th>
                <th>Ciencia</th>
                <th>Aprovacao gestor/RH</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </body>
      </html>`;
    }
    async montarPdfRelatorioMensal(relatorio) {
        return await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 30, size: "A4", compress: true });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            doc.fontSize(16).text("Relatorio mensal de horas extras", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(10).text(`Funcionarios: ${relatorio.totais.funcionarios}`);
            doc.text(`Pendentes: ${relatorio.totais.horas_extras_pendentes_minutos} min`);
            doc.text(`Aprovadas: ${relatorio.totais.horas_extras_aprovadas_minutos} min`);
            doc.text(`Negadas: ${relatorio.totais.horas_extras_negadas_minutos} min`);
            doc.text(`Banco aprovado: ${relatorio.totais.saldo_banco_horas_aprovado_minutos} min`);
            doc.moveDown(0.75);
            for (const item of relatorio.registros.slice(0, 120)) {
                doc.fontSize(11).text(`${item.usuario_nome} - ${item.data_referencia}`, { continued: false });
                doc.fontSize(9).text(`Batidas: ${item.batidas_reais.join(" | ") || "---"}`);
                doc.text(`Pendentes: ${item.horas_extras_pendentes_minutos} | Aprovadas: ${item.horas_extras_aprovadas_minutos} | Negadas: ${item.horas_extras_negadas_minutos} | Banco: ${item.saldo_banco_horas_aprovado_minutos}`);
                if (item.justificativas.length) {
                    doc.text(`Justificativas: ${item.justificativas.join(" | ")}`);
                }
                doc.moveDown(0.4);
            }
            doc.end();
        });
    }
}
