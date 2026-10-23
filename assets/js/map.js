/* Hornell campus map: overview -> district -> place. Data in assets/data/map.js. Deep links: map.html#north or #north/mueller */
(function(){
  var M = window.HORNELL_MAP, root = document.getElementById('mapx'); if (!M || !root) return;
  var IMG = 'assets/img/map/';
  var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var VW = 2000, VH = 1333;
  var stage = root.querySelector('.mx-stage'), lv1 = root.querySelector('.mx-lv1'), lv2 = root.querySelector('.mx-lv2'),
      art = lv2.querySelector('img'), pins = lv2.querySelector('.mx-pins'), lv2in = lv2.querySelector('.mx-in'),
      panel = root.querySelector('.mx-panel'), crumbs = root.querySelector('.mx-crumbs'), list = root.querySelector('.mx-list'),
      back = root.querySelector('.mx-back'), lv3 = root.querySelector('.mx-lv3'), lv3img = lv3.querySelector('img'), svg = lv1.querySelector('svg'), labels = lv1.querySelector('.mx-labels');
  var cur = {d:null, p:null};

  function bbox(poly){ var xs = poly.map(function(p){return p[0];}), ys = poly.map(function(p){return p[1];});
    return {x0:Math.min.apply(0,xs), y0:Math.min.apply(0,ys), x1:Math.max.apply(0,xs), y1:Math.max.apply(0,ys)}; }
  function centroid(poly){ var b = bbox(poly); return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; }
  var LABEL_AT = {rail:[230, 1180], north:[1500, 140]};

  // ---------- level 1: districts ----------
  M.districts.forEach(function(d){
    var a = document.createElementNS('http://www.w3.org/2000/svg', 'a');
    a.setAttribute('href', '#' + d.id); a.setAttribute('class', 'mx-d'); a.setAttribute('aria-label', d.name);
    var pg = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    pg.setAttribute('points', d.poly.map(function(p){ return p.join(','); }).join(' '));
    a.appendChild(pg); svg.appendChild(a);
    var c = LABEL_AT[d.id] || centroid(d.poly), l = document.createElement('a');
    l.className = 'mx-label'; l.href = '#' + d.id; l.dataset.d = d.id; l.style.left = (c[0] / VW * 100) + '%'; l.style.top = (c[1] / VH * 100) + '%';
    l.innerHTML = '<b>' + esc(d.name) + '</b><small>' + esc(d.kick) + '</small>';
    labels.appendChild(l);
    a.addEventListener('mouseenter', function(){ l.classList.add('on'); }); a.addEventListener('mouseleave', function(){ l.classList.remove('on'); });
  });

  function renderList(){
    if (!cur.d) {
      list.innerHTML = '<p class="mx-hint">' + '<span class="day">Choose a district on the map, or from the list.</span><span class="night">Pick a part of town. Everything is closer than it looks, except the walk back up the hill.</span></p>' +
        M.districts.map(function(d){ return '<a class="mx-item" href="#' + d.id + '"><b>' + esc(d.name) + '</b><span>' + esc(d.kick) + '</span></a>'; }).join('');
    } else {
      list.innerHTML = '<p class="mx-hint"><span class="day">' + esc(cur.d.d) + '</span><span class="night">' + esc(cur.d.n) + '</span></p>' +
        cur.d.places.map(function(p){ return '<a class="mx-item' + (cur.p === p ? ' on' : '') + '" href="#' + cur.d.id + '/' + p.id + '"><b>' + esc(p.name) + '</b><span>' + esc(p.kick) + '</span></a>'; }).join('');
    }
  }
  function renderCrumbs(){
    var h = '<a href="#">Hornell</a>';
    if (cur.d) h += ' <i>›</i> <a href="#' + cur.d.id + '">' + esc(cur.d.name) + '</a>';
    if (cur.p) h += ' <i>›</i> <span>' + esc(cur.p.name) + '</span>';
    crumbs.innerHTML = h; back.hidden = !cur.d;
  }

  // ---------- transitions ----------
  function zoomOverviewTo(d){
    if (!d) { lv1.style.transform = ''; return; }
    var b = bbox(d.poly), cx = (b.x0 + b.x1) / 2 / VW, cy = (b.y0 + b.y1) / 2 / VH;
    var s = Math.min(3.2, Math.max(1.4, Math.min(VW / (b.x1 - b.x0), VH / (b.y1 - b.y0)) * 0.95));
    lv1.style.transformOrigin = (cx * 100) + '% ' + (cy * 100) + '%';
    lv1.style.transform = 'translate(' + ((0.5 - cx) * 100) + '%,' + ((0.5 - cy) * 100) + '%) scale(' + s + ')';
  }
  function showDistrict(d){
    art.src = IMG + d.art + '.webp'; art.alt = d.name;
    pins.innerHTML = d.places.map(function(p){
      return '<a class="mx-pin' + (p.img ? ' art' : '') + '" href="#' + d.id + '/' + p.id + '" style="left:' + p.x + '%;top:' + p.y + '%" aria-label="' + esc(p.name) + '"><i></i><span>' + esc(p.name) + '</span></a>';
    }).join('');
  }
  function zoomPlace(p){
    if (!p) { lv2in.style.transform = ''; return; }
    var s = 1.9, wide = window.innerWidth > 900, tx = wide ? 33 : 50, ty = 50;
    var ox = Math.min(0, Math.max((1 - s) * 100, tx - s * p.x)), oy = Math.min(0, Math.max((1 - s) * 100, ty - s * p.y));
    lv2in.style.transformOrigin = '0 0';
    lv2in.style.transform = 'translate(' + ox + '%,' + oy + '%) scale(' + s + ')';
  }
  function showPlaceArt(p){
    stage.classList.remove('mx-in3');
    if (!p || !p.img) return;
    var want = IMG + p.img + '.webp';
    lv3img.onload = function(){ if (cur.p === p) stage.classList.add('mx-in3'); };
    lv3img.onerror = function(){};
    lv3img.alt = p.name; lv3img.src = want;
    if (lv3img.complete && lv3img.naturalWidth) stage.classList.add('mx-in3');
  }
  function renderPanel(){
    var p = cur.p;
    if (!p) { panel.hidden = true; panel.innerHTML = ''; return; }
    panel.innerHTML =
      '<p class="mx-k">' + esc(p.kick) + '</p><h3>' + esc(p.name) + '</h3>' +
      '<p class="day">' + esc(p.d) + '</p><p class="night">' + esc(p.n) + '</p>' +
      (p.link ? '<a class="mx-go" href="' + p.link + '">' + (/\.html$/.test(p.link) && p.link.indexOf('#') < 0 && !/^(campus|athletics|greek|students|index)\.html/.test(p.link) ? 'Visit their website' : 'Read more') + ' →</a>' : '') +
      '<a class="mx-close" href="#' + cur.d.id + '">← Back to ' + esc(cur.d.name) + '</a>';
    panel.hidden = false;
  }

  function route(){
    var h = decodeURIComponent((location.hash || '').slice(1)).split('/'), d = null, p = null;
    M.districts.forEach(function(x){ if (x.id === h[0]) d = x; });
    if (d && h[1]) d.places.forEach(function(x){ if (x.id === h[1]) p = x; });
    var was = cur.d; cur.d = d; cur.p = p;
    if (d) {
      if (was !== d) { showDistrict(d); zoomOverviewTo(d); stage.classList.add('mx-zooming'); lv2in.style.transform = '';
        setTimeout(function(){ stage.classList.add('mx-in2'); stage.classList.remove('mx-zooming'); }, was ? 0 : 650); }
      else stage.classList.add('mx-in2');
      zoomPlace(p);
    } else {
      stage.classList.remove('mx-in2'); zoomPlace(null); setTimeout(function(){ zoomOverviewTo(null); }, 120);
    }
    showPlaceArt(p); renderPanel(); renderCrumbs(); renderList();
  }
  back.addEventListener('click', function(){ location.hash = cur.p ? cur.d.id : ''; });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && cur.d) location.hash = cur.p ? cur.d.id : ''; });
  window.addEventListener('hashchange', route);
  route();
})();
