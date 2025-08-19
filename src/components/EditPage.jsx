// src/components/EditPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "./Header";
import "../styles/mainpage.css";
import "../styles/EditPage.css"; // .edit-page 네임스페이스
import lodgingImg from "../image/image19.png";
import transferImg from "../image/image21.png";
import editImg from "../image/image32.png";

/* =========================
   유틸
   ========================= */
const pad2 = (n) => String(n).padStart(2, "0");
function parseDateRange(input) {
  if (!input) return { startDate: null, endDate: null };
  const now = new Date();
  const yyyy = now.getFullYear();
  const iso = input.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (iso) return { startDate: iso[1], endDate: iso[2] };
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
const tabToType = (tab) => (tab === "lodging" ? "STAY" : "TRANSFER");
const typeToTab = (type) => (type === "STAY" ? "lodging" : "transfer");

/* =========================
   API
   ========================= */
async function patchListing(id, body) {
  const resp = await fetch(`/api/listings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(`PATCH 실패 (${resp.status}) ${msg}`);
  }
  return resp.json().catch(() => ({}));
}

/** 사진 업로드 (여러 장) : 서버 엔드포인트에 맞춰 경로만 조정하세요.
 *  성공/실패와 무관하게 이후 PATCH는 계속 진행합니다.
 */
async function uploadPhotos(id, fileList) {
  if (!fileList?.length) return;
  const fd = new FormData();
  fileList.forEach((f) => fd.append("files", f)); // 서버에서 필드명을 "files"로 받는다고 가정
  const resp = await fetch(`/api/listings/${id}/photos`, {
    method: "POST",
    body: fd, // Content-Type 자동 설정됨
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(`사진 업로드 실패 (${resp.status}) ${msg}`);
  }
  return resp.json().catch(() => ({}));
}

/* =========================
   컴포넌트
   ========================= */
const EditPage = () => {
  const navigate = useNavigate();
  const { id: idFromParams } = useParams();
  const { state, pathname } = useLocation();

  // ✅ id 확보(모든 경로 커버)
  const listingId = idFromParams ?? state?.roomId ?? state?.id ?? state?.initialValues?.id;

  // ✅ 경로로 타입 추론 (새로고침 대비)
  const routeTypeFromPath = pathname?.includes("/transfer/edit/")
    ? "transfer"
    : pathname?.includes("/lodging/edit/")
    ? "lodging"
    : undefined;

  // ✅ 타입 잠금 여부 (state 우선, 없으면 경로로 판단)
  const locked = state?.lockType === true || Boolean(routeTypeFromPath);

  // ===== 이미지 선택(여러 장) + 캐러셀 =====
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);     // 원본 File[]
  const [urls, setUrls] = useState([]);       // object URL[]
  const [idx, setIdx] = useState(0);          // 현재 인덱스

  const onPickImage = () => fileInputRef.current?.click();
  const onFileChange = (e) => {
    const list = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    setFiles(list);
    setIdx(0);
  };

  // 파일 변경 시 object URL 생성 + 정리
  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
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

  // ===== 탭: 기본값 결정
  const initialTab = useMemo(() => {
    if (locked) return routeTypeFromPath || state?.type || "transfer";
    if (state?.type === "lodging" || state?.type === "transfer") return state.type;
    if (state?.initialValues?.date !== undefined) return "lodging";
    return "transfer";
  }, [locked, routeTypeFromPath, state]);

  const [activeTab, setActiveTab] = useState(initialTab);

  // locked면 탭을 고정(사용자가 바꿔도 되돌림)
  useEffect(() => {
    if (locked && activeTab !== initialTab) setActiveTab(initialTab);
  }, [locked, activeTab, initialTab]);

  // ===== 폼 =====
  const [forms, setForms] = useState({
    transfer: { building: "", content: "", address: "", price: "", period: "" },
    lodging: { building: "", content: "", date: "", people: "", amount: "", address: "" },
  });
  const form = forms[activeTab];
  const onFormChange = (field) => (e) =>
    setForms((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], [field]: e.target.value } }));

  // PIN 확인
  const [pinConfirm, setPinConfirm] = useState("");

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
  const submitSearch = () =>
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!searchOpen) return;
      const formEl = document.getElementById("editpage-top-search-form");
      if (!formEl?.contains(e.target) && !searchBtnRef.current?.contains(e.target)) {
        setSearchOpen(false);
        searchBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [searchOpen]);

  // ===== 초기값: state.initialValues 우선, 없으면 GET /api/listings/:id =====
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (state?.initialValues) {
      const tab = initialTab;
      setForms((prev) => ({ ...prev, [tab]: { ...prev[tab], ...state.initialValues } }));
      return;
    }
    if (!listingId) return;
    setLoading(true);
    (async () => {
      try {
        const resp = await fetch(`/api/listings/${listingId}`);
        if (!resp.ok) throw new Error("상세 불러오기에 실패했습니다.");
        const data = await resp.json(); // { id, type:'STAY'|'TRANSFER', ... }
        const tab = locked ? initialTab : typeToTab(data?.type);
        const next = { ...forms[tab] };
        next.building = data?.buildingName ?? "";
        next.content = data?.description ?? "";
        next.address = data?.address ?? "";
        if (tab === "lodging") {
          next.date = data?.startDate && data?.endDate ? `${data.startDate} ~ ${data.endDate}` : "";
          next.people = data?.guests != null ? String(data.guests) : "";
          next.amount = data?.price != null ? String(data.price) : "";
        } else {
          next.period =
            data?.startDate && data?.endDate ? `${data.startDate} ~ ${data.endDate}` : "";
          next.price = data?.price != null ? String(data.price) : "";
        }
        setActiveTab(tab);
        setForms((prev) => ({ ...prev, [tab]: next }));
      } catch (e) {
        console.error(e);
        alert(String(e.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  // ===== 제출: 사진 업로드(있으면) + PATCH /api/listings/{id} =====
  const onUpdate = async () => {
    try {
      if (!listingId) return alert("잘못된 접근입니다 (id 없음)");
      if (!form.building?.trim()) return alert("건물명을 입력해 주세요.");
      if (!pinConfirm?.trim()) return alert("업로드 시 사용한 PIN을 입력해 주세요.");

      // 잠금이면 경로/상태 기준으로 타입 강제 고정
      const lockedTab = locked ? (routeTypeFromPath || state?.type || "transfer") : activeTab;
      const chosenType = tabToType(lockedTab); // 'STAY' | 'TRANSFER'

      // 1) 사진 업로드(선택되어 있으면)
      if (files.length > 0) {
        try {
          await uploadPhotos(listingId, files);
        } catch (err) {
          console.warn(err);
          alert("사진 업로드에 실패했습니다. 텍스트 수정은 계속 진행합니다.");
        }
      }

      // 2) 나머지 정보 PATCH
      const body = {
        type: chosenType,
        pin: pinConfirm.trim(),
        buildingName: form.building?.trim(),
        description: form.content || undefined,
        address: form.address || undefined,
      };

      if (lockedTab === "lodging") {
        const { startDate, endDate } = parseDateRange(form.date);
        if (startDate) body.startDate = startDate;
        if (endDate) body.endDate = endDate;
        const guests = toInt(form.people);
        if (guests != null) body.guests = guests;
        const price = toInt(form.amount);
        if (price != null) body.price = price;
      } else {
        const { startDate, endDate } = parseDateRange(form.period);
        if (startDate) body.startDate = startDate;
        if (endDate) body.endDate = endDate;
        const price = toInt(form.price);
        if (price != null) body.price = price;
      }

      await patchListing(listingId, body);

      // 최종 타입 기준 상세 페이지로 이동
      const nextPath = chosenType === "STAY" ? `/lodging/${listingId}` : `/transfer/${listingId}`;
      alert("수정 완료!");
      navigate(nextPath);
    } catch (e) {
      console.error(e);
      alert(String(e.message ?? e));
    }
  };

  /* =========================
     렌더
     ========================= */
  // 잠금 모드에서 상단 카테고리 카드 클릭 방지
  const safeNav = (path) => () => {
    if (locked) return; // 잠금이면 무시
    navigate(path);
  };

  // 탭 버튼 (잠금이면 전환 비활성화)
  const TabButtons = () => {
    if (locked) {
      return (
        <div className="upload-tabs">
          <button type="button" className="tab tab--active" disabled>
            {initialTab === "lodging" ? "숙박" : "양도"}
          </button>
        </div>
      );
    }
    return (
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
    );
  };

  return (
    <div className="screen edit-page">
      <div className="container">
        {/* 🔎 상단 검색 */}
        <div className="top-search">
          <button
            ref={searchBtnRef}
            className="top-search__toggle"
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            aria-controls="editpage-top-search-form"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="top-search__label">검색</span>
          </button>
          <form
            id="editpage-top-search-form"
            role="search"
            className={`top-search__form ${searchOpen ? "is-open" : ""}`}
            aria-hidden={!searchOpen}
            onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
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
          <div className={`category-card ${locked ? "pointer-events-none opacity-70" : ""}`} onClick={safeNav("/lodging")}>
            <img src={lodgingImg} alt="숙박" className="category-image" />
            <div className="category-label">숙박</div>
          </div>
          <div className={`category-card ${locked ? "pointer-events-none opacity-70" : ""}`} onClick={safeNav("/transfer")}>
            <img src={transferImg} alt="양도" className="category-image" />
            <div className="category-label">양도</div>
          </div>
          <div className="category-card active">
            <img src={editImg} alt="수정" className="category-image" />
            <div className="category-label">수정</div>
          </div>
        </div>

        {/* 본문 */}
        <section className="upload-inner">
          {/* 탭(잠금이면 단일 탭) */}
          <TabButtons />

          <div className="upload-grid">
            {/* 좌: 이미지 카드 (캐러셀) */}
            <div
              className="upload-card"
              onClick={onPickImage}
              role="button"
              tabIndex={0}
              aria-disabled={false}
              aria-label="이미지 선택 또는 변경"
            >
              <div className="upload-card__shadow shadow--1" />
              <div className="upload-card__shadow shadow--2" />
              <div className="upload-card__body">
                {hasImages ? (
                  <>
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

                    <div
                      className="upload-counter"
                      aria-live="polite"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {idx + 1} / {urls.length}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onFileChange}
                      hidden
                    />
                  </>
                ) : (
                  <>
                    <span className="plus">+</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onFileChange}
                      hidden
                    />
                  </>
                )}
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
                      placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
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
                      placeholder="금액 (예: 500000)"
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
                      placeholder="가격 (예: 1500000)"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.price}
                      onChange={onFormChange("price")}
                    />
                    <input
                      className="chip-input"
                      type="text"
                      placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
                      value={form.period}
                      onChange={onFormChange("period")}
                    />
                  </>
                )}
              </div>

              {/* 요약 */}
              <div className="summary summary--form">
                {activeTab === "lodging"
                  ? form.date || form.people || form.amount || form.address
                    ? `${form.date || ""} / ${form.people || ""} / ${form.amount || ""} / ${form.address || ""}`
                    : "11.2~11.5 / 2명 / 500000 / ○○빌라"
                  : form.address || form.price || form.period
                    ? `${form.address || ""} / ${form.price || ""} / ${form.period || ""}`
                    : "○○빌라 / 1500000 / 바로입주"}
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

              {/* 하단: PIN + 수정완료 */}
              <div className="bottom-actions">
                <div className="pin-wrap">
                  <label className="pin-label">PIN 확인</label>
                  <input
                    className="pin-input"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

                <button type="button" className="upload-btn" onClick={onUpdate} disabled={loading}>
                  수정완료
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

export default EditPage;
