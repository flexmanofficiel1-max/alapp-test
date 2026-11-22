let adm = {stats:null, jr:[], res:[], q:""};
async function loadAdmin(){
  try{ adm.stats = await rp2("admin_stats"); }catch(e){ adm.stats = null; }
  try{ adm.jr = await rp2("admin_journal") || []; }catch(e){ adm.jr = []; }
  if(tab === "admin") render();
}
function adResHtml(){
  return adm.res.length ? adm.res.map(u => '<div class="cv" data-au="' + u.id + '"><div><b>' + esc(u.nom || u.pseudo) + '</b>' + (u.suspendu ? ' <span class="tg">Suspendu</span>' : '') + '<div class="pt">@' + esc(u.pseudo) + ' · ' + esc(u.email || "") + '</div></div></div>').join("") : (adm.q ? '<small>Aucun résultat.</small>' : "");
}
function bindAdRes(){ document.querySelectorAll("[data-au]").forEach(b => b.onclick = () => adAccount(adm.res.find(u => u.id === b.dataset.au))); }
async function adSearch(){
  adm.q = ($("#adq") ? $("#adq").value : adm.q).trim();
  try{ adm.res = await rp2("admin_chercher", {p_q:adm.q}) || []; }catch(e){ adm.res = []; alert(e.message); }
  const el = $("#adres"); if(el){ el.innerHTML = adResHtml(); bindAdRes(); }
}
function adAccount(u){
  if(!u) return;
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><b>' + esc(u.nom || u.pseudo) + '</b><p class="pt">@' + esc(u.pseudo) + ' · ' + esc(u.email || "") + '</p><p class="pt">' + esc(u.universite || "—") + ' · ' + u.abonnes + ' abonné(s) · ' + u.sanctions + ' sanction(s)' + (u.niveau ? ' · certifié (niveau ' + u.niveau + ')' : '') + '</p>' + (u.suspendu ? '<button id="adlv">Lever la suspension</button>' : '<button class="dg" id="adsp">Suspendre…</button>') + '<button class="t" id="adav">Avertir…</button><button class="t" id="adx">Fermer</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove(); d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#adx").onclick = close;
  const act = async (fn, a) => { close(); try{ await rp2(fn, a); }catch(e){ alert(e.message); } await adSearch(); loadAdmin(); };
  const sp = d.querySelector("#adsp"); if(sp) sp.onclick = () => { const m = prompt("Motif de la suspension"); if(!m) return; const j = parseInt(prompt("Durée en jours (0 = illimitée)", "7"), 10); if(isNaN(j)) return; act("admin_sanction_direct", {p_user:u.id, p_type:"suspension", p_motif:m, p_jours:j}); };
  const lv = d.querySelector("#adlv"); if(lv) lv.onclick = () => { const m = prompt("Motif de la levée de suspension"); if(m) act("admin_lever_suspension", {p_user:u.id, p_motif:m}); };
  d.querySelector("#adav").onclick = () => { const m = prompt("Motif de l’avertissement"); if(m) act("admin_sanction_direct", {p_user:u.id, p_type:"avertissement", p_motif:m, p_jours:0}); };
}
function renderAdmin(){
  const st = adm.stats || {};
  const card = (n, l) => '<div class="card" style="text-align:center;padding:12px 6px;margin:0"><b style="font-size:22px">' + (n == null ? "–" : n) + '</b><small style="display:block">' + l + '</small></div>';
  app.innerHTML = topbar("Administration") +
    '<h4 class="sec">Statistiques</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + card(st.comptes, "Comptes") + card(st.nouveaux_7j, "Nouveaux (7 j)") + card(st.publications_7j, "Publications (7 j)") + card(st.groupes, "Groupes") + card(st.signalements_nouveaux, "Signalements à traiter") + card(st.suspensions_actives, "Suspensions actives") + card(st.certifies, "Comptes certifiés") + '</div>' +
    '<button id="adpts" style="margin:12px 0 0">Points, jeux et fraude</button><h4 class="sec">Rechercher un compte</h4><div class="card"><input id="adq" placeholder="Nom, pseudo ou e-mail" value="' + esc(adm.q) + '"><button id="adgo">Rechercher</button><div id="adres">' + adResHtml() + '</div></div>' +
    '<h4 class="sec">Journal des actions</h4><div class="card">' + (adm.jr.length ? adm.jr.map(j => '<div style="padding:6px 0;border-bottom:1px solid #eee"><small>' + agoL(j.quand) + ' · ' + esc(j.admin_nom || "Admin") + '</small><div><b>' + esc(j.action) + '</b> → ' + esc(j.cible_nom || "—") + (j.details ? ' <small>« ' + esc(j.details) + ' »</small>' : '') + '</div></div>').join("") : '<small>Aucune action enregistrée.</small>') + '</div>';
  $("#cb").onclick = () => { tab = "settings"; render(); loadSettings(); };
  $("#adpts").onclick = () => { tab = "admpts"; ap.msg = ""; render(); loadAdmPts(); };
  $("#adgo").onclick = adSearch; $("#adq").onkeydown = e => { if(e.key === "Enter") adSearch(); };
  bindAdRes();
}

