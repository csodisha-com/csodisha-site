/* CSO independent source links v3 */
(()=>{
/* ================= EDIT YOUR CONTENT HERE ================= */
const CFG={email:'contact@csodisha.com',social:{instagram:'https://www.instagram.com/csodisha.official/',facebook:'https://www.facebook.com/profile.php?id=61596187936770',x:'https://x.com/csodisha',telegram:'https://t.me/csodisha',whatsapp:'https://whatsapp.com/channel/0029Vb9aQYZ1Hspy0nfzRe0w',youtube:'https://www.youtube.com/@CSOdisha'}};
const NAV=[
 ['jobs','Jobs','💼','/jobs/'],
 ['careers','Careers','🧭','/careers/'],
 ['schemes-benefits','Schemes & Benefits','🏛','/schemes/'],
 ['study-library','Study Library','📖','/study-library/'],
 ['community','Community','👥','/community/'],
 ['about','About','ⓘ','/about/']
];
// Clean-slate v231 + v269 separated Jobs & Careers: Zero hardcoded mega-menu link piles. Submenus sync live from /api/nav/config (D1 /admin/).
const MENUS={
 'jobs':[],
 'careers':[],
 'jobs-careers':[],
 'schemes-benefits':[],
 'study-library':[],
 'community':[],
 'about':[]
};
// cat must match a tab: Jobs, Schemes, Education, Odisha, National. tag: JOB, SCHEME, EDUCATION, ODISHA, GUIDE
let UPDATES=[];
// Page content: 'url-slug':{title:'',html:''}  (slug = lowercase title with dashes)
const CONTENT={};
const I18N={or:{'Home':'ମୂଳପୃଷ୍ଠା','Jobs':'ଚାକିରି','Careers':'କ୍ୟାରିୟର୍','Jobs & Careers':'ଚାକିରି ଓ କ୍ୟାରିୟର','Study Library':'ପାଠାଗାର','Mock Tests':'ମକ୍ ଟେଷ୍ଟ','Schemes':'ଯୋଜନା','Schemes & Benefits':'ଯୋଜନା ଓ ସୁବିଧା','Tools':'ଉପକରଣ','Community':'ସମୁଦାୟ','About':'ଆମ ବିଷୟରେ'},hi:{'Home':'मुख्य पृष्ठ','Jobs':'नौकरियाँ','Careers':'करियर','Jobs & Careers':'नौकरियाँ और करियर','Study Library':'अध्ययन पुस्तकालय','Mock Tests':'मॉक टेस्ट','Schemes':'योजनाएँ','Schemes & Benefits':'योजनाएँ और लाभ','Tools':'उपकरण','Community':'समुदाय','About':'हमारे बारे में'}}; // e.g. hi:{'Home':'होम'}
/* ========================================================== */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const mk=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const ls={g:k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RES=/^(settings|sidebar|customize|upgrade|downloads|comment-.*)$/;
const slug=t=>{const s=t.toLowerCase().replace(/&/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return RES.test(s)?s+'-page':s};
const clean=t=>t.replace(/[→⌄⬆]/g,'').replace(/^[^A-Za-z0-9\u0B00-\u0B7F\u0900-\u097F]+/,'').replace(/\s+/g,' ').trim();
const TITLES={};const reg=t=>{const s=slug(t);TITLES[s]=t;return s};
NAV.forEach(([s,t])=>{TITLES[s]=t;(MENUS[s]||[]).forEach(item=>reg(Array.isArray(item)?item[0]:item))});
let S=Object.assign({lang:'en',theme:null,zoom:1,hc:0,ul:0,rm:0},ls.g('cso')||{});
const T=s=>(S.lang==='or'?window.CSO_ODIA:S.lang==='hi'?window.CSO_HINDI:I18N[S.lang]||{})?.[s]||s;
const ORIGINAL_TEXT=new WeakMap(), ORIGINAL_ATTR=new WeakMap();
function translateText(s){
 const v=String(s), key=v.trim(); if(!key)return v;
 const dict=S.lang==='or'?(window.CSO_ODIA||{}):S.lang==='hi'?(window.CSO_HINDI||{}):(I18N[S.lang]||{});
 const direct=dict[key];if(direct)return v.replace(key,direct);
 const stripped=key.replace(/^[^A-Za-z0-9\u0B00-\u0B7F\u0900-\u097F]+/u,'').trim();
 if(stripped!==key&&dict[stripped])return v.replace(key,key.slice(0,key.indexOf(stripped))+dict[stripped]);
 const prefix=key.match(/^([🔔🛡🧭💬🔥🔧👥📗✈💼🎓🤲🌱📘🛕📅✅🔍📖⊗⊙✕←▶]+\s*)(.*)$/u);
 if(prefix&&dict[prefix[2]])return v.replace(key,prefix[1]+dict[prefix[2]]);
 const arrow=key.match(/^(.*?)(\s*[→⬆])$/u);
 if(arrow&&dict[arrow[1]])return v.replace(key,dict[arrow[1]]+arrow[2]);
 const segments=key.split(/(\s*\|\s*)/);
 if(segments.length>1&&segments.some(x=>dict[x.trim()]))return v.replace(key,segments.map(x=>dict[x.trim()]?x.replace(x.trim(),dict[x.trim()]):x).join(''));
 return v;
}
function localize(root=document){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const n of nodes){if(n.parentElement?.closest('script,style,svg'))continue;
  if(!ORIGINAL_TEXT.has(n))ORIGINAL_TEXT.set(n,n.nodeValue);
  n.nodeValue=translateText(ORIGINAL_TEXT.get(n));}
 const els=[...(root.nodeType===1?[root]:[]),...root.querySelectorAll('*')];
 for(const e of els){if(e.closest('svg'))continue;
  if(!ORIGINAL_ATTR.has(e))ORIGINAL_ATTR.set(e,{});
  const a=ORIGINAL_ATTR.get(e);
  for(const key of ['placeholder','aria-label','title','alt']){
   if(e.hasAttribute(key)){if(!(key in a))a[key]=e.getAttribute(key);e.setAttribute(key,translateText(a[key]));}
  }
 }
}

function setSafeHtml(target, htmlStr) {
 if (!target) return target;
 while (target.firstChild) target.removeChild(target.firstChild);
 appendSafeHtml(target, htmlStr);
 return target;
}
function appendSafeHtml(target, htmlStr) {
 if (!target || !htmlStr) return;
 if (typeof DOMParser === 'undefined') { target.append(document.createTextNode(String(htmlStr))); return; }
 var doc = new DOMParser().parseFromString(String(htmlStr), 'text/html');
 var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1 };
 function walk(node) {
  if (!node) return null;
  if (node.nodeType === 3) return document.createTextNode(node.nodeValue || '');
  if (node.nodeType !== 1) return null;
  var tag = node.tagName.toUpperCase();
  if (DROP[tag]) return null;
  var out = document.createElement(tag.toLowerCase());
  Array.prototype.forEach.call(node.attributes, function (at) {
   var n = at.name.toLowerCase();
   if (n === 'style' || n.slice(0, 2) === 'on') return;
   if ((n === 'href' || n === 'src') && /^\s*(javascript|data|vbscript):/i.test(at.value)) return;
   out.setAttribute(at.name, at.value);
  });
  Array.prototype.forEach.call(node.childNodes, function (ch) {
   var c = walk(ch);
   if (c) out.appendChild(c);
  });
  return out;
 }
 Array.prototype.forEach.call(doc.body.childNodes, function (ch) {
  var c = walk(ch);
  if (c) target.appendChild(c);
 });
}
const toast=m=>{const t=document.createElement('div');t.className='ts';t.textContent=m;document.body.append(t);localize(t);setTimeout(()=>t.remove(),2600)};
const modal=h=>{const o=document.createElement('div');o.className='ov';setSafeHtml(o,'<div class="md" role="dialog" aria-modal="true"><button class="x" data-x aria-label="Close">✕</button>'+h+'</div>');const k=e=>{if(e.key==='Escape')o.close()};o.close=()=>{o.remove();document.removeEventListener('keydown',k)};document.addEventListener('keydown',k);o.onclick=e=>{if(e.target===o||e.target.closest('[data-x]'))o.close()};document.body.append(o);localize(o);const f=$('input,select',o);if(f)f.focus();return o};
const pop=(a,items)=>{$$('.pp').forEach(x=>x.remove());const trig=a&&a.closest?(a.closest('button')||a):a;const m=document.createElement('div');m.className='pp';m.setAttribute('role','menu');const anchor=a.closest('.cso-popup-anchor')||a.parentElement||document.body;const closePop=()=>{m.remove();if(trig&&trig.setAttribute)trig.setAttribute('aria-expanded','false');document.removeEventListener('keydown',onPopKey);};const onPopKey=ev=>{if(!ev)return;const btns=$$('button',m);const idx=btns.indexOf(document.activeElement);if(ev.key==='Escape'){ev.preventDefault();closePop();if(trig&&typeof trig.focus==='function')trig.focus();}else if(ev.key==='ArrowDown'&&btns.length){ev.preventDefault();btns[(idx+1+btns.length)%btns.length].focus();}else if(ev.key==='ArrowUp'&&btns.length){ev.preventDefault();btns[(idx-1+btns.length)%btns.length].focus();}else if(ev.key==='Home'&&btns.length){ev.preventDefault();btns[0].focus();}else if(ev.key==='End'&&btns.length){ev.preventDefault();btns[btns.length-1].focus();}};items.forEach(([l,f,on])=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked',String(Boolean(on)));if(on)b.className='is-active';b.textContent=(on?'✓ ':'')+l;b.onclick=()=>{f();closePop();if(trig&&typeof trig.focus==='function')trig.focus();};m.append(b)});anchor.append(m);if(trig&&trig.setAttribute)trig.setAttribute('aria-expanded','true');document.addEventListener('keydown',onPopKey);localize(m);const activeBtn=$('button.is-active',m)||$('button',m);if(activeBtn&&typeof activeBtn.focus==='function')activeBtn.focus();setTimeout(()=>addEventListener('click',closePop,{once:true}),0)};
const go=s=>{location.hash=s};
let lastQ='';
const getSearchInput=()=>$('#cso-ask-input')||$('#sf input')||$('#sq');
const save=()=>{ls.s('cso',S);try{localStorage.setItem('cso_lang_pref',S.lang||'en');localStorage.setItem('cso_lang',S.lang||'en');}catch(_){}};
const THEMES=['light','dark','system','reading','sepia'];
const THEME_ICONS={light:'☀️',dark:'🌙',system:'💻',reading:'📖',sepia:'☕'};
const dark=()=>{const t=document.documentElement.dataset.theme;return t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme:dark)').matches)};
const ZOOM_CLS=['cso-zoom-85','cso-zoom-90','cso-zoom-95','cso-zoom-100','cso-zoom-105','cso-zoom-110','cso-zoom-115','cso-zoom-120','cso-zoom-125','cso-zoom-130'];
function csoDataThemeAttr(k){if(k==='utkal-bharat'||k==='odisha')return 'odisha';if(k==='dark'||k==='reading')return k;return 'system';}
function apply(){
 const d=document.documentElement;
 const curT=(window.CSOTheme&&typeof window.CSOTheme.getTheme==='function')?window.CSOTheme.getTheme():(THEMES.includes(S.theme)?S.theme:'system');
 d.dataset.theme=csoDataThemeAttr(curT);d.lang=S.lang;d.dataset.lang=S.lang||'en';
 if(document.body){ZOOM_CLS.forEach(c=>document.body.classList.remove(c));const p=Math.round((S.zoom||1)*20)*5;document.body.classList.add('cso-zoom-'+Math.max(85,Math.min(130,p)));document.body.classList.toggle('hc',!!S.hc);document.body.classList.toggle('ul',!!S.ul);document.body.classList.toggle('rm',!!S.rm);}
 try{if(window.CSOGlobal&&typeof window.CSOGlobal.syncA11yFromApp==='function')window.CSOGlobal.syncA11yFromApp();}catch(_){}
}
const LN={en:'English',or:'ଓଡ଼ିଆ',hi:'हिन्दी'};
const CSO_PORTAL_THEMES=[
  {key:'system',label:'System Light',fullLabel:'System Light (Auto)'},
  {key:'dark',label:'Dark Night',fullLabel:'Dark Night'},
  {key:'reading',label:'Reading Mode',fullLabel:'Reading Mode'},
  {key:'utkal-bharat',label:'Odisha & Bharat',fullLabel:'Odisha & Bharat'}
];
const CSO_PORTAL_THEME_KEYS=CSO_PORTAL_THEMES.map(t=>t.key);
function csoResolvePalette(p){
  const r=String(p||'').toLowerCase();
  if(CSO_PORTAL_THEME_KEYS.includes(r))return r;
  if(r.includes('dark')||r.includes('night')||r.includes('obsidian'))return 'dark';
  if(r.includes('reading')||r.includes('kalinga')||r.includes('paper'))return 'reading';
  if(r.includes('utkal')||r.includes('bharat')||r.includes('odisha')||r.includes('heritage')||r.includes('sandstone'))return 'utkal-bharat';
  return 'system';
}
function csoGetStoredTheme(){
  try{const k=localStorage.getItem('cso_portal_theme');return CSO_PORTAL_THEME_KEYS.includes(k)?k:'';}catch(_){return '';}
}
function csoResolveMode(k){
  if(k==='dark')return 'dark';
  if(k==='reading'||k==='utkal-bharat')return 'light';
  try{return (typeof window.matchMedia==='function'&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}catch(_){return 'light';}
}
function csoSyncThemeUi(key){
  const cur=CSO_PORTAL_THEMES.find(t=>t.key===key)||CSO_PORTAL_THEMES[0];
  const bt=$('#bt');
  if(bt&&cur){
    bt.textContent='';
    const sw=document.createElement('span');
    sw.className='cso-theme-swatch is-'+cur.key;
    bt.append(sw,document.createTextNode(' '+cur.label+' ⌄'));
    bt.title='Theme: '+cur.fullLabel;
    bt.setAttribute('data-active-theme',cur.key);
  }
  const mbt=$('#cso-mob-theme-btn');
  if(mbt&&cur){
    mbt.textContent='';
    const msw=document.createElement('span');
    msw.className='cso-theme-swatch is-'+cur.key;
    mbt.append(msw,document.createTextNode(' Theme'));
    mbt.title='Theme: '+cur.fullLabel;
    mbt.setAttribute('aria-label','Switch theme, active: '+cur.fullLabel);
  }
}
if(!window.CSOTheme){
  let _curTheme=csoGetStoredTheme()||'system';
  const setTheme=(key,persist=true)=>{
    const raw=key==='odisha'?'utkal-bharat':key;
    const k=CSO_PORTAL_THEME_KEYS.includes(raw)?raw:'system';
    _curTheme=k;
    document.documentElement.setAttribute('data-cso-theme',k);
    document.documentElement.setAttribute('data-theme',csoDataThemeAttr(k));
    document.documentElement.setAttribute('data-cso-resolved-mode',csoResolveMode(k));
    if(persist){try{localStorage.setItem('cso_portal_theme',k);}catch(_){}}
    csoSyncThemeUi(k);
    return k;
  };
  window.CSOTheme={THEMES:CSO_PORTAL_THEMES,getTheme:()=>_curTheme,getResolvedMode:()=>csoResolveMode(_curTheme),setTheme,resolvePaletteToThemeKey:csoResolvePalette};
  setTheme(_curTheme,false);
  try{
    if(typeof window.matchMedia==='function'){
      const mq=window.matchMedia('(prefers-color-scheme: dark)');
      const onMq=()=>{if(_curTheme==='system')document.documentElement.setAttribute('data-cso-resolved-mode',csoResolveMode('system'));};
      if(typeof mq.addEventListener==='function')mq.addEventListener('change',onMq);
    }
  }catch(_){}
  window.addEventListener('storage',e=>{
    if(e.key==='cso_portal_theme'&&e.newValue&&CSO_PORTAL_THEME_KEYS.includes(e.newValue))setTheme(e.newValue,false);
  });
  if(!csoGetStoredTheme()){
    fetch('/api/config/public',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(cfg=>{
      if(!csoGetStoredTheme()&&cfg&&cfg.identity&&cfg.identity.primary_palette_name){
        setTheme(csoResolvePalette(cfg.identity.primary_palette_name),false);
      }
    }).catch(()=>{});
  }
}

let csoAdminHeaderLinks=null;

function syncHeaderHubText(){
 const hub=$('#cso-header-hub-link');
 if(hub)hub.textContent=S.lang==='or'?'ପ୍ରାର୍ଥୀ ହବ୍':'Candidate Hub';
 const mobLang=$('#cso-mob-lang-btn');
 if(mobLang){
  mobLang.textContent=S.lang==='or'?'EN':'ଓଡ଼ିଆ';
  mobLang.setAttribute('data-cso-lang',S.lang==='or'?'en':'or');
  mobLang.setAttribute('aria-label',S.lang==='or'?'Switch language to English':'Switch language to Odia');
 }
 const hdrMenu=$('#cso-header-menu-toggle');
 if(hdrMenu){
  hdrMenu.replaceChildren();
  const hIc=mk('span','','☰');hIc.setAttribute('aria-hidden','true');
  hdrMenu.append(hIc,mk('span','',S.lang==='or'?'ମେନୁ':'Menu'));
 }
}

function ensureMobileTopActions(){
 const top=$('#header-top');
 if(!top)return;
 if(document.body)document.body.classList.add('cso-v342-mobile-hdr');
 let box=$('#cso-mobile-top-actions');
 if(!box){
  box=mk('div','cso-mobile-top-actions');box.id='cso-mobile-top-actions';
  const mobLang=mk('button','pill cso-mob-quick-btn',S.lang==='or'?'EN':'ଓଡ଼ିଆ');
  mobLang.type='button';mobLang.id='cso-mob-lang-btn';
  const tWrap=mk('span','cso-popup-anchor');
  const mobTheme=mk('button','pill cso-mob-quick-btn');mobTheme.type='button';mobTheme.id='cso-mob-theme-btn';
  mobTheme.setAttribute('aria-haspopup','menu');mobTheme.setAttribute('aria-expanded','false');
  tWrap.appendChild(mobTheme);
  const menuBtn=mk('button','cso-nav-mobile cso-header-menu-btn');menuBtn.type='button';menuBtn.id='cso-header-menu-toggle';
  menuBtn.setAttribute('aria-expanded','false');menuBtn.setAttribute('aria-controls','cso-nav-items');
  menuBtn.setAttribute('aria-label','Open Navigation Menu');
  box.append(mobLang,tWrap,menuBtn);
  const acct=$('.acct',top);
  if(acct)top.insertBefore(box,acct);
  else top.appendChild(box);
 }
 syncHeaderHubText();
 csoSyncThemeUi(window.CSOTheme.getTheme());
}

function setAppLang(nextLang,silent){
 const k=LN[nextLang]?nextLang:'en';
 S.lang=k;
 save();
 apply();
 ctl();
 nav();
 authUI();
 syncHeaderHubText();
 lu();
 route();
 localize();
 try{window.dispatchEvent(new CustomEvent('cso:langchange',{detail:{lang:k}}));}catch(_){}
 if(!silent)toast('Language: '+LN[k]);
}

function ctl(){
 const ctlRoot=$('#ctl');
 if(!ctlRoot)return;
 ctlRoot.replaceChildren();

 // v341: Instant 1-click segmented EN | ଓଡ଼ିଆ toggle
 const langToggle=mk('div','pill cso-lang-toggle');langToggle.id='bl';
 langToggle.setAttribute('role','group');langToggle.setAttribute('aria-label','Language switcher');
 [['en','EN','Switch to English'],['or','ଓଡ଼ିଆ','Switch to Odia']].forEach(([code,lbl,aria])=>{
  const b=mk('button','cso-lang-btn'+(S.lang===code?' is-active':''),lbl);
  b.type='button';
  b.setAttribute('data-cso-lang',code);
  b.setAttribute('aria-pressed',String(S.lang===code));
  b.setAttribute('aria-label',aria);
  b.addEventListener('click',()=>setAppLang(code));
  langToggle.appendChild(b);
 });

 const themeWrap=mk('span','cso-popup-anchor');
 const bt=mk('button','pill cso-ctl-theme');bt.id='bt';bt.type='button';
 bt.setAttribute('aria-label','Select portal theme');
 bt.setAttribute('aria-haspopup','menu');bt.setAttribute('aria-expanded','false');
 themeWrap.appendChild(bt);

 const a11yWrap=mk('span','cso-popup-anchor');
 const ba=mk('button','pill cso-ctl-a11y','♿ A11y ⌄');ba.id='ba';ba.type='button';
 ba.setAttribute('aria-label','Accessibility options');
 ba.setAttribute('aria-haspopup','menu');ba.setAttribute('aria-expanded','false');
 a11yWrap.appendChild(ba);

 const zoomWrap=mk('span','pill cso-ctl-zoom');
 const fm=mk('button','fz','A–');fm.id='fm';fm.type='button';fm.setAttribute('aria-label','Smaller text');
 const fr=mk('button','fz','A');fr.id='fr';fr.type='button';fr.setAttribute('aria-label','Normal text');
 const fp=mk('button','fz','A+');fp.id='fp';fp.type='button';fp.setAttribute('aria-label','Larger text');
 zoomWrap.append(fm,fr,fp);

 ctlRoot.append(langToggle,themeWrap,a11yWrap,zoomWrap);
 ensureMobileTopActions();
 csoSyncThemeUi(window.CSOTheme.getTheme());
 syncHeaderHubText();
 bt.onclick=e=>{e.stopPropagation();pop(bt,CSO_PORTAL_THEMES.map(t=>[t.fullLabel,()=>{window.CSOTheme.setTheme(t.key,true);},window.CSOTheme.getTheme()===t.key]));};
 ba.onclick=e=>{e.stopPropagation();pop(ba,[['High contrast',()=>{S.hc=+!S.hc;save();apply()},S.hc],['Dyslexia-friendly font',()=>{if(window.CSOGlobal)window.CSOGlobal.toggleA11y('dyslexia');},document.documentElement.classList.contains('cso-a11y-dyslexia')],['Lite mode (reduced graphics)',()=>{if(window.CSOGlobal)window.CSOGlobal.toggleA11y('lite');},document.documentElement.classList.contains('cso-a11y-lite')],['Underline links',()=>{S.ul=+!S.ul;save();apply()},S.ul],['Reduce motion',()=>{S.rm=+!S.rm;save();apply()},S.rm],['Reset',()=>{S.hc=S.ul=S.rm=0;S.zoom=1;save();apply();if(window.CSOGlobal)window.CSOGlobal.resetA11y();}]]);};
 const z=d=>{S.zoom=d?Math.max(.85,Math.min(1.3,+(S.zoom+d).toFixed(2))):1;save();apply()};
 fm.onclick=()=>z(-.05);fr.onclick=()=>z(0);fp.onclick=()=>z(.05);
}
function heroLang(){
 const isMob=typeof window!=='undefined'&&window.innerWidth<768;
 const words=isMob?{
  en:['Ask jobs, schemes, exams, syllabus...','Popular Searches:'],
  or:['ଚାକିରି, ଯୋଜନା, ପରୀକ୍ଷା, ସିଲାବସ୍ ଖୋଜନ୍ତୁ...','ଲୋକପ୍ରିୟ ସନ୍ଧାନ:'],
  hi:['नौकरियाँ, योजनाएँ, परीक्षा, सिलेबस खोजें...','लोकप्रिय खोजें:']
 }:{
  en:['Ask CSOdisha in EN or ଓଡ଼ିଆ — jobs, schemes, syllabus, OPSC, scholarships...','Popular Searches:'],
  or:['ଓଡ଼ିଆ କିମ୍ବା ଇଂରାଜୀରେ ପଚାରନ୍ତୁ — ଚାକିରି, ଯୋଜନା, ସିଲାବସ୍, OPSC, ବୃତ୍ତି...','ଲୋକପ୍ରିୟ ସନ୍ଧାନ:'],
  hi:['नौकरियाँ, योजनाएँ, अध्ययन सामग्री और लेख खोजें...','लोकप्रिय खोजें:']
 };
 const w=words[S.lang]||words.en;
 const inp=getSearchInput();
 if(inp)inp.placeholder=w[0];
 const cp=$('.chips span');
 if(cp)cp.textContent=w[1];
}
function ensureDrawerBackdrop(){
 const navBar=$('#cso-main-navbar');
 const navw=$('#navw');
 let backdrop=$('#cso-mobile-drawer-backdrop');
 if(!backdrop){
  backdrop=mk('div','cso-mobile-drawer-backdrop');
  backdrop.id='cso-mobile-drawer-backdrop';
  backdrop.hidden=true;
 }
 if(navBar&&backdrop.parentNode!==navBar){
  if(navw&&navw.parentNode===navBar)navBar.insertBefore(backdrop,navw);
  else navBar.prepend(backdrop);
 }
 return backdrop;
}
function setMobileDrawerOpen(open){
 const items=$('#cso-nav-items');
 const toggles=$$('#cso-header-menu-toggle, #navw .cso-nav-mobile');
 const backdrop=ensureDrawerBackdrop();
 if(!items)return;
 const next=Boolean(open);
 items.classList.toggle('cso-mobile-open',next);
 toggles.forEach(t=>t.setAttribute('aria-expanded',String(next)));
 if(backdrop)backdrop.hidden=!next;
 document.documentElement.classList.toggle('cso-drawer-open',next);
 if(document.body){
  document.body.classList.toggle('cso-drawer-open',next);
  document.body.classList.toggle('cso-modal-open',next);
 }
 if(!next)csoCloseNavDropdowns();
}

function buildDrawerUtilities(){
 const foot=mk('div','cso-drawer-foot cso-drawer-utilities');
 const isOr=S.lang==='or';

 // Account / Candidate Hub row inside drawer
 const acctRow=mk('div','cso-drawer-acct-row');
 if(csoAuthUser){
  const isAdm=csoAuthUser.role==='admin'||csoAuthUser.role==='superadmin';
  const dashA=mk('a','btn p cso-btn-candidate-hub cso-drawer-hub-btn',isAdm?(isOr?'🛡️ ଆଡମିନ୍ ଷ୍ଟୁଡିଓ':'🛡️ Admin Studio'):(isOr?'👤 ମୋ ଡ୍ୟାସବୋର୍ଡ':'👤 My Dashboard'));
  dashA.href=isAdm?'/admin/':'/student-dashboard/';
  acctRow.appendChild(dashA);
  if(isAdm){
   const hubA=mk('a','cso-drawer-util-btn',isOr?'👤 ପ୍ରାର୍ଥୀ ହବ୍':'👤 Candidate Hub');
   hubA.href='/student-dashboard/';
   acctRow.appendChild(hubA);
  }
  const loBtn=mk('button','cso-drawer-util-btn',isOr?'ଲଗଆଉଟ୍':'Logout');
  loBtn.type='button';loBtn.id='cso-drawer-logout';
  acctRow.appendChild(loBtn);
 }else{
  const hubMob=mk('a','btn p cso-btn-candidate-hub cso-drawer-hub-btn',isOr?'👤 ପ୍ରାର୍ଥୀ ହବ୍ →':'👤 Candidate Hub →');
  hubMob.href='/student-dashboard/';
  const authPair=mk('div','cso-drawer-auth-pair');
  const liBtn=mk('button','cso-drawer-util-btn',isOr?'ଲଗଇନ୍':'Login');liBtn.type='button';liBtn.id='cso-drawer-li';
  const suBtn=mk('button','cso-drawer-util-btn',isOr?'ସାଇନ୍ ଅପ୍':'Sign Up');suBtn.type='button';suBtn.id='cso-drawer-su';
  authPair.append(liBtn,suBtn);
  acctRow.append(hubMob,authPair);
 }

 // Accessibility & Font Size row inside drawer
 const a11yRow=mk('div','cso-drawer-a11y-row');
 const a11yAnchor=mk('span','cso-popup-anchor');
 const baMob=mk('button','cso-drawer-util-btn cso-ctl-a11y-mobile',isOr?'♿ ସୁବିଧା ବିକଳ୍ପ':'♿ Accessibility');
 baMob.type='button';baMob.id='ba-mobile';baMob.setAttribute('aria-label','Accessibility options');
 a11yAnchor.appendChild(baMob);
 const zoomMob=mk('div','cso-drawer-zoom-group cso-ctl-zoom-mobile');
 zoomMob.setAttribute('role','group');zoomMob.setAttribute('aria-label','Font size');
 [['fm-mobile','Smaller text','A–'],['fr-mobile','Normal text','A'],['fp-mobile','Larger text','A+']].forEach(([id,lbl,txt])=>{
  const b=mk('button','fz cso-drawer-zoom-btn',txt);b.type='button';b.id=id;b.setAttribute('aria-label',lbl);zoomMob.appendChild(b);
 });
 a11yRow.append(a11yAnchor,zoomMob);

 foot.append(acctRow,a11yRow);
 return foot;
}

function nav(){
 const w=$('#navw');
 if(!w)return;
 ensureMobileTopActions();
 w.replaceChildren();
 const bar=mk('div','cso-nav-bar-container');
 const mobBtn=mk('button','cso-nav-mobile');mobBtn.type='button';mobBtn.id='cso-menu-toggle';
 mobBtn.setAttribute('aria-expanded','false');mobBtn.setAttribute('aria-controls','cso-nav-items');mobBtn.setAttribute('aria-label','Open Navigation Menu');
 const ham=mk('span','','☰');ham.setAttribute('aria-hidden','true');mobBtn.append(ham,' ',S.lang==='or'?'ମେନୁ':'Menu');
 bar.appendChild(mobBtn);
 const itemsWrap=mk('div','cso-nav-items');itemsWrap.id='cso-nav-items';
 const drawerHead=mk('div','cso-drawer-head');
 drawerHead.appendChild(mk('strong','cso-drawer-brand',S.lang==='or'?'କମନ୍ ସେନ୍ସ ଓଡ଼ିଶା':'Common Sense Odisha'));
 const drawerClose=mk('button','cso-drawer-close','✕');drawerClose.type='button';drawerClose.id='cso-drawer-close';
 drawerClose.setAttribute('aria-label','Close navigation menu');
 drawerHead.appendChild(drawerClose);
 itemsWrap.appendChild(drawerHead);
 const homeLink=mk('a','cso-nav-home');homeLink.href='/';homeLink.setAttribute('data-h','');
 const hIc=mk('span','','🏠');hIc.setAttribute('aria-hidden','true');homeLink.append(hIc,' '+translateText('Home'));
 itemsWrap.appendChild(homeLink);
 const normalizeHeaderList=(rawList)=>{
  const hasCareers=rawList.some(it=>!Array.isArray(it)&&String(it&&it.url||'').replace(/^\/+|\/+$/g,'').toLowerCase()==='careers');
  const out=[];
  rawList.forEach(it=>{
   if(Array.isArray(it)){out.push(it);return;}
   const seg=String(it&&it.url||'').replace(/^\/+|\/+$/g,'').split('/')[0].toLowerCase();
   const lbl=String(it&&it.label_en||'').trim().toLowerCase();
   if((seg==='jobs-careers'||lbl==='jobs & careers')&&!hasCareers){
    out.push({id:'nmenu-jobs',key:'jobs',label_en:'Jobs',label_or:'ଚାକିରି',url:'/jobs/',icon_key:'💼',sort_order:Number(it.sort_order||1)});
    out.push({id:'nmenu-careers',key:'careers',label_en:'Careers',label_or:'କ୍ୟାରିୟର୍',url:'/careers/',icon_key:'🧭',sort_order:Number(it.sort_order||1)+0.5});
   }else{
    out.push(it);
   }
  });
  return out;
 };
 const JOBS_FLYOUT_CACHE_KEY='cso_jobs_flyout_v277';
 const JOBS_DEFAULT_SECTORS=[
  {id:'jtax_l1_government',slug:'government',icon:'🏛️',title_en:'Government',title_or:'ସରକାରୀ ଚାକିରି'},
  {id:'jtax_l1_private',slug:'private',icon:'💼',title_en:'Private',title_or:'ବେସରକାରୀ ଚାକିରି'},
  {id:'jtax_l1_psu',slug:'psu',icon:'🏭',title_en:'PSUs',title_or:'ରାଷ୍ଟ୍ରାୟତ୍ତ ଉଦ୍ୟୋଗ (PSU)'},
  {id:'jtax_l1_ngo',slug:'ngo',icon:'🤝',title_en:'NGOs / Non-Profit',title_or:'ଏନଜିଓ / ଅଣ-ଲାଭଜନକ'},
  {id:'jtax_l1_foreign',slug:'foreign',icon:'✈️',title_en:'Foreign Jobs',title_or:'ବିଦେଶୀ ଚାକିରି'}
 ];
 const JOBS_STAGE2_REGIONS=[
  ['central','Central','କେନ୍ଦ୍ର'],
  ['odisha','Odisha','ଓଡ଼ିଶା'],
  ['all-india','All Over India','ସମଗ୍ର ଭାରତ']
 ];
 const readJobsFlyoutCache=()=>{
  try{
   const raw=sessionStorage.getItem(JOBS_FLYOUT_CACHE_KEY);
   if(raw){const p=JSON.parse(raw);if(p&&p.ts&&(Date.now()-p.ts<120000)&&Array.isArray(p.sectors)&&p.sectors.length)return p;}
  }catch(_e){}
  return null;
 };
 const getActiveJobsSectors=()=>{
  const c=readJobsFlyoutCache();
  return (c&&Array.isArray(c.sectors)&&c.sectors.length)?c.sectors:JOBS_DEFAULT_SECTORS;
 };
 const buildStage2List=(sec,isOr)=>{
  const sl=encodeURIComponent((sec&&sec.slug)||'government');
  const ul=mk('ul','cso-js2-list');
  JOBS_STAGE2_REGIONS.forEach(([k,enL,orL])=>{
   const li=mk('li','cso-js2-item');
   const a=mk('a','cso-js2-link',isOr?orL:enL);
   a.href='/jobs/?sector='+sl+'&region='+k;
   li.appendChild(a);ul.appendChild(li);
  });
  return ul;
 };
 const renderStage2=(stage2,sec,isOr)=>{
  stage2.replaceChildren();
  if(!sec)return;
  stage2.appendChild(buildStage2List(sec,isOr));
 };
 const buildMobSub=(sec,isOr)=>{
  const box=mk('div','cso-js1-mob-sub');
  box.appendChild(buildStage2List(sec,isOr));
  return box;
 };
 const populateStage1=(cascade,s1List,stage2)=>{
  const isOr=S.lang==='or';
  const sectors=getActiveJobsSectors();
  s1List.replaceChildren();
  const activate=(sec,li,openS2)=>{
   s1List.querySelectorAll('.cso-js1-item.is-active').forEach(x=>x.classList.remove('is-active'));
   if(li)li.classList.add('is-active');
   const isDirectOnly=String((sec&&sec.slug)||'').toLowerCase()==='foreign';
   if(isDirectOnly){
    cascade.classList.remove('is-stage2-open');
    stage2.replaceChildren();
    return;
   }
   renderStage2(stage2,sec,isOr);
   if(openS2&&window.innerWidth>=1100){
    cascade.classList.add('is-stage2-open');
    const s1Box=cascade.querySelector('.cso-jobs-stage1');
    if(s1Box){const rc=s1Box.getBoundingClientRect();stage2.classList.toggle('is-flip-left',rc.right+224>window.innerWidth);}
   }
  };
  sectors.forEach(sec=>{
   const slugLower=String(sec.slug||'').toLowerCase();
   const hasStage2=slugLower!=='foreign';
   const li=mk('li','cso-js1-item'+(hasStage2?'':' is-direct-only'));li.dataset.jsSector=sec.slug||'';
   const row=mk('div','cso-js1-row');
   const a=mk('a','cso-js1-link');a.href='/jobs/?sector='+encodeURIComponent(sec.slug||'government');
   const lf=mk('span','cso-js1-left');
   const ic=mk('span','cso-js1-icon',sec.icon||'💼');ic.setAttribute('aria-hidden','true');
   lf.append(ic,mk('span','cso-js1-title',isOr?(sec.title_or||sec.title_en):sec.title_en));
   a.appendChild(lf);
   if(hasStage2){
    const arr=mk('span','cso-js1-arrow','›');arr.setAttribute('aria-hidden','true');
    a.appendChild(arr);
   }
   row.appendChild(a);
   if(hasStage2){
    const mExp=mk('button','cso-js1-mob-exp','▾');mExp.type='button';
    mExp.setAttribute('aria-expanded','false');mExp.setAttribute('aria-label','Expand '+(sec.title_en||'sector')+' regions');
    mExp.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();const op=li.classList.toggle('is-mob-open');mExp.setAttribute('aria-expanded',String(op));});
    row.appendChild(mExp);
    li.append(row,buildMobSub(sec,isOr));
   }else{
    li.appendChild(row);
   }
   li.addEventListener('mouseenter',()=>{if(window.innerWidth>=1100)activate(sec,li,hasStage2);});
   a.addEventListener('focus',()=>{if(window.innerWidth>=1100)activate(sec,li,hasStage2);});
   a.addEventListener('keydown',ev=>{
    if(ev.key==='ArrowRight'&&hasStage2&&window.innerWidth>=1100){ev.preventDefault();activate(sec,li,true);const f=stage2.querySelector('a');if(f)f.focus();}
    else if(ev.key==='ArrowDown'){ev.preventDefault();const n=li.nextElementSibling;if(n){const na=n.querySelector('.cso-js1-link');if(na)na.focus();}}
    else if(ev.key==='ArrowUp'){ev.preventDefault();const p=li.previousElementSibling;if(p){const pa=p.querySelector('.cso-js1-link');if(pa)pa.focus();}}
   });
   s1List.appendChild(li);
  });
 };
 const hydrateJobsFlyout=(cascade,s1List,stage2)=>{
  const cached=readJobsFlyoutCache();
  if(cached){populateStage1(cascade,s1List,stage2);return;}
  if(window.__csoJobsFlyoutFetching||typeof fetch!=='function')return;
  window.__csoJobsFlyoutFetching=true;
  fetch('/api/public/jobs/bootstrap',{credentials:'same-origin'})
   .then(r=>r.ok?r.json():null)
   .then(d=>{
    if(!d||!d.ok)return;
    let sectors=[];
    if(Array.isArray(d.nav_sectors)&&d.nav_sectors.length){
     sectors=d.nav_sectors.map(l1=>({id:l1.id,slug:l1.slug,title_en:l1.title_en,title_or:l1.title_or||l1.title_en,icon:l1.icon||'💼'}));
    }else if(Array.isArray(d.tree)&&d.tree.length){
     sectors=d.tree.map(l1=>({id:l1.id,slug:l1.slug,title_en:l1.title_en,title_or:l1.title_or||l1.title_en,icon:l1.icon||'💼'}));
    }else{
     sectors=JOBS_DEFAULT_SECTORS;
    }
    try{sessionStorage.setItem(JOBS_FLYOUT_CACHE_KEY,JSON.stringify({ts:Date.now(),sectors}));}catch(_e){}
    $$('.cso-jobs-cascade').forEach(cEl=>{
     const l=cEl.querySelector('.cso-js1-list'),s2=cEl.querySelector('.cso-jobs-stage2');
     if(l&&s2)populateStage1(cEl,l,s2);
    });
   }).catch(()=>{});
 };
 window.__csoHydrateJobsFlyout=(cEl)=>{if(cEl)hydrateJobsFlyout(cEl,cEl.querySelector('.cso-js1-list'),cEl.querySelector('.cso-jobs-stage2'));};
 const buildJobsCascading=()=>{
  const isOr=S.lang==='or';
  const cascade=mk('div','cso-jobs-cascade');cascade.id='cso-jobs-cascade';
  const stage1=mk('div','cso-jobs-stage1');stage1.id='cso-jobs-stage1';
  stage1.setAttribute('role','region');stage1.setAttribute('aria-label',isOr?'ଚାକିରି କ୍ଷେତ୍ର ମେନୁ':'Jobs sectors menu');
  const list=mk('ul','cso-js1-list');stage1.appendChild(list);
  const stage2=mk('div','cso-jobs-stage2');stage2.id='cso-jobs-stage2';
  stage2.setAttribute('role','region');stage2.setAttribute('aria-label',isOr?'ଭୌଗୋଳିକ ପରିସର':'Geographic scopes');
  stage2.addEventListener('keydown',ev=>{
   if(ev.key==='ArrowLeft'){ev.preventDefault();const al=list.querySelector('.cso-js1-item.is-active .cso-js1-link')||list.querySelector('.cso-js1-link');if(al)al.focus();}
  });
  populateStage1(cascade,list,stage2);
  cascade.append(stage1,stage2);
  return cascade;
 };
 const wireJobsCascading=(ni,trigA,chevBtn,cascade)=>{
  let closeT=null;
  const s1List=cascade.querySelector('.cso-js1-list'),stage2=cascade.querySelector('.cso-jobs-stage2');
  const setOpen=(open)=>{
   if(open){csoCloseNavDropdowns(ni);hydrateJobsFlyout(cascade,s1List,stage2);}
   else{cascade.classList.remove('is-stage2-open');s1List.querySelectorAll('.cso-js1-item.is-active').forEach(x=>x.classList.remove('is-active'));}
   ni.classList.toggle('cso-open',open);
   trigA.setAttribute('aria-expanded',String(open));
   chevBtn.setAttribute('aria-expanded',String(open));
  };
  ni.addEventListener('mouseenter',()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);setOpen(true);});
  ni.addEventListener('mouseleave',()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);closeT=setTimeout(()=>setOpen(false),150);});
  trigA.addEventListener('keydown',ev=>{
   if(ev.key==='ArrowDown'){ev.preventDefault();setOpen(true);const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   else if(ev.key==='Escape'){setOpen(false);}
  });
  chevBtn.addEventListener('keydown',ev=>{
   if(ev.key==='Enter'||ev.key===' '||ev.key==='ArrowDown'){
    ev.preventDefault();const next=ev.key==='ArrowDown'?true:!ni.classList.contains('cso-open');setOpen(next);
    if(next){const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   }else if(ev.key==='Escape'){setOpen(false);chevBtn.focus();}
  });
  ni.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&ni.classList.contains('cso-open')){ev.preventDefault();setOpen(false);trigA.focus();}});
 };
 const CAREERS_FLYOUT_CACHE_KEY='cso_careers_flyout_v278';
 const CAREERS_DEFAULT_TRACKS=[
  {id:'ctax-track-civil-services',slug:'civil-services',icon:'🏛️',label_en:'Civil Services',label_or:'ସିଭିଲ୍ ସର୍ଭିସେସ୍'},
  {id:'ctax-track-engineering-it',slug:'engineering-it',icon:'💻',label_en:'Engineering / IT',label_or:'ଇଞ୍ଜିନିୟରିଂ / ଆଇଟି'},
  {id:'ctax-track-banking-finance',slug:'banking-finance',icon:'🏦',label_en:'Banking & Finance',label_or:'ବ୍ୟାଙ୍କିଂ ଓ ଅର୍ଥନୀତି'},
  {id:'ctax-track-healthcare',slug:'healthcare',icon:'🩺',label_en:'Healthcare',label_or:'ସ୍ୱାସ୍ଥ୍ୟ ସେବା'},
  {id:'ctax-track-agriculture',slug:'agriculture',icon:'🌾',label_en:'Agriculture',label_or:'କୃଷି ଓ ଆନୁଷଙ୍ଗିକ'},
  {id:'ctax-track-pathways',slug:'pathways',icon:'🧭',label_en:'Career Stage & Pathways',label_or:'କ୍ୟାରିୟର୍ ପର୍ଯ୍ୟାୟ ଓ ମାର୍ଗ'}
 ];
 const readCareersFlyoutCache=()=>{
  try{
   const raw=sessionStorage.getItem(CAREERS_FLYOUT_CACHE_KEY);
   if(raw){const p=JSON.parse(raw);if(p&&p.ts&&(Date.now()-p.ts<120000)&&Array.isArray(p.tracks)&&p.tracks.length)return p;}
  }catch(_e){}
  return null;
 };
 const getActiveCareersTracks=()=>{
  const c=readCareersFlyoutCache();
  return (c&&Array.isArray(c.tracks)&&c.tracks.length)?c.tracks:CAREERS_DEFAULT_TRACKS;
 };
 const populateCareersStage1=(s1List)=>{
  if(!s1List)return;
  const isOr=S.lang==='or';
  const tracks=getActiveCareersTracks();
  s1List.replaceChildren();
  const items=tracks.map(tr=>({
   slug:tr.slug||'civil-services',
   icon:tr.icon||'🧭',
   title:isOr?(tr.label_or||tr.label_en):tr.label_en,
   href:'/careers/?track='+encodeURIComponent(tr.slug||'civil-services')
  }));
  items.push({slug:'all',icon:'📋',title:isOr?'ସମସ୍ତ କ୍ୟାରିୟର୍ ରୋଡମ୍ୟାପ୍':'All Career Roadmaps',href:'/careers/'});
  items.forEach(item=>{
   const li=mk('li','cso-js1-item is-direct-only');li.dataset.crTrack=item.slug;
   const row=mk('div','cso-js1-row');
   const a=mk('a','cso-js1-link');a.href=item.href;
   const lf=mk('span','cso-js1-left');
   const ic=mk('span','cso-js1-icon',item.icon);ic.setAttribute('aria-hidden','true');
   lf.append(ic,mk('span','cso-js1-title',item.title));
   a.appendChild(lf);
   row.appendChild(a);
   li.appendChild(row);
   a.addEventListener('keydown',ev=>{
    if(ev.key==='ArrowDown'){ev.preventDefault();const n=li.nextElementSibling;if(n){const na=n.querySelector('.cso-js1-link');if(na)na.focus();}}
    else if(ev.key==='ArrowUp'){ev.preventDefault();const p=li.previousElementSibling;if(p){const pa=p.querySelector('.cso-js1-link');if(pa)pa.focus();}}
   });
   s1List.appendChild(li);
  });
 };
 const hydrateCareersFlyout=(s1List)=>{
  const cached=readCareersFlyoutCache();
  if(cached){populateCareersStage1(s1List);return;}
  if(window.__csoCareersFlyoutFetching||typeof fetch!=='function')return;
  window.__csoCareersFlyoutFetching=true;
  fetch('/api/public/careers/bootstrap',{credentials:'same-origin'})
   .then(r=>r.ok?r.json():null)
   .then(d=>{
    if(!d||!d.ok)return;
    let tracks=[];
    if(Array.isArray(d.nav_tracks)&&d.nav_tracks.length){tracks=d.nav_tracks;}
    else if(d.taxonomy&&Array.isArray(d.taxonomy.tracks)&&d.taxonomy.tracks.length){
     tracks=d.taxonomy.tracks.map(tr=>({id:tr.id,slug:tr.slug,label_en:tr.label_en,label_or:tr.label_or||tr.label_en,icon:tr.icon||'🧭'}));
    }else{tracks=CAREERS_DEFAULT_TRACKS;}
    try{sessionStorage.setItem(CAREERS_FLYOUT_CACHE_KEY,JSON.stringify({ts:Date.now(),tracks}));}catch(_e){}
    $$('.cso-careers-cascade .cso-js1-list').forEach(l=>populateCareersStage1(l));
   }).catch(()=>{});
 };
 window.__csoHydrateCareersFlyout=(cEl)=>{if(cEl)hydrateCareersFlyout(cEl.querySelector('.cso-js1-list'));};
 const buildCareersCascading=()=>{
  const isOr=S.lang==='or';
  const cascade=mk('div','cso-careers-cascade');cascade.id='cso-careers-cascade';
  const stage1=mk('div','cso-careers-stage1');stage1.id='cso-careers-stage1';
  stage1.setAttribute('role','region');stage1.setAttribute('aria-label',isOr?'କ୍ୟାରିୟର୍ ମାର୍ଗ ମେନୁ':'Career tracks menu');
  const list=mk('ul','cso-js1-list');stage1.appendChild(list);
  populateCareersStage1(list);
  cascade.appendChild(stage1);
  return cascade;
 };
 const wireCareersCascading=(ni,trigA,chevBtn,cascade)=>{
  let closeT=null;
  const s1List=cascade.querySelector('.cso-js1-list');
  const s1Box=cascade.querySelector('.cso-careers-stage1');
  const setOpen=(open)=>{
   if(open){csoCloseNavDropdowns(ni);hydrateCareersFlyout(s1List);}
   else{s1List.querySelectorAll('.cso-js1-item.is-active').forEach(x=>x.classList.remove('is-active'));}
   ni.classList.toggle('cso-open',open);
   ni.classList.toggle('is-open',open);
   trigA.setAttribute('aria-expanded',String(open));
   chevBtn.setAttribute('aria-expanded',String(open));
  };
  ni.addEventListener('mouseenter',()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);setOpen(true);});
  ni.addEventListener('mouseleave',()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);closeT=setTimeout(()=>setOpen(false),150);});
  if(s1Box){s1Box.addEventListener('mouseenter',()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);});}
  trigA.addEventListener('keydown',ev=>{
   if(ev.key==='ArrowDown'){ev.preventDefault();setOpen(true);const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   else if(ev.key==='Escape'){setOpen(false);}
  });
  chevBtn.addEventListener('keydown',ev=>{
   if(ev.key==='Enter'||ev.key===' '||ev.key==='ArrowDown'){
    ev.preventDefault();const next=ev.key==='ArrowDown'?true:!ni.classList.contains('cso-open');setOpen(next);
    if(next){const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   }else if(ev.key==='Escape'){setOpen(false);chevBtn.focus();}
  });
  ni.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&ni.classList.contains('cso-open')){ev.preventDefault();setOpen(false);trigA.focus();}});
 };
 const SCHEMES_DD_ITEMS=[
  {slug:'odisha',icon:'🏛️',title_en:'Odisha State Schemes',title_or:'ଓଡ଼ିଶା ରାଜ୍ୟ ଯୋଜନା',href:'/schemes/?scope=odisha'},
  {slug:'central',icon:'🇮🇳',title_en:'Central Government Schemes',title_or:'କେନ୍ଦ୍ର ସରକାରୀ ଯୋଜନା',href:'/schemes/?scope=central'},
  {slug:'all',icon:'📋',title_en:'All Schemes & Benefits',title_or:'ସମସ୍ତ ଯୋଜନା ଓ ସୁବିଧା',href:'/schemes/'}
 ];
 const renderSchemesS1=(s1List)=>{
  if(!s1List)return;
  const isOr=S.lang==='or';
  s1List.replaceChildren();
  SCHEMES_DD_ITEMS.forEach(item=>{
   const li=mk('li','cso-js1-item is-direct-only');li.dataset.schScope=item.slug;
   const row=mk('div','cso-js1-row');
   const a=mk('a','cso-js1-link');a.href=item.href;
   const lf=mk('span','cso-js1-left');
   const ic=mk('span','cso-js1-icon',item.icon);ic.setAttribute('aria-hidden','true');
   lf.append(ic,mk('span','cso-js1-title',isOr?item.title_or:item.title_en));
   a.appendChild(lf);
   row.appendChild(a);
   li.appendChild(row);
   a.addEventListener('keydown',ev=>{
    if(ev.key==='ArrowDown'){ev.preventDefault();const n=li.nextElementSibling;if(n){const na=n.querySelector('.cso-js1-link');if(na)na.focus();}}
    else if(ev.key==='ArrowUp'){ev.preventDefault();const p=li.previousElementSibling;if(p){const pa=p.querySelector('.cso-js1-link');if(pa)pa.focus();}}
   });
   s1List.appendChild(li);
  });
 };
 window.__csoHydrateSchemesFlyout=(cEl)=>{if(cEl)renderSchemesS1(cEl.querySelector('.cso-js1-list'));};
 const buildSchemesCascading=()=>{
  const cascade=mk('div','cso-schemes-cascade');cascade.id='cso-schemes-cascade';
  const stage1=mk('div','cso-schemes-stage1');stage1.id='cso-schemes-stage1';
  stage1.setAttribute('role','region');stage1.setAttribute('aria-label','Schemes & Benefits');
  const list=mk('ul','cso-js1-list');stage1.appendChild(list);
  cascade.appendChild(stage1);
  renderSchemesS1(list);
  return cascade;
 };
 const wireSchemesCascading=(ni,trigA,chevBtn,cascade)=>{
  let closeT=null;
  const s1List=cascade.querySelector('.cso-js1-list');
  const setOpen=(open)=>{
   if(open){csoCloseNavDropdowns(ni);renderSchemesS1(s1List);}
   ni.classList.toggle('cso-open',open);
   trigA.setAttribute('aria-expanded',String(open));
   chevBtn.setAttribute('aria-expanded',String(open));
  };
  ni.addEventListener('mouseenter',()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);setOpen(true);});
  ni.addEventListener('mouseleave',()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);closeT=setTimeout(()=>setOpen(false),150);});
  trigA.addEventListener('keydown',ev=>{
   if(ev.key==='ArrowDown'){ev.preventDefault();setOpen(true);const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   else if(ev.key==='Escape'){setOpen(false);}
  });
  chevBtn.addEventListener('keydown',ev=>{
   if(ev.key==='Enter'||ev.key===' '||ev.key==='ArrowDown'){
    ev.preventDefault();const next=ev.key==='ArrowDown'?true:!ni.classList.contains('cso-open');setOpen(next);
    if(next){const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   }else if(ev.key==='Escape'){setOpen(false);chevBtn.focus();}
  });
  ni.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&ni.classList.contains('cso-open')){ev.preventDefault();setOpen(false);trigA.focus();}});
 };
 const STUDY_DROPDOWN_CACHE_KEY='cso_study_library_dropdown_v286';
 const STUDY_RETIRED_SLUGS=new Set(['skill-coding-digital','previous-papers-mock-tests']);
 const STUDY_DEFAULT_TRACKS=[
  {id:'stl_l1_central_exams',slug:'central-competitive-exams',icon:'🇮🇳',title_en:'Central Competitive Exams',title_or:'କେନ୍ଦ୍ରୀୟ ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା'},
  {id:'stl_l1_odisha_state',slug:'odisha-state-exams',icon:'🏛️',title_en:'Odisha State Exams',title_or:'ଓଡ଼ିଶା ରାଜ୍ୟ ପରୀକ୍ଷା'},
  {id:'stl_l1_teaching_educator',slug:'teaching-educator-exams',icon:'🎓',title_en:'Teaching & Educator Exams',title_or:'ଶିକ୍ଷକ ଓ ଶିକ୍ଷାଦାନ ପରୀକ୍ଷା'},
  {id:'stl_l1_school_board',slug:'school-board-notes',icon:'📘',title_en:'School & Board Exams',title_or:'ବିଦ୍ୟାଳୟ ଓ ବୋର୍ଡ ପରୀକ୍ଷା'}
 ];
 let studyTracksData=null,studyTracksFetched=false;
 const getStudyTracks=()=>{
  if(Array.isArray(studyTracksData)&&studyTracksData.length)return studyTracksData;
  try{const raw=sessionStorage.getItem(STUDY_DROPDOWN_CACHE_KEY);if(raw){const p=JSON.parse(raw);if(p&&Array.isArray(p.tracks)&&p.tracks.length&&(Date.now()-Number(p.ts||0)<300000)){studyTracksData=p.tracks;return studyTracksData;}}}catch(_e){}
  return STUDY_DEFAULT_TRACKS;
 };
 const renderStudyS1=(s1List)=>{
  if(!s1List)return;
  s1List.replaceChildren();
  const isOr=S.lang==='or';
  const list=getStudyTracks().map(t=>({slug:t.slug,icon:t.icon||'📚',title_en:t.title_en||t.slug,title_or:t.title_or||t.title_en||t.slug,href:'/study-library/?track='+encodeURIComponent(t.slug||'')}));
  list.push({slug:'all',icon:'📖',title_en:'All Study Resources',title_or:'ସମସ୍ତ ଅଧ୍ୟୟନ ସାମଗ୍ରୀ',href:'/study-library/'});
  list.forEach(item=>{
   const li=mk('li','cso-js1-item');li.dataset.track=item.slug;
   const row=mk('div','cso-js1-row');
   const a=mk('a','cso-js1-link');a.href=item.href;
   const lf=mk('span','cso-js1-left');
   const ic=mk('span','cso-js1-icon',item.icon);ic.setAttribute('aria-hidden','true');
   lf.append(ic,mk('span','cso-js1-title',isOr?item.title_or:item.title_en));
   a.appendChild(lf);
   row.appendChild(a);
   li.appendChild(row);
   a.addEventListener('keydown',ev=>{
    if(ev.key==='ArrowDown'){ev.preventDefault();const n=li.nextElementSibling;if(n){const na=n.querySelector('.cso-js1-link');if(na)na.focus();}}
    else if(ev.key==='ArrowUp'){ev.preventDefault();const p=li.previousElementSibling;if(p){const pa=p.querySelector('.cso-js1-link');if(pa)pa.focus();}}
   });
   s1List.appendChild(li);
  });
 };
 const hydrateStudyDropdown=(cEl)=>{
  if(cEl)renderStudyS1(cEl.querySelector('.cso-js1-list'));
  if(studyTracksFetched||typeof fetch!=='function')return;
  studyTracksFetched=true;
  fetch('/api/public/study-library/bootstrap',{credentials:'same-origin'})
   .then(r=>r.ok?r.json():null)
   .then(d=>{
    if(d&&Array.isArray(d.nav_tracks)&&d.nav_tracks.length){
     const filtered=d.nav_tracks.filter(t=>t&&!STUDY_RETIRED_SLUGS.has(String(t.slug||'').toLowerCase())).map(t=>({id:t.id,slug:t.slug,icon:t.icon||'📚',title_en:t.slug==='school-board-notes'?'School & Board Exams':t.title_en,title_or:t.slug==='school-board-notes'?'ବିଦ୍ୟାଳୟ ଓ ବୋର୍ଡ ପରୀକ୍ଷା':(t.title_or||t.title_en)}));
     if(filtered.length){
      studyTracksData=filtered;
      try{sessionStorage.setItem(STUDY_DROPDOWN_CACHE_KEY,JSON.stringify({ts:Date.now(),tracks:studyTracksData}));}catch(_e){}
      document.querySelectorAll('#cso-study-stage1 .cso-js1-list').forEach(el=>renderStudyS1(el));
     }
    }
   }).catch(()=>{});
 };
 window.__csoHydrateStudyDropdown=hydrateStudyDropdown;
 const buildStudyDropdown=()=>{
  const cascade=mk('div','cso-study-cascade');cascade.id='cso-study-cascade';
  const stage1=mk('div','cso-study-stage1');stage1.id='cso-study-stage1';
  stage1.setAttribute('role','region');stage1.setAttribute('aria-label','Study Library Tracks');
  const list=mk('ul','cso-js1-list');stage1.appendChild(list);
  cascade.appendChild(stage1);
  renderStudyS1(list);
  return cascade;
 };
 const wireStudyDropdown=(ni,trigA,chevBtn,cascade)=>{
  let closeT=null;
  const stage1=cascade.querySelector('.cso-study-stage1');
  const setOpen=(open)=>{
   if(open){csoCloseNavDropdowns(ni);hydrateStudyDropdown(cascade);}
   ni.classList.toggle('cso-open',open);
   ni.classList.toggle('is-open',open);
   trigA.setAttribute('aria-expanded',String(open));
   chevBtn.setAttribute('aria-expanded',String(open));
  };
  const onEnter=()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);setOpen(true);};
  const onLeave=()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);closeT=setTimeout(()=>setOpen(false),150);};
  ni.addEventListener('mouseenter',onEnter);
  ni.addEventListener('mouseleave',onLeave);
  if(stage1){
   stage1.addEventListener('mouseenter',()=>{if(window.innerWidth>=1100)clearTimeout(closeT);});
   stage1.addEventListener('mouseleave',onLeave);
  }
  trigA.addEventListener('keydown',ev=>{
   if(ev.key==='ArrowDown'){ev.preventDefault();setOpen(true);const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   else if(ev.key==='Escape'){setOpen(false);}
  });
  chevBtn.addEventListener('keydown',ev=>{
   if(ev.key==='Enter'||ev.key===' '||ev.key==='ArrowDown'){
    ev.preventDefault();const next=ev.key==='ArrowDown'?true:!ni.classList.contains('cso-open');setOpen(next);
    if(next){const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   }else if(ev.key==='Escape'){setOpen(false);chevBtn.focus();}
  });
  ni.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&ni.classList.contains('cso-open')){ev.preventDefault();setOpen(false);trigA.focus();}});
 };
 const COMMUNITY_DROPDOWN_CACHE_KEY='cso_community_dropdown_v287';
 const COMMUNITY_CANONICAL_SLUGS=new Set(['exam-career-qa','schemes-citizen-help','study-groups-notes','success-stories-mentorship']);
 const COMMUNITY_DEFAULT_CHANNELS=[
  {id:'comm_l1_exam_career_qa',slug:'exam-career-qa',icon:'❓',title_en:'Exam & Career Q&A',title_or:'ପରୀକ୍ଷା ଓ କ୍ୟାରିୟର ପ୍ରଶ୍ନୋତ୍ତର'},
  {id:'comm_l1_schemes_citizen_help',slug:'schemes-citizen-help',icon:'🏛️',title_en:'Odisha Schemes & Citizen Help',title_or:'ଓଡ଼ିଶା ଯୋଜନା ଓ ନାଗରିକ ସହାୟତା'},
  {id:'comm_l1_study_groups_notes',slug:'study-groups-notes',icon:'📚',title_en:'Study Groups & Peer Notes',title_or:'ଅଧ୍ୟୟନ ଦଳ ଓ ସହପାଠୀ ନୋଟ୍ସ'},
  {id:'comm_l1_success_stories',slug:'success-stories-mentorship',icon:'🏆',title_en:'Success Stories & Mentorship',title_or:'ସଫଳତା କାହାଣୀ ଓ ମାର୍ଗଦର୍ଶନ'}
 ];
 let commChannelsData=null,commChannelsFetched=false;
 const getCommunityChannels=()=>{
  if(Array.isArray(commChannelsData)&&commChannelsData.length)return commChannelsData;
  try{const raw=sessionStorage.getItem(COMMUNITY_DROPDOWN_CACHE_KEY);if(raw){const p=JSON.parse(raw);if(p&&Array.isArray(p.channels)&&p.channels.length&&(Date.now()-Number(p.ts||0)<300000)){commChannelsData=p.channels;return commChannelsData;}}}catch(_e){}
  return COMMUNITY_DEFAULT_CHANNELS;
 };
 const renderCommunityS1=(s1List)=>{
  if(!s1List)return;
  s1List.replaceChildren();
  const isOr=S.lang==='or';
  const list=getCommunityChannels().map(c=>({slug:c.slug,icon:c.icon||'💬',title_en:c.title_en||c.slug,title_or:c.title_or||c.title_en||c.slug,href:'/community/?channel='+encodeURIComponent(c.slug||'')}));
  list.push({slug:'all',icon:'🌐',title_en:'All Community Discussions',title_or:'ସମସ୍ତ ସମୁଦାୟ ଆଲୋଚନା',href:'/community/'});
  list.forEach(item=>{
   const li=mk('li','cso-js1-item');li.dataset.channel=item.slug;
   const row=mk('div','cso-js1-row');
   const a=mk('a','cso-js1-link');a.href=item.href;
   const lf=mk('span','cso-js1-left');
   const ic=mk('span','cso-js1-icon',item.icon);ic.setAttribute('aria-hidden','true');
   lf.append(ic,mk('span','cso-js1-title',isOr?item.title_or:item.title_en));
   a.appendChild(lf);
   row.appendChild(a);
   li.appendChild(row);
   a.addEventListener('keydown',ev=>{
    if(ev.key==='ArrowDown'){ev.preventDefault();const n=li.nextElementSibling;if(n){const na=n.querySelector('.cso-js1-link');if(na)na.focus();}}
    else if(ev.key==='ArrowUp'){ev.preventDefault();const p=li.previousElementSibling;if(p){const pa=p.querySelector('.cso-js1-link');if(pa)pa.focus();}}
   });
   s1List.appendChild(li);
  });
 };
 const hydrateCommunityDropdown=(cEl)=>{
  if(cEl)renderCommunityS1(cEl.querySelector('.cso-js1-list'));
  if(commChannelsFetched||typeof fetch!=='function')return;
  commChannelsFetched=true;
  fetch('/api/public/community/bootstrap',{credentials:'same-origin'})
   .then(r=>r.ok?r.json():null)
   .then(d=>{
    if(d&&Array.isArray(d.nav_channels)&&d.nav_channels.length){
     const canon=d.nav_channels.filter(c=>c&&COMMUNITY_CANONICAL_SLUGS.has(String(c.slug||'').toLowerCase()));
     const src=canon.length?canon:COMMUNITY_DEFAULT_CHANNELS;
     commChannelsData=src.map(c=>({id:c.id,slug:c.slug,icon:c.icon||'💬',title_en:c.title_en,title_or:c.title_or||c.title_en}));
     try{sessionStorage.setItem(COMMUNITY_DROPDOWN_CACHE_KEY,JSON.stringify({ts:Date.now(),channels:commChannelsData}));}catch(_e){}
     document.querySelectorAll('#cso-community-stage1 .cso-js1-list').forEach(el=>renderCommunityS1(el));
    }
   }).catch(()=>{});
 };
 window.__csoHydrateCommunityDropdown=hydrateCommunityDropdown;
 const buildCommunityDropdown=()=>{
  const cascade=mk('div','cso-community-cascade');cascade.id='cso-community-cascade';
  const stage1=mk('div','cso-community-stage1');stage1.id='cso-community-stage1';
  stage1.setAttribute('role','region');stage1.setAttribute('aria-label','Community Channels');
  const list=mk('ul','cso-js1-list');stage1.appendChild(list);
  cascade.appendChild(stage1);
  renderCommunityS1(list);
  return cascade;
 };
 const wireCommunityDropdown=(ni,trigA,chevBtn,cascade)=>{
  let closeT=null;
  const stage1=cascade.querySelector('.cso-community-stage1');
  const setOpen=(open)=>{
   if(open){csoCloseNavDropdowns(ni);hydrateCommunityDropdown(cascade);}
   ni.classList.toggle('cso-open',open);
   ni.classList.toggle('is-open',open);
   trigA.setAttribute('aria-expanded',String(open));
   chevBtn.setAttribute('aria-expanded',String(open));
  };
  const onEnter=()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);setOpen(true);};
  const onLeave=()=>{if(window.innerWidth<1100)return;clearTimeout(closeT);closeT=setTimeout(()=>setOpen(false),150);};
  ni.addEventListener('mouseenter',onEnter);
  ni.addEventListener('mouseleave',onLeave);
  if(stage1){
   stage1.addEventListener('mouseenter',()=>{if(window.innerWidth>=1100)clearTimeout(closeT);});
   stage1.addEventListener('mouseleave',onLeave);
  }
  trigA.addEventListener('keydown',ev=>{
   if(ev.key==='ArrowDown'){ev.preventDefault();setOpen(true);const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   else if(ev.key==='Escape'){setOpen(false);}
  });
  chevBtn.addEventListener('keydown',ev=>{
   if(ev.key==='Enter'||ev.key===' '||ev.key==='ArrowDown'){
    ev.preventDefault();const next=ev.key==='ArrowDown'?true:!ni.classList.contains('cso-open');setOpen(next);
    if(next){const f=cascade.querySelector('.cso-js1-link');if(f)f.focus();}
   }else if(ev.key==='Escape'){setOpen(false);chevBtn.focus();}
  });
  ni.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&ni.classList.contains('cso-open')){ev.preventDefault();setOpen(false);trigA.focus();}});
 };
 const renderList=(list)=>{
  while(itemsWrap.children.length>2)itemsWrap.lastChild.remove();
  normalizeHeaderList(list).forEach(entry=>{
   const isArr=Array.isArray(entry);
   const rawSeg=isArr?entry[0]:(entry.key||String(entry.url||'').replace(/^\/+|\/+$/g,'').split('/')[0].toLowerCase()||'link');
   const s=rawSeg==='jobs-careers'?'jobs':rawSeg;
   const t=isArr?entry[1]:(S.lang==='or'?(entry.label_or||entry.label_en):entry.label_en);
   const icon=isArr?entry[2]:(entry.icon_key||'');
   const href=isArr?(entry[3]||('/'+s+'/')):(entry.url||'/');
   const badgeTxt=isArr?'':(S.lang==='or'?(entry.badge_text_or||entry.badge_text_en||''):(entry.badge_text_en||''));
   const openNewTab=!isArr&&Boolean(entry.open_new_tab);
   if(href==='/')return;
   const isJobs=s==='jobs';
   const isCareers=s==='careers';
   const isSchemes=s==='schemes'||s==='schemes-benefits';
   const isStudy=s==='study-library'||s==='study';
   const isCommunity=s==='community';
   const ni=mk('div','ni'+(isJobs?' cso-ni-jobs cso-nav-jobs-wrap':'')+(isCareers?' cso-ni-careers cso-nav-careers-wrap':'')+(isSchemes?' cso-ni-schemes cso-nav-schemes-wrap':'')+(isStudy?' cso-ni-study cso-nav-study-wrap':'')+(isCommunity?' cso-ni-community cso-nav-community-wrap':''));ni.dataset.pillar=s;
   const par=mk('div','cso-nav-parent');
   const a=mk('a');a.href=href;a.dataset.m=s;
   if(openNewTab){a.target='_blank';a.rel='noopener noreferrer';}
   if(isJobs){a.setAttribute('aria-haspopup','true');a.setAttribute('aria-expanded','false');a.setAttribute('aria-controls','cso-jobs-stage1');}
   else if(isCareers){a.setAttribute('aria-haspopup','true');a.setAttribute('aria-expanded','false');a.setAttribute('aria-controls','cso-careers-stage1');}
   else if(isSchemes){a.setAttribute('aria-haspopup','true');a.setAttribute('aria-expanded','false');a.setAttribute('aria-controls','cso-schemes-stage1');}
   else if(isStudy){a.setAttribute('aria-haspopup','true');a.setAttribute('aria-expanded','false');a.setAttribute('aria-controls','cso-study-stage1');}
   else if(isCommunity){a.setAttribute('aria-haspopup','true');a.setAttribute('aria-expanded','false');a.setAttribute('aria-controls','cso-community-stage1');}
   if(icon){const ic=mk('span','',icon);ic.setAttribute('aria-hidden','true');a.append(ic,' ');}
   a.append(document.createTextNode(translateText(t)));
   if(badgeTxt){a.appendChild(mk('span','cso-nav-badge',badgeTxt));}
   par.appendChild(a);
   if(isJobs){
    try{
     const chevBtn=mk('button','cso-nav-arrow cso-jobs-flyout-toggle');chevBtn.type='button';
     chevBtn.setAttribute('aria-label','Toggle Jobs sectors menu');
     chevBtn.setAttribute('aria-haspopup','true');chevBtn.setAttribute('aria-expanded','false');chevBtn.setAttribute('aria-controls','cso-jobs-stage1');
     const cI=mk('span','cso-jobs-chev','▾');cI.setAttribute('aria-hidden','true');chevBtn.appendChild(cI);
     par.appendChild(chevBtn);
     ni.appendChild(par);
     const cascade=buildJobsCascading();
     ni.appendChild(cascade);
     wireJobsCascading(ni,a,chevBtn,cascade);
    }catch(err){console.error('[CSO Nav] Jobs menu failed:',err);if(!par.parentNode)ni.appendChild(par);}
   }else if(isCareers){
    try{
     const chevBtn=mk('button','cso-nav-arrow cso-careers-flyout-toggle');chevBtn.type='button';
     chevBtn.setAttribute('aria-label','Toggle Careers tracks menu');
     chevBtn.setAttribute('aria-haspopup','true');chevBtn.setAttribute('aria-expanded','false');chevBtn.setAttribute('aria-controls','cso-careers-stage1');
     const cI=mk('span','cso-jobs-chev','▾');cI.setAttribute('aria-hidden','true');chevBtn.appendChild(cI);
     par.appendChild(chevBtn);
     ni.appendChild(par);
     const cascade=buildCareersCascading();
     ni.appendChild(cascade);
     wireCareersCascading(ni,a,chevBtn,cascade);
    }catch(err){console.error('[CSO Nav] Careers menu failed:',err);if(!par.parentNode)ni.appendChild(par);}
   }else if(isSchemes){
    try{
     const chevBtn=mk('button','cso-nav-arrow cso-schemes-flyout-toggle');chevBtn.type='button';
     chevBtn.setAttribute('aria-label','Toggle Schemes categories menu');
     chevBtn.setAttribute('aria-haspopup','true');chevBtn.setAttribute('aria-expanded','false');chevBtn.setAttribute('aria-controls','cso-schemes-stage1');
     const cI=mk('span','cso-jobs-chev','▾');cI.setAttribute('aria-hidden','true');chevBtn.appendChild(cI);
     par.appendChild(chevBtn);
     ni.appendChild(par);
     const cascade=buildSchemesCascading();
     ni.appendChild(cascade);
     wireSchemesCascading(ni,a,chevBtn,cascade);
    }catch(err){console.error('[CSO Nav] Schemes menu failed:',err);if(!par.parentNode)ni.appendChild(par);}
   }else if(isStudy){
    try{
     const chevBtn=mk('button','cso-nav-arrow cso-study-flyout-toggle');chevBtn.type='button';
     chevBtn.setAttribute('aria-label','Toggle Study Library tracks menu');
     chevBtn.setAttribute('aria-haspopup','true');chevBtn.setAttribute('aria-expanded','false');chevBtn.setAttribute('aria-controls','cso-study-stage1');
     const cI=mk('span','cso-jobs-chev','▾');cI.setAttribute('aria-hidden','true');chevBtn.appendChild(cI);
     par.appendChild(chevBtn);
     ni.appendChild(par);
     const cascade=buildStudyDropdown();
     ni.appendChild(cascade);
     wireStudyDropdown(ni,a,chevBtn,cascade);
    }catch(err){console.error('[CSO Nav] Study Library menu failed:',err);if(!par.parentNode)ni.appendChild(par);}
   }else if(isCommunity){
    try{
     const chevBtn=mk('button','cso-nav-arrow cso-community-flyout-toggle');chevBtn.type='button';
     chevBtn.setAttribute('aria-label','Toggle Community channels menu');
     chevBtn.setAttribute('aria-haspopup','true');chevBtn.setAttribute('aria-expanded','false');chevBtn.setAttribute('aria-controls','cso-community-stage1');
     const cI=mk('span','cso-jobs-chev','▾');cI.setAttribute('aria-hidden','true');chevBtn.appendChild(cI);
     par.appendChild(chevBtn);
     ni.appendChild(par);
     const cascade=buildCommunityDropdown();
     ni.appendChild(cascade);
     wireCommunityDropdown(ni,a,chevBtn,cascade);
    }catch(err){console.error('[CSO Nav] Community menu failed:',err);if(!par.parentNode)ni.appendChild(par);}
   }else{
    ni.appendChild(par);
   }
   itemsWrap.appendChild(ni);
  });
  itemsWrap.appendChild(buildDrawerUtilities());
 };
 window.CSOHeaderNav={
  applyHeaderLinks:(items)=>{
   if(!Array.isArray(items)||!items.length)return;
   const sorted=[...items].sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
   csoAdminHeaderLinks=sorted;
   renderList(sorted);
   setActive(location.hash.slice(1));
  },
  setLang:setAppLang,
  openDrawer:()=>setMobileDrawerOpen(true),
  closeDrawer:()=>setMobileDrawerOpen(false)
 };
 renderList(csoAdminHeaderLinks&&csoAdminHeaderLinks.length?csoAdminHeaderLinks:NAV);
 w.append(bar,itemsWrap);
 csoSyncThemeUi(window.CSOTheme.getTheme());
 if(typeof fetch==='function'){
  let navUrl='/api/nav/config';
  try{
   const nb=localStorage.getItem('cso_nav_cache_bust');
   if(nb&&(Date.now()-Number(nb)<180000))navUrl='/api/nav/config?refresh=1&_cb='+encodeURIComponent(nb);
  }catch(_){}
  fetch(navUrl,{credentials:'same-origin',cache:'no-store'})
   .then(r=>r.ok?r.json():null)
   .then(data=>{
    if(!data||!Array.isArray(data.header)||!data.header.length)return;
    const hdr=[...data.header].sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
    csoAdminHeaderLinks=hdr;
    renderList(hdr);
    setActive(location.hash.slice(1));
   }).catch(()=>{});
 }
 syncMobileNavAuth();
 setActive(location.hash.slice(1));
}
function syncMobileNavAuth(){
 const existing=document.getElementById('cso-nav-mobile-auth');
 if(existing)existing.remove();
}
function csoCloseNavDropdowns(except){
 $$('#navw .ni').forEach(n=>{
  if(n===except)return;
  n.classList.remove('cso-open','is-open');
  const cascade=n.querySelector('.cso-jobs-cascade, .cso-careers-cascade, .cso-schemes-cascade, .cso-study-cascade, .cso-community-cascade');
  if(cascade)cascade.classList.remove('is-stage2-open');
  n.querySelectorAll('.cso-js1-item.is-active, .cso-js1-item.is-mob-open').forEach(x=>x.classList.remove('is-active','is-mob-open'));
  const b=n.querySelector('.cso-nav-arrow');
  if(b)b.setAttribute('aria-expanded','false');
  const a=n.querySelector('.cso-nav-parent > a[aria-haspopup="true"]');
  if(a)a.setAttribute('aria-expanded','false');
 });
}
if(!window.__csoNavDropdownWired){
window.__csoNavDropdownWired=true;
document.addEventListener('click',e=>{
 const admLink = e.target.closest('a.adm, a[href^="/admin"]');
 if (admLink) return;
 const mobile=e.target.closest('#cso-header-menu-toggle, #navw .cso-nav-mobile');
 if(mobile){
  e.preventDefault();
  e.stopPropagation();
  const items=$('#cso-nav-items');
  const nextOpen=!(items&&items.classList.contains('cso-mobile-open'));
  setMobileDrawerOpen(nextOpen);
  if(nextOpen){const closeB=$('#cso-drawer-close');if(closeB)closeB.focus();}
  return;
 }
 if(e.target.closest('#cso-drawer-close')||e.target.closest('#cso-mobile-drawer-backdrop')){
  e.preventDefault();
  e.stopPropagation();
  setMobileDrawerOpen(false);
  const toggle=$('#cso-header-menu-toggle')||$('#navw .cso-nav-mobile');
  if(toggle)toggle.focus();
  return;
 }
 if(e.target.closest('#cso-drawer-li')){setMobileDrawerOpen(false);login();return;}
 if(e.target.closest('#cso-drawer-su')){setMobileDrawerOpen(false);signup();return;}
 if(e.target.closest('#cso-drawer-logout')){
  setMobileDrawerOpen(false);
  const lo=$('#cso-header-logout-btn');
  if(lo)lo.click();
  return;
 }
 const mobLangBtn=e.target.closest('#cso-mob-lang-btn');
 if(mobLangBtn){
  e.preventDefault();
  e.stopPropagation();
  setAppLang(S.lang==='or'?'en':'or');
  return;
 }
 const mobThemeBtn=e.target.closest('#cso-mob-theme-btn');
 if(mobThemeBtn){
  e.preventDefault();
  e.stopPropagation();
  pop(mobThemeBtn,CSO_PORTAL_THEMES.map(t=>[t.fullLabel,()=>{window.CSOTheme.setTheme(t.key,true);},window.CSOTheme.getTheme()===t.key]));
  return;
 }
 const arrow=e.target.closest('#navw .cso-nav-arrow');
 if(arrow){
  e.preventDefault();
  e.stopPropagation();
  const parent=arrow.closest('.ni');
  const open=!parent.classList.contains('cso-open');
  csoCloseNavDropdowns(parent);
  parent.classList.toggle('cso-open',open);
  arrow.setAttribute('aria-expanded',String(open));
  const trigA=parent.querySelector('.cso-nav-parent > a[aria-haspopup="true"]');
  if(trigA)trigA.setAttribute('aria-expanded',String(open));
  if(parent.classList.contains('cso-ni-jobs')){
   const cascade=parent.querySelector('.cso-jobs-cascade');
   if(cascade&&!open)cascade.classList.remove('is-stage2-open');
   if(open&&typeof window.__csoHydrateJobsFlyout==='function')window.__csoHydrateJobsFlyout(cascade);
  }else if(parent.classList.contains('cso-ni-careers')){
   const cascade=parent.querySelector('.cso-careers-cascade');
   if(cascade&&!open)cascade.classList.remove('is-stage2-open');
   if(open&&typeof window.__csoHydrateCareersFlyout==='function')window.__csoHydrateCareersFlyout(cascade);
  }else if(parent.classList.contains('cso-ni-schemes')){
   const cascade=parent.querySelector('.cso-schemes-cascade');
   if(cascade&&!open)cascade.classList.remove('is-stage2-open');
   if(open&&typeof window.__csoHydrateSchemesFlyout==='function')window.__csoHydrateSchemesFlyout(cascade);
  }else if(parent.classList.contains('cso-ni-study')){
   const cascade=parent.querySelector('.cso-study-cascade');
   if(open&&typeof window.__csoHydrateStudyDropdown==='function')window.__csoHydrateStudyDropdown(cascade);
  }else if(parent.classList.contains('cso-ni-community')){
   const cascade=parent.querySelector('.cso-community-cascade');
   if(open&&typeof window.__csoHydrateCommunityDropdown==='function')window.__csoHydrateCommunityDropdown(cascade);
  }
  return;
 }
 const a11yMobile=e.target.closest('#ba-mobile');
 if(a11yMobile){
  e.stopPropagation();
  pop(a11yMobile,[['High contrast',()=>{S.hc=+!S.hc;save();apply()},S.hc],['Dyslexia-friendly font',()=>{if(window.CSOGlobal)window.CSOGlobal.toggleA11y('dyslexia');},document.documentElement.classList.contains('cso-a11y-dyslexia')],['Lite mode (reduced graphics)',()=>{if(window.CSOGlobal)window.CSOGlobal.toggleA11y('lite');},document.documentElement.classList.contains('cso-a11y-lite')],['Underline links',()=>{S.ul=+!S.ul;save();apply()},S.ul],['Reduce motion',()=>{S.rm=+!S.rm;save();apply()},S.rm],['Reset',()=>{S.hc=S.ul=S.rm=0;S.zoom=1;save();apply();if(window.CSOGlobal)window.CSOGlobal.resetA11y();}]]);
  return;
 }
 const z=d=>{S.zoom=d?Math.max(.85,Math.min(1.3,+(S.zoom+d).toFixed(2))):1;save();apply()};
 if(e.target.closest('#fm-mobile')){z(-.05);return;}
 if(e.target.closest('#fr-mobile')){z(0);return;}
 if(e.target.closest('#fp-mobile')){z(.05);return;}
 const footerLang = e.target.closest('.cso-footer-lang-pill');
 if (footerLang) {
  const l = footerLang.getAttribute('data-cso-lang');
  if (l && LN[l]) setAppLang(l);
  return;
 }
 const authTrigger = e.target.closest('#cso-auth-trigger');
 if (authTrigger) {
  toggleAuthDropdown(e);
  return;
 }
 if (!e.target.closest('.cso-mobile-auth-wrapper')) {
  closeAuthDropdown();
 }
 if(e.target.closest('#navw a')){
  setMobileDrawerOpen(false);
 }else if(!e.target.closest('#navw')){
  csoCloseNavDropdowns();
  const items=$('#cso-nav-items');
  if(items&&items.classList.contains('cso-mobile-open'))setMobileDrawerOpen(false);
 }
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  closeAuthDropdown();
  csoCloseNavDropdowns();
  const items=$('#cso-nav-items');
  if(items&&items.classList.contains('cso-mobile-open')){
   setMobileDrawerOpen(false);
   const toggle=$('#cso-header-menu-toggle')||$('#navw .cso-nav-mobile');
   if(toggle)toggle.focus();
  }
 }
});
document.addEventListener('focusout',e=>{
 const navw=document.getElementById('navw');
 if(!navw)return;
 const openItem=navw.querySelector('.ni.cso-open');
 if(openItem&&e.relatedTarget&&!openItem.contains(e.relatedTarget)){
  csoCloseNavDropdowns();
 }
 const items=document.getElementById('cso-nav-items');
 const hdrToggle=document.getElementById('cso-header-menu-toggle');
 if(items&&items.classList.contains('cso-mobile-open')&&e.relatedTarget&&!items.contains(e.relatedTarget)&&(!hdrToggle||!hdrToggle.contains(e.relatedTarget))){
  setMobileDrawerOpen(false);
 }
});
window.addEventListener('resize', () => {
 if (window.innerWidth >= 1100) {
  csoCloseNavDropdowns();
  const items = document.getElementById('cso-nav-items');
  if (items && items.classList.contains('cso-mobile-open')) {
   setMobileDrawerOpen(false);
  }
 }
});
}
/* CSO navigation upgrade v269: separated Jobs (/jobs/) & Careers (/careers/) route detection */
function resolveActiveRoutePillar(pathStr){
  const p=String(pathStr||'/').toLowerCase();
  if(p==='/'||p==='/index.html'||p==='')return '';
  if(p.startsWith('/careers')||p.startsWith('/career-guidance'))return 'careers';
  if(p.startsWith('/jobs-careers')||p.startsWith('/jobs')||p.startsWith('/job-opportunity-finder'))return 'jobs';
  if(p.startsWith('/schemes-benefits')||p.startsWith('/schemes')||p.startsWith('/scholarship-guidance')||p.startsWith('/scheme-opportunity-finder'))return 'schemes-benefits';
  if(p.startsWith('/study-library')||p.startsWith('/study')||p.startsWith('/resources')||p.startsWith('/current-affairs')||p.startsWith('/mock-tests')||p.startsWith('/education-explorer')||p.startsWith('/study-path-finder'))return 'study-library';
  if(p.startsWith('/community')||p.startsWith('/support'))return 'community';
  if(p.startsWith('/about')||p.startsWith('/trust-layer')||p.startsWith('/privacy-policy')||p.startsWith('/terms-of-use')||p.startsWith('/disclaimer')||p.startsWith('/copyright-policy'))return 'about';
  return '';
}
function setActive(h){
  $$('#navw a').forEach(a=>{
    a.classList.remove('on');
    a.removeAttribute('aria-current');
  });
  $$('#navw .ni').forEach(n=>n.classList.remove('cso-active'));

  const pathPillar=resolveActiveRoutePillar(window.location.pathname);
  const effectiveKey=h||pathPillar;
  const normalizedKey=effectiveKey==='jobs-careers'?'jobs':effectiveKey;

  if(!normalizedKey){
    const home=$('#navw .cso-nav-home');
    if(home){
      home.classList.add('on');
      home.setAttribute('aria-current','page');
    }
    return;
  }

  const targetNi=$$('#navw .ni').find(n=>{
    const pil=n.dataset.pillar||'';
    const a=$('[data-m]',n)||$('a',n);
    const menu=(a&&a.dataset.m)||pil;
    return pil===normalizedKey||menu===normalizedKey||
      (Array.isArray(MENUS[menu])&&MENUS[menu].some(x=>slug(x)===normalizedKey));
  });

  if(targetNi){
    targetNi.classList.add('cso-active');
    const link=$('.cso-nav-parent > a',targetNi)||$('a',targetNi);
    if(link){
      link.classList.add('on');
      link.setAttribute('aria-current','page');
    }
  }
}

