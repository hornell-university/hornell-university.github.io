/* RamChat widget: a read-only student chat that keeps talking while you read the site.
   Data in assets/data/chat.js. The input asks you to log in; logging in sends you to the sandbox bot. */
(function(){
  var D = window.RAMCHAT; if (!D) return;
  var IMG = 'assets/img/';
  var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  function emo(text){
    return esc(text).replace(/:([a-zA-Z_]+):/g, function(m, k){ return D.emoji[k] ? '<img class="rc-emo" src="' + IMG + D.emoji[k] + '.webp" alt=":' + k + ':" title=":' + k + ':">' : m; });
  }
  function onlyEmoji(t){ return /^(\s*:[a-zA-Z_]+:\s*)+$/.test(t); }

  // ---------- DOM ----------
  var launcher = document.createElement('button');
  launcher.className = 'rc-launch'; launcher.type = 'button'; launcher.setAttribute('aria-expanded', 'false'); launcher.setAttribute('aria-controls', 'ramchat');
  launcher.innerHTML = '<img src="' + IMG + 'em-01.webp" alt=""><span class="rc-lbl">RamChat</span><b class="rc-badge">3</b>';
  var panel = document.createElement('section');
  panel.className = 'rc-panel'; panel.id = 'ramchat'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'RamChat'); panel.hidden = true;
  panel.innerHTML =
    '<header class="rc-head"><img src="' + IMG + 'hu-01_seal_paper.webp" alt=""><div><b>RamChat</b><small><i class="rc-dot"></i><span class="rc-online">1,204</span> online · official student community</small></div>' +
    '<button type="button" class="rc-x" aria-label="Close chat">×</button></header>' +
    '<nav class="rc-tabs" role="tablist">' + D.channels.map(function(c, i){ return '<button type="button" role="tab" data-c="' + i + '" aria-selected="' + (i ? 'false' : 'true') + '"># ' + esc(c.name) + '<i class="rc-new"></i></button>'; }).join('') + '</nav>' +
    '<p class="rc-topic"></p>' +
    '<div class="rc-list" aria-live="polite"></div>' +
    '<div class="rc-typing" aria-hidden="true"></div>' +
    '<footer class="rc-foot"><button type="button" class="rc-input"><span>\uD83D\uDD12</span> Please log in to chat</button><button type="button" class="rc-login">Log in</button></footer>' +
    '<div class="rc-sso" hidden><div class="rc-card"><img src="' + IMG + 'hu-02_seal_1869_paper.webp" alt=""><b>Hornell NetID</b><p>RamChat is for enrolled students only.</p>' +
    '<p class="rc-small">No NetID yet? Any person, any study. Classes started in August, but admissions will make an exception for you.</p>' +
    '<a class="rc-enroll" target="_blank" rel="noopener">Enroll at Hornell →</a><button type="button" class="rc-back">Keep lurking</button></div></div>';
  document.body.appendChild(panel); document.body.appendChild(launcher);
  var list = panel.querySelector('.rc-list'), typing = panel.querySelector('.rc-typing'), topic = panel.querySelector('.rc-topic'),
      badge = launcher.querySelector('.rc-badge'), sso = panel.querySelector('.rc-sso');
  panel.querySelector('.rc-enroll').href = D.LOGIN_URL;

  // ---------- state ----------
  var cur = 0, open = false, unread = 3, timers = [];
  var pos = D.channels.map(function(c){ return Math.min(8, c.msgs.length); });  // messages already "posted" per channel
  var shown = D.channels.map(function(){ return 0; });
  var t0 = Date.now();
  function stamp(ci, i){ var d = new Date(t0 - (Math.min(8, D.channels[ci].msgs.length) - i) * 1000 * 60 * 1.7 - ci * 1000 * 60 * 6); return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}); }

  function render(ci, i, live){
    var m = D.channels[ci].msgs[i], u = D.users[m[0]] || {n:m[0], av:'em-01', c:'#888'};
    var grouped = list.lastElementChild && list.lastElementChild.dataset.u === m[0];
    var body;
    if (m[1].indexOf('s:') === 0) body = '<img class="rc-stk" src="' + IMG + 'st-' + m[1].slice(2) + '.webp" alt="sticker">';
    else body = '<p class="' + (onlyEmoji(m[1]) ? 'rc-big' : '') + '">' + emo(m[1]) + '</p>';
    var reacts = '';
    if (m[2] && m[2].indexOf('r:') === 0) {
      reacts = '<div class="rc-reacts">' + m[2].slice(2).trim().split(/\s+/).map(function(r){
        var mm = /^:([a-zA-Z_]+):(\d+)$/.exec(r); if (!mm || !D.emoji[mm[1]]) return '';
        return '<button type="button" class="rc-react" data-n="' + mm[2] + '"><img src="' + IMG + D.emoji[mm[1]] + '.webp" alt=":' + mm[1] + ':"><span>' + mm[2] + '</span></button>';
      }).join('') + '</div>';
    }
    var el = document.createElement('div');
    el.className = 'rc-msg' + (grouped ? ' rc-cont' : '') + (live ? ' rc-in' : ''); el.dataset.u = m[0];
    el.innerHTML = (grouped ? '' : '<img class="rc-av" src="' + IMG + u.av + '.webp" alt="">') +
      '<div class="rc-b">' + (grouped ? '' : '<div class="rc-meta"><b style="color:' + u.c + '">' + esc(u.n) + '</b>' + (u.badge ? '<i class="rc-badge2">' + u.badge + '</i>' : '') + '<time>' + (live ? new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}) : stamp(ci, i)) + '</time></div>') +
      body + reacts + '</div>';
    list.appendChild(el);
  }
  function show(ci){
    cur = ci; list.innerHTML = ''; typing.textContent = '';
    topic.textContent = D.channels[ci].topic;
    for (var i = 0; i < pos[ci]; i++) render(ci, i, false);
    shown[ci] = pos[ci];
    [].forEach.call(panel.querySelectorAll('.rc-tabs button'), function(b){ b.setAttribute('aria-selected', +b.dataset.c === ci); if (+b.dataset.c === ci) b.classList.remove('rc-has'); });
    list.scrollTop = list.scrollHeight;
  }
  function near(){ return list.scrollHeight - list.scrollTop - list.clientHeight < 80; }

  // ---------- the chat keeps going on every channel ----------
  function tick(ci){
    var ch = D.channels[ci];
    if (pos[ci] >= ch.msgs.length) { pos[ci] = Math.max(1, Math.floor(ch.msgs.length / 3)); }  // loop back into the middle of the conversation
    var m = ch.msgs[pos[ci]], u = D.users[m[0]] || {n:m[0]};
    var typeMs = m[1].indexOf('s:') === 0 ? 800 : Math.min(1900, 600 + m[1].length * 14);
    if (open && ci === cur) typing.innerHTML = '<span class="rc-dots"><i></i><i></i><i></i></span> <b>' + esc(u.n) + '</b> is typing…';
    timers.push(setTimeout(function(){
      var i = pos[ci]; pos[ci]++;
      if (open && ci === cur) {
        typing.textContent = ''; var stick = near();
        render(ci, i, true); shown[ci] = i + 1;
        if (stick) list.scrollTop = list.scrollHeight;
      } else {
        if (!open) { unread = Math.min(unread + 1, 99); badge.textContent = unread > 9 ? '9+' : unread; badge.hidden = false; }
        var t = panel.querySelector('.rc-tabs [data-c="' + ci + '"]'); if (t && ci !== cur) t.classList.add('rc-has');
      }
      var wait = (ci === cur ? 1500 : 8000) + Math.random() * (ci === cur ? 2200 : 8000);
      timers.push(setTimeout(function(){ tick(ci); }, wait));
    }, typeMs));
  }
  D.channels.forEach(function(c, ci){ timers.push(setTimeout(function(){ tick(ci); }, 2500 + ci * 4000 + Math.random() * 2000)); });
  setInterval(function(){ var o = panel.querySelector('.rc-online'); o.textContent = (1180 + Math.floor(Math.random() * 60)).toLocaleString(); }, 7000);

  // ---------- interactions ----------
  function setOpen(v){
    open = v; panel.hidden = !v; launcher.setAttribute('aria-expanded', v); document.documentElement.classList.toggle('rc-open', v);
    if (v) { unread = 0; badge.hidden = true; show(cur); }
  }
  launcher.addEventListener('click', function(){ setOpen(!open); });
  panel.querySelector('.rc-x').addEventListener('click', function(){ setOpen(false); launcher.focus(); });
  panel.querySelector('.rc-tabs').addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) show(+b.dataset.c); });
  function login(){ sso.hidden = false; panel.querySelector('.rc-enroll').focus(); }
  panel.querySelector('.rc-input').addEventListener('click', login);
  panel.querySelector('.rc-login').addEventListener('click', login);
  panel.querySelector('.rc-back').addEventListener('click', function(){ sso.hidden = true; });
  list.addEventListener('click', function(e){
    var r = e.target.closest('.rc-react'); if (!r) return;
    var on = r.classList.toggle('rc-mine'), n = +r.dataset.n + (on ? 1 : 0); r.querySelector('span').textContent = n;
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && open) { if (!sso.hidden) sso.hidden = true; else setOpen(false); } });
})();
