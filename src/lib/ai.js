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
  const res = await api.post("https://likelion-hackathon-h6r9.onrender.com/api/ai/polish", { type, rawText, tone }, { timeout: 30000 });
  const data = res?.data;
  if (!data || typeof data.improvedText !== "string") {
    throw new Error("AI 응답 형식이 예상과 다릅니다.");
  }
  return data; // { improvedText }
}