/* CSO Unified Authentication Integration v1 */

let csoAuthUser = null;

function formatAccountLabel(user) {
  const raw = String((user && (user.name || user.fullName)) || '').trim();
  if (!raw || /^common\s*sense/i.test(raw) || /^(account|user|admin|candidate)$/i.test(raw)) {
    return 'Account';
  }
  const first = raw.split(/\s+/)[0];
  return first && first.length <= 18 ? first : 'Account';
}

function authUI() {
  const root = $('#auth');
  if (!root) return;

  root.replaceChildren();

  const acctEl = root.closest('.acct');
  if (acctEl) {
    acctEl.querySelectorAll('.cso-desktop-auth-icon, .cso-acct-icon').forEach(ic => ic.classList.add('cso-hidden'));
  }

  const staticHubBtn = $('#cso-header-hub-link');
  if (staticHubBtn) {
    staticHubBtn.hidden = Boolean(csoAuthUser);
    syncHeaderHubText();
  }

  const drawerFootExisting = $('#cso-nav-items .cso-drawer-foot');
  if (drawerFootExisting && drawerFootExisting.parentNode) {
    drawerFootExisting.replaceWith(buildDrawerUtilities());
  }

  syncMobileNavAuth();

  if (csoAuthUser) {
    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'btn btn-header-logout cso-logout-button';
    logoutButton.id = 'cso-header-logout-btn';
    logoutButton.textContent = 'Logout';

    logoutButton.onclick = async () => {
      logoutButton.disabled = true;

      const result = await window.CSOAuth.logout();

      if (result.ok) {
        csoAuthUser = null;
        authUI();

        // Immediately leave the protected dashboard after logout.
        go('');
        route();

        toast('You have been logged out.');
      } else {
        logoutButton.disabled = false;
        toast(result.error || 'Logout failed.');
      }
    };

    const isAdminUser = csoAuthUser.role === 'admin' || csoAuthUser.role === 'superadmin';
    const targetDashUrl = isAdminUser ? '/admin/' : '/student-dashboard/';
    const dashboardLink = document.createElement('a');
    dashboardLink.className = isAdminUser
      ? 'btn p cso-dashboard-button btn-dashboard cso-btn-admin-studio'
      : 'btn p cso-dashboard-button btn-dashboard cso-btn-candidate-hub';
    dashboardLink.href = targetDashUrl;
    dashboardLink.textContent = isAdminUser ? 'Admin Studio' : 'My Dashboard';
    dashboardLink.setAttribute(
      'aria-label',
      isAdminUser ? 'Open Admin Studio' : 'Open your student dashboard'
    );
    dashboardLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.location.assign(targetDashUrl);
    }, true);

    const deskRow = document.createElement('div');
    deskRow.className = 'cso-desktop-auth-buttons cso-auth-row';

    if (isAdminUser) {
      const candidateLink = document.createElement('a');
      candidateLink.className = 'btn p cso-dashboard-button btn-dashboard cso-btn-candidate-hub';
      candidateLink.href = '/student-dashboard/';
      candidateLink.textContent = 'Candidate Hub';
      candidateLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        window.location.assign('/student-dashboard/');
      }, true);
      deskRow.append(dashboardLink, candidateLink, logoutButton);
    } else {
      deskRow.append(dashboardLink, logoutButton);
    }

    const mobWrap = document.createElement('div');
    mobWrap.className = 'cso-mobile-auth-wrapper';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cso-auth-trigger';
    trigger.id = 'cso-auth-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'cso-auth-menu');
    trigger.setAttribute('aria-label', 'Account options');

    const mIcon = document.createElement('span');
    mIcon.className = 'auth-icon';
    mIcon.setAttribute('aria-hidden', 'true');
    mIcon.textContent = '👤';
    const mLabel = document.createElement('span');
    mLabel.className = 'auth-label';
    mLabel.textContent = formatAccountLabel(csoAuthUser);
    const mArrow = document.createElement('span');
    mArrow.className = 'auth-arrow';
    mArrow.setAttribute('aria-hidden', 'true');
    mArrow.textContent = '▾';
    trigger.append(mIcon, mLabel, mArrow);

    const menu = document.createElement('div');
    menu.className = 'cso-auth-dropdown-menu';
    menu.id = 'cso-auth-menu';
    menu.hidden = true;

    const mDash = document.createElement('a');
    mDash.className = isAdminUser
      ? 'cso-auth-item cso-auth-item--dash cso-auth-item--admin'
      : 'cso-auth-item cso-auth-item--dash cso-auth-item--hub';
    mDash.href = targetDashUrl;
    mDash.textContent = isAdminUser ? '🛡️ Admin Studio' : '👤 My Dashboard';
    mDash.addEventListener('click', (e) => {
      e.preventDefault();
      closeAuthDropdown();
      window.location.assign(targetDashUrl);
    });

    const mProfile = document.createElement('a');
    mProfile.className = 'cso-auth-item cso-auth-item--saved';
    mProfile.href = '/student-dashboard/#saved';
    mProfile.textContent = '★ Profile / Saved';
    mProfile.addEventListener('click', (e) => {
      e.preventDefault();
      closeAuthDropdown();
      window.location.assign('/student-dashboard/#saved');
    });

    const mLogout = document.createElement('a');
    mLogout.className = 'cso-auth-item cso-auth-item--logout';
    mLogout.href = '#';
    mLogout.textContent = 'Logout';
    mLogout.addEventListener('click', (e) => {
      e.preventDefault();
      closeAuthDropdown();
      logoutButton.click();
    });

    if (isAdminUser) {
      const mHub = document.createElement('a');
      mHub.className = 'cso-auth-item cso-auth-item--hub';
      mHub.href = '/student-dashboard/';
      mHub.textContent = '👤 Candidate Hub';
      mHub.addEventListener('click', (e) => {
        e.preventDefault();
        closeAuthDropdown();
        window.location.assign('/student-dashboard/');
      });
      menu.append(mDash, mHub, mProfile, mLogout);
    } else {
      menu.append(mDash, mProfile, mLogout);
    }
    mobWrap.append(trigger, menu);
    root.append(deskRow, mobWrap);
    return;
  }

  setSafeHtml(root,
    '<div class="cso-desktop-auth-buttons cso-auth-logged-out">' +
      '<button class="btn cso-login-button login-btn" id="li" type="button">Login</button>' +
      '<button class="btn p signup-btn cso-signup-pill" id="su" type="button">Sign Up</button>' +
    '</div>' +
    '<div class="cso-mobile-auth-wrapper">' +
      '<button type="button" class="cso-auth-trigger" id="cso-auth-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="cso-auth-menu" aria-label="Account options">' +
        '<span class="auth-icon" aria-hidden="true">👤</span>' +
        '<span class="auth-label">Account</span>' +
        '<span class="auth-arrow" aria-hidden="true">▾</span>' +
      '</button>' +
      '<div class="cso-auth-dropdown-menu" id="cso-auth-menu" hidden>' +
        '<a href="/login.html" class="cso-auth-item cso-auth-item--login" id="cso-m-li">Login</a>' +
        '<a href="/signup.html" class="cso-auth-item cso-auth-item--signup" id="cso-m-su">Sign Up</a>' +
      '</div>' +
    '</div>');

  const li = $('#li');
  if (li) li.onclick = login;
  const su = $('#su');
  if (su) su.onclick = signup;

  const mLi = $('#cso-m-li');
  if (mLi) {
    mLi.onclick = e => {
      e.preventDefault();
      closeAuthDropdown();
      login();
    };
  }
  const mSu = $('#cso-m-su');
  if (mSu) {
    mSu.onclick = e => {
      e.preventDefault();
      closeAuthDropdown();
      signup();
    };
  }
}

