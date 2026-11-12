const api = {
  async signup(f){
    if(DEMO){
      const us = store.get("alapp_users") || {};
      if(us[f.email]) throw new Error("Cet email est déjà inscrit.");
      const id = "u" + Date.now();
      us[f.email] = {id, password:f.password, profile:{id, nom:f.nom, pseudo:f.pseudo, universite:f.universite, niveau:f.niveau, bio:"", certif:"aucune"}};
      store.set("alapp_users", us);
      return {session:{email:f.email, id}, profile:us[f.email].profile};
    }
    const d = await sb("/auth/v1/signup", {method:"POST", body:JSON.stringify({email:f.email, password:f.password})});
    if(d.access_token){
      const s0 = {token:d.access_token, refresh:d.refresh_token, id:d.user.id, email:f.email};
      const p0 = {id:s0.id, nom:f.nom, pseudo:f.pseudo, universite:f.universite, filiere:f.filiere, niveau:f.niveau, bio:""};
      await sb("/rest/v1/profiles", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(p0)}, s0.token);
      return {session:s0, profile:p0};
    }
    return {confirm:true};
  },
  async login(f){
    if(DEMO){
      const u = (store.get("alapp_users")||{})[f.email];
      if(!u || u.password !== f.password) throw new Error("Email ou mot de passe incorrect.");
      return {session:{email:f.email, id:u.id}, profile:u.profile};
    }
    const d = await sb("/auth/v1/token?grant_type=password", {method:"POST", body:JSON.stringify({email:f.email, password:f.password})});
    const s = {token:d.access_token, refresh:d.refresh_token, id:d.user.id, email:f.email};
    let pr = await api.getProfile(s);
    if(!pr.nom && pend && pend.profile && pend.email === f.email){ pr = {id:s.id, ...pend.profile}; await sb("/rest/v1/profiles", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(pr)}, s.token); }
    return {session:s, profile:pr};
  },
  async getProfile(s){
    const r = await sb("/rest/v1/profiles?id=eq." + s.id + "&select=*", {}, s.token);
    return r && r[0] ? r[0] : {id:s.id, nom:"", pseudo:"", universite:"", niveau:"", bio:""};
  },
  async saveProfile(s, p){
    if(DEMO){
      const us = store.get("alapp_users") || {};
      if(us[s.email]){ us[s.email].profile = p; store.set("alapp_users", us); }
      return;
    }
    const {certif, ...row} = p;
    await sb("/rest/v1/profiles", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(row)}, s.token);
  }
};


async function withAuth(fn){
  try{ return await fn(session.token); }
  catch(e){
    if(!/jwt|expired|exp claim/i.test(e.message)) throw e;
    if(!session.refresh) throw new Error("Session expirée : déconnecte-toi puis reconnecte-toi.");
    const d = await sb("/auth/v1/token?grant_type=refresh_token", {method:"POST", body:JSON.stringify({refresh_token:session.refresh})});
    session.token = d.access_token; session.refresh = d.refresh_token;
    store.set("alapp_session", {session, profile});
    return await fn(session.token);
  }
}
