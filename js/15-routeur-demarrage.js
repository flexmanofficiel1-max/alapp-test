const pwOk = p => String(p || "").length >= 8 && /[a-z]/i.test(p) && /\d/.test(p);
const PWMSG = "Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.";
const NAVKEY = () => "alapp_nav:" + SUPABASE_URL;
function saveNav(){
  if(!session) return;
  try{
    const n = {tab, mtab, cf};
    if(tab === "club" && club) n.club = club.id;
    else if(tab === "user" && vu && vu.p) n.user = vu.p.id;
    else if(tab === "msg" && peer) n.peer = JSON.parse(JSON.stringify(peer));
    sessionStorage.setItem(NAVKEY(), JSON.stringify(n));
  }catch(e){}
}
function restoreNav(){
  if(clubShared || groupShared || sharedId) return;
  try{
    const n = navBoot; if(!n || !n.tab) return;
    if(n.mtab) mtab = n.mtab; if(n.cf) cf = n.cf;
    if(n.club) return openClub(n.club);
    if(n.user) return openUser(n.user);
    if(n.peer && n.peer.id){ tab = "msg"; return n.peer.grp ? openGChat(n.peer) : openChat(n.peer); }
    if(["feed","com","msg","profile","notif","settings","points","brain"].includes(n.tab) && n.tab !== "feed") go(n.tab);
  }catch(e){}
}
function render(){ renderCore(); saveNav(); }
function renderCore(){ render0(); updateTabs(); }
function render0(){
  const demo = DEMO ? '<div class="demo">Mode démo : les données restent sur cet appareil. Ajoute tes accès Supabase pour la vraie base.</div>' : "";
  const m = msg ? '<div class="msg ' + (ok ? "ok" : "") + '">' + esc(msg) + '</div>' : "";
  if(session && profile){
    const p = profile, ini = (p.nom || p.pseudo || "?").trim().charAt(0).toUpperCase();
    if(psetup) return renderPhotoStep();
    if(tab === "feed" && !editing) return renderFeed(demo);
    if(tab === "msg" && !editing) return renderMsg();
    if(tab === "com" && !editing) return renderCom();
    if(tab === "club" && !editing) return renderClub();
    if(tab === "points" && !editing) return renderPoints();
    if(tab === "brain" && !editing) return renderBrain();
    if(tab === "admpts" && !editing) return renderAdmPts();
    if(tab === "user" && !editing) return renderUser();
    if(tab === "post" && !editing) return renderPost();
    if(tab === "search" && !editing) return renderSearch();
    if(tab === "settings" && !editing) return renderSettings();
    if(tab === "notif" && !editing) return renderNotif();
    if(tab === "reports" && !editing) return renderReports();
    if(tab === "admin" && !editing) return renderAdmin();
    if(tab === "stnew" && !editing) return renderStNew();
    if(!editing){
      const info = [p.niveau, p.filiere, p.universite].filter(Boolean).join(" · ");
      app.innerHTML = demo + covHtml(p.couverture_url, true) + '<div class="pcard"><div class="pc1">' + pav(session.id, p.nom) + '<div class="pc2"><b>' + esc(p.nom || "Étudiant") + badge(session.id) + '</b><span>' + esc(info || "@" + (p.pseudo || "")) + '</span></div></div><div class="pcs"><div><b>' + nf(mystats ? mystats.ab : 0) + '</b>Abonnés</div><div><b>' + nf(mystats ? mystats.sv : 0) + '</b>Abonnements</div><div><b>' + nf(mystats ? mystats.pubs : 0) + '</b>Publications</div><div id="ptsb" style="cursor:pointer"><b>' + nf(myPts) + '</b>Points</div></div>' + (p.bio ? '<p class="pbio">' + esc(p.bio) + '</p>' : '') + '<div class="pbt"><button id="ed">Modifier le profil</button><button class="pib" id="stg" aria-label="Paramètres" title="Paramètres">' + pico(PIC.gear) + '</button></div></div>' + wallHtml(session.id);
      $("#ptsb").onclick = () => go("points");
      $("#cvf").onchange = e => { const f0 = e.target.files[0]; e.target.value = ""; setCover(f0); };
      $("#ed").onclick = () => { editing = true; msg = ""; render(); };
      $("#stg").onclick = () => { tab = "settings"; render(); loadSettings(); };
      bindWall();
    } else {
      app.innerHTML = demo + '<div class="card"><h2>Mon profil</h2><div class="c">' + pphHtml() + '</div><label>Nom complet</label><input id="nom" value="' + esc(p.nom) + '"><label>Pseudo</label><input id="pseudo" value="' + esc(p.pseudo) + '"><label>Établissement</label><input id="uni" value="' + esc(p.universite) + '"><label>Filière</label><input id="fil" value="' + esc(p.filiere) + '"><label>Niveau</label><select id="niv">' + NIVEAUX.map(n => '<option' + (n === p.niveau ? " selected" : "") + '>' + n + '</option>').join("") + '</select><label>Bio</label><textarea id="bio" maxlength="200">' + esc(p.bio) + '</textarea><button id="sv">Enregistrer</button><button class="t" id="cx">Annuler</button>' + m + '</div>';
      $("#cx").onclick = () => { editing = false; pfile = null; msg = ""; render(); };
      $("#pph").onchange = pickAvatar;
      $("#sv").onclick = async () => {
        const np = {...p, nom:$("#nom").value.trim(), pseudo:$("#pseudo").value.trim().replace(/^@/, ""), universite:$("#uni").value.trim(), filiere:$("#fil").value.trim(), niveau:$("#niv").value, bio:$("#bio").value.trim()};
        try{ if(pfile){ const up = await withAuth(t => upMedia(t, pfile, "avatars")); np.photo_url = up.url; photos[session.id] = up.url; pfile = null; }
          await withAuth(t => api.saveProfile({...session, token:t}, np)); profile = np; store.set("alapp_session", {session, profile}); editing = false; msg = ""; render(); }
        catch(e){ msg = e.message; ok = false; render(); }
      };
    }
    return;
  }
  if(mode === "verify" || mode === "reset") return renderVerify();
  if(mode === "forgot") return renderForgot();
  if(mode === "splash"){
    app.innerHTML = '<div class="splash"><div class="logo">ALapp</div><h3>Ton campus,<br>dans ta poche</h3><p>Retrouve tes camarades,<br>partage et discute.</p><button class="s1" id="s1">Créer un compte</button><button class="s2" id="s2">Se connecter</button></div>';
    $("#s1").onclick = () => { mode = "signup"; render(); };
    $("#s2").onclick = () => { mode = "login"; render(); };
    return;
  }
  const su = mode === "signup";
  app.innerHTML = demo + '<div class="card"><h2>' + (su ? "Créer mon compte" : "Connexion") + '</h2><p class="s">' + (su ? "Rejoins le réseau des étudiants." : "Content de te revoir !") + '</p><form id="f">' +
    (su ? '<label>Nom complet</label><input id="nom" autocomplete="name"><label>Pseudo</label><input id="pseudo" autocapitalize="none"><label>Établissement</label><input id="uni"><label>Filière</label><input id="fil"><label>Niveau</label><select id="niv">' + NIVEAUX.map(n => "<option>" + n + "</option>").join("") + "</select>" : "") +
    '<label>Email</label><input id="em" type="email" autocomplete="email" autocapitalize="none"><label>Mot de passe</label><input id="pw" type="password" autocomplete="' + (su ? "new-password" : "current-password") + '"></form>' + (su ? '<label class="rr" style="margin:10px 0"><input type="checkbox" id="cg"> <span>J’ai au moins 16 ans, j’ai lu et j’accepte les <span class="lnk" data-lg="cgu">conditions d’utilisation</span>, la <span class="lnk" data-lg="conf">politique de confidentialité</span> et les <span class="lnk" data-lg="regles">règles de conduite</span>.</span></label>' : '') + '<button id="go"' + (busy ? " disabled" : "") + '>' + (busy ? "Patiente…" : su ? "S’inscrire" : "Se connecter") + '</button>' + (su ? '' : '<button class="t" id="fg">Mot de passe oublié ?</button>') + '<button class="t" id="sw">' + (su ? "J’ai déjà un compte" : "Pas de compte ? S’inscrire") + '</button>' + m + '</div>';
  $("#sw").onclick = () => { mode = su ? "login" : "signup"; msg = ""; render(); };
  $("#go").onclick = submit;
  const fm = $("#f"); if(fm) fm.addEventListener("submit", e => e.preventDefault());
  document.querySelectorAll("[data-lg]").forEach(b => b.onclick = e => { e.preventDefault(); showLegal(b.dataset.lg); });
  const fg = $("#fg"); if(fg) fg.onclick = () => { mode = "forgot"; msg = ""; render(); };
}