function closeAuthDropdown() {
  const trigger = $('#cso-auth-trigger') || document.getElementById('cso-auth-trigger');
  const menu = $('#cso-auth-menu') || document.getElementById('cso-auth-menu');
  if (trigger && menu) {
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    menu.classList.remove('cso-open');
  }
}

function toggleAuthDropdown(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const trigger = document.getElementById('cso-auth-trigger');
  const menu = document.getElementById('cso-auth-menu');
  if (!trigger || !menu) return;

  const isOpen = trigger.getAttribute('aria-expanded') === 'true';
  const nextOpen = !isOpen;
  trigger.setAttribute('aria-expanded', String(nextOpen));
  menu.hidden = !nextOpen;
  menu.classList.toggle('cso-open', nextOpen);
}

let csoAuthRestorePromise = null;

async function csoRestoreAuthSession() {
  if (!window.CSOAuth) {
    csoAuthUser = null;
    authUI();
    return false;
  }

  if (csoAuthRestorePromise) {
    return csoAuthRestorePromise;
  }

  csoAuthRestorePromise = (async () => {
    try {
      const result = await window.CSOAuth.getCurrentUser();

      if (
        result.ok === true &&
        result.authenticated === true &&
        result.user &&
        typeof result.user === 'object'
      ) {
        csoAuthUser = result.user;
        authUI();
        return true;
      }

      csoAuthUser = null;
      authUI();
      return false;

    } catch {
      csoAuthUser = null;
      authUI();
      return false;

    } finally {
      csoAuthRestorePromise = null;
    }
  })();

  return csoAuthRestorePromise;
}

