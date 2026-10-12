/* Nur den Supabase Publishable Key verwenden. Niemals service_role/Secret Keys hier eintragen. */
window.TANKSTELLENERTRAG_SUPABASE = {
  url: 'https://irzlbdybtrbztjjkrlad.supabase.co',
  publishableKey: 'sb_publishable_IcdCc5Wd-coYOLyHl_XBuQ_4FcEyv-1'
};

/* TankstellenErtrag Profil-Avatar: kleines Konto-Icon, Standard-Zapfhahn und frei wählbare Charaktere. */
document.addEventListener('DOMContentLoaded', async () => {
  const nav = document.querySelector('header nav');
  const login = document.getElementById('navLogin');
  if (!nav || !login || !window.supabase || !window.TANKSTELLENERTRAG_SUPABASE) return;

  const avatarClient = window.TANKSTELLENERTRAG_CLIENT;
  if (!avatarClient) return;

  const wrap = document.createElement('div');
  wrap.className = 'te-profile';
  wrap.innerHTML = `
    <button class="te-profile-btn" id="teProfileBtn" aria-label="Benutzerkonto" title="Benutzerkonto">
      <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0"/></svg>
    </button>
    <div class="te-profile-menu hidden" id="teProfileMenu">
      <div class="te-profile-title">Benutzerkonto</div>
      <div id="teGuest">
        <div class="te-empty-avatar"><svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0"/></svg></div>
        <div class="te-muted">Noch nicht angemeldet</div>
        <button class="te-action" id="teLogin">Anmelden</button>
      </div>
      <div id="teUser" class="hidden">
        <div class="te-user-head"><div class="te-avatar" id="teAvatar"></div><div><b id="teName">Konto</b><small id="teEmail"></small></div></div>
        <button class="te-action" id="teChoose">Profilbild ändern</button>
        <button class="te-action te-muted-btn" id="teLogout">Abmelden</button>
      </div>
      <div id="tePicker" class="te-picker hidden">
        <div class="te-profile-title">Dein Profilbild</div>
        <div class="te-picker-grid">
          <button data-avatar="faucet" title="Zapfhahn"><span class="av faucet">⛽</span><small>Zapfhahn</small></button>
          <button data-avatar="route66" title="Route 66"><span class="av route">🛣</span><small>Route 66</small></button>
          <button data-avatar="oldtimer" title="Oldtimer"><span class="av old">🚘</span><small>Oldtimer</small></button>
          <button data-avatar="business" title="Geschäftsmann"><span class="av business">👔</span><small>Geschäftsmann</small></button>
          <button data-avatar="mechanic" title="Mechaniker"><span class="av mechanic">🔧</span><small>Mechaniker</small></button>
          <button data-avatar="roadtrip" title="Roadtrip"><span class="av road">🚗</span><small>Roadtrip</small></button>
        </div>
      </div>
    </div>`;
  nav.insertBefore(wrap, login);

  const style = document.createElement('style');
  style.textContent = `
    .te-profile{position:relative;display:flex;align-items:center}.te-profile-btn{width:40px;height:40px;border-radius:50%;border:1px solid rgba(139,200,255,.48);background:linear-gradient(145deg,rgba(83,159,225,.28),rgba(16,34,55,.92));color:#d7edff;display:grid;place-items:center;cursor:pointer;overflow:hidden;padding:4px;box-shadow:0 0 0 4px rgba(78,163,255,.07),inset 0 1px 0 rgba(255,255,255,.12)}.te-profile-btn:hover{color:#fff;border-color:#9bd0ff}.te-profile-btn svg{width:27px;height:27px}.te-profile-btn.te-top-faucet,.te-profile-btn.te-top-route66,.te-profile-btn.te-top-oldtimer,.te-profile-btn.te-top-business,.te-profile-btn.te-top-mechanic,.te-profile-btn.te-top-roadtrip{background:linear-gradient(145deg,rgba(78,163,255,.35),rgba(13,29,48,.96));color:#e4f4ff;border-color:rgba(139,200,255,.48)}.te-profile-btn svg,.te-empty-avatar svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .te-profile-menu{position:absolute;right:0;top:48px;width:285px;padding:16px;background:linear-gradient(145deg,rgba(24,48,75,.98),rgba(9,19,33,.99));border:1px solid rgba(134,190,240,.3);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(18px);z-index:100}.te-profile-menu.hidden,.te-picker.hidden{display:none}.te-profile-title{font-size:10px;color:#8bc8ff;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px}.te-muted{font-size:11px;color:#a8b8ca}.te-empty-avatar,.te-avatar{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;margin-bottom:9px;border:1px solid rgba(139,200,255,.4);background:linear-gradient(145deg,#1b3855,#101d30);color:#e4f4ff;overflow:hidden;padding:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}.te-avatar svg{width:38px;height:38px}.te-avatar-faucet,.te-avatar-route66,.te-avatar-oldtimer,.te-avatar-business,.te-avatar-mechanic,.te-avatar-roadtrip{background:linear-gradient(145deg,#244b70,#12253d)}.te-user-head{display:flex;align-items:center;gap:10px}.te-user-head .te-avatar{margin:0}.te-user-head b,.te-user-head small{display:block}.te-user-head b{font-size:13px}.te-user-head small{font-size:10px;color:#a8b8ca;margin-top:3px;max-width:175px;overflow:hidden;text-overflow:ellipsis}.te-action{width:100%;border:1px solid rgba(139,200,255,.22);background:rgba(125,169,213,.1);color:#f4f8ff;border-radius:11px;padding:10px;font-weight:700;cursor:pointer;margin-top:9px}.te-action:hover{border-color:#8bc8ff;background:rgba(125,169,213,.17)}.te-muted-btn{color:#c3d3e5}.te-picker{margin-top:13px;padding-top:13px;border-top:1px solid rgba(139,200,255,.2)}.te-picker-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.te-picker-grid button{border:1px solid rgba(139,200,255,.2);background:linear-gradient(145deg,rgba(31,59,88,.88),rgba(12,27,45,.96));color:#f4f8ff;border-radius:13px;padding:7px 4px;cursor:pointer;min-height:78px}.te-picker-grid button:hover{border-color:#8bc8ff;transform:translateY(-1px)}.te-picker-grid button .av{display:grid}.te-picker-grid small{display:block;font-size:8px;color:#c0d2e5;margin-top:4px}.av{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;margin:auto;overflow:hidden;background:linear-gradient(145deg,#2b5882,#12263f);border:1px solid rgba(139,200,255,.3)}.av svg{width:45px;height:45px}.av.faucet,.av.route,.av.old,.av.business,.av.mechanic,.av.road{background:linear-gradient(145deg,#2b5882,#12263f);border:1px solid rgba(139,200,255,.3)}
    @media(max-width:600px){.te-profile-menu{right:0;width:min(285px,calc(100vw - 24px));max-width:calc(100vw - 24px);box-sizing:border-box}}
  `;

  document.head.appendChild(style);

  const btn=document.getElementById('teProfileBtn'), menu=document.getElementById('teProfileMenu');
  const guest=document.getElementById('teGuest'), userBox=document.getElementById('teUser'), picker=document.getElementById('tePicker');
  const avatar=document.getElementById('teAvatar'), name=document.getElementById('teName'), email=document.getElementById('teEmail');

  const avatarArt={
    faucet:'<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="fMetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#effbff"/><stop offset=".28" stop-color="#59d5ff"/><stop offset=".58" stop-color="#167ac0"/><stop offset=".82" stop-color="#b8edff"/><stop offset="1" stop-color="#174b83"/></linearGradient><linearGradient id="fBody" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#4be0ff"/><stop offset=".42" stop-color="#1685d4"/><stop offset="1" stop-color="#062c56"/></linearGradient><filter id="fShadow"><feGaussianBlur stdDeviation="2"/></filter></defs><ellipse cx="48" cy="82" rx="28" ry="5" fill="#000" opacity=".35" filter="url(#fShadow)"/><path d="M19 57h48v8H19z" fill="url(#fMetal)" stroke="#b8edff" stroke-width="1.5"/><path d="M26 64h7v13h-7zM54 64h7v13h-7z" fill="url(#fMetal)"/><rect x="21" y="43" width="38" height="19" rx="5" fill="url(#fBody)" stroke="#a8edff" stroke-width="2"/><path d="M29 43V32q0-7 8-7h15q8 0 8 8v5h-9v-5H39v10" fill="url(#fMetal)" stroke="#c4f4ff" stroke-width="2.5" stroke-linejoin="round"/><path d="M59 35h9q7 0 7 8v7" fill="none" stroke="url(#fMetal)" stroke-width="6" stroke-linecap="round"/><path d="M75 50q8 10-2 15-8-5 2-15" fill="#ffbd78" stroke="#fff0d9" stroke-width="1.5"/><path d="M27 48h22" stroke="#d8f8ff" stroke-width="2" opacity=".85"/><circle cx="31" cy="54" r="2" fill="#fff"/></svg>',
    route66:'<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="rShield" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".25" stop-color="#9de7ff"/><stop offset=".48" stop-color="#f4fbff"/><stop offset=".7" stop-color="#668eb9"/><stop offset="1" stop-color="#eaf9ff"/></linearGradient><linearGradient id="rFace" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#153d66"/><stop offset=".5" stop-color="#071b32"/><stop offset="1" stop-color="#2b8ed8"/></linearGradient><filter id="rGlow"><feGaussianBlur stdDeviation="2.2"/></filter></defs><path d="M48 7 80 17v29q0 27-32 42Q16 73 16 46V17z" fill="#4caeff" opacity=".3" filter="url(#rGlow)"/><path d="M48 8 79 18v27q0 26-31 41Q17 71 17 45V18z" fill="url(#rShield)" stroke="#fff" stroke-width="1.6"/><path d="M48 14 73 22v23q0 20-25 34Q23 65 23 45V22z" fill="url(#rFace)" stroke="#72d8ff" stroke-width="1.5"/><path d="M29 29h38" stroke="#ff963d" stroke-width="3" stroke-linecap="round"/><text x="48" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="900" fill="#fff" stroke="#9ccfff" stroke-width=".5">66</text><text x="48" y="65" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="900" fill="#ffb45f">ROUTE</text><path d="M30 23 48 17 66 23" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/></svg>',
    oldtimer:'<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="cPaint" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#e8faff"/><stop offset=".18" stop-color="#54c9ff"/><stop offset=".42" stop-color="#176cb1"/><stop offset=".68" stop-color="#09294b"/><stop offset="1" stop-color="#73d9ff"/></linearGradient><linearGradient id="cChrome" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#4a779e"/><stop offset=".25" stop-color="#fff"/><stop offset=".52" stop-color="#70bfe9"/><stop offset=".78" stop-color="#e8fbff"/><stop offset="1" stop-color="#315f8c"/></linearGradient><radialGradient id="cGlass"><stop stop-color="#a8e8ff"/><stop offset="1" stop-color="#0b2947"/></radialGradient></defs><ellipse cx="48" cy="76" rx="34" ry="5" fill="#000" opacity=".4"/><path d="M12 57 18 43q3-7 13-9l8-12h20l12 13q7 2 10 10l4 12v9H12z" fill="url(#cPaint)" stroke="#c5f4ff" stroke-width="2" stroke-linejoin="round"/><path d="M31 36 40 25h16l10 11z" fill="url(#cGlass)" stroke="#9de7ff" stroke-width="1.5"/><path d="M40 26v10M56 26l10 10" stroke="#b9efff" stroke-width="1.2"/><path d="M16 51h63" stroke="url(#cChrome)" stroke-width="4" stroke-linecap="round"/><path d="M14 59h68" stroke="#ffb05d" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="64" r="10" fill="#081b2e" stroke="url(#cChrome)" stroke-width="3"/><circle cx="27" cy="64" r="4" fill="#4b9ccf"/><circle cx="69" cy="64" r="10" fill="#081b2e" stroke="url(#cChrome)" stroke-width="3"/><circle cx="69" cy="64" r="4" fill="#4b9ccf"/><path d="M21 44h9" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="78" cy="46" r="2" fill="#fff0bd"/></svg>',
    business:'<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="bSuit" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6ad6ff"/><stop offset=".28" stop-color="#205d96"/><stop offset=".7" stop-color="#0a2340"/><stop offset="1" stop-color="#4a9ad2"/></linearGradient><linearGradient id="bSkin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe1be"/><stop offset=".6" stop-color="#d99b6d"/><stop offset="1" stop-color="#8e5b43"/></linearGradient><linearGradient id="bShirt" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#8cb8d9"/></linearGradient></defs><ellipse cx="48" cy="84" rx="28" ry="4" fill="#000" opacity=".3"/><path d="M18 81q1-23 17-29h26q16 6 17 29z" fill="url(#bSuit)" stroke="#69cfff" stroke-width="1.5"/><path d="m35 54 13 13 13-13-5-7H40z" fill="url(#bShirt)"/><path d="m45 66 3 5 3-5-1 15h-4z" fill="#ff963d"/><path d="M33 29q0-18 15-18t15 18v9q-3 15-15 15T33 38z" fill="url(#bSkin)" stroke="#ffd5b2" stroke-width="1.2"/><path d="M31 29q-2-20 17-21 16 1 18 18l-5 2-4-9q-12 8-25 5z" fill="#102c49" stroke="#4caeff" stroke-width="1.5"/><path d="M38 34h5m10 0h5" stroke="#694b40" stroke-width="1.5" stroke-linecap="round"/><path d="M43 43q5 4 10 0" fill="none" stroke="#a96d54" stroke-width="1.5" stroke-linecap="round"/><path d="M23 69 35 61M73 69 61 61" stroke="#8de3ff" stroke-width="2" opacity=".8"/></svg>',
    mechanic:'<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="mCloth" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#69d8ff"/><stop offset=".35" stop-color="#176ba7"/><stop offset="1" stop-color="#0a2846"/></linearGradient><linearGradient id="mTool" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".35" stop-color="#9fdfff"/><stop offset="1" stop-color="#3876a8"/></linearGradient><linearGradient id="mSkin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd7b0"/><stop offset="1" stop-color="#b97852"/></linearGradient></defs><path d="M17 81q1-21 16-27h30q15 6 16 27z" fill="url(#mCloth)" stroke="#7cdbff" stroke-width="1.5"/><path d="M31 55v13h34V55" fill="#17466e" stroke="#7cdbff" stroke-width="1.3"/><path d="M33 30q0-18 15-18t15 18v8q-3 14-15 14T33 38z" fill="url(#mSkin)"/><path d="M29 28q0-20 19-20 16 0 19 18l-8-2-7-7q-9 8-23 7z" fill="#0a2947" stroke="#61cfff" stroke-width="1.5"/><path d="M27 23q21-8 40 0l-3-10q-17-11-33 0z" fill="#1687d1" stroke="#8de3ff" stroke-width="1.5"/><path d="M38 36h5m10 0h5" stroke="#704d3d" stroke-width="1.4" stroke-linecap="round"/><path d="M43 44q5 3 10 0" fill="none" stroke="#9a6047" stroke-width="1.5"/><path d="M63 54 78 36q-3-10 4-15l4 8 7 1-5 7q-5 4-10 2L64 59z" fill="url(#mTool)" stroke="#d6f4ff" stroke-width="1.5" stroke-linejoin="round"/><circle cx="66" cy="64" r="4" fill="#ff963d" stroke="#ffe2a7" stroke-width="1.5"/><path d="M36 64h24v17H36z" fill="#0e3457" stroke="#8de3ff" stroke-width="1.3"/></svg>',
    roadtrip:'<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="tSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#123c68"/><stop offset=".55" stop-color="#1e8cc7"/><stop offset="1" stop-color="#ffb46c"/></linearGradient><linearGradient id="tRoad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9f4ff"/><stop offset=".2" stop-color="#466d91"/><stop offset=".65" stop-color="#071b32"/><stop offset="1" stop-color="#67bfff"/></linearGradient><clipPath id="tClip"><circle cx="48" cy="48" r="38"/></clipPath></defs><g clip-path="url(#tClip)"><rect x="8" y="10" width="80" height="76" fill="url(#tSky)"/><circle cx="67" cy="27" r="10" fill="#ffbf66"/><path d="M8 54 28 30 41 45 55 25 88 56v30H8z" fill="#0a2947" stroke="#66cfff" stroke-width="1.2"/><path d="m8 62 24-20 12 12 17-17 27 25v24H8z" fill="#154e78"/><path d="M24 87q13-21 24-25t23-24" fill="none" stroke="#d9f3ff" stroke-width="15"/><path d="M24 87q13-21 24-25t23-24" fill="none" stroke="url(#tRoad)" stroke-width="11"/><path d="M24 87q13-21 24-25t23-24" fill="none" stroke="#ffd27b" stroke-width="1.5" stroke-dasharray="5 5"/></g><circle cx="48" cy="48" r="39" fill="none" stroke="#a9eaff" stroke-width="3"/><circle cx="48" cy="48" r="35" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/></svg>'
  };
  const pickerNames={faucet:'Zapfhahn',route66:'Route 66',oldtimer:'Oldtimer',business:'Geschäftsmann',mechanic:'Mechaniker',roadtrip:'Roadtrip'};
  picker.innerHTML='<div class="te-profile-title">Dein Profilbild</div><div class="te-picker-grid">'+Object.keys(avatarArt).map(type=>'<button data-avatar="'+type+'" title="'+pickerNames[type]+'"><span class="av">'+avatarArt[type]+'</span><small>'+pickerNames[type]+'</small></button>').join('')+'</div>';
  function renderAvatar(type){
    const art=avatarArt[type]||avatarArt.faucet;
    avatar.className='te-avatar te-avatar-'+type;
    avatar.innerHTML=art;
  }
  function renderTopAvatar(type){
    btn.className='te-profile-btn te-top-'+type;
    btn.innerHTML=avatarArt[type]||avatarArt.faucet;
  }
  let mainSyncInFlight=false;
  async function syncMainSession(session){
    if(!session||typeof window.loadStation!=='function')return;
    const dash=document.getElementById('dashboardView');
    const admin=document.getElementById('adminView');
    if(!dash||!dash.classList.contains('hidden')||(admin&&!admin.classList.contains('hidden')))return;
    if(mainSyncInFlight)return;
    mainSyncInFlight=true;
    try{await window.loadStation(session);}catch(error){console.warn('Kundenbereich konnte nicht synchronisiert werden:',error?.message||error);}
    finally{mainSyncInFlight=false;}
  }
  function render(session){
    const u=session?.user;
    const type=u?.user_metadata?.avatar||'faucet';
    renderTopAvatar(type);
    login.style.display=u?'none':'';
    const legacyLogout=document.getElementById('logoutBtn');
    if(legacyLogout)legacyLogout.style.display='none';
    if(!u){guest.classList.remove('hidden');userBox.classList.add('hidden');return}
    guest.classList.add('hidden');userBox.classList.remove('hidden');
    name.textContent=u.user_metadata?.full_name||u.email?.split('@')[0]||'Konto';
    email.textContent=u.email||'';
    renderAvatar(type)
  }
  btn.onclick=e=>{e.stopPropagation();menu.classList.toggle('hidden')};
  document.getElementById('teLogin').onclick=()=>{menu.classList.add('hidden');login.click()};
  document.getElementById('teChoose').onclick=()=>picker.classList.toggle('hidden');
  document.getElementById('teLogout').onclick=()=>{const existingLogout=document.getElementById('logoutBtn');if(existingLogout){existingLogout.click();return;}console.warn('Kein bestehender Logout-Handler auf dieser Seite gefunden.');};
  picker.querySelectorAll('button').forEach(b=>b.onclick=async()=>{const {error}=await avatarClient.auth.updateUser({data:{avatar:b.dataset.avatar}});if(error)return;const {data}=await avatarClient.auth.getUser();render({user:data.user});picker.classList.add('hidden')});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==btn)menu.classList.add('hidden')});
  avatarClient.auth.onAuthStateChange((_event,session)=>{render(session);});
  const {data}=await avatarClient.auth.getSession();render(data?.session||null);

  const pilotLabel=document.querySelector('.ctaSection .eyebrow');
  if(pilotLabel)pilotLabel.textContent='Pilotphase · 10 freie Plätze';
});
