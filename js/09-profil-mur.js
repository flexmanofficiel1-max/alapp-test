function cropPhoto(file, ratio, outW, round){
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); alert("Image illisible."); res(null); };
    img.onload = () => {
      const W = Math.min(window.innerWidth - 40, 380), H = Math.round(W / ratio);
      const base = Math.max(W / img.width, H / img.height);
      let z = 1, ox = 0, oy = 0;
      const d = document.createElement("div"); d.className = "crp";
      d.innerHTML = '<div class="crc"><b>Ajuste ta photo</b><span>Glisse pour déplacer, curseur pour zoomer</span><div class="crf" style="width:' + W + 'px;height:' + H + 'px' + (round ? ';border-radius:50%' : '') + '"><canvas width="' + W + '" height="' + H + '"></canvas></div><input type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom"><div class="crb"><button class="g" type="button" id="crx">Annuler</button><button type="button" id="cro">Valider</button></div></div>';
      document.body.appendChild(d);
      const cv = d.querySelector("canvas"), cx = cv.getContext("2d"), rg = d.querySelector("input");
      const lim = () => { const s = base * z, mx = Math.max(0, (img.width * s - W) / 2), my = Math.max(0, (img.height * s - H) / 2); ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy)); };
      const draw = (c2, k) => { const s = base * z, w = img.width * s, h = img.height * s; c2.drawImage(img, ((W - w) / 2 + ox) * k, ((H - h) / 2 + oy) * k, w * k, h * k); };
      const paint = () => { lim(); cx.clearRect(0, 0, W, H); draw(cx, 1); };
      paint();
      rg.oninput = () => { z = +rg.value; paint(); };
      let p = null; cv.style.touchAction = "none";
      cv.onpointerdown = e => { p = {x:e.clientX, y:e.clientY}; cv.setPointerCapture(e.pointerId); };
      cv.onpointermove = e => { if(!p) return; ox += e.clientX - p.x; oy += e.clientY - p.y; p = {x:e.clientX, y:e.clientY}; paint(); };
      cv.onpointerup = cv.onpointercancel = () => { p = null; };
      const end = r => { URL.revokeObjectURL(url); d.remove(); res(r); };
      d.querySelector("#crx").onclick = () => end(null);
      d.querySelector("#cro").onclick = () => { const k = outW / W, oc = document.createElement("canvas"); oc.width = outW; oc.height = Math.round(H * k); const c2 = oc.getContext("2d"); c2.fillStyle = "#fff"; c2.fillRect(0, 0, oc.width, oc.height); draw(c2, k); oc.toBlob(b => end(b ? new File([b], "photo.jpg", {type:"image/jpeg"}) : null), "image/jpeg", 0.88); };
    };
    img.src = url;
  });
}
async function pickAvatar(e){
  const f = e.target.files[0]; e.target.value = "";
  if(!f) return;
  if(f.size > 10 * 1024 * 1024){ msg = "Photo trop lourde (10 Mo max)."; render(); return; }
  const c = await cropPhoto(f, 1, 640, true);
  if(c){ pfile = c; msg = ""; }
  render();
}
function pav(uid, nom){
  const i = stories.findIndex(g => g.auteur === uid);
  if(i < 0) return avh(uid, nom, "");
  const seen = uid !== session.id && stories[i].items.every(x => seenSet.has(x.id));
  return '<div class="pav ' + (seen ? "sn" : "un") + '" data-pst="' + i + '" role="button" aria-label="Voir le statut">' + avh(uid, nom, "") + '</div>';
}
const DEFCOV = "linear-gradient(150deg,#13201A,#0F5B3A)";
const covHtml = (url, own) => '<div class="cvr" style="background-image:' + (url ? 'url(' + esc(url) + ')' : DEFCOV) + '">' + (own ? '<label class="cvb" aria-label="Changer la couverture" title="Changer la couverture">' + pico(PIC.cam) + '<input type="file" id="cvf" accept="image/*" hidden></label>' : '') + '</div>';
async function setCover(f){
  if(!f) return;
  if(f.size > 10 * 1024 * 1024){ alert("Image trop lourde (10 Mo max)."); return; }
  const cf = await cropPhoto(f, 2, 1200, false); if(!cf) return; f = cf;
  try{
    const up = await withAuth(t => upMedia(t, f, "avatars"));
    await withAuth(t => sb("/rest/v1/profiles?id=eq." + session.id, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({couverture_url:up.url})}, t));
    profile = {...profile, couverture_url:up.url}; store.set("alapp_session", {session, profile}); render();
  }catch(e){ alert(/couverture_url/.test(e.message) ? "La couverture n’est pas encore activée sur ce site." : e.message); }
}
const PIC = {
  ticket:'<path d="M2 9a3 3 0 0 1 0 6v3a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-3a3 3 0 0 1 0-6V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M13 5v2"/><path d="M13 11v2"/><path d="M13 17v2"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  userplus:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  chev:'<path d="M9 18l6-6-6-6"/>',
  heart:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  comment:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  share:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
  repost:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  edit:'<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  cam:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
};
const pico = (p, fill) => '<svg width="22" height="22" viewBox="0 0 24 24" fill="' + (fill ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const ico20 = p => pico(p).replace('width="22" height="22"', 'width="20" height="20"');
const REPOST_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>';
let solo = null, soloBack = null, soloBusy = false;
let clubShared = (location.hash.match(/^#c=([0-9a-f-]{36})(?:&r=[0-9a-z]{8,16})?$/i) || [])[1] || null;
const sharedId = (location.hash.match(/^#p=([0-9a-f-]{36})(?:&r=[0-9a-z]{8,16})?$/i) || [])[1] || null;
{ const rm = location.hash.match(/&r=([0-9a-z]{8,16})$/i); if(rm) store.set("alapp_ref", rm[1]); }
function validerPartage(){ const c = store.get("alapp_ref"); if(!c || !session) return; store.del("alapp_ref"); rpc("partage_valider", {p_code:c}).catch(() => {}); }
function noterActivite(){ if(session) rpc("activite_noter", {p_type:"consultation"}).catch(() => {}); }
async function fdo(fn, after){ try{ await withAuth(fn); }catch(e){ alert(e.message); } await after(); }
async function loadFcoms(){
  if(!fopen) return;
  try{ fcoms = await withAuth(t => sb("/rest/v1/commentaires?statut=eq." + fopen + "&select=*,profiles!commentaires_auteur_fkey(nom,pseudo)&order=created_at.asc&limit=200", {}, t)); }catch(e){ feedMsg = e.message; }
  render();
}
function fcomHtml(x){
  return '<div class="cm">' + fcoms.map(c => '<div class="ci"><b class="un" data-u="' + c.auteur + '">' + esc(who(c)) + badge(c.auteur) + '</b> <span class="pt">' + ago(c.created_at) + (c.modifie ? " · modifié" : "") + '</span><div>' + esc(c.texte) + '</div>' + (c.auteur === session.id ? '<div class="ac"><button class="t" data-fe="' + c.id + '">Modifier</button><button class="t" data-fd="' + c.id + '">Supprimer</button></div>' : '<div class="ac"><button class="t" data-rp="commentaire:' + c.id + '">Signaler</button></div>') + '</div>').join("") + '<div class="row2"><input id="fci" placeholder="Écrire un commentaire…" value="' + esc(fcd) + '"><button class="ib send" data-fcs="' + x.id + '">➤</button></div></div>';
}
// ----- mur du profil : publications et republications en mosaïque
let wall = {uid:null, items:null, tab:"pubs"};
const WCOL = [["#0F5B3A","#2E8B57"],["#E8A400","#FFD66B"],["#7B2D8E","#C084D9"],["#C0392B","#F29B8F"],["#1F6FA8","#7FC3F0"],["#2F3E46","#6B8A96"]];
const wcol = id => { let h = 0; for(const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return WCOL[h % WCOL.length]; };
const wsrc = x => x.original || (x.clubOrig ? {id:x.clubOrig.id, auteur:null, texte:x.clubOrig.texte, media_url:x.clubOrig.media_url, media_type:x.clubOrig.media_type, medias:x.clubOrig.medias, profiles:{nom:x.clubOrig.club_nom}} : null);
const wlikes = x => (x.likes && x.likes[0] && x.likes[0].count) || 0;
const wmed = s => s.medias && s.medias.length ? s.medias : (s.media_url ? [s.media_url] : []);
async function loadWall(uid){
  if(wall.uid !== uid) wall = {uid, items:null, tab:"pubs"};
  try{
    let r;
    try{ r = await withAuth(t => sb("/rest/v1/statuts?auteur=eq." + uid + "&select=id,texte,media_url,media_type,medias,created_at,repost_de,repost_club,likes(count)&order=created_at.desc&limit=60", {}, t)); }
    catch(e){ r = await withAuth(t => sb("/rest/v1/statuts?auteur=eq." + uid + "&select=id,texte,media_url,media_type,medias,created_at,likes(count)&order=created_at.desc&limit=60", {}, t)); }
    await attachOrig(r || []);
    if(wall.uid === uid) wall.items = r || [];
  }catch(e){ if(wall.uid === uid) wall.items = []; }
  if(!editing && wall.uid === uid && ((tab === "profile" && uid === session.id) || (tab === "user" && vu && vu.p && vu.p.id === uid))) render();
}
function wallTile(x, big){
  const rep = !!(x.repost_de || x.repost_club), s = rep ? wsrc(x) : x; if(!s) return "";
  const n = wlikes(x), med = wmed(s); let inner;
  if(med.length === 1 && s.media_type === "video") inner = '<video src="' + esc(med[0]) + '#t=0.1" muted playsinline preload="metadata"></video><span class="wb">▶</span>';
  else if(med.length) inner = '<img loading="lazy" src="' + esc(med[0]) + '" alt="">' + (med.length > 1 ? '<span class="wb">▦ ' + med.length + '</span>' : '');
  else { const c = wcol(s.id); inner = '<div class="wt" style="background:linear-gradient(145deg,' + c[0] + ',' + c[1] + ')"><span>' + esc((s.texte || "").slice(0, big ? 140 : 70)) + '</span></div>'; }
  const on = rep ? ((s.profiles && (s.profiles.nom || s.profiles.pseudo)) || "?") : "";
  return '<button class="wl' + (big ? " big" : "") + '" data-wt="' + x.id + '" aria-label="Ouvrir">' + inner + (rep ? '<span class="wr">' + REPOST_SVG + '</span><span class="wo">' + avh(s.auteur, on, "s") + '</span>' : '') + (n ? '<span class="wn">♥ ' + n + '</span>' : '') + '</button>';
}
function wallHtml(uid){
  if(wall.uid !== uid) loadWall(uid);
  if(wall.uid !== uid || !wall.items) return '<div class="wall"><p class="pt c">Chargement…</p></div>';
  const all = wall.items.filter(x => !(x.repost_de || x.repost_club) || (wsrc(x) && !(wsrc(x).auteur && blocked.has(wsrc(x).auteur))));
  const pubs = all.filter(x => !(x.repost_de || x.repost_club)), reps = all.filter(x => x.repost_de || x.repost_club), list = wall.tab === "reps" ? reps : pubs;
  const top = -1;
  const grid = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  return '<div class="wall"><div class="wseg"><button data-wtab="pubs" class="' + (wall.tab === "pubs" ? "on" : "") + '">' + grid + 'Publications ' + pubs.length + '</button><button data-wtab="reps" class="' + (wall.tab === "reps" ? "on" : "") + '">' + pico(PIC.repost).replace('width="22" height="22"', 'width="18" height="18"') + 'Republications ' + reps.length + '</button></div>' +
    (list.length ? '<div class="wg">' + list.map((x, i) => wallTile(x, i === top)).join("") + '</div>' : '<p class="pt c" style="margin-top:14px">' + (wall.tab === "reps" ? "Rien republié pour l’instant." : "Aucune publication pour l’instant.") + '</p>') + '</div>';
}
function openSolo(id){ noterActivite(); soloBack = tab === "user" ? {t:"user", id:wall.uid} : {t:"profile"}; solo = id; soloBusy = true; tab = "feed"; posts = []; feedMsg = ""; fopen = null; render(); loadPosts(); }
function bindWall(){
  document.querySelectorAll("[data-pst]").forEach(b => b.onclick = () => { sv = {gi:+b.dataset.pst, i:0}; showStory(); });
  document.querySelectorAll("[data-wtab]").forEach(b => b.onclick = () => { wall.tab = b.dataset.wtab; render(); });
  document.querySelectorAll("[data-wt]").forEach(b => b.onclick = () => openSolo(b.dataset.wt));
}
function openWall(id){
  const x = (wall.items || []).find(y => y.id === id); if(!x) return;
  const rep = !!x.repost_de, s = rep ? x.original : x; if(!s) return;
  const med = wmed(s), n = wlikes(x), on = rep ? ((s.profiles && (s.profiles.nom || s.profiles.pseudo)) || "Un étudiant") : "";
  const media = med.length === 1 && s.media_type === "video" ? '<video src="' + esc(med[0]) + '" controls playsinline></video>' : med.map(u => '<img src="' + esc(u) + '" alt="">').join("");
  const d = document.createElement("div"); d.className = "wv";
  d.innerHTML = '<div class="wvc"><button class="wx" aria-label="Fermer">✕</button>' + (rep ? '<div class="pt" style="margin-bottom:8px">' + REPOST_SVG + 'Republié depuis <b class="un" data-wu="' + s.auteur + '">' + esc(on) + '</b></div>' : '') + media + (s.texte ? '<p>' + esc(s.texte) + '</p>' : '') + '<div class="pt">' + ago(x.created_at) + (n ? " · ♥ " + n : "") + '</div></div>';
  document.body.appendChild(d);
  d.onclick = e => { if(e.target === d || e.target.closest(".wx")) d.remove(); };
  const u = d.querySelector("[data-wu]"); if(u) u.onclick = () => { d.remove(); openUser(u.dataset.wu); };
}
async function loadMyStats(){
  const g = path => withAuth(t => sb(path, {}, t)).catch(() => null);
  const [a, b, pb, cer] = await Promise.all([
    g("/rest/v1/abonnements?suivi=eq." + session.id + "&select=suiveur"),
    g("/rest/v1/abonnements?suiveur=eq." + session.id + "&select=suivi"),
    g("/rest/v1/statuts?auteur=eq." + session.id + "&select=id"),
    g("/rest/v1/certifications?utilisateur=eq." + session.id + "&select=*")
  ]);
  mystats = {ab:a ? a.length : 0, sv:b ? b.length : 0, pubs:pb ? pb.length : 0, cert:cer && cer[0] ? cer[0] : null};
  if(tab === "profile" || tab === "settings") render();
}
async function loadUser(id){
  try{
    const [p, ab, sv] = await Promise.all([
      withAuth(t => sb("/rest/v1/profiles?id=eq." + id + "&select=*", {}, t)),
      withAuth(t => sb("/rest/v1/abonnements?suivi=eq." + id + "&select=suiveur", {}, t)).catch(() => []),
      withAuth(t => sb("/rest/v1/abonnements?suiveur=eq." + id + "&select=suivi", {}, t)).catch(() => [])
    ]);
    vu = {p:p[0] || {id, nom:"Étudiant"}, ab:ab.length, sv:sv.length, suit:ab.some(r => r.suiveur === session.id)};
  }catch(e){ vu = {err:e.message}; }
  if(tab === "user") render();
}
function openUser(id){
  if(id === session.id) return go("profile");
  noterActivite();
  vback = tab === "user" ? vback : tab; tab = "user"; vu = {loading:true}; render(); loadUser(id); loadStories();
}
function renderUser(){
  const back = '<div class="nav"><button class="t" id="ub">← Retour</button></div>';
  if(!vu || vu.loading) app.innerHTML = back + '<p class="pt c">Chargement…</p>';
  else if(vu.err) app.innerHTML = back + '<div class="msg">' + esc(vu.err) + '</div>';
  else{
    const p = vu.p, bl = blocked.has(p.id), priv = p.profil_abonnes && !vu.suit;
    const info = [p.niveau, p.afficher_filiere === false ? "" : p.filiere, p.universite].filter(Boolean).join(" · ");
    app.innerHTML = '<div class="nav" style="position:relative;z-index:2;margin:0;height:0"><button class="t cvback" id="ub">← Retour</button></div>' + covHtml(priv ? "" : p.couverture_url, false) + '<div class="pcard"><div class="pc1">' + pav(p.id, p.nom) + '<div class="pc2"><b>' + esc(p.nom || "Étudiant") + badge(p.id) + '</b><span>@' + esc(p.pseudo || "") + (priv ? "" : " · " + esc(info)) + '</span></div></div>' +
      (priv ? '<p class="pt c" style="margin:14px 0 4px">🔒 Ce profil est visible seulement par ses abonnés.</p>' : '<div class="pcs"><div><b>' + nf(vu.ab) + '</b>Abonné' + (vu.ab > 1 ? "s" : "") + '</div><div><b>' + nf(vu.sv) + '</b>Abonnement' + (vu.sv > 1 ? "s" : "") + '</div></div><p class="pbio">' + esc(p.bio || "Pas encore de bio.") + '</p>') +
      (bl ? '<p class="pt c">Tu as bloqué cet étudiant.</p>' : '<div class="pbt"><button id="uf">' + (vu.suit ? "Se désabonner" : "S’abonner") + '</button><button class="pib" id="um" aria-label="Écrire un message" title="Écrire un message">' + pico(PIC.comment) + '</button></div>') +
      '<small style="display:block;margin-top:10px;text-align:center"><span class="lnk" id="ubl">' + (bl ? "Débloquer" : "Bloquer") + '</span> · <span class="lnk dng" data-rp="profil:' + p.id + '">Signaler</span></small></div>' + (!priv && !bl ? wallHtml(p.id) : '');
    bindWall();
    if(!bl){
      $("#uf").onclick = async () => {
        try{ await withAuth(t => vu.suit ? sb("/rest/v1/abonnements?suivi=eq." + p.id + "&suiveur=eq." + session.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t) : sb("/rest/v1/abonnements", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({suivi:p.id})}, t)); }
        catch(e){ alert(e.message); }
        loadUser(p.id);
      };
      $("#um").onclick = () => { tab = "msg"; gcreate = false; openChat({id:p.id, nom:p.nom, pseudo:p.pseudo}); };
    }
    $("#ubl").onclick = async () => {
      if(!bl && !confirm("Bloquer cet étudiant ? Il ne pourra plus t’écrire ni te suivre, et vous ne verrez plus vos contenus.")) return;
      try{ await withAuth(t => bl ? sb("/rest/v1/blocages?bloque=eq." + p.id + "&bloqueur=eq." + session.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t) : sb("/rest/v1/rpc/bloquer", {method:"POST", body:JSON.stringify({p_cible:p.id})}, t)); }
      catch(e){ alert(e.message); }
      await loadBadges(); loadUser(p.id);
    };
  }
  $("#ub").onclick = () => go(vback);
}

const cert = {}; let niveaux = [];
const DEFN = [{niveau:1, nom:"Certifié", couleur:"#0F5B3A", abonnes:1000}, {niveau:2, nom:"Gold", couleur:"#E8A400", abonnes:1000000}];
const nf = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + " M" : n >= 1000 ? (n / 1e3).toFixed(1).replace(".", ",").replace(",0", "") + " k" : String(n);
const IC = {h:'<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>', c:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5M15 15c3 0 6 1.5 6 4.5"/>', p:'<path d="M12 5v14M5 12h14"/>', m:'<path d="M4 5h16v11H9l-5 4z"/>', u:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', s:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', l:'<path d="M15 6l-6 6 6 6"/>', b:'<path d="M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 004 0"/>', a:'<path d="M5 12h14M13 6l6 6-6 6"/>'};
const ic = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>';
const DIAMANT = new Set();
const DIAM_SVG = '<svg class="bd" viewBox="0 0 24 24" role="img" aria-label="Diamant"><polygon points="6,3 18,3 23,9 12,22 1,9" fill="#bfeeff"/><polygon points="6,3 12,3 9,9 1,9" fill="#e9fbff"/><polygon points="12,3 18,3 23,9 15,9" fill="#7fd6f5"/><polygon points="9,9 15,9 12,3" fill="#d4f4ff"/><polygon points="1,9 9,9 12,22" fill="#38a9dc"/><polygon points="15,9 23,9 12,22" fill="#1d83b6"/><polygon points="9,9 15,9 12,22" fill="#e11d2e"/><polygon points="10.6,9 13.4,9 12,13" fill="#ff6b78"/><polygon points="6,3 18,3 23,9 12,22 1,9" fill="none" stroke="#0e5f86" stroke-width="1" stroke-linejoin="round"/></svg>';
function badge(uid){
  if(DIAMANT.has(uid)) return DIAM_SVG;
  const c = cert[uid]; if(!c) return "";
  const n = (niveaux.length ? niveaux : DEFN).find(x => x.niveau === c.niveau); if(!n) return "";
  return '<svg class="bd" viewBox="0 0 24 24" role="img" aria-label="' + esc(n.nom) + '"><circle cx="12" cy="12" r="11" fill="' + esc(n.couleur) + '"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
let dist = null;
async function loadDist(){
  try{ dist = await rpc("distinctions"); }catch(e){ dist = {err:1}; }
  if((tab === "settings" || tab === "points") && !editing) render();
}
const lvlBadge = (col, nom) => '<svg class="bd" viewBox="0 0 24 24" role="img" aria-label="' + esc(nom) + '"><circle cx="12" cy="12" r="11" fill="' + esc(col) + '"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function distHtml(compact){
  const top = DIAMANT.has(session.id) ? '<div class="card" style="padding:14px"><div style="display:flex;align-items:center;margin-bottom:8px"><b style="font-size:14px">Certification Diamant</b>' + DIAM_SVG + '</div><span class="cs">Distinction unique, réservée au fondateur d’ALapp.</span></div>' : '';
  if(!dist) return top + '<div class="card"><p class="pt c" style="margin:0">Chargement de tes distinctions…</p></div>';
  if(dist.err) return top + '<div class="card"><p class="pt c" style="margin:0">Les certifications par points ne sont pas encore activées sur ce site.</p></div>';
  if(dist.suspendu) return top + '<div class="card"><b>⛔ Certification suspendue</b><p class="s" style="margin:6px 0 0">Contacte l’équipe ALapp.</p></div>';
  const a = dist.actuel, nx = dist.suivant, L = dist.niveaux || [], pts = dist.points_annuels || 0, base = a ? a.points_min : 0;
  const pc = nx ? Math.max(2, Math.min(100, Math.round((pts - base) / (nx.points_min - base) * 100))) : 100;
  const fd = d => new Date(d).toLocaleDateString("fr-FR", {day:"numeric", month:"short", year:"numeric"});
  const lad = '<div class="lad">' + L.map(l => '<span class="lv' + (a && l.niveau <= a.niveau ? " on" : "") + '" style="--c:' + esc(l.couleur) + '"><b>' + esc(l.nom) + '</b><small>' + nf(l.points_min) + '+</small></span>').join("") + '</div>';
  const hist = !compact && (dist.historique || []).length ? '<h4 class="sec" style="margin:14px 0 6px">Mes certifications passées</h4>' + dist.historique.map(h => '<div class="hrow"><div><b>' + esc(h.nom) + '</b><small>Année ' + esc(h.periode) + '</small></div><b class="pos">' + nf(h.points) + ' pts</b></div>').join("") : '';
  return top + '<div class="card dst"><div class="dsth"><div><small class="pt">Ta certification</small><b class="dsn" style="color:' + (a ? esc(a.couleur) : "var(--mu)") + '">' + (a ? esc(a.nom).toUpperCase() : "Pas encore certifié") + '</b></div>' + (a ? lvlBadge(a.couleur, a.nom) : "") + '</div>' +
    '<div class="dsp"><b>' + nf(pts) + '</b> points en ' + esc(dist.periode.nom) + '<small class="pt"> · du ' + fd(dist.periode.debut) + ' au ' + fd(dist.periode.fin) + '</small></div>' +
    '<div class="bar" style="margin:8px 0"><i style="width:' + pc + '%;background:' + (a ? esc(a.couleur) : "var(--g)") + '"></i></div>' +
    '<span class="cs">' + (nx ? 'Prochain niveau : <b>' + esc(nx.nom).toUpperCase() + '</b> · encore ' + nf(nx.restant) + ' points' : 'Niveau maximum atteint 🎉') + '</span>' + lad +
    (compact ? '<button class="g" id="gopts" style="margin-top:10px">Voir mes points et l’historique</button>' : '') + hist + '</div>';
}
function certCard(){ return distHtml(true); }
async function loadBadges(){
  if(!session) return;
  const g = path => withAuth(t => sb(path, {}, t)).catch(() => null);
  const [c, n, ph, bl, nu, dm] = await Promise.all([
    g("/rest/v1/certifications?select=utilisateur,niveau&statut=eq.certifie&niveau=gt.0"),
    niveaux.length ? Promise.resolve(null) : g("/rest/v1/niveaux?select=*&order=niveau.asc"),
    g("/rest/v1/profiles?select=id,photo_url&photo_url=not.is.null&limit=1000"),
    g("/rest/v1/blocages?bloqueur=eq." + session.id + "&select=bloque"),
    g("/rest/v1/notifications?destinataire=eq." + session.id + "&lu=eq.false&select=id"),
    g("/rest/v1/diamant?select=utilisateur")
  ]);
  let ch = false;
  if(n && n.length){ niveaux = n; ch = true; }
  if(c){
    const m = {}; c.forEach(x => { m[x.utilisateur] = {niveau:x.niveau}; });
    if(JSON.stringify(m) !== JSON.stringify(cert)){ Object.keys(cert).forEach(k => delete cert[k]); Object.assign(cert, m); ch = true; }
  }
  if(ph){ const m = {}; ph.forEach(x => { m[x.id] = x.photo_url; }); if(JSON.stringify(m) !== JSON.stringify(photos)){ photos = m; ch = true; } }
  if(bl){ const b = new Set(bl.map(x => x.bloque)); if([...b].sort().join() !== [...blocked].sort().join()){ blocked = b; ch = true; } }
  if(dm){ const d = dm.map(x => x.utilisateur); if(d.sort().join() !== [...DIAMANT].sort().join()){ DIAMANT.clear(); d.forEach(x => DIAMANT.add(x)); ch = true; } }
  if(nu && nu.length !== nUnread){ nUnread = nu.length; ch = true; }
  if(ch && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) && !$("#svw")) render();
}

let sback = "feed", sq = "", sfil = {uni:"", fil:"", niv:""}, sres2 = [], ssuit = new Set(), stm = null;
function renderPost(){
  const err = feedMsg ? '<div class="msg">' + esc(feedMsg) + '</div>' : '';
  app.innerHTML = '<div class="nav"><button class="t" id="px">← Annuler</button><b>Nouvelle publication</b></div><div class="card"><textarea id="tx" placeholder="Quoi de neuf sur le campus ?" maxlength="1000">' + esc(draft) + '</textarea>' + (pfiles.length ? '<p class="pt fn">📎 ' + pfiles.length + ' fichier' + (pfiles.length > 1 ? 's' : '') + ' sélectionné' + (pfiles.length > 1 ? 's' : '') + '</p>' : '') + '<label class="fl">📷 Ajouter des photos (4 max) ou une vidéo<input type="file" id="fi" accept="image/*,video/*" multiple hidden></label><button id="pb"' + (loading ? " disabled" : "") + '>' + (loading ? "Publication…" : "Publier") + '</button>' + err + '</div>';
  $("#px").onclick = () => go("feed");
  $("#tx").oninput = e => { draft = e.target.value; };
  $("#fi").onchange = e => { let l = Array.from(e.target.files || []); const v = l.find(x => (x.type || "").startsWith("video")); if(v) l = [v]; l = l.slice(0, 4); if(l.some(x => x.size > 25 * 1024 * 1024)){ feedMsg = "Fichier trop lourd (25 Mo max)."; pfiles = []; file = null; } else { pfiles = l; file = l[0] || null; feedMsg = ""; } render(); };
  $("#pb").onclick = publish;
}
async function loadSuit(){
  try{ const r = await withAuth(t => sb("/rest/v1/abonnements?suiveur=eq." + session.id + "&select=suivi", {}, t)); ssuit = new Set(r.map(x => x.suivi)); }catch(e){}
  drawSearch();
}
async function doSearch(){
  const q = clean(sq);
  if(q.length < 2 && !clean(sfil.uni) && !clean(sfil.fil) && !sfil.niv){ sres2 = []; return drawSearch(); }
  try{ sres2 = ((await rp2("chercher_profils", {p_q:q.length >= 2 ? q : "", p_uni:clean(sfil.uni), p_fil:clean(sfil.fil), p_niv:sfil.niv || ""})) || []).filter(u => !blocked.has(u.id)); }catch(e){ sres2 = []; }
  drawSearch();
}
function drawSearch(){
  const el = $("#srr"); if(!el) return;
  el.innerHTML = sres2.length ? sres2.map(u => '<div class="rw">' + avh(u.id, u.nom || u.pseudo, "s", ' data-u="' + u.id + '"') + '<div class="m" data-u="' + u.id + '"><b>' + esc(u.nom || "Étudiant") + badge(u.id) + '</b><small>' + esc([u.niveau, u.afficher_filiere === false ? "" : u.filiere, u.universite].filter(Boolean).join(" · ")) + '</small></div><button class="' + (ssuit.has(u.id) ? "g" : "") + '" data-f="' + u.id + '">' + (ssuit.has(u.id) ? "Suivi" : "Suivre") + '</button></div>').join("") : '<p class="pt c">' + (clean(sq).length >= 2 || clean(sfil.uni) || clean(sfil.fil) || sfil.niv ? "Aucun résultat." : "Cherche un nom, un prénom, ou filtre par établissement, filière et niveau.") + '</p>';
  el.querySelectorAll("[data-u]").forEach(b => b.onclick = () => openUser(b.dataset.u));
  el.querySelectorAll("[data-f]").forEach(b => b.onclick = async () => {
    const id = b.dataset.f, on = ssuit.has(id);
    try{ await withAuth(t => on ? sb("/rest/v1/abonnements?suivi=eq." + id + "&suiveur=eq." + session.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t) : sb("/rest/v1/abonnements", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({suivi:id})}, t)); if(on) ssuit.delete(id); else ssuit.add(id); }
    catch(e){ alert(e.message); }
    drawSearch();
  });
}
function renderSearch(){
  app.innerHTML = '<div class="nav"><button class="t" id="sb">← Retour</button><b>Recherche</b></div><div class="card"><input id="sqi" placeholder="Nom ou prénom" value="' + esc(sq) + '"><label>Établissement</label><input id="sfu" value="' + esc(sfil.uni) + '"><label>Filière</label><input id="sff" value="' + esc(sfil.fil) + '"><label>Niveau</label><select id="sfn"><option value="">Tous</option>' + NIVEAUX.map(n => '<option' + (n === sfil.niv ? " selected" : "") + '>' + n + '</option>').join("") + '</select></div><div id="srr"></div>';
  const go2 = () => { clearTimeout(stm); stm = setTimeout(doSearch, 300); };
  $("#sb").onclick = () => go(sback);
  $("#sqi").oninput = e => { sq = e.target.value; go2(); };
  $("#sfu").oninput = e => { sfil.uni = e.target.value; go2(); };
  $("#sff").oninput = e => { sfil.fil = e.target.value; go2(); };
  $("#sfn").onchange = e => { sfil.niv = e.target.value; doSearch(); };
  drawSearch();
}

let photos = {}, blocked = new Set(), notifs = [], nUnread = 0, stories = [], seenSet = new Set(), sv = null, svt = null, stT = "", stFile = null, stBusy = false, psetup = false, pfile = null, repl = [], rfil = "nouveau", setl = {bl:[], sup:false};
const avh = (uid, nom, cls, attr) => { const u = photos[uid]; return '<div class="av' + (cls ? " " + cls : "") + '"' + (attr || "") + (u ? ' style="background-image:url(' + esc(u) + ')"' : '') + '>' + (u ? "" : esc((nom || "?").trim().charAt(0).toUpperCase())) + '</div>'; };
function pphHtml(){ const u = pfile ? URL.createObjectURL(pfile) : photos[session.id]; return '<label class="gph"><span class="av l" style="width:90px;height:90px;margin:0 auto;display:grid;place-items:center' + (u ? ';background-image:url(' + esc(u) + ')' : '') + '">' + (u ? '' : '📷') + '</span><input type="file" id="pph" accept="image/*" hidden></label><div class="pt" style="margin:6px 0 4px">Changer la photo</div>'; }
function renderPhotoStep(){
  const u = pfile ? URL.createObjectURL(pfile) : "";
  app.innerHTML = '<div class="card c" style="margin-top:20px"><h2>Ajoute ta photo</h2><p class="s">Étape 2 sur 2 · facultatif</p><label class="gph"><span class="av l" style="width:110px;height:110px;margin:10px auto;display:grid;place-items:center;font-size:34px' + (u ? ';background-image:url(' + esc(u) + ')' : '') + '">' + (u ? "" : "📷") + '</span><input type="file" id="pph" accept="image/*" hidden></label><button id="psv"' + (pfile ? "" : " disabled") + '>Enregistrer ma photo</button><button class="g" id="psk">Plus tard</button>' + (msg ? '<div class="msg">' + esc(msg) + '</div>' : '') + '</div>';
  $("#pph").onchange = pickAvatar;
  $("#psk").onclick = () => { psetup = false; pfile = null; msg = ""; render(); };
  $("#psv").onclick = async () => {
    try{ const up = await withAuth(t => upMedia(t, pfile, "avatars")); const np = {...profile, photo_url:up.url}; await withAuth(t => api.saveProfile({...session, token:t}, np)); profile = np; photos[session.id] = up.url; store.set("alapp_session", {session, profile}); psetup = false; pfile = null; msg = ""; }
    catch(e){ msg = e.message; }
    render();
  };
}
