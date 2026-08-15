import { env } from "../../../config/env.js";
import { LocalStorageProvider } from "./local-storage.provider.js";
import { MinioStorageProvider } from "./minio-storage.provider.js";
let provider = null;
export function getStorageProvider() {
    if (!provider) {
        provider = env.APP_STORAGE_DRIVER === "minio" ? new MinioStorageProvider() : new LocalStorageProvider();
    }
    return provider;
}
