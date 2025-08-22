// src/components/TransferPage.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import "../styles/TransferPage.css";
import lodgingImg from "../image/image19.png";
import transferImg from "../image/image21.png";
import chatbotImg from "../image/image32.png";
import roomImg from "../image/room-sample.png";

/* =========================
   API BASE (prod: onrender, dev: 상대경로)
   ========================= */
const isProd = process.env.NODE_ENV === "production";
const API_BASE = (
  process.env.REACT_APP_API_BASE ||
  (isProd ? "https://likelion-hackathon-h6r9.onrender.com" : "")
).replace(/\/+$/, "");
if (typeof window !== "undefined") console.log("[API_BASE]", API_BASE);

// 썸네일 URL 조합 (상대경로면 API_BASE 붙이고, 없으면 기본 이미지)
function buildImgUrl(u) {
  if (!u) return roomImg;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

const TransferPage = () => {
  const navigate = useNavigate();

  // ====== 🔎 상단 검색 ======
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
      const form = document.getElementById("transferpage-top-search-form");
      if (!form?.contains(e.target) && !searchBtnRef.current?.contains(e.target)) {
        setSearchOpen(false);
        searchBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [searchOpen]);

  // ====== 데이터 로딩 ======
  const [items, setItems] = useState([]); // TransferTopItem[]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function fetchTransfers() {
    const path = `/api/listings/transfer`;
    const resp = await fetch(`${API_BASE}${path}`);
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(`양도 목록 조회 실패 (${resp.status}) ${msg}`);
    }
    return resp.json();
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    fetchTransfers()
      .then((data) => { if (alive) setItems(Array.isArray(data) ? data : []); })
      .catch((e) => { if (alive) setErr(e.message || String(e)); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // ===== More+ 페이지네이션 =====
  const PAGE_SIZE = 6;
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => setVisible(PAGE_SIZE), [items]);
  const visibleList = useMemo(() => items.slice(0, visible), [items, visible]);
  const canLoadMore = visible < items.length;
  const handleMore = () => setVisible((v) => Math.min(v + PAGE_SIZE, items.length));

  // ===== 푸터 자동 위치 보정 =====
  const listRef = useRef(null);
  const [footerTop, setFooterTop] = useState(1667);
  useEffect(() => {
    const calcFooter = () => {
      const el = listRef.current;
      if (!el) return;
      const top = el.offsetTop || 0;
      const height = el.offsetHeight || 0;
      const margin = 60;
      setFooterTop(top + height + margin);
    };
    calcFooter();
    const imgs = listRef.current?.querySelectorAll("img") || [];
    imgs.forEach((img) => { if (!img.complete) img.addEventListener("load", calcFooter, { once: true }); });
    window.addEventListener("resize", calcFooter);
    const id = setTimeout(calcFooter, 0);
    return () => { window.removeEventListener("resize", calcFooter); clearTimeout(id); };
  }, [visibleList.length]);

  // ✅ 상세로 이동
  const goDetail = (id) => navigate(`/transfer/${id}`);

  return (
    <div className="screen">
      <div className="container transfer-page">
        {/* 🔎 우측 상단 검색 */}
        <div className="top-search">
          <button
            ref={searchBtnRef}
            className="top-search__toggle"
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            aria-controls="transferpage-top-search-form"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="top-search__label">검색</span>
          </button>

          <form
            id="transferpage-top-search-form"
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

        {/* ✅ 공용 헤더 */}
        <Header />

        {/* 카테고리 3개 (양도 활성) */}
        <div className="category-wrapper">
          <div className="category-card" onClick={() => navigate("/lodging")}>
            <img src={lodgingImg} alt="숙박" className="category-image" />
            <div className="category-label">숙박</div>
          </div>
          <div className="category-card active" onClick={() => navigate("/transfer")}>
            <img src={transferImg} alt="양도" className="category-image" />
            <div className="category-label">양도</div>
          </div>
          <div className="category-card" onClick={() => navigate("/upload")}>
            <img src={chatbotImg} alt="업로드" className="category-image" />
            <div className="category-label">업로드</div>
          </div>
        </div>

        {/* More 버튼 */}
        <button
          type="button"
          className={`more-btn ${canLoadMore ? "" : "disabled"}`}
          onClick={handleMore}
          disabled={!canLoadMore}
        >
          More +
        </button>

        {/* 리스트 */}
        <div className="transfer-list" ref={listRef}>
          {loading && <div className="empty">불러오는 중...</div>}
          {err && !loading && <div className="empty">오류: {err}</div>}
          {!loading && !err && visibleList.map((item) => (
            <div
              className="transfer-card"
              key={item.id}
              onClick={() => goDetail(item.id)}
            >
              <img src={buildImgUrl(item.thumbnailUrl)} alt="양도" className="transfer-image" />
              <div className="transfer-text">
                {`${item.buildingName ?? ""} / ${
                  item.price != null ? item.price.toLocaleString() + "원" : ""
                }`}
              </div>
            </div>
          ))}
          {!loading && !err && items.length === 0 && (
            <div className="empty">등록된 양도 매물이 없어요.</div>
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

export default TransferPage;