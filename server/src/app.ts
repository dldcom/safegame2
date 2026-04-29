// Express 앱 팩토리.
// - /assets 정적 서빙: Maker 가 저장한 파일을 Vite dev 서버가 프록시로 받아옴
// - /api/admin/*: Maker UI 가 호출하는 자산 CRUD API

import express, { Application } from 'express';
import cors from 'cors';
import path from 'node:path';

import adminRouter from './routes/admin';

export const createApp = (): Application => {
  const app = express();

  // CORS: dev 모드에서 Vite(5173) 가 프록시 없이 직접 호출하는 경우 대비.
  // 보통은 Vite 가 /api 와 /assets 를 자체 프록시하므로 same-origin 으로 들어옴.
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // assets/ 폴더 정적 서빙 — Maker 가 저장한 파일을 Phaser/클라가 직접 로드
  app.use(
    '/assets',
    express.static(path.join(__dirname, '../../assets'))
  );

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'safegame2-server' });
  });

  app.use('/api/admin', adminRouter);

  return app;
};
