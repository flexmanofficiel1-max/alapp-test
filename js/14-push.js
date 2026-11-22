// ----- notifications sur l'écran (Web Push)
const VAPID_PUB = "BE3fW3-_Rt9S5ImXX5KbVd1_X9NZ-lemO2W1C17CjCNaS62cHA3tXseK0YMguifhpXa_0zqXjQSWeczcBGeRa8Y";
const b64u = v => { const pad = "=".repeat((4 - v.length % 4) % 4), r = atob((v + pad).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, c => c.charCodeAt(0)); };
const PUSH_ENABLED = true;
let pstate = "…";
async function pushState(){
  if(!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "non";
  if(Notification.permission === "denied") return "refuse";
  try{ const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); return sub ? "actif" : "inactif"; }catch(e){ return "non"; }
}
async function pushOn(ask){
  if(ask){ const perm = await Notification.requestPermission(); if(perm !== "granted") throw new Error("Autorisation refusée."); }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if(!sub) sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u(VAPID_PUB)});
  const j = sub.toJSON();
  await rpc("push_enregistrer", {p_endpoint:j.endpoint, p_p256dh:j.keys.p256dh, p_auth:j.keys.auth});
  store.set("push_" + session.id, 1);
}
async function pushOff(){
  const reg = await navigator.serviceWorker.getRegistration(), sub = reg && await reg.pushManager.getSubscription();
  if(sub){ try{ await rpc("push_supprimer", {p_endpoint:sub.endpoint}); }catch(e){} await sub.unsubscribe(); }
  store.del("push_" + session.id);
}
function pushSync(){ if(PUSH_ENABLED && session && "Notification" in window && Notification.permission === "granted" && store.get("push_" + session.id)) pushOn(false).catch(() => {}); }
function pushCard(){
  if(!PUSH_ENABLED) return "";
  const t = {
    "…": ["Vérification…", ""],
    non: ["Ton navigateur ne permet pas les notifications sur l’écran.", ""],
    refuse: ["Tu as bloqué les notifications. Autorise-les dans les réglages du site (le cadenas à côté de l’adresse), puis reviens ici.", ""],
    inactif: ["Reçois une alerte sur l’écran de ton téléphone pour les messages, les abonnements et les invitations, même quand l’application est fermée.", '<button id="psb">Activer</button>'],
    actif: ["Activées sur cet appareil ✓", '<button class="g" id="psb">Désactiver</button>']
  }[pstate] || ["", ""];
  return '<h4 class="sec">Notifications sur l’écran</h4><div class="card"><p class="s" style="margin:0 0 8px">' + t[0] + '</p>' + t[1] + '</div>';
}
