let cf = "", evs = [], qs = [], rs = [], ans = [], cls = [], isAdmin = false, cform = null, qopen = null, ted = null, rdraft = "", cmsg = "", cbusy = false, rfile = null;
const pad = n => String(n).padStart(2, "0");
const who = x => (x.profiles && (x.profiles.nom || x.profiles.pseudo)) || "Étudiant";
if(window.visualViewport){
  const upd = () => { document.documentElement.style.setProperty("--vvh", visualViewport.height + "px"); const m = document.getElementById("ml"); if(m && document.body.classList.contains("chatmode")) m.scrollTop = m.scrollHeight; };
  visualViewport.addEventListener("resize", upd); upd();
}
function updateTabs(){
  const el = $("#tabs"), hd = $("#hdr");
  const logged = !!(session && profile);
  document.body.classList.toggle("chatmode", !!(logged && !editing && !psetup && tab === "msg" && peer && !dmnew && !gcreate && !gadd));
  if(hd){
    hd.hidden = !(logged && !editing && !psetup && (tab === "feed" || (tab === "com" && !cform && !qopen && !ted)));
    if(!hd.hidden){ $("#hdr .logo").textContent = tab === "com" ? "Communauté" : "ALapp"; $("#hico").innerHTML = '<button class="ib" id="hs" aria-label="Rechercher">' + ic("s") + '</button><button class="ib" id="hb" aria-label="Notifications">' + ic("b") + (nUnread ? '<i class="dot"></i>' : '') + '</button>'; $("#hs").onclick = () => { sback = tab; tab = "search"; render(); loadSuit(); }; $("#hb").onclick = () => go("notif"); }
  }
  if(!el) return;
  const show = logged && !editing && !psetup && !(tab === "msg" && (peer || gcreate || dmnew)) && !(tab === "com" && (cform || qopen || ted));
  el.hidden = !show; if(!show) return;
  const T = [["feed", "h", "Accueil"], ["com", "c", "Communauté"], ["post", "p", "Publier"], ["msg", "m", "Messages"], ["profile", "u", "Profil"]];
  el.innerHTML = T.map(t => '<button data-k="' + t[0] + '" aria-label="' + t[2] + '" class="' + ((tab === t[0] || (t[0] === "com" && tab === "club") || (t[0] === "feed" && tab === "brain") || (t[0] === "profile" && (tab === "settings" || tab === "reports" || tab === "points"))) ? "on" : "") + (t[0] === "post" ? " plus" : "") + '">' + ic(t[1]) + '</button>').join("");
  el.querySelectorAll("button").forEach(b => b.onclick = () => go(b.dataset.k));
}
function go(k){
  solo = null; editing = false; tab = k; peer = null; gcreate = false; dmnew = false; closeStory(); cform = null; qopen = null; ted = null; loadBadges();
  if(k !== "msg") clearInterval(poll);
  render();
  if(k === "post") feedMsg = "";
  if(k === "feed") loadPosts(); else if(k === "msg") loadConvs(); else if(k === "com") loadCom(); else if(k === "brain") loadBrain(); else if(k === "points") loadPortefeuille(); else if(k === "profile"){ loadMyStats(); loadWall(session.id); loadStories(); loadPoints(); } else if(k === "notif") loadNotifs(); else if(k === "settings") loadSettings(); else if(k === "reports") loadReports();
}
const mm = (u, t) => u ? (t === "video" ? '<video class="mm" src="' + esc(u) + '" controls playsinline></video>' : '<img class="mm" src="' + esc(u) + '" alt="">') : '';
async function upMedia(t, f, folder){
  f = await shrink(f);
  const ext = (f.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const path = folder + "/" + crypto.randomUUID() + "." + ext;
  const r = await fetch(SUPABASE_URL + "/storage/v1/object/medias/" + path, {method:"POST", headers:{apikey:SUPABASE_KEY, Authorization:"Bearer " + t, "Content-Type":f.type || "application/octet-stream"}, body:f});
  if(!r.ok){ let d = null; try{ d = await r.json(); }catch(e){} throw new Error((d && (d.message || d.error)) || "Envoi du média impossible"); }
  return {url:SUPABASE_URL + "/storage/v1/object/public/medias/" + path, type:(f.type || "").startsWith("video") ? "video" : "image"};
}
const mediaPick = f => '<label class="fl">📷 Ajouter ' + (f.k === "cl" ? "une photo" : "une photo ou une vidéo") + '<input type="file" id="cmf" accept="' + (f.k === "cl" ? "image/*" : "image/*,video/*") + '" hidden></label>' + (f.file ? '<p class="pt fn">📎 ' + esc(f.file.name) + '</p>' : '');
const tmsg = t => { const d = new Date(t), n = new Date(); if(d.toDateString() === n.toDateString()) return d.toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"}); if(d.toDateString() === new Date(n - 864e5).toDateString()) return "Hier"; return d.toLocaleDateString("fr-FR", {day:"2-digit", month:"2-digit"}); };
function gphHtml(){ const u = gnew.file ? URL.createObjectURL(gnew.file) : ""; return '<label class="gph"><span class="av l" style="margin:0 auto;display:grid;place-items:center' + (u ? ';background-image:url(' + u + ')' : '') + '">' + (u ? '' : '📷') + '</span><input type="file" id="gph" accept="image/*" hidden></label><div class="pt" style="margin:6px 0 4px">Photo du groupe (facultatif)</div>'; }
const agoL = t => { const x = (Date.now() - new Date(t)) / 1000; if(x < 60) return "À l’instant"; if(x < 3600) return "Il y a " + Math.floor(x / 60) + " min"; if(x < 86400) return "Il y a " + Math.floor(x / 3600) + " h"; if(x < 172800) return "Hier"; return new Date(t).toLocaleDateString("fr-FR"); };
const cname = x => (x.profiles && (x.profiles.nom || x.profiles.pseudo)) || "Étudiant";
async function loadCom(){
  const g = path => withAuth(t => sb(path, {}, t)).catch(() => null);
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const Q = "/rest/v1/questions?select=*,profiles!questions_auteur_fkey(nom,pseudo)";
  const [ev, an, cl, qu, re, ad] = await Promise.all([
    g("/rest/v1/evenements?select=*,evenement_participants(membre)&date_debut=gte." + encodeURIComponent(d.toISOString()) + "&order=date_debut.asc&limit=50"),
    g("/rest/v1/annonces?select=*&order=epingle.desc,created_at.desc&limit=20"),
    g("/rest/v1/clubs_vue?select=*&order=created_at.desc&limit=50"),
    g(Q + ",question_utiles(membre)&order=created_at.desc&limit=50").then(r => r || g(Q + "&order=created_at.desc&limit=50")),
    g("/rest/v1/reponses?select=*,profiles!reponses_auteur_fkey(nom,pseudo)&order=created_at.asc&limit=500"),
    g("/rest/v1/admins?utilisateur=eq." + session.id + "&select=utilisateur")
  ]);
  evs = ev || []; ans = an || []; cls = cl || []; qs = qu || []; rs = re || []; isAdmin = !!(ad && ad.length);
  cmsg = "";
  if(tab === "com") render();
}
async function cdo(fn){ try{ await withAuth(fn); cmsg = ""; }catch(e){ cmsg = e.message; alert(e.message); } await loadCom(); }
async function saveForm(){
  const f = cform;
  if(f.k === "ev" && (!f.t1.trim() || !f.t2)){ cmsg = "Titre et date requis."; return render(); }
  if(f.k === "cl" && !f.t1.trim()){ cmsg = "Donne un nom au club."; return render(); }
  if((f.k === "qu" || f.k === "an") && !f.t1.trim() && !f.file){ cmsg = "Écris un texte ou ajoute un média."; return render(); }
  cbusy = true; cmsg = ""; render();
  const H = {Prefer:"return=minimal"};
  try{
    await withAuth(async t => {
      const up = f.file ? await upMedia(t, f.file, "com") : null;
      const M = up ? {media_url:up.url, media_type:up.type} : {};
      if(f.k === "ev"){ const b = {titre:f.t1.trim(), lieu:(f.t3 || "").trim() || null, date_debut:new Date(f.t2 + "T12:00").toISOString(), gratuit:!f.pay, prix:f.pay ? (parseInt(f.t4, 10) || null) : null, ...M}; await (f.id ? sb("/rest/v1/evenements?id=eq." + f.id, {method:"PATCH", headers:H, body:JSON.stringify(b)}, t) : sb("/rest/v1/evenements", {method:"POST", headers:H, body:JSON.stringify(b)}, t)); }
      else if(f.k === "cl"){
        const P = up ? {photo_url:up.url} : {};
        if(f.id) await sb("/rest/v1/clubs?id=eq." + f.id, {method:"PATCH", headers:H, body:JSON.stringify({nom:f.t1.trim(), description:f.t2.trim() || null, ...P})}, t);
        else{ const r = await sb("/rest/v1/clubs", {method:"POST", headers:{Prefer:"return=representation"}, body:JSON.stringify({nom:f.t1.trim(), description:f.t2.trim() || null, anonyme:!!f.anon, ...P})}, t); await sb("/rest/v1/club_membres", {method:"POST", headers:H, body:JSON.stringify({club:r[0].id})}, t); }
      }
      else if(f.k === "qu") await sb("/rest/v1/questions", {method:"POST", headers:H, body:JSON.stringify({texte:f.t1.trim(), ...M})}, t);
      else if(f.k === "an"){ const b = {texte:f.t1.trim(), epingle:!!f.pin, ...M}; await (f.id ? sb("/rest/v1/annonces?id=eq." + f.id, {method:"PATCH", headers:H, body:JSON.stringify(b)}, t) : sb("/rest/v1/annonces", {method:"POST", headers:H, body:JSON.stringify(b)}, t)); }
    });
    cform = null;
  }catch(e){ cmsg = e.message; }
  cbusy = false; await loadCom(); render();
}
async function saveTed(){
  const n = ted.texte.trim(); if(!n){ cmsg = "Le texte ne peut pas être vide."; return render(); }
  const path = (ted.k === "qu" ? "/rest/v1/questions?id=eq." : "/rest/v1/reponses?id=eq.") + ted.id;
  try{ await withAuth(t => sb(path, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({texte:n, modifie:true})}, t)); ted = null; cmsg = ""; }catch(e){ cmsg = e.message; }
  await loadCom(); render();
}
function topbar(title, right){ return '<div class="top2"><button class="ib" id="cb" aria-label="Retour">' + ic("l") + '</button><b>' + title + '</b>' + (right || "") + '</div>'; }
function evCard(e){
  const d = new Date(e.date_debut), ps = e.evenement_participants || [], on = ps.some(p => p.membre === session.id), mine = e.auteur === session.id, free = e.gratuit !== false;
  const tarif = free ? '<span class="chip ev">Gratuit</span>' : '<span class="chip ev pay">' + (e.prix ? nf(e.prix) + " FCFA" : "Payant") + '</span>';
  const cnt = mine ? '<span class="evn"><b>' + ps.length + '</b> personne' + (ps.length > 1 ? "s participent" : " participe") + '</span>' + (ps.length ? ' · <span class="lnk" data-evl="' + e.id + '">Voir la liste</span>' : '') : ps.length + ' participant' + (ps.length > 1 ? "s" : "");
  return '<div class="card"><div class="evc"><div class="evd"><b>' + d.getDate() + '</b><small>' + d.toLocaleDateString("fr-FR", {month:"short"}).replace(".", "").toUpperCase() + '</small></div><div style="flex:1;min-width:0"><b style="font-size:14px">' + esc(e.titre) + '</b> ' + tarif + '<small style="display:block">' + esc(e.lieu || "") + (e.lieu ? " · " : "") + cnt + (mine ? " · Par toi" : "") + '</small>' + (mine ? '<small style="display:block"><span class="lnk" data-ee="' + e.id + '">Modifier</span> · <span class="lnk dng" data-ed="' + e.id + '">Supprimer</span></small>' : '<small style="display:block"><span class="lnk" data-rp="evenement:' + e.id + '">Signaler</span></small>') + '</div><button class="sm' + (on ? " g" : "") + '" data-ep="' + e.id + '">' + (on ? "Inscrit ✓" : "Je participe") + '</button></div>' + mm(e.media_url, e.media_type) + '</div>';
}
function renderCom(){
  const err = cmsg ? '<div class="msg' + (/^Invitation/.test(cmsg) ? " ok" : "") + '">' + esc(cmsg) + '</div>' : '';
  const D = (sel, fn) => document.querySelectorAll(sel).forEach(b => b.onclick = () => fn(b));
  const click = (id, fn) => { const el = $(id); if(el) el.onclick = fn; };
  const fld = (id, l, v, t) => '<div class="f"><label for="' + id + '">' + l + '</label><input id="' + id + '" type="' + (t || "text") + '" value="' + esc(v) + '" autocomplete="off"></div>';
  if(ted){
    app.innerHTML = topbar("Modifier", '<button class="sm" id="cs">Enregistrer</button>') + '<div class="f"><textarea id="ctx">' + esc(ted.texte) + '</textarea></div><p class="s">Les autres verront la mention « modifié ».</p>' + err;
    click("#cb", () => { ted = null; cmsg = ""; render(); });
    $("#ctx").oninput = e => { ted.texte = e.target.value; };
    click("#cs", saveTed);
    return;
  }
  if(qopen){
    const q = qs.find(x => x.id === qopen); if(!q){ qopen = null; return renderCom(); }
    const as = rs.filter(r => r.question === q.id);
    app.innerHTML = topbar("Question") + '<div class="card"><p style="font-weight:600;margin:0 0 4px">' + esc(q.texte) + (q.modifie ? ' <small>(modifié)</small>' : '') + '</p>' + mm(q.media_url, q.media_type) + '<small>' + as.length + ' réponse(s)</small></div>' +
      (as.length ? as.map(a => '<div class="who2">' + avh(a.auteur, cname(a), "s") + '<div class="card"><b style="font-size:13px">' + esc(cname(a)) + badge(a.auteur) + '</b><p style="margin:0">' + esc(a.texte) + (a.modifie ? ' <small>(modifié)</small>' : '') + '</p>' + mm(a.media_url, a.media_type) + (a.auteur === session.id ? '<small style="display:block;margin-top:4px"><span class="lnk" data-re="' + a.id + '">Modifier</span> · <span class="lnk dng" data-rd="' + a.id + '">Supprimer</span></small>' : '<small style="display:block;margin-top:4px"><span class="lnk" data-rp="reponse:' + a.id + '">Signaler</span></small>') + '</div></div>').join("") : '<div class="empty">Aucune réponse. Sois le premier à répondre.</div>') +
      '<div class="cbar gcm">' + (rfile ? '<div class="pt fn">📎 ' + esc(rfile.name) + '</div>' : '') + '<div class="row"><label class="ib">📎<input type="file" id="rfi" accept="image/*,video/*" hidden></label><input id="rin" placeholder="Écris ta réponse" value="' + esc(rdraft) + '" style="flex:1;border:0;background:transparent;min-height:0;padding:9px 8px"><button class="ib send" id="rsend" aria-label="Envoyer">' + ic("a") + '</button></div></div>' + err;
    click("#cb", () => { qopen = null; cmsg = ""; render(); });
    $("#rin").oninput = e => { rdraft = e.target.value; };
    $("#rfi").onchange = e => { const x = e.target.files[0]; if(x && x.size > 25 * 1024 * 1024){ cmsg = "Fichier trop lourd (25 Mo max)."; rfile = null; } else { rfile = x || null; cmsg = ""; } render(); };
    click("#rsend", () => { const texte = rdraft.trim(), fl = rfile; if(!texte && !fl) return; rdraft = ""; rfile = null; cdo(async t => { const up = fl ? await upMedia(t, fl, "com") : null; await sb("/rest/v1/reponses", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({question:q.id, texte, media_url:up ? up.url : null, media_type:up ? up.type : null})}, t); }); });
    D("[data-re]", b => { const a = rs.find(x => x.id === b.dataset.re); ted = {k:"re", id:a.id, texte:a.texte}; render(); });
    D("[data-rd]", b => { if(confirm("Supprimer cette réponse ? Cette action est définitive.")) cdo(t => sb("/rest/v1/reponses?id=eq." + b.dataset.rd, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t)); });
    return;
  }
  if(cform){
    const f = cform, T = f.id ? "Modifier" : {ev:"Créer un événement", cl:"Créer un club", qu:"Poser une question", an:"Publier une annonce"}[f.k];
    let body;
    if(f.k === "ev") body = fld("ft", "Titre", f.t1) + fld("fd", "Date", f.t2, "date") + fld("fz", "Lieu", f.t3 || "") + '<label>Tarif</label><div class="seg"><button class="t sg' + (f.pay ? "" : " on") + '" id="gv0">Gratuit</button><button class="t sg' + (f.pay ? " on" : "") + '" id="gv1">Payant</button></div>' + (f.pay ? fld("fp", "Prix en FCFA", f.t4 || "", "number") : '<p class="s">Pour un événement gratuit, chaque étudiant qui appuie sur « Je participe » reçoit une invitation dans ses messages, et tu vois le nombre de participants.</p>') + '<p class="s">Ton événement sera visible par tous les étudiants. Il pourra être signalé s’il ne respecte pas les règles.</p>';
    else if(f.k === "cl") body = fld("ft", "Nom du club", f.t1) + fld("fd", "Description", f.t2) + (f.id ? '' : '<label>Type de club</label><div class="seg"><button class="t sg' + (f.anon ? "" : " on") + '" id="gt0">👥 Normal</button><button class="t sg' + (f.anon ? " on" : "") + '" id="gt1">🎭 Anonyme</button></div><p class="pt hint">' + (f.anon ? "Dans un club anonyme, tout le monde est anonyme, toi compris." : "Dans un club normal, les membres apparaissent avec leur nom.") + ' Ce choix est définitif.</p>') + '<p class="s">Tu deviens le créateur du club.</p>';
    else if(f.k === "an") body = '<div class="f"><textarea id="ftx" placeholder="Texte de l’annonce">' + esc(f.t1) + '</textarea></div><label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" id="fpin" style="width:auto"' + (f.pin ? " checked" : "") + '> Mettre en avant (annonce importante)</label><p class="s">Les annonces sont publiées au nom de l’équipe ALapp.</p>';
    else body = '<div class="f"><textarea id="ftx" placeholder="Ta question aux étudiants">' + esc(f.t1) + '</textarea></div><p class="s">Les autres étudiants pourront la trouver dans la Communauté.</p>';
    app.innerHTML = topbar(T, '<button class="sm" id="cs"' + (cbusy ? " disabled" : "") + '>' + (f.id ? "Enregistrer" : "Publier") + '</button>') + body + mediaPick(f) + err;
    click("#cb", () => { cform = null; cmsg = ""; render(); });
    const on = (id, fn) => { const el = $(id); if(el) el.oninput = fn; };
    on("#ft", e => { f.t1 = e.target.value; }); on("#fd", e => { f.t2 = e.target.value; }); on("#fz", e => { f.t3 = e.target.value; }); on("#fp", e => { f.t4 = e.target.value; }); click("#gv0", () => { f.pay = false; render(); }); click("#gv1", () => { f.pay = true; render(); }); on("#ftx", e => { f.t1 = e.target.value; });
    click("#fpin", e => { f.pin = e.target.checked; });
    click("#gt0", () => { f.anon = false; render(); }); click("#gt1", () => { f.anon = true; render(); });
    click("#cs", saveForm);
    const pk = $("#cmf"); if(pk) pk.onchange = e => { const x = e.target.files[0]; if(x && x.size > 25 * 1024 * 1024){ cmsg = "Fichier trop lourd (25 Mo max)."; f.file = null; } else { f.file = x || null; cmsg = ""; } render(); };
    return;
  }
  const sh = k => !cf || cf === k, sec = (t, h) => '<h4 class="sec">' + t + '</h4>' + h;
  const sc = q => (q.question_utiles || []).length * 2 + rs.filter(r => r.question === q.id).length;
  const qsorted = [...qs].sort((a, b) => sc(b) - sc(a) || new Date(b.created_at) - new Date(a.created_at));
  app.innerHTML = '<div class="fch">' + [["", "Tout"], ["ev", "Événements"], ["an", "Annonces"], ["cl", "Clubs"], ["qu", "Questions"]].map(c => '<span class="fc' + (cf === c[0] ? " on" : "") + '" data-cf="' + c[0] + '">' + c[1] + '</span>').join("") + '</div>' +
    (sh("an") && (ans.length || isAdmin) ? sec("Annonces ALapp", ans.map(a => '<div class="card" style="' + (a.epingle ? "background:var(--y);border:0" : "") + '"><small style="' + (a.epingle ? "color:var(--tx)" : "") + '">Équipe ALapp · ' + agoL(a.created_at) + '</small><p style="margin:4px 0 0;font-weight:600">' + esc(a.texte) + '</p>' + mm(a.media_url, a.media_type) + (isAdmin ? '<small style="display:block;margin-top:6px"><span class="lnk" data-ae="' + a.id + '">Modifier</span> · <span class="lnk dng" data-ad="' + a.id + '">Supprimer</span></small>' : '') + '</div>').join("") + (isAdmin ? '<button class="s1b" id="anew">Publier une annonce</button>' : '')) : '') +
    (sh("ev") ? sec("Événements à venir", (evs.length ? evs.map(evCard).join("") : '<div class="empty">Aucun événement à venir.</div>') + '<button class="s1b" id="enew">Créer un événement</button>') : '') +
    (sh("cl") ? sec("Nouveaux clubs", cls.map(c => '<div class="rw"><div class="av s"' + (c.photo_url ? ' style="background-image:url(' + esc(c.photo_url) + ')"' : '') + '>' + (c.photo_url ? "" : esc((c.nom || "?").charAt(0).toUpperCase())) + '</div><div class="m" style="cursor:default"><b>' + esc(c.nom) + '</b><small>' + esc(c.description || "") + (c.description ? " · " : "") + c.nb + ' membre' + (c.nb > 1 ? "s" : "") + (c.anonyme ? " · 🎭 Anonyme" : "") + (c.est_createur ? " · Par toi" : "") + '</small>' + (c.est_createur ? '<small><span class="lnk" data-ce="' + c.id + '">Modifier</span> · <span class="lnk dng" data-cd="' + c.id + '">Supprimer</span></small>' : '<small><span class="lnk" data-rp="club:' + c.id + '">Signaler</span></small>') + '</div><button class="sm" data-co="' + c.id + '">Ouvrir</button></div>').join("") + (cls.length ? '' : '<div class="empty">Aucun club pour l’instant.</div>') + '<button class="s1b" id="cnew">Créer un club</button>') : '') +
    (sh("qu") ? sec("Questions populaires", qsorted.map(q => { const u = q.question_utiles || [], on = u.some(x => x.membre === session.id), n = rs.filter(r => r.question === q.id).length; return '<div class="card"><p style="font-weight:600;margin-bottom:6px;cursor:pointer" data-qo="' + q.id + '">' + esc(q.texte) + '</p>' + mm(q.media_url, q.media_type) + '<div class="act2"><span class="lnk' + (on ? " lk" : "") + '" data-qu="' + q.id + '">' + (on ? "♥" : "♡") + ' <b>' + u.length + '</b> utile</span><span class="lnk" data-qo="' + q.id + '"><b>' + n + '</b> réponse' + (n > 1 ? "s" : "") + '</span>' + (q.auteur === session.id ? '<span style="margin-left:auto"><span class="lnk" data-qe="' + q.id + '">Modifier</span> · <span class="lnk dng" data-qd="' + q.id + '">Supprimer</span></span>' : '<span style="margin-left:auto"><span class="lnk" data-rp="question:' + q.id + '">Signaler</span></span>') + '</div></div>'; }).join("") + (qs.length ? '' : '<div class="empty">Aucune question pour l’instant.</div>') + '<button class="s1b" id="qnew">Poser une question</button>') : '') + err;
  const tomorrow = () => { const d = new Date(Date.now() + 864e5); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  D("[data-cf]", b => { cf = b.dataset.cf; render(); });
  click("#anew", () => { cform = {k:"an", t1:"", pin:false}; cmsg = ""; render(); });
  click("#enew", () => { cform = {k:"ev", t1:"", t2:tomorrow(), t3:"", pay:false, t4:""}; cmsg = ""; render(); });
  click("#cnew", () => { cform = {k:"cl", t1:"", t2:"", anon:false}; cmsg = ""; render(); });
  click("#qnew", () => { cform = {k:"qu", t1:""}; cmsg = ""; render(); });
  D("[data-ae]", b => { const a = ans.find(x => x.id === b.dataset.ae); cform = {k:"an", id:a.id, t1:a.texte, pin:a.epingle}; cmsg = ""; render(); });
  D("[data-ad]", b => { if(confirm("Supprimer cette annonce ? Cette action est définitive.")) cdo(t => sb("/rest/v1/annonces?id=eq." + b.dataset.ad, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t)); });
  D("[data-ep]", async b => {
    const e = evs.find(x => x.id === b.dataset.ep), on = (e.evenement_participants || []).some(p => p.membre === session.id);
    await cdo(t => on ? sb("/rest/v1/evenement_participants?evenement=eq." + e.id + "&membre=eq." + session.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t) : sb("/rest/v1/evenement_participants", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({evenement:e.id})}, t));
    loadInvits();
    if(!on && e.gratuit !== false && !cmsg){ cmsg = "Invitation envoyée dans tes messages ✓"; render(); setTimeout(() => { if(/^Invitation/.test(cmsg)){ cmsg = ""; render(); } }, 3500); }
  });
  D("[data-evl]", async b => {
    let r = []; try{ r = await withAuth(t => sb("/rest/v1/evenement_participants?evenement=eq." + b.dataset.evl + "&select=membre,profiles(nom,pseudo)", {}, t)); }catch(e){}
    const d = document.createElement("div"); d.className = "sheet";
    d.innerHTML = '<div class="sc"><b>Participants (' + r.length + ')</b>' + (r.length ? r.map(x => '<div class="cv" style="display:flex;align-items:center;gap:10px"><div class="av s">' + esc(((x.profiles || {}).nom || "?").charAt(0).toUpperCase()) + '</div><div><b>' + esc((x.profiles || {}).nom || "Étudiant") + '</b><div class="pt">@' + esc((x.profiles || {}).pseudo || "") + '</div></div></div>').join("") : '<p class="pt">Personne pour l’instant.</p>') + '<button class="t" id="evx">Fermer</button></div>';
    document.body.appendChild(d); d.onclick = e => { if(e.target === d || e.target.id === "evx") d.remove(); };
  });
  D("[data-ee]", b => { const e = evs.find(x => x.id === b.dataset.ee), d = new Date(e.date_debut); cform = {k:"ev", id:e.id, t1:e.titre, t2:d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()), t3:e.lieu || "", pay:e.gratuit === false, t4:e.prix || ""}; cmsg = ""; render(); });
  D("[data-ed]", b => { if(confirm("Supprimer cet événement ? Cette action est définitive.")) cdo(t => sb("/rest/v1/evenements?id=eq." + b.dataset.ed, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t)); });
  D("[data-co]", b => openClub(b.dataset.co));
  D("[data-cj]", b => { const c = cls.find(x => x.id === b.dataset.cj); cdo(t => c.membre ? sb("/rest/v1/club_membres?club=eq." + c.id + "&membre=eq." + session.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t) : sb("/rest/v1/club_membres", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({club:c.id})}, t)); });
  D("[data-ce]", b => { const c = cls.find(x => x.id === b.dataset.ce); cform = {k:"cl", id:c.id, t1:c.nom, t2:c.description || "", anon:c.anonyme}; cmsg = ""; render(); });
  D("[data-cd]", b => { if(confirm("Supprimer ce club ? Cette action est définitive.")) cdo(t => sb("/rest/v1/clubs?id=eq." + b.dataset.cd, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t)); });
  D("[data-qo]", b => { qopen = b.dataset.qo; rdraft = ""; rfile = null; cmsg = ""; render(); });
  D("[data-qu]", b => { const q = qs.find(x => x.id === b.dataset.qu), on = (q.question_utiles || []).some(x => x.membre === session.id); cdo(t => on ? sb("/rest/v1/question_utiles?question=eq." + q.id + "&membre=eq." + session.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t) : sb("/rest/v1/question_utiles", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({question:q.id})}, t)); });
  D("[data-qe]", b => { const q = qs.find(x => x.id === b.dataset.qe); ted = {k:"qu", id:q.id, texte:q.texte}; render(); });
  D("[data-qd]", b => { if(confirm("Supprimer cette question et ses réponses ? Cette action est définitive.")) cdo(t => sb("/rest/v1/questions?id=eq." + b.dataset.qd, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t)); });
}