function renderReports(){
  const rn = x => x ? (x.nom || x.pseudo || "Étudiant") : "—", L = repl.filter(r => r.statut === rfil);
  app.innerHTML = topbar("Signalements") + '<div class="fch">' + [["nouveau", "Nouveaux"], ["en_cours", "En cours"], ["traite", "Traités"], ["rejete", "Rejetés"]].map(c => '<span class="fc' + (rfil === c[0] ? " on" : "") + '" data-rf="' + c[0] + '">' + c[1] + ' (' + repl.filter(r => r.statut === c[0]).length + ')</span>').join("") + '</div>' +
    (L.length ? L.map(r => '<div class="card"><small>' + esc(r.type_cible) + ' · ' + agoL(r.created_at) + '</small><p style="margin:4px 0;font-weight:600">' + esc(r.raison) + '</p>' + (r.details ? '<p style="margin:0 0 4px">' + esc(r.details) + '</p>' : '') + (r.extrait ? '<p style="margin:0 0 4px;background:var(--bg);padding:6px 8px;border-radius:10px;font-size:13px">« ' + esc(r.extrait) + ' »</p>' : '') + '<small style="display:block">Signalé par ' + esc(rn(r.s)) + ' · Auteur : ' + esc(rn(r.a)) + '</small><div class="ac" style="flex-wrap:wrap"><button class="t" data-rs="' + r.id + ':en_cours">En cours</button><button class="t" data-rs="' + r.id + ':traite">Traité</button><button class="t" data-rs="' + r.id + ':rejete">Rejeté</button><button class="t dng" data-rr="' + r.id + '">Retirer le contenu</button>' + (r.type_cible === "message_groupe" ? '<button class="t" data-rl="' + r.id + '">Lever l’anonymat</button>' : '') + '<button class="t" data-rw="' + r.id + '">Avertir</button><button class="t dng" data-rb="' + r.id + '">Suspendre 7 j</button></div></div>').join("") : '<div class="empty">Aucun signalement.</div>');
  const rpc = async (fn, body) => { try{ await withAuth(t => sb("/rest/v1/rpc/" + fn, {method:"POST", body:JSON.stringify(body)}, t)); }catch(e){ alert(e.message); } loadReports(); };
  $("#cb").onclick = () => { tab = "settings"; render(); loadSettings(); };
  document.querySelectorAll("[data-rf]").forEach(b => b.onclick = () => { rfil = b.dataset.rf; render(); });
  document.querySelectorAll("[data-rs]").forEach(b => b.onclick = () => { const [id, st] = b.dataset.rs.split(":"); rpc("admin_statut", {p_id:id, p_statut:st}); });
  document.querySelectorAll("[data-rr]").forEach(b => b.onclick = () => { if(confirm("Retirer ce contenu ? Cette action est définitive.")) rpc("admin_retirer", {p_id:b.dataset.rr}); });
  document.querySelectorAll("[data-rw]").forEach(b => b.onclick = () => { const m = prompt("Motif de l’avertissement"); if(m) rpc("admin_sanction", {p_sig:b.dataset.rw, p_type:"avertissement", p_motif:m, p_jours:0}); });
  document.querySelectorAll("[data-rl]").forEach(b => b.onclick = async () => { const m = prompt("Motif de la levée d’anonymat (10 caractères minimum). Cette action est enregistrée dans le journal."); if(!m) return; try{ const r = await rp2("admin_lever_anonymat", {p_sig:b.dataset.rl, p_motif:m}); alert("Auteur : " + r); }catch(e){ alert(e.message); } });
  document.querySelectorAll("[data-rb]").forEach(b => b.onclick = () => { const m = prompt("Motif de la suspension (7 jours)"); if(m) rpc("admin_sanction", {p_sig:b.dataset.rb, p_type:"suspension", p_motif:m, p_jours:7}); });
}

