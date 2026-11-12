const rpc = (fn, body) => withAuth(t => sb("/rest/v1/rpc/" + fn, {method:"POST", body:JSON.stringify(body || {})}, t));
async function attachOrig(list){
  list = list || [];
  const ids = [...new Set(list.filter(x => x.repost_de).map(x => x.repost_de))];
  if(ids.length){
    try{
      const o = await withAuth(t => sb("/rest/v1/statuts?id=in.(" + ids.join(",") + ")&select=id,auteur,texte,media_url,media_type,medias,profiles!statuts_auteur_fkey(nom,pseudo,niveau,filiere)", {}, t));
      const m = {}; (o || []).forEach(y => { m[y.id] = y; });
      list.forEach(x => { if(x.repost_de) x.original = m[x.repost_de] || null; });
    }catch(e){}
  }
  const cids = [...new Set(list.filter(x => x.repost_club).map(x => x.repost_club))];
  if(cids.length){
    try{
      const o = await rpc("club_posts_par_ids", {p_ids:cids});
      const m = {}; (o || []).forEach(y => { m[y.id] = y; });
      list.forEach(x => { if(x.repost_club) x.clubOrig = m[x.repost_club] || null; });
    }catch(e){}
  }
  return list;
}
let myFollows = new Set(), ftab = null;
async function loadFollows(){
  try{ const r = await withAuth(t => sb("/rest/v1/abonnements?suiveur=eq." + session.id + "&select=suivi", {}, t)); myFollows = new Set((r || []).map(x => x.suivi)); }catch(e){}
  if(!ftab) ftab = store.get("ftab") || (myFollows.size ? "abo" : "dec");
}
const feedFilter = () => { const ids = [session.id, ...myFollows].join(","); return ftab === "abo" ? "&auteur=in.(" + ids + ")" : "&auteur=not.in.(" + ids + ")"; };
const fsegHtml = () => '<div class="wseg" style="margin:6px 0 4px"><button data-ft="dec" class="' + (ftab === "dec" ? "on" : "") + '">Découverte</button><button data-ft="abo" class="' + (ftab === "abo" ? "on" : "") + '">Abonnements</button></div>';
async function loadPosts(){
  validerPartage();
  await loadFollows();
  if(clubShared){ const cid = clubShared; clubShared = null; openClub(cid); return; }
  if(groupShared){ const gc = groupShared; groupShared = null; try{ history.replaceState(null, "", location.pathname); }catch(e){} joinGroupFlow(gc); }
  if(DEMO || !session) return;
  loadStories();
  try{
    try{ posts = await withAuth(t => sb("/rest/v1/statuts?select=*,profiles!statuts_auteur_fkey(nom,pseudo,niveau,filiere),likes(membre),commentaires(count)&order=created_at.desc&limit=50" + feedFilter(), {}, t)); }
    catch(e){ posts = await withAuth(t => sb("/rest/v1/statuts?select=*,profiles!statuts_auteur_fkey(nom,pseudo)&order=created_at.desc&limit=50" + feedFilter(), {}, t)); }
    await attachOrig(posts);
    feedMsg = "";
    const pin = solo || sharedId;
    if(pin){
      let one = posts.find(x => x.id === pin);
      if(!one){ try{ const r1 = await withAuth(t => sb("/rest/v1/statuts?id=eq." + pin + "&select=*,profiles!statuts_auteur_fkey(nom,pseudo,niveau,filiere),likes(membre),commentaires(count)", {}, t)); one = r1 && r1[0]; if(one) await attachOrig([one]); }catch(e){} }
      if(solo) posts = one ? [one] : []; else if(one) posts = [one, ...posts.filter(x => x.id !== pin)];
    }
  }catch(e){ feedMsg = "Impossible de charger le fil : " + e.message; }
  soloBusy = false;
  render();
}
function ago(t){
  const s = (Date.now() - new Date(t)) / 1000;
  if(s < 60) return "à l’instant";
  if(s < 3600) return Math.floor(s / 60) + " min";
  if(s < 86400) return Math.floor(s / 3600) + " h";
  return new Date(t).toLocaleDateString("fr-FR");
}
async function publish(){
  const texte = draft.trim();
  if(!texte && !pfiles.length){ feedMsg = "Écris quelque chose ou ajoute un média."; return render(); }
  loading = true; feedMsg = ""; render();
  try{
  await withAuth(async t => {
    const urls = []; let media_type = null;
    for(const f0 of pfiles){
      const f = await shrink(f0);
      const ext = (f.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const path = session.id + "/" + crypto.randomUUID() + "." + ext;
      const r = await fetch(SUPABASE_URL + "/storage/v1/object/medias/" + path, {method:"POST", headers:{apikey:SUPABASE_KEY, Authorization:"Bearer " + t, "Content-Type":f.type || "application/octet-stream"}, body:f});
      if(!r.ok){ let d = null; try{ d = await r.json(); }catch(e){} throw new Error((d && (d.message || d.error)) || "Envoi du média impossible"); }
      urls.push(SUPABASE_URL + "/storage/v1/object/public/medias/" + path);
      if(!media_type) media_type = (f.type || "").startsWith("video") ? "video" : "image";
    }
    const body = {auteur:session.id, texte, media_url:urls[0] || null, media_type};
    if(urls.length > 1) body.medias = urls;
    await sb("/rest/v1/statuts", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify(body)}, t);
  });
  draft = ""; file = null; pfiles = []; tab = "feed"; await loadPosts();
  }catch(e){ feedMsg = e.message; }
  loading = false; render();
}
function renderFeed(demo){
  if(DEMO){ app.innerHTML = demo + '<div class="card"><h2>Fil de statuts</h2><p class="s">Connecte Supabase pour utiliser le fil.</p><button class="t" id="pf">Mon profil</button></div>'; $("#pf").onclick = () => { tab = "profile"; render(); }; return; }
  const items = posts.filter(x => !blocked.has(x.auteur) && !(x.repost_de && (!x.original || blocked.has(x.original.auteur))) && !(x.repost_club && !x.clubOrig)).map(x => {
    const co = x.clubOrig, src = x.original || (co ? {id:co.id, auteur:null, texte:co.texte, media_url:co.media_url, media_type:co.media_type, medias:co.medias, profiles:{nom:co.club_nom}, isClub:true, club:co.club, club_photo:co.club_photo} : x), a = src.profiles || {}, rp = x.profiles || {}, mine = x.auteur === session.id, ini = (a.nom || a.pseudo || "?").charAt(0).toUpperCase(), ls = x.likes || [], liked = ls.some(l => l.membre === session.id), nl = ls.length, nc = fopen === x.id ? fcoms.length : (x.commentaires && x.commentaires[0] ? x.commentaires[0].count : 0);
    return '<div class="card post' + (x.id === sharedId ? ' shared' : '') + '">' + ((x.repost_de || x.repost_club) ? '<div class="pt" style="margin-bottom:8px">' + REPOST_SVG + '<b>' + (mine ? "Tu as" : esc(rp.nom || rp.pseudo || "Un étudiant") + " a") + ' republié</b></div>' : '') + '<div class="ph">' + (src.isClub ? clubAv(src.club_photo, a.nom, "s") : avh(src.auteur, a.nom || a.pseudo, "s")) + '<div><b class="un" ' + (src.isClub ? 'data-co="' + src.club + '"' : 'data-u="' + src.auteur + '"') + '>' + esc(a.nom || "Étudiant") + (src.isClub ? "" : badge(src.auteur)) + '</b><div class="pt">' + esc(src.isClub ? "Club" : ([a.niveau, a.filiere].filter(Boolean).join(" · ") || "@" + (a.pseudo || ""))) + ' · ' + ago(x.created_at) + '</div></div></div>' +
      (src.texte ? '<p>' + esc(src.texte) + '</p>' : '') +
      (src.medias && src.medias.length > 1 ? '<div class="pg">' + src.medias.map(u => '<img src="' + esc(u) + '" alt="">').join("") + '</div>' : src.media_url ? (src.media_type === "video" ? '<video src="' + esc(src.media_url) + '" controls playsinline></video>' : '<img src="' + esc(src.media_url) + '" alt="">') : '') +
      '<div class="ac ai"><button class="t' + (liked ? " lk" : "") + '" data-l="' + x.id + '" aria-label="J’aime" title="J’aime">' + pico(PIC.heart, liked) + (nl ? '<span>' + nl + '</span>' : '') + '</button><button class="t" data-fc="' + x.id + '" aria-label="Commentaires" title="Commentaires">' + pico(PIC.comment) + (nc ? '<span>' + nc + '</span>' : '') + '</button><button class="t" data-sh="' + x.id + '" aria-label="Partager" title="Partager">' + pico(PIC.share) + '</button>' + (src.isClub ? '<button class="t" data-rbc="' + x.repost_club + '" aria-label="Republier" title="Republier">' + pico(PIC.repost) + '</button>' : src.auteur !== session.id ? '<button class="t" data-rb="' + (x.repost_de || x.id) + '" aria-label="Republier" title="Republier">' + pico(PIC.repost) + '</button>' : '') + (mine ? ((x.repost_de || x.repost_club) ? '' : '<button class="t" data-e="' + x.id + '" aria-label="Modifier" title="Modifier">' + pico(PIC.edit) + '</button>') + '<button class="t" data-d="' + x.id + '" aria-label="Supprimer" title="Supprimer">' + pico(PIC.trash) + '</button>' : '<button class="t" data-rp="publication:' + x.id + '" aria-label="Signaler" title="Signaler">' + pico(PIC.flag) + '</button>') + '</div>' + (fopen === x.id ? fcomHtml(x) : '') + '</div>';
  }).join("");
  app.innerHTML = (solo ? '<div class="nav"><button class="t" id="sob">← Retour</button></div>' : storiesHtml() + brainCard() + fsegHtml()) + (feedMsg ? '<div class="msg">' + esc(feedMsg) + '</div>' : '') +
    (items || (solo ? '<p class="pt c">' + (soloBusy ? "Chargement…" : "Publication introuvable (supprimée ?).") + '</p>' : '<p class="pt c">' + (ftab === "abo" ? "Tu ne vois pas encore de publications ici. Abonne-toi à des étudiants depuis l’onglet Découverte." : "Aucune nouvelle publication à découvrir pour l’instant. Reviens bientôt !") + '</p>'));
  document.querySelectorAll("[data-u]").forEach(b => b.onclick = () => openUser(b.dataset.u));
  document.querySelectorAll("[data-co]").forEach(b => b.onclick = () => openClub(b.dataset.co));
  document.querySelectorAll("[data-rbc]").forEach(b => b.onclick = async () => { b.disabled = true; await repostClub(b.dataset.rbc); });
  if(!solo) bindStories();
  document.querySelectorAll("[data-ft]").forEach(b => b.onclick = () => { ftab = b.dataset.ft; store.set("ftab", ftab); loadPosts(); render(); });
  const bcd = $("#brc"); if(bcd) bcd.onclick = () => go("brain");
  const sob = $("#sob"); if(sob) sob.onclick = () => { solo = null; if(soloBack && soloBack.t === "user"){ tab = "profile"; openUser(soloBack.id); } else go("profile"); };
  document.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { const x = posts.find(y => y.id === b.dataset.l), liked = (x.likes || []).some(l => l.membre === session.id); fdo(t => liked ? sb("/rest/v1/likes?statut=eq." + x.id + "&membre=eq." + session.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t) : sb("/rest/v1/likes", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({statut:x.id})}, t), loadPosts); });
  document.querySelectorAll("[data-fc]").forEach(b => b.onclick = () => { noterActivite(); if(fopen === b.dataset.fc){ fopen = null; render(); } else { fopen = b.dataset.fc; fcoms = []; fcd = ""; render(); loadFcoms(); } });
  document.querySelectorAll("[data-rb]").forEach(b => b.onclick = async () => {
    b.disabled = true; let m = "";
    try{ await withAuth(t => sb("/rest/v1/statuts", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({repost_de:b.dataset.rb})}, t)); m = "Publication republiée ✓"; }
    catch(e){ m = /duplicate|23505|unique/i.test(e.message) ? "Tu as déjà republié cette publication." : /propre/i.test(e.message) ? "Tu ne peux pas republier ta propre publication." : "Impossible de republier : " + e.message; }
    await loadPosts(); feedMsg = m; render(); setTimeout(() => { if(feedMsg === m){ feedMsg = ""; render(); } }, 3000);
  });
  document.querySelectorAll("[data-sh]").forEach(b => b.onclick = async () => {
    const x = posts.find(y => y.id === b.dataset.sh); if(!x) return;
    const rc = await rpc("partage_creer", {p_type:"publication", p_cible:x.id}).catch(() => null), url = location.origin + location.pathname + "#p=" + x.id + (rc ? "&r=" + rc : "");
    const txt = ((x.texte || "").slice(0, 100) + ((x.texte || "").length > 100 ? "…" : "")).trim();
    const text = (txt ? "« " + txt + " » " : "") + "Une publication sur ALapp";
    if(navigator.share){ try{ await navigator.share({title:"ALapp", text, url}); return; }catch(e){ if(e && e.name === "AbortError") return; } }
    try{ await navigator.clipboard.writeText(url); feedMsg = "Lien copié ✓"; }catch(e){ feedMsg = "Copie ce lien : " + url; }
    render(); setTimeout(() => { if(feedMsg.startsWith("Lien copié")){ feedMsg = ""; render(); } }, 2500);
  });
  const fci = $("#fci"); if(fci) fci.oninput = e => { fcd = e.target.value; };
  const fall = async () => { await loadFcoms(); await loadPosts(); };
  document.querySelectorAll("[data-fcs]").forEach(b => b.onclick = () => { const texte = fcd.trim(); if(!texte) return; fcd = ""; fdo(t => sb("/rest/v1/commentaires", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({statut:b.dataset.fcs, texte})}, t), fall); });
  document.querySelectorAll("[data-fe]").forEach(b => b.onclick = () => { const c = fcoms.find(y => y.id === b.dataset.fe), n = prompt("Modifier le commentaire", c.texte); if(n === null || !n.trim()) return; fdo(t => sb("/rest/v1/commentaires?id=eq." + c.id, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({texte:n.trim(), modifie:true})}, t), fall); });
  document.querySelectorAll("[data-fd]").forEach(b => b.onclick = () => { if(confirm("Supprimer ce commentaire ?")) fdo(t => sb("/rest/v1/commentaires?id=eq." + b.dataset.fd, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t), fall); });
  document.querySelectorAll("[data-e]").forEach(b => b.onclick = async () => {
    const x = posts.find(y => y.id === b.dataset.e); const n = prompt("Modifier le statut", x.texte || ""); if(n === null) return;
    try{ await withAuth(t => sb("/rest/v1/statuts?id=eq." + x.id, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({texte:n.trim()})}, t)); await loadPosts(); }catch(e){ feedMsg = e.message; render(); }
  });
  document.querySelectorAll("[data-d]").forEach(b => b.onclick = async () => {
    if(!confirm("Supprimer ce statut ?")) return;
    try{ await withAuth(t => sb("/rest/v1/statuts?id=eq." + b.dataset.d, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t)); await loadPosts(); }catch(e){ feedMsg = e.message; render(); }
  });
}

