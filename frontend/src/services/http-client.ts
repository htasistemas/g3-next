import axios from "axios";

const runtimeApiUrl = window.__env?.apiUrl?.trim();
const apiBaseUrl =
  import.meta.env["VITE_API_URL"] ??
  runtimeApiUrl ??
  (import.meta.env.PROD ? window.location.origin : "http://localhost:3333");

declare global {
  interface Window {
    __env?: {
      apiUrl?: string;
      googleClientId?: string;
      googleAllowedOrigins?: string;
    };
  }
}

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true
});
