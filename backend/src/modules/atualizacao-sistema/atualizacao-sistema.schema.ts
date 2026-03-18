import { z } from "zod";

export const atualizacaoSistemaModoSchema = z.enum(["MANUAL", "AUTOMATICO"]);

export const atualizacaoSistemaManifestoSchema = z.object({
  latestVersion: z.string().trim().min(1),
  releaseDate: z.string().trim().min(1),
  description: z.string().trim().min(1),
  packageName: z.string().trim().default(""),
  checksum: z.string().trim().default(""),
  minCompatibleVersion: z.string().trim().optional(),
  releaseType: z.enum(["stable", "hotfix", "beta", "custom"]).default("stable"),
  downloadUrl: z.string().trim().url().optional().nullable()
});

export const atualizacaoSistemaChangelogItemSchema = z.object({
  version: z.string().trim().min(1),
  releaseDate: z.string().trim().optional(),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  changes: z.array(z.string().trim().min(1)).optional(),
  releaseType: z.enum(["stable", "hotfix", "beta", "custom"]).optional()
});

export const atualizacaoSistemaChangelogSchema = z.union([
  z.object({
    entries: z.array(atualizacaoSistemaChangelogItemSchema).default([])
  }),
  z.array(atualizacaoSistemaChangelogItemSchema)
]);

export const atualizarConfigAtualizacaoSistemaSchema = z.object({
  modo: atualizacaoSistemaModoSchema
});

export const aplicarAtualizacaoSistemaSchema = z.object({
  versao: z.string().trim().optional(),
  forcar: z.boolean().optional().default(false)
});

export const rollbackAtualizacaoSistemaSchema = z.object({
  historicoId: z.string().trim().optional()
});
