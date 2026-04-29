// 미니 Express — 로컬 개발 전용. 배포된 게임에는 등장하지 않음.
// localhost 바인딩 → 같은 PC 에서만 접근 가능 (인증 없이도 안전).

import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3002;
const HOST = '127.0.0.1'; // localhost 만. 같은 네트워크의 다른 기기 접근 차단.

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`[safegame2-server] http://${HOST}:${PORT}`);
  console.log(`[safegame2-server] Maker 저장 API + /assets 정적 서빙 (로컬 전용)`);
});
