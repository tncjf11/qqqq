// 숙박/양도 매물 관련 API 래퍼
import api from "../lib/api";

/**
 * 원샷 등록 (이미지 포함)
 * 명세서: POST /api/listings/with-upload
 * - form-data:
 *   - data: JSON 문자열(매물 정보)
 *   - files: 이미지 파일들(최대 5장)
 * @param {Object} listingData  - { type, buildingName, description, address, startDate, endDate, guests, price, pin }
 * @param {File[]} files
 * @returns {Promise<Object>} ListingResponse
 */
export async function createListingWithUpload(listingData, files = []) {
  const form = new FormData();
  form.append("data", JSON.stringify(listingData));
  files.forEach((f) => form.append("files", f));
  const { data } = await api.post("/api/listings/with-upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * 매물 수정
 * 명세서: PATCH /api/listings/{id}
 * body 예: { description, price, address, pin, ... } (필요 필드만 보냄)
 */
export async function patchListing(id, body) {
  const { data } = await api.patch(`/api/listings/${id}`, body);
  return data; // ListingResponse
}

/**
 * 매물 삭제
 * 명세서: DELETE /api/listings/{id}?pin=1234
 * 성공 시 204(No Content)
 */
export async function deleteListing(id, pin) {
  await api.delete(`/api/listings/${id}`, { params: { pin } });
}

/** 숙박 목록 (간단 카드용)
 * GET /api/listings/stay
 */
export async function getStayList() {
  const { data } = await api.get("/api/listings/stay");
  return data; // StayTopItem[]
}

/** 양도 목록 (간단 카드용)
 * GET /api/listings/transfer
 */
export async function getTransferList() {
  const { data } = await api.get("/api/listings/transfer");
  return data; // TransferTopItem[]
}

/** 숙박 상세 (조회수 증가 포함)
 * GET /api/listings/stay/{id}
 */
export async function getStayDetail(id) {
  const { data } = await api.get(`/api/listings/stay/${id}`);
  return data; // StayDetailResponse
}

/** 양도 상세
 * GET /api/listings/transfer/{id}
 */
export async function getTransferDetail(id) {
  const { data } = await api.get(`/api/listings/transfer/${id}`);
  return data; // TransferDetailResponse
}

/** TOP 10 숙박
 * GET /api/listings/top/stay
 */
export async function getTopStay() {
  const { data } = await api.get("/api/listings/top/stay");
  return data;
}

/** TOP 10 양도
 * GET /api/listings/top/transfer
 */
export async function getTopTransfer() {
  const { data } = await api.get("/api/listings/top/transfer");
  return data;
}

/** 숙박 검색
 * GET /api/listings/stay/search
 * params: { name, startDate, endDate, minPrice, maxPrice }
 */
export async function searchStay(params) {
  const { data } = await api.get("/api/listings/stay/search", { params });
  return data; // StayTopItem[]
}

/** 통합 검색
 * GET /api/listings/search
 * params: { name }
 */
export async function searchAll(name) {
  const { data } = await api.get("/api/listings/search", { params: { name } });
  return data; // ListingSearchItem[]
}

/** (옵션) 단일 이미지 업로드 테스트용
 * POST /api/uploads/image
 */
export async function uploadOne(file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/api/uploads/image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { url }
}

/** (옵션) 복수 이미지 업로드 테스트용
 * POST /api/uploads/images
 */
export async function uploadMany(files) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const { data } = await api.post("/api/uploads/images", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { urls: [] }
}