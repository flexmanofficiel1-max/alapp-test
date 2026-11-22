// ----- portefeuille de points
let myPts = 0, pf = null;
async function loadPoints(){
  try{ const r = await withAuth(t => sb("/rest/v1/points_solde?utilisateur=eq." + session.id + "&select=total", {}, t)); myPts = (r && r[0] && r[0].total) || 0; }catch(e){}
  if(tab === "profile" && !editing) render();
}
async function loadPortefeuille(){
  loadDist();
  try{ pf = await rpc("portefeuille"); }catch(e){ pf = {err:/portefeuille|function|schema cache/i.test(e.message) ? "Les points ne sont pas encore activés sur ce site." : e.message}; }
  if(tab === "points") render();
}
const PLBL = {partage_externe:"Partage externe validé", fidelite:"Fidélité hebdomadaire", like_story:"Like reçu sur un statut", correction:"Correction"};
function renderPoints(){
  const back = '<div class="nav"><button class="t" id="ptb">← Retour</button><b>Mes points</b></div>';
  const bind = () => { const b = $("#ptb"); if(b) b.onclick = () => go("profile"); };
  if(!pf){ app.innerHTML = back + '<p class="pt c">Chargement…</p>'; return bind(); }
  if(pf.err){ app.innerHTML = back + '<p class="pt c">' + esc(pf.err) + '</p>'; return bind(); }
  const f = pf.fid || {jours:[], actifs:0, requis:4, pts:15}, bar = pf.bareme || {}, J = ["L", "M", "M", "J", "V", "S", "D"];
  const L = [["Like reçu sur une publication", "+1"], ["Commentaire reçu", "+2"], ["Like reçu sur un statut", "+" + (bar.pts_like_story || 1)], ["Partage externe validé", "+" + (bar.pts_partage || 10)], ["Fidélité hebdomadaire", "+" + (bar.pts_fidelite || 15)]];
  app.innerHTML = back + distHtml(false) + '<div class="card c ptc"><small>Total de tes points</small><div class="ptn">' + nf(pf.total) + '</div><small>+' + (pf.semaine || 0) + ' cette semaine · +' + (pf.aujourdhui || 0) + ' aujourd’hui</small></div>' +
    '<div class="card"><b>Fidélité de la semaine</b><p class="s" style="margin:6px 0">Sois actif au moins ' + f.requis + ' jours cette semaine pour gagner ' + f.pts + ' points. Ouvrir l’application ne suffit pas : publie, commente, aime, écris ou consulte des contenus.</p><div class="fdr">' + (f.jours || []).map((a, i) => '<span class="fd' + (a ? " on" : "") + '">' + J[i] + '</span>').join("") + '</div><small class="pt">' + f.actifs + ' / ' + f.requis + ' jours actifs</small></div>' +
    '<h4 class="sec">Comment gagner des points</h4><div class="card">' + L.map(x => '<div class="hrow"><span>' + x[0] + '</span><b class="pos">' + x[1] + '</b></div>').join("") + '</div>' +
    '<h4 class="sec">Historique</h4><div class="card">' + ((pf.historique || []).length ? pf.historique.map(h => '<div class="hrow"><div><b>' + esc(h.motif || PLBL[h.action] || h.action) + '</b><small>' + agoL(h.created_at) + (h.annule ? " · annulé" : "") + '</small></div><b class="' + (h.points < 0 ? "neg" : "pos") + '">' + (h.points > 0 ? "+" : "") + h.points + '</b></div>').join("") : '<p class="pt c">Aucun point pour l’instant. Publie, partage ou participe pour en gagner !</p>') + '</div>';
  bind();
}
// ----- ALAPP BRAIN : jeux intellectuels
let brain = null, brainBusy = false;
const BCAT = {culture:"Culture générale", logique:"Logique et raisonnement", maths:"Mathématiques", sciences:"Sciences et technologies", francais:"Français et vocabulaire", anglais:"Anglais et langues", histoire_geo:"Histoire et géographie", innovation:"Innovation et créativité", universitaire:"Défis universitaires"};
const BTYP = {quiz:"Quiz", enigme:"Énigme", defi:"Défi de la semaine"};
const brainDay = () => new Date().toLocaleDateString("en-CA");
const brainFini = () => !!session && store.get("brain_" + session.id) === brainDay();
function brainMarque(L){ if(!session) return; if(!L.length || L.every(x => x.repondu)) store.set("brain_" + session.id, brainDay()); else store.del("brain_" + session.id); }
const brainCard = () => brainFini() ? "" : '<div class="brc" id="brc" role="button" aria-label="Ouvrir ALAPP BRAIN"><div class="brl">🧠</div><div style="flex:1;min-width:0"><b>ALAPP BRAIN</b><small>Quiz, énigmes et défis : joue chaque jour et gagne des points</small></div><span class="brg">Jouer</span></div>';
async function loadBrain(){
  try{ brain = {items:(await rpc("brain_du_jour")) || []}; brainMarque(brain.items); }
  catch(e){ brain = {err:/brain_du_jour|function|schema cache/i.test(e.message) ? "ALAPP BRAIN n’est pas encore activé sur ce site." : e.message}; }
  if(tab === "brain") render();
}
function renderBrain(){
  const back = '<div class="nav"><button class="t" id="brb">← Retour</button><b>ALAPP BRAIN</b></div>';
  const bindBack = () => { const b = $("#brb"); if(b) b.onclick = () => go("feed"); };
  if(!brain){ app.innerHTML = back + '<p class="pt c">Chargement…</p>'; return bindBack(); }
  if(brain.err){ app.innerHTML = back + '<p class="pt c">' + esc(brain.err) + '</p>'; return bindBack(); }
  const L = brain.items, fait = L.filter(x => x.repondu).length, gagne = L.reduce((a, x) => a + (+x.gagne || 0), 0);
  const cards = L.map(it => {
    const opts = (it.choix || []).map((c, i) => { let cls = ""; if(it.repondu) cls = i === it.bonne ? " ok" : i === it.mon_choix ? " ko" : " dim"; return '<button class="bopt' + cls + '"' + (it.repondu ? " disabled" : ' data-bo="' + it.q_id + ":" + i + '"') + '>' + esc(c) + '</button>'; }).join("");
    const res = !it.repondu ? "" : '<div class="bres ' + (it.correcte ? "ok" : "ko") + '"><b>' + (it.correcte ? (it.gagne > 0 ? "✓ Bonne réponse ! +" + it.gagne + " points" : "✓ Bonne réponse ! (limite de points du jour atteinte)") : "✗ Raté. Bonne réponse : " + esc((it.choix || [])[it.bonne] || "")) + '</b>' + (it.explication ? '<p>' + esc(it.explication) + '</p>' : '') + '</div>';
    return '<div class="card bq"><div class="bqh"><span class="chip">' + esc(BCAT[it.categorie] || it.categorie) + '</span><span class="chip bt' + (it.type === "defi" ? " df" : "") + '">' + esc(BTYP[it.type] || it.type) + ' · +' + it.recompense + '</span></div><p class="bqe">' + esc(it.enonce) + '</p>' + opts + res + '</div>';
  }).join("");
  app.innerHTML = back + '<div class="card c ptc"><small>Tes jeux du jour</small><div class="ptn">' + fait + ' / ' + L.length + '</div><small>' + (gagne ? "+" + gagne + " points gagnés" : "Réponds pour gagner des points") + '</small></div>' +
    (cards || '<p class="pt c">Aucune question disponible pour l’instant. Reviens demain !</p>') +
    (L.length && fait === L.length ? '<div class="card c"><b>Bravo 🎉</b><p class="s" style="margin:6px 0 0">Tu as terminé les jeux du jour. Reviens demain pour de nouvelles questions.</p></div>' : '');
  bindBack();
  document.querySelectorAll("[data-bo]").forEach(b => b.onclick = async () => {
    if(brainBusy) return; const [qid, idx] = b.dataset.bo.split(":"), it = brain.items.find(x => x.q_id === qid); if(!it || it.repondu) return;
    brainBusy = true;
    try{ const r = await rpc("brain_repondre", {p_question:qid, p_choix:+idx}), x = r && r[0]; it.repondu = true; it.mon_choix = +idx; it.correcte = !!x.ok; it.bonne = x.bonne_reponse; it.explication = x.explic; it.gagne = x.gain; loadPoints(); loadDist(); }
    catch(e){ alert(e.message); }
    brainBusy = false; brainMarque(brain.items); render();
  });
}
// ----- administration : points, jeux et fraude
let ap = {v:null, qs:[], msg:"", err:"", q:"", res:null, f:{categorie:"culture", type:"quiz", enonce:"", c:["", "", "", ""], bonne:0, explication:""}};
const REG = [["pts_like","Like reçu sur une publication"],["pts_commentaire","Commentaire reçu"],["pts_like_story","Like reçu sur un statut"],["pts_partage","Partage externe validé"],["pts_fidelite","Fidélité hebdomadaire"],["pts_quiz","Bonne réponse à un quiz"],["pts_enigme","Énigme réussie"],["pts_defi","Défi hebdomadaire"],["plafond_jour","Plafond du jour (interactions)"],["plafond_partage_jour","Partages récompensés par jour"],["plafond_jeux_jour","Plafond du jour (jeux)"],["fid_jours","Jours actifs requis par semaine"],["fid_min_jour","Activités minimum par jour actif"],["quiz_par_jour","Quiz par jour"],["periode_mois_debut","Mois de début de l’année (1 = janvier)"]];
async function loadAdmPts(){
  ap.err = "";
  try{ ap.v = await rpc("admin_points_vue"); ap.qs = (await rpc("admin_questions", {p_limite:30})) || []; }
  catch(e){ ap.err = /admin_points_vue|function|schema cache/i.test(e.message) ? "Cette partie n’est pas encore activée sur ce site." : e.message; }
  if(tab === "admpts") render();
}
async function apDo(fn, ok){ try{ await fn(); ap.msg = ok || "Enregistré ✓"; }catch(e){ ap.msg = ""; alert(e.message); } await loadAdmPts(); }
function renderAdmPts(){
  const back = '<div class="nav"><button class="t" id="apb">← Retour</button><b>Points et jeux</b></div>';
  const bind0 = () => { const b = $("#apb"); if(b) b.onclick = () => { tab = "admin"; render(); loadAdmin(); }; };
  if(ap.err){ app.innerHTML = back + '<p class="pt c">' + esc(ap.err) + '</p>'; return bind0(); }
  const v = ap.v; if(!v){ app.innerHTML = back + '<p class="pt c">Chargement…</p>'; return bind0(); }
  const P = v.params || {}, f = ap.f, st = (n, l) => '<div class="card" style="text-align:center;padding:12px 6px;margin:0"><b style="font-size:22px">' + n + '</b><small style="display:block">' + l + '</small></div>';
  const reg = REG.map(r => '<div class="hrow"><span>' + r[1] + '</span><input type="number" class="apin" data-rg="' + r[0] + '" value="' + (P[r[0]] ?? "") + '"></div>').join("");
  const niv = (v.niveaux || []).map(n => '<div class="hrow"><span>' + esc(n.nom) + ' (points dans l’année)</span><input type="number" class="apin" data-nv="' + n.niveau + '" value="' + n.points_min + '"></div>').join("");
  const sus = (v.suspects || []).length ? v.suspects.map(x => '<div class="hrow"><div><b>' + esc(x.nom || x.pseudo) + '</b><small>' + esc(x.action) + ' · ' + agoL(x.created_at) + '</small></div><div style="display:flex;gap:8px;align-items:center"><b class="pos">+' + x.points + '</b><button class="sm g" data-an="' + x.id + '">Annuler</button></div></div>').join("") : '<p class="pt c" style="margin:0">Rien de suspect sur les dernières 24 heures.</p>';
  const rs = ap.res === null ? "" : ap.res === "aucun" ? '<p class="pt c">Aucun étudiant trouvé.</p>' : '<div style="margin-top:8px"><b>' + esc(ap.res.nom || ap.res.pseudo) + '</b> · ' + nf(ap.res.total) + ' points' + (ap.res.lignes || []).map(l => '<div class="hrow"><div><b>' + esc(l.motif || l.action) + '</b><small>' + agoL(l.created_at) + (l.annule ? " · annulé" : "") + '</small></div><div style="display:flex;gap:8px;align-items:center"><b class="' + (l.points < 0 ? "neg" : "pos") + '">' + (l.points > 0 ? "+" : "") + l.points + '</b>' + (!l.annule && l.points > 0 ? '<button class="sm g" data-an="' + l.id + '">Annuler</button>' : '') + '</div></div>').join("") + '</div>';
  const qs = (ap.qs || []).map(q => '<div class="hrow"><div style="min-width:0"><b style="font-size:13px">' + esc(q.enonce.slice(0, 70)) + (q.enonce.length > 70 ? "…" : "") + '</b><small>' + esc(BCAT[q.categorie] || q.categorie) + ' · ' + esc(BTYP[q.type] || q.type) + ' · ' + q.reponses + ' réponse(s)' + (q.actif ? "" : " · désactivée") + '</small></div><div style="display:flex;gap:6px"><button class="sm g" data-qt="' + q.id + '">' + (q.actif ? "Désactiver" : "Activer") + '</button><button class="sm g" data-qd="' + q.id + '">Suppr.</button></div></div>').join("");
  const sel = (id, o, cur) => '<select id="' + id + '">' + o.map(x => '<option value="' + x[0] + '"' + (x[0] === cur ? " selected" : "") + '>' + x[1] + '</option>').join("") + '</select>';
  app.innerHTML = back + (ap.msg ? '<div class="msg ok">' + esc(ap.msg) + '</div>' : '') +
    '<h4 class="sec">Vue d’ensemble</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + st(v.partages.crees, "Liens de partage créés") + st(v.partages.valides, "Partages validés") + st(v.jeux.questions, "Questions actives") + st(v.jeux.reponses_jour + " / " + v.jeux.bonnes_jour, "Réponses du jour / bonnes") + '</div>' +
    '<h4 class="sec">Fraude : gros gains sur 24 h</h4><div class="card">' + sus + '</div>' +
    '<h4 class="sec">Historique d’un étudiant</h4><div class="card"><input id="apq" placeholder="Pseudo ou nom" value="' + esc(ap.q) + '"><button id="apgo">Voir les points</button>' + rs + '</div>' +
    '<h4 class="sec">Classement général (top 10)</h4><div class="card">' + ((v.classement || []).length ? v.classement.map((x, i) => '<div class="hrow"><span>' + (i + 1) + '. ' + esc(x.nom || x.pseudo) + '</span><b class="pos">' + nf(x.total) + '</b></div>').join("") : '<p class="pt c" style="margin:0">Aucun point pour l’instant.</p>') + '</div>' +
    '<h4 class="sec">Fidélité</h4><div class="card">' + ((v.fidelite || []).length ? v.fidelite.map(x => '<div class="hrow"><span>Semaine du ' + esc(String(x.semaine).replace("fid:", "")) + '</span><b class="pos">' + x.nb + ' étudiant(s)</b></div>').join("") : '<p class="pt c" style="margin:0">Aucune semaine récompensée.</p>') + '<button class="g" id="apfid" style="margin-top:8px">Calculer la semaine passée maintenant</button></div>' +
    '<h4 class="sec">Barème et plafonds</h4><div class="card">' + reg + '</div>' +
    '<h4 class="sec">Seuils des certifications</h4><div class="card">' + niv + '</div>' +
    '<h4 class="sec">Ajouter une question</h4><div class="card">' + sel("afc", Object.entries(BCAT), f.categorie) + sel("aft", Object.entries(BTYP), f.type) + '<textarea id="afe" placeholder="Énoncé de la question">' + esc(f.enonce) + '</textarea>' + [0, 1, 2, 3].map(i => '<div style="display:flex;align-items:center;gap:8px"><input type="radio" name="afb" data-ab="' + i + '"' + (f.bonne === i ? " checked" : "") + ' style="width:auto;margin:0"><input class="afc" data-ac="' + i + '" placeholder="Choix ' + (i + 1) + (i < 2 ? "" : " (facultatif)") + '" value="' + esc(f.c[i]) + '"></div>').join("") + '<p class="s" style="margin:4px 0">Coche la bonne réponse.</p><textarea id="afx" placeholder="Explication affichée après la réponse">' + esc(f.explication) + '</textarea><button id="afs">Ajouter la question</button></div>' +
    '<h4 class="sec">Questions récentes</h4><div class="card">' + (qs || '<p class="pt c" style="margin:0">Aucune question.</p>') + '</div>';
  bind0();
  document.querySelectorAll("[data-rg]").forEach(i => i.onchange = () => apDo(() => rpc("admin_param_definir", {p_cle:i.dataset.rg, p_valeur:parseInt(i.value, 10)})));
  document.querySelectorAll("[data-nv]").forEach(i => i.onchange = () => apDo(() => rpc("admin_niveau_definir", {p_niveau:+i.dataset.nv, p_points:parseInt(i.value, 10)}), "Seuil modifié, certifications recalculées ✓"));
  document.querySelectorAll("[data-an]").forEach(b => b.onclick = () => { const m = prompt("Motif de l’annulation (obligatoire) :"); if(m) apDo(async () => { await rpc("admin_points_annuler", {p_id:b.dataset.an, p_motif:m}); if(ap.q) ap.res = await rpc("admin_points_de", {p_q:ap.q}) || "aucun"; }, "Points annulés ✓"); });
  $("#apq").oninput = e => { ap.q = e.target.value; };
  $("#apgo").onclick = async () => { try{ ap.res = (await rpc("admin_points_de", {p_q:ap.q})) || "aucun"; }catch(e){ alert(e.message); } render(); };
  $("#apfid").onclick = () => { if(confirm("Attribuer les 15 points de fidélité de la semaine passée aux étudiants admissibles ? (sans doublon)")) apDo(async () => { const n = await rpc("admin_fidelite_lancer"); ap.msg = n + " étudiant(s) récompensé(s) ✓"; }, ""); };
  $("#afc").onchange = e => { f.categorie = e.target.value; }; $("#aft").onchange = e => { f.type = e.target.value; };
  $("#afe").oninput = e => { f.enonce = e.target.value; }; $("#afx").oninput = e => { f.explication = e.target.value; };
  document.querySelectorAll(".afc").forEach(i => i.oninput = () => { f.c[+i.dataset.ac] = i.value; });
  document.querySelectorAll("[data-ab]").forEach(r => r.onchange = () => { f.bonne = +r.dataset.ab; });
  $("#afs").onclick = () => { const ch = f.c.map(x => x.trim()).filter(Boolean); if(ch.length < 2){ alert("Au moins 2 choix."); return; } const bonneTxt = f.c[f.bonne] && f.c[f.bonne].trim(), bi = ch.indexOf(bonneTxt); if(bi < 0){ alert("Coche une réponse remplie comme bonne réponse."); return; } apDo(async () => { await rpc("admin_question_ajouter", {p_categorie:f.categorie, p_type:f.type, p_enonce:f.enonce, p_choix:ch, p_bonne:bi, p_explication:f.explication}); ap.f = {categorie:f.categorie, type:f.type, enonce:"", c:["", "", "", ""], bonne:0, explication:""}; }, "Question ajoutée ✓"); };
  document.querySelectorAll("[data-qt]").forEach(b => b.onclick = () => { const q = ap.qs.find(x => x.id === b.dataset.qt); apDo(() => rpc("admin_question_etat", {p_id:q.id, p_actif:!q.actif})); });
  document.querySelectorAll("[data-qd]").forEach(b => b.onclick = () => { if(confirm("Supprimer cette question et ses réponses ?")) apDo(() => rpc("admin_question_supprimer", {p_id:b.dataset.qd}), "Question supprimée ✓"); });
}
