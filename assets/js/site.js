/* Hornell site: Day / After Dark switch, student directory. */
(function(){
  var KEY = 'hornell-mode';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function effective(){
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return mq && mq.matches ? 'dark' : 'light';
  }
  function paint(){
    var e = effective();
    document.querySelectorAll('[data-mode]').forEach(function(b){
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === e ? 'true' : 'false');
    });
  }
  document.querySelectorAll('[data-mode]').forEach(function(b){
    b.addEventListener('click', function(){
      var m = b.getAttribute('data-mode');
      root.setAttribute('data-theme', m);
      try { localStorage.setItem(KEY, m); } catch(e){}
      paint();
    });
  });
  if (mq && mq.addEventListener) mq.addEventListener('change', paint);
  paint();

  // students (bots) directory
  var grid = document.getElementById('students');
  if (grid && window.HORNELL_STUDENTS){
    var list = window.HORNELL_STUDENTS.filter(function(s){ return s && s.name; });
    var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
    if (list.length){
      document.getElementById('students-empty').hidden = true;
      grid.innerHTML = list.map(function(s){
        return '<a class="card student" href="' + esc(s.url || '#') + '" target="_blank" rel="noopener">' +
          '<div class="pic cover"><img src="' + esc(s.image) + '" alt="' + esc(s.name) + '" loading="lazy"></div>' +
          '<p class="tag">' + esc([s.year, s.major].filter(Boolean).join(' · ')) + '</p>' +
          '<h3>' + esc(s.name) + '</h3>' +
          (s.title ? '<p><b>' + esc(s.title) + '</b></p>' : '') +
          (s.blurb ? '<p>' + esc(s.blurb) + '</p>' : '') +
          (s.where ? '<p class="tag">' + esc(s.where) + '</p>' : '') +
          '</a>';
      }).join('');
    }
  }
})();

/* glossary: underline the first mention of each term on the page; hover or tap for the definition */
(function(){
  var G = window.HORNELL_GLOSSARY; if (!G || !document.querySelector('main')) return;
  var root = document.documentElement;
  function night(){ var t=root.getAttribute('data-theme'); if(t) return t==='dark'; return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches; }
  var items = [];
  G.forEach(function(g, i){ g.t.forEach(function(term){ items.push({term:term, i:i}); }); });
  items.sort(function(a,b){ return b.term.length - a.term.length; });
  var esc = function(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); };
  var re = new RegExp('(^|[^\\w@])(' + items.map(function(x){ return esc(x.term); }).join('|') + ')(?![\\w])');
  var byTerm = {}; items.forEach(function(x){ byTerm[x.term] = x.i; });
  var done = {};
  var walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT, {acceptNode:function(n){
    var p = n.parentNode; if (!p || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
    if (p.closest('h1,h2,h3,h4,a,button,script,style,.gl,.stk,nav,table,.blur,.ini')) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT; }});
  var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(function(n){
    var m = re.exec(n.nodeValue); if (!m) return;
    var gi = byTerm[m[2]], p = n.parentNode, ctx = p.closest('.night') ? 'n' : p.closest('.day') ? 'd' : 'b';
    var dd = done[gi] || (done[gi] = {}), only = '';
    if (ctx === 'b') { if (dd.d && dd.n) return; only = dd.n ? ' gl-d' : dd.d ? ' gl-n' : ''; dd.d = dd.n = 1; }
    else { if (dd[ctx]) return; dd[ctx] = 1; }
    var start = m.index + m[1].length, after = n.splitText(start); after.splitText(m[2].length);
    var s = document.createElement('abbr'); s.className = 'gl' + only; s.tabIndex = 0; s.dataset.g = gi; s.textContent = m[2];
    after.parentNode.replaceChild(s, after);
  });
  var pop = null, cur = null;
  function close(){ if (pop) { pop.remove(); pop = null; cur = null; } }
  function open(el){
    if (el.classList.contains(night() ? 'gl-d' : 'gl-n')) return;
    close(); var g = G[+el.dataset.g]; cur = el;
    pop = document.createElement('div'); pop.className = 'glpop'; pop.setAttribute('role','tooltip');
    pop.innerHTML = '<b>' + g.t[0] + '</b>' + (night() ? g.n : g.d) + (g.href ? ' <a href="' + g.href + '">More →</a>' : '');
    document.body.appendChild(pop);
    var r = el.getBoundingClientRect(), w = pop.offsetWidth, x = Math.min(Math.max(8, r.left + window.scrollX + r.width/2 - w/2), window.scrollX + document.documentElement.clientWidth - w - 8);
    var y = r.bottom + window.scrollY + 8; if (r.bottom + pop.offsetHeight + 16 > window.innerHeight) y = r.top + window.scrollY - pop.offsetHeight - 8;
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    pop.addEventListener('mouseleave', function(){ setTimeout(function(){ if (pop && !pop.matches(':hover') && cur && !cur.matches(':hover')) close(); }, 150); });
  }
  document.addEventListener('mouseover', function(e){ var el = e.target.closest && e.target.closest('.gl'); if (el && el !== cur && matchMedia('(hover: hover)').matches) open(el); });
  document.addEventListener('mouseout', function(e){ var el = e.target.closest && e.target.closest('.gl'); if (el && matchMedia('(hover: hover)').matches) setTimeout(function(){ if (pop && !pop.matches(':hover') && !el.matches(':hover')) close(); }, 200); });
  document.addEventListener('click', function(e){ var el = e.target.closest && e.target.closest('.gl'); if (el) { e.preventDefault(); if (cur === el) close(); else open(el); return; } if (pop && !pop.contains(e.target)) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); if ((e.key === 'Enter' || e.key === ' ') && document.activeElement.classList.contains('gl')) { e.preventDefault(); open(document.activeElement); } });
  window.addEventListener('scroll', close, {passive:true});
})();

