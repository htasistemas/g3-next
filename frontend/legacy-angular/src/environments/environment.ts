import packageJson from '../../package.json';

const obterApiUrlRuntime = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  // Permite configurar o endpoint em tempo de execucao via window.__env.apiUrl
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
  production: true,
  apiUrl: (() => {
    const apiUrlRuntime = obterApiUrlRuntime();
    if (apiUrlRuntime) return apiUrlRuntime;
    if (typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      if (port === '4200') return 'http://localhost:8080';
      if (hostname) {
        const portaNormalizada = port ? `:${port}` : '';
        return `${protocol}//${hostname}${portaNormalizada}`;
      }
    }
    return 'http://localhost:3000';
  })(),
  version: packageJson.version,
  googleClientId: obterGoogleClientIdRuntime() ?? ''
};
