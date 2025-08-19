// src/utils/draft.js
// 업로드 직전 상태(드래프트) 임시 저장/복원 유틸 - JS 버전

const MEM = new Map();
const KEY = (id) => `draft:${id}`;

export function setDraft(id, data) {
  if (!id) return;
  MEM.set(id, data);
  try {
    sessionStorage.setItem(KEY(id), JSON.stringify(data));
  } catch {}
}

export function popDraft(id) {
  if (!id) return undefined;
  const mem = MEM.get(id);
  if (mem !== undefined) {
    MEM.delete(id);
    try { sessionStorage.removeItem(KEY(id)); } catch {}
    return mem;
  }
  try {
    const raw = sessionStorage.getItem(KEY(id));
    if (raw) {
      sessionStorage.removeItem(KEY(id));
      return JSON.parse(raw);
    }
  } catch {}
  return undefined;
}

export function removeDraft(id) {
  if (!id) return;
  MEM.delete(id);
  try { sessionStorage.removeItem(KEY(id)); } catch {}
}
