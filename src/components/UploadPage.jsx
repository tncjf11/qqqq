// src/components/UploadPage.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "./Header";
import "../styles/mainpage.css";
import "../styles/UploadPage.css";

import lodgingImg from "../image/image19.png";
import transferImg from "../image/image21.png";
import uploadImg from "../image/image32.png";
import { setDraft } from "../utils/draft";

export const TagGroup = () => (
  <div className="tag-group">
    <div className="tag tag-outline" style={{ transform: "rotate(-6.33deg)" }}>
      short_term
    </div>
    <div className="tag tag-outline-white" style={{ transform: "rotate(2.37deg)" }}>
      to long-term
    </div>
    <div className="tag tag-filled" style={{ transform: "rotate(-5.35deg)" }}>
      rentals!
    </div>
  </div>
);

// ✅ 백엔드 베이스 URL (prod 기본값: Render, dev 기본값: /api)
const isProd = process.env.NODE_ENV === "production";
const API_BASE = (
  process.env.REACT_APP_API_BASE ||
  (isProd ? "https://likelion-hackathon-h6r9.onrender.com" : "/api")
).replace(/\/+$/, ""); // 끝의 슬래시 제거
if (typeof window !== "undefined") console.log("[API_BASE]", API_BASE);

// ---------- 유틸 ----------
const pad2 = (n) => String(n).padStart(2, "0");
function parseDateRange(input) {
  if (!input) return { startDate: null, endDate: null };
  const now = new Date();
  const yyyy = now.getFullYear();

  // 1) YYYY-MM-DD ~ YYYY-MM-DD
  const iso = input.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (iso) return { startDate: iso[1], endDate: iso[2] };

  // 2) MM.DD ~ MM.DD
  const md = input.match(/(\d{1,2})\.(\d{1,2})\s*~\s*(\d{1,2})\.(\d{1,2})/);
  if (md) {
    const s = `${yyyy}-${pad2(md[1])}-${pad2(md[2])}`;
    const e = `${yyyy}-${pad2(md[3])}-${pad2(md[4])}`;
    return { startDate: s, endDate: e };
  }
  return { startDate: null, endDate: null };
}
const toInt = (v) => {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
};
const mapType = (tab) => (tab === "lodging" ? "STAY" : "TRANSFER");

const UploadPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // { mode, roomId, type, initialValues } 가능

  // 🔎 상단 검색
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const searchBtnRef = useRef(null);
  const toggleSearch = () => {
    setSearchOpen((v) => {
      const next = !v;
      setTimeout(() => next && inputRef.current?.focus(), 0);
      return next;
    });
  };
  const submitSearch = () => {
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!searchOpen) return;
      const form = document.getElementById("uploadpage-top-search-form");
      if (!form?.contains(e.target) && !searchBtnRef.current?.contains(e.target)) {
        setSearchOpen(false);
        searchBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [searchOpen]);

  // ----------------------------
  // 이미지 업로드(여러 장) + 캐러셀
  // ----------------------------
  const fileInputRef = useRef(null);

  // 원본 File 목록
  const [files, setFiles] = useState([]);
  // 미리보기 URL 배열
  const [urls, setUrls] = useState([]);
  // 현재 인덱스
  const [idx, setIdx] = useState(0);

  const onPickImage = () => fileInputRef.current?.click();

  const onFileChange = (e) => {
    const list = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    setFiles(list);
    setIdx(0);
  };

  // object URL 생성 & 정리
  useEffect(() => {
    // 이전 URL revoke
    return () => {
      // 언마운트 시 마지막 urls 정리
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 새로 선택된 파일들로 URL 생성
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    // 변경 전 URL 정리
    return () => u.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const hasImages = urls.length > 0;

  const prev = useCallback(() => {
    if (!hasImages) return;
    setIdx((i) => (i - 1 + urls.length) % urls.length);
  }, [hasImages, urls.length]);

  const next = useCallback(() => {
    if (!hasImages) return;
    setIdx((i) => (i + 1) % urls.length);
  }, [hasImages, urls.length]);

  // 키보드 ←/→ 지원
  useEffect(() => {
    const onKey = (e) => {
      if (!hasImages) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasImages, prev, next]);

  // 탭 / 폼
  const guessInitialTab =
    state?.type ?? (state?.initialValues?.date !== undefined ? "lodging" : "transfer");
  const [activeTab, setActiveTab] = useState(guessInitialTab); // "transfer" | "lodging"

  const [forms, setForms] = useState({
    transfer: {
      building: "",
      content: "",
      pin: "",
      address: "",
      price: "",
      period: "",
    },
    lodging: {
      building: "",
      content: "",
      pin: "",
      date: "",
      people: "",
      amount: "",
      address: "",
    },
  });
  const form = forms[activeTab];
  const onFormChange = (field) => (e) => {
    const value = e.target.value;
    setForms((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [field]: value },
    }));
  };

  // 상세→수정 진입 시 초기값 주입
  useEffect(() => {
    const iv = state?.initialValues;
    if (!iv) return;
    const tab = state?.type ?? (iv?.date !== undefined ? "lodging" : "transfer");
    setActiveTab(tab);
    setForms((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], ...iv },
    }));
    // 서버 이미지 미리보기 필요 시 urls에 추가하는 로직을 별도로 넣을 수 있습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 1회

  // 업로드 (실연동)
  const onUpload = async () => {
    try {
      if (!form.building?.trim()) return alert("건물명을 입력해 주세요.");
      if (!form.pin?.trim()) return alert("PIN을 입력해 주세요.");

      const type = mapType(activeTab);
      const payload = {
        type, // "STAY" | "TRANSFER"
        buildingName: form.building?.trim(),
        description: form.content ?? "",
        address: form.address ?? "",
        startDate: null,
        endDate: null,
        guests: null,
        price: null,
        pin: form.pin?.trim(),
        photos: [], // 서버 저장 후 채워질 필드
      };

      if (type === "STAY") {
        const { startDate, endDate } = parseDateRange(form.date);
        payload.startDate = startDate;
        payload.endDate = endDate;
        payload.guests = toInt(form.people);
        payload.price = toInt(form.amount);
      } else {
        const { startDate, endDate } = parseDateRange(form.period);
        payload.startDate = startDate;
        payload.endDate = endDate;
        payload.price = toInt(form.price);
      }

      // 업로드 직전 초안 저장(실패 대비)
      const roomId = state?.roomId ?? payload?.buildingName ?? "unknown";
      setDraft(roomId, { tab: activeTab, ...payload });

      const fd = new FormData();
      fd.append("data", JSON.stringify(payload)); // key: "data"
      files.forEach((f) => fd.append("files", f)); // key: "files"

      // 🔧 상대경로 → 절대 API로 변경
      const resp = await fetch(`${API_BASE}/api/listings/with-upload`, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(`업로드 실패 (${resp.status}) ${msg}`);
      }

      const created = await resp.json(); // ListingResponse {id, type, ...}
      const nextPath =
        created?.type === "STAY" ? `/lodging/${created.id}` : `/transfer/${created.id}`;
      alert("업로드 완료!");
      navigate(nextPath);
    } catch (e) {
      console.error(e);
      alert(String(e.message ?? e));
    }
  };

  // AI 글쓰기 (실연동)
  const [aiBusy, setAiBusy] = useState(false);
  async function postJSON(path, body) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status} ${resp.statusText} - ${msg}`);
    }
    return resp.json();
  }
  const onAiRewrite = async () => {
    const rawText = forms[activeTab].content ?? "";
    if (!rawText.trim()) {
      alert("본문이 비어 있어요. 먼저 내용을 입력해 주세요.");
      return;
    }
    setAiBusy(true);
    try {
      // 명세: POST /api/ai/polish { type, rawText }
      const data = await postJSON(`/api/ai/polish`, {
        type: mapType(activeTab),
        rawText,
      });
      const improved = data?.improvedText ?? "";
      setForms((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], content: improved },
      }));
    } catch (e) {
      console.error(e);
      alert("AI 글쓰기 실패: " + e.message);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="screen upload-page">
      <div className="container">
        {/* 🔎 상단 검색 */}
        <div className="top-search">
          <button
            ref={searchBtnRef}
            className="top-search__toggle"
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            aria-controls="uploadpage-top-search-form"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="top-search__label">검색</span>
          </button>

          <form
            id="uploadpage-top-search-form"
            role="search"
            className={`top-search__form ${searchOpen ? "is-open" : ""}`}
            aria-hidden={!searchOpen}
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
          >
            <input
              ref={inputRef}
              className="top-search__input"
              placeholder="원룸/건물명 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="검색어 입력"
              tabIndex={searchOpen ? 0 : -1}
              onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
            />
          </form>
        </div>

        {/* 공용 헤더 */}
        <Header />

        {/* 카테고리 카드 */}
        <div className="category-wrapper">
          <div className="category-card" onClick={() => navigate("/lodging")}>
            <img src={lodgingImg} alt="숙박" className="category-image" />
            <div className="category-label">숙박</div>
          </div>
          <div className="category-card" onClick={() => navigate("/transfer")}>
            <img src={transferImg} alt="양도" className="category-image" />
            <div className="category-label">양도</div>
          </div>
          <div className="category-card active">
            <img src={uploadImg} alt="업로드" className="category-image" />
            <div className="category-label">업로드</div>
          </div>
        </div>

        {/* 요약/태그 */}
        <div className="summary-box">
          <div className="summary-check">Check out</div>
          <p className="summary-text">your home at a glance,</p>
        </div>
        <TagGroup />

        {/* 본문 */}
        <section className="upload-inner">
          {/* 탭 */}
          <div className="upload-tabs">
            <button
              type="button"
              className={`tab ${activeTab === "transfer" ? "tab--active" : "tab--ghost"}`}
              onClick={() => setActiveTab("transfer")}
              aria-pressed={activeTab === "transfer"}
            >
              양도
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "lodging" ? "tab--active" : "tab--ghost"}`}
              onClick={() => setActiveTab("lodging")}
              aria-pressed={activeTab === "lodging"}
            >
              숙박
            </button>
          </div>

          <div className="upload-grid">
            {/* 좌: 이미지 카드 (캐러셀) */}
            <div
              className="upload-card"
              onClick={onPickImage}
              role="button"
              tabIndex={0}
              aria-label="이미지 선택 또는 변경"
            >
              <div className="upload-card__shadow shadow--1" />
              <div className="upload-card__shadow shadow--2" />
              <div className="upload-card__body">
                {hasImages ? (
                  <>
                    {/* 이전 버튼 */}
                    <button
                      className="carousel-btn carousel-btn--prev"
                      type="button"
                      aria-label="이전 이미지"
                      onClick={(e) => {
                        e.stopPropagation();
                        prev();
                      }}
                    >
                      ←
                    </button>

                    <img
                      src={urls[idx]}
                      alt={`업로드 이미지 ${idx + 1}`}
                      className="upload-preview"
                      draggable={false}
                    />

                    {/* 다음 버튼 */}
                    <button
                      className="carousel-btn carousel-btn--next"
                      type="button"
                      aria-label="다음 이미지"
                      onClick={(e) => {
                        e.stopPropagation();
                        next();
                      }}
                    >
                      →
                    </button>

                    {/* 인덱스 표시 */}
                    <div
                      className="upload-counter"
                      aria-live="polite"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {idx + 1} / {urls.length}
                    </div>
                  </>
                ) : (
                  <span className="plus">+</span>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFileChange}
                  hidden
                />
              </div>
            </div>

            {/* 우: 폼 */}
            <div className="upload-form">
              {/* 제목 */}
              <div className="title-line">
                <input
                  className="title-input"
                  placeholder="건물명"
                  value={form.building}
                  onChange={onFormChange("building")}
                />
                <div className="underline" />
              </div>

              {/* 칩 영역 */}
              <div className={`chips ${activeTab === "lodging" ? "is-lodging" : "is-transfer"}`}>
                {activeTab === "lodging" ? (
                  <>
                    <input
                      className="chip-input"
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={form.date}
                      onChange={onFormChange("date")}
                    />
                    <input
                      className="chip-input"
                      type="text"
                      placeholder="인원수 (예: 2명)"
                      value={form.people}
                      onChange={onFormChange("people")}
                    />
                    <input
                      className="chip-input"
                      type="text"
                      placeholder="금액 (예: 50만원)"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.amount}
                      onChange={onFormChange("amount")}
                    />
                    <input
                      className="chip-input"
                      type="text"
                      placeholder="주소"
                      value={form.address}
                      onChange={onFormChange("address")}
                    />
                  </>
                ) : (
                  <>
                    <input
                      className="chip-input"
                      type="text"
                      placeholder="주소"
                      value={form.address}
                      onChange={onFormChange("address")}
                    />
                    <input
                      className="chip-input"
                      type="text"
                      placeholder="가격 (예: 150만원)"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.price}
                      onChange={onFormChange("price")}
                    />
                    <input
                      className="chip-input"
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={form.period}
                      onChange={onFormChange("period")}
                    />
                  </>
                )}
              </div>

              {/* 요약 라인 */}
              <div className="summary summary--form">
                {activeTab === "lodging"
                  ? form.date || form.people || form.amount || form.address
                    ? `${form.date || ""} / ${form.people || ""} / ${form.amount || ""} / ${form.address || ""}`
                    : "11.2~11.5 / 2명 / 50만원 / ○○빌라"
                  : form.address || form.price || form.period
                    ? `${form.address || ""} / ${form.price || ""} / ${form.period || ""}`
                    : "○○빌라 / 150만원 / 바로입주"}
              </div>

              {/* 본문 */}
              <div className="editor">
                <textarea
                  className="editor-area"
                  value={form.content}
                  onChange={onFormChange("content")}
                  placeholder="글쓰기 / 고객과의 컨택을 위한 연락처를 남겨주세요!"
                />
              </div>

              {/* 하단: PIN + 업로드 + AI 글쓰기 */}
              <div className="bottom-actions">
                <div className="pin-wrap">
                  <label className="pin-label">PIN</label>
                  <input
                    className="pin-input"
                    value={form.pin}
                    onChange={onFormChange("pin")}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

                <button type="button" className="upload-btn" onClick={onUpload}>
                  업로드
                </button>

                <button className="upload-btn" onClick={onAiRewrite} disabled={aiBusy}>
                  {aiBusy ? "AI 처리 중..." : "AI 글쓰기"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="footer-text">
          FIT ROOM
          <br />
          <span className="footer-sub">_Finding a house that suits me</span>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