const okMail = e =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');



function dobToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

// Single dark-theme login/sign-up interfaces (CSO logo candidate portal).
// The legacy in-page auth modals were removed — every trigger navigates.
function login() {
  window.location.href = '/login.html';
}

function signup() {
  window.location.href = '/signup.html';
}
const csoPublishedUpdates=()=>UPDATES.filter(u=>u.status==='published');
const IDX=()=>[...csoPublishedUpdates().map(u=>[u.title,u.id,u.src]),...Object.entries(TITLES).map(([s,t])=>[t,s,''])];
const CSO_DIRECTORIES=[
  ['jobs-careers','Jobs & Careers'],
  ['schemes-benefits','Schemes & Benefits'],
  ['study-library','Study Library'],
  ['community','Community'],
  ['about','About CSO']
];
let CSO_DIRECTORY_INDEX=[];
let CSO_DIRECTORY_PROMISE=null;
let CSO_DIRECTORY_ERROR='';
let CSO_DIRECTORY_LOADED=false;

const csoNormalize=s=>String(s||'').toLocaleLowerCase().normalize('NFKC');
const csoSearchWords=q=>csoNormalize(q).trim().split(/\s+/).filter(Boolean);

function csoBuildDirectoryIndex(slug,label,data){
  const roots=Array.isArray(data.sections)
    ? data.sections
    : (data.navigation||[]).map(group=>({
        title:group.title,
        number:group.number,
        children:group.sections||[],
        notes:[]
      }));

  const results=[];

  function walk(node,sectionIndex,path,trail){
    const title=String(node.title||'').trim();
    const number=node.number==null?'':String(node.number);
    const heading=(number?number+' ':'')+title;
    const currentTrail=title?[...trail,heading]:trail;
    const notes=Array.isArray(node.notes)?node.notes:[];
    const noteText=notes.map(note=>
      typeof note==='string'?note:String(note.text||'')
    ).filter(Boolean);
    const description=[
      node.line,
      node.description,
      node.summary,
      ...noteText
    ].filter(Boolean).join(' ');

    if(title||description){
      results.push({
        title:heading||description.slice(0,100),
        description:description.slice(0,500),
        dashboard:label,
        trail:currentTrail.join(' / '),
        url:slug+'/?section='+sectionIndex+
          (path.length?'&path='+path.join('.'):''),
        searchable:[heading,description,currentTrail.join(' ')].join(' ')
      });
    }

    (node.children||[]).forEach((child,index)=>
      walk(child,sectionIndex,[...path,index],currentTrail)
    );
  }

  roots.forEach((root,index)=>walk(root,index,[],[]));
  return results;
}

