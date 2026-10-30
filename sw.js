const V = "alapptest-v1";
const SHELL = ["./", "./index.html"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V && x.indexOf("alapptest-") === 0).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if(r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)).catch(() => {}); return res; }).catch(() => caches.match(r).then(m => m || caches.match("./index.html"))));
});
self.addEventListener("push", e => {
  let d = {}; try{ d = e.data ? e.data.json() : {}; }catch(_){}
  e.waitUntil(self.registration.showNotification(d.title || "ALapp", {body:d.body || "", icon:"icon-192.png", badge:"icon-192.png", tag:d.tag || "alapp", data:{url:d.url || "./"}}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(cl => { for(const c of cl){ if("focus" in c) return c.focus(); } return self.clients.openWindow((e.notification.data && e.notification.data.url) || "./"); }));
});
