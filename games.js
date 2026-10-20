/* GenAlpha Padhai Games - Class 1-6. Questions are generated per class + level,
   so every level is different. Progress is saved in this browser (localStorage). */
(function () {
'use strict';
var $ = function (i) { return document.getElementById(i); };
var R = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
var pick = function (a) { return a[R(0, a.length - 1)]; };
var shuf = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = R(0, i), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
var KEY = 'ga_games_v1', LBK = 'ga_lb_v1';
function jget(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
var S = jget(KEY, {});
S.stars = S.stars || 0; S.score = S.score || 0; S.lvl = S.lvl || {}; S.best = S.best || {}; S.perfect = S.perfect || 0; S.played = S.played || {}; S.dailyCount = S.dailyCount || 0;
function save() { jset(KEY, S); }

/* ---------- helpers ---------- */
function mk(q, c, w) { // question with options; c = correct, w = wrong list
  var o = [String(c)]; w.forEach(function (x) { x = String(x); if (o.indexOf(x) < 0 && o.length < 4) o.push(x); });
  o = shuf(o); return { q: q, o: o, a: o.indexOf(String(c)) };
}
function numQ(q, c) {
  var w = [], g = 0, sp = Math.max(3, Math.round(Math.abs(c) * 0.15));
  while (w.length < 3 && g++ < 60) { var x = c + pick([-1, 1]) * R(1, sp); if (x !== c && x >= 0 && w.indexOf(x) < 0) w.push(x); }
  return mk(q, c, w);
}
function bank(list, used) { // list of [q,a,w1,w2,w3]; avoid repeats inside one level
  var left = list.filter(function (x, i) { return used.indexOf(i) < 0; }); if (!left.length) { used.length = 0; left = list; }
  var it = pick(left); used.push(list.indexOf(it));
  return mk(it[0], it[1], it.slice(2));
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }

/* ---------- data ---------- */
var OPP = 'hot|cold,big|small,up|down,day|night,happy|sad,fast|slow,hard|soft,old|new,early|late,full|empty,light|dark,strong|weak,rich|poor,clean|dirty,open|close,brave|coward,ancient|modern,expand|shrink,generous|selfish,victory|defeat'.split(',').map(function (x) { return x.split('|'); });
var SYN = 'big|large,small|tiny,happy|glad,smart|clever,quick|fast,begin|start,end|finish,angry|mad,pretty|beautiful,rich|wealthy,silent|quiet,huge|enormous,courage|bravery,difficult|hard,assist|help'.split(',').map(function (x) { return x.split('|'); });
var SPELL = 'because,friend,school,beautiful,elephant,tomorrow,library,separate,necessary,calendar,garden,orange,mountain,festival'.split(',');
var NV = 'run|Verb,apple|Noun,jump|Verb,teacher|Noun,sing|Verb,river|Noun,write|Verb,Delhi|Noun,swim|Verb,happiness|Noun,dance|Verb,book|Noun'.split(',').map(function (x) { return x.split('|'); });
var SCR = [['cat', 'dog', 'sun', 'pen', 'hat', 'bus', 'cow', 'egg'], ['tree', 'book', 'fish', 'milk', 'bird', 'star', 'moon', 'rain'], ['apple', 'chair', 'mango', 'plant', 'water', 'tiger', 'horse', 'clock'], ['school', 'flower', 'garden', 'orange', 'pencil', 'window', 'rabbit'], ['elephant', 'teacher', 'kitchen', 'pumpkin', 'penguin', 'holiday'], ['umbrella', 'mountain', 'adventure', 'calendar', 'triangle', 'festival']];
var PAIRS = [['🍎', 'Apple'], ['🍌', 'Banana'], ['🐘', 'Elephant'], ['🐅', 'Tiger'], ['🌞', 'Sun'], ['🌙', 'Moon'], ['⭐', 'Star'], ['🚌', 'Bus'], ['🐟', 'Fish'], ['🦁', 'Lion'], ['🍇', 'Grapes'], ['🥭', 'Mango'], ['🐄', 'Cow'], ['✈️', 'Aeroplane'], ['🌳', 'Tree'], ['🚲', 'Cycle'], ['🦋', 'Butterfly'], ['🍍', 'Pineapple'], ['🍓', 'Strawberry'], ['☂️', 'Umbrella'], ['🌈', 'Rainbow'], ['🍉', 'Watermelon']];
var HINDI = [['अ', 'अनार', '🍎'], ['आ', 'आम', '🥭'], ['ऊ', 'ऊँट', '🐪'], ['क', 'कमल', '🪷'], ['ख', 'खरगोश', '🐰'], ['घ', 'घड़ी', '⏰'], ['च', 'चम्मच', '🥄'], ['छ', 'छाता', '☂️'], ['ज', 'जहाज़', '🚢'], ['ट', 'टमाटर', '🍅'], ['त', 'तरबूज़', '🍉'], ['प', 'पतंग', '🪁'], ['ब', 'बतख', '🦆'], ['भ', 'भालू', '🐻'], ['म', 'मछली', '🐟'], ['श', 'शेर', '🦁'], ['ह', 'हाथी', '🐘']];
var CAPS = 'Maharashtra|Mumbai,Rajasthan|Jaipur,Gujarat|Gandhinagar,Tamil Nadu|Chennai,West Bengal|Kolkata,Uttar Pradesh|Lucknow,Bihar|Patna,Karnataka|Bengaluru,Kerala|Thiruvananthapuram,Punjab|Chandigarh,Madhya Pradesh|Bhopal,Assam|Dispur,Odisha|Bhubaneswar,Telangana|Hyderabad,Goa|Panaji,Himachal Pradesh|Shimla'.split(',').map(function (x) { return x.split('|'); });
var GKF = [
  ['Bharat ka rashtriya pashu?', 'Baagh (Tiger)', 'Sher', 'Haathi', 'Bhaalu'], ['Rashtriya pakshi?', 'Mor (Peacock)', 'Tota', 'Kabootar', 'Kauwa'],
  ['Rashtriya phool?', 'Kamal (Lotus)', 'Gulab', 'Sunflower', 'Genda'], ['Rashtriya phal?', 'Aam (Mango)', 'Seb', 'Kela', 'Angoor'],
  ['Rashtriya nadi?', 'Ganga', 'Yamuna', 'Narmada', 'Godavari'], ['Bharat ki mudra?', 'Rupaya', 'Dollar', 'Dinar', 'Taka'],
  ['Tirange mein sabse upar kaun sa rang?', 'Kesariya', 'Hara', 'Safed', 'Neela'], ['Ashok Chakra mein kitni tilliyan?', '24', '12', '16', '32'],
  ['Bharat ki rajdhani?', 'New Delhi', 'Mumbai', 'Kolkata', 'Jaipur'], ['Swatantrata Diwas kab?', '15 August', '26 January', '2 October', '14 November'],
  ['Ganatantra Diwas kab?', '26 January', '15 August', '2 October', '5 September'], ['Gandhi Jayanti kab?', '2 October', '15 August', '14 November', '5 September'],
  ['Bharat ke pehle Pradhan Mantri?', 'Jawaharlal Nehru', 'Sardar Patel', 'Dr. Ambedkar', 'Subhash Bose'], ['Taj Mahal kis sheher mein hai?', 'Agra', 'Delhi', 'Jaipur', 'Lucknow'], ['Bharat mein kitne rajya hain?', '28', '25', '30', '22']];
var SCI = [
  ['Paudhe khana kahan banate hain?', 'Patte', 'Jad', 'Tana', 'Phool'], ['Khana banate waqt paudhe kaun si gas lete hain?', 'Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'],
  ['Dil ka kaam kya hai?', 'Khoon pump karna', 'Khana pachana', 'Saans lena', 'Sochna'], ['Saans lene ka ang?', 'Phephde (lungs)', 'Dil', 'Pet', 'Gurda'],
  ['Adult ke sharir mein kitni haddiyan?', '206', '106', '306', '56'], ['Suraj ke sabse paas ka grah?', 'Mercury', 'Venus', 'Earth', 'Mars'],
  ['Sabse bada grah?', 'Jupiter', 'Saturn', 'Earth', 'Mars'], ['Chaand kis ki parikrama karta hai?', 'Prithvi', 'Suraj', 'Mars', 'Jupiter'],
  ['Din-raat kyun hote hain?', 'Prithvi ke ghoomne se', 'Chaand ke ghoomne se', 'Suraj ke ghoomne se', 'Baadalon se'], ['Gaay kaun sa jaanwar hai?', 'Mammal', 'Panchhi', 'Reptile', 'Machhli'],
  ['Titli ke bachche ko kya kehte hain?', 'Caterpillar', 'Tadpole', 'Chick', 'Puppy'], ['Zyada ped lagane se kya hota hai?', 'Hawa saaf hoti hai', 'Pradushan badhta hai', 'Garmi badhti hai', 'Kuch nahi'],
  ['Kachra kahan dalna chahiye?', 'Dustbin mein', 'Sadak par', 'Nadi mein', 'Ghar ke bahar'], ['Sunne ke liye kaun sa ang?', 'Kaan', 'Aankh', 'Naak', 'Jeebh'],
  ['Paani kis temperature par ubalta hai?', '100°C', '0°C', '50°C', '200°C'], ['Paani 0°C par kya ban jata hai?', 'Baraf', 'Bhaap', 'Tel', 'Dhuaan']];

/* ---------- question generators: (class, level, usedList) -> question ---------- */
function clockSvg(h, m) {
  function pt(a, l) { var r = a * Math.PI / 180; return [(50 + l * Math.sin(r)).toFixed(1), (50 - l * Math.cos(r)).toFixed(1)]; }
  var t = '', i, ha = pt((h % 12 + m / 60) * 30, 24), ma = pt(m * 6, 36);
  for (i = 1; i <= 12; i++) { var p = pt(i * 30, 38); t += '<text x="' + p[0] + '" y="' + (+p[1] + 3) + '" font-size="9" text-anchor="middle" fill="#241f14">' + i + '</text>'; }
  return '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#fff" stroke="#ff8c42" stroke-width="4"/>' + t + '<line x1="50" y1="50" x2="' + ha[0] + '" y2="' + ha[1] + '" stroke="#241f14" stroke-width="4" stroke-linecap="round"/><line x1="50" y1="50" x2="' + ma[0] + '" y2="' + ma[1] + '" stroke="#e5584a" stroke-width="2.5" stroke-linecap="round"/></svg>';
}
function pizza(n, k) {
  var s = '<svg viewBox="0 0 100 100">';
  for (var i = 0; i < n; i++) {
    var a = i * 2 * Math.PI / n - Math.PI / 2, b = (i + 1) * 2 * Math.PI / n - Math.PI / 2;
    s += '<path d="M50 50L' + (50 + 45 * Math.cos(a)).toFixed(1) + ' ' + (50 + 45 * Math.sin(a)).toFixed(1) + 'A45 45 0 0 1 ' + (50 + 45 * Math.cos(b)).toFixed(1) + ' ' + (50 + 45 * Math.sin(b)).toFixed(1) + 'Z" fill="' + (i < k ? '#ff8c42' : '#fff') + '" stroke="#241f14" stroke-width="1.5"/>';
  }
  return s + '</svg>';
}
function mutate(w) { var i = R(0, w.length - 2), a = w.split(''), t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; var s = a.join(''); return s === w ? w.slice(0, i) + w.slice(i + 1) : s; }
function seq(c, l) {
  var k = R(0, Math.min(5, c - 1)), a = R(1, 10 + l * 2), d = R(1, 2 + c), t = [], i;
  if (k === 0 || k === 1) for (i = 0; i < 6; i++) t.push(a + d * i * (k ? -1 : 1) + (k ? d * 6 : 0));
  else if (k === 2) for (i = 0; i < 6; i++) t.push(a + (i % 2 ? d : 0) + Math.floor(i / 2) * d * 2);
  else if (k === 3) { a = R(1, 4); var m = R(2, 3); for (i = 0; i < 6; i++) t.push(a * Math.pow(m, i)); }
  else if (k === 4) for (i = 1; i <= 6; i++) t.push(i * i);
  else { t = [1, 1]; for (i = 2; i < 6; i++) t.push(t[i - 1] + t[i - 2]); }
  var ans = t.pop(); return numQ(t.join(', ') + ', ?', ans);
}
var G = {
  math: function (c, l) {
    var m = 10 * c + 3 * l, ops = ['+', '−']; if (c >= 3) ops.push('×'); if (c >= 4) ops.push('÷');
    var op = pick(ops), a, b, r;
    if (op === '+') { a = R(1, m); b = R(1, m); r = a + b; } else if (op === '−') { a = R(2, m); b = R(1, a); r = a - b; }
    else if (op === '×') { a = R(2, 6 + c + Math.floor(l / 2)); b = R(2, 9 + Math.floor(l / 3)); r = a * b; }
    else { b = R(2, 6 + Math.floor(l / 2)); r = R(2, 10 + l); a = b * r; }
    return numQ(a + ' ' + op + ' ' + b + ' = ?', r);
  },
  tables: function (c, l) { var t = R(2, Math.min(20, c + 5 + Math.floor(l / 2))), b = R(1, 10 + Math.min(10, l)); return numQ(t + ' × ' + b + ' = ?', t * b); },
  word: function (c, l) {
    var k = R(0, 3), it, w;
    if (k === 0) { it = pick(OPP); w = shuf(OPP.filter(function (x) { return x !== it; })).slice(0, 3).map(function (x) { return x[1]; }); return mk('Opposite of <b>' + it[0] + '</b>?', it[1], w); }
    if (k === 1) { it = pick(SYN); w = shuf(SYN.filter(function (x) { return x !== it; })).slice(0, 3).map(function (x) { return x[1]; }); return mk('Same meaning as <b>' + it[0] + '</b>?', it[1], w); }
    if (k === 2) { it = pick(SPELL); return mk('Sahi spelling kaunsi?', it, [mutate(it), it.slice(0, -1), it + it[it.length - 1]]); }
    it = pick(NV); return mk('<b>' + it[0] + '</b> kya hai?', it[1], [it[1] === 'Noun' ? 'Verb' : 'Noun']);
  },
  scramble: function (c) {
    var pool = []; for (var i = 0; i < c; i++) pool = pool.concat(SCR[i]); var w = pick(pool), s = w, g = 0;
    while (s === w && g++ < 20) s = shuf(w.split('')).join('');
    return { q: s.toUpperCase().split('').join(' '), input: true, ans: w };
  },
  gk: function (c, l, u) { return Math.random() < 0.5 ? bank(GKF, u) : (function () { var it = pick(CAPS), w = shuf(CAPS.filter(function (x) { return x !== it; })).slice(0, 3).map(function (x) { return x[1]; }); return mk(it[0] + ' ki rajdhani?', it[1], w); })(); },
  sci: function (c, l, u) { return bank(SCI, u); },
  puzzle: function (c, l) {
    if (c >= 3 && Math.random() < 0.35) {
      var n = shuf(['Ram', 'Shyam', 'Mohan', 'Sita', 'Gita', 'Rita']).slice(0, 3);
      return mk(n[0] + ', ' + n[1] + ' se bada hai. ' + n[1] + ', ' + n[2] + ' se bada hai. Sabse chhota kaun?', n[2], [n[0], n[1]]);
    }
    return seq(c, l);
  },
  money: function (c, l) {
    var s = 10 * c + 4 * l, a, b;
    if (c <= 2) { a = R(1, s); b = R(1, s); return numQ('₹' + a + ' + ₹' + b + ' = kitne rupaye?', a + b); }
    if (c <= 4) { a = R(10, s * 2); b = R(1, a - 1); return numQ('Ramu ke paas ₹' + a + ' the. Usne ₹' + b + ' kharch kiye. Kitne bache?', a - b); }
    a = R(5, s); b = R(5, s); var q = R(2, 5); return numQ('1 pen ₹' + a + ' ka hai. ' + q + ' pen aur ₹' + b + ' ki copy ka total kitna?', a * q + b);
  },
  clock: function (c) {
    var h = R(1, 12), m = c <= 2 ? pick([0, 30]) : c <= 4 ? 5 * R(0, 11) : R(0, 59), f = function (x, y) { return x + ':' + pad(y); };
    var q = mk('<div>' + clockSvg(h, m) + '</div>', f(h, m), [f(h % 12 + 1, m), f(h, (m + 15) % 60), f(R(1, 12), (m + 30) % 60), f(h, (m + 5) % 60)]);
    q.q = clockSvg(h, m); return q;
  },
  fraction: function (c, l) {
    var n = R(2, Math.min(8, 3 + Math.floor(c / 2) + Math.floor(l / 3))), k = R(1, n - 1);
    if (c >= 5 && n > 3 && Math.random() < 0.5) { var a = R(1, n - 2), b = R(1, n - 1 - a); return mk(a + '/' + n + ' + ' + b + '/' + n + ' = ?', (a + b) + '/' + n, [(a + b) + '/' + (2 * n), a + '/' + n, (a + b + 1) + '/' + n]); }
    var w = []; for (var i = 1; i < n; i++) if (i !== k) w.push(i + '/' + n); w.push(k + '/' + (n + 1));
    return mk(pizza(n, k) + '<div style="font-size:18px">Kitna hissa rangeen hai?</div>', k + '/' + n, shuf(w).slice(0, 3));
  },
  hindi: function () {
    var it = pick(HINDI), w = shuf(HINDI.filter(function (x) { return x !== it; })).slice(0, 3).map(function (x) { return x[0]; });
    return mk('<div><div style="font-size:54px">' + it[2] + '</div>' + it[1] + ' kis akshar se shuru hota hai?</div>', it[0], w);
  },
  bee: function (c) {
    var pool = PAIRS.filter(function (p) { return p[1].length <= 3 + c * 1.5; }), it = pick(pool.length ? pool : PAIRS), name = it[1].toLowerCase(), i = R(1, name.length - 1);
    var w = shuf('abcdefghilmnoprstu'.split('').filter(function (x) { return x !== name[i]; })).slice(0, 3);
    return mk('<div><div style="font-size:54px">' + it[0] + '</div>' + name.slice(0, i) + '_' + name.slice(i + 1) + '</div>', name[i], w);
  }
};
G.speed = function (c, l) { return G.math(c + 1, l + 2); };

/* ---------- game list ---------- */
var GAMES = [
  { id: 'math', n: 'Math Challenge', e: '🧮', d: 'Jodo, ghatao, guna, bhaag' },
  { id: 'speed', n: 'Speed Maths', e: '⚡', d: 'Jaldi calculation', t: 10 },
  { id: 'tables', n: 'Table Champion', e: '✖️', d: 'Pahade, timer ke saath', t: 10 },
  { id: 'word', n: 'Word Master', e: '📖', d: 'Opposite, synonym, spelling', },
  { id: 'scramble', n: 'Word Scramble', e: '🔀', d: 'Bikhre letters sahi karo' },
  { id: 'bee', n: 'Spelling Bee', e: '🐝', d: 'Khoya hua letter dhundho' },
  { id: 'hindi', n: 'Hindi Varnamala', e: 'अ', d: 'Hindi akshar aur shabd' },
  { id: 'pair', n: 'Match the Pair', e: '🍎', d: 'Picture aur naam milao', mem: 'pair' },
  { id: 'memory', n: 'Memory Cards', e: '🃏', d: 'Yaad rakho aur jodo', mem: 'same' },
  { id: 'sci', n: 'Science Explorer', e: '🔬', d: 'Paudhe, sharir, space' },
  { id: 'gk', n: 'GK Master', e: '🇮🇳', d: 'India, rajya, rajdhani' },
  { id: 'puzzle', n: 'Brain Puzzle', e: '🧩', d: 'Pattern aur logic' },
  { id: 'fraction', n: 'Fraction Pizza', e: '🍕', d: 'Hisse pehchano' },
  { id: 'money', n: 'Money Master', e: '💰', d: 'Paise ka hisaab' },
  { id: 'clock', n: 'Clock Master', e: '🕒', d: 'Time dekhna seekho' }
];
var BADGES = [['🌱 Pehla Kadam', function () { return S.stars >= 1; }], ['⭐ 10 Stars', function () { return S.stars >= 10; }], ['🥇 Champion (50★)', function () { return S.stars >= 50; }], ['👑 Legend (150★)', function () { return S.stars >= 150; }],
  ['💯 5 Perfect Levels', function () { return S.perfect >= 5; }], ['🎮 5 Games', function () { return Object.keys(S.played).length >= 5; }], ['🎯 Daily Hero', function () { return S.dailyCount >= 3; }]];

/* ---------- screens ---------- */
function show(id) { ['vSetup', 'vHome', 'vPlay', 'vEnd'].forEach(function (v) { $(v).classList.toggle('hid', v !== id); }); window.scrollTo(0, 0); }
function chips(box, sel, fn) {
  box.innerHTML = ''; for (var c = 1; c <= 6; c++) (function (c) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (c === sel ? ' on' : ''); b.textContent = 'Class ' + c; b.setAttribute('aria-pressed', c === sel);
    b.onclick = function () { fn(c); }; box.appendChild(b);
  })(c);
}
function head() { $('sStars').textContent = '⭐ ' + S.stars; $('sScore').textContent = '🏆 ' + S.score; }
function home() {
  head(); $('hiName').textContent = 'Namaste, ' + S.nick + '!'; chips($('homeClass'), S.cls, function (c) { S.cls = c; save(); home(); });
  var g = $('gameGrid'); g.innerHTML = '';
  GAMES.forEach(function (x) {
    var b = document.createElement('button'); b.className = 'g'; b.type = 'button';
    var lv = S.lvl[x.id + S.cls] || 1;
    b.innerHTML = '<i></i><b></b><small></small><small></small>'; var t = b.children; t[0].textContent = x.e; t[1].textContent = x.n; t[2].textContent = x.d; t[3].textContent = 'Level ' + lv;
    b.onclick = function () { start(x.id, lv); }; g.appendChild(b);
  });
  var bd = $('badges'); bd.innerHTML = ''; BADGES.forEach(function (x) { var s = document.createElement('span'), ok = x[1](); s.textContent = ok ? x[0] : '🔒 ' + x[0].replace(/^\S+\s/, ''); s.style.opacity = ok ? 1 : .5; bd.appendChild(s); });
  var lb = jget(LBK, {}), rows = Object.keys(lb).map(function (k) { return lb[k]; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 10), t = $('lb'); t.innerHTML = '';
  rows.forEach(function (r, i) { var tr = document.createElement('tr'); ['🥇🥈🥉'.match(/./gu)[i] || i + 1, r.n + ' (Class ' + r.c + ')', r.s + ' pts · ' + r.st + '⭐'].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); if (r.n === S.nick && r.c === S.cls) tr.style.fontWeight = 700; t.appendChild(tr); });
  show('vHome');
}

/* ---------- play ---------- */
var cur = null, tm = null;
var today = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
function start(id, lvl) {
  var daily = id === 'daily', g = daily ? { id: 'daily', n: 'Daily Quiz Battle' } : GAMES.filter(function (x) { return x.id === id; })[0];
  cur = { g: g, c: S.cls, l: lvl, i: 0, right: 0, pts: 0, used: [], daily: daily };
  S.played[id] = 1; $('pTitle').textContent = g.e ? g.e + ' ' + g.n : '🎯 ' + g.n; $('pLvl').textContent = daily ? today() : 'Class ' + S.cls + ' · Level ' + lvl;
  show('vPlay'); if (g.mem) memGame(); else nextQ();
}
function genQ() {
  var id = cur.g.id; if (cur.daily) id = pick(['math', 'word', 'gk', 'sci', 'puzzle', 'money', 'hindi']);
  return G[id](cur.c, cur.daily ? 3 : cur.l, cur.used);
}
function nextQ() {
  clearInterval(tm); if (cur.i >= 5) return finish();
  $('pBar').style.width = (cur.i * 20) + '%'; $('pMem').classList.add('hid');
  var q = cur.q = genQ(), box = $('pOpts'); $('pQ').innerHTML = q.q; box.innerHTML = ''; cur.done = false;
  $('pIn').classList.toggle('hid', !q.input); box.classList.toggle('hid', !!q.input);
  if (q.input) { $('pAns').value = ''; $('pAns').focus(); }
  else q.o.forEach(function (t, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'o'; b.textContent = t; b.onclick = function () { answer(i); }; box.appendChild(b); });
  var T = cur.g.t; $('pTimer').textContent = '';
  if (T) { cur.left = T; $('pTimer').textContent = '⏱ ' + T; tm = setInterval(function () { cur.left--; $('pTimer').textContent = '⏱ ' + cur.left; if (cur.left <= 0) { clearInterval(tm); answer(-1); } }, 1000); }
}
function answer(i, txt) {
  if (cur.done) return; cur.done = true; clearInterval(tm); var q = cur.q, ok;
  if (q.input) { ok = (txt || '').trim().toLowerCase() === q.ans; $('pQ').innerHTML += '<div style="font-size:18px;margin-top:6px">' + (ok ? '✅ Sahi!' : '❌ Sahi jawab: ' + q.ans) + '</div>'; }
  else { ok = i === q.a; var bs = $('pOpts').children; if (bs[q.a]) bs[q.a].classList.add('ok'); if (!ok && bs[i]) bs[i].classList.add('no'); }
  if (ok) { cur.right++; cur.pts += 10 + (cur.g.t ? Math.max(0, cur.left) : 0); }
  setTimeout(function () { cur.i++; nextQ(); }, q.input && !ok ? 1800 : 900);
}
function memGame() {
  var l = cur.l, n = Math.min(10, 3 + Math.ceil(l / 2)), cards = [], pairs = shuf(PAIRS).slice(0, n), first = null, lock = false, moves = 0, done = 0;
  pairs.forEach(function (p, k) { if (cur.g.mem === 'pair') { cards.push({ k: k, t: p[0], big: 1 }); cards.push({ k: k, t: p[1] }); } else { cards.push({ k: k, t: p[0], big: 1 }); cards.push({ k: k, t: p[0], big: 1 }); } });
  $('pOpts').classList.add('hid'); $('pIn').classList.add('hid'); $('pTimer').textContent = '';
  $('pQ').innerHTML = cur.g.mem === 'pair' ? 'Picture ko uske naam se milao' : 'Ek jaisi cards milao'; $('pQ').style.minHeight = '40px'; $('pBar').style.width = '0';
  var m = $('pMem'); m.innerHTML = ''; m.classList.remove('hid');
  shuf(cards).forEach(function (cd) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'mc'; b.textContent = '?'; b.setAttribute('aria-label', 'card');
    b.onclick = function () {
      if (lock || b.classList.contains('up') || b.classList.contains('done')) return;
      b.classList.add('up'); b.textContent = cd.t; if (!cd.big) b.classList.add('t');
      if (!first) { first = { b: b, cd: cd }; return; }
      moves++; var f = first; first = null;
      if (f.cd.k === cd.k) { f.b.classList.add('done'); b.classList.add('done'); done++; $('pBar').style.width = (done / n * 100) + '%'; if (done === n) setTimeout(function () { cur.q0 = moves; cur.right = moves <= n * 1.6 ? 5 : moves <= n * 2.6 ? 4 : 3; cur.pts = Math.max(10, n * 15 - moves * 3); $('pQ').style.minHeight = ''; finish(); }, 600); }
      else { lock = true; setTimeout(function () { [f.b, b].forEach(function (x) { x.classList.remove('up', 't'); x.textContent = '?'; }); lock = false; }, 800); }
    };
    m.appendChild(b);
  });
}
function finish() {
  clearInterval(tm); $('pQ').style.minHeight = ''; var r = cur.right, st = r === 5 ? 3 : r === 4 ? 2 : r === 3 ? 1 : 0, pass = r >= 3, key = cur.g.id + S.cls + '_' + cur.l, extra = 0;
  if (cur.daily) { if (S.daily === today()) cur.pts = Math.floor(cur.pts / 2); else { S.daily = today(); S.dailyCount++; extra = 50; } }
  var gain = Math.max(0, st - (S.best[key] || 0)); if (!cur.daily) { S.best[key] = Math.max(S.best[key] || 0, st); S.stars += gain; if (st === 3) S.perfect++; } else S.stars += st;
  S.score += cur.pts + extra;
  if (!cur.daily && pass && (S.lvl[cur.g.id + S.cls] || 1) === cur.l) S.lvl[cur.g.id + S.cls] = cur.l + 1;
  var lb = jget(LBK, {}); lb[S.nick + '|' + S.cls] = { n: S.nick, c: S.cls, s: S.score, st: S.stars }; jset(LBK, lb); save(); head();
  $('eTitle').textContent = pass ? 'Shabash, ' + S.nick + '! 🎉' : 'Thoda aur try karo 💪';
  $('eStars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('eMsg').textContent = r + '/5 sahi · +' + (cur.pts + extra) + ' points' + (extra ? ' (daily bonus!)' : '') + (pass ? '' : ' · Agle level ke liye 3 sahi chahiye.');
  var nb = $('nextBtn'); nb.classList.toggle('hid', cur.daily); nb.textContent = pass ? 'Agla level ▶' : 'Dobara khelo ↻';
  nb.onclick = function () { start(cur.g.id, pass ? cur.l + 1 : cur.l); }; show('vEnd');
}

/* ---------- wiring ---------- */
var pickCls = S.cls || 1;
function setupChips() { chips($('setupClass'), pickCls, function (c) { pickCls = c; setupChips(); }); }
setupChips();
$('goBtn').onclick = function () { var n = $('nick').value.trim(); if (!n) { $('nick').focus(); return; } S.nick = n.slice(0, 14); S.cls = pickCls; save(); home(); };
$('dailyBtn').onclick = function () { start('daily', 1); };
$('quitBtn').onclick = function () { clearInterval(tm); cur = null; home(); };
$('homeBtn').onclick = home;
$('pCheck').onclick = function () { answer(0, $('pAns').value); };
$('pAns').onkeydown = function (e) { if (e.key === 'Enter') answer(0, this.value); };
if (S.nick && S.cls) home(); else { show('vSetup'); }
})();