const CSO_LIVE_DIR_APIS={
  'jobs-careers':'/api/public/jobs-directory/overview',
  'schemes':'/api/public/schemes-directory/overview',
  'study-library':'/api/public/study-library/items?limit=100',
  'community':'/api/public/community-directory/overview'
};

function csoNormalizeLiveDirectory(data){
  if(!data||typeof data!=='object')return null;
  if(Array.isArray(data.sections)||Array.isArray(data.navigation))return data;
  if(Array.isArray(data.domains)&&data.domains.length){
    return {
      navigation:data.domains.map(d=>({
        title:d.title||d.domain_slug||d.slug||'Directory',
        sections:(d.folders||d.items||[]).map(x=>({
          title:x.title||x.name||'',
          line:x.summary||x.description||''
        }))
      }))
    };
  }
  if(Array.isArray(data.items)&&data.items.length){
    return {
      navigation:[{
        title:'Study Library',
        sections:data.items.map(it=>({
          title:it.title||'',
          line:it.summary||it.board_or_exam||''
        }))
      }]
    };
  }
  return null;
}

function csoLoadDirectories(){
  if(CSO_DIRECTORY_PROMISE)return CSO_DIRECTORY_PROMISE;

  CSO_DIRECTORY_PROMISE=Promise.allSettled(
    CSO_DIRECTORIES.map(async ([slug,label])=>{
      let data=null;
      const liveUrl=CSO_LIVE_DIR_APIS[slug];
      if(liveUrl){
        try{
          const liveRes=await fetch(liveUrl,{cache:'no-store'});
          if(liveRes.ok)data=csoNormalizeLiveDirectory(await liveRes.json());
        }catch(_){}
      }
      if(!data){
        data={sections:[],navigation:[]};
      }
      if(!Array.isArray(data.sections)&&!Array.isArray(data.navigation)){
        throw Error(slug+': invalid directory data');
      }
      return csoBuildDirectoryIndex(slug,label,data);
    })
  ).then(results=>{
    CSO_DIRECTORY_INDEX=results
      .filter(result=>result.status==='fulfilled')
      .flatMap(result=>result.value);
    CSO_DIRECTORY_ERROR=results
      .filter(result=>result.status==='rejected')
      .map(result=>String(result.reason.message||result.reason))
      .join('; ');
    CSO_DIRECTORY_LOADED=true;
    return CSO_DIRECTORY_INDEX;
  });

  return CSO_DIRECTORY_PROMISE;
}

const find=(q,any)=>{
  const words=csoSearchWords(q).filter(word=>!any||word.length>3);
  if(!words.length)return[];
  const seen=new Set();
  return IDX().filter(([title,id,source])=>{
    const haystack=csoNormalize(title+' '+source);
    const matches=any
      ?words.some(word=>haystack.includes(word))
      :words.every(word=>haystack.includes(word));
    if(!matches||seen.has(id))return false;
    seen.add(id);
    return true;
  });
};

function csoDirectoryMatches(query){
  const words=csoSearchWords(query);
  if(!words.length)return[];

  const phrase=csoNormalize(query).trim();

  return CSO_DIRECTORY_INDEX
    .filter(item=>{
      const haystack=csoNormalize(item.searchable);
      return words.every(word=>haystack.includes(word));
    })
    .map(item=>{
      const title=csoNormalize(item.title);
      const description=csoNormalize(item.description);
      const trail=csoNormalize(item.trail);

      const titleHits=words.filter(word=>
        title.includes(word)
      ).length;

      const descriptionHits=words.filter(word=>
        description.includes(word)
      ).length;

      const categoryHits=words.filter(word=>
        trail.includes(word)
      ).length;

      let score=0;

      if(phrase&&title.includes(phrase)){
        score+=10000;
      }

      if(titleHits===words.length){
        score+=5000;
      }

      score+=titleHits*500;
      score+=descriptionHits*50;
      score+=categoryHits*2;

      if(phrase&&description.includes(phrase)){
        score+=100;
      }

      if(title.startsWith(phrase)){
        score+=1000;
      }

      return {...item,score};
    })
    .sort((a,b)=>
      b.score-a.score||
      a.title.localeCompare(b.title)
    );
}

