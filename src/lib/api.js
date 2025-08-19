// src/lib/api.js
import axios from 'axios';

const api = axios.create({
  // ⚠️ baseURL을 비워두면 CRA dev-server가 package.json의 "proxy"로 넘겨줍니다.
  baseURL: '',
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 디버깅 편하게 에러 로그 통일
    console.error('[API ERROR]', {
      url: err.config?.url,
      status: err.response?.status,
      data: err.response?.data,
      err,
    });
    // alert 등에서 보일 메시지
    const msg =
      err?.response?.data?.message ||
      err?.response?.data ||
      err.message ||
      '요청 실패';
    return Promise.reject(new Error(msg));
  }
);

export default api;