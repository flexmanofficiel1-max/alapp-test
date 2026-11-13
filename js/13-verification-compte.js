let pend = null, rsAt = 0, rtm = null;
const mhtml = () => msg ? '<div class="msg ' + (ok ? "ok" : "") + '">' + esc(msg) + '</div>' : '';
const attKey = e => "alapp_att_" + e;
const lockOf = e => (store.get(attKey(e)) || {}).until || 0;
function failAtt(e){ const a = store.get(attKey(e)) || {n:0, until:0}; a.n++; if(a.n >= 5){ a.n = 0; a.until = Date.now() + 10 * 60000; } store.set(attKey(e), a); }
const sendLog = () => (store.get("alapp_sends") || []).filter(t => Date.now() - t < 3600000);
function logSend(){ const l = sendLog(); l.push(Date.now()); store.set("alapp_sends", l); }
function startPend(f){
  pend = {email:f.email, profile:{nom:f.nom, pseudo:f.pseudo, universite:f.universite, filiere:f.filiere, niveau:f.niveau, bio:""}, kind:"signup"};
  store.set("alapp_pend", pend); logSend(); rsAt = Date.now(); mode = "verify"; msg = ""; ok = false; render();
}
function tickResend(){
  clearInterval(rtm);
  rtm = setInterval(() => {
    const b = $("#vrs"); if(!b || (mode !== "verify" && mode !== "reset")){ clearInterval(rtm); return; }
    const w = Math.ceil((60000 - (Date.now() - rsAt)) / 1000);
    b.disabled = w > 0; b.textContent = w > 0 ? "Renvoyer le code (" + w + " s)" : "Renvoyer le code";
  }, 1000);
}
function renderVerify(){
  const reset = mode === "reset";
  app.innerHTML = '<div class="card"><h2>' + (reset ? "Nouveau mot de passe" : "Vérifie ton e-mail") + '</h2><p class="s">Si l’adresse est valide, un code vient d’être envoyé à <b>' + esc(pend.email) + '</b>. Il est valable 10 minutes. Regarde aussi tes spams.</p><label>Code reçu par e-mail</label><input id="vc" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="••••••" style="letter-spacing:.4em;font-size:20px;text-align:center">' +
    (reset ? '<label>Nouveau mot de passe</label><input id="vp" type="password" autocomplete="new-password"><label>Confirmer le mot de passe</label><input id="vp2" type="password" autocomplete="new-password">' : '') +
    '<button id="vgo"' + (busy ? " disabled" : "") + '>' + (busy ? "Patiente…" : reset ? "Changer le mot de passe" : "Valider") + '</button><button class="t" id="vrs">Renvoyer le code</button><button class="t" id="vbk">' + (reset ? "Retour" : "Changer d’adresse e-mail") + '</button><button class="t" id="vlg">J’ai déjà un compte</button>' + mhtml() + '</div>';
  $("#vgo").onclick = doVerify;
  $("#vrs").onclick = doResend;
  $("#vbk").onclick = () => { store.del("alapp_pend"); pend = null; mode = reset ? "login" : "signup"; msg = ""; render(); };
  $("#vlg").onclick = () => { store.del("alapp_pend"); pend = null; mode = "login"; msg = ""; render(); };
  tickResend();
}
async function doResend(){
  if(Date.now() - rsAt < 60000) return;
  if(sendLog().length >= 5){ msg = "Trop de demandes. Réessaie dans une heure."; ok = false; return render(); }
  const reset = mode === "reset";
  try{ await sb(reset ? "/auth/v1/recover" : "/auth/v1/resend", {method:"POST", body:JSON.stringify(reset ? {email:pend.email} : {type:"signup", email:pend.email})}); logSend(); rsAt = Date.now(); msg = "Un nouveau code vient d’être envoyé (si l’adresse est valide)."; ok = true; }
  catch(e){ msg = /rate|second|limit/i.test(e.message) ? "Patiente un peu avant de redemander un code." : e.message; ok = false; }
  render();
}
async function doVerify(){
  const reset = mode === "reset", code = $("#vc").value.trim(), pw = reset ? $("#vp").value : "", pw2 = reset ? $("#vp2").value : "";
  if(!/^\d{6,8}$/.test(code)){ msg = "Entre le code reçu par e-mail."; ok = false; return render(); }
  if(reset && !pwOk(pw)){ msg = PWMSG; ok = false; return render(); }
  if(reset && pw !== pw2){ msg = "Les deux mots de passe ne correspondent pas."; ok = false; return render(); }
  const lk = lockOf(pend.email);
  if(lk > Date.now()){ msg = "Trop d’essais. Réessaie dans " + Math.ceil((lk - Date.now()) / 60000) + " min."; ok = false; return render(); }
  busy = true; msg = ""; render();
  try{
    const d = await sb("/auth/v1/verify", {method:"POST", body:JSON.stringify({type:reset ? "recovery" : "signup", email:pend.email, token:code})});
    store.del(attKey(pend.email));
    const s2 = {token:d.access_token, refresh:d.refresh_token, id:d.user.id, email:pend.email};
    let pr, newAcc = false;
    if(reset){ await sb("/auth/v1/user", {method:"PUT", body:JSON.stringify({password:pw})}, s2.token); pr = await api.getProfile(s2); }
    else if(pend.profile){ pr = {id:s2.id, ...pend.profile}; await sb("/rest/v1/profiles", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(pr)}, s2.token); newAcc = true; }
    else pr = await api.getProfile(s2);
    session = s2; profile = pr; store.set("alapp_session", {session, profile}); store.del("alapp_pend"); pend = null;
    busy = false; msg = ""; mode = "login"; tab = "feed"; psetup = newAcc; pfile = null;
    if(!pr.nom){ tab = "profile"; editing = true; }
    render(); loadPosts(); loadBadges();
    if(reset) alert("Mot de passe modifié. Tu es connecté(e).");
  }catch(e){
    busy = false; failAtt(pend.email);
    msg = /expired|invalid/i.test(e.message) ? "Code incorrect ou expiré." : e.message; ok = false; render();
  }
}
function renderForgot(){
  app.innerHTML = '<div class="card"><h2>Mot de passe oublié</h2><p class="s">Entre ton adresse e-mail : si un compte existe, un code t’est envoyé.</p><label>Email</label><input id="fe" type="email" autocomplete="email" autocapitalize="none"><button id="fgo"' + (busy ? " disabled" : "") + '>' + (busy ? "Patiente…" : "Envoyer le code") + '</button><button class="t" id="fbk">Retour</button>' + mhtml() + '</div>';
  $("#fbk").onclick = () => { mode = "login"; msg = ""; render(); };
  $("#fgo").onclick = async () => {
    const email = $("#fe").value.trim().toLowerCase();
    if(!email){ msg = "Entre ton adresse e-mail."; ok = false; return render(); }
    if(sendLog().length >= 5){ msg = "Trop de demandes. Réessaie dans une heure."; ok = false; return render(); }
    busy = true; msg = ""; render();
    try{ await sb("/auth/v1/recover", {method:"POST", body:JSON.stringify({email})}); }
    catch(e){ if(/rate|second|limit/i.test(e.message)){ busy = false; msg = "Patiente un peu avant de redemander un code."; ok = false; return render(); } }
    busy = false; logSend(); pend = {email, profile:null, kind:"reset"}; rsAt = Date.now(); mode = "reset"; msg = ""; render();
  };
}

