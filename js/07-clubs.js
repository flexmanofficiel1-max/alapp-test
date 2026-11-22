let fopen = null, fcoms = [], fcd = "", vu = null, vback = "feed", mystats = null;
// ----- clubs : espace d'actualités
let club = null;
const BROKEN = '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><path d="M12 5.67L10 10l3.2 2.3-2.4 4.7"/>';
const clubAv = (photo, nom, cls) => '<div class="av ' + cls + '"' + (photo ? ' style="background-image:url(' + esc(photo) + ')"' : '') + '>' + (photo ? "" : esc((nom || "?").charAt(0).toUpperCase())) + '</div>';
function openClub(id){ noterActivite(); club = {id, info:null, posts:[], dem:null, showDem:false, composer:false, txt:"", files:[], ask:false, askTxt:"", msg:"", err:""}; solo = null; tab = "club"; render(); loadClub(); }
async function loadClub(){
  const id = club && club.id; if(!id) return;
  try{
    const [i, p] = await Promise.all([rpc("club_info", {p_club:id}), rpc("club_fil", {p_club:id, p_limite:40})]);
    if(!club || club.id !== id) return;
    club.info = (i && i[0]) || null; club.posts = p || []; if(!club.info) club.err = "Club introuvable.";
    if(club.info && club.info.peut_msg) club.dem = await rpc("club_demandes", {p_club:id}).catch(() => []);
    if(club.info && !club.info.est_admin && !club.info.anonyme && club.info.contact) club.adm = await withAuth(t => sb("/rest/v1/profiles?id=eq." + club.info.contact + "&select=id,nom,pseudo,photo_url", {}, t)).then(r => r && r[0] || null).catch(() => null);
  }catch(e){ if(club && club.id === id) club.err = /club_info|function|schema cache/i.test(e.message) ? "Les clubs ne sont pas encore activés sur ce site." : e.message; }
  if(tab === "club" && club && club.id === id) render();
}
async function repostClub(postId){
  let m = "";
  try{ await withAuth(t => sb("/rest/v1/statuts", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({repost_club:postId})}, t)); m = "Republié dans ton fil ✓"; }
  catch(e){ m = /duplicate|23505|unique/i.test(e.message) ? "Tu as déjà republié cette publication." : "Impossible de republier : " + e.message; }
  if(tab === "club" && club){ club.msg = m; render(); setTimeout(() => { if(club && club.msg === m){ club.msg = ""; render(); } }, 3000); }
  else { await loadPosts(); feedMsg = m; render(); setTimeout(() => { if(feedMsg === m){ feedMsg = ""; render(); } }, 3000); }
}
function clubPostHtml(p, c){
  const med = p.medias && p.medias.length > 1 ? '<div class="pg">' + p.medias.map(u => '<img src="' + esc(u) + '" alt="">').join("") + '</div>' : p.media_url ? (p.media_type === "video" ? '<video src="' + esc(p.media_url) + '" controls playsinline></video>' : '<img src="' + esc(p.media_url) + '" alt="">') : '';
  const lk = p.ma_reaction === "like", dk = p.ma_reaction === "dislike", b = (cls, d, lab, ic2, n) => '<button class="t' + cls + '" ' + d + ' aria-label="' + lab + '" title="' + lab + '">' + ic2 + (n ? '<span>' + n + '</span>' : '') + '</button>';
  return '<div class="card post"><div class="ph">' + clubAv(c.photo_url, c.nom, "s") + '<div><b>' + esc(c.nom) + '</b><div class="pt">Club · ' + ago(p.created_at) + '</div></div></div>' + (p.texte ? '<p>' + esc(p.texte) + '</p>' : '') + med +
    '<div class="ac ai">' + b(lk ? " lk" : "", 'data-cr="like" data-p="' + p.id + '"', "J’aime", pico(PIC.heart, lk), +p.likes) + b(dk ? " dk" : "", 'data-cr="dislike" data-p="' + p.id + '"', "Je n’aime pas", pico(BROKEN, dk), +p.dislikes) + b("", 'data-csh="' + p.id + '"', "Partager", pico(PIC.share), 0) + b("", 'data-crb="' + p.id + '"', "Republier", pico(PIC.repost), 0) +
    (c.peut_pub ? b("", 'data-cdel="' + p.id + '"', "Supprimer", pico(PIC.trash), 0) : b("", 'data-rp="club:' + c.id + '"', "Signaler le club", pico(PIC.flag), 0)) + '</div></div>';
}
async function clubPhoto(f, kind){
  if(!f) return;
  if(f.size > 10 * 1024 * 1024){ alert("Image trop lourde (10 Mo max)."); return; }
  const cf = await cropPhoto(f, kind === "cover" ? 2 : 1, kind === "cover" ? 1200 : 640, kind !== "cover"); if(!cf) return;
  try{ const up = await withAuth(t => upMedia(t, cf, "avatars")); await rpc("club_modifier", {p_club:club.id, p_photo:kind === "logo" ? up.url : null, p_couverture:kind === "cover" ? up.url : null}); club.msg = "Photo mise à jour ✓"; }
  catch(e){ alert(/club_modifier|function|schema cache/i.test(e.message) ? "Cette fonction n’est pas encore activée sur ce site." : e.message); }
  await loadClub();
}
async function shareClub(){
  const c = club.info, rc = await rpc("partage_creer", {p_type:"club", p_cible:c.id}).catch(() => null), url = location.origin + location.pathname + "#c=" + c.id + (rc ? "&r=" + rc : ""), text = "Rejoins le club « " + c.nom + " » sur ALapp";
  if(navigator.share){ try{ await navigator.share({title:"ALapp", text, url}); return; }catch(e){ if(e && e.name === "AbortError") return; } }
  try{ await navigator.clipboard.writeText(url); club.msg = "Lien du club copié ✓"; }catch(e){ club.msg = "Copie ce lien : " + url; }
  render(); setTimeout(() => { if(club && club.msg.startsWith("Lien du club")){ club.msg = ""; render(); } }, 2500);
}
async function clubTeamSheet(){
  let eq = [], mem = [];
  try{ [eq, mem] = await Promise.all([rpc("club_equipe", {p_club:club.id}), rpc("club_membres_liste", {p_club:club.id})]); }
  catch(e){ alert(/club_equipe|function|schema cache/i.test(e.message) ? "Les rôles ne sont pas encore activés sur ce site." : e.message); return; }
  const ROLES = [["messages", "Administrateur des messages", "Reçoit les demandes d’intégration et les messages des visiteurs."], ["publications", "Administrateur des publications", "Publie et supprime les actualités du club."]];
  const d = document.createElement("div"); d.className = "sheet"; document.body.appendChild(d);
  let pick = null; const ini = x => esc(((x && x.nom) || "?").charAt(0).toUpperCase());
  const close = () => { d.remove(); loadClub(); }; d.onclick = e => { if(e.target === d) close(); };
  const set = async (role, id) => { try{ await rpc("club_role_definir", {p_club:club.id, p_role:role, p_membre:id}); eq = await rpc("club_equipe", {p_club:club.id}); }catch(e){ alert(e.message); } pick = null; draw(); };
  const draw = () => {
    d.innerHTML = '<div class="sc"><b>Équipe d’administration</b><p class="pt">Tu es l’administrateur général. Tu confies deux rôles à des membres du club.</p>' + (pick ? '<b style="display:block;margin-top:6px">Choisir un membre</b>' + (mem.length ? mem.map(m => '<div class="cv" style="display:flex;align-items:center;gap:10px"><div class="av s">' + ini(m) + '</div><div style="flex:1;min-width:0"><b>' + esc(m.nom) + '</b><div class="pt">@' + esc(m.pseudo || "") + '</div></div><button class="sm" data-nm="' + m.id + '">Nommer</button></div>').join("") : '<p class="pt">Aucun membre pour l’instant. Ajoute d’abord des personnes au club.</p>') + '<button class="t" id="tkb">← Retour</button>' : ROLES.map(r => { const h = eq.find(x => x.role === r[0]); return '<div class="card adm" style="margin:8px 0"><b>' + r[1] + '</b><p class="pt" style="margin:4px 0 8px">' + r[2] + '</p><div class="adr">' + (h ? '<div class="av s">' + ini(h) + '</div><div style="flex:1;min-width:0"><b>' + esc(h.nom) + '</b><div class="pt">@' + esc(h.pseudo || "") + '</div></div><button class="sm g" data-nr="' + r[0] + '">Retirer</button>' : '<div class="pt" style="flex:1">Non défini</div>') + '<button class="sm" data-np="' + r[0] + '">' + (h ? "Changer" : "Choisir") + '</button></div></div>'; }).join("") + '<button class="t" id="tkx">Fermer</button>') + '</div>';
    d.querySelectorAll("[data-np]").forEach(b => b.onclick = () => { pick = b.dataset.np; draw(); });
    d.querySelectorAll("[data-nr]").forEach(b => b.onclick = () => set(b.dataset.nr, null));
    d.querySelectorAll("[data-nm]").forEach(b => b.onclick = () => set(pick, b.dataset.nm));
    const bk = d.querySelector("#tkb"); if(bk) bk.onclick = () => { pick = null; draw(); };
    const cx = d.querySelector("#tkx"); if(cx) cx.onclick = close;
  };
  draw();
}
function clubEditSheet(){
  const c = club.info, d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><b>Modifier le club</b><input id="cen" maxlength="60" value="' + esc(c.nom) + '" placeholder="Nom du club"><textarea id="ced" maxlength="500" placeholder="Description">' + esc(c.description || "") + '</textarea><button id="ces">Enregistrer</button><button class="t" id="cex">Annuler</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove(); d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#cex").onclick = close;
  d.querySelector("#ces").onclick = async () => { const n = d.querySelector("#cen").value.trim(); if(n.length < 2){ alert("Le nom doit contenir au moins 2 caractères."); return; } try{ await rpc("club_modifier", {p_club:club.id, p_nom:n, p_description:d.querySelector("#ced").value}); close(); club.msg = "Club mis à jour ✓"; await loadClub(); }catch(e){ alert(e.message); } };
}
function clubAddSheet(){
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><b>Ajouter des personnes au club</b><input id="caq" placeholder="Chercher un étudiant (nom ou pseudo)"><div id="car" style="max-height:45vh;overflow:auto"></div><button class="t" id="cax">Fermer</button></div>';
  document.body.appendChild(d);
  const close = () => { d.remove(); loadClub(); }; d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#cax").onclick = close;
  let tm = null;
  d.querySelector("#caq").oninput = e => { clearTimeout(tm); const q = clean(e.target.value); tm = setTimeout(async () => {
    const box = d.querySelector("#car"); if(q.length < 2){ box.innerHTML = ""; return; }
    let r = []; try{ r = await rp2("chercher_profils", {p_q:q}); }catch(err){}
    r = (r || []).filter(u => !blocked.has(u.id) && u.id !== session.id).slice(0, 8);
    box.innerHTML = r.length ? r.map(u => '<div class="cv" style="display:flex;align-items:center;gap:10px"><div class="av s">' + esc((u.nom || u.pseudo || "?").charAt(0).toUpperCase()) + '</div><div style="flex:1;min-width:0"><b>' + esc(u.nom) + '</b><div class="pt">@' + esc(u.pseudo) + '</div></div><button class="sm" data-add="' + u.id + '">Ajouter</button></div>').join("") : '<p class="pt c">Aucun résultat.</p>';
    box.querySelectorAll("[data-add]").forEach(b => b.onclick = async () => { b.disabled = true; try{ const n = await rpc("club_ajouter", {p_club:club.id, p_membres:[b.dataset.add]}); b.textContent = n ? "Ajouté ✓" : "Déjà membre"; }catch(err){ alert(err.message); b.disabled = false; } });
  }, 300); };
}
function renderClub(){
  const c = club && club.info, nav = '<div class="nav"><button class="t" id="clb">← Retour</button><b>Club</b></div>';
  if(!c){ app.innerHTML = nav + '<p class="pt c">' + (club && club.err ? esc(club.err) : "Chargement…") + '</p>'; bindClub(); return; }
  const nd = club.dem ? club.dem.length : 0;
  let act;
  if(c.peut_pub) act = '<button id="clp">Publier</button>';
  else if(c.est_membre) act = '<button class="g" disabled>Membre ✓</button>';
  else if(c.demande === "en_attente") act = '<button class="g" disabled>Demande envoyée</button>';
  else act = '<button id="cli">Intégrer le club</button>';
  const icb = (id, ic2, lab) => '<button class="pib" id="' + id + '" aria-label="' + lab + '" title="' + lab + '">' + pico(ic2) + '</button>';
  const lg = '<div class="lgw">' + clubAv(c.photo_url, c.nom, "") + (c.est_admin ? '<label class="lgb" aria-label="Changer le logo" title="Changer le logo">' + ico20(PIC.cam) + '<input type="file" id="cllg" accept="image/*" hidden></label>' : '') + '</div>';
  const cov = '<div class="cvr" style="background-image:' + (c.couverture_url ? 'url(' + esc(c.couverture_url) + ')' : DEFCOV) + '">' + (c.est_admin ? '<label class="cvb" aria-label="Changer la couverture" title="Changer la couverture">' + pico(PIC.cam) + '<input type="file" id="clcv" accept="image/*" hidden></label>' : '') + '</div>';
  const hd = '<div class="nav" style="position:relative;z-index:2;margin:0;height:0"><button class="t cvback" id="clb">← Retour</button></div>' + cov + '<div class="pcard"><div class="pc1">' + lg + '<div class="pc2"><b>' + esc(c.nom) + '</b><span>' + (c.anonyme ? "Club anonyme" : "Club") + '</span></div></div>' + (c.description ? '<p class="pbio" style="text-align:left;margin:10px 0 0">' + esc(c.description) + '</p>' : '') + '<div class="pcs"><div><b>' + c.nb + '</b>Membre' + (c.nb > 1 ? "s" : "") + '</div><div><b>' + c.nb_posts + '</b>Publication' + (c.nb_posts > 1 ? "s" : "") + '</div></div><div class="pbt">' + act + icb("clsh", PIC.share, "Partager le club") + (c.est_admin ? icb("clad", PIC.userplus, "Ajouter des personnes") + icb("clmo", PIC.edit, "Modifier le club") + icb("clq", PIC.users, "Équipe d’administration") : '') + '</div>' + (c.peut_msg ? '<button class="g" id="cld" style="margin-top:8px">Demandes d’intégration' + (nd ? " (" + nd + ")" : "") + '</button>' : '') + '</div>';
  const roleTxt = c.est_admin ? "Tu es l’administrateur général : tu confies les tâches à ton équipe depuis l’icône « équipe »." : (c.peut_msg && c.peut_pub) ? "Tu gères les messages et les publications du club." : c.peut_msg ? "Tu es l’administrateur des messages : tu reçois et traites les demandes d’intégration." : "Tu es l’administrateur des publications : tu publies et supprimes les actualités du club.";
  const admc = (c.est_admin || c.peut_msg || c.peut_pub) ? '<div class="card adm"><span class="chip">' + (c.est_admin ? "Administrateur général" : "Administrateur du club") + '</span><p class="pt" style="margin:6px 0 0">' + roleTxt + '</p></div>' : '<div class="card adm"><small class="pt">Contact du club</small><div class="adr">' + (c.anonyme ? '<div class="av s">🎭</div><div><b>Administrateur</b><div class="pt">Identité protégée · club anonyme</div></div>' : club.adm ? avh(club.adm.id, club.adm.nom, "s") + '<div style="flex:1;min-width:0"><b class="un" data-u="' + club.adm.id + '">' + esc(club.adm.nom) + badge(club.adm.id) + '</b><div class="pt">Administrateur · @' + esc(club.adm.pseudo || "") + '</div></div>' : '<div class="pt">Chargement…</div>') + '</div><button class="g" id="cadm">' + ico20(PIC.comment) + ' Contacter l’administrateur</button></div>';
  const ask = club.ask ? '<div class="card"><b>Intégrer le club</b><p class="s" style="margin:6px 0">Ta demande est envoyée en privé à l’administrateur.' + (c.anonyme ? ' Il verra ton nom, mais ton identité ne sera pas dévoilée aux autres.' : '') + '</p><textarea id="cla" maxlength="500" placeholder="Présente-toi en quelques mots (facultatif)">' + esc(club.askTxt) + '</textarea><div class="pbt"><button class="g" id="clax">Annuler</button><button id="clas">Envoyer la demande</button></div></div>' : '';
  const comp = club.composer ? '<div class="card"><b>Nouvelle publication du club</b><textarea id="clt" maxlength="1000" placeholder="Quoi de neuf dans le club ?">' + esc(club.txt) + '</textarea><label class="gph" style="display:block;margin:8px 0"><span class="lnk">📷 ' + (club.files.length ? club.files.length + " média" + (club.files.length > 1 ? "s" : "") + " choisi" + (club.files.length > 1 ? "s" : "") : "Ajouter des photos ou une vidéo") + '</span><input type="file" id="clf" accept="image/*,video/*" multiple hidden></label><div class="pbt"><button class="g" id="clx">Annuler</button><button id="clg">Publier</button></div></div>' : '';
  const dem = club.showDem ? '<div class="card"><b>Demandes d’intégration</b>' + (nd ? club.dem.map(d => '<div class="rw"><div class="m" style="cursor:default"><b>' + esc(d.nom || d.pseudo || "Étudiant") + '</b><small>@' + esc(d.pseudo || "") + ' · ' + agoL(d.created_at) + '</small>' + (d.message ? '<small style="color:var(--tx)">' + esc(d.message) + '</small>' : '') + '</div><button class="sm g" data-dn="' + d.id + '">Refuser</button><button class="sm" data-dy="' + d.id + '">Accepter</button></div>').join("") : '<p class="pt c">Aucune demande en attente.</p>') + '</div>' : '';
  app.innerHTML = '<button id="clw0" hidden></button>' + hd + admc + (club.msg ? '<div class="msg ok">' + esc(club.msg) + '</div>' : '') + ask + comp + dem + (club.posts.length ? club.posts.map(p => clubPostHtml(p, c)).join("") : '<p class="pt c" style="margin-top:14px">Aucune actualité pour l’instant.</p>');
  bindClub();
}
function bindClub(){
  const c = club && club.info, id = club && club.id;
  const on = (sel, fn) => { const el = $(sel); if(el) el.onclick = fn; };
  on("#clb", () => { club = null; go("com"); });
  on("#cli", () => { club.ask = true; render(); });
  on("#clax", () => { club.ask = false; render(); });
  const ca = $("#cla"); if(ca) ca.oninput = e => { club.askTxt = e.target.value; };
  on("#clas", async () => { try{ await rpc("club_demander", {p_club:id, p_message:club.askTxt}); club.ask = false; club.askTxt = ""; club.msg = "Demande envoyée ✓ Tu seras prévenu(e) de la réponse."; }catch(e){ alert(e.message); } await loadClub(); });
  on("#clsh", shareClub);
  on("#clad", clubAddSheet);
  on("#clmo", clubEditSheet);
  on("#clq", clubTeamSheet);
  const fcv = $("#clcv"); if(fcv) fcv.onchange = e => { const f = e.target.files[0]; e.target.value = ""; clubPhoto(f, "cover"); };
  const flg = $("#cllg"); if(flg) flg.onchange = e => { const f = e.target.files[0]; e.target.value = ""; clubPhoto(f, "logo"); };
  app.querySelectorAll("[data-u]").forEach(b => b.onclick = () => openUser(b.dataset.u));
  on("#cadm", () => { if(c && c.anonyme){ club.ask = true; render(); window.scrollTo(0, 0); } else if(c && c.contact) $("#clw0").click(); });
  on("#clw0", async () => { if(!(c && c.contact)) return; try{ const pr = await withAuth(t => sb("/rest/v1/profiles?id=eq." + c.contact + "&select=id,nom,pseudo,photo_url", {}, t)); if(pr && pr[0]){ club = null; tab = "msg"; openChat(pr[0]); mdraft = "Bonjour, je souhaite intégrer le club « " + c.nom + " »."; render(); } }catch(e){ alert(e.message); } });
  on("#clp", () => { club.composer = !club.composer; render(); });
  on("#clx", () => { club.composer = false; club.txt = ""; club.files = []; render(); });
  const ct = $("#clt"); if(ct) ct.oninput = e => { club.txt = e.target.value; };
  const cf = $("#clf"); if(cf) cf.onchange = e => { let l = Array.from(e.target.files || []); const v = l.find(x => (x.type || "").startsWith("video")); if(v) l = [v]; club.files = l.slice(0, 4); render(); };
  on("#clg", async () => {
    const texte = (club.txt || "").trim(); if(!texte && !club.files.length){ alert("Écris quelque chose ou ajoute un média."); return; }
    const b = $("#clg"); b.disabled = true; b.textContent = "Publication…";
    try{
      await withAuth(async t => {
        const urls = []; let mt = null;
        for(const f0 of club.files){
          const f = await shrink(f0), ext = (f.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase(), path = session.id + "/" + crypto.randomUUID() + "." + ext;
          const r = await fetch(SUPABASE_URL + "/storage/v1/object/medias/" + path, {method:"POST", headers:{apikey:SUPABASE_KEY, Authorization:"Bearer " + t, "Content-Type":f.type || "application/octet-stream"}, body:f});
          if(!r.ok){ let d = null; try{ d = await r.json(); }catch(e){} throw new Error((d && (d.message || d.error)) || "Envoi du média impossible"); }
          urls.push(SUPABASE_URL + "/storage/v1/object/public/medias/" + path); if(!mt) mt = (f.type || "").startsWith("video") ? "video" : "image";
        }
        await sb("/rest/v1/rpc/club_publier", {method:"POST", body:JSON.stringify({p_club:id, p_texte:texte, p_media_url:urls[0] || null, p_media_type:mt, p_medias:urls.length > 1 ? urls : null})}, t);
      });
      club.composer = false; club.txt = ""; club.files = []; club.msg = "Publication ajoutée au club ✓";
    }catch(e){ alert(e.message); }
    await loadClub();
  });
  on("#cld", () => { club.showDem = !club.showDem; render(); });
  document.querySelectorAll("[data-dy],[data-dn]").forEach(b => b.onclick = async () => { const ok = !!b.dataset.dy; try{ await rpc("club_traiter", {p_demande:b.dataset.dy || b.dataset.dn, p_accepter:ok}); club.msg = ok ? "Demande acceptée ✓" : "Demande refusée."; }catch(e){ alert(e.message); } await loadClub(); });
  document.querySelectorAll("[data-cr]").forEach(b => b.onclick = async () => { try{ await rpc("club_reagir", {p_post:b.dataset.p, p_type:b.dataset.cr}); }catch(e){ alert(e.message); } await loadClub(); });
  document.querySelectorAll("[data-crb]").forEach(b => b.onclick = async () => { b.disabled = true; await repostClub(b.dataset.crb); });
  document.querySelectorAll("[data-cdel]").forEach(b => b.onclick = async () => { if(!confirm("Supprimer cette publication ? Cette action est définitive.")) return; try{ await rpc("club_supprimer_post", {p_post:b.dataset.cdel}); }catch(e){ alert(e.message); } await loadClub(); });
  document.querySelectorAll("[data-csh]").forEach(b => b.onclick = async () => {
    const p = club.posts.find(x => x.id === b.dataset.csh); if(!p || !c) return;
    const rc = await rpc("partage_creer", {p_type:"club", p_cible:c.id}).catch(() => null), url = location.origin + location.pathname + "#c=" + c.id + (rc ? "&r=" + rc : ""), txt = (p.texte || "").slice(0, 100), text = (txt ? "« " + txt + (p.texte.length > 100 ? "…" : "") + " » " : "") + "Actualité du club " + c.nom + " sur ALapp";
    if(navigator.share){ try{ await navigator.share({title:"ALapp", text, url}); return; }catch(e){ if(e && e.name === "AbortError") return; } }
    try{ await navigator.clipboard.writeText(url); club.msg = "Lien copié ✓"; }catch(e){ club.msg = "Copie ce lien : " + url; }
    render(); setTimeout(() => { if(club && club.msg.startsWith("Lien copié")){ club.msg = ""; render(); } }, 2500);
  });
}
