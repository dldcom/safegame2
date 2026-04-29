// 라우팅 — 1인 플레이라 인증/세션/팀 가드 없음.
// /admin/* 라우트는 개발 모드에서만 마운트 (배포된 빌드에선 접근 불가).

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import HomePage from './views/HomePage';
import GamePage from './views/GamePage';

const isDev = import.meta.env.DEV;

// Maker UI 는 개발 시에만 lazy 로드 (배포 빌드에 들어가도 라우트가 없어 도달 불가)
const CharacterMaker = isDev ? lazy(() => import('./views/admin/CharacterMaker')) : null;
const ItemMaker = isDev ? lazy(() => import('./views/admin/ItemMaker')) : null;
const MapMaker = isDev ? lazy(() => import('./views/admin/MapMaker')) : null;

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game" element={<GamePage />} />

      {isDev && CharacterMaker && (
        <Route
          path="/admin/character-maker"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <CharacterMaker />
            </Suspense>
          }
        />
      )}
      {isDev && ItemMaker && (
        <Route
          path="/admin/item-maker"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <ItemMaker />
            </Suspense>
          }
        />
      )}
      {isDev && MapMaker && (
        <Route
          path="/admin/map-maker"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <MapMaker />
            </Suspense>
          }
        />
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
