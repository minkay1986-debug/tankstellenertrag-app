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
    .te-profile{position:relative;display:flex;align-items:center}.te-profile-btn{width:36px;height:36px;border-radius:50%;border:1px solid #4a5155;background:#20262a;color:#aeb6bc;display:grid;place-items:center;cursor:pointer;overflow:hidden;padding:4px}.te-profile-btn:hover{color:#fff;border-color:#687176}.te-profile-btn svg{width:27px;height:27px}.te-profile-btn.te-top-faucet{background:#f47b20;color:#fff}.te-profile-btn.te-top-route66{background:#293640;color:#fff;border-color:#d7d0c5}.te-profile-btn.te-top-oldtimer{background:#4a3829;color:#fff;border-color:#bca17f}.te-profile-btn.te-top-business{background:#26333b;color:#fff;border-color:#8f9da5}.te-profile-btn.te-top-mechanic{background:#33372f;color:#fff;border-color:#9a9f8d}.te-profile-btn.te-top-roadtrip{background:#35291f;color:#fff;border-color:#c28d5c}.te-profile-btn svg,.te-empty-avatar svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .te-profile-menu{position:absolute;right:0;top:44px;width:285px;padding:15px;background:#171b1e;border:1px solid #3b4348;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.45);z-index:100}.te-profile-menu.hidden,.te-picker.hidden{display:none}.te-profile-title{font-size:10px;color:#ff9b4a;font-weight:900;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}.te-muted{font-size:11px;color:#899298}.te-empty-avatar,.te-empty-avatar,.te-avatar{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;margin-bottom:9px;border:1px solid #4b5358;background:#20262a;color:#fff;overflow:hidden;padding:4px}.te-avatar svg{width:38px;height:38px}.te-avatar-faucet{background:#f47b20}.te-avatar-route66{background:#293640}.te-avatar-oldtimer{background:#4a3829}.te-avatar-business{background:#26333b}.te-avatar-mechanic{background:#33372f}.te-avatar-roadtrip{background:#35291f}.te-user-head{display:flex;align-items:center;gap:10px}.te-user-head .te-avatar{margin:0}.te-user-head b,.te-user-head small{display:block}.te-user-head b{font-size:13px}.te-user-head small{font-size:10px;color:#899298;margin-top:3px;max-width:175px;overflow:hidden;text-overflow:ellipsis}.te-action{width:100%;border:1px solid #3d454a;background:#22282c;color:#fff;border-radius:8px;padding:9px 10px;font-weight:700;cursor:pointer;margin-top:9px}.te-action:hover{border-color:#f47b20}.te-muted-btn{color:#aeb6bc}.te-picker{margin-top:13px;padding-top:13px;border-top:1px solid #30373c}.te-picker-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.te-picker-grid button{border:1px solid #394146;background:#20262a;color:#fff;border-radius:10px;padding:7px 4px;cursor:pointer;min-height:70px}.te-picker-grid button:hover{border-color:#f47b20;transform:translateY(-1px)}.te-picker-grid button .av{display:grid}.te-picker-grid small{display:block;font-size:8px;color:#aeb6bc;margin-top:4px}.av{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;margin:auto;overflow:hidden}.av svg{width:45px;height:45px}.av.faucet{background:#f47b20}.av.route{background:#293640;border:2px solid #d7d0c5}.av.old{background:#4a3829;border:2px solid #bca17f}.av.business{background:#26333b;border:2px solid #8f9da5}.av.mechanic{background:#33372f;border:2px solid #9a9f8d}.av.road{background:#35291f;border:2px solid #c28d5c}
    @media(max-width:600px){.te-profile-menu{right:-38px;width:270px}}
  `;
  document.head.appendChild(style);

  const btn=document.getElementById('teProfileBtn'), menu=document.getElementById('teProfileMenu');
  const guest=document.getElementById('teGuest'), userBox=document.getElementById('teUser'), picker=document.getElementById('tePicker');
  const avatar=document.getElementById('teAvatar'), name=document.getElementById('teName'), email=document.getElementById('teEmail');

  const avatarArt={
    faucet:'<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="13" y="25" width="27" height="10" rx="2" fill="currentColor"/><rect x="39" y="21" width="10" height="19" rx="2" fill="currentColor"/><path d="M48 21V13h5v15" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M49 14c5 0 7 4 7 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="9" y="35" width="44" height="8" rx="2" fill="currentColor"/><rect x="18" y="43" width="7" height="11" rx="1" fill="currentColor"/><rect x="37" y="43" width="7" height="11" rx="1" fill="currentColor"/></svg>',
    route66:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 56 11v29c0 12-10 18-24 20C18 58 8 52 8 40V11z" fill="#f3ead5"/><path d="M32 8 52 14v25c0 9-8 14-20 17-12-3-20-8-20-17V14z" fill="#283944"/><path d="M18 19h28" stroke="#f47b20" stroke-width="3"/><text x="32" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" font-weight="900" fill="#fff">66</text><text x="32" y="49" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" font-weight="800" fill="#f47b20">ROUTE</text></svg>',
    oldtimer:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M7 40c2-8 8-13 17-14l6-10h12l8 10c5 1 8 6 8 14v8H7z" fill="#c08a5a"/><path d="M20 27h9l3-7h6l7 7z" fill="#34434a"/><path d="M11 40h43" stroke="#f2d0a1" stroke-width="3"/><circle cx="20" cy="48" r="7" fill="#20262a" stroke="#e4c79f" stroke-width="3"/><circle cx="46" cy="48" r="7" fill="#20262a" stroke="#e4c79f" stroke-width="3"/><circle cx="20" cy="48" r="2" fill="#e4c79f"/><circle cx="46" cy="48" r="2" fill="#e4c79f"/></svg>',
    business:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="18" r="9" fill="#d7a278"/><path d="M18 59c1-14 6-23 14-23s13 9 14 23z" fill="#273640"/><path d="M23 38 32 47 41 38l-4-5H27z" fill="#f4f0e6"/><path d="m32 47-4 12h8z" fill="#f47b20"/><path d="M24 11c2-8 16-10 20 1-7-2-13-2-20-1z" fill="#20262a"/><path d="M29 27h6" stroke="#9a6c50" stroke-width="2" stroke-linecap="round"/></svg>',
    mechanic:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="20" r="9" fill="#c88e69"/><path d="M17 59c1-14 6-23 15-23s14 9 15 23z" fill="#4e5c4a"/><path d="M20 39h24v9H20z" fill="#374438"/><path d="M20 13c4-8 17-9 23 0l-2 5H22z" fill="#f47b20"/><path d="M43 42 54 31" stroke="#e2b65b" stroke-width="5" stroke-linecap="round"/><circle cx="54" cy="31" r="5" fill="none" stroke="#e2b65b" stroke-width="3"/><path d="M28 24h8" stroke="#8d614d" stroke-width="2" stroke-linecap="round"/></svg>',
    roadtrip:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="49" cy="14" r="8" fill="#f5b84b"/><path d="M5 54c11-13 20-16 30-13 9 3 16 0 24-8" fill="none" stroke="#d6d9d5" stroke-width="4" stroke-linecap="round"/><path d="M11 43h40l-5-11H24l-8 6z" fill="#d06d42"/><path d="M24 32h8v-7h7l8 7" fill="#2c3b42"/><path d="M18 37h7" stroke="#f3d4ae" stroke-width="2"/><circle cx="20" cy="45" r="6" fill="#20262a" stroke="#eee" stroke-width="2"/><circle cx="44" cy="45" r="6" fill="#20262a" stroke="#eee" stroke-width="2"/></svg>'
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
    if(!u){guest.classList.remove('hidden');userBox.classList.add('hidden');return}
    guest.classList.add('hidden');userBox.classList.remove('hidden');
    name.textContent=u.user_metadata?.full_name||u.email?.split('@')[0]||'Konto';
    email.textContent=u.email||'';
    renderAvatar(type)
  }
  btn.onclick=e=>{e.stopPropagation();menu.classList.toggle('hidden')};
  document.getElementById('teLogin').onclick=()=>{menu.classList.add('hidden');login.click()};
  document.getElementById('teChoose').onclick=()=>picker.classList.toggle('hidden');
  document.getElementById('teLogout').onclick=async()=>{await avatarClient.auth.signOut({scope:'local'});location.reload()};
  picker.querySelectorAll('button').forEach(b=>b.onclick=async()=>{const {error}=await avatarClient.auth.updateUser({data:{avatar:b.dataset.avatar}});if(error)return;const {data}=await avatarClient.auth.getUser();render({user:data.user});picker.classList.add('hidden')});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==btn)menu.classList.add('hidden')});
  avatarClient.auth.onAuthStateChange((_event,session)=>render(session));
  const {data}=await avatarClient.auth.getSession();render(data?.session||null);syncMainSession(data?.session||null);

  const pilotLabel=document.querySelector('.ctaSection .eyebrow');
  if(pilotLabel)pilotLabel.textContent='Pilotphase · 10 freie Plätze';
});
