/* CSO independent source links v3 */
(()=>{
/* ================= EDIT YOUR CONTENT HERE ================= */
const CFG={social:{youtube:'#',x:'#',facebook:'#',instagram:'#',telegram:'#'}};
const NAV=[['jobs-careers','Jobs & Careers','💼'],['schemes-benefits','Schemes & Benefits','🏛'],['study-library','Study Library','📖'],['community','Community','👥'],['about','About','ⓘ']];
const MENUS={
 'jobs-careers':[
  'Jobs & Recruitment',
  'Career Explorer',
  'Eligibility & Qualification Explorer',
  'Courses, Entrance Exams & Certifications',
  'Scholarships & Financial Support',
  'International & Overseas Opportunities',
  'Career Development & Employability',
  'Institutions, Official Portals & Verification'
 ],
 'schemes-benefits':[
   'Government & Public Welfare',
   'Education, Employment & Talent',
   'Agriculture, Business & Livelihoods',
   'Health, Housing & Financial Protection',
   'Communities & Special Beneficiaries',
   'Private, Global & Innovation Support',
   'Find Schemes & Check Eligibility',
   'Citizen Services & Verification'
  ],
 'study-library':[
    "Early Childhood & Primary Education",
    "School & Higher Secondary Education",
    "Undergraduate, Postgraduate & Research",
    "Competitive Exams & Teacher Education",
    "Professional, Vocational & Digital Skills",
    "Subjects, Languages & Study Materials",
    "International & Inclusive Education",
    "Life Skills, Culture & Lifelong Learning",
    "Libraries, Educators & Learning Support",
    "Odisha Study Hub & Resource Organisation"
  ],
 'community':[
    "Local & Odisha Communities",
    "Students, Educators & Mentorship",
    "Careers, Business & Professional Networks",
    "Agriculture & Rural Livelihoods",
    "Women, Families, Health & Inclusion",
    "Youth, NGOs & Volunteering",
    "Culture, Sports & Traditional Communities",
    "Environment, Science & Technology",
    "Digital, International & Community Forums",
    "Community Directory, Safety & Governance"
  ],
 'about':[
    "About CSO",
    "Our Approach",
    "Trust & Transparency",
    "Team & Community",
    "Policies & Standards",
    "Contact & FAQs"
  ]};
// cat must match a tab: Jobs, Schemes, Education, Odisha, National. tag: JOB, SCHEME, EDUCATION, ODISHA, GUIDE
let UPDATES=[];
// Page content: 'url-slug':{title:'',html:''}  (slug = lowercase title with dashes)
const CONTENT={};
const I18N={or:{'Home':'ମୁଖ୍ୟ ପୃଷ୍ଠା','Jobs & Careers':'ଚାକିରି ଓ କ୍ୟାରିୟର','Schemes & Benefits':'ଯୋଜନା ଓ ସୁବିଧା','Study Library':'ଅଧ୍ୟୟନ ପୁସ୍ତକାଳୟ','Community':'ସମୁଦାୟ','About':'ଆମ ବିଷୟରେ'},hi:{'Home':'मुख्य पृष्ठ','Jobs & Careers':'नौकरियाँ और करियर','Schemes & Benefits':'योजनाएँ और लाभ','Study Library':'अध्ययन पुस्तकालय','Community':'समुदाय','About':'हमारे बारे में'}}; // e.g. hi:{'Home':'होम'}
/* ========================================================== */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const ls={g:k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RES=/^(settings|sidebar|customize|upgrade|downloads|comment-.*)$/;
const slug=t=>{const s=t.toLowerCase().replace(/&/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return RES.test(s)?s+'-page':s};
const clean=t=>t.replace(/[→⌄⬆]/g,'').replace(/^[^A-Za-z0-9\u0B00-\u0B7F\u0900-\u097F]+/,'').replace(/\s+/g,' ').trim();
const TITLES={};const reg=t=>{const s=slug(t);TITLES[s]=t;return s};
NAV.forEach(([s,t])=>{TITLES[s]=t;MENUS[s].forEach(reg)});
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

const toast=m=>{const t=document.createElement('div');t.className='ts';t.textContent=m;document.body.append(t);localize(t);setTimeout(()=>t.remove(),2600)};
const modal=h=>{const o=document.createElement('div');o.className='ov';o.innerHTML='<div class="md" role="dialog" aria-modal="true"><button class="x" data-x aria-label="Close">✕</button>'+h+'</div>';const k=e=>{if(e.key==='Escape')o.close()};o.close=()=>{o.remove();document.removeEventListener('keydown',k)};document.addEventListener('keydown',k);o.onclick=e=>{if(e.target===o||e.target.closest('[data-x]'))o.close()};document.body.append(o);localize(o);const f=$('input,select',o);if(f)f.focus();return o};
const pop=(a,items)=>{$$('.pp').forEach(x=>x.remove());const m=document.createElement('div');m.className='pp';const r=a.getBoundingClientRect();m.style.top=r.bottom+4+'px';m.style.left=Math.max(8,Math.min(r.left,innerWidth-210))+'px';items.forEach(([l,f,on])=>{const b=document.createElement('button');b.textContent=(on?'✓ ':'')+l;b.onclick=()=>{f();m.remove()};m.append(b)});document.body.append(m);localize(m);setTimeout(()=>addEventListener('click',()=>m.remove(),{once:true}),0)};
const go=s=>{location.hash=s};
let lastQ='';
const getSearchInput=()=>$('#cso-ask-input')||$('#sf input')||$('#sq');
const save=()=>ls.s('cso',S);
const THEMES=['light','dark','system','reading','sepia'];
const THEME_ICONS={light:'☀️',dark:'🌙',system:'💻',reading:'📖',sepia:'☕'};
const dark=()=>{const t=document.documentElement.dataset.theme;return t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme:dark)').matches)};
function apply(){const d=document.documentElement;d.dataset.theme=THEMES.includes(S.theme)?S.theme:'system';d.lang=S.lang;document.body.style.zoom=S.zoom;document.body.classList.toggle('hc',!!S.hc);document.body.classList.toggle('ul',!!S.ul);document.body.classList.toggle('rm',!!S.rm)}
const LN={en:'English',or:'ଓଡ଼ିଆ',hi:'हिन्दी'};
function ctl(){
 $('#ctl').innerHTML='<button class="pill cso-ctl-lang" id="bl" aria-label="Language selector"><span class="cso-lang-icon">🌐</span> <span class="cso-lang-name">'+LN[S.lang]+'</span> ⌄</button><button class="pill cso-ctl-theme" id="bt" aria-label="Change theme" title="Theme: '+(S.theme||'system')+'">'+THEME_ICONS[S.theme||'system']+'</button><button class="pill cso-ctl-a11y" id="ba">♿ Accessibility ⌄</button><span class="pill cso-ctl-zoom"><button class="fz" id="fm" aria-label="Smaller text">A–</button><button class="fz" id="fr" aria-label="Normal text">A</button><button class="fz" id="fp" aria-label="Larger text">A+</button></span>';
 $('#bl').onclick=e=>pop(e.target,Object.keys(LN).map(k=>[LN[k],()=>{S.lang=k;save();apply();ctl();nav();authUI();lu();route();localize();toast('Language: '+LN[k])},S.lang===k]));
 $('#bt').onclick=()=>{const i=THEMES.indexOf(S.theme||'system');S.theme=THEMES[(i+1)%THEMES.length];save();apply();ctl()};
 $('#ba').onclick=e=>pop(e.target,[['High contrast',()=>{S.hc=+!S.hc;save();apply()},S.hc],['Underline links',()=>{S.ul=+!S.ul;save();apply()},S.ul],['Reduce motion',()=>{S.rm=+!S.rm;save();apply()},S.rm],['Reset',()=>{S.hc=S.ul=S.rm=0;S.zoom=1;save();apply()}]]);
 const z=d=>{S.zoom=d?Math.max(.85,Math.min(1.3,+(S.zoom+d).toFixed(2))):1;save();apply()};
 $('#fm').onclick=()=>z(-.05);$('#fr').onclick=()=>z(0);$('#fp').onclick=()=>z(.05);
}
function heroLang(){
 const words={
  en:['Search jobs, schemes, study materials, articles and more...','Popular Searches:'],
  or:['ଚାକିରି, ଯୋଜନା, ଅଧ୍ୟୟନ ସାମଗ୍ରୀ ଓ ଲେଖା ଖୋଜନ୍ତୁ...','ଲୋକପ୍ରିୟ ସନ୍ଧାନ:'],
  hi:['नौकरियाँ, योजनाएँ, अध्ययन सामग्री और लेख खोजें...','लोकप्रिय खोजें:']
 };
 const w=words[S.lang]||words.en;
 const inp=getSearchInput();
 if(inp)inp.placeholder=w[0];
 const cp=$('.chips span');
 if(cp)cp.textContent=w[1];
}
function nav(){
 const w=$('#navw');
 w.innerHTML='<div class="cso-nav-bar-container">'+
 '<button type="button" class="cso-nav-mobile" id="cso-menu-toggle" aria-expanded="false" aria-controls="cso-nav-items" aria-label="Navigation Menu"><span aria-hidden="true">☰</span> Menu</button>'+
 '<div class="cso-mobile-acc-cluster">'+
 '<button type="button" class="pill cso-ctl-a11y-mobile acc-btn" id="ba-mobile" aria-label="Accessibility options">♿ Options</button>'+
 '<span class="pill cso-ctl-zoom-mobile acc-btn">'+
 '<button type="button" class="fz" id="fm-mobile" aria-label="Smaller text">A–</button>'+
 '<button type="button" class="fz" id="fr-mobile" aria-label="Normal text">A</button>'+
 '<button type="button" class="fz" id="fp-mobile" aria-label="Larger text">A+</button>'+
 '</span>'+
 '</div>'+
 '</div>'+
 '<div id="cso-nav-items" class="cso-nav-items">'+
 '<a href="#" data-h="" class="cso-nav-home"><span aria-hidden="true">🏠</span> '+esc(translateText('Home'))+'</a>'+
 NAV.map(([s,t,i])=>
 '<div class="ni">'+
 '<div class="cso-nav-parent">'+
 '<a href="'+s+'/"><span aria-hidden="true">'+i+'</span> '+esc(translateText(t))+'</a>'+
 '<button type="button" class="cso-nav-arrow" aria-label="Toggle '+esc(t)+' menu" aria-haspopup="true" aria-expanded="false" aria-controls="cso-nav-dd-'+s+'">⌄</button>'+
 '</div>'+
 '<div class="dd" id="cso-nav-dd-'+s+'">'+MENUS[s].map((x,index)=>
  '<a href="'+s+'/?section='+index+'"><span class="dd-bullet" aria-hidden="true">›</span><span>'+esc(translateText(x))+'</span></a>'
 ).join('')+'</div>'+
 '</div>'
 ).join('')+'</div>';
 setActive(location.hash.slice(1));
}
function csoCloseNavDropdowns(except){
 $$('#navw .ni').forEach(n=>{
  if(n===except)return;
  n.classList.remove('cso-open');
  const b=n.querySelector('.cso-nav-arrow');
  if(b)b.setAttribute('aria-expanded','false');
 });
}
document.addEventListener('click',e=>{
 const mobile=e.target.closest('#navw .cso-nav-mobile');
 if(mobile){
  const items=$('#cso-nav-items');
  const open=items.classList.toggle('cso-mobile-open');
  mobile.setAttribute('aria-expanded',String(open));
  if(!open)csoCloseNavDropdowns();
  return;
 }
 const arrow=e.target.closest('#navw .cso-nav-arrow');
 if(arrow){
  const parent=arrow.closest('.ni');
  const open=!parent.classList.contains('cso-open');
  csoCloseNavDropdowns(parent);
  parent.classList.toggle('cso-open',open);
  arrow.setAttribute('aria-expanded',String(open));
  return;
 }
 const a11yMobile=e.target.closest('#ba-mobile');
 if(a11yMobile){
  pop(a11yMobile,[['High contrast',()=>{S.hc=+!S.hc;save();apply()},S.hc],['Underline links',()=>{S.ul=+!S.ul;save();apply()},S.ul],['Reduce motion',()=>{S.rm=+!S.rm;save();apply()},S.rm],['Reset',()=>{S.hc=S.ul=S.rm=0;S.zoom=1;save();apply()}]]);
  return;
 }
 const z=d=>{S.zoom=d?Math.max(.85,Math.min(1.3,+(S.zoom+d).toFixed(2))):1;save();apply()};
 if(e.target.closest('#fm-mobile')){z(-.05);return;}
 if(e.target.closest('#fr-mobile')){z(0);return;}
 if(e.target.closest('#fp-mobile')){z(.05);return;}
 const footerLang = e.target.closest('.cso-footer-lang-pill');
 if (footerLang) {
  const l = footerLang.getAttribute('data-cso-lang');
  if (l && LN[l]) {
   S.lang = l;
   save();
   apply();
   ctl();
   nav();
   authUI();
   lu();
   route();
   localize();
   toast('Language: ' + LN[l]);
  }
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
  csoCloseNavDropdowns();
  const items=$('#cso-nav-items');
  if(items)items.classList.remove('cso-mobile-open');
  const toggle=$('#navw .cso-nav-mobile');
  if(toggle)toggle.setAttribute('aria-expanded','false');
 }else if(!e.target.closest('#navw')){
  csoCloseNavDropdowns();
  const items=$('#cso-nav-items');
  if(items&&items.classList.contains('cso-mobile-open')){
   items.classList.remove('cso-mobile-open');
   const toggle=$('#navw .cso-nav-mobile');
   if(toggle)toggle.setAttribute('aria-expanded','false');
  }
 }
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  closeAuthDropdown();
  csoCloseNavDropdowns();
  const items=$('#cso-nav-items');
  if(items&&items.classList.contains('cso-mobile-open')){
   items.classList.remove('cso-mobile-open');
   const toggle=$('#navw .cso-nav-mobile');
   if(toggle){
    toggle.setAttribute('aria-expanded','false');
    toggle.focus();
   }
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
 if(items&&items.classList.contains('cso-mobile-open')&&e.relatedTarget&&!navw.contains(e.relatedTarget)){
  items.classList.remove('cso-mobile-open');
  const toggle=navw.querySelector('.cso-nav-mobile');
  if(toggle)toggle.setAttribute('aria-expanded','false');
  csoCloseNavDropdowns();
 }
});
window.addEventListener('resize', () => {
 if (window.innerWidth > 768) {
  csoCloseNavDropdowns();
  const items = document.getElementById('cso-nav-items');
  if (items && items.classList.contains('cso-mobile-open')) {
   items.classList.remove('cso-mobile-open');
   const toggle = document.querySelector('#navw .cso-nav-mobile');
   if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
 }
});
/* CSO navigation upgrade v1 */
function setActive(h){
  $$('#navw a').forEach(a=>{
    a.classList.remove('on');
    a.removeAttribute('aria-current');
  });

  const p=!h
    ?$('#navw .cso-nav-home')
    :$$('#navw .ni')
      .map(n=>$('[data-m]',n))
      .filter(Boolean)
      .find(a=>{
        const menu=a.dataset.m;
        return menu===h||
          (Array.isArray(MENUS[menu])&&
            MENUS[menu].some(x=>slug(x)===h));
      });

  if(p){
    p.classList.add('on');
    p.setAttribute('aria-current', 'page');
  }
}

/* CSO Unified Authentication Integration v1 */

let csoAuthUser = null;

function authUI() {
  const root = $('#auth');
  if (!root) return;

  root.replaceChildren();

  if (csoAuthUser) {
    const label = document.createElement('span');
    label.className = 'mut';
    label.textContent = csoAuthUser.fullName || csoAuthUser.email;
    label.style.marginRight = '10px';

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'btn';
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

    const dashboardButton = document.createElement('button');
    dashboardButton.type = 'button';
    dashboardButton.className = 'btn p';
    dashboardButton.textContent = 'My Dashboard';
    dashboardButton.setAttribute(
      'aria-label',
      'Open your student dashboard'
    );

    dashboardButton.onclick = () => {
      go('student-dashboard');
    };

    label.remove();
    dashboardButton.classList.add('cso-dashboard-button');
    logoutButton.classList.add('cso-logout-button');

    root.append(dashboardButton, logoutButton);
    return;
  }

  root.innerHTML =
    '<div class="cso-desktop-auth-buttons">' +
      '<button class="btn cso-login-button" id="li" type="button">Login</button>' +
      '<button class="btn p" id="su" type="button">Sign Up</button>' +
    '</div>' +
    '<div class="cso-mobile-auth-wrapper">' +
      '<button type="button" class="cso-auth-trigger" id="cso-auth-trigger" aria-haspopup="true" aria-expanded="false" aria-label="Account options">' +
        '<span class="auth-icon" aria-hidden="true">👤</span>' +
        '<span class="auth-label">Account</span>' +
        '<span class="auth-arrow" aria-hidden="true">▾</span>' +
      '</button>' +
      '<div class="cso-auth-dropdown-menu" id="cso-auth-menu" hidden>' +
        '<a href="#login" class="cso-auth-item" id="cso-m-li">Login</a>' +
        '<a href="#signup" class="cso-auth-item" id="cso-m-su">Sign Up</a>' +
      '</div>' +
    '</div>';

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


function forgotPasswordForm() {
  const m = modal(
    '<div class="cso-auth">' +
    '<div class="cso-auth-icon">🔐</div>' +
    '<h3>Forgot your password?</h3>' +
    '<p class="mut">Enter your registered email address to receive reset instructions.</p>' +
    '<form novalidate>' +
    '<label>Email address<input name="email" type="email" autocomplete="email" required maxlength="254"></label>' +
    '<div class="err" role="alert" aria-live="polite"></div>' +
    '<button type="submit" class="btn p cso-auth-submit">Send reset instructions</button>' +
    '</form>' +
    '<p class="cso-auth-switch"><button type="button" class="cso-auth-link" data-back>Back to login</button></p>' +
    '<p class="cso-auth-note">Reset links expire after 15 minutes.</p>' +
    '</div>'
  );

  const form = $('form', m);
  const feedback = $('.err', m);
  const submit = $('button[type="submit"]', m);

  $('[data-back]', m).onclick = () => {
    m.close();
    authForm('login');
  };

  form.onsubmit = async event => {
    event.preventDefault();

    const email = $('[name="email"]', form).value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      feedback.textContent = 'Enter a valid email address.';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending...';
    feedback.textContent = '';

    try {
      const result = await window.CSOAuth.requestPasswordReset({ email });

      if (result.ok) {
        form.hidden = true;
        feedback.textContent =
          'If an eligible account exists, password-reset instructions will be sent to its email address.';
      } else {
        feedback.textContent =
          result.error || 'Unable to process your request. Please try again later.';
      }
    } catch {
      feedback.textContent =
        'Unable to connect to the account service. Please try again later.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send reset instructions';
    }
  };
}

function authForm(mode) {
  const isSignup = mode === 'signup';
  const title = isSignup ? 'Create your account' : 'Welcome back';

  const fields = isSignup
    ? '<label>Full Name<input name="name" type="text" autocomplete="name" autocapitalize="words" required></label>' +
      '<label>Date of birth<div class="cso-dob-fields">' +
      '<select name="dobDay" aria-label="Day" required><option value="">Day</option>' +
      Array.from({ length: 31 }, (_, i) => '<option value="' + String(i + 1).padStart(2, '0') + '">' + (i + 1) + '</option>').join('') +
      '</select>' +
      '<select name="dobMonth" aria-label="Month" required><option value="">Month</option>' +
      ['January','February','March','April','May','June','July','August','September','October','November','December'].map((name, i) => '<option value="' + String(i + 1).padStart(2, '0') + '">' + name + '</option>').join('') +
      '</select>' +
      '<select name="dobYear" aria-label="Year" required><option value="">Year</option>' +
      Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i).map(year => '<option value="' + year + '">' + year + '</option>').join('') +
      '</select></div>' +
      '</label><input name="dob" type="hidden">' +
      '<label>Mobile number<div class="cso-phone"><span>🇮🇳 +91</span><input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" pattern="[6-9][0-9]{9}" placeholder="Enter 10-digit mobile number" required></div></label>' +
      '<label>State<select name="state" required><option value="">Select state</option>' +
      Object.keys(window.CSO_INDIA_DISTRICTS || {}).sort((a, b) => a.localeCompare(b)).map(x => '<option value="' + x + '">' + x + '</option>').join('') +
      '</select></label>' +
      '<label>District<select name="district" required disabled><option value="">Select state first</option></select></label>'
    : '';

  const m = modal(
    '<div class="cso-auth">' +
    '<div class="cso-auth-icon">👤</div>' +
    '<h3>' + title + '</h3>' +
    '<p class="mut">Common Sense Odisha</p>' +
    '<form novalidate>' +
    fields +
    '<label>Email address<input name="email" type="email" autocomplete="email" required></label>' +
    '<label>Password<div class="cso-pw"><input name="pw" type="password" autocomplete="' +
    (isSignup ? 'new-password' : 'current-password') +
    '" required minlength="' + (isSignup ? '8' : '1') +
    '"><button type="button" class="cso-show" aria-label="Show password">Show</button></div></label>' +
    (isSignup
      ? '<label>Confirm password<div class="cso-pw"><input name="confirm" type="password" autocomplete="new-password" required><button type="button" class="cso-show" aria-label="Show password">Show</button></div></label>'
      : '<button type="button" class="cso-auth-link cso-forgot">Forgot password?</button>') +
    '<div class="err" role="alert" aria-live="polite"></div>' +
    '<button type="submit" class="btn p cso-auth-submit">' +
    (isSignup ? 'Sign Up' : 'Login') +
    '</button>' +
    '</form>' +
    '<p class="cso-auth-switch">' +
    (isSignup ? 'Already have an account? ' : 'New to Common Sense Odisha? ') +
    '<button type="button" class="cso-auth-link cso-switch">' +
    (isSignup ? 'Login' : 'Sign Up') +
    '</button></p>' +
    '<p class="cso-auth-note">' +
    (isSignup
      ? 'Email verification is required before account activation.'
      : 'Sign in to your CSO account.') +
    '</p></div>'
  );

  if (isSignup) {
    $('.md', m).classList.add('cso-signup-modal');

    const state = $('[name="state"]', m);
    const district = $('[name="district"]', m);
    const dobDay = $('[name="dobDay"]', m);
    const dobMonth = $('[name="dobMonth"]', m);
    const dobYear = $('[name="dobYear"]', m);
    const dob = $('[name="dob"]', m);

    const updateDob = () => {
      const day = Number(dobDay.value);
      const month = Number(dobMonth.value);
      const year = Number(dobYear.value);

      if (!day || !month || !year) {
        dob.value = '';
        return;
      }

      const date = new Date(Date.UTC(year, month - 1, day));

      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        dob.value = '';
        return;
      }

      dob.value =
        String(year) + '-' +
        String(month).padStart(2, '0') + '-' +
        String(day).padStart(2, '0');
    };

    [dobDay, dobMonth, dobYear].forEach(select => {
      select.addEventListener('change', updateDob);
    });

    state.onchange = () => {
      const districts =
        window.CSO_INDIA_DISTRICTS?.[state.value] || [];

      district.innerHTML =
        '<option value="">' +
        (districts.length ? 'Select district' : 'District list coming soon') +
        '</option>' +
        districts.map(x => '<option value="' + x + '">' + x + '</option>').join('');

      district.disabled = !districts.length;
    };
  }

  $$('.cso-show', m).forEach(button => {
    button.onclick = () => {
      const input = $('input', button.parentElement);
      const visible = input.type === 'text';

      input.type = visible ? 'password' : 'text';
      button.textContent = visible ? 'Show' : 'Hide';
      button.setAttribute(
        'aria-label',
        visible ? 'Show password' : 'Hide password'
      );
    };
  });

  $('.cso-switch', m).onclick = () => {
    m.close();
    authForm(isSignup ? 'login' : 'signup');
  };

  if (!isSignup) {
    $('.cso-forgot', m).onclick = () => {
      m.close();
      forgotPasswordForm();
    };
  }

  const form = $('form', m);
  const errorBox = $('.err', m);
  const submit = $('.cso-auth-submit', m);
  const originalLabel = submit.textContent;

  form.onsubmit = async event => {
    event.preventDefault();

    const v = Object.fromEntries(new FormData(form));
    let error = '';

    if (isSignup && !(v.name || '').trim())
      error = 'Please enter your full name.';
    else if (isSignup && (!v.dob || v.dob > dobToday()))
      error = 'Please enter a valid date of birth.';
    else if (isSignup && !/^[6-9][0-9]{9}$/.test(v.phone || ''))
      error = 'Enter a valid 10-digit Indian mobile number.';
    else if (isSignup && !v.state)
      error = 'Please select your state.';
    else if (isSignup && !v.district)
      error = 'Please select your district.';
    else if (!okMail(v.email))
      error = 'Please enter a valid email address.';
    else if (isSignup && (v.pw || '').length < 8)
      error = 'Password must contain at least 8 characters.';
    else if (isSignup && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]*[@#][A-Za-z0-9]*$/.test(v.pw || ''))
      error = 'Use letters, numbers and exactly one @ or #.';
    else if (!isSignup && !(v.pw || ''))
      error = 'Please enter your password.';
    else if (isSignup && v.pw !== v.confirm)
      error = 'Passwords do not match.';

    if (error) {
      errorBox.textContent = error;
      return;
    }

    errorBox.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Please wait...';

    try {
      if (isSignup) {
        // Vault check for duplicates first
        let vault = [];
        try {
          const rawVault = localStorage.getItem('cso_registered_accounts_v1');
          if (rawVault) vault = JSON.parse(rawVault) || [];
        } catch (e) {}

        const normalizedEmail = (v.email || '').trim().toLowerCase();
        const cleanMobile = (v.phone || '').trim().replace(/\D/g, '');

        if (vault.some(acc => (acc.email || '').toLowerCase() === normalizedEmail)) {
          errorBox.textContent = 'An account with email "' + normalizedEmail + '" is already registered. Please login.';
          submit.disabled = false;
          submit.textContent = originalLabel;
          return;
        }

        if (cleanMobile && vault.some(acc => (acc.mobile || '').replace(/\D/g, '') === cleanMobile)) {
          errorBox.textContent = 'An account with mobile number "' + (v.phone || '').trim() + '" is already registered. Please login.';
          submit.disabled = false;
          submit.textContent = originalLabel;
          return;
        }

        let result;
        try {
          result = await window.CSOAuth.register({
            email: v.email.trim(),
            fullName: v.name.trim(),
            password: v.pw,
            phone: v.phone,
            dateOfBirth: v.dob,
            state: v.state,
            district: v.district
          });
        } catch (e) {
          result = { ok: false, error: 'Account service request failed.' };
        }

        if (!result || !result.ok) {
          errorBox.textContent = result?.error || 'Registration failed. Please check your details.';
          submit.disabled = false;
          submit.textContent = originalLabel;
          return;
        }

        if (result.ok || result.code === 'DELIVERY_FAILED') {
          const auth = $('.cso-auth', m);
          const note = $('.cso-auth-note', m);
          note.textContent = result.message ||
            (result.code === 'DELIVERY_FAILED'
              ? 'Your account is pending. Request a new verification code below.'
              : 'Enter the six-digit code sent to your email, or use the verification link in that email.');
          form.hidden = true;
          errorBox.textContent = '';

          const panel = document.createElement('section');
          panel.className = 'cso-otp-panel';
          const heading = document.createElement('h4');
          heading.textContent = 'Verify your email';
          const description = document.createElement('p');
          description.textContent = 'Enter the six-digit code sent to ' +
            (result.email || v.email.trim()) +
            '. You can also use the verification link in the same email.';
          const otpInput = document.createElement('input');
          otpInput.type = 'text';
          otpInput.inputMode = 'numeric';
          otpInput.autocomplete = 'one-time-code';
          otpInput.maxLength = 6;
          otpInput.pattern = '[0-9]{6}';
          otpInput.placeholder = '6-digit email code';
          otpInput.setAttribute('aria-label', 'Six-digit email verification code');
          const verifyButton = document.createElement('button');
          verifyButton.type = 'button';
          verifyButton.className = 'btn p cso-otp-verify';
          verifyButton.textContent = 'Verify email';
          const resendButton = document.createElement('button');
          resendButton.type = 'button';
          resendButton.className = 'cso-auth-link cso-otp-resend';
          resendButton.textContent = 'Resend code';
          const feedback = document.createElement('p');
          feedback.className = 'cso-otp-feedback';
          feedback.setAttribute('role', 'status');
          feedback.setAttribute('aria-live', 'polite');
          panel.append(heading, description, otpInput, verifyButton, resendButton, feedback);
          auth.insertBefore(panel, note);

          verifyButton.onclick = async () => {
            const code = otpInput.value.trim();
            if (!/^[0-9]{6}$/.test(code)) {
              feedback.textContent = 'Enter the six-digit code from your email.';
              return;
            }
            verifyButton.disabled = true;
            feedback.textContent = 'Verifying...';
            try {
              const verified = await window.CSOAuth.verifyOtp({
                email: result.email || v.email.trim(),
                otp: code
              });
              if (verified.ok) {
                feedback.textContent = 'Account activated. Preparing your dashboard...';

                // Fast path: the verification response carries the verified
                // user and session token directly — no round-trip needed.
                const verifiedUser = verified.user || verified.candidate;
                let session = null;

                if (verifiedUser && verifiedUser.id) {
                  session = { ok: true, authenticated: true, user: verifiedUser };
                  try {
                    const sessionPayload = {
                      id: verifiedUser.id,
                      fullName: verifiedUser.name || verifiedUser.fullName || '',
                      name: verifiedUser.name || verifiedUser.fullName || '',
                      email: verifiedUser.email,
                      phone: verifiedUser.phone || '',
                      district: verifiedUser.district || '',
                      role: verifiedUser.role || 'candidate',
                      isAuthenticated: true
                    };
                    localStorage.setItem('cso_candidate_session_v1', JSON.stringify(sessionPayload));
                    localStorage.setItem('cso_candidate_profile', JSON.stringify(sessionPayload));
                    if (verified.sessionToken || verified.token) {
                      localStorage.setItem('cso_auth_token', verified.sessionToken || verified.token);
                    }
                  } catch (storeErr) { /* non-fatal */ }
                } else {
                  // Fallback: introspect the session cookie via /api/auth/me
                  session = await window.CSOAuth.getCurrentUser();
                }

                if (!session || !session.ok || !session.authenticated || !session.user) {
                  feedback.textContent =
                    'Your account is activated, but your session could not be restored. Please log in.';
                  return;
                }

                csoAuthUser = session.user;
                authUI();
                m.close();
                go('student-dashboard');

                toast(
                  'Account activated. Welcome to Common Sense Odisha!'
                );
                return;
              } else {
                feedback.textContent = verified.error || 'The code could not be verified.';
              }
            } catch {
              feedback.textContent = 'Unable to connect to the account service.';
            } finally {
              verifyButton.disabled = false;
            }
          };

          resendButton.onclick = async () => {
            resendButton.disabled = true;
            feedback.textContent = 'Requesting a new code...';
            try {
              const resent = await window.CSOAuth.resendOtp({
                email: result.email || v.email.trim()
              });
              feedback.textContent = resent.ok
                ? (resent.message || 'A new code has been sent.')
                : (resent.error || 'Unable to resend the code.');
            } catch {
              feedback.textContent = 'Unable to connect to the account service.';
            } finally {
              resendButton.disabled = false;
            }
          };

          return;
        }

        errorBox.textContent =
          result.error || 'Registration could not be completed.';

        return;
      }

      let loginResult;
      try {
        loginResult = await window.CSOAuth.login({
          email: v.email.trim(),
          password: v.pw
        });
      } catch (loginErr) {
        loginResult = { ok: false, error: 'Account service request failed.' };
      }

      if (!loginResult || !loginResult.ok) {
        errorBox.textContent = loginResult?.error || 'Invalid email or password';
        submit.disabled = false;
        submit.textContent = originalLabel;
        return;
      }

      const candidateData = loginResult.candidate || {
        email: v.email.trim().toLowerCase()
      };

      const candidateName = candidateData.fullName || candidateData.email.split('@')[0];
      const sessionPayload = {
        fullName: candidateName,
        name: candidateName,
        email: candidateData.email,
        district: candidateData.district || 'Khordha (Bhubaneswar)',
        isAuthenticated: true,
        sessionType: 'server_verified',
        lastLoginAt: new Date().toISOString()
      };

      localStorage.setItem('cso_candidate_session_v1', JSON.stringify(sessionPayload));

      if (window.CSOCandidateAuth && typeof window.CSOCandidateAuth.updateHeader === 'function') {
        window.CSOCandidateAuth.updateHeader();
      }

      csoAuthUser = {
        fullName: candidateName,
        email: candidateData.email,
        district: sessionPayload.district
      };

      m.close();
      authUI();
      go('student-dashboard');
      toast('Welcome back, ' + candidateName);
      window.location.href = '/student-dashboard/';
      return;

      const session = await window.CSOAuth.getCurrentUser();

      if (!session.ok || !session.authenticated || !session.user) {
        errorBox.textContent =
          'Unable to restore your account session. Please try again.';
        return;
      }

      csoAuthUser = session.user;
      m.close();
      authUI();
      go('student-dashboard');
      toast('Welcome back, ' + (session.user.fullName || 'User'));

    } catch {
      errorBox.textContent =
        'Unable to connect to the account service.';
    } finally {
      submit.disabled = false;
      submit.textContent = originalLabel;
    }
  };
}

function dobToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function login() {
  authForm('login');
}

function signup() {
  authForm('signup');
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

function csoLoadDirectories(){
  if(CSO_DIRECTORY_PROMISE)return CSO_DIRECTORY_PROMISE;

  CSO_DIRECTORY_PROMISE=Promise.allSettled(
    CSO_DIRECTORIES.map(async ([slug,label])=>{
      const response=await fetch(slug+'/generated/directory.json',{cache:'no-store'});
      if(!response.ok)throw Error(slug+': HTTP '+response.status);
      const data=await response.json();
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
      'aria-live="polite" aria-busy="true" '+
      'style="display:flex;align-items:center;gap:10px;'+
      'padding:12px 0">'+
      '<span class="cso-search-spinner" aria-hidden="true" '+
      'style="display:inline-block;width:18px;height:18px;'+
      'border:3px solid #cbd5e1;border-top-color:#1767a1;'+
      'border-radius:50%;animation:cso-search-spin 0.8s linear infinite">'+
      '</span>'+
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
    'role="group" aria-label="Filter search results" '+
    'style="display:flex;flex-wrap:wrap;gap:8px;margin:18px 0">';

  filters.forEach(([key,label])=>{
    const active=key===selected;

    html+='<button type="button" '+
      'class="cso-search-filter" '+
      'data-cso-filter="'+esc(key)+'" '+
      'aria-pressed="'+active+'" '+
      'style="padding:11px 13px;min-height:44px;border-radius:22px;'+
      'border:1px solid #9ca3af;cursor:pointer;'+
      (active?
        'background:#174b75;color:white;':
        'background:transparent;color:inherit;')+
      '">'+esc(label)+' ('+(counts[key]||0)+')'+
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
    html+='<nav aria-label="Search result pages" '+
      'style="display:flex;align-items:center;'+
      'justify-content:center;gap:12px;'+
      'flex-wrap:wrap;margin:24px 0">';

    html+='<button type="button" '+
      'data-cso-page="previous" '+
      (CSO_SEARCH_PAGE===1?'disabled ':'')+
      'style="padding:10px 16px;cursor:pointer">'+
      '← Previous</button>';

    html+='<span>Page '+CSO_SEARCH_PAGE+
      ' of '+pages+'</span>';

    html+='<button type="button" '+
      'data-cso-page="next" '+
      (CSO_SEARCH_PAGE===pages?'disabled ':'')+
      'style="padding:10px 16px;cursor:pointer">'+
      'Next →</button>';

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
      const colors=TG[u.tag]||TG.JOB;

      html+='<article class="cso-update-result">'+
        '<a class="cso-all-update-card" href="#'+esc(u.id)+'" '+
        'data-h="'+esc(u.id)+'">'+
        '<span class="tg" style="border-color:'+colors[0]+
        ';background:'+colors[1]+'">'+esc(u.tag)+'</span>'+
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
    ['📚', 'Study Library', 'Notes, PDFs and learning resources', 'study-library/'],
    ['💼', 'Jobs & Careers', 'Explore recruitment and career opportunities', 'jobs-careers/'],
    ['🎓', 'Exams & Preparation', 'Explore examinations and preparation resources', 'study/examinations/'],
    ['🤲', 'Schemes & Benefits', 'Discover scholarships and government benefits', 'schemes-benefits/'],
    ['🧭', 'Career Guidance', 'Explore career pathways and guidance', 'career-guidance/'],
    ['👥', 'CSO Community', 'Connect with learners across Odisha', 'community/']
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
        ?'<p><a class="btn p" style="display:inline-block" target="_blank" rel="noopener noreferrer" href="'+esc(U.url)+'">Visit source website</a></p>'
        :'<p class="mut">A supporting source link has not yet been provided.</p>');
  }
  else if(window.CSO_TOOLS_V2 && window.CSO_TOOLS_V2.render(h)){const tool=window.CSO_TOOLS_V2.render(h);t=tool.title;b=tool.html;}
 else if(h==='age-calculator'){t='Age Calculator';b='<form class="fm" id="acf"><label>Date of birth<input type="date" id="dob" required></label><label>Age as on<input type="date" id="aon"></label><button class="btn p">Calculate</button></form><p id="aor" style="font-weight:600;margin-top:12px"></p>'}
 else{t=(C&&C.title)||TITLES[h]||h.replace(/-/g,' ');b=(C?C.html:'')+(MENUS[h]?list(MENUS[h].map(x=>[x,slug(x),''])):'');if(!C&&!MENUS[h])b='<p class="mut">Content for this page will be added soon.</p>'}
 return'<div class="card sec"><p class="crumb"><a data-h="">Home</a> › '+esc(t)+'</p><h1 style="margin:6px 0 12px;font-size:26px">'+esc(t)+'</h1>'+b+'<p><a class="btn" style="display:inline-block" data-h="">← Back to Home</a></p></div>'}
function after(h){if(window.CSO_TOOLS_V2&&window.CSO_TOOLS_V2.render(h)){window.CSO_TOOLS_V2.init(h);return;}if(h!=='age-calculator')return;const d=new Date();$('#aon').value=d.toISOString().slice(0,10);$('#acf').onsubmit=e=>{e.preventDefault();const a=new Date($('#dob').value),b=new Date($('#aon').value),r=$('#aor');if(isNaN(a)||isNaN(b))return r.textContent=T('Please enter both dates.');if(a>b)return r.textContent=T('Birth date must be before the "as on" date.');let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),dd=b.getDate()-a.getDate();if(dd<0){m--;dd+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(m<0){y--;m+=12}r.textContent=T('Age:')+' '+y+' '+T('years')+', '+m+' '+T('months')+', '+dd+' '+T('days')}}

/* Load published updates, retaining bundled records as fallback. */
function csoLoadPublishedUpdates(){
  return fetch('data/latest-updates.json',{cache:'no-store'})
    .then(response=>{
      if(!response.ok)throw Error('Updates HTTP '+response.status);
      return response.json();
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
    v.innerHTML=view(h);
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
    v.innerHTML='<div class="card sec">Checking your secure student session...</div>';

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

  if(!h){mn.hidden=false;v.hidden=true}else{mn.hidden=true;v.hidden=false;v.innerHTML=view(h);after(h);if(h==='search'){v.onclick=csoHandleSearchClick;v.onkeydown=csoHandleSearchKeydown;}
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
    'target="_blank" rel="noopener noreferrer" '+
    'onclick="event.stopPropagation()">'+
    '↗ Official Source</a>';
}

function lu(){
  $$('.lu .it,.lu .em').forEach(x=>x.remove());
  const L=csoPublishedUpdates().filter(u=>cat==='All'||u.cat===cat).slice(0,5);
  const html=L.map(u=>{
    const c=TG[u.tag]||TG.JOB;
    return '<div class="it cso-update-row">'+
      '<span class="tg" style="border-color:'+c[0]+';background:'+c[1]+'">'+esc(u.tag)+'</span>'+
      '<span class="cso-update-main"><a href="#'+esc(u.id)+'" data-h="'+esc(u.id)+'"><strong>'+esc(u.title)+'</strong></a>'+
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
    panel.insertAdjacentHTML(
      'beforeend',
      '<p class="em mut" role="status">No updates in this category yet.</p>'
    );
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
  original.innerHTML=html;

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
 const d=e.target.closest('[data-h]');if(d){e.preventDefault();if(d.dataset.h.endsWith('/')){location.href=d.dataset.h}else{go(d.dataset.h)}return}
 const m=e.target.closest('[data-m]');if(m){go(m.dataset.m);return}
 const a=e.target.closest('a[href="#"]');if(!a||a.classList.contains('opt'))return;e.preventDefault();
 const s=a.dataset.route||slug(clean(a.textContent)),M={'view-all':'latest-updates','view-all-topics':'popular-topics','view-all-tools':'important-tools','learn-more':'trust-layer','join-now':'community','browse-library':'study-library','home':''};
 if(s==='get-started')return compass();if(a.classList.contains('adm'))return admin();
 if(s==='community'||s==='join-now'){location.href='community/';return}
 if(s==='about'){location.href='about/';return}
 if(s==='browse-library'){location.href='study-library/';return}
 go(s in M?M[s]:s)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'){const d=e.target.closest('.it[data-h], .card.rs[data-h]');if(d)go(d.dataset.h)}});
function compass(){const m=modal('<h3>CSO Opportunity Compass</h3><p class="mut">What are you looking for?</p><div class="lst" style="grid-template-columns:1fr">'+[['job-opportunity-finder/','💼 I want a Job'],['study/','🎓 I want to Study'],['schemes-benefits/','🤲 I want a Scheme'],['career-guidance/','🧭 I want Career Guidance']].map(([s,t])=>'<a class="card rs" data-h="'+s+'">'+t+'</a>').join('')+'</div>');m.addEventListener('click',e=>{if(e.target.closest('[data-h]'))m.close()})}
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
const home=$('main');home.id='home';home.insertAdjacentHTML('afterend','<main id="view" class="w" hidden></main>');
apply();nav();ctl();authUI();csoRestoreAuthSession();
$('.top>div').dataset.h='';
const bind=(el,title)=>{const s=reg(title);el.tabIndex=0;el.setAttribute('role','link');el.addEventListener('click',e=>{e.preventDefault();go(s)});el.addEventListener('keydown',e=>{if(e.key==='Enter')go(s)})};
$$('a[href="#"]').forEach(a=>{a.dataset.route=slug(clean(a.textContent))});
$$('.opt').forEach(c=>bind(c,clean($('b',c).textContent)));
/* CSO-IN Trending Topics directory links v1 */
const CSO_TRENDING_DESTINATIONS = [
  'jobs-careers/?section=0',
  'study-library/?section=3&path=1',
  'schemes-benefits/?section=1&path=0.1',
  'study-library/?section=5&path=1',
  'jobs-careers/?section=6&path=0',
  'schemes-benefits/?section=0&path=2'
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
$$('.lu .tabs button').forEach(s=>{
  s.dataset.category=s.textContent.trim();
  s.onclick=()=>{
    $$('.lu .tabs button').forEach(x=>{
      const active=x===s;
      x.classList.toggle('a',active);
      x.setAttribute('aria-pressed',String(active));
    });
    cat=s.dataset.category;
    lu();
    localize($('.lu'));
  };
});
lu();
let selectedSuggestIndex = -1;
let currentSuggestions = [];

function closeSearchAutocomplete() {
  const dropdown = $('#cso-search-autocomplete');
  const input = getSearchInput();
  if (dropdown) {
    dropdown.hidden = true;
    dropdown.innerHTML = '';
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

    dropdown.innerHTML = emptyHtml;
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

  dropdown.innerHTML = html;
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
    kbd.innerHTML = isMac
      ? '<span class="cso-kbd-key">⌘</span><span class="cso-kbd-plus">+</span><span class="cso-kbd-key">K</span>'
      : '<span class="cso-kbd-key">Ctrl</span><span class="cso-kbd-plus">+</span><span class="cso-kbd-key">K</span>';
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
      runSearch(searchInp ? searchInp.value : '');
    };
  }

  const smic = $('#smic');
  if (smic && form) {
    smic.onclick = () => voice(getSearchInput(), form);
  }

  $$('.chips .search-chip').forEach(c => {
    c.onclick = () => {
      const searchInp = getSearchInput();
      const val = ORIGINAL_TEXT.get(c.firstChild) || c.textContent;
      if (searchInp) searchInp.value = val;
      closeSearchAutocomplete();
      runSearch(val);
    };
  });
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

  try {
    const raw = localStorage.getItem('cso_active_announcement');
    if (!raw) return;

    const data = JSON.parse(raw);
    const isActive = data && (data.isActive === true || data.active === true);
    const alertText = data && (data.headline || data.text);
    if (!data || !isActive || !alertText) return;

    // Check if dismissed in this session
    const dismissedKey = 'cso_dismissed_announcement_' + (data.id || data.publishedAt || data.timestamp || alertText);
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
      tagEl.textContent = (data.tag || sevTag).toUpperCase();
      tagEl.style.background = sevColor;
      tagEl.style.color = '#ffffff';
    }

    if (textEl) {
      textEl.textContent = alertText;
    }

    if (linkEl) {
      const targetLink = data.link || data.ctaLink || data.url;
      if (targetLink && typeof targetLink === 'string' && targetLink.trim() !== '' && targetLink !== '#') {
        linkEl.href = targetLink.trim();
        linkEl.textContent = data.ctaText || 'View details →';
        linkEl.style.display = 'inline';
      } else {
        linkEl.style.display = 'none';
      }
    }

    banner.style.borderBottom = '3px solid ' + sevColor;
    banner.style.display = 'flex';

    if (closeBtn) {
      closeBtn.onclick = () => {
        banner.style.display = 'none';
        try {
          sessionStorage.setItem(dismissedKey, '1');
        } catch (_) {}
      };
    }
  } catch (err) {
    console.warn('Error rendering broadcast banner', err);
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