let CSO_SEARCH_FILTER='all';
let CSO_SEARCH_PAGE=1;
const CSO_SEARCH_PAGE_SIZE=20;
const CSO_SEARCH_STORAGE_KEY='cso-search-state-v1';

function csoSaveSearchState(){
  try{
    sessionStorage.setItem(
      CSO_SEARCH_STORAGE_KEY,
      JSON.stringify({
        query:lastQ,
        filter:CSO_SEARCH_FILTER,
        page:CSO_SEARCH_PAGE
      })
    );
  }catch(error){}
}

function csoRestoreSearchState(){
  try{
    const saved=JSON.parse(
      sessionStorage.getItem(CSO_SEARCH_STORAGE_KEY)||'null'
    );

    if(!saved||typeof saved.query!=='string')return;

    lastQ=saved.query.slice(0,300);

    const validFilters=[
      'all',
      'home',
      ...CSO_DIRECTORIES.map(([slug])=>slug)
    ];

    CSO_SEARCH_FILTER=validFilters.includes(saved.filter)
      ?saved.filter:'all';

    CSO_SEARCH_PAGE=Number.isSafeInteger(saved.page)
      ?Math.max(1,saved.page):1;

  }catch(error){}
}

csoRestoreSearchState();

function csoHighlight(text,query){
  const source=String(text==null?'':text);
  const words=[...new Set(csoSearchWords(query))]
    .sort((a,b)=>b.length-a.length);

  if(!words.length)return esc(source);

  const lower=source.toLocaleLowerCase();
  const spans=[];

  for(const word of words){
    let from=0;
    const needle=word.toLocaleLowerCase();

    while(from<lower.length){
      const index=lower.indexOf(needle,from);
      if(index<0)break;

      spans.push([index,index+needle.length]);
      from=index+needle.length;
    }
  }

  if(!spans.length)return esc(source);

  spans.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);

  const merged=[];

  for(const span of spans){
    const previous=merged[merged.length-1];

    if(previous&&span[0]<=previous[1]){
      previous[1]=Math.max(previous[1],span[1]);
    }else{
      merged.push([...span]);
    }
  }

  let output='';
  let position=0;

  for(const [start,end] of merged){
    output+=esc(source.slice(position,start));
    output+='<mark class="cso-search-highlight">'+
      esc(source.slice(start,end))+'</mark>';
    position=end;
  }

  output+=esc(source.slice(position));
  return output;
}

/* CSO spelling suggestions v1 */
function csoSpellingSuggestion(query){
  if(!CSO_DIRECTORY_LOADED)return '';

  const words=csoSearchWords(query);
  if(!words.length||words.length>5)return '';

  const vocabulary=new Map();

  for(const item of CSO_DIRECTORY_INDEX){
    const title=String(item.title||'').toLocaleLowerCase();
    for(const word of title.match(/[a-z]{4,}/g)||[]){
      vocabulary.set(word,(vocabulary.get(word)||0)+1);
    }
  }

  for(const [title] of IDX()){
    for(const word of String(title).toLocaleLowerCase()
      .match(/[a-z]{4,}/g)||[]){
      vocabulary.set(word,(vocabulary.get(word)||0)+1);
    }
  }

  function distance(a,b){
    if(Math.abs(a.length-b.length)>2)return 3;
    let previous=Array.from({length:b.length+1},(_,i)=>i);

    for(let i=1;i<=a.length;i++){
      const current=[i];
      for(let j=1;j<=b.length;j++){
        current[j]=Math.min(
          current[j-1]+1,
          previous[j]+1,
          previous[j-1]+(a[i-1]===b[j-1]?0:1)
        );
      }
      previous=current;
    }

    return previous[b.length];
  }

  let changed=false;
  const corrected=words.map(word=>{
    if(word.length<4||vocabulary.has(word))return word;

    let best=word;
    let bestDistance=3;
    let bestFrequency=-1;

    for(const [candidate,frequency] of vocabulary){
      if(candidate[0]!==word[0])continue;
      if(Math.abs(candidate.length-word.length)>2)continue;

      const d=distance(word,candidate);

      if(d<bestDistance||
        (d===bestDistance&&frequency>bestFrequency)){
        best=candidate;
        bestDistance=d;
        bestFrequency=frequency;
      }
    }

    if(best!==word&&bestDistance<=2){
      changed=true;
      return best;
    }

    return word;
  });

  return changed?corrected.join(' '):'';
}

function csoSearchResultsHTML(query){
  const local=find(query).map(([title,id,source])=>({
    title,
    description:source||'',
    dashboard:'Homepage & Updates',
    trail:'Homepage & Updates',
    url:'',
    id,
    type:'home'
  }));

  const directory=csoDirectoryMatches(query).map(item=>({
    ...item,
    type:'directory'
  }));

  const all=[...local,...directory];

  const filters=[
    ['all','All Results'],
    ['home','Homepage & Updates'],
    ...CSO_DIRECTORIES
  ];

  const counts={all:all.length,home:local.length};

  CSO_DIRECTORIES.forEach(([slug,label])=>{
    counts[slug]=directory.filter(item=>
      item.url.startsWith(slug+'/')
    ).length;
  });

  const selected=filters.some(([key])=>
    key===CSO_SEARCH_FILTER
  )?CSO_SEARCH_FILTER:'all';

  const filtered=all.filter(item=>{
    if(selected==='all')return true;
    if(selected==='home')return item.type==='home';
    return item.type==='directory'&&
      item.url.startsWith(selected+'/');
  });

  const total=filtered.length;
  const pages=Math.max(
    1,Math.ceil(total/CSO_SEARCH_PAGE_SIZE)
  );

  // Keep the restored page until all directory requests settle.
  // Only then can the actual number of result pages be calculated.
  if(CSO_DIRECTORY_LOADED){
    CSO_SEARCH_PAGE=Math.min(
      Math.max(1,CSO_SEARCH_PAGE),
      pages
    );
  }else{
    CSO_SEARCH_PAGE=Math.max(1,CSO_SEARCH_PAGE);
  }

  const first=(CSO_SEARCH_PAGE-1)*CSO_SEARCH_PAGE_SIZE;
  const visible=filtered.slice(
    first,first+CSO_SEARCH_PAGE_SIZE
  );

  let html='<div class="cso-search-results" role="region" aria-label="Search results" aria-live="polite">';

  html+='<p>Results for <b>'+esc(query)+'</b></p>';

  if(!CSO_DIRECTORY_LOADED){
    html+='<div class="cso-search-loading" role="status" '+
      'aria-live="polite" aria-busy="true">'+
      '<span class="cso-search-spinner" aria-hidden="true"></span>'+
      '<span>Searching all directories…</span>'+
      '</div>';
  }

  html+='<p class="mut" role="status">'+
    total+' matching results'+
    (selected==='all'?' across Common Sense Odisha':' in '+
      esc(filters.find(([key])=>key===selected)[1]))+
    '</p>';

  if(CSO_DIRECTORY_ERROR){
    html+='<p class="mut" role="status">'+
      'Some directories could not be loaded: '+
      esc(CSO_DIRECTORY_ERROR)+'</p>';
  }

  html+='<div class="cso-search-filters" '+
    'role="group" aria-label="Filter search results">';

  filters.forEach(([key,label])=>{
    const active=key===selected;

    html+='<button type="button" '+
      'class="cso-search-filter" '+
      'data-cso-filter="'+esc(key)+'" '+
      'aria-pressed="'+active+'">'+
      esc(label)+' ('+(counts[key]||0)+')'+
      '</button>';
  });

  html+='</div>';

  if(visible.length){
    html+='<p class="mut">Showing '+
      (first+1)+'–'+(first+visible.length)+
      ' of '+total+' results</p>';

    html+='<div class="lst" role="feed" aria-label="Matching search results">';

    visible.forEach(item=>{
      if(item.type==='home'){
        html+='<a class="card rs" tabindex="0" role="article" data-h="'+
          esc(item.id)+'">'+
          '<b>'+csoHighlight(item.title,query)+'</b>'+
          '<small>Homepage & Updates</small>'+
          (item.description?
            '<small>'+csoHighlight(item.description,query)+'</small>':'')+
          '</a>';
      }else{
        html+='<a class="card rs" tabindex="0" role="article" href="'+
          esc(item.url)+'">'+
          '<b>'+csoHighlight(item.title,query)+'</b>'+
          '<small>'+csoHighlight(item.dashboard,query)+
          ' · '+csoHighlight(item.trail,query)+'</small>'+
          (item.description?
            '<small>'+csoHighlight(item.description.slice(0,180),query)+
            '</small>':'')+
          '</a>';
      }
    });

    html+='</div>';
  }else{
    const currentCategoryName = filters.find(([key])=>key===selected)?.[1] || selected;
    html+='<div class="cso-no-results-card" role="status" aria-live="polite">';
    html+='<div class="cso-no-results-icon" aria-hidden="true">🔍</div>';
    html+='<h3>No results found for "<b>'+esc(query)+'</b>"</h3>';
    html+='<p class="mut">We could not find matching results in '+
      (selected==='all'?'our verified Common Sense Odisha database':esc(currentCategoryName))+
      '. Try checking for typos or explore the suggested fallback searches below.</p>';

    if(total===0&&CSO_DIRECTORY_LOADED){
      const suggestion=csoSpellingSuggestion(query);

      if(suggestion&&suggestion!==csoNormalize(query).trim()){
        html+='<p class="cso-search-suggestion">'+
          'Did you mean <button type="button" class="cso-suggestion-btn" '+
          'data-cso-suggestion="'+esc(suggestion)+'">'+
          esc(suggestion)+'</button>?</p>';
      }
    }

    html+='<div class="cso-fallback-section">';
    html+='<p class="cso-fallback-heading">Suggested fallback searches:</p>';
    html+='<div class="cso-fallback-chips" role="group" aria-label="Suggested fallback searches">';
    const fallbacks=['Odisha Jobs','Scholarship','Study Library','OPSC','OSSTET','Career Guidance'];
    fallbacks.forEach(term=>{
      html+='<button type="button" class="cso-fallback-chip" data-cso-search="'+esc(term)+'">'+
        esc(term)+'</button>';
    });
    html+='</div></div>';
    html+='</div>';
  }

  if(pages>1){
    html+='<nav aria-label="Search result pages" class="cso-search-pagination">';

    html+='<button type="button" class="cso-search-page-btn" '+
      'data-cso-page="previous" '+
      (CSO_SEARCH_PAGE===1?'disabled ':'')+
      '>← Previous</button>';

    html+='<span>Page '+CSO_SEARCH_PAGE+
      ' of '+pages+'</span>';

    html+='<button type="button" class="cso-search-page-btn" '+
      'data-cso-page="next" '+
      (CSO_SEARCH_PAGE===pages?'disabled ':'')+
      '>Next →</button>';

    html+='</nav>';
  }

  html+='</div>';
  return html;
}

function csoHandleSearchClick(event){
  const suggestion=event.target.closest('[data-cso-suggestion]');

  if(suggestion){
    const query=suggestion.dataset.csoSuggestion;
    const input=getSearchInput();
    if(input)input.value=query;
    runSearch(query);
    return;
  }

  const fallback=event.target.closest('[data-cso-search]');

  if(fallback){
    const query=fallback.dataset.csoSearch;
    const input=getSearchInput();
    if(input)input.value=query;
    runSearch(query);
    return;
  }

  const filter=event.target.closest('[data-cso-filter]');

  if(filter){
    CSO_SEARCH_FILTER=filter.dataset.csoFilter;
    CSO_SEARCH_PAGE=1;
    csoSaveSearchState();
    route();
    return;
  }

  const pageButton=event.target.closest('[data-cso-page]');

  if(pageButton&&!pageButton.disabled){
    CSO_SEARCH_PAGE+=
      pageButton.dataset.csoPage==='next'?1:-1;
    csoSaveSearchState();
    route();
  }
}

function csoHandleSearchKeydown(event){
  if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
  const cards=Array.from(v.querySelectorAll('.card.rs'));
  if(!cards.length)return;
  const currentIndex=cards.indexOf(document.activeElement);
  let nextIndex=0;
  if(event.key==='ArrowDown'){
    nextIndex=currentIndex===-1?0:(currentIndex<cards.length-1?currentIndex+1:0);
  }else if(event.key==='ArrowUp'){
    nextIndex=currentIndex===-1?cards.length-1:(currentIndex>0?currentIndex-1:cards.length-1);
  }
  event.preventDefault();
  cards[nextIndex].focus();
}

/* CSO-IN Trending Topics Phase 2 */
const csoTrendingTopicsList = () =>
  TOPICS.length
    ? '<div class="lst">' + TOPICS.map(([title, destination, description]) =>
        '<a class="card rs" href="' + esc(destination) + '">' +
        '<b>' + esc(title) + '</b>' +
        '<small>' + esc(description || '') + '</small>' +
        '</a>'
      ).join('') + '</div>'
    : '<p class="mut">Topics are being prepared.</p>';

const list=a=>a.length?'<div class="lst">'+a.map(([t,s,x])=>'<a class="card rs" data-h="'+s+'"><b>'+esc(t)+'</b><small>'+esc(x||'')+'</small></a>').join('')+'</div>':'<p class="mut">Nothing here yet. Content is being added.</p>';
const bd=b=>'<span class="bd'+(b==='New'||b==='Update'?' r':'')+'">'+(b==='Official'||b==='Guide'?'⊙':'⊗')+' '+b+'</span>';
let TOPICS=[],TOOLS=[];
let CSO_ALL_UPDATES_CATEGORY='All';
/* CSO Latest Updates live search v1 */
let CSO_ALL_UPDATES_QUERY='';

function csoUpdateDirectoryResults(){
  const container=document.querySelector('.cso-all-updates');
  if(!container)return;

  const query=CSO_ALL_UPDATES_QUERY.trim().toLocaleLowerCase();
  const cards=container.querySelectorAll('.cso-update-result');
  let visible=0;

  cards.forEach(card=>{
    const searchable=[
      card.querySelector('strong')?.textContent||'',
      card.querySelector('small')?.textContent||'',
      card.querySelector('.tg')?.textContent||''
    ].join(' ').toLocaleLowerCase();

    const match=!query||searchable.includes(query);
    card.hidden=!match;
    if(match)visible++;
  });

  const count=container.querySelector(
    '[data-cso-updates-result-count]'
  );

  if(count){
    count.textContent=visible+' '+
      (visible===1?'update':'updates')+
      ' in '+CSO_ALL_UPDATES_CATEGORY+
      (query?' matching your search':'');
  }

  const empty=container.querySelector(
    '[data-cso-updates-search-empty]'
  );

  if(empty){
    empty.hidden=visible!==0;
  }
}

function csoAllUpdatesInput(event){
  const input=event.target.closest(
    '[data-cso-updates-search]'
  );
  if(!input)return;

  CSO_ALL_UPDATES_QUERY=input.value;
  csoUpdateDirectoryResults();
}


function csoAllUpdatesClick(event){
  const clear=event.target.closest(
    '[data-cso-updates-clear]'
  );

  if(clear){
    CSO_ALL_UPDATES_QUERY='';
    const input=document.querySelector(
      '[data-cso-updates-search]'
    );
    if(input){
      input.value='';
      input.focus();
    }
    csoUpdateDirectoryResults();
    return;
  }

  const button=event.target.closest(
    '[data-cso-update-category]'
  );
  if(!button)return;

  CSO_ALL_UPDATES_CATEGORY=button.dataset.csoUpdateCategory;
  route();
}

function csoAllUpdatesHTML(){
  const categories=['All','Jobs','Schemes','Education','Odisha','National'];
  const current=CSO_ALL_UPDATES_CATEGORY;
  const filtered=csoPublishedUpdates().filter(u=>current==='All'||u.cat===current);

  let html='<div class="cso-all-updates">'+
    '<p class="mut">Browse announcements, opportunities, schemes and CSO guides. Check the source information before acting on an update.</p>'+
    '<div class="cso-updates-search-wrap">'+
      '<label for="cso-updates-search-input">Search announcements</label>'+
      '<div class="cso-updates-search-controls">'+
        '<input id="cso-updates-search-input" type="search" '+
        'data-cso-updates-search '+
        'placeholder="Search title, department or category..." '+
        'autocomplete="off" '+
        'value="'+esc(CSO_ALL_UPDATES_QUERY)+'">'+
        '<button type="button" data-cso-updates-clear '+
        'aria-label="Clear announcement search">Clear</button>'+
      '</div>'+
    '</div>'+
    '<div class="cso-all-updates-filters" role="group" aria-label="Filter all updates">';

  for(const category of categories){
    const count=category==='All'
      ?csoPublishedUpdates().length
      :csoPublishedUpdates().filter(u=>u.cat===category).length;

    const active=category===current;

    html+='<button type="button" data-cso-update-category="'+esc(category)+'" '+
      'aria-pressed="'+String(active)+'" '+
      'class="'+(active?'active':'')+'">'+
      esc(category)+' ('+count+')</button>';
  }

  html+='</div><p class="mut" role="status" data-cso-updates-result-count>'+
    filtered.length+' '+(filtered.length===1?'update':'updates')+
    ' in '+esc(current)+'</p>';

  if(!filtered.length){
    html+='<p class="cso-all-updates-empty" role="status">'+
      'No updates in this category yet.</p>';
  }else{
    html+='<div class="cso-all-updates-list">';

    /* CSO Latest Updates source grouping fix v2 */
    for(const u of filtered){
      const tagMod=u.tag==='SCHEME'?'tg--scheme':u.tag==='EDUCATION'?'tg--edu':u.tag==='GUIDE'?'tg--guide':'';

      html+='<article class="cso-update-result">'+
        '<a class="cso-all-update-card" href="#'+esc(u.id)+'" '+
        'data-h="'+esc(u.id)+'">'+
        '<span class="tg '+tagMod+'">'+esc(u.tag)+'</span>'+
        '<span class="cso-all-update-main">'+
        '<strong>'+esc(u.title)+'</strong>'+
        '<small>'+esc(u.src)+'</small></span>'+
        '<span class="cso-all-update-meta">'+
        '<time>'+esc(u.date)+'</time>'+
        '</span></a>'+
        '<div class="cso-update-result-source">'+
        csoUpdateBadges(u)+
        '</div></article>';
    }

    html+='</div>';
  }

  html+='<p class="cso-all-updates-empty" '+
    'data-cso-updates-search-empty role="status" hidden>'+
    'No announcements match your search. Try another keyword '+
    'or select a different category.</p>';

  return html+'</div>';
}

function csoStudentDashboardHTML(){
  const name = esc(
    csoAuthUser?.fullName || 'Student'
  );

  const cards = [
    ['📚', 'Study Library', 'Notes, PDFs and learning resources', '/study-library/'],
    ['💼', 'Jobs & Recruitment', 'Explore verified Odisha & Central job openings', '/jobs/'],
    ['🎓', 'Mock Tests & Practice', 'Explore timed mock tests and exam resources', '/mock-tests/'],
    ['🤲', 'Schemes & Benefits', 'Discover scholarships and government benefits', '/schemes/'],
    ['🧭', 'Career Roadmaps', 'Explore career pathways and guidance', '/careers/'],
    ['👥', 'CSO Community', 'Connect with learners across Odisha', '/community/']
  ];

  return `
    <section class="cso-student-welcome">
      <span class="cso-student-kicker">STUDENT PORTAL</span>
      <h2>Welcome, ${name}!</h2>
      <p>Your account is active. Your learning journey starts here.</p>
      <span class="cso-student-status">✓ Account activated</span>
    </section>

    <section class="cso-student-section">
      <h2>Your Learning Space</h2>
      <p>Explore the resources and opportunities available through CSO.</p>

      <div class="cso-student-grid">
        ${cards.map(([icon,title,description,url]) => `
          <a class="cso-student-card" href="${url}">
            <span class="cso-student-icon">${icon}</span>
            <strong>${title}</strong>
            <span>${description}</span>
            <span class="cso-student-arrow">Explore →</span>
          </a>
        `).join('')}
      </div>
    </section>

    <section class="cso-student-shortcuts">
      <a href="#latest-updates">🔔 Latest Updates</a>
      <a href="#important-tools">🔧 Important Tools</a>
      <a href="about/">About CSO</a>
    </section>
  `;
}

