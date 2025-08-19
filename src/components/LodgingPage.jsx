// src/components/LodgingPage.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import "../styles/LodgingPage.css";
import lodgingImg from "../image/image19.png";
import transferImg from "../image/image21.png";
import chatbotImg from "../image/image32.png";
import roomImg from "../image/room-sample.png";

// 백엔드 베이스 URL
const API_BASE = "";

// 썸네일 URL 조합 (상대경로면 API_BASE 붙이고, 없으면 기본 이미지)
function buildImgUrl(u) {
  if (!u) return roomImg;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

// MM.DD 포맷
const mmdd = (iso) => (iso ? iso.slice(5).replace("-", ".") : "");

const LodgingPage = () => {
  const navigate = useNavigate();

  /* ── 상단 검색(메인 동일) ── */
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
      const form = document.getElementById("lodgingpage-top-search-form");
      if (!form?.contains(e.target) && !searchBtnRef.current?.contains(e.target)) {
        setSearchOpen(false);
        searchBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [searchOpen]);

  // ====== 필터 상태 ======
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const clearFilters = () => {
    setQ(""); setFrom(""); setTo(""); setMinPrice(""); setMaxPrice("");
  };

  // 디바운스
  const [debounced, setDebounced] = useState({ q, from, to, minPrice, maxPrice });
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ q, from, to, minPrice, maxPrice }), 250);
    return () => clearTimeout(t);
  }, [q, from, to, minPrice, maxPrice]);

  // ====== 데이터 ======
  const [items, setItems] = useState([]);      // StayTopItem[]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function fetchList(params) {
    const usp = new URLSearchParams();
    if (params.q?.trim()) usp.set("name", params.q.trim());
    if (params.from) usp.set("startDate", params.from);
    if (params.to) usp.set("endDate", params.to);
    if (params.minPrice) usp.set("minPrice", params.minPrice);
    if (params.maxPrice) usp.set("maxPrice", params.maxPrice);

    const path = usp.toString()
      ? `/api/listings/stay/search?${usp.toString()}`
      : `/api/listings/stay`;

    const resp = await fetch(`${API_BASE}${path}`);
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(`목록 조회 실패 (${resp.status}) ${msg}`);
    }
    return resp.json(); // StayTopItem[]
  }

  useEffect(() => {
  let alive = true;
  setLoading(true);
  setErr("");
  fetchList(debounced)
    .then((data) => { if (alive) setItems(Array.isArray(data) ? data : []); })
    .catch((e) => { if (alive) setErr(e.message || String(e)); })
    .finally(() => alive && setLoading(false));
  return () => { alive = false; };
}, [debounced]);   // ← 이렇게 객체 자체를 의존성에 넣기


  // ====== More+ 페이지네이션 ======
  const PAGE_SIZE = 6;
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => setVisible(PAGE_SIZE), [items]);
  const visibleList = useMemo(() => items.slice(0, visible), [items, visible]);
  const canLoadMore = visible < items.length;
  const handleMore = () => setVisible((v) => Math.min(v + PAGE_SIZE, items.length));

  // 푸터 위치 보정
  const listRef = useRef(null);
  const [footerTop, setFooterTop] = useState(1667);
  useEffect(() => {
    const calc = () => {
      const el = listRef.current;
      if (!el) return;
      const top = el.offsetTop || 0;
      const height = el.offsetHeight || 0;
      const margin = 60;
      setFooterTop(top + height + margin);
    };
    calc();
    const imgs = listRef.current?.querySelectorAll("img") || [];
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", calc, { once: true });
    });
    window.addEventListener("resize", calc);
    const id = setTimeout(calc, 0);
    return () => { window.removeEventListener("resize", calc); clearTimeout(id); };
  }, [visibleList.length]);

  // 상세 이동
  const goDetail = (id) => navigate(`/lodging/${id}`);

  return (
    <div className="screen">
      <div className="container lodging-page">
        {/* 상단 검색 */}
        <div className="top-search">
          <button
            ref={searchBtnRef}
            className="top-search__toggle"
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            aria-controls="lodgingpage-top-search-form"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="top-search__label">검색</span>
          </button>

          <form
            id="lodgingpage-top-search-form"
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

        {/* 카테고리 */}
        <div className="category-wrapper">
          <div className="category-card active" onClick={() => navigate("/lodging")}>
            <img src={lodgingImg} alt="숙박" className="category-image" />
            <div className="category-label">숙박</div>
          </div>
          <div className="category-card" onClick={() => navigate("/transfer")}>
            <img src={transferImg} alt="양도" className="category-image" />
            <div className="category-label">양도</div>
          </div>
          <div className="category-card" onClick={() => navigate("/upload")}>
            <img src={chatbotImg} alt="업로드" className="category-image" />
            <div className="category-label">업로드</div>
          </div>
        </div>

        {/* 필터 바 */}
        <div className="filter-bar">
          <div className="chip input-chip">
            <span className="chip-label">건물명</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: ○○빌라" />
          </div>
          <div className="chip date-chip">
            <span className="chip-label">날짜</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="tilde">~</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="chip input-chip">
            <span className="chip-label">금액</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="최소"
            />
            <span className="tilde">~</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="최대"
            />
            <span className="won">원</span>
          </div>
          <button type="button" className="chip clear-chip" onClick={clearFilters}>
            초기화
          </button>
        </div>

        {/* More+ */}
        <button
          type="button"
          className={`more-btn ${canLoadMore ? "" : "disabled"}`}
          onClick={handleMore}
          disabled={!canLoadMore}
        >
          More +
        </button>

        {/* 리스트 */}
        <div className="lodging-list" ref={listRef}>
          {loading && <div className="empty">불러오는 중...</div>}
          {err && !loading && <div className="empty">오류: {err}</div>}
          {!loading && !err && visibleList.map((s) => (
            <div
              className="lodging-card"
              key={s.id}
              onClick={() => goDetail(s.id)}
            >
              <img src={buildImgUrl(s.thumbnailUrl)} alt="숙박" className="lodging-image" />
              <div className="lodging-text">
                {`${s.buildingName ?? ""} / ${mmdd(s.startDate)}~${mmdd(s.endDate)} / ${
                  s.price != null ? s.price.toLocaleString() + "원" : ""
                }`}
              </div>
            </div>
          ))}
          {!loading && !err && items.length === 0 && (
            <div className="empty">조건에 맞는 숙소가 없어요.</div>
          )}
        </div>

        {/* 푸터 */}
        <div className="footer-text" style={{ top: `${footerTop}px` }}>
          FIT ROOM<br />
          <span className="footer-sub">_Finding a house that suits me</span>
        </div>
      </div>
    </div>
  );
};

export default LodgingPage;