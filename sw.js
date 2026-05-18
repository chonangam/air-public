/**
 * 대기측정망 모니터링 - Service Worker
 *
 * 역할:
 * - PWA 설치 가능 요건 충족
 * - HTML/CSS/JS 등 UI 자산 캐싱 (오프라인에서도 화면은 뜨도록)
 * - 단, API 응답(에어코리아)은 캐싱하지 않음 - 실시간 데이터가 핵심
 */

const CACHE = 'airdash-v1';
const SHELL = ['./', './index.html', './airdash.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  // UI 셸 캐싱 시도 (실패해도 무시)
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // 옛 버전 캐시 정리
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API 호출은 항상 네트워크 (실시간 데이터)
  if (url.host.includes('data.go.kr') ||
      url.host.includes('corsproxy') ||
      url.host.includes('allorigins')) {
    return;
  }

  // UI 셸: 캐시 우선, 실패 시 네트워크
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      // 동일 출처의 정상 응답만 캐싱
      if (res.ok && url.origin === self.location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('./') || caches.match('./index.html')))
  );
});
