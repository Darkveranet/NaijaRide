/* NaijaRide service worker — basePath aware (GitHub Pages /<repo>/ or root). */
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');
const CACHE = 'naijaride-v1';
const SHELL = [`${BASE}/`, `${BASE}/offline.html`, `${BASE}/manifest.webmanifest`];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c)=>c.addAll(SHELL)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks)=>Promise.all(ks.filter((k)=>k!==CACHE).map((k)=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res)=>{const c=res.clone();caches.open(CACHE).then((x)=>x.put(req,c));return res;})
      .catch(()=>caches.match(req).then((r)=>r||caches.match(`${BASE}/offline.html`)))); return;
  }
  e.respondWith(caches.match(req).then((cached)=>cached||fetch(req).then((res)=>{
    if(res.ok&&(url.pathname.includes('/_next/')||url.pathname.includes('/icon'))){const c=res.clone();caches.open(CACHE).then((x)=>x.put(req,c));}
    return res;}).catch(()=>cached)));
});
