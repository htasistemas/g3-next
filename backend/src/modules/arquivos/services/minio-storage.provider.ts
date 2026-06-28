import { PassThrough, Readable } from "node:stream";
import {
  CreateBucketCommand,
  CopyObjectCommand,
  type BucketLocationConstraint,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { StorageProvider } from "./storage-provider.js";
import { normalizarCaminhoLogico } from "./storage-utils.js";

async function bodyToBuffer(body: unknown): Promise<Buffer | undefined> {
  if (!body) return undefined;
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  const anyBody = body as {
    transformToByteArray?: () => Promise<Uint8Array> | Uint8Array;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  if (typeof anyBody.transformToByteArray === "function") {
    const value = await anyBody.transformToByteArray();
    return Buffer.from(value);
  }

  if (typeof anyBody.arrayBuffer === "function") {
    const value = await anyBody.arrayBuffer();
    return Buffer.from(value);
  }

  return undefined;
}

export class MinioStorageProvider implements StorageProvider {
  private readonly bucket = env.APP_STORAGE_BUCKET;
  private readonly client = new S3Client({
    region: env.APP_STORAGE_REGION,
    endpoint: env.APP_STORAGE_ENDPOINT,
    forcePathStyle: env.APP_STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.APP_STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.APP_STORAGE_SECRET_ACCESS_KEY ?? ""
    }
  });
  private initPromise: Promise<void> | null = null;

  async ensureReady() {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        } catch (error: any) {
          const statusCode = error?.$metadata?.httpStatusCode;
          const name = String(error?.name ?? "");
          const notFound = statusCode === 404 || name === "NotFound" || name === "NoSuchBucket";

          if (!notFound) {
            throw error;
          }

          const params: ConstructorParameters<typeof CreateBucketCommand>[0] = {
            Bucket: this.bucket
          };

          if (env.APP_STORAGE_REGION !== "us-east-1") {
            params.CreateBucketConfiguration = {
              LocationConstraint: env.APP_STORAGE_REGION as BucketLocationConstraint
            };
          }

          try {
            await this.client.send(new CreateBucketCommand(params));
          } catch (createError) {
            throw new AppError("Nao foi possivel inicializar o bucket do storage.", 500);
          }
        }
      })();
    }

    await this.initPromise;
  }

  normalizePath(caminhoArquivo: string) {
    return normalizarCaminhoLogico(caminhoArquivo);
  }

  async salvar(caminhoArquivo: string, conteudo: Buffer, mimeType?: string) {
    await this.ensureReady();
    const key = this.normalizePath(caminhoArquivo);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: conteudo,
          ContentType: mimeType
        })
      );
    } catch {
      throw new AppError("Nao foi possivel gravar o arquivo no storage persistente.", 500);
    }
  }

  async mover(caminhoOrigem: string, caminhoDestino: string) {
    await this.ensureReady();
    const sourceKey = this.normalizePath(caminhoOrigem);
    const targetKey = this.normalizePath(caminhoDestino);
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, "/")}`,
          Key: targetKey
        })
      );
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: sourceKey
        })
      );
    } catch {
      throw new AppError("Nao foi possivel mover o arquivo no storage persistente.", 500);
    }
  }

  async remover(caminhoArquivo: string) {
    const key = this.normalizePath(caminhoArquivo);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );
  }

  async existe(caminhoArquivo: string) {
    try {
      const key = this.normalizePath(caminhoArquivo);
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  criarLeitura(caminhoArquivo: string) {
    const key = this.normalizePath(caminhoArquivo);
    const stream = new PassThrough();

    void this.client
      .send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      )
      .then(async (response) => {
        const bodyBuffer = await bodyToBuffer(response.Body);
        if (!bodyBuffer) {
          stream.end();
          return;
        }

        stream.end(bodyBuffer);
      })
      .catch((error) => {
        stream.destroy(error);
      });

    return stream;
  }

  async lerBuffer(caminhoArquivo: string) {
    const key = this.normalizePath(caminhoArquivo);
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      );
      return bodyToBuffer(response.Body);
    } catch {
      return undefined;
    }
  }
}
