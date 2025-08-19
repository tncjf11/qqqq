// src/api/client.js
import axios from "axios";
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE ?? "http://172.30.1.77:8081",
  timeout: 30000,
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    const ct = e.response?.headers?.["content-type"] ?? "";
    if (ct.includes("text/plain")) {
      return Promise.reject(new Error(String(e.response?.data ?? e.message)));
    }
    const msg =
      e.response?.data?.error?.message ??
      e.response?.data?.message ??
      e.message;
    return Promise.reject(new Error(msg));
  }
);