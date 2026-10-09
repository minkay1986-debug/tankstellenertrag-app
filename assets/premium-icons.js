(function(){
const p={
"☕":["coffee",'<path d="M4 10h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 11h2a2 2 0 0 1 0 4M7 3c-1 1 1 2 0 3M11 2c-1 1 1 2 0 3"/>'],
"📅": ["calendar",'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M7 17h3"/><path class="a" d="M15 14h2"/>'],
"🎒":["bag",'<path d="M8 7V5a4 4 0 0 1 8 0v2M6 8h12a2 2 0 0 1 2 2v10H4V10a2 2 0 0 1 2-2Z"/><path d="M8 8v4h8V8M8 16h8v4"/>'],
"📍":["pin",'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle class="a" cx="12" cy="10" r="2.5"/>'],
"🎄":["tree",'<path d="M12 3 7 10h3l-4 5h5v5h2v-5h5l-4-5h3z"/><path class="a" d="M12 3v2"/>'],
"🎯":["target",'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path class="a" d="M12 12l7-7M16 5h3v3"/>'],
"📊":["chart",'<path d="M4 20V4M4 20h17M7 15l4-4 3 2 5-7"/><path class="a" d="M16 6h3v3"/>'],
"📈":["trend",'<path d="M4 20V4M4 20h17M7 15l4-4 3 2 5-7"/><path class="a" d="M16 6h3v3"/>'],
"💡":["bulb",'<path d="M9 18h6M10 21h4M8.5 14.5a7 7 0 1 1 7 0c-.9.7-1.2 1.4-1.3 2.5h-4.4c-.1-1.1-.4-1.8-1.3-2.5Z"/><path class="a" d="M12 2v2"/>'],
"📄":["file",'<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/>'],
"🧠":["brain",'<path d="M12 5a3 3 0 0 0-5-2 4 4 0 0 0-2 6 4 4 0 0 0 0 6 4 4 0 0 0 2 6 3 3 0 0 0 5-2zM12 5a3 3 0 0 1 5-2 4 4 0 0 1 2 6 4 4 0 0 1 0 6 4 4 0 0 1-2 6 3 3 0 0 1-5-2M12 5v14"/>'],
"🔔":["bell",'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/><path class="a" d="M12 3V2"/>'],
"☀":["sun",'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
"🌧":["rain",'<path d="M6 15a4 4 0 0 1-.5-8A6.5 6.5 0 0 1 18 6a4.5 4.5 0 0 1 0 9Z"/><path class="a" d="m8 18-1 3m7-3-1 3m7-3-1 3"/>'],
"⛅":["cloud",'<path d="M6 18a4 4 0 0 1-.5-8A6.5 6.5 0 0 1 18 9a4.5 4.5 0 0 1 0 9Z"/><path class="a" d="M12 2v3M5 5l2 2"/>'],
"🌫":["cloud",'<path d="M5 8h14M3 12h18M5 16h14"/>'],
"❄":["snow",'<path d="M12 2v20M3 7l18 10M3 17 21 7M8 4l4 3 4-3M8 20l4-3 4 3"/>'],
"🌡":["thermo",'<path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0Z"/><path class="a" d="M11 9v8"/>'],
"🔎":["search",'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'],
"👤":["user",'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
"✨":["spark",'<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8Z"/><path class="a" d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z"/>'],
"🔮":["target",'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path class="a" d="M12 12l6-6"/>'],
"🥤":["drink",'<path d="M7 3h10l-1 18H8zM6 3h12M8 8h8"/><path class="a" d="m14 1-3 5"/>'],
"🍦":["ice",'<path d="M7 10a5 5 0 0 1 10 0v2H7zM7 12l5 9 5-9"/>'],
"📱":["phone",'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>'],
"🌐":["globe",'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'],
"🚀":["rocket",'<path d="M12 15c4-2 7-7 7-12-5 0-10 3-12 7l5 5Z"/><path d="m7 10-4 1-1 5 5-1M14 17l-1 4-5 1 1-5"/><circle class="a" cx="14" cy="8" r="1.5"/>'],
"⚠":["warning",'<path d="M12 3 2.8 20h18.4Z"/><path d="M12 9v5M12 17h.01"/>'],
"✓":["check",'<path d="m4 12 5 5L20 6"/>'],
"🎃":["season",'<path d="M12 5c-5-3-9 1-9 6s4 9 9 6c5 3 9-1 9-6s-4-9-9-6Z"/><path d="M12 5v12M7 7l2 3M17 7l-2 3"/>']
};
const ex='.diniStickerHint,.diniStickerLink,[data-dinilove-content],.diniLoveRecipes';
function make(g){const a=p[g]||p['✨'];return '<svg class="te-premium-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+a[1].replace(/class="a"/g,'class="te-accent"')+'</svg>'}
const css=document.createElement('style');css.textContent='.te-premium-icon{display:inline-block;width:1.2em;height:1.2em;vertical-align:-.22em;flex:none;color:#70e8ff;filter:drop-shadow(0 0 4px rgba(35,190,255,.3))}.te-premium-icon .te-accent{stroke:#ff9a36}.te-premium-icon-wrap{display:inline-flex;align-items:center;justify-content:center;line-height:1}.icon .te-premium-icon,.monthlyIcon .te-premium-icon,.appHintIcon .te-premium-icon{width:1.4em;height:1.4em}';document.head.appendChild(css);
const re=/^(?:☕|📅|🎒|📍|🎄|🎯|📊|📈|💡|📄|🧠|🔔|☀|🌧|⛅|🌫|❄|🌡|🔎|👤|✨|🔮|🥤|🍦|📱|🌐|🚀|⚠|✓|🎃)$/u;
function run(root){(root||document).querySelectorAll('*').forEach(el=>{if(el.closest(ex)||el.querySelector('.te-premium-icon'))return;if(!el.children.length){const t=(el.textContent||'').trim();if(re.test(t)){el.textContent='';el.insertAdjacentHTML('afterbegin',make(t));el.classList.add('te-premium-icon-wrap');return}}if(el.matches('h1,h2,h3,h4,.forecast-section-kicker,.wow-title,.label,.eyebrow')&&el.firstChild&&el.firstChild.nodeType===3){const t=el.firstChild.nodeValue||'',m=t.match(/^\s*(☕|📅|🎒|📍|🎄|🎯|📊|📈|💡|📄|🧠|🔔|☀|🌧|⛅|🌫|❄|🌡|🔎|👤|✨|🔮|🥤|🍦|📱|🌐|🚀|⚠|✓|🎃)\s*/u);if(m){const n=document.createElement('span');n.innerHTML=make(m[1]);n.className='te-premium-icon-wrap';el.firstChild.nodeValue=t.slice(m[0].length);el.insertBefore(n,el.firstChild)}}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>run());else run();
new MutationObserver(ms=>ms.forEach(m=>run(m.target.nodeType===1?m.target.parentElement:document))).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();