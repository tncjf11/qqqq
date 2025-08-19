// src/components/mainpage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/mainpage.css";
import house from "../image/house.png";
import image19 from "../image/image19.png";
import image21 from "../image/image21.png";
import image32 from "../image/image32.png";

/** ✅ 백엔드 API 불러오기 */
import { getTopStay, getTopTransfer } from "../lib/listings";

/** 캐러셀 레이아웃 상수 */
const GAP = 36;
const VISIBLE = 4;
const SIDE_PAD = 28;
const CARD_HW_RATIO = 302 / 287;

export default function MainPage() {
  const navigate = useNavigate();

  /** ✅ Top 데이터(백엔드) */
  const [topStay, setTopStay] = useState([]);         // 인기 숙박
  const [topTransfer, setTopTransfer] = useState([]); // 인기 양도
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [stay, transfer] = await Promise.all([getTopStay(), getTopTransfer()]);
        if (!mounted) return;
        setTopStay(Array.isArray(stay) ? stay : []);
        setTopTransfer(Array.isArray(transfer) ? transfer : []);
      } catch (e) {
        console.error(e);
      } finally {
        mounted = false ? null : setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /** 카테고리 탭 상태 */
  const [activeCategory, setActiveCategory] = useState("lodging"); // 'lodging' | 'transfer'

  /** 검색 영역 */
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

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

  /** ── 캐러셀: 섹션 폭 기준으로 카드 폭/높이 동적 계산 ── */
  const carouselRef = useRef(null);
  const [cardW, setCardW] = useState(287);
  const cardH = Math.round(cardW * CARD_HW_RATIO);
  const slideWidth = cardW + GAP;

  useEffect(() => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const compute = () => {
      const total = el.clientWidth;
      const avail = Math.max(0, total - SIDE_PAD * 2);
      const nextW = Math.floor((avail - GAP * (VISIBLE - 1)) / VISIBLE);
      if (nextW > 0) setCardW(nextW);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** ✅ 표시 목록(Top5): 백엔드 결과 그대로 사용 */
  const selectedList = activeCategory === "lodging" ? topStay : topTransfer;
  const displayList = useMemo(() => (selectedList || []).slice(0, 5), [selectedList]);

  /** 트랙 너비/슬라이딩 */
  const trackWidth = useMemo(() => {
    if (!displayList.length) return 0;
    return displayList.length * cardW + (displayList.length - 1) * GAP;
  }, [displayList.length, cardW]);

  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [activeCategory]);

  const maxIndex = Math.max(0, displayList.length - VISIBLE);
  const trackX = -(index * slideWidth);

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(maxIndex, i + 1));

  /** ✅ 상세 페이지 이동: /lodging/:id 또는 /transfer/:id */
  const goDetailFromMain = (item) => {
    if (!item?.id) return;
    if (activeCategory === "lodging") {
      navigate(`/lodging/${item.id}`);
    } else {
      navigate(`/transfer/${item.id}`);
    }
  };

  return (
    <div className="screen">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <h1 className="main-title">
            FIT ROOM<br />_Finding<br />a house that suits me
          </h1>
          <img src={house} alt="" className="house-image" aria-hidden="true" />
        </div>

        {/* 우측 상단 검색 */}
        <div className="top-search">
          <button
            className="top-search__toggle"
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            aria-controls="mainpage-top-search-form"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="top-search__label">검색</span>
          </button>

          <form
            id="mainpage-top-search-form"
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

        {/* 요약/태그 */}
        <div className="summary-box">
          <div className="summary-check">Check out</div>
          <p className="summary-text">your home at a glance,</p>
        </div>
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

        {/* 상단 3카테고리 카드 */}
        <div
          className="category-card"
          style={{ left: 87, top: 684, backgroundColor: "#D4E4E1" }}
          onClick={() => navigate("/lodging")}
          role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? navigate("/lodging") : null)}
        >
          <img src={image19} alt="숙박" className="category-image" />
          <div className="category-label">숙박</div>
        </div>
        <div
          className="category-card"
          style={{ left: 491, top: 684, backgroundColor: "#EFD7E4" }}
          onClick={() => navigate("/transfer")}
          role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? navigate("/transfer") : null)}
        >
          <img src={image21} alt="양도" className="category-image" />
          <div className="category-label">양도</div>
        </div>
        <div
          className="category-card"
          style={{ left: 900, top: 684, backgroundColor: "#F3E1CB" }}
          onClick={() => navigate("/upload")}
          role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? navigate("/upload") : null)}
        >
          <img src={image32} alt="업로드" className="category-image" />
          <div className="category-label">업로드</div>
        </div>

        {/* ====== TopList 섹션 ====== */}
        <section className="toplist-section">
          <div className="top-list-label">Top List</div>

          {/* 탭 */}
          <div className="toplist-tabs" role="tablist" aria-label="Top List Category Tabs">
            <button
              role="tab"
              aria-selected={activeCategory === "lodging"}
              className={`chip ${activeCategory === "lodging" ? "is-active" : ""}`}
              onClick={() => setActiveCategory("lodging")}
            >
              숙박
            </button>
            <button
              role="tab"
              aria-selected={activeCategory === "transfer"}
              className={`chip ${activeCategory === "transfer" ? "is-active" : ""}`}
              onClick={() => setActiveCategory("transfer")}
            >
              양도
            </button>
          </div>

          {/* 캐러셀 */}
          <div ref={carouselRef} className="carousel" style={{ width: "100%" }}>
            {/* 왼쪽 화살표 */}
            <button
              className="carousel__nav is-left"
              onClick={goPrev}
              aria-label="이전"
              disabled={index === 0}
              style={{ left: 12, transform: "none" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.25" />
              </svg>
            </button>

            <div
              className="carousel__viewport"
              aria-roledescription="carousel"
              aria-label={activeCategory === "lodging" ? "숙박 Top 5" : "양도 Top 5"}
              style={{ padding: `0 ${SIDE_PAD}px`, height: cardH + 40 }}
            >
              <div
                className="carousel__track"
                style={{ width: trackWidth, transform: `translateX(${trackX}px)` }}
              >
                {displayList.map((item, i) => {
                  // ✅ 백엔드 Top 응답 필드 사용(예시: thumbnailUrl/buildingName/price)
                  const thumb = item.thumbnailUrl || "";
                  const title = item.buildingName || item.name || `#${item.id}`;
                  const priceStr =
                    typeof item.price === "number"
                      ? `${item.price.toLocaleString()}원`
                      : (item.price ?? "");

                  return (
                    <div
                      key={item.id}
                      className="carousel__card"
                      style={{
                        width: cardW,
                        marginRight: i === displayList.length - 1 ? 0 : GAP,
                        height: cardH + 40,
                      }}
                      onClick={() => goDetailFromMain(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? goDetailFromMain(item) : null)}
                    >
                      <div className="carousel__thumb" style={{ height: cardH }}>
                        {/* 썸네일 이미지 */}
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 24 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: 24,
                              background: "#EDEDED",
                            }}
                          />
                        )}
                        <div className="carousel__badge">{i + 1}</div>
                      </div>
                      <div className="carousel__text">
                        {title}
                        {priceStr && <span style={{ marginLeft: 6, opacity: 0.8 }}>· {priceStr}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 오른쪽 화살표 */}
            <button
              className="carousel__nav is-right"
              onClick={goNext}
              aria-label="다음"
              disabled={index === Math.max(0, displayList.length - VISIBLE)}
              style={{ right: 12, transform: "none" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.25" />
              </svg>
            </button>
          </div>
        </section>
        {/* ====== /TopList 섹션 ====== */}

        {/* 푸터 */}
        <div className="footer-text">
          FIT ROOM<br />
          <span className="footer-sub">_Finding a house that suits me</span>
        </div>
      </div>

      {/* 로딩(선택) */}
      {loading && <div className="loading">불러오는 중…</div>}
    </div>
  );
}