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
          <button data-avatar="faucet" title="Zapfhahn"><span class="av faucet">T</span><small>Zapfhahn</small></button>
          <button data-avatar="route66" title="Route 66"><span class="av route">66</span><small>Route 66</small></button>
          <button data-avatar="oldtimer" title="Oldtimer"><span class="av old">OT</span><small>Oldtimer</small></button>
          <button data-avatar="business" title="Geschäftsmann"><span class="av business">BM</span><small>Business</small></button>
          <button data-avatar="mechanic" title="Mechaniker"><span class="av mechanic">MK</span><small>Mechaniker</small></button>
          <button data-avatar="roadtrip" title="Roadtrip"><span class="av road">RT</span><small>Roadtrip</small></button>
        </div>
      </div>
    </div>`;
  nav.insertBefore(wrap, login);

  const style = document.createElement('style');
  style.textContent = `
    .te-profile{position:relative;display:flex;align-items:center}.te-profile-btn{width:36px;height:36px;border-radius:50%;border:1px solid #4a5155;background:#20262a;color:#aeb6bc;display:grid;place-items:center;cursor:pointer}.te-profile-btn:hover{color:#fff;border-color:#687176}.te-profile-btn svg,.te-empty-avatar svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .te-profile-menu{position:absolute;right:0;top:44px;width:285px;padding:15px;background:#171b1e;border:1px solid #3b4348;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.45);z-index:100}.te-profile-menu.hidden,.te-picker.hidden{display:none}.te-profile-title{font-size:10px;color:#ff9b4a;font-weight:900;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}.te-muted{font-size:11px;color:#899298}.te-empty-avatar,.te-avatar{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;margin-bottom:9px;border:1px solid #4b5358;background:#20262a;color:#8e979d}.te-user-head{display:flex;align-items:center;gap:10px}.te-user-head .te-avatar{margin:0}.te-user-head b,.te-user-head small{display:block}.te-user-head b{font-size:13px}.te-user-head small{font-size:10px;color:#899298;margin-top:3px;max-width:175px;overflow:hidden;text-overflow:ellipsis}.te-action{width:100%;border:1px solid #3d454a;background:#22282c;color:#fff;border-radius:8px;padding:9px 10px;font-weight:700;cursor:pointer;margin-top:9px}.te-action:hover{border-color:#f47b20}.te-muted-btn{color:#aeb6bc}.te-picker{margin-top:13px;padding-top:13px;border-top:1px solid #30373c}.te-picker-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.te-picker-grid button{border:1px solid #394146;background:#20262a;color:#fff;border-radius:10px;padding:7px 4px;cursor:pointer}.te-picker-grid button:hover{border-color:#f47b20}.te-picker-grid small{display:block;font-size:8px;color:#aeb6bc;margin-top:4px}.av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;margin:auto;font-size:12px;font-weight:900}.av.faucet{background:#f47b20}.av.route{background:#293640;border:2px solid #d7d0c5}.av.old{background:#4a3829;border:2px solid #bca17f}.av.business{background:#26333b;border:2px solid #8f9da5}.av.mechanic{background:#33372f;border:2px solid #9a9f8d}.av.road{background:#35291f;border:2px solid #c28d5c}
    @media(max-width:600px){.te-profile-menu{right:-38px;width:270px}}
  `;
  document.head.appendChild(style);

  const btn=document.getElementById('teProfileBtn'), menu=document.getElementById('teProfileMenu');
  const guest=document.getElementById('teGuest'), userBox=document.getElementById('teUser'), picker=document.getElementById('tePicker');
  const avatar=document.getElementById('teAvatar'), name=document.getElementById('teName'), email=document.getElementById('teEmail');

  const avatarSvg={faucet:'<svg viewBox="0 0 48 48"><path fill="currentColor" d="M10 21h18v7H10zM28 18h7v10h-7zM34 12h4v9h-4zM7 28h31v6H7zM14 34h5v7h-5zM29 34h5v7h-5z"/><circle fill="currentColor" cx="38" cy="14" r="2"/></svg>'};
  function renderAvatar(type){avatar.className='te-avatar '+(type==='faucet'?'':'te-avatar-'+type);avatar.innerHTML=avatarSvg[type]||'<span>'+({route66:'66',oldtimer:'OT',business:'BM',mechanic:'MK',roadtrip:'RT'}[type]||'T')+'</span>'}
  function render(session){
    const u=session?.user;
    if(!u){guest.classList.remove('hidden');userBox.classList.add('hidden');return}
    guest.classList.add('hidden');userBox.classList.remove('hidden');name.textContent=u.user_metadata?.full_name||u.email?.split('@')[0]||'Konto';email.textContent=u.email||'';renderAvatar(u.user_metadata?.avatar||'faucet')
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
