/**
 * 대기측정망 모니터링 - Service Worker (v2)
 *
 * 변경: 네트워크 우선 전략으로 변경
 * - 항상 GitHub Pages에서 최신 파일 받아옴
 * - 네트워크 실패 시에만 캐시 사용 (오프라인 대비)
 * - 이전 v1의 "캐시 우선"으로 인한 업데이트 미반영 문제 해결
 */

const CACHE = 'airdash-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // 이전 버전(v1) 캐시 모두 삭제 - 강제 무효화
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

  // 네트워크 우선, 실패 시에만 캐시 (즉시 업데이트 반영)
  e.respondWith(
    fetch(e.request).then(res => {
      // 성공 응답은 캐시에 업데이트해두기 (오프라인 대비)
      if (res.ok && url.origin === self.location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
      }
      return res;
    }).catch(() =>
      // 네트워크 실패 시 캐시에서 찾기
      caches.match(e.request).then(cached =>
        cached || caches.match('./') || caches.match('./index.html')
      )
    )
  );
});
