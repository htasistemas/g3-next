import packageJson from '../../package.json';

const obterApiUrlRuntime = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const apiUrl = (window as any).__env?.apiUrl as string | undefined;
  const normalizado = (apiUrl ?? '').trim();
  if (!normalizado || normalizado === '__ENV_API_URL__') return undefined;
  return normalizado;
};

const obterGoogleClientIdRuntime = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const clientId = (window as any).__env?.googleClientId as string | undefined;
  const normalizado = (clientId ?? '').trim();
  if (!normalizado || normalizado === '__ENV_GOOGLE_CLIENT_ID__') return undefined;
  return normalizado;
};

export const environment = {
  production: false,
  apiUrl: obterApiUrlRuntime() ?? 'http://localhost:8080',
  version: packageJson.version,
  googleClientId: obterGoogleClientIdRuntime() ?? ''
};
