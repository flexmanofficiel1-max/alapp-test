// ----- notifications
const NT = {abonne:"s’est abonné(e) à toi", like:"a aimé ta publication", commentaire:"a commenté ta publication", reponse:"a répondu à ta question", message:"t’a envoyé un message", groupe:"t’a ajouté(e) à un groupe", enregistre:"a enregistré ta photo 💾", republie:"a republié ta publication", club_ajoute:"Tu as été ajouté(e) à un club", certification:"Félicitations ! Nouvelle certification obtenue", periode_fin:"Ta certification de l’année est enregistrée", like_statut:"a aimé ton statut", fidelite:"Bravo ! Ta fidélité de la semaine est récompensée : points ajoutés 🎉", partage_valide:"Ton partage a été validé : points ajoutés 🎉", club_role:"Tu as reçu un rôle d’administrateur dans un club", invitation:"t’a envoyé une invitation à un événement", participation:"participe à ton événement", club_demande:"veut intégrer ton club", club_acceptee:"Ta demande pour intégrer le club a été acceptée ✓", club_refusee:"Ta demande pour intégrer le club n’a pas été retenue"};
async function loadNotifs(){
  try{
    notifs = await withAuth(t => sb("/rest/v1/notifications?select=*,profiles!notifications_acteur_fkey(nom,pseudo)&order=created_at.desc&limit=50", {}, t));
    if(notifs.some(n => !n.lu)){ withAuth(t => sb("/rest/v1/notifications?destinataire=eq." + session.id + "&lu=eq.false", {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({lu:true})}, t)).catch(() => {}); nUnread = 0; }
  }catch(e){ notifs = []; }
  if(tab === "notif") render();
}
function renderNotif(){
  app.innerHTML = topbar("Notifications") + (notifs.length ? notifs.map((n, i) => {
    const nom = (n.profiles && (n.profiles.nom || n.profiles.pseudo)) || "";
    let txt = n.type === "avertissement" ? "⚠️ Avertissement de l’équipe ALapp : " + esc(n.reference || "") : (n.type === "groupe" && !nom ? "Tu as été ajouté(e) à un groupe anonyme" : "<b>" + esc(nom || "Quelqu’un") + "</b> " + (n.type === "message" && n.reference === "photo" ? "t’a envoyé une photo 📷" : (NT[n.type] || "")));
    if(/^(club_(acceptee|refusee|ajoute|role)|fidelite|partage_valide)$/.test(n.type)) txt = NT[n.type];
    if(n.type === "certification") txt = "Félicitations ! Tu as atteint la certification " + (n.reference || "") + " 🎉";
    if(n.type === "periode_fin") txt = "Ta certification de l’année : " + (n.reference || "");
    return '<div class="rw" data-nn="' + i + '" style="' + (n.lu ? "" : "background:var(--card);margin:0 -6px;padding:10px 6px;border-radius:14px") + '">' + (n.acteur ? avh(n.acteur, nom, "s") : '<div class="av s">A</div>') + '<div class="m"><span style="font-size:14px;white-space:normal">' + txt + '</span><small>' + agoL(n.created_at) + '</small></div></div>';
  }).join("") : '<div class="empty">Aucune notification pour l’instant.</div>');
  $("#cb").onclick = () => go("feed");
  document.querySelectorAll("[data-nn]").forEach(b => b.onclick = () => {
    const n = notifs[+b.dataset.nn];
    if(n.type === "abonne" && n.acteur) openUser(n.acteur); else if(n.type === "message") go("msg"); else if(n.type === "groupe"){ mtab = "grp"; go("msg"); } else if(n.type === "invitation"){ mtab = "inv"; go("msg"); } else if(n.type === "participation"){ cf = "ev"; go("com"); } else if(n.type === "reponse") go("com"); else if(/^(fidelite|partage_valide|certification|periode_fin)$/.test(n.type)) go("points"); else if(/^club_/.test(n.type) && n.reference) openClub(n.reference); else go("feed");
  });
}
// ----- paramètres
async function loadSettings(){
  if(!mystats) loadMyStats();
  loadDist();
  pushState().then(x => { pstate = x; if(tab === "settings" && !editing) render(); });
  const g = path => withAuth(t => sb(path, {}, t)).catch(() => null);
  const [bl, ad, su] = await Promise.all([g("/rest/v1/blocages?bloqueur=eq." + session.id + "&select=bloque,profiles!blocages_bloque_fkey(nom,pseudo)"), g("/rest/v1/admins?utilisateur=eq." + session.id + "&select=utilisateur"), g("/rest/v1/suppressions?utilisateur=eq." + session.id + "&select=demande_le")]);
  setl = {bl:bl || [], sup:!!(su && su.length)}; isAdmin = !!(ad && ad.length);
  if(tab === "settings") render();
}
function renderSettings(){
  const p = profile;
  const row = (id, label, on) => '<label class="tgl"><span>' + label + '</span><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + '></label>';
  app.innerHTML = topbar("Paramètres") + '<h4 class="sec">Certification</h4>' + certCard() + pushCard() + '<h4 class="sec">Confidentialité</h4><div class="card">' + row("t_pa", "Profil visible seulement par mes abonnés", p.profil_abonnes) + row("t_af", "Afficher ma filière", p.afficher_filiere !== false) + '</div><h4 class="sec">Notifications</h4><div class="card">' + row("t_nm", "Messages", p.notif_messages !== false) + row("t_na", "Abonnés et J’aime", p.notif_abonnes !== false) + row("t_nc", "Commentaires et réponses", p.notif_commentaires !== false) + '</div><h4 class="sec">Utilisateurs bloqués</h4><div class="card">' + (setl.bl.length ? setl.bl.map(b => '<div class="rw"><div class="m"><b>' + esc((b.profiles && (b.profiles.nom || b.profiles.pseudo)) || "Étudiant") + '</b></div><button class="sm g" data-ub="' + b.bloque + '">Débloquer</button></div>').join("") : '<small>Aucun utilisateur bloqué.</small>') + '</div>' + (isAdmin ? '<h4 class="sec">Modération</h4><button class="s1b" id="addash">Tableau de bord administrateur</button><button class="s1b" id="adrep">Voir les signalements</button>' : '') + '<h4 class="sec">Informations légales</h4><button class="g" data-lg="cgu">Conditions d’utilisation</button><button class="g" data-lg="conf">Politique de confidentialité</button><button class="g" data-lg="regles">Règles de conduite</button><h4 class="sec">Compte</h4><button class="g" id="pwd">Changer mon mot de passe</button><button class="g" id="lall">Me déconnecter de tous les appareils</button><button class="g" id="lo">Se déconnecter</button>' + (setl.sup ? '<p class="s">Ta demande de suppression est enregistrée : ton compte sera supprimé sous 30 jours.</p>' : '<p class="s"><span class="lnk dng" id="delacc">Demander la suppression de mon compte</span></p>');
  $("#cb").onclick = () => go("profile");
  $("#lo").onclick = logout;
  $("#pwd").onclick = async () => { const n = prompt("Nouveau mot de passe (8 caractères minimum, avec lettres et chiffres)"); if(!n) return; if(!pwOk(n)){ alert(PWMSG); return; } try{ await withAuth(t => sb("/auth/v1/user", {method:"PUT", body:JSON.stringify({password:n})}, t)); alert("Mot de passe modifié."); }catch(e){ alert(e.message); } };
  $("#lall").onclick = async () => { if(!confirm("Te déconnecter de tous tes appareils, y compris celui-ci ?")) return; try{ await withAuth(t => sb("/auth/v1/logout?scope=global", {method:"POST"}, t)); }catch(e){} logout(); };
  const tg = (id, col) => { const el = $(id); el.onchange = async () => { const v = el.checked; try{ await withAuth(t => sb("/rest/v1/profiles?id=eq." + session.id, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({[col]:v})}, t)); profile = {...profile, [col]:v}; store.set("alapp_session", {session, profile}); }catch(e){ alert(e.message); el.checked = !v; } }; };
  { const gp = $("#gopts"); if(gp) gp.onclick = () => go("points"); }
  { const pb = $("#psb"); if(pb) pb.onclick = async () => { pb.disabled = true; try{ if(pstate === "actif") await pushOff(); else await pushOn(true); }catch(e){ alert(e.message); } pstate = await pushState(); render(); }; }
  tg("#t_pa", "profil_abonnes"); tg("#t_af", "afficher_filiere"); tg("#t_nm", "notif_messages"); tg("#t_na", "notif_abonnes"); tg("#t_nc", "notif_commentaires");
  document.querySelectorAll("[data-ub]").forEach(b => b.onclick = async () => { try{ await withAuth(t => sb("/rest/v1/blocages?bloque=eq." + b.dataset.ub + "&bloqueur=eq." + session.id, {method:"DELETE", headers:{Prefer:"return=minimal"}}, t)); }catch(e){ alert(e.message); } await loadBadges(); loadSettings(); });
  const ar = $("#adrep"); if(ar) ar.onclick = () => { tab = "reports"; render(); loadReports(); };
  const ad2 = $("#addash"); if(ad2) ad2.onclick = () => { tab = "admin"; render(); loadAdmin(); };
  document.querySelectorAll("[data-lg]").forEach(b => b.onclick = e => { e.preventDefault(); showLegal(b.dataset.lg); });
  const da = $("#delacc"); if(da) da.onclick = async () => { if(!confirm("Demander la suppression de ton compte ? Il sera supprimé sous 30 jours.")) return; try{ await withAuth(t => sb("/rest/v1/suppressions", {method:"POST", headers:{Prefer:"resolution=ignore-duplicates,return=minimal"}, body:JSON.stringify({})}, t)); setl.sup = true; render(); }catch(e){ alert(e.message); } };
}
// ----- signalements
const RAISONS = ["Spam ou publicité", "Harcèlement ou haine", "Contenu inapproprié", "Faux compte ou usurpation", "Autre"];
function reportSheet(type, id, extrait){
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><b>Signaler</b><p class="pt">Choisis une raison.</p>' + RAISONS.map((r, i) => '<label class="rr"><input type="radio" name="rr" value="' + esc(r) + '"' + (i === 0 ? " checked" : "") + '> ' + esc(r) + '</label>').join("") + '<textarea id="rdt" placeholder="Précision (facultatif)" maxlength="500" style="margin-top:8px"></textarea><button id="rsd">Envoyer le signalement</button><button class="t" id="rsx">Annuler</button></div>';
  document.body.appendChild(d);
  const close = () => d.remove();
  d.onclick = e => { if(e.target === d) close(); };
  d.querySelector("#rsx").onclick = close;
  d.querySelector("#rsd").onclick = async () => {
    const raison = (d.querySelector("input[name=rr]:checked") || {}).value || "Autre", det = d.querySelector("#rdt").value;
    try{ await withAuth(t => sb("/rest/v1/rpc/signaler", {method:"POST", body:JSON.stringify({p_type:type, p_cible:id, p_raison:raison, p_details:det, p_extrait:extrait})}, t)); close(); alert("Merci, ton signalement a été envoyé à l’équipe ALapp."); }
    catch(e){ alert(e.message); }
  };
}
document.addEventListener("click", e => {
  const b = e.target.closest ? e.target.closest("[data-rp]") : null; if(!b || !session) return;
  e.preventDefault(); const v = b.dataset.rp, k = v.indexOf(":"); reportSheet(v.slice(0, k), v.slice(k + 1), b.dataset.ex || "");
});
async function loadReports(){
  try{ repl = await withAuth(t => sb("/rest/v1/signalements?select=*,s:profiles!signalements_signaleur_fkey(nom,pseudo),a:profiles!signalements_cible_auteur_fkey(nom,pseudo)&order=created_at.desc&limit=100", {}, t)); }catch(e){ repl = []; }
  if(tab === "reports") render();
}
const EDITEUR = "ALAGROUPE", CONTACT = "alappinfo@yahoo.com", MAJ = "25 octobre 2026";
const LEGAL = {
cgu:{t:"Conditions d’utilisation", h:`<p><i>Dernière mise à jour : ${MAJ}</i></p>
<h5>1. Objet</h5><p>ALapp est un réseau social réservé aux étudiants, édité par ${EDITEUR} (Abidjan, Côte d’Ivoire). Ces conditions encadrent l’utilisation de l’application. En créant un compte, tu les acceptes.</p>
<h5>2. Compte</h5><p>Tu dois avoir au moins 16 ans, fournir des informations exactes et garder ton mot de passe secret. Un seul compte par personne. Tu es responsable de l’activité de ton compte.</p>
<h5>3. Tes contenus</h5><p>Tu restes propriétaire de ce que tu publies (textes, photos, vidéos, messages). Tu nous autorises à les stocker et à les afficher dans ALapp aux personnes à qui tu les destines, le temps nécessaire au service. Tu garantis avoir le droit de les publier et ne pas porter atteinte aux droits d’autrui.</p>
<h5>4. Règles de conduite</h5><p>Les règles de conduite font partie de ces conditions. Les contenus illégaux ou contraires à ces règles peuvent être retirés.</p>
<h5>5. Modération et sanctions</h5><p>Tu peux signaler tout contenu ou compte. Selon la gravité, nous pouvons retirer un contenu, envoyer un avertissement, suspendre ou supprimer un compte. Tu peux contester une décision en écrivant à ${CONTACT}. Les faits graves peuvent être transmis aux autorités.</p>
<h5>6. Messagerie</h5><p>Les messages privés et de groupe ne sont pas chiffrés de bout en bout. En mode éphémère, les messages disparaissent après lecture, mais nous ne pouvons pas empêcher une capture d’écran, ni l’enregistrement d’une photo par son destinataire. Dans un groupe anonyme, les autres membres ne voient pas ton identité ; elle peut toutefois être révélée à l’équipe de modération, de façon encadrée et motivée, en cas de signalement grave.</p>
<h5>7. Certification</h5><p>Le badge de certification est attribué automatiquement selon le nombre d’abonnés et peut être retiré en cas de non-respect des règles.</p>
<h5>8. Disponibilité et responsabilité</h5><p>ALapp est fournie « en l’état », sans garantie de disponibilité permanente. Nous ne sommes pas responsables des contenus publiés par les utilisateurs, ni des dommages indirects liés à l’usage du service, dans les limites permises par la loi.</p>
<h5>9. Suppression du compte</h5><p>Tu peux demander la suppression de ton compte depuis les paramètres ; elle est effective sous 30 jours.</p>
<h5>10. Modifications</h5><p>Nous pouvons modifier ces conditions. En cas de changement important, nous t’en informerons dans l’application.</p>
<h5>11. Droit applicable</h5><p>Ces conditions sont soumises au droit ivoirien. En cas de litige, les tribunaux d’Abidjan sont compétents, sauf règle impérative contraire.</p>
<h5>12. Contact</h5><p>${CONTACT}</p>`},
conf:{t:"Politique de confidentialité", h:`<p><i>Dernière mise à jour : ${MAJ}</i></p>
<h5>Qui est responsable ?</h5><p>${EDITEUR}, Abidjan (Côte d’Ivoire), responsable du traitement de tes données. Contact : ${CONTACT}.</p>
<h5>Données collectées</h5><p>• Compte : nom, pseudo, e-mail, mot de passe (stocké de façon sécurisée, jamais lisible), établissement, filière, niveau, photo, bio.<br>• Contenus : publications, statuts, commentaires, messages, photos et vidéos que tu envoies.<br>• Activité : abonnements, J’aime, blocages, signalements, notifications.<br>• Technique : ta session de connexion, stockée sur ton appareil.</p>
<h5>Pourquoi ?</h5><p>Pour créer ton compte, faire fonctionner le réseau (profil, fil, messages, groupes, communauté), t’envoyer les codes de vérification, assurer la sécurité et la modération, et respecter la loi. Nous ne vendons pas tes données et n’affichons pas de publicité.</p>
<h5>Qui y a accès ?</h5><p>Les autres utilisateurs voient ce que tu rends visible (profil, publications), selon tes réglages de confidentialité. Tes messages privés ne sont visibles que par toi et ton destinataire ; l’équipe ne les consulte pas, sauf s’ils sont signalés ou si la loi l’exige. Nos prestataires techniques traitent des données pour notre compte : Supabase (base de données et fichiers, serveurs en Irlande), Brevo (envoi des e-mails de code) et GitHub (hébergement du site). Certaines données peuvent donc être traitées hors de Côte d’Ivoire.</p>
<h5>Durée de conservation</h5><p>Tes données sont conservées tant que ton compte existe. Après une demande de suppression, ton compte et tes contenus sont effacés sous 30 jours. Les messages éphémères sont supprimés après lecture. Le journal de modération est conservé le temps nécessaire à la sécurité et aux obligations légales.</p>
<h5>Tes droits</h5><p>Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013, tu peux accéder à tes données, les faire corriger, t’opposer à leur traitement ou demander leur suppression, en écrivant à ${CONTACT}. Tu peux aussi saisir l’ARTCI, autorité de protection des données à caractère personnel.</p>
<h5>Sécurité</h5><p>Les échanges sont chiffrés (HTTPS), les accès sont restreints par des règles de sécurité et les photos et vidéos de messages sont stockées dans un espace privé. Aucun système n’est infaillible : choisis un mot de passe solide.</p>
<h5>Âge minimum</h5><p>ALapp est réservée aux personnes d’au moins 16 ans.</p>
<h5>Modifications</h5><p>Cette politique peut évoluer ; tu seras informé(e) en cas de changement important.</p>`},
regles:{t:"Règles de conduite", h:`<p>ALapp est un espace d’entraide entre étudiants. Pour que chacun s’y sente bien :</p>
<h5>À faire</h5><p>• Respecte les autres, même en désaccord.<br>• Sois honnête sur ton identité.<br>• Signale ce qui te semble dangereux ou abusif.</p>
<h5>Interdit</h5><p>• Harcèlement, insultes, menaces, discrimination ou haine (origine, religion, genre, orientation, handicap…).<br>• Contenu sexuel explicite, violent ou choquant.<br>• Tout contenu sexualisant des mineurs ou mettant en danger un enfant : tolérance zéro, signalement aux autorités.<br>• Usurpation d’identité, faux comptes, arnaques et escroqueries.<br>• Spam, publicité non sollicitée, chaînes.<br>• Partager des informations privées d’autrui (photos, numéros, conversations) sans son accord.<br>• Vente ou promotion de drogues, d’armes ou d’autres activités illégales.<br>• Contourner la modération ou recréer un compte après une suspension.</p>
<h5>Groupes et messages anonymes</h5><p>L’anonymat protège la parole, pas les abus. Un message abusif peut être signalé, et son auteur identifié de façon encadrée par la modération.</p>
<h5>Sanctions</h5><p>Retrait du contenu, avertissement, suspension (temporaire ou illimitée) ou suppression du compte, selon la gravité. Les faits graves peuvent être transmis aux autorités.</p>
<h5>Contester une décision</h5><p>Écris à ${CONTACT} en expliquant la situation.</p>`}
};
function showLegal(k){
  const L = LEGAL[k]; if(!L) return;
  const d = document.createElement("div"); d.className = "sheet";
  d.innerHTML = '<div class="sc"><b>' + L.t + '</b><div class="lg" style="max-height:60vh;overflow:auto;text-align:left">' + L.h + '</div><button class="t" id="lgx">Fermer</button></div>';
  document.body.appendChild(d);
  const c = () => d.remove(); d.onclick = e => { if(e.target === d) c(); }; d.querySelector("#lgx").onclick = c;
}

let pfiles = [];
async function shrink(f){
  try{
    if(!f || !(f.type || "").startsWith("image/") || f.type === "image/gif" || f.type === "image/svg+xml" || f.size < 350 * 1024) return f;
    const bmp = await createImageBitmap(f), sc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    const bl = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.82));
    if(!bl || bl.size >= f.size) return f;
    return new File([bl], (f.name.replace(/\.[^.]+$/, "") || "photo") + ".jpg", {type:"image/jpeg"});
  }catch(e){ return f; }
}

