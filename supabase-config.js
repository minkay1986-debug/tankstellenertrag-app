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

  const cfg = window.TANKSTELLENERTRAG_SUPABASE;
  const avatarClient = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'tankstellenertrag-auth' }
  });

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

  const pickerNames={faucet:'Zapfhahn',route66:'Route 66',oldtimer:'Oldtimer',business:'Geschäftsmann',mechanic:'Mechaniker',roadtrip:'Roadtrip'};
  picker.innerHTML='<div class="te-profile-title">Dein Profilbild</div><div class="te-picker-grid">'+Object.keys(avatarArt).map(type=>'<button data-avatar="'+type+'" title="'+pickerNames[type]+'"><span class="av">'+avatarArt[type]+'</span><small>'+pickerNames[type]+'</small></button>').join('')+'</div>';
  const btn=document.getElementById('teProfileBtn'), menu=document.getElementById('teProfileMenu');
  const guest=document.getElementById('teGuest'), userBox=document.getElementById('teUser'), picker=document.getElementById('tePicker');
  const avatar=document.getElementById('teAvatar'), name=document.getElementById('teName'), email=document.getElementById('teEmail');

  const avatarArt={
    faucet:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 27h25v9H15zM38 23h10v17H38zM46 14h6v15h-6zM11 36h43v8H11zM20 44h7v10h-7zM39 44h7v10h-7z" fill="currentColor"/><circle cx="52" cy="16" r="3" fill="currentColor"/></svg>',
    route66:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 5 55 11v30c0 11-10 17-23 19C19 58 9 52 9 41V11z" fill="#f7f2df"/><path d="M32 8 52 13v27c0 9-8 14-20 17C20 54 12 49 12 40V13z" fill="#26343d"/><text x="32" y="36" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="900" fill="#fff">66</text><text x="32" y="47" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" font-weight="700" fill="#f47b20">ROUTE</text></svg>',
    oldtimer:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 38c2-7 7-11 15-12l5-9h12l8 9c4 1 7 5 7 12v8H9z" fill="#b98b5f"/><path d="M19 28h10l3-7h7l6 7z" fill="#27343a"/><circle cx="20" cy="47" r="7" fill="#20262a" stroke="#e2c49c" stroke-width="3"/><circle cx="46" cy="47" r="7" fill="#20262a" stroke="#e2c49c" stroke-width="3"/><path d="M12 38h40" stroke="#f6d5a8" stroke-width="3"/></svg>',
    business:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="17" r="9" fill="#d8a77a"/><path d="M17 57c1-13 6-21 15-21s14 8 15 21z" fill="#26343d"/><path d="m23 37 9 9 9-9-4-5H27z" fill="#f1eee6"/><path d="M28 42h8l-4 6z" fill="#f47b20"/><path d="M24 9c3-7 16-8 19 2-6-2-13-2-19-2z" fill="#20262a"/></svg>',
    mechanic:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="18" r="9" fill="#c98e67"/><path d="M17 58c1-13 6-22 15-22s14 9 15 22z" fill="#53614f"/><path d="M20 38h24v8H20z" fill="#39453a"/><path d="M43 12c5 1 9 5 9 10-4-2-8-2-11-1z" fill="#f47b20"/><path d="M12 50 25 37" stroke="#f0c66a" stroke-width="5" stroke-linecap="round"/><circle cx="12" cy="50" r="5" fill="none" stroke="#f0c66a" stroke-width="3"/></svg>',
    roadtrip:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="48" cy="15" r="8" fill="#f5b84b"/><path d="M6 51c10-12 18-15 29-12 8 2 14 0 23-7" fill="none" stroke="#d5d8d2" stroke-width="4" stroke-linecap="round"/><path d="M13 42h35l-4-10H23l-7 6z" fill="#d06e42"/><path d="M23 32h8v-6h7l6 6" fill="#26343d"/><circle cx="21" cy="43" r="5" fill="#20262a" stroke="#ddd" stroke-width="2"/><circle cx="42" cy="43" r="5" fill="#20262a" stroke="#ddd" stroke-width="2"/></svg>'
  };
  function renderAvatar(type){
    const art=avatarArt[type]||avatarArt.faucet;
    avatar.className='te-avatar te-avatar-'+type;
    avatar.innerHTML=art;
  }
  function renderTopAvatar(type){
    btn.className='te-profile-btn te-top-'+type;
    btn.innerHTML=avatarArt[type]||avatarArt.faucet;
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
  document.getElementById('teLogout').onclick=async()=>{await avatarClient.auth.signOut();location.reload()};
  picker.querySelectorAll('button').forEach(b=>b.onclick=async()=>{const {error}=await avatarClient.auth.updateUser({data:{avatar:b.dataset.avatar}});if(error)return;const {data}=await avatarClient.auth.getUser();render({user:data.user});picker.classList.add('hidden')});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==btn)menu.classList.add('hidden')});
  avatarClient.auth.onAuthStateChange((_event,session)=>render(session));
  const {data}=await avatarClient.auth.getSession();render(data?.session||null);

  const pilotLabel=document.querySelector('.ctaSection .eyebrow');
  if(pilotLabel)pilotLabel.textContent='Pilotphase · 10 freie Plätze';
});