function view(h){
 let t,b='';const U=csoPublishedUpdates().find(u=>u.id===h),C=CONTENT[h];
 if(h==='student-dashboard'){
    t='Student Dashboard';
    b=csoStudentDashboardHTML();
  }
  else if(h==='search'){t='Search results';b=csoSearchResultsHTML(lastQ)}
 else if(h==='latest-updates'){
    t='Latest Updates';
    b=csoAllUpdatesHTML();
  }
 else if(h==='popular-topics'){t='Trending & Popular Topics';b=csoTrendingTopicsList()}
 else if(h==='important-tools'){t='Important Tools';b=list(TOOLS)}
 else if(U){
    t=U.title;
    b='<p class="mut">Source: '+esc(U.src)+' | Published: '+esc(U.date)+'</p>'+
      '<p class="cso-update-detail-badges">'+csoUpdateBadges(U)+'</p>'+
      (U.body||'<p class="mut">Detailed information has not yet been added. Please confirm the announcement directly with the issuing organisation before taking action.</p>')+
      (U.url&&/^https:\/\//i.test(U.url)
        ?'<p><a class="btn p cso-btn-inline" target="_blank" rel="noopener noreferrer" href="'+esc(U.url)+'">Visit source website</a></p>'
        :'<p class="mut">A supporting source link has not yet been provided.</p>');
  }
  else if(window.CSO_TOOLS_V2 && window.CSO_TOOLS_V2.render(h)){const tool=window.CSO_TOOLS_V2.render(h);t=tool.title;b=tool.html;}
 else if(h==='age-calculator'){t='Age Calculator';b='<form class="fm" id="acf"><label>Date of birth<input type="date" id="dob" required></label><label>Age as on<input type="date" id="aon"></label><button class="btn p">Calculate</button></form><p id="aor" class="cso-age-out"></p>'}
 else{t=(C&&C.title)||TITLES[h]||h.replace(/-/g,' ');b=(C?C.html:'')+(MENUS[h]?list(MENUS[h].map(x=>[x,slug(x),''])):'');if(!C&&!MENUS[h])b='<p class="mut">Content for this page will be added soon.</p>'}
 return'<div class="card sec"><p class="crumb"><a data-h="">Home</a> › '+esc(t)+'</p><h1 class="cso-detail-h1">'+esc(t)+'</h1>'+b+'<p><a class="btn cso-btn-inline" data-h="">← Back to Home</a></p></div>'}
function after(h){if(window.CSO_TOOLS_V2&&window.CSO_TOOLS_V2.render(h)){window.CSO_TOOLS_V2.init(h);return;}if(h!=='age-calculator')return;const d=new Date();$('#aon').value=d.toISOString().slice(0,10);$('#acf').onsubmit=e=>{e.preventDefault();const a=new Date($('#dob').value),b=new Date($('#aon').value),r=$('#aor');if(isNaN(a)||isNaN(b))return r.textContent=T('Please enter both dates.');if(a>b)return r.textContent=T('Birth date must be before the "as on" date.');let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),dd=b.getDate()-a.getDate();if(dd<0){m--;dd+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(m<0){y--;m+=12}r.textContent=T('Age:')+' '+y+' '+T('years')+', '+m+' '+T('months')+', '+dd+' '+T('days')}}

function csoMapEventsToUpdates(ev){
  if(!ev||typeof ev!=='object')return null;
  const out=[];
  const seen=new Set();
  const safeId=(raw,idx)=>String(raw||('evt-'+idx)).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||('evt-'+idx);
  const safeHttps=u=>(u&&/^https:\/\//i.test(u))?u:'https://csodisha.com/';
  const pushList=(arr,cat,tag,badge)=>{
    (arr||[]).forEach((item,idx)=>{
      const id=safeId(item.event_code||item.deadline_code||item.alert_code||item.result_code||item.id,(out.length+idx));
      if(seen.has(id))return;
      seen.add(id);
      const title=String(item.title_en||item.exam_title_en||item.post_title_en||item.title||'Odisha Update').trim();
      const dt=String(item.exam_date_ist||item.close_at_ist||item.release_at_ist||item.declared_at_ist||ev.generated_at_ist||'2026-11-17').slice(0,10);
      out.push({
        id,cat,tag,title,
        src:String(item.conducting_body||item.department_name||'CS Odisha Live').trim(),
        date:dt,
        badges:[badge,String(item.language||'EN+OR')],
        body:String(item.summary_en||item.note_en||item.stage_label||title).trim(),
        url:safeHttps(item.official_portal_url||item.official_url),
        status:'published'
      });
    });
  };
  pushList(ev.upcoming_exams,'Odisha','ODISHA','Exam');
  pushList(ev.active_deadlines,'Jobs','JOB','Deadline');
  pushList(ev.admit_cards,'Education','EDUCATION','Admit Card');
  pushList(ev.results_dv,'Odisha','ODISHA','Result');
  return out.length?out:null;
}

function csoMapJobArticlesToUpdates(data){
  if(!data||!Array.isArray(data.items)||!data.items.length)return [];
  const safeId=(raw,idx)=>'job-'+String(raw||idx).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return data.items.slice(0,12).map((a,idx)=>{
    const isOr=S.lang==='or';
    const title=(isOr&&a.title_or)?a.title_or:(a.title_en||'Job Notification');
    const org=(isOr&&a.organisation_or)?a.organisation_or:(a.organisation_en||a.sector_badge||'CS Odisha Jobs');
    const vac=a.total_vacancies?(' · '+a.total_vacancies+' Posts'):'';
    const dt=String(a.last_date||a.published_at||a.updated_at||'2026-11-24').slice(0,10);
    const articleUrl='https://csodisha.com/jobs/?slug='+encodeURIComponent(a.slug||'');
    return {
      id:safeId(a.slug||a.id,idx),
      cat:'Jobs',
      tag:'JOB',
      title:title,
      src:org+vac,
      date:dt,
      badges:[a.status_badge||'Active',a.qualification_level||'EN+OR'],
      body:String(a.summary_en||title).trim(),
      url:articleUrl,
      article_href:'/jobs/?slug='+encodeURIComponent(a.slug||''),
      status:'published'
    };
  });
}

function csoMapSchemeArticlesToUpdates(data){
  if(!data||!Array.isArray(data.items)||!data.items.length)return [];
  const safeId=(raw,idx)=>'scheme-'+String(raw||idx).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return data.items.slice(0,12).map((a,idx)=>{
    const isOr=S.lang==='or';
    const title=(isOr&&a.title_or)?a.title_or:(a.title_en||'Welfare Scheme');
    const dept=(isOr&&a.department_or)?a.department_or:(a.department_en||a.gov_badge||'CS Odisha Schemes');
    const ben=a.benefit_amount_summary?(' · '+a.benefit_amount_summary):'';
    const dt=String(a.last_date||a.published_at||a.updated_at||'2026-11-24').slice(0,10);
    const articleUrl='https://csodisha.com/schemes/?slug='+encodeURIComponent(a.slug||'');
    return {
      id:safeId(a.slug||a.id,idx),
      cat:'Schemes',
      tag:'SCHEME',
      title:title,
      src:dept+ben,
      date:dt,
      badges:[a.status_badge||'Active',a.application_mode||'DBT'],
      body:String(a.summary_en||title).trim(),
      url:articleUrl,
      article_href:'/schemes/?slug='+encodeURIComponent(a.slug||''),
      status:'published'
    };
  });
}

function csoMapStudyArticlesToUpdates(data){
  if(!data||!Array.isArray(data.items)||!data.items.length)return [];
  const safeId=(raw,idx)=>'study-'+String(raw||idx).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return data.items.slice(0,12).map((a,idx)=>{
    const isOr=S.lang==='or';
    const title=(isOr&&a.title_or)?a.title_or:(a.title_en||'Study Resource');
    const srcParts=[a.exam_board_tag||a.resource_type_badge||'Study Library',a.estimated_read_mins?(a.estimated_read_mins+' min read'):''].filter(Boolean);
    const dt=String(a.published_at||a.updated_at||'2026-11-24').slice(0,10);
    const articleUrl='https://csodisha.com/study-library/?slug='+encodeURIComponent(a.slug||'');
    return {
      id:safeId(a.slug||a.id,idx),
      cat:'Education',
      tag:'EDUCATION',
      title:title,
      src:srcParts.join(' · '),
      date:dt,
      badges:[a.resource_type_badge||'Study Notes',a.high_yield_priority||'High'],
      body:String(a.summary_en||title).trim(),
      url:articleUrl,
      article_href:'/study-library/?slug='+encodeURIComponent(a.slug||''),
      status:'published'
    };
  });
}

function csoMapCommunityPostsToUpdates(data){
  if(!data||!Array.isArray(data.items)||!data.items.length)return [];
  const safeId=(raw,idx)=>'comm-'+String(raw||idx).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return data.items.slice(0,8).map((p,idx)=>{
    const isOr=S.lang==='or';
    const title=(isOr&&p.title_or)?p.title_or:(p.title_en||'Community Highlight');
    const src=(p.author_display_name||'CS Odisha Community')+(p.district_tag?' · '+p.district_tag:'');
    const dt=String(p.created_at||p.updated_at||'2026-11-24').slice(0,10);
    const postUrl='https://csodisha.com/community/?slug='+encodeURIComponent(p.slug||'');
    return {
      id:safeId(p.slug||p.id,idx),
      cat:'Odisha',
      tag:'ODISHA',
      title:title,
      src:src,
      date:dt,
      badges:[String(p.post_type||'Community').replace(/_/g,' '),p.author_badge||'Community'],
      body:String(p.body_en||title).slice(0,220).trim(),
      url:postUrl,
      article_href:'/community/?slug='+encodeURIComponent(p.slug||''),
      status:'published'
    };
  });
}

/* Load published updates from live D1 /api/public/jobs + /api/public/schemes + /api/public/study + /api/public/community/posts + /api/events/upcoming, falling back to static JSON when offline. */
function csoLoadPublishedUpdates(){
  return Promise.all([
    fetch('/api/public/jobs?limit=12',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/public/schemes?limit=12',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/public/study?limit=12',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/public/community/posts?limit=8',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/events/upcoming',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
  ])
    .then(([jobsData,schemesData,studyData,commData,ev])=>{
      const jobUpdates=csoMapJobArticlesToUpdates(jobsData);
      const schemeUpdates=csoMapSchemeArticlesToUpdates(schemesData);
      const studyUpdates=csoMapStudyArticlesToUpdates(studyData);
      const commUpdates=csoMapCommunityPostsToUpdates(commData);
      const evUpdates=csoMapEventsToUpdates(ev)||[];
      const merged=[];
      const seen=new Set();
      [...jobUpdates,...schemeUpdates,...studyUpdates,...commUpdates,...evUpdates].forEach(item=>{
        if(!item||seen.has(item.id))return;
        seen.add(item.id);
        merged.push(item);
      });
      if(merged.length)return merged;
      return fetch('data/latest-updates.json',{cache:'no-store'})
        .then(response=>{
          if(!response.ok)throw Error('Updates HTTP '+response.status);
          return response.json();
        });
    })
    .then(records=>{
      const categories=new Set([
        'Jobs','Schemes','Education','Odisha','National'
      ]);
      const tags=new Set([
        'JOB','SCHEME','EDUCATION','ODISHA','GUIDE'
      ]);
      const required=[
        'id','cat','tag','title','src',
        'date','badges','body','url','status'
      ];

      if(!Array.isArray(records))
        throw Error('Updates must be an array');

      const ids=new Set();

      for(const u of records){
        if(!u||typeof u!=='object'||Array.isArray(u))
          throw Error('Invalid update record');

        if(!required.every(k=>Object.hasOwn(u,k)))
          throw Error('Missing update field');

        if(!required.every(k=>
          k==='badges'
            ?Array.isArray(u[k])&&u[k].every(x=>typeof x==='string')
            :typeof u[k]==='string'
        ))throw Error('Invalid update field type');

        if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(u.id))
          throw Error('Invalid update ID');

        if(ids.has(u.id))
          throw Error('Duplicate update ID');

        ids.add(u.id);

        if(!categories.has(u.cat)||!tags.has(u.tag))
          throw Error('Invalid update category or tag');

        if(!['draft','published'].includes(u.status))
          throw Error('Invalid publication status');

        if(u.url&&!/^https:\/\//i.test(u.url))
          throw Error('Update URL must use HTTPS');
      }

      UPDATES=records;
       const publishedCount=csoPublishedUpdates().length;
      lu();

      const current=location.hash.slice(1);

      if(current==='latest-updates'||
         records.some(u=>u.id===current)){
        route();
      }

      if(current==='search'){
        csoLoadDirectories().then(()=>{
          if(location.hash==='#search')route();
        });
      }

      console.info(
        'CSO-IN: '+records.length+
        ' records loaded from JSON; '+publishedCount+' published'
      );

      return true;
    })
    .catch(error=>{
      console.warn(
        'CSO-IN: Using bundled update records:',
        error.message
      );
      return false;
    });
}

let csoDashboardAuthPending = false;

function route(){
  const h=location.hash.slice(1),mn=$('#home'),v=$('#view');

  if(h==='student-dashboard' && csoAuthUser){
    mn.hidden=true;
    v.hidden=false;
    setSafeHtml(v, view(h));
    after(h);
    v.onclick=null;
    v.oninput=null;
    scrollTo(0,0);
    setActive(h);
    localize(v);
    return;
  }

  if(h==='student-dashboard'){
    mn.hidden=true;
    v.hidden=false;
    setSafeHtml(v, '<div class="card sec">Checking your secure student session...</div>');

    if(!csoDashboardAuthPending){
      csoDashboardAuthPending=true;

      csoRestoreAuthSession().then(authenticated=>{
        csoDashboardAuthPending=false;

        if(authenticated && location.hash==='#student-dashboard'){
          route();
        } else if(location.hash==='#student-dashboard'){
          location.hash='';
          route();
          toast('Please log in to access your student dashboard.');
        }
      }).catch(()=>{
        csoDashboardAuthPending=false;
        csoAuthUser=null;
        authUI();

        if(location.hash==='#student-dashboard'){
          location.hash='';
          route();
          toast('Unable to verify your session. Please log in again.');
        }
      });
    }
    return;
  }

  if(!h){mn.hidden=false;v.hidden=true}else{mn.hidden=true;v.hidden=false;setSafeHtml(v, view(h));after(h);if(h==='search'){v.onclick=csoHandleSearchClick;v.onkeydown=csoHandleSearchKeydown;}
    else if(h==='latest-updates'){
      v.onclick=csoAllUpdatesClick;
      v.oninput=csoAllUpdatesInput;
      v.onkeydown=null;
      csoUpdateDirectoryResults();
    }
    else {v.onclick=null;v.onkeydown=null;}
    if(h!=='latest-updates')v.oninput=null;
  }if(h!=='search')scrollTo(0,0);setActive(h);localize(v)}
const runSearch=q=>{q=q.trim();if(!q)return toast('Type something to search');lastQ=q;CSO_SEARCH_FILTER='all';CSO_SEARCH_PAGE=1;csoSaveSearchState();if(location.hash==='#search')route();else go('search');csoLoadDirectories().then(()=>{if(location.hash==='#search'&&lastQ===q)route()})};
const voice=(inp,f)=>{const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast('Voice input is not supported in this browser');const r=new R();r.lang={en:'en-IN',or:'or-IN',hi:'hi-IN'}[S.lang];r.onresult=e=>{inp.value=e.results[0][0].transcript;f.requestSubmit()};r.onerror=()=>toast('Could not hear you');r.start();toast('Listening...')};
const TG={JOB:['#f26a1b','#fff1e8'],SCHEME:['#2c8f3e','#e8f6ee'],EDUCATION:['#6d28d9','#eee8fb'],ODISHA:['#f26a1b','#fff1e8'],GUIDE:['#1d4ed8','#e6efff']};
let cat='All';
/* CSO dates and official source v2 */
function csoUpdateBadges(u){
  /* CSO: Hide dates until further notice */
  const url=typeof u.url==='string'?u.url.trim():'';

  if(!/^https:\/\//i.test(url)){
    return '<span class="cso-update-badge unverified">Source unavailable</span>';
  }

  return '<a class="cso-official-source-link" '+
    'href="'+esc(url)+'" '+
    'target="_blank" rel="noopener noreferrer">'+
    '↗ Official Source</a>';
}

function lu(){
  if(window.__CSO_LU_HYDRATED__||$('#cso-lu-list .cso-lu-item'))return;
  $$('.lu .it,.lu .em').forEach(x=>x.remove());
  const activeCat=String(cat||'All').trim().toLowerCase();
  const L=csoPublishedUpdates().filter(u=>{
    if(activeCat==='all'||!activeCat)return true;
    if(activeCat==='exams'){
      return String(u.cat||'').trim().toLowerCase()==='exams'||String(u.tag||'').toUpperCase()==='EXAM'||/exam|admit|result|answer|syllabus|pyq|mock|opsc|ossc|osssc|otet|osstet|ctet|ugc|oavs/i.test(String(u.title||''));
    }
    return String(u.cat||'').trim().toLowerCase()===activeCat;
  }).slice(0,5);
  const html=L.map(u=>{
    const tagMod=u.tag==='SCHEME'?'tg--scheme':u.tag==='EDUCATION'?'tg--edu':u.tag==='GUIDE'?'tg--guide':'';
    const linkHtml=u.article_href
      ?'<a href="'+esc(u.article_href)+'"><strong>'+esc(u.title)+'</strong></a>'
      :'<a href="#'+esc(u.id)+'" data-h="'+esc(u.id)+'"><strong>'+esc(u.title)+'</strong></a>';
    return '<div class="it cso-update-row">'+
      '<span class="tg '+tagMod+'">'+esc(u.tag)+'</span>'+
      '<span class="cso-update-main">'+linkHtml+
      '<small>'+esc(u.src)+'</small></span>'+
      '<span class="d">'+
      '<span class="cso-update-badges">'+csoUpdateBadges(u)+'</span></span>'+
      '</div>';
  }).join('');
  /* CSO upward ticker integration v1 */
  const panel=$('.lu');

  if(!panel)return;

  panel.classList.remove('cso-ticker-active');
  panel.querySelectorAll('.cso-ticker-window').forEach(x=>x.remove());

  if(!L.length){
    const emptyP=document.createElement('p');
    emptyP.className='em mut';
    emptyP.setAttribute('role','status');
    emptyP.textContent='No updates in this category yet. Click All to view recent updates.';
    panel.appendChild(emptyP);
    return;
  }

  const reduceMotion=window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const windowEl=document.createElement('div');
  windowEl.className='cso-ticker-window';

  const track=document.createElement('div');
  track.className='cso-ticker-track';

  const original=document.createElement('div');
  original.className='cso-ticker-items';
  setSafeHtml(original, html);

  track.appendChild(original);

  if(L.length>1&&!reduceMotion){
    const duplicate=original.cloneNode(true);
    duplicate.setAttribute('aria-hidden','true');

    duplicate.querySelectorAll('a').forEach(a=>{
      a.setAttribute('tabindex','-1');
    });

    track.appendChild(duplicate);
    panel.classList.add('cso-ticker-active');
  }

  windowEl.appendChild(track);
  panel.appendChild(windowEl);
}
document.addEventListener('click',e=>{
 const admLink = e.target.closest('a.adm, a[href^="/admin"]');
 if (admLink) return;
 const d=e.target.closest('[data-h]');if(d){e.preventDefault();if(d.dataset.h.endsWith('/')){location.href=d.dataset.h}else{go(d.dataset.h)}return}
 const m=e.target.closest('[data-m]');if(m){go(m.dataset.m);return}
 const a=e.target.closest('a[href="#"]');if(!a||a.classList.contains('opt'))return;e.preventDefault();
 const s=a.dataset.route||slug(clean(a.textContent)),M={'view-all':'latest-updates','view-all-topics':'popular-topics','view-all-tools':'important-tools','learn-more':'about','join-now':'community','browse-library':'study-library','home':''};
 if(s==='get-started')return compass();
 if(s==='community'||s==='join-now'){location.href='/community/';return}
 if(s==='about'){location.href='/about/';return}
 if(s==='browse-library'){location.href='/study-library/';return}
 go(s in M?M[s]:s)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'){const d=e.target.closest('.it[data-h], .card.rs[data-h]');if(d)go(d.dataset.h)}});
function compass(){const m=modal('<h3>CSO Opportunity Compass</h3><p class="mut">What are you looking for?</p><div class="lst cso-compass-lst">'+[['/jobs/','💼 I want a Job'],['/study-library/','🎓 I want to Study'],['/schemes/','🤲 I want a Scheme'],['/careers/','🧭 I want Career Guidance']].map(([s,t])=>'<a class="card rs" data-h="'+s+'">'+t+'</a>').join('')+'</div>');m.addEventListener('click',e=>{if(e.target.closest('[data-h]'))m.close()})}
function admin(){
  const m=modal(`
    <section class="cso-admin-login">
      <div class="cso-admin-head">
        <div class="cso-admin-shield" aria-hidden="true">🛡️</div>
        <h2>Admin Portal</h2>
        <p>Common Sense Odisha</p>
        <span class="cso-admin-tag">Authorised Access Only</span>
      </div>
      <form id="cso-admin-form" novalidate>
        <label for="cso-admin-id">Admin ID or Email</label>
        <input id="cso-admin-id" name="adminId"
          type="text" autocomplete="username"
          placeholder="Enter admin ID or email" required>

        <label for="cso-admin-password">Password</label>
        <div class="cso-admin-password">
          <input id="cso-admin-password" name="password"
            type="password" autocomplete="current-password"
            placeholder="Enter password" required>
          <button type="button" id="cso-admin-toggle"
            aria-label="Show password"
            aria-pressed="false">Show</button>
        </div>

        <p id="cso-admin-error" class="cso-admin-error"
          role="alert" hidden></p>

        <button type="submit" class="btn p cso-admin-submit">
          Sign In
        </button>
      </form>
      <p class="cso-admin-notice">
        🔒 Restricted to authorised CSO administrators.
        Authentication and dashboard access will be enabled later.
      </p>
    </section>
  `);

  const f=m.querySelector('#cso-admin-form');
  const id=m.querySelector('#cso-admin-id');
  const pw=m.querySelector('#cso-admin-password');
  const toggle=m.querySelector('#cso-admin-toggle');
  const error=m.querySelector('#cso-admin-error');

  toggle.onclick=()=>{
    const show=pw.type==='password';
    pw.type=show?'text':'password';
    toggle.textContent=show?'Hide':'Show';
    toggle.setAttribute('aria-label',show?'Hide password':'Show password');
    toggle.setAttribute('aria-pressed',String(show));
  };

  f.onsubmit=e=>{
    e.preventDefault();
    error.hidden=false;

    if(!id.value.trim()||!pw.value.trim()){
      error.textContent='Please enter your Admin ID and password.';
      return;
    }

    error.textContent='Admin authentication is not connected yet. No sign-in was attempted.';
  };

  id.focus();
}
/* CSO admin portal login v1 */
/* init */
const home=$('main');const viewMain=mk('main','w');viewMain.id='view';viewMain.hidden=true;if(home){home.id='home';home.after(viewMain);}
try{apply();}catch(e){console.error('[CSO App] apply failed:',e);}
try{nav();}catch(e){console.error('[CSO App] nav failed:',e);}
try{ctl();}catch(e){console.error('[CSO App] ctl failed:',e);}
try{authUI();}catch(e){console.error('[CSO App] authUI failed:',e);}
try{csoRestoreAuthSession();}catch(e){console.error('[CSO App] restoreAuth failed:',e);}
const topDiv=$('.top>div');if(topDiv)topDiv.dataset.h='';
const bind=(el,title)=>{const s=reg(title);el.tabIndex=0;el.setAttribute('role','link');el.addEventListener('click',e=>{e.preventDefault();go(s)});el.addEventListener('keydown',e=>{if(e.key==='Enter')go(s)})};
$$('a[href="#"]').forEach(a=>{a.dataset.route=slug(clean(a.textContent))});
$$('.opt').forEach(c=>bind(c,clean($('b',c).textContent)));
/* CSO-IN Trending Topics directory links v1 */
const CSO_TRENDING_DESTINATIONS = [
  '/jobs/',
  '/study-library/',
  '/schemes/',
  '/study-library/',
  '/careers/',
  '/schemes/'
];

$$('.tp').forEach((c, index) => {
  const title = clean($('b', c).textContent);
  const destination = CSO_TRENDING_DESTINATIONS[index];

  c.tabIndex = 0;
  c.setAttribute('role', 'link');
  c.setAttribute('aria-label', 'Explore ' + title);

  c.addEventListener('click', () => {
    window.location.assign(destination);
  });

  c.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.location.assign(destination);
    }
  });

  TOPICS.push([title, destination, $('small', c).textContent]);
});
$$('.tl.card').forEach(c=>{const t=clean($('b',c).textContent);bind(c,t);if(c.closest('.sec').textContent.includes('Important Tools'))TOOLS.push([t,slug(t),$('small',c).textContent])});
const bindLuTabs=()=>{
  if(window.__CSO_LU_HYDRATED__)return;
  $$('.lu .tabs button').forEach(s=>{
  const canonical=(s.dataset.category||s.textContent||'').trim()||'All';
  s.dataset.category=canonical;
  if(!s.dataset.tab)s.dataset.tab=canonical.toLowerCase();
  if(!s.getAttribute('role'))s.setAttribute('role','tab');
  if(!s.hasAttribute('aria-selected'))s.setAttribute('aria-selected',String(s.classList.contains('a')));
  s.onclick=()=>{
    $$('.lu .tabs button').forEach(x=>{
      const active=x===s;
      x.classList.toggle('a',active);
      x.setAttribute('aria-pressed',String(active));
      x.setAttribute('aria-selected',String(active));
    });
    cat=s.dataset.category||'All';
    lu();
    localize($('.lu'));
  };
  });
};
bindLuTabs();
window.csoHome=Object.assign(window.csoHome||{},{bindTabs:bindLuTabs,bindTool:bind,localize,setCategory:(nextCat)=>{cat=nextCat||'All';lu();}});
lu();
let selectedSuggestIndex = -1;
let currentSuggestions = [];

function closeSearchAutocomplete() {
  const dropdown = $('#cso-search-autocomplete');
  const input = getSearchInput();
  if (dropdown) {
    dropdown.hidden = true;
    dropdown.replaceChildren();
  }
  if (input) {
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  selectedSuggestIndex = -1;
  currentSuggestions = [];
}

function updateSelectedSuggestItem(items) {
  const input = getSearchInput();
  items.forEach((el, idx) => {
    const isSelected = idx === selectedSuggestIndex;
    el.setAttribute('aria-selected', String(isSelected));
    el.classList.toggle('selected', isSelected);
    if (isSelected) {
      if (input) input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    }
  });
  if (selectedSuggestIndex === -1 && input) {
    input.removeAttribute('aria-activedescendant');
  }
}

function activateSuggestItem(item) {
  if (!item) return;
  const input = getSearchInput();
  if (item.type === 'home' && item.id) {
    go(item.id);
  } else if (item.url) {
    if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
      window.location.href = item.url;
    } else {
      window.location.assign(new URL(item.url, document.baseURI).href);
    }
  } else if (item.title) {
    if (input) input.value = item.title;
    runSearch(item.title);
  }
}

function renderSearchAutocomplete(query, suggestions) {
  const dropdown = $('#cso-search-autocomplete');
  const input = getSearchInput();
  if (!dropdown || !input) return;

  if (!suggestions.length) {
    const suggestion = csoSpellingSuggestion(query);
    let emptyHtml = '<div class="cso-autocomplete-empty" role="status">';
    emptyHtml += '<p class="cso-autocomplete-empty-title">No suggestions found for "<b>' + esc(query) + '</b>"</p>';
    if (suggestion && suggestion !== csoNormalize(query).trim()) {
      emptyHtml += '<p class="cso-search-suggestion">Did you mean: <button type="button" class="cso-suggestion-btn" data-cso-suggest-term="' + esc(suggestion) + '">' + esc(suggestion) + '</button>?</p>';
    }
    emptyHtml += '<p class="cso-autocomplete-empty-sub">Popular searches:</p>';
    emptyHtml += '<div class="cso-fallback-chips" role="group" aria-label="Suggested searches">';
    const popular = ['Odisha Jobs', 'Scholarship', 'Study Library', 'OPSC', 'OSSTET'];
    popular.forEach(term => {
      emptyHtml += '<button type="button" class="cso-fallback-chip" data-cso-suggest-term="' + esc(term) + '">' + esc(term) + '</button>';
    });
    emptyHtml += '</div></div>';

    setSafeHtml(dropdown, emptyHtml);
    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
    return;
  }

  let html = '<div class="cso-autocomplete-list">';
  suggestions.forEach((item, index) => {
    const optId = 'cso-opt-' + index;
    html += '<div class="cso-autocomplete-item" id="' + optId + '" role="option" tabindex="-1" aria-selected="false" data-index="' + index + '">';
    html += '<span class="cso-autocomplete-badge" data-cat="' + esc(item.badge) + '">' + esc(item.badge) + '</span>';
    html += '<div class="cso-autocomplete-content">';
    html += '<div class="cso-autocomplete-title">' + csoHighlight(item.title, query) + '</div>';
    if (item.description) {
      html += '<div class="cso-autocomplete-meta">' + csoHighlight(item.description, query) + '</div>';
    }
    html += '</div>';
    html += '<span class="cso-autocomplete-arrow" aria-hidden="true">→</span>';
    html += '</div>';
  });
  html += '</div>';

  setSafeHtml(dropdown, html);
  dropdown.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function onSearchAutocompleteInput() {
  const input = getSearchInput();
  if (!input) return;
  const q = input.value.trim();
  const dropdown = $('#cso-search-autocomplete');
  if (!dropdown) return;

  if (q.length < 2) {
    closeSearchAutocomplete();
    return;
  }

  csoLoadDirectories();

  const localMatches = find(q).map(([title, id, source]) => ({
    title,
    description: source || 'Homepage & Updates',
    badge: 'Home',
    url: '',
    id,
    type: 'home'
  }));

  const dirMatches = csoDirectoryMatches(q).map(item => {
    let cat = 'Directory';
    if (item.url.startsWith('jobs-careers')) cat = 'Jobs';
    else if (item.url.startsWith('schemes-benefits')) cat = 'Schemes';
    else if (item.url.startsWith('study-library')) cat = 'Study';
    else if (item.url.startsWith('community')) cat = 'Community';
    else if (item.url.startsWith('about')) cat = 'About';
    return {
      title: item.title,
      description: item.trail || item.dashboard || item.description || '',
      badge: cat,
      url: item.url,
      id: '',
      type: 'directory'
    };
  });

  const topicMatches = TOPICS
    .filter(([t, dest, desc]) => csoNormalize(t + ' ' + (desc || '')).includes(csoNormalize(q)))
    .map(([title, destination, description]) => ({
      title,
      description: description || 'Trending Topic',
      badge: 'Topic',
      url: destination,
      id: '',
      type: 'topic'
    }));

  const combined = [];
  const seenTitles = new Set();
  [...localMatches, ...dirMatches, ...topicMatches].forEach(item => {
    const key = item.title.toLowerCase().trim();
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      combined.push(item);
    }
  });

  currentSuggestions = combined.slice(0, 7);
  selectedSuggestIndex = -1;
  renderSearchAutocomplete(q, currentSuggestions);
}

function setupGlobalSearch() {
  const input = getSearchInput();
  const form = $('#sf');
  const dropdown = $('#cso-search-autocomplete');
  const kbd = $('#cso-search-kbd');

  if (kbd) {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent || '');
    kbd.replaceChildren();
    const k1 = document.createElement('span'); k1.className = 'cso-kbd-key'; k1.textContent = isMac ? '⌘' : 'Ctrl';
    const kp = document.createElement('span'); kp.className = 'cso-kbd-plus'; kp.textContent = '+';
    const k2 = document.createElement('span'); k2.className = 'cso-kbd-key'; k2.textContent = 'K';
    kbd.append(k1, kp, k2);
  }

  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    const isEditable = active && (
      active.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) ||
      active.getAttribute('role') === 'textbox'
    );
    const searchInp = getSearchInput();
    const dd = $('#cso-search-autocomplete');

    // 1. Ctrl + K or Cmd + K
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (searchInp) {
        searchInp.focus();
        searchInp.select();
      }
      return;
    }

    // 2. / shortcut (only when not in an editable element)
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable) {
      e.preventDefault();
      if (searchInp) {
        searchInp.focus();
        searchInp.select();
      }
      return;
    }

    // 3. Escape key: clear search or dismiss autocomplete dropdowns and return focus
    if (e.key === 'Escape') {
      const isDropdownOpen = dd && !dd.hidden;
      if (isDropdownOpen) {
        e.preventDefault();
        closeSearchAutocomplete();
        if (searchInp) searchInp.focus();
        return;
      }
      if (active === searchInp) {
        e.preventDefault();
        if (searchInp.value) {
          searchInp.value = '';
          closeSearchAutocomplete();
        } else {
          searchInp.blur();
        }
        return;
      }
    }
  });

  if (input) {
    input.addEventListener('input', onSearchAutocompleteInput);

    input.addEventListener('keydown', e => {
      const dd = $('#cso-search-autocomplete');
      if (!dd || dd.hidden) {
        if (e.key === 'ArrowDown' && input.value.trim().length >= 2) {
          onSearchAutocompleteInput();
          e.preventDefault();
        }
        return;
      }

      const items = Array.from(dd.querySelectorAll('.cso-autocomplete-item'));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!items.length) return;
        selectedSuggestIndex = (selectedSuggestIndex + 1) % items.length;
        updateSelectedSuggestItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        if (selectedSuggestIndex <= 0) {
          selectedSuggestIndex = -1;
          updateSelectedSuggestItem(items);
          input.focus();
        } else {
          selectedSuggestIndex = selectedSuggestIndex - 1;
          updateSelectedSuggestItem(items);
        }
      } else if (e.key === 'Enter') {
        if (selectedSuggestIndex >= 0 && currentSuggestions[selectedSuggestIndex]) {
          e.preventDefault();
          activateSuggestItem(currentSuggestions[selectedSuggestIndex]);
          closeSearchAutocomplete();
        } else {
          closeSearchAutocomplete();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSearchAutocomplete();
        input.focus();
      }
    });
  }

  if (dropdown) {
    dropdown.addEventListener('click', e => {
      const fallbackChip = e.target.closest('[data-cso-suggest-term]');
      if (fallbackChip) {
        const term = fallbackChip.dataset.csoSuggestTerm;
        const searchInp = getSearchInput();
        if (searchInp) searchInp.value = term;
        closeSearchAutocomplete();
        runSearch(term);
        return;
      }

      const itemEl = e.target.closest('.cso-autocomplete-item');
      if (itemEl) {
        const idx = parseInt(itemEl.dataset.index, 10);
        if (!isNaN(idx) && currentSuggestions[idx]) {
          activateSuggestItem(currentSuggestions[idx]);
          closeSearchAutocomplete();
        }
      }
    });
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('#sf')) {
      closeSearchAutocomplete();
    }
  });

  if (form) {
    form.onsubmit = e => {
      e.preventDefault();
      closeSearchAutocomplete();
      const searchInp = getSearchInput();
      const val = searchInp ? searchInp.value : '';
      if (window.CSOAskSearch && typeof window.CSOAskSearch.run === 'function') {
        window.CSOAskSearch.run(val);
        return;
      }
      runSearch(val);
    };
  }

  const smic = $('#smic');
  if (smic && form) {
    const hasSpeech = typeof (window.SpeechRecognition || window.webkitSpeechRecognition) === 'function';
    smic.hidden = !hasSpeech;
    if (hasSpeech && !(window.CSOVoiceSearch && smic.dataset.csoVoiceBound === '1')) {
      smic.onclick = () => voice(getSearchInput(), form);
    }
  }

  const bindChip = c => {
    c.onclick = () => {
      const searchInp = getSearchInput();
      const val = (ORIGINAL_TEXT.get(c.firstChild) || c.textContent || '').trim();
      if (searchInp) {
        searchInp.value = val;
        searchInp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      closeSearchAutocomplete();
      if (window.CSOAskSearch && typeof window.CSOAskSearch.run === 'function') {
        window.CSOAskSearch.run(val);
        return;
      }
      runSearch(val);
    };
  };
  $$('.chips .search-chip').forEach(bindChip);
  window.csoHome = Object.assign(window.csoHome || {}, { bindChip });
}

