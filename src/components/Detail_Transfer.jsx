// src/components/Detail_Transfer.jsx
import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import house from "../image/house.png";
import "../styles/Detail_Transfer.css";

/* ===== 공통 유틸 ===== */
// prod 기본값: Render, dev 기본값: /api
const isProd = process.env.NODE_ENV === "production";
const API_BASE = (
  process.env.REACT_APP_API_BASE ||
  (isProd ? "https://likelion-hackathon-h6r9.onrender.com" : "/api")
).replace(/\/+$/, ""); // 끝 슬래시 제거
if (typeof window !== "undefined") console.log("[API_BASE]", API_BASE);

const mmdd = (iso) => (iso ? iso.slice(5).replace("-", ".") : "");
function buildImgUrl(u, fallback) {
  if (!u) return fallback;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** 네이버 스크립트 로더 */
function useNaverScript(clientId) {
  const [ready, setReady] = useState(!!window.naver?.maps);
  useEffect(() => {
    if (window.naver?.maps) {
      setReady(true);
      return;
    }
    if (!clientId) {
      console.warn("REACT_APP_NAVER_MAP_ID 가 설정되지 않았습니다.");
      return;
    }
    const el = document.createElement("script");
    el.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`;
    el.async = true;
    el.onload = () => setReady(true);
    el.onerror = () => console.error("Naver Maps 스크립트 로딩 실패");
    document.head.appendChild(el);
  }, [clientId]);
  return ready;
}

/** ── 주소 전처리 유틸 ── */
// " 주소: " 라벨/여분 공백 제거
const cleanLabel = (s = "") =>
  s.replace(/^주소\s*:\s*/i, "").replace(/\s+/g, " ").trim();
// "금곡로 7번길 1" → "금곡로7번길 1" (네이버가 이 표기를 더 잘 인식)
const normalizeRoad = (s = "") => s.replace(/로\s+(\d+)\s*번길/gi, "로$1번길");
// "자하문로 50" → "자하문로50" (일부 케이스 보완)
const normalizeSpaceNum = (s = "") => s.replace(/([가-힣\d])\s+(\d+)/g, "$1$2");

/** 지도: lat/lng 또는 address로 표시(주소는 후보들을 순차 시도) */
function NaverMap({ lat, lng, address, zoom = 16, style }) {
  const mapRef = useRef(null);
  const ncpClientId = process.env.REACT_APP_NAVER_MAP_ID;
  const ready = useNaverScript(ncpClientId);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { naver } = window;
    if (!naver?.maps) return;

    const renderAt = (position) => {
      const map = new naver.maps.Map(mapRef.current, { center: position, zoom });
      new naver.maps.Marker({ position, map });
    };

    if (lat != null && lng != null) {
      renderAt(new naver.maps.LatLng(lat, lng));
      return;
    }

    if (address && naver.maps.Service?.geocode) {
      // 주소 후보들을 원본 → 정리 → 붙여쓰기 변형 → 대한민국 접두 순으로 시도
      const a0 = String(address ?? "");
      const a1 = cleanLabel(a0);
      const a2 = normalizeRoad(a1);
      const a3 = normalizeSpaceNum(a2);
      const trials = [
        a0,            // 원본 그대로 우선
        a1,            // 라벨/여분 공백 정리
        a2,            // "로 7번길" → "로7번길"
        a3,            // "자하문로 50" → "자하문로50" 등 보완
        `대한민국 ${a1}`,
        `대한민국 ${a2}`,
        `대한민국 ${a3}`,
      ];

      const tryNext = (i = 0) => {
        if (i >= trials.length) {
          console.warn("지오코딩 실패:", address);
          return;
        }
        naver.maps.Service.geocode({ query: trials[i] }, (status, res) => {
          if (status === naver.maps.Service.Status.OK && res?.v2?.addresses?.length) {
            const a = res.v2.addresses[0];
            const pos = new naver.maps.LatLng(Number(a.y), Number(a.x));
            renderAt(pos);
          } else {
            tryNext(i + 1);
          }
        });
      };
      tryNext();
    }
  }, [ready, lat, lng, address, zoom]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: 530,
        borderRadius: 16,
        border: "1px solid #e5e5e5",
        ...style,
      }}
    />
  );
}

const DetailTransfer = () => {
  const navigate = useNavigate();
  const { id } = useParams();

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
      const form = document.getElementById("transferpage-top-search-form");
      if (!form?.contains(e.target) && !searchBtnRef.current?.contains(e.target)) {
        setSearchOpen(false);
        searchBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [searchOpen]);

  /* ===== 데이터 로딩(TRANSFER) ===== */
  const [data, setData] = useState(null); // TransferDetailResponse
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setErr("");

    fetch(`${API_BASE}/api/listings/transfer/${id}`)
      .then(async (resp) => {
        if (!resp.ok)
          throw new Error(`상세 조회 실패 (${resp.status}) ${await resp.text().catch(() => "")}`);
        return resp.json();
      })
      .then((json) => {
        if (alive) setData(json);
      })
      .catch((e) => {
        if (alive) setErr(e.message || String(e));
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [id]);

  /* ===== 수정: 반드시 수정페이지로 이동 ===== */
  const toEdit = () => {
    if (!data) return;
    navigate(`/transfer/edit/${id}`, {
      state: {
        type: "transfer", // 탭 기본값
        roomId: id,
        initialValues: {
          building: data.buildingName || "",
          content: data.description || "",
          address: data.address || "",
          period:
            data.startDate && data.endDate
              ? `${data.startDate} ~ ${data.endDate}`
              : "",
          price: data.price != null ? String(data.price) : "",
          pin: "", // 수정 페이지에서 재입력
        },
      },
    });
  };

  /* ===== 삭제: PIN 확인 → DELETE → 메인으로 이동 ===== */
  const onDelete = async () => {
    const pin = window.prompt("삭제 PIN을 입력하세요");
    if (!pin) return;
    try {
      const resp = await fetch(
        `${API_BASE}/api/listings/${id}?pin=${encodeURIComponent(pin)}`,
        { method: "DELETE" }
      );
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(`삭제 실패 (${resp.status}) ${msg}`);
      }
      alert("삭제되었습니다.");
      navigate("/"); // 메인으로 이동
    } catch (e) {
      alert(String(e.message ?? e));
    }
  };

  /* ===== 사진 캐러셀/라이트박스 상태 (최대 5장) ===== */
  const photos = (data?.photos ?? []).slice(0, 5);
  const total = photos.length;

  // 카드 내 현재 인덱스 (좌/우 버튼)
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [total]);

  const prevCard = () => setIdx((i) => (i - 1 + total) % total);
  const nextCard = () => setIdx((i) => (i + 1) % total);

  // 라이트박스(모달)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);

  const openViewer = (startIndex = 0) => {
    setViewerIdx(startIndex);
    setViewerOpen(true);
  };
  const closeViewer = () => setViewerOpen(false);
  const prevViewer = () => setViewerIdx((i) => (i - 1 + total) % total);
  const nextViewer = () => setViewerIdx((i) => (i + 1) % total);

  // ESC/Arrow 키 + 스크롤 잠금
  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeViewer();
      else if (e.key === "ArrowLeft") prevViewer();
      else if (e.key === "ArrowRight") nextViewer();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerOpen, total]);

  if (!id) {
    return (
      <div style={{ padding: 24 }}>
        잘못된 접근입니다.{" "}
        <button onClick={() => navigate("/transfer")}>양도 목록으로</button>
      </div>
    );
  }

  return (
    <div className="detail-transfer">
      <div className="container">
        {/* 헤더 */}
        <div className="header">
          <div className="branding">
            <p className="branding-text">
              FIT ROOM<br />_Finding<br />a house that suits me
            </p>
            <img
              className="house-icon"
              src={house}
              alt="house"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/")}
              style={{ cursor: "pointer" }}
            />
          </div>

          {/* 🔎 검색 */}
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
        </div>

        {/* 상단 탭 */}
        <div className="detail-tabs">
          <button className="pill pill--black">양도</button>
        </div>

        {/* 사진 + 상세 그리드 */}
        <section className="detail-grid">
          {/* 좌측: 사진 카드 */}
          <div className="photo-card">
            <div className="pc-shadow s1" />
            <div className="pc-shadow s2" />
            <div className="pc-body" aria-label="양도 사진 갤러리">
              {total > 0 ? (
                <>
                  <img
                    key={idx}
                    src={buildImgUrl(photos[idx], house)}
                    alt={`양도 이미지 ${idx + 1} / ${total}`}
                    className="pc-img"
                    style={{ transition: "opacity .2s ease", cursor: "zoom-in" }}
                    onClick={() => openViewer(idx)}
                  />
                  {total > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="이전 사진"
                        onClick={prevCard}
                        style={{
                          position: "absolute",
                          top: "50%",
                          transform: "translateY(-50%)",
                          left: 8,
                          width: 36,
                          height: 36,
                          border: 0,
                          borderRadius: 999,
                          background: "rgba(0,0,0,.55)",
                          color: "#fff",
                          fontSize: 20,
                          lineHeight: "36px",
                          cursor: "pointer",
                          zIndex: 5,
                        }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label="다음 사진"
                        onClick={nextCard}
                        style={{
                          position: "absolute",
                          top: "50%",
                          transform: "translateY(-50%)",
                          right: 8,
                          width: 36,
                          height: 36,
                          border: 0,
                          borderRadius: 999,
                          background: "rgba(0,0,0,.55)",
                          color: "#fff",
                          fontSize: 20,
                          lineHeight: "36px",
                          cursor: "pointer",
                          zIndex: 5,
                        }}
                      >
                        ›
                      </button>
                      <div
                        style={{
                          position: "absolute",
                          right: 10,
                          top: 10,
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "rgba(0,0,0,.7)",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: ".02em",
                          zIndex: 5,
                        }}
                      >
                        {idx + 1} / {total}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ color: "#fff", fontSize: 14, opacity: 0.9 }}>
                  사진이 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 우측: 텍스트 상세 */}
          <div className="detail-info">
            {loading && <div className="di-title">불러오는 중…</div>}
            {err && !loading && <div className="di-title">오류: {err}</div>}
            {!loading && !err && (
              <>
                <h3 className="di-title">{data?.buildingName ?? "양도"}</h3>
                <div className="di-hr" />
                <div className="di-meta">
                  {`${data?.address ?? ""} / ${
                    data?.price != null ? data.price.toLocaleString() + "원" : ""
                  } / ${
                    data?.startDate || data?.endDate
                      ? `${data?.startDate ? mmdd(data.startDate) : ""}~${
                          data?.endDate ? mmdd(data.endDate) : ""
                        }`
                      : "바로입주"
                  }`}
                </div>

                <div className="di-body">
                  <p className="di-desc">
                    {data?.description || "설명이 없습니다."}
                    {data?.address ? (
                      <>
                        <br />
                        주소: {data.address}
                      </>
                    ) : null}
                  </p>

                  <div className="di-actions">
                    <button
                      type="button"
                      className="chip chip--ghost"
                      onClick={toEdit}
                      disabled={loading || !!err}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="chip chip--ghost"
                      onClick={onDelete}
                      disabled={loading || !!err}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 지도 */}
        <section style={{ padding: "0 56px", marginTop: 28 }}>
          {data?.address ? (
            <NaverMap address={data.address} />
          ) : (
            <div
              style={{
                width: "100%",
                height: 530,
                display: "grid",
                placeItems: "center",
                borderRadius: 16,
                border: "1px solid #e5e5e5",
              }}
            >
              주소 정보가 없어 지도를 표시할 수 없습니다.
            </div>
          )}
        </section>

        <div className="footer-text">
          FIT ROOM
          <br />
          <span className="footer-sub">_Finding a house that suits me</span>
        </div>
      </div>

      {/* ===== 라이트박스(모달) ===== */}
      {viewerOpen && total > 0 && (
        <div
          aria-modal="true"
          role="dialog"
          aria-label="사진 보기"
          onClick={closeViewer} // 바깥 클릭 닫기
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          {/* 컨텐츠 박스 */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(90vw, 960px)",
              height: "min(80vh, 720px)",
              background: "#000",
              borderRadius: 16,
              boxShadow: "0 10px 40px rgba(0,0,0,.35)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={buildImgUrl(photos[viewerIdx], house)}
              alt={`양도 이미지 확대 ${viewerIdx + 1} / ${total}`}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />

            {/* 좌/우 네비 */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  aria-label="이전 사진"
                  onClick={prevViewer}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 42,
                    height: 42,
                    border: 0,
                    borderRadius: 999,
                    background: "rgba(255,255,255,.2)",
                    color: "#fff",
                    fontSize: 24,
                    lineHeight: "42px",
                    cursor: "pointer",
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="다음 사진"
                  onClick={nextViewer}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 42,
                    height: 42,
                    border: 0,
                    borderRadius: 999,
                    background: "rgba(255,255,255,.2)",
                    color: "#fff",
                    fontSize: 24,
                    lineHeight: "42px",
                    cursor: "pointer",
                  }}
                >
                  ›
                </button>
              </>
            )}

            {/* 카운트 */}
            <div
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(0,0,0,.65)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".02em",
              }}
            >
              {viewerIdx + 1} / {total}
            </div>

            {/* 닫기 버튼 */}
            <button
              type="button"
              aria-label="닫기"
              onClick={closeViewer}
              style={{
                position: "absolute",
                left: 12,
                top: 12,
                width: 36,
                height: 36,
                border: 0,
                borderRadius: 999,
                background: "rgba(255,255,255,.2)",
                color: "#fff",
                fontSize: 18,
                lineHeight: "36px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailTransfer;
