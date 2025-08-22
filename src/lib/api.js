// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://likelion-hackathon-h6r9.onrender.com", // 그냥 절대주소 박아두기
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[API ERROR]", {
      url: err.config?.url,
      status: err.response?.status,
      data: err.response?.data,
      err,
    });
    const msg =
      err?.response?.data?.message ||
      err?.response?.data ||
      err.message ||
      "요청 실패";
    return Promise.reject(new Error(msg));
  }
);

export default api;
