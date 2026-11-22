// ----- statuts de 24 heures
async function loadStories(){
  if(!session) return;
  const g = path => withAuth(t => sb(path, {}, t)).catch(() => null);
  const [rows, vues] = await Promise.all([
    g("/rest/v1/statuts_24h?select=*,profiles!statuts_24h_auteur_fkey(nom,pseudo)&expire_at=gt." + encodeURIComponent(new Date().toISOString()) + "&order=created_at.asc&limit=200"),
    g("/rest/v1/statut_vues?membre=eq." + session.id + "&select=statut")
  ]);
  if(!rows) return;
  seenSet = new Set((vues || []).map(x => x.statut));
  const m = {};
  rows.forEach(x => { if(blocked.has(x.auteur)) return; (m[x.auteur] = m[x.auteur] || {auteur:x.auteur, nom:cname(x), items:[]}).items.push(x); });
  stories = Object.values(m).sort((a, b) => (b.auteur === session.id) - (a.auteur === session.id));
  if((tab === "feed" || ((tab === "profile" || tab === "user") && !editing)) && !$("#svw") && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) render();
}
function storiesHtml(){
  const one = (g, i) => '<div data-sv="' + i + '" class="' + (g.auteur === session.id || g.items.every(x => seenSet.has(x.id)) ? "seen" : "") + '">' + avh(g.auteur, g.nom, "") + '<span>' + esc(g.auteur === session.id ? "Moi" : (g.nom || "").split(" ")[0]) + '</span></div>';
  return '<div class="st"><div id="stadd"><div class="av ad">+</div><span>Ton statut</span></div>' + stories.map(one).join("") + '</div>';
}
function bindStories(){
  const a = $("#stadd"); if(a) a.onclick = () => { stT = ""; stFile = null; feedMsg = ""; tab = "stnew"; render(); };
  document.querySelectorAll("[data-sv]").forEach(b => b.onclick = () => { sv = {gi:+b.dataset.sv, i:0}; showStory(); });
}
function closeStory(){ clearTimeout(svt); sv = null; const el = $("#svw"); if(el) el.remove(); }
function nextStory(){
  const g = stories[sv.gi];
  if(sv.i < g.items.length - 1) sv.i++; else if(sv.gi < stories.length - 1){ sv.gi++; sv.i = 0; } else { closeStory(); loadStories(); return; }
  showStory();
}
function prevStory(){ if(sv.i > 0) sv.i--; else if(sv.gi > 0){ sv.gi--; sv.i = 0; } showStory(); }
function showStory(){
  const g = stories[sv.gi]; if(!g){ closeStory(); return; }
  const it = g.items[sv.i], mine = g.auteur === session.id, vid = it.media_type === "video";
  if(!mine && !seenSet.has(it.id)){ seenSet.add(it.id); withAuth(t => sb("/rest/v1/statut_vues", {method:"POST", headers:{Prefer:"resolution=ignore-duplicates,return=minimal"}, body:JSON.stringify({statut:it.id})}, t)).catch(() => {}); }
  let el = $("#svw"); if(!el){ el = document.createElement("div"); el.id = "svw"; document.body.appendChild(el); }
  el.innerHTML = '<div class="svb">' + g.items.map((x, k) => '<i class="' + (k < sv.i ? "d" : k === sv.i ? "c" : "") + '"></i>').join("") + '</div><div class="svh">' + avh(g.auteur, g.nom, "s") + '<div><b>' + esc(mine ? "Ton statut" : g.nom) + '</b><small>' + agoL(it.created_at) + '</small></div><button class="ib" id="svx" aria-label="Fermer">✕</button></div><div class="svc">' + (it.media_url ? (vid ? '<video src="' + esc(it.media_url) + '" autoplay playsinline controls id="svv"></video>' : '<img src="' + esc(it.media_url) + '" alt="">') : '') + (it.texte ? '<p>' + esc(it.texte) + '</p>' : '') + '</div><div class="svl" id="svl"></div><div class="svr" id="svr"></div>' +
    (mine ? '<div class="svf"><span id="svn" style="color:#fff;font-weight:600;margin-right:10px"></span><button class="g" id="svd">Supprimer ce statut</button></div>' : '<div class="svf"><input id="svi" placeholder="Répondre…" autocomplete="off"><button class="ib" id="svk" aria-label="J’aime ce statut">' + pico(PIC.heart) + '</button><button class="ib send" id="svs" aria-label="Envoyer">' + ic("a") + '</button><span class="lnk" data-rp="statut:' + it.id + '">Signaler</span></div>');
  $("#svx").onclick = () => { closeStory(); loadStories(); };
  $("#svl").onclick = prevStory; $("#svr").onclick = nextStory;
  clearTimeout(svt);
  if(vid) $("#svv").onended = nextStory; else svt = setTimeout(nextStory, 5000);
  if(mine){
    rpc("story_like_etat", {p_statut:it.id}).then(r => { const x = r && r[0]; if(x && +x.nb > 0 && $("#svn")) $("#svn").textContent = "♥ " + x.nb; }).catch(() => {});
    $("#svd").onclick = async () => { if(!confirm("Supprimer ce statut ? Cette action est définitive.")) return; clearTimeout(svt); try{ await withAuth(t => sb("/rest/v1/statuts_24h?id=eq." + it.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t)); }catch(e){ alert(e.message); } closeStory(); loadStories(); };
  }else{
    noterActivite();
    rpc("story_like_etat", {p_statut:it.id}).then(r => { const x = r && r[0], k = $("#svk"); if(x && x.aime && k){ k.classList.add("lk"); k.innerHTML = pico(PIC.heart, true); } }).catch(() => {});
    $("#svk").onclick = async () => { clearTimeout(svt); const k = $("#svk"); try{ const on = await rpc("story_like", {p_statut:it.id}); k.innerHTML = pico(PIC.heart, !!on); k.classList.toggle("lk", !!on); }catch(e){ alert(e.message); } };
    $("#svi").onfocus = () => clearTimeout(svt);
    $("#svs").onclick = async () => {
      const r = $("#svi").value.trim(); if(!r) return; clearTimeout(svt);
      try{ await withAuth(t => sb("/rest/v1/messages", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({expediteur:session.id, destinataire:g.auteur, texte:"↩️ Statut : « " + (it.texte || (vid ? "vidéo" : "photo")).slice(0, 60) + " »\n" + r})}, t)); $("#svi").value = ""; alert("Réponse envoyée."); }
      catch(e){ alert(e.message); }
      nextStory();
    };
  }
}
function renderStNew(){
  app.innerHTML = topbar("Nouveau statut", '<button class="sm" id="cs"' + (stBusy ? " disabled" : "") + '>Publier</button>') + '<div class="f"><textarea id="stt" maxlength="120" placeholder="Écris un court statut (120 caractères)">' + esc(stT) + '</textarea></div><label class="fl">📷 Ajouter une photo ou une vidéo<input type="file" id="stf" accept="image/*,video/*" hidden></label>' + (stFile ? '<p class="pt fn">📎 ' + esc(stFile.name) + '</p>' : '') + '<p class="s">Ton statut disparaît automatiquement après 24 heures.</p>' + (feedMsg ? '<div class="msg">' + esc(feedMsg) + '</div>' : '');
  $("#cb").onclick = () => go("feed");
  $("#stt").oninput = e => { stT = e.target.value; };
  $("#stf").onchange = e => { const f = e.target.files[0]; if(f && f.size > 25 * 1024 * 1024){ feedMsg = "Fichier trop lourd (25 Mo max)."; stFile = null; } else { stFile = f || null; feedMsg = ""; } render(); };
  $("#cs").onclick = async () => {
    const texte = stT.trim(), f = stFile;
    if(!texte && !f){ feedMsg = "Écris un texte ou ajoute un média."; return render(); }
    stBusy = true; feedMsg = ""; render();
    try{ await withAuth(async t => { const up = f ? await upMedia(t, f, "st") : null; await sb("/rest/v1/statuts_24h", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify({texte:texte || null, media_url:up ? up.url : null, media_type:up ? up.type : null})}, t); }); stT = ""; stFile = null; stBusy = false; go("feed"); return; }
    catch(e){ feedMsg = e.message; }
    stBusy = false; render();
  };
}
