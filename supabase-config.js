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
    faucet:'<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="avBlueA" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bce7ff"/><stop offset="1" stop-color="#4c9fff"/></linearGradient></defs><g fill="none" stroke="url(#avBlueA)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 30h29V20h10v20H41v-5H12z"/><path d="M49 20V12h6v8M16 35v12m23-12v12M12 47h31"/><path d="M51 43c0 4-3 7-6 7s-5-3-5-6c0-3 5-9 5-9s6 5 6 8Z"/></g></svg>',
    route66:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 5 54 12v25c0 11-9 18-22 22C19 55 10 48 10 37V12z" fill="#153451" stroke="#83caff" stroke-width="2.5"/><path d="M19 18h26" stroke="#4c9fff" stroke-width="3" stroke-linecap="round"/><text x="32" y="39" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" font-weight="900" fill="#e8f6ff">66</text><text x="32" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" font-weight="800" fill="#8bc8ff">ROUTE</text></svg>',
    oldtimer:'<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#8bc8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 39l5-10c2-4 5-6 10-6h17c4 0 7 3 10 7l5 5v10H8z" fill="#173957"/><path d="M21 24l4-8h13l7 8M13 31h37" fill="none"/><circle cx="19" cy="45" r="6" fill="#0c1b2d"/><circle cx="46" cy="45" r="6" fill="#0c1b2d"/><path d="M27 35h11" stroke="#d9f0ff"/></g></svg>',
    business:'<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#8bc8ff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="17" r="9" fill="#173957"/><path d="M15 55c1-13 7-22 17-22s16 9 17 22z" fill="#173957"/><path d="m23 35 9 10 9-10M32 45v10" fill="none"/><path d="M25 13c4-7 13-7 17 0" fill="none"/></g></svg>',
    mechanic:'<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#8bc8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20a13 13 0 0 0 17 15L48 48a5 5 0 0 0 7-7L42 28a13 13 0 0 0-15-17l7 7-7 7z" fill="#173957"/><path d="m13 48 12-12" fill="none"/><circle cx="13" cy="49" r="4" fill="#173957"/></g></svg>',
    roadtrip:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="48" cy="14" r="7" fill="#8bc8ff"/><path d="M7 51c10-11 18-14 27-12 8 2 14-1 23-9" fill="none" stroke="#4c9fff" stroke-width="3.5" stroke-linecap="round"/><g stroke="#8bc8ff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 39h39l-5-10H24l-7 5z" fill="#173957"/><circle cx="21" cy="43" r="5" fill="#0c1b2d"/><circle cx="44" cy="43" r="5" fill="#0c1b2d"/><path d="M25 29v-6h10l7 6" fill="none"/></g></svg>'
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
