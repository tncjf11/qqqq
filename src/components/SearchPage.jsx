import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import house from "../image/house.png";
import search from "../image/search.png";
import "../styles/SearchPage.css";

/* ===== 프록시 전제 유틸 =====
   - CRA dev에서 package.json의 "proxy"가 있으므로
     fetch는 반드시 상대경로("/api/...")로 보냅니다.
   - 썸네일도 절대URL이면 그대로, 아니면 상대경로로 보정합니다. */
function toRelative(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u; // 절대 URL은 그대로
  return u.startsWith("/") ? u : `/${u}`;
}

function buildImgUrl(u) {
  const rel = toRelative(u);
  return rel || house; // 값 없으면 기본 이미지
}

const mmdd = (iso) => (iso ? iso.slice(5).replace("-", ".") : "");

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL ?q= 과 동기화
  const urlQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQ);
  const [placeholder, setPlaceholder] = useState(urlQ ? "" : "검색어를 입력하세요");

  useEffect(() => {
    setQuery(urlQ);
    setPlaceholder(urlQ ? "" : "검색어를 입력하세요");
  }, [urlQ]);

  const onChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    if (next.trim()) setSearchParams({ q: next }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const onSubmit = (e) => e.preventDefault(); // 자동 디바운스 fetch로 처리

  // ===== 데이터 로딩 =====
  const [items, setItems] = useState([]); // ListingSearchItem[]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 디바운스 후 서버 호출 (상대경로! 프록시가 172.30.1.77:8081로 전달)
  useEffect(() => {
    const q = (query ?? "").trim();
    setErr("");
    if (!q) {
      setItems([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/listings/search?name=${encodeURIComponent(q)}`);
        if (!resp.ok) {
          const msg = await resp.text().catch(() => "");
          throw new Error(`검색 실패 (${resp.status}) ${msg}`);
        }
        const data = await resp.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message || String(e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // 텍스트 라인 구성
  const line = (it) => {
    const date = it.type === "STAY" ? `${mmdd(it.startDate)}~${mmdd(it.endDate)} / ` : "";
    const price = it.price != null ? `${it.price.toLocaleString()}원` : "";
    return `${it.buildingName ?? ""} / ${date}${price}`;
  };

  // 상세로 이동
  const goDetail = (it) => {
    if (it.type === "STAY") navigate(`/lodging/${it.id}`);
    else navigate(`/transfer/${it.id}`);
  };

  const view = useMemo(() => items, [items]);

  return (
    <div className="screen search-page">
      <div className="container">
        {/* 상단 영역 */}
        <div className="header">
          <div className="branding">
            <p className="branding-text">
              FIT ROOM
              <br />
              _Finding
              <br />
              a house that suits me
            </p>
            <img
              className="house-icon"
              src={house}
              alt="house"
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate("/");
              }}
            />
          </div>

          {/* 우측 상단 컨트롤 */}
          <div className="controls">
            <button className="search-top-btn" onClick={() => navigate("/")}>
              Let’s search!
            </button>
          </div>

          {/* 가운데 검색바 */}
          <form className="search-bar" onSubmit={onSubmit}>
            <img className="sp-search-icon" src={search} alt="" aria-hidden="true" />
            <input
              className="search-input"
              value={query}
              onChange={onChange}
              placeholder={placeholder}
              aria-label="검색어 입력"
              onFocus={() => setPlaceholder("")}
              onBlur={() =>
                setPlaceholder((prev) =>
                  (query ?? "").trim() === "" ? "검색어를 입력하세요" : ""
                )
              }
            />
          </form>
        </div>

        {/* 라벨 */}
        <div className="section-label">
          <div className="label-chip">검색과 일치하는 게시물</div>
        </div>

        {/* 결과 카드 */}
        <div className="results">
          {loading && <div className="result-card">불러오는 중…</div>}
          {err && !loading && <div className="result-card">오류: {err}</div>}
          {!loading && !err && view.length === 0 && (
            <div className="result-card">검색 결과가 없어요.</div>
          )}

          {!loading &&
            !err &&
            view.map((it) => (
              <div
                className="result-card"
                key={`${it.type}-${it.id}`}
                onClick={() => goDetail(it)}
              >
                <div
                  className="result-thumbnail"
                  style={{ backgroundImage: `url(${buildImgUrl(it.thumbnailUrl)})` }}
                />
                <p className="result-text">{line(it)}</p>
              </div>
            ))}
        </div>

        {/* 푸터 */}
        <footer className="footer">
          <p>
            FIT ROOM
            <br />
            <span className="footer-sub">_Finding a house that suits me</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
