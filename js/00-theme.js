// ===== Apparence : mode clair / sombre / auto, couleur principale et couleur de fond au choix =====
// Chargé dans <head> pour appliquer le choix avant l'affichage (pas d'éclair blanc).
// Le choix est gardé sur l'appareil (localStorage). Les couleurs proposées sont toutes lisibles.
const THEME_ACCENTS = [
  {id:"vert", nom:"Vert", c:"#0F5B3A", d:"#1F8F5F", g2:"#2E8B57"},
  {id:"bleu", nom:"Bleu", c:"#1D4ED8", d:"#3B73E8"},
  {id:"violet", nom:"Violet", c:"#6D28D9", d:"#8B5CF6"},
  {id:"rose", nom:"Rose", c:"#BE185D", d:"#D63A7A"},
  {id:"rouge", nom:"Rouge", c:"#B91C1C", d:"#E04646"},
  {id:"orange", nom:"Orange", c:"#C2410C", d:"#D9531E"},
  {id:"turquoise", nom:"Turquoise", c:"#0F766E", d:"#178A80"},
  {id:"ardoise", nom:"Ardoise", c:"#334155", d:"#64748B"}
];
const THEME_LIGHT_BG = [
  {id:"os", nom:"Blanc cassé", bg:"#F7F8F2"}, {id:"blanc", nom:"Blanc", bg:"#FFFFFF"},
  {id:"creme", nom:"Crème", bg:"#FBF6EC"}, {id:"bleu", nom:"Bleu clair", bg:"#EEF3FB"},
  {id:"rose", nom:"Rose clair", bg:"#FBEFF3"}, {id:"menthe", nom:"Menthe", bg:"#EEF6F1"}
];
const THEME_DARK_BG = [
  {id:"noir", nom:"Noir", bg:"#0B0F0D", card:"#151C18", bd:"#26312B"},
  {id:"anthracite", nom:"Anthracite", bg:"#121316", card:"#1B1D22", bd:"#2B2E35"},
  {id:"nuit", nom:"Bleu nuit", bg:"#0B1120", card:"#131B2E", bd:"#222C44"},
  {id:"foret", nom:"Vert nuit", bg:"#0C1410", card:"#141E18", bd:"#233028"},
  {id:"prune", nom:"Violet nuit", bg:"#120F1A", card:"#1B1726", bd:"#2D2740"}
];
const THEME_DEFAULT = {mode:"light", accent:"vert", bgL:"os", bgD:"noir"};
let themeState = {...THEME_DEFAULT};

function themeLoad(){
  try{ const s = JSON.parse(localStorage.getItem("alapp_theme") || "null"); if(s && typeof s === "object") themeState = {...THEME_DEFAULT, ...s}; }catch(e){}
}
function themeIsDark(){
  return themeState.mode === "dark" || (themeState.mode === "auto" && !!window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
}
function themeMix(hex, w){
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * w));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}
function themeApply(){
  const dark = themeIsDark(), s = themeState;
  const a = THEME_ACCENTS.find(x => x.id === s.accent) || THEME_ACCENTS[0], g = dark ? a.d : a.c;
  const set = (k, v) => document.documentElement.style.setProperty(k, v);
  set("--g", g); set("--g2", (a.g2 && !dark) ? a.g2 : themeMix(g, 0.25));
  let bg;
  if(dark){
    const d = THEME_DARK_BG.find(x => x.id === s.bgD) || THEME_DARK_BG[0]; bg = d.bg;
    set("--bg", d.bg); set("--card", d.card); set("--bd", d.bd); set("--tx", "#E9EFEA"); set("--mu", "#9AA79F"); set("--er", "#FF6B60");
  }else{
    const l = THEME_LIGHT_BG.find(x => x.id === s.bgL) || THEME_LIGHT_BG[0]; bg = l.bg;
    set("--bg", l.bg); set("--card", "#FFFFFF"); set("--bd", "#E1E5DC"); set("--tx", "#14201A"); set("--mu", "#66726B"); set("--er", "#B3261E");
  }
  document.documentElement.setAttribute("data-mode", dark ? "dark" : "light");
  const m = document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute("content", dark ? bg : g);
}
function themeSet(patch){
  themeState = {...themeState, ...patch};
  try{ localStorage.setItem("alapp_theme", JSON.stringify(themeState)); }catch(e){}
  themeApply();
}
themeLoad(); themeApply();
try{ if(window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if(themeState.mode === "auto") themeApply(); }); }catch(e){}

// ----- carte « Apparence » dans les Paramètres -----
function appearanceCard(){
  const s = themeState, dark = themeIsDark();
  const seg = (v, label) => '<button class="sg' + (s.mode === v ? ' on' : '') + '" data-th="mode:' + v + '">' + label + '</button>';
  const sw = (list, key, cur, bgMode) => list.map(x => '<button class="thsw' + (cur === x.id ? ' on' : '') + '" data-th="' + key + ':' + x.id + '" title="' + esc(x.nom) + '" aria-label="' + esc(x.nom) + '" style="background:' + (bgMode ? x.bg : x.c) + '"></button>').join("");
  return '<div class="card"><label>Mode</label><div class="seg">' + seg("light", "☀️ Clair") + seg("dark", "🌙 Sombre") + seg("auto", "Auto") + '</div>' +
    '<label>Couleur principale</label><div class="throw">' + sw(THEME_ACCENTS, "accent", s.accent, false) + '</div>' +
    '<label>Couleur de fond (' + (dark ? "mode sombre" : "mode clair") + ')</label><div class="throw">' + sw(dark ? THEME_DARK_BG : THEME_LIGHT_BG, dark ? "bgD" : "bgL", dark ? s.bgD : s.bgL, true) + '</div>' +
    '<button class="g" id="thr">Rétablir les couleurs d’origine</button></div>';
}
function bindAppearance(){
  document.querySelectorAll("[data-th]").forEach(b => b.onclick = () => { const i = b.dataset.th.indexOf(":"); themeSet({[b.dataset.th.slice(0, i)]: b.dataset.th.slice(i + 1)}); render(); });
  const r = $("#thr"); if(r) r.onclick = () => { themeSet({...THEME_DEFAULT}); render(); };
}