setupGlobalSearch();

const up=document.createElement('button');up.id='top';up.textContent='↑';up.hidden=true;up.setAttribute('aria-label','Back to top');up.onclick=()=>scrollTo({top:0,behavior:'smooth'});document.body.append(up);
addEventListener('scroll',()=>{up.hidden=scrollY<400},{passive:true});
addEventListener('hashchange',route);route();csoLoadPublishedUpdates();if(location.hash==='#search'&&lastQ)csoLoadDirectories().then(()=>{if(location.hash==='#search')route()});localize();
})();

/* CSO signup mobile number v1 */

/* CSO Public Live Broadcast Banner Synchronization */
function initPublicBroadcastBanner() {
  const banner = document.getElementById('cso-broadcast-banner');
  if (!banner) return;

  const tagEl = document.getElementById('broadcast-tag');
  const textEl = document.getElementById('broadcast-text');
  const linkEl = document.getElementById('broadcast-link');
  const closeBtn = document.getElementById('broadcast-close');

  // Source of truth is D1 (/api/content/banner), edited from the admin suite.
  fetch('/api/content/banner', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) renderBannerData(d); })
    .catch(function () {});

  function renderBannerData(data) {
  try {
    const isActive = data && (data.isActive === true || data.active === true);
    const alertText = data && (data.headline || data.text);
    if (!data || !isActive || !alertText) return;

    // Check if dismissed in this session
    const dismissedKey = 'cso_dismissed_announcement_' + (data.id || data.updatedAt || data.publishedAt || data.timestamp || alertText);
    if (sessionStorage.getItem(dismissedKey) || sessionStorage.getItem('cso_dismissed_' + (data.timestamp || alertText))) return;

    const sev = (data.severity || data.type || 'info').toLowerCase();
    let sevColor = '#0fa968';
    let sevTag = 'INFO';
    if (sev === 'notice' || sev === 'warning') {
      sevColor = '#d97706';
      sevTag = 'NOTICE';
    } else if (sev === 'urgent' || sev === 'emergency') {
      sevColor = '#dc2626';
      sevTag = 'URGENT';
    }

    if (tagEl) {
      tagEl.textContent = (data.badge_label || data.tag || sevTag).toUpperCase();
      tagEl.className = 'cso-live-banner__tag';
    }

    if (textEl) {
      let isOrLang = false;
      try { isOrLang = document.documentElement.getAttribute('lang') === 'or' || localStorage.getItem('cso_lang') === 'or'; } catch (_) {}
      textEl.textContent = (isOrLang && data.headline_or) ? data.headline_or : alertText;
    }

    if (linkEl) {
      const targetLink = data.link || data.ctaLink || data.ctaUrl || data.url;
      if (targetLink && typeof targetLink === 'string' && targetLink.trim() !== '' && targetLink !== '#') {
        linkEl.href = targetLink.trim();
        linkEl.textContent = data.ctaText || 'View details →';
        linkEl.hidden = false;
      } else {
        linkEl.hidden = true;
      }
    }

    banner.className = 'cso-live-banner ' + (sev === 'urgent' || sev === 'emergency' ? 'cso-live-banner--urgent' : sev === 'notice' || sev === 'warning' ? 'cso-live-banner--notice' : 'cso-live-banner--info');
    banner.hidden = false;

    if (closeBtn) {
      closeBtn.onclick = () => {
        banner.hidden = true;
        try {
          sessionStorage.setItem(dismissedKey, '1');
        } catch (_) {}
      };
    }
  } catch (err) {
    console.warn('Error rendering broadcast banner', err);
  }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicBroadcastBanner);
} else {
  initPublicBroadcastBanner();
}

/* CSO-IN: Compass normal page navigation v1 */
document.addEventListener('click', function(event) {
  const card = event.target.closest('.cso-compass a.opt');
  if (!card) return;

  const href = card.getAttribute('href');
  if (!href || href === '#') return;

  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.assign(new URL(href, document.baseURI).href);
}, true);

/* v26: reveal the stealth Admin Portal link only when a staff session flag exists (validated once against the server). */
(function csoRevealAdminLink(){
  function apply(){
    var links=document.querySelectorAll('.top .adm.cso-adm-stealth');
    if(!links.length)return;
    var flag=false;
    try{flag=localStorage.getItem('cso_admin_active')==='1'}catch(_){}
    links.forEach(function(a){a.classList.toggle('is-admin-visible',flag)});
    if(!flag||window.__csoAdminChecked)return;
    window.__csoAdminChecked=true;
    fetch('/api/admin/session',{credentials:'same-origin'}).then(function(r){
      if(r.status===401||r.status===403){try{localStorage.removeItem('cso_admin_active')}catch(_){}links.forEach(function(a){a.classList.remove('is-admin-visible')})}
    }).catch(function(){});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  window.addEventListener('storage',function(e){if(e.key==='cso_admin_active')apply()});
})();

/* v292: Ensure footer brand logo is decorative and brand title renders cleanly once */
(function csoDedupeFooterBrand(){
  function clean(){
    document.querySelectorAll('.cso-footer-zone1').forEach(function(z1){
      z1.querySelectorAll('.cso-footer-brand-header').forEach(function(h,idx){if(idx>0)h.remove()});
      z1.querySelectorAll('.cso-footer-title').forEach(function(t,idx){if(idx>0)t.remove()});
      z1.querySelectorAll('.cso-footer-logo').forEach(function(img){
        img.alt='';
        img.setAttribute('aria-hidden','true');
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean);else clean();
})();