async function submit(){
  const v = id => ($(id) ? $(id).value.trim() : "");
  const f = {email:v("#em").toLowerCase(), password:$("#pw").value, nom:v("#nom"), pseudo:v("#pseudo").replace(/^@/, ""), universite:v("#uni"), filiere:v("#fil"), niveau:v("#niv")};
  const su = mode === "signup";
  if(!f.email || !f.password){ msg = "Email et mot de passe requis."; ok = false; return render(); }
  if(su && (!f.nom || !f.pseudo)){ msg = "Nom et pseudo requis."; ok = false; return render(); }
  if(su && !pwOk(f.password)){ msg = PWMSG; ok = false; return render(); }
  if(su && !($("#cg") && $("#cg").checked)){ msg = "Pour t’inscrire, accepte les conditions d’utilisation."; ok = false; return render(); }
  busy = true; msg = ""; render();
  try{
    if(su && !DEMO){
      if(sendLog().length >= 5) throw new Error("Trop de demandes de code. Réessaie dans une heure.");
      const libre = await sb("/rest/v1/rpc/pseudo_libre", {method:"POST", body:JSON.stringify({p_pseudo:f.pseudo})});
      if(libre === false) throw new Error("Ce pseudo est déjà pris.");
    }
    const r = su ? await api.signup(f) : await api.login(f);
    busy = false;
    if(r.confirm){ busy = false; startPend(f); return; }
    session = r.session; profile = r.profile; store.set("alapp_session", {session, profile}); msg = ""; tab = "feed"; psetup = su; pfile = null; render(); loadPosts(); loadBadges();
  }catch(e){
    busy = false;
    if(!su && /not confirmed/i.test(e.message)){ pend = {email:f.email, profile:null, kind:"signup"}; mode = "verify"; rsAt = 0; msg = "Ton adresse n’est pas encore vérifiée. Entre le code reçu, ou demande-en un nouveau."; ok = false; return render(); }
    msg = /invalid login/i.test(e.message) ? "Email ou mot de passe incorrect." : e.message; ok = false; render();
  }
}

function logout(){ try{ sessionStorage.removeItem(NAVKEY()); }catch(e){} try{ navigator.serviceWorker.getRegistration().then(r => r && r.pushManager.getSubscription()).then(x => x && x.unsubscribe()).catch(() => {}); }catch(e){} solo = null; session = null; profile = null; posts = []; tab = "feed"; clearInterval(poll); peer = null; convs = []; gcreate = false; psetup = false; closeStory(); store.del("alapp_session"); mode = "splash"; render(); }

let navBoot = null; try{ navBoot = JSON.parse(sessionStorage.getItem(NAVKEY()) || "null"); }catch(e){}
const sp = store.get("alapp_pend"); if(sp){ pend = sp; mode = "verify"; }
const saved = store.get("alapp_session");
if(saved && saved.session){ session = saved.session; profile = saved.profile; }
render();
if(session){ loadPosts(); loadBadges(); restoreNav(); pushSync(); loadPoints(); }
setInterval(() => { if(session) loadBadges(); }, 45000);
setInterval(pollList, 2500);
