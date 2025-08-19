// AI 관련 API 래퍼
import api from "../lib/api";

/**
 * AI 카피라이팅 (명세서: POST /api/ai/polish)
 * @param {Object} params
 * @param {"STAY"|"TRANSFER"} params.type  - 대상 타입
 * @param {string} params.rawText          - 원문 텍스트
 * @param {string} [params.tone]           - 톤(선택)
 * @returns {Promise<{ improvedText: string }>}
 */
export async function aiPolish({ type, rawText, tone }) {
  const { data } = await api.post("/api/ai/polish", { type, rawText, tone });
  return data; // { improvedText }
}