let mtab = "dm", dmnew = false, gadd = false, gaddSel = [], gaddMem = new Set(), gaddRes = [], gok = "", gcreate = false, gnew = {nom:"", anon:false, sel:[]}, gsr = [], gmsgs = [];
async function openGAdd(){
  gadd = true; gaddSel = []; gaddRes = []; gaddMem = new Set(); msgMsg = ""; gok = "";
  render();
  if(!peer.anonyme){ try{ const m = await withAuth(t => sb("/rest/v1/groupe_membres_vue?select=id&groupe=eq." + peer.id, {}, t)); gaddMem = new Set(m.map(x => x.id)); }catch(e){} }
}
async function gSearchAdd(q){
  q = clean(q);
  if(q.length < 2) gaddRes = [];
  else{ try{ const e = encodeURIComponent(q); gaddRes = await rp2("chercher_profils", {p_q:q}).then(r => (r || []).slice(0, 8)).then(r => r.filter(u => !blocked.has(u.id))); }catch(err){ gaddRes = []; } }
  const el = $("#asr"); if(!el) return;
  const list = gaddRes.filter(u => !gaddSel.some(x => x.id === u.id) && !gaddMem.has(u.id));
  el.innerHTML = list.map(u => '<div class="cv" data-u="' + u.id + '"><div class="av s">' + esc((u.nom || u.pseudo || "?").charAt(0).toUpperCase()) + '</div><div><b>' + esc(u.nom) + '</b><div class="pt">@' + esc(u.pseudo) + '</div></div></div>').join("");
  el.querySelectorAll("[data-u]").forEach(b => b.onclick = () => {
    if(gaddSel.length >= 150 - peer.nb){ msgMsg = "Il ne reste que " + Math.max(0, 150 - peer.nb) + " place(s) dans ce groupe (maximum 150 membres)."; gaddRes = []; return render(); }
    gaddSel.push(list.find(x => x.id === b.dataset.u)); gaddRes = []; msgMsg = ""; render();
  });
}
function renderGAdd(){
  const err = msgMsg ? '<div class="msg">' + esc(msgMsg) + '</div>' : '';
  const room = Math.max(0, 150 - peer.nb);
  app.innerHTML = '<div class="nav"><button class="t" id="ax">← Retour</button><b>Ajouter des personnes</b></div><div class="card"><p class="pt hint">' + esc(peer.nom) + ' · ' + peer.nb + ' / 150 membres · il reste ' + room + ' place' + (room > 1 ? 's' : '') + '</p><div class="chips">' + gaddSel.map(u => '<span class="chip" data-r="' + u.id + '">' + esc(u.nom || u.pseudo) + ' ✕</span>').join("") + '</div><input id="aq" placeholder="Chercher un étudiant à ajouter"><div id="asr"></div><button id="aok"' + (sending || !gaddSel.length ? " disabled" : "") + '>' + (sending ? "Ajout…" : "Ajouter" + (gaddSel.length ? " (" + gaddSel.length + ")" : "")) + '</button>' + err + '</div>';
  $("#ax").onclick = () => { gadd = false; msgMsg = ""; render(); };
  $("#aq").oninput = e => gSearchAdd(e.target.value);
  document.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { gaddSel = gaddSel.filter(x => x.id !== b.dataset.r); render(); });
  $("#aok").onclick = addMembers;
}
async function addMembers(){
  if(!gaddSel.length) return;
  sending = true; msgMsg = ""; render();
  try{
    await withAuth(t => sb("/rest/v1/rpc/ajouter_membres", {method:"POST", body:JSON.stringify({p_groupe:peer.id, p_membres:gaddSel.map(u => u.id)})}, t));
    const r = await withAuth(t => sb("/rest/v1/groupes_vue?select=nb&id=eq." + peer.id, {}, t)).catch(() => []);
    if(r && r[0]) peer.nb = r[0].nb;
    gok = "✓ Les personnes ont été invitées dans le groupe."; gadd = false; gaddSel = [];
  }catch(e){ msgMsg = e.message; }
  sending = false; render();
}

