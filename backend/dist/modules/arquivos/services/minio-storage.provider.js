import { PassThrough, Readable } from "node:stream";
import { CreateBucketCommand, CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizarCaminhoLogico } from "./storage-utils.js";
async function bodyToBuffer(body) {
    if (!body)
        return undefined;
    if (Buffer.isBuffer(body))
        return body;
    if (body instanceof Readable) {
        const chunks = [];
        for await (const chunk of body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    const anyBody = body;
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
export class MinioStorageProvider {
    bucket = env.APP_STORAGE_BUCKET;
    client = new S3Client({
        region: env.APP_STORAGE_REGION,
        endpoint: env.APP_STORAGE_ENDPOINT,
        forcePathStyle: env.APP_STORAGE_FORCE_PATH_STYLE,
        credentials: {
            accessKeyId: env.APP_STORAGE_ACCESS_KEY_ID ?? "",
            secretAccessKey: env.APP_STORAGE_SECRET_ACCESS_KEY ?? ""
        }
    });
    initPromise = null;
    async ensureReady() {
        if (!this.initPromise) {
            this.initPromise = (async () => {
                try {
                    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
                }
                catch (error) {
                    const statusCode = error?.$metadata?.httpStatusCode;
                    const name = String(error?.name ?? "");
                    const notFound = statusCode === 404 || name === "NotFound" || name === "NoSuchBucket";
                    if (!notFound) {
                        throw error;
                    }
                    const params = {
                        Bucket: this.bucket
                    };
                    if (env.APP_STORAGE_REGION !== "us-east-1") {
                        params.CreateBucketConfiguration = {
                            LocationConstraint: env.APP_STORAGE_REGION
                        };
                    }
                    try {
                        await this.client.send(new CreateBucketCommand(params));
                    }
                    catch (createError) {
                        throw new AppError("Nao foi possivel inicializar o bucket do storage.", 500);
                    }
                }
            })();
        }
        await this.initPromise;
    }
    normalizePath(caminhoArquivo) {
        return normalizarCaminhoLogico(caminhoArquivo);
    }
    async salvar(caminhoArquivo, conteudo, mimeType) {
        await this.ensureReady();
        const key = this.normalizePath(caminhoArquivo);
        try {
            await this.client.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: conteudo,
                ContentType: mimeType
            }));
        }
        catch {
            throw new AppError("Nao foi possivel gravar o arquivo no storage persistente.", 500);
        }
    }
    async mover(caminhoOrigem, caminhoDestino) {
        await this.ensureReady();
        const sourceKey = this.normalizePath(caminhoOrigem);
        const targetKey = this.normalizePath(caminhoDestino);
        try {
            await this.client.send(new CopyObjectCommand({
                Bucket: this.bucket,
                CopySource: `${this.bucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, "/")}`,
                Key: targetKey
            }));
            await this.client.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: sourceKey
            }));
        }
        catch {
            throw new AppError("Nao foi possivel mover o arquivo no storage persistente.", 500);
        }
    }
    async remover(caminhoArquivo) {
        const key = this.normalizePath(caminhoArquivo);
        await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key
        }));
    }
    async existe(caminhoArquivo) {
        try {
            const key = this.normalizePath(caminhoArquivo);
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));
            return true;
        }
        catch {
            return false;
        }
    }
    criarLeitura(caminhoArquivo) {
        const key = this.normalizePath(caminhoArquivo);
        const stream = new PassThrough();
        void this.client
            .send(new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        }))
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
    async lerBuffer(caminhoArquivo) {
        const key = this.normalizePath(caminhoArquivo);
        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));
            return bodyToBuffer(response.Body);
        }
        catch {
            return undefined;
        }
    }
}
