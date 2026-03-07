import axios from "axios";

const apiBaseUrl = import.meta.env["VITE_API_URL"] ?? "http://localhost:3333";

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true
});