async function gSearch(q){
  q = clean(q);
  if(q.length < 2) gsr = [];
  else{ try{ const e = encodeURIComponent(q); gsr = await rp2("chercher_profils", {p_q:q}).then(r => (r || []).slice(0, 8)).then(r => r.filter(u => !blocked.has(u.id))); }catch(err){ gsr = []; } }
  const el = $("#gsr"); if(!el) return;
  const list = gsr.filter(u => !gnew.sel.some(x => x.id === u.id));
  el.innerHTML = list.map(u => '<div class="cv" data-u="' + u.id + '"><div class="av s">' + esc((u.nom || u.pseudo || "?").charAt(0).toUpperCase()) + '</div><div><b>' + esc(u.nom) + '</b><div class="pt">@' + esc(u.pseudo) + '</div></div></div>').join("");
  el.querySelectorAll("[data-u]").forEach(b => b.onclick = () => { if(gnew.sel.length >= 149){ msgMsg = "Un groupe ne peut pas dépasser 150 membres (toi compris)."; gsr = []; return render(); } gnew.sel.push(list.find(x => x.id === b.dataset.u)); gsr = []; msgMsg = ""; render(); });
}
function renderGNew(){
  const err = msgMsg ? '<div class="msg">' + esc(msgMsg) + '</div>' : '';
  app.innerHTML = '<div class="nav"><button class="t" id="gx">← Retour</button><b>Nouveau groupe</b></div><div class="card"><div class="c">' + gphHtml() + '</div><label>Nom du groupe</label><input id="gnm" maxlength="60" value="' + esc(gnew.nom) + '"><label>Type de groupe</label><div class="seg"><button class="t sg' + (gnew.anon ? "" : " on") + '" id="gt0">👥 Normal</button><button class="t sg' + (gnew.anon ? " on" : "") + '" id="gt1">🕶️ Anonyme</button></div><p class="pt hint">' + (gnew.anon ? "Dans un groupe anonyme, tout le monde est anonyme : noms masqués pour tous, toi compris." : "Dans un groupe normal, les membres apparaissent avec leur nom.") + ' Ce choix est définitif.</p><label>Membres</label><div class="chips">' + gnew.sel.map(u => '<span class="chip" data-r="' + u.id + '">' + esc(u.nom || u.pseudo) + ' ✕</span>').join("") + '</div><input id="gq" placeholder="Chercher un étudiant à ajouter"><div id="gsr"></div><button id="gok"' + (sending ? " disabled" : "") + '>' + (sending ? "Création…" : "Créer le groupe") + '</button>' + err + '</div>';
  $("#gx").onclick = () => { gcreate = false; msgMsg = ""; render(); };
  $("#gph").onchange = e => { const f = e.target.files[0]; gnew.file = f && f.size <= 10 * 1024 * 1024 ? f : null; msgMsg = f && !gnew.file ? "Photo trop lourde (10 Mo max)." : ""; render(); };
  $("#gnm").oninput = e => { gnew.nom = e.target.value; };
  $("#gt0").onclick = () => { gnew.anon = false; render(); };
  $("#gt1").onclick = () => { gnew.anon = true; render(); };
  $("#gq").oninput = e => gSearch(e.target.value);
  document.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { gnew.sel = gnew.sel.filter(x => x.id !== b.dataset.r); render(); });
  $("#gok").onclick = createG;
}
async function createG(){
  const nom = gnew.nom.trim();
  if(!nom){ msgMsg = "Donne un nom au groupe."; return render(); }
  if(!gnew.sel.length){ msgMsg = "Ajoute au moins une personne."; return render(); }
  sending = true; msgMsg = ""; render();
  let id = null;
  try{
    await withAuth(async t => {
      const up = gnew.file ? await upMedia(t, gnew.file, "grp") : null;
      const r = await sb("/rest/v1/groupes", {method:"POST", headers:{Prefer:"return=representation"}, body:JSON.stringify({nom, anonyme:gnew.anon, photo_url:up ? up.url : null})}, t);
      id = r[0].id;
      await sb("/rest/v1/groupe_membres", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify([{groupe:id, membre:session.id}, ...gnew.sel.map(u => ({groupe:id, membre:u.id}))])}, t);
    });
    gcreate = false; gnew = {nom:"", anon:false, sel:[]};
  }catch(e){ msgMsg = e.message; }
  sending = false; render();
  if(id){ await loadConvs(); const c = convs.find(x => x.peer.id === id); if(c) openGChat(c.peer); }
}
function openGChat(p){
  gok = ""; gadd = false; peer = p; mtab = "grp"; markRead(p.id); gmsgs = []; mdraft = ""; mfile = null; msgMsg = ""; dk = ""; eph = null; sel = null; chatLoaded = true;
  render(); loadChat();
  clearInterval(poll); poll = setInterval(() => { if(tab === "msg" && peer) loadChat(); }, 4000);
}
async function loadGChat(){
  if(!peer) return;
  try{
    const m = await withAuth(t => sb("/rest/v1/groupe_messages_vue?select=*&groupe=eq." + peer.id + "&order=created_at.asc&limit=200", {}, t));
    const pf = prefs[peer.id]; gmsgs = pf && pf.masque_avant ? m.filter(x => new Date(x.created_at) > new Date(pf.masque_avant)) : m;
    await signMsgs(gmsgs);
  }catch(e){ return; }
  drawGMsgs();
}
async function patchG(id, patch){
  try{ await withAuth(t => sb("/rest/v1/groupe_messages?id=eq." + id, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify(patch)}, t)); await loadGChat(); }
  catch(e){ msgMsg = e.message; render(); }
}
function drawGMsgs(){
  const el = $("#ml"); if(!el) return;
  const key = gmsgs.map(x => x.id + (x.modifie ? "m" : "") + (x.supprime ? "d" : "")).join("|") + "#" + sel;
  if(key === dk) return;
  const first = dk === ""; dk = key;
  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  el.innerHTML = gmsgs.map(x => {
    const mine = x.est_moi, live = mine && !x.supprime, rpt = !mine && !x.supprime;
    const who = !mine ? '<small class="sn">' + esc(x.nom || (peer.anonyme ? "Anonyme" : "Étudiant")) + '</small>' : '';
    const body = x.supprime ? '<span class="del">🚫 Ce message a été supprimé</span>' : (x.texte ? '<span>' + esc(x.texte) + '</span>' : '') +
      msgMediaHtml(x);
    const act = live && sel === x.id ? '<div class="ma"><button data-me="' + x.id + '">✏️ Modifier</button><button data-md="' + x.id + '">🗑 Supprimer pour tous</button></div>' : (rpt && sel === x.id ? '<div class="ma"><button data-rp="' + (peer.grp ? "message_groupe" : "message") + ':' + x.id + '" data-ex="' + esc((x.texte || "").slice(0, 200)) + '">⚑ Signaler</button></div>' : '');
    return '<div class="b' + (mine ? " me" : "") + '"' + (live || rpt ? ' data-b="' + x.id + '"' : '') + '>' + who + body + '<small>' + (x.modifie && !x.supprime ? "modifié · " : "") + new Date(x.created_at).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"}) + '</small>' + act + '</div>';
  }).join("") || '<p class="pt c">Écris le premier message 👋</p>';
  if(near || first) el.scrollTop = el.scrollHeight;
  el.querySelectorAll("[data-b]").forEach(b => b.onclick = ev => { if(ev.target.closest("button")) return; sel = sel === b.dataset.b ? null : b.dataset.b; drawGMsgs(); });
  el.querySelectorAll("[data-me]").forEach(b => b.onclick = async () => {
    const x = gmsgs.find(y => y.id === b.dataset.me), n = prompt("Modifier le message", x.texte || "");
    if(n === null || (!n.trim() && !x.media_url)) return;
    sel = null; await patchG(x.id, {texte:n.trim() || null, modifie:true});
  });
  el.querySelectorAll("[data-md]").forEach(b => b.onclick = async () => {
    if(!confirm("Supprimer ce message pour tout le monde ?")) return;
    sel = null; await patchG(b.dataset.md, {supprime:true, texte:null, media_url:null, media_type:null});
  });
}
const sheetRow = (id, ic2, lab, cls, extra) => '<button class="srow' + (cls ? " " + cls : "") + '" id="' + id + '"' + (extra || "") + '>' + ico20(ic2) + '<span>' + lab + '</span>' + (cls ? "" : '<span class="ch">' + ico20(PIC.chev) + '</span>') + '</button>';
async function gInfo(){
  let mem = [];
  try{ mem = await withAuth(t => sb("/rest/v1/groupe_gestion_vue?select=*&groupe=eq." + peer.id, {}, t)); }catch(e){}
  const moi = mem.find(m => m.moi); if(moi) peer.admin = !!moi.admin;
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><div class="gih"><div class="gav">' + clubAv(peer.photo, peer.nom, "") + (peer.admin ? '<label class="gcb" aria-label="Changer la photo" title="Changer la photo">' + ico20(PIC.cam) + '<input type="file" id="gph" accept="image/*" hidden></label>' : '') + '</div><b style="font-size:18px">' + esc(peer.nom) + '</b><span class="chip">' + (peer.anonyme ? "Groupe anonyme" : "Groupe") + '</span><small class="pt">' + peer.nb + ' / 150 membres' + (peer.admin ? " · tu es admin" : "") + '</small>' + (peer.anonyme ? '<small class="pt">Personne ne voit qui est membre ni qui écrit.</small>' : '') + '</div>' +
    sheetRow("gmb", PIC.users, "Membres") + (peer.admin ? sheetRow("gad", PIC.userplus, "Ajouter des personnes") + sheetRow("glk", PIC.link, "Lien d’invitation") + sheetRow("gnm", PIC.edit, "Modifier le nom") : '') +
    sheetRow("grp", PIC.flag, "Signaler ce groupe", "", ' data-rp="groupe:' + peer.id + '"').replace('<span class="ch">' , '<span class="ch">') + sheetRow("gq2", PIC.logout, "Quitter le groupe", "dg") + '<button class="t" id="gx2" style="margin-top:6px">Fermer</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove();
  d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#gx2").onclick = close;
  d.querySelector("#gmb").onclick = () => { close(); gManage(); };
  if(peer.admin){
    d.querySelector("#gad").onclick = () => { close(); openGAdd(); };
    d.querySelector("#glk").onclick = () => { close(); gLink("get"); };
    d.querySelector("#gnm").onclick = () => { close(); gRename(); };
    d.querySelector("#gph").onchange = async e => {
      const f = e.target.files[0]; e.target.value = ""; if(!f) return;
      if(f.size > 10 * 1024 * 1024){ alert("Image trop lourde (10 Mo max)."); return; }
      const cf = await cropPhoto(f, 1, 640, true); if(!cf) return;
      try{ const up = await withAuth(t => upMedia(t, cf, "avatars")); await rp2("groupe_modifier", {p_groupe:peer.id, p_photo:up.url}); peer.photo = up.url; close(); render(); loadConvs(); gInfo(); }catch(err){ alert(/groupe_modifier|function|schema cache/i.test(err.message) ? "Cette fonction n’est pas encore activée sur ce site." : err.message); }
    };
  }
  d.querySelector("#gq2").onclick = async () => {
    close(); if(!confirm("Quitter ce groupe ?")) return;
    try{ await rp2("groupe_quitter", {p_groupe:peer.id}); }catch(e){ msgMsg = e.message; return render(); }
    clearInterval(poll); peer = null; render(); loadConvs();
  };
}
function gRename(){
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><b>Modifier le nom du groupe</b><input id="gnn" maxlength="60" value="' + esc(peer.nom) + '"><button id="gns">Enregistrer</button><button class="t" id="gnx">Annuler</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove(); d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#gnx").onclick = close;
  d.querySelector("#gns").onclick = async () => { const n = d.querySelector("#gnn").value.trim(); if(n.length < 2){ alert("Le nom doit contenir au moins 2 caractères."); return; } try{ await rp2("groupe_modifier", {p_groupe:peer.id, p_nom:n}); peer.nom = n; close(); render(); loadConvs(); }catch(e){ alert(e.message); } };
}
async function gLink(act){
  let r; try{ r = await rp2("groupe_lien", {p_groupe:peer.id, p_action:act || "get"}); }catch(e){ alert(/groupe_lien|function|schema cache/i.test(e.message) ? "Le lien d’invitation n’est pas encore activé sur ce site." : e.message); return; }
  const x = (r && r[0]) || {}, url = x.actif && x.code ? location.origin + location.pathname + "#g=" + x.code : "";
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><b>Lien d’invitation</b>' + (url ? '<p class="pt">Toute personne qui ouvre ce lien peut rejoindre « ' + esc(peer.nom) + ' » (150 membres maximum).</p><input id="glu" readonly value="' + esc(url) + '"><div class="pbt"><button class="g" id="glc">Copier</button><button id="gls">Partager</button></div>' + sheetRow("glr", PIC.link, "Réinitialiser le lien") + sheetRow("gld", PIC.logout, "Désactiver le lien", "dg") : '<p class="pt">Le lien d’invitation est désactivé. Active-le pour inviter tes amis sans les ajouter un par un.</p><button id="gla">Activer le lien</button>') + '<button class="t" id="glx" style="margin-top:6px">Fermer</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove(); d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#glx").onclick = close;
  const again = a => () => { close(); gLink(a); };
  if(url){
    d.querySelector("#glc").onclick = async () => { try{ await navigator.clipboard.writeText(url); d.querySelector("#glc").textContent = "Copié ✓"; }catch(e){ d.querySelector("#glu").select(); } };
    d.querySelector("#gls").onclick = async () => { const text = "Rejoins le groupe « " + peer.nom + " » sur ALapp"; if(navigator.share){ try{ await navigator.share({title:"ALapp", text, url}); }catch(e){} } else { try{ await navigator.clipboard.writeText(url); d.querySelector("#glc").textContent = "Copié ✓"; }catch(e){} } };
    d.querySelector("#glr").onclick = () => { if(confirm("Réinitialiser le lien ? L’ancien lien ne fonctionnera plus.")) again("renouveler")(); };
    d.querySelector("#gld").onclick = again("desactiver");
  }else d.querySelector("#gla").onclick = again("activer");
}
let groupShared = (location.hash.match(/^#g=([0-9a-f]{8,32})$/i) || [])[1] || null;
async function joinGroupFlow(code){
  let g = null; try{ const r = await rp2("groupe_apercu", {p_code:code}); g = r && r[0]; }catch(e){}
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = g ? '<div class="sc"><div class="gih"><div class="gav">' + clubAv(g.photo_url, g.nom, "") + '</div><b style="font-size:18px">' + esc(g.nom) + '</b><span class="chip">' + (g.anonyme ? "Groupe anonyme" : "Groupe") + '</span><small class="pt">' + g.nb + ' / 150 membres</small><small class="pt">Tu es invité(e) à rejoindre ce groupe.</small></div>' + (g.deja_membre ? '' : '<button id="jok">Rejoindre le groupe</button>') + '<button class="g" id="jx">' + (g.deja_membre ? "Fermer" : "Annuler") + '</button></div>' : '<div class="sc"><b>Lien invalide</b><p class="pt">Ce lien d’invitation n’est plus valide ou a été désactivé.</p><button id="jx">Fermer</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove(); d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#jx").onclick = close;
  const ok = d.querySelector("#jok");
  if(ok) ok.onclick = async () => {
    ok.disabled = true; ok.textContent = "Un instant…";
    try{ await rp2("groupe_rejoindre", {p_code:code}); close(); tab = "msg"; mtab = "grp"; openGChat({id:g.id, nom:g.nom, pseudo:"", grp:true, anonyme:g.anonyme, nb:+g.nb + 1, photo:g.photo_url, admin:false}); loadConvs(); }
    catch(e){ alert(e.message); ok.disabled = false; ok.textContent = "Rejoindre le groupe"; }
  };
}
async function gManage(){
  let mem = [];
  try{ mem = await withAuth(t => sb("/rest/v1/groupe_gestion_vue?select=*&groupe=eq." + peer.id + "&order=num.asc", {}, t)); }catch(e){}
  const adm = mem.some(m => m.moi && m.admin); peer.admin = adm; peer.nb = mem.length || peer.nb;
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><b>Membres (' + mem.length + ' / 150)</b><div style="max-height:55vh;overflow:auto">' + mem.map(m => '<div class="cv"><div><b>' + esc(m.nom || "Étudiant") + (m.moi ? " (toi)" : "") + '</b>' + (m.admin ? ' <span class="tg">Admin</span>' : '') + '</div></div>' + (adm && !m.moi ? '<div class="row"><button class="t" data-ga="' + m.num + ':' + (m.admin ? 0 : 1) + '">' + (m.admin ? "Retirer admin" : "Nommer admin") + '</button><button class="t dg" data-gr="' + m.num + '">Retirer du groupe</button></div>' : '')).join("") + '</div><button class="t" id="gx3">Fermer</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove();
  d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#gx3").onclick = close;
  d.querySelectorAll("[data-ga]").forEach(b => b.onclick = async () => {
    const [n, f] = b.dataset.ga.split(":"); close();
    try{ await rp2("groupe_nommer_admin", {p_groupe:peer.id, p_num:+n, p_admin:f === "1"}); }catch(e){ msgMsg = e.message; return render(); }
    gManage();
  });
  d.querySelectorAll("[data-gr]").forEach(b => b.onclick = async () => {
    if(!confirm("Retirer ce membre du groupe ?")) return; close();
    try{ await rp2("groupe_retirer", {p_groupe:peer.id, p_num:+b.dataset.gr}); }catch(e){ msgMsg = e.message; return render(); }
    gManage();
  });
}
function renderGChat(){
  const err = msgMsg ? '<div class="msg">' + esc(msgMsg) + '</div>' : (gok ? '<div class="msg ok">' + esc(gok) + '</div>' : '');
  app.innerHTML = '<div class="nav"><button class="t" id="bk">← Retour</button><b>' + (peer.photo ? '<span class="av s" style="display:inline-block;vertical-align:middle;margin:0 8px 0 0;background-image:url(' + esc(peer.photo) + ')"></span>' : '') + esc(peer.nom) + '</b><button class="t" id="gi">ⓘ</button></div><div class="pt c hint">' + (peer.anonyme ? "🕶️ Groupe anonyme" : "👥 Groupe") + ' · ' + peer.nb + ' membres</div><div id="ml" class="ml"></div>' +
    '<div class="cbar"><div id="em" class="em" hidden>' + EMO.map(e => '<button class="t" data-e="' + e + '">' + e + '</button>').join("") + '</div>' + (mfile ? '<div class="pt fn">📎 ' + esc(mfile.name) + '</div>' : '') + '<div class="row"><button class="ib t" id="eb">😊</button><label class="ib">📎<input type="file" id="mf" accept="' + MSG_ACCEPT + '" hidden></label><textarea id="mt" rows="1" placeholder="Message">' + esc(mdraft) + '</textarea><button class="ib send" id="ms">➤</button></div>' + err + '</div>';
  dk = ""; drawGMsgs();
  $("#bk").onclick = async () => { await markRead(peer.id); clearInterval(poll); peer = null; render(); loadConvs(); };
  $("#gi").onclick = gInfo;
  $("#mt").oninput = e => { mdraft = e.target.value; e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; };
  $("#eb").onclick = () => { $("#em").hidden = !$("#em").hidden; };
  document.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { const t = $("#mt"); t.value += b.dataset.e; mdraft = t.value; });
  $("#mf").onchange = e => { const f = e.target.files[0]; if(f && f.size > MSG_MAX){ msgMsg = "Fichier trop lourd (50 Mo maximum)."; mfile = null; } else { mfile = f || null; msgMsg = ""; } render(); };
  $("#ms").onclick = sendMsg;
}