/* hero: crossfading scenes from the map, a separate set for After Dark; caption links to the place */
(function(){
  var sets = document.querySelectorAll('.hero .slides'), cap = document.querySelector('.slidecap'); if (!sets.length) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function visible(){ for (var i = 0; i < sets.length; i++) if (sets[i].offsetParent !== null || getComputedStyle(sets[i]).display !== 'none') return sets[i]; return sets[0]; }
  function setCap(img){ if (!cap || !img) return; cap.querySelector('b').textContent = img.dataset.cap; cap.href = img.dataset.href; }
  function step(){
    var s = visible(), imgs = s.querySelectorAll('img'), cur = s.querySelector('img.on'), i = Array.prototype.indexOf.call(imgs, cur);
    var next = imgs[(i + 1) % imgs.length];
    if (next.dataset.src && !(next.complete && next.naturalWidth)) { warm(next); return; }
    cap && cap.classList.add('fade');
    setTimeout(function(){ if (cur) cur.classList.remove('on'); next.classList.remove('on'); void next.offsetWidth; next.classList.add('on'); setCap(next); cap && cap.classList.remove('fade'); warmNext(s); }, 400);
  }
  function warm(img){ if (img && img.dataset.src && !img.getAttribute('src')) img.src = img.dataset.src; }
  function warmNext(s){ var imgs = s.querySelectorAll('img'), cur = s.querySelector('img.on'), i = Array.prototype.indexOf.call(imgs, cur); warm(imgs[(i + 1) % imgs.length]); }
  window.addEventListener('load', function(){ setTimeout(function(){ warmNext(visible()); }, 800); });
  setCap(visible().querySelector('img.on'));
  document.querySelectorAll('[data-mode]').forEach(function(b){ b.addEventListener('click', function(){ setTimeout(function(){ setCap(visible().querySelector('img.on')); warmNext(visible()); }, 30); }); });
  setInterval(step, reduce ? 12000 : 7000);
})();

/* scroll reveal */
(function(){
  if (!('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var els = document.querySelectorAll('main .sec .head, main .card, main .row, main .pcard, main .win, main .stat, main .house, main .post, main .listcard');
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, {rootMargin:'0px 0px -8% 0px'});
  els.forEach(function(el){
    var r = el.getBoundingClientRect(); if (r.top < window.innerHeight) return;
    var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    el.style.transitionDelay = Math.min(sib, 5) * 70 + 'ms';
    el.classList.add('rv'); io.observe(el);
  });
})();
