// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import MainPage from "./components/mainpage";
import LodgingPage from "./components/LodgingPage";
import SearchPage from "./components/SearchPage";
import TransferPage from "./components/TransferPage";
import UploadPage from "./components/UploadPage";
import DetailLodging from "./components/Detail_Lodging";
import DetailTransfer from "./components/Detail_Transfer";
import EditPage from "./components/EditPage";   // ✅ 추가

function App() {
  return (
    <Router>
      <Routes>
        {/* 메인: 인기 숙박/양도 불러오기 */}
        <Route path="/" element={<MainPage />} />

        {/* 목록 페이지들 */}
        <Route path="/lodging" element={<LodgingPage />} />
        <Route path="/transfer" element={<TransferPage />} />

        {/* 상세 페이지 */}
        <Route path="/lodging/:id" element={<DetailLodging />} />
        <Route path="/transfer/:id" element={<DetailTransfer />} />

        {/* ✅ 수정 페이지 (숙박/양도) */}
        <Route path="/lodging/edit/:id" element={<EditPage />} />
        <Route path="/transfer/edit/:id" element={<EditPage />} />

        {/* 검색/업로드 */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/upload" element={<UploadPage />} />

        {/* 없는 경로는 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;