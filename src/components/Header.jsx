import React from "react";
import { useNavigate } from "react-router-dom"; // ★ 추가
import house from "../image/house.png";
import "../styles/header.css";

/** 메인/숙박/양도 공통 헤더 (타이틀 + 집 이미지 + 태그 칩) */
export default function Header() {
  const navigate = useNavigate(); // ★ 추가

  return (
    <>
      {/* 헤더 */}
      <div className="header">
        <h1 className="main-title">
          FIT ROOM<br />_Finding<br />a house that suits me
        </h1>
        <img
          src={house}
          alt="house"
          className="house-image"
          style={{ cursor: "pointer" }}            // ★ 추가(시각 피드백)
          role="button"                            // ★ 접근성
          tabIndex={0}                             // ★ 키보드 포커스
          onClick={() => navigate("/")}            // ★ 클릭 시 메인으로
          onKeyDown={(e) => {                      // ★ 엔터/스페이스 대응
            if (e.key === "Enter" || e.key === " ") navigate("/");
          }}
        />
      </div>

      {/* 요약/태그 (메인과 동일) */}
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
    </>
  );
}