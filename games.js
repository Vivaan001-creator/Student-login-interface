/* GenAlpha Padhai Games - ONLY for Class 1 and 2. English text with a Hindi translate button.
   Every level has NEW questions (a question is never repeated). If a topic has few questions, the game has fewer levels. */
(function () {
'use strict';
var $ = function (i) { return document.getElementById(i); };
var R = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
var pick = function (a) { return a[R(0, a.length - 1)]; };
var shuf = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = R(0, i), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
var KEY = 'ga_games_v2', LBK = 'ga_lb_v1';
function jget(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
var S = jget(KEY, {});
S.stars = S.stars || 0; S.score = S.score || 0; S.lvl = S.lvl || {}; S.best = S.best || {}; S.perfect = S.perfect || 0; S.played = S.played || {}; S.dailyCount = S.dailyCount || 0; S.qs = S.qs || {};
function save() { jset(KEY, S); }
var gate = null; try { gate = localStorage.getItem('ga_stu_class'); } catch (e) {}
var allowed = !gate || gate === '1' || gate === '2';
if (gate === '1' || gate === '2') S.cls = +gate;
if (S.cls !== 1 && S.cls !== 2) S.cls = 0;

/* ---------- question helpers ---------- */
function mk(en, hi, c, w, vis) {
  var o = [String(c)]; w.forEach(function (x) { x = String(x); if (o.indexOf(x) < 0 && o.length < 4) o.push(x); });
  o = shuf(o); return { vis: vis || '', en: en, hi: hi, o: o, a: o.indexOf(String(c)), sig: en + '|' + c };
}
function numQ(en, hi, c, vis) {
  var w = [], g = 0, sp = Math.max(3, Math.round(c * 0.2));
  while (w.length < 3 && g++ < 80) { var x = c + pick([-1, 1]) * R(1, sp); if (x !== c && x >= 0 && w.indexOf(x) < 0) w.push(x); }
  return mk(en, hi, c, w, vis);
}
function wrongSpell(w) {
  var n = w.length, sw = function (i) { var a = w.split(''), t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; return a.join(''); };
  return shuf([sw(1), sw(n - 2), w.slice(0, 1) + w.slice(2), w.slice(0, -1), w.slice(0, 2) + w[1] + w.slice(2)]).filter(function (x) { return x !== w; });
}

/* ---------- data ---------- */
function words(s) { return s.split(' ').map(function (x) { var m = x.match(/^([a-z]+)(.+)$/); return [m[1], m[2]]; }); }
var W1 = words('cat🐱 dog🐶 sun☀️ bus🚌 hat🎩 cow🐄 pig🐷 egg🥚 cup☕ bed🛏️ car🚗 bat🦇 fox🦊 ant🐜 owl🦉 hen🐔 key🔑 pen🖊️ bee🐝 map🗺️ rat🐀 bag🎒 box📦 ice🧊 web🕸️ van🚐 tap🚰 leg🦵 ear👂');
var W23 = words('fish🐟 bird🐦 duck🦆 frog🐸 star⭐ moon🌙 tree🌳 book📖 ball⚽ cake🎂 milk🥛 rain🌧️ bear🐻 lion🦁 kite🪁 boat⛵ shoe👟 drum🥁 corn🌽 snow❄️ gift🎁 ring💍 king👑 sock🧦 rose🌹 bell🔔 fork🍴 hand✋ nose👃 tent⛺ apple🍎 mango🥭 horse🐴 tiger🐯 clock🕒 chair🪑 bread🍞 grape🍇 plane✈️ house🏠');
var WP = function (c) { return c === 1 ? W1 : W23; };
var pr = function (s) { return s.split(',').map(function (x) { return x.split('|'); }); };
var OPP1 = pr('hot|cold,big|small,up|down,day|night,happy|sad,fast|slow,hard|soft,old|new,full|empty,light|dark,in|out,tall|short,open|close,wet|dry,boy|girl,good|bad,yes|no,sit|stand,come|go,sweet|sour');
var OPP2 = pr('above|below,near|far,early|late,rich|poor,clean|dirty,strong|weak,thick|thin,heavy|light,front|back,inside|outside');
var SYN2 = pr('big|large,small|tiny,happy|glad,quick|fast,begin|start,pretty|beautiful,shut|close,sad|unhappy,smart|clever,mad|angry');
var NV1 = pr('dog|Noun,run|Verb,ball|Noun,jump|Verb,book|Noun,eat|Verb,tree|Noun,sing|Verb,chair|Noun,play|Verb');
var NV2 = pr('teacher|Noun,write|Verb,river|Noun,swim|Verb,garden|Noun,climb|Verb,mother|Noun,dance|Verb,city|Noun,read|Verb');
var SPELL = 'friend school because orange family monkey yellow purple rabbit garden'.split(' ');
var HI = [['आ','आम','Aam','🥭'],['ऊ','ऊँट','Oont','🐪'],['क','कमल','Kamal','🪷'],['ख','खरगोश','Khargosh','🐰'],['घ','घड़ी','Ghadi','⏰'],['च','चम्मच','Chammach','🥄'],['छ','छाता','Chhata','☂️'],['ज','जहाज़','Jahaaz','🚢'],['ट','टमाटर','Tamatar','🍅'],['त','तरबूज़','Tarbooz','🍉'],['प','पतंग','Patang','🪁'],['ब','बतख','Batakh','🦆'],['भ','भालू','Bhaloo','🐻'],['म','मछली','Machhli','🐟'],['श','शेर','Sher','🦁'],['ह','हाथी','Haathi','🐘'],['फ','फूल','Phool','🌸'],['स','सेब','Seb','🍎'],['ग','गाय','Gaay','🐄'],['न','नाव','Naav','⛵'],['द','दरवाज़ा','Darwaaza','🚪'],['र','रेल','Rail','🚂'],['व','वायुयान','Vayuyaan','✈️']];
var GK = [
['National animal of India?','भारत का राष्ट्रीय पशु कौन सा है?','Tiger','Lion','Elephant','Bear'],['National bird of India?','भारत का राष्ट्रीय पक्षी कौन सा है?','Peacock','Parrot','Pigeon','Crow'],
['National flower of India?','भारत का राष्ट्रीय फूल कौन सा है?','Lotus','Rose','Sunflower','Marigold'],['National fruit of India?','भारत का राष्ट्रीय फल कौन सा है?','Mango','Apple','Banana','Grapes'],
['Capital of India?','भारत की राजधानी कौन सी है?','New Delhi','Mumbai','Kolkata','Jaipur'],['Which colour is at the top of our flag?','हमारे झंडे में सबसे ऊपर कौन सा रंग है?','Saffron','Green','White','Blue'],
['How many colours are in our flag?','हमारे झंडे में कितने रंग हैं?','3','2','4','5'],['Independence Day is on?','स्वतंत्रता दिवस कब होता है?','15 August','26 January','2 October','14 November'],
['Republic Day is on?','गणतंत्र दिवस कब होता है?','26 January','15 August','2 October','5 September'],['Gandhi Jayanti is on?','गांधी जयंती कब होती है?','2 October','15 August','14 November','5 September'],
["Teachers' Day is on?",'शिक्षक दिवस कब होता है?','5 September','14 November','15 August','2 October'],["Children's Day is on?",'बाल दिवस कब होता है?','14 November','5 September','26 January','2 October'],
['Which is the festival of lights?','रोशनी का त्योहार कौन सा है?','Diwali','Holi','Eid','Christmas'],['Which is the festival of colours?','रंगों का त्योहार कौन सा है?','Holi','Diwali','Lohri','Baisakhi'],
['What is the money of India called?','भारत के पैसे को क्या कहते हैं?','Rupee','Dollar','Pound','Dinar'],['Who is called the Father of the Nation?','राष्ट्रपिता किसे कहते हैं?','Mahatma Gandhi','Jawaharlal Nehru','Subhash Chandra Bose','Sardar Patel'],
['The Taj Mahal is in which city?','ताजमहल किस शहर में है?','Agra','Delhi','Jaipur','Lucknow'],['National river of India?','भारत की राष्ट्रीय नदी कौन सी है?','Ganga','Yamuna','Godavari','Narmada'],
['Which is our national anthem?','हमारा राष्ट्रगान कौन सा है?','Jana Gana Mana','Vande Mataram','Jai Ho','Saare Jahan Se Achha'],['How many days are in a week?','एक सप्ताह में कितने दिन होते हैं?','7','5','6','8']];
var SCI = [
['Which part helps us see?','कौन सा अंग हमें देखने में मदद करता है?','Eyes','Ears','Nose','Hands'],['We hear with our?','हम किससे सुनते हैं?','Ears','Eyes','Nose','Feet'],
['We smell with our?','हम किससे सूँघते हैं?','Nose','Eyes','Ears','Hands'],['We taste food with our?','हम खाने का स्वाद किससे लेते हैं?','Tongue','Teeth','Eyes','Ears'],
['Plants make food in their?','पौधे अपना भोजन कहाँ बनाते हैं?','Leaves','Roots','Stem','Seeds'],['Which part of a plant is under the soil?','पौधे का कौन सा भाग मिट्टी के नीचे होता है?','Roots','Leaves','Flowers','Fruits'],
['Plants need water, sunlight and?','पौधों को पानी, धूप और क्या चाहिए?','Air','Sand','Sugar','Plastic'],['Which animal gives us milk?','कौन सा जानवर हमें दूध देता है?','Cow','Lion','Tiger','Fox'],
['Which bird cannot fly?','कौन सा पक्षी उड़ नहीं सकता?','Ostrich','Crow','Sparrow','Eagle'],['Which animal lives in water?','कौन सा जानवर पानी में रहता है?','Fish','Dog','Cat','Cow'],
['A baby cat is called a?','बिल्ली के बच्चे को क्या कहते हैं?','Kitten','Puppy','Calf','Chick'],['A baby dog is called a?','कुत्ते के बच्चे को क्या कहते हैं?','Puppy','Kitten','Calf','Chick'],
['What gives us light in the day?','दिन में हमें रोशनी कौन देता है?','Sun','Moon','Stars','Lamp'],['The Moon is seen in the?','चाँद कब दिखाई देता है?','Night','Morning','Noon','Afternoon'],
['Water becomes what when it freezes?','जमने पर पानी क्या बन जाता है?','Ice','Steam','Smoke','Oil'],['Which one is a fruit?','इनमें से कौन सा फल है?','Banana','Potato','Onion','Carrot'],
['How many legs does a spider have?','मकड़ी के कितने पैर होते हैं?','8','6','4','10'],['Which one is a living thing?','इनमें से कौन सजीव है?','Dog','Chair','Stone','Pencil'],
['How many colours are in a rainbow?','इंद्रधनुष में कितने रंग होते हैं?','7','5','6','8'],['Where should we throw waste?','हमें कचरा कहाँ फेंकना चाहिए?','Dustbin','River','Road','Garden']];

/* ---------- generated-question games (gen) and fixed-question games (pool) ---------- */
function mathGen(c, l, speed) {
  var m = speed ? (c === 1 ? 10 : 20) : c === 1 ? (l <= 3 ? 10 : 20) : (l <= 3 ? 50 : 100), op = R(0, (!speed && c === 2 && l >= 7) ? 2 : 1), a, b, r, s;
  if (op === 0) { a = R(1, m - 1); b = R(1, m - a); r = a + b; s = '+'; }
  else if (op === 1) { a = R(2, m); b = R(1, a - 1); r = a - b; s = '−'; }
  else { a = pick([2, 5, 10]); b = R(1, 10); r = a * b; s = '×'; }
  return numQ(a + ' ' + s + ' ' + b + ' = ?', a + ' ' + s + ' ' + b + ' कितना होता है?', r);
}
function seqGen(c, l) {
  var s = pick(c === 1 ? [1, 2, 5, 10] : [2, 3, 4, 5, 10, 20]), down = l >= 4 && Math.random() < 0.5, st = down ? R(s * 4, s * 4 + 30) : R(0, 20), t = [], i;
  for (i = 0; i < 5; i++) t.push(down ? st - s * i : st + s * i);
  var ans = t.pop(), txt = t.join(', ') + ', ?', q = numQ('What comes next?', 'आगे कौन सी संख्या आएगी?', ans, '<div style="font-size:30px">' + txt + '</div>');
  q.sig = txt; return q;
}
function moneyGen(c) {
  var a, b, na, nb, q;
  if (c === 1) {
    a = pick([1, 2, 5, 10]); do { b = pick([1, 2, 5, 10]); } while (b === a); na = R(2, 4); nb = R(2, 4);
    return numQ('You have ' + na + ' coins of ₹' + a + ' and ' + nb + ' coins of ₹' + b + '. How much money is that in all?', 'तुम्हारे पास ₹' + a + ' के ' + na + ' सिक्के और ₹' + b + ' के ' + nb + ' सिक्के हैं। कुल कितने रुपये हैं?', na * a + nb * b);
  }
  if (Math.random() < 0.5) { a = R(10, 50); b = R(1, a - 1); return numQ('Ria has ₹' + a + '. She spends ₹' + b + '. How much money is left?', 'रिया के पास ₹' + a + ' हैं। उसने ₹' + b + ' खर्च कर दिए। कितने रुपये बचे?', a - b); }
  a = R(2, 25); b = R(2, 25); return numQ('A pencil costs ₹' + a + ' and an eraser costs ₹' + b + '. What is the total?', 'एक पेंसिल ₹' + a + ' की और एक रबड़ ₹' + b + ' की है। कुल कितना हुआ?', a + b);
}
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
function item(sig, q) { return { sig: sig, q: q }; }
var POOL = {
  tables: function (c) { var o = [], ts = c === 1 ? [2, 5, 10] : [2, 3, 4, 5, 10], mb = c === 1 ? 5 : 10; ts.forEach(function (t) { for (var b = 1; b <= mb; b++) (function (t, b) { o.push(item(t + 'x' + b, function () { return numQ(t + ' × ' + b + ' = ?', t + ' × ' + b + ' कितना होता है?', t * b); })); })(t, b); }); return o; },
  clock: function (c) { var o = [], ms = c === 1 ? [0, 30] : [0, 15, 30, 45], f = function (x, y) { return x + ':' + pad(y); }; for (var h = 1; h <= 12; h++) ms.forEach(function (m) { (function (h, m) { o.push(item(h + ':' + m, function () { return mk('What time is it?', 'समय क्या हुआ है?', f(h, m), [f(h % 12 + 1, m), f((h + 10) % 12 + 1, m), f(h, (m + 30) % 60), f(h, (m + 15) % 60), f(h % 12 + 1, (m + 30) % 60)], clockSvg(h, m)); })); })(h, m); }); return o; },
  fraction: function (c) {
    var cb = c === 1 ? [[2, 1], [4, 1], [4, 2], [4, 3], [3, 1], [3, 2]] : []; if (c === 2) [2, 3, 4, 5, 6, 8].forEach(function (n) { for (var k = 1; k < n; k++) cb.push([n, k]); });
    return cb.map(function (p) { var n = p[0], k = p[1]; return item(n + '/' + k, function () { var w = []; for (var i = 1; i < n; i++) if (i !== k) w.push(i + '/' + n); w = shuf(w).concat([k + '/' + (n + 1), (k + 1) + '/' + (n + 1), k + '/' + (n + 2)]); return mk('What fraction of the pizza is coloured?', 'पिज़्ज़े का कितना भाग रंगा हुआ है?', k + '/' + n, w, pizza(n, k)); }); });
  },
  word: function (c) {
    var o = [], opp = function (p, all) { return item('o' + p[0], function () { return mk('What is the opposite of <b>' + p[0] + '</b>?', '<b>' + p[0] + '</b> का विपरीत शब्द क्या है?', p[1], shuf(all.filter(function (x) { return x !== p; })).map(function (x) { return x[1]; })); }); },
      nv = function (p) { return item('n' + p[0], function () { return mk('Is <b>' + p[0] + '</b> a Noun or a Verb?', '<b>' + p[0] + '</b> संज्ञा (Noun) है या क्रिया (Verb)?', p[1], ['Noun', 'Verb']); }); };
    if (c === 1) { OPP1.forEach(function (p) { o.push(opp(p, OPP1)); }); NV1.forEach(function (p) { o.push(nv(p)); }); return o; }
    OPP2.forEach(function (p) { o.push(opp(p, OPP2)); }); NV2.forEach(function (p) { o.push(nv(p)); });
    SYN2.forEach(function (p) { o.push(item('s' + p[0], function () { return mk('Which word means the same as <b>' + p[0] + '</b>?', '<b>' + p[0] + '</b> का समान अर्थ वाला शब्द कौन सा है?', p[1], shuf(SYN2.filter(function (x) { return x !== p; })).map(function (x) { return x[1]; })); })); });
    SPELL.forEach(function (w) { o.push(item('p' + w, function () { return mk('Which spelling is correct?', 'सही वर्तनी (spelling) कौन सी है?', w, wrongSpell(w)); })); }); return o;
  },
  scramble: function (c) { return WP(c).map(function (p) { return item('sc' + p[0], function () { var w = p[0], s = w, g = 0; while (s === w && g++ < 30) s = shuf(w.split('')).join(''); var t = '<b style="letter-spacing:4px">' + s.toUpperCase().split('').join(' ') + '</b>'; return { vis: '<div style="font-size:54px">' + p[1] + '</div>', en: 'Make a word with these letters:<br>' + t, hi: 'इन अक्षरों से एक शब्द बनाओ:<br>' + t, input: true, ans: w }; }); }); },
  bee: function (c) { return WP(c).map(function (p) { return item('b' + p[0], function () { var w = p[0], i = R(1, w.length - 1), t = '<b style="letter-spacing:3px">' + w.slice(0, i) + '_' + w.slice(i + 1) + '</b>'; return mk('Find the missing letter:<br>' + t, 'छूटा हुआ अक्षर ढूँढो:<br>' + t, w[i], shuf('abcdefghilmnoprstu'.split('').filter(function (x) { return x !== w[i]; })), '<div style="font-size:54px">' + p[1] + '</div>'); }); }); },
  hindi: function (c) { var L = c === 1 ? HI.slice(0, 10) : HI; return L.map(function (p) { return item('h' + p[0], function () { return mk('Which letter does this word start with?', 'यह शब्द किस अक्षर से शुरू होता है?', p[0], shuf(HI.filter(function (x) { return x !== p; })).map(function (x) { return x[0]; }), '<div style="font-size:50px">' + p[3] + '</div><div style="font-size:26px">' + p[1] + ' (' + p[2] + ')</div>'); }); }); },
  gk: function () { return bk(GK); }, sci: function () { return bk(SCI); }
};
function bk(L) { return L.map(function (x) { return item(x[0], function () { return mk(x[0], x[1], x[2], x.slice(3)); }); }); }
var GAMES = [
 { id: 'math', n: 'Math Challenge', e: '🧮', d: 'Add and subtract', gen: function (c, l) { return mathGen(c, l, false); }, max: [12, 12] },
 { id: 'speed', n: 'Speed Maths', e: '⚡', d: 'Quick sums, 15 seconds each', gen: function (c, l) { return mathGen(c, l, true); }, max: [8, 10], t: 15 },
 { id: 'tables', n: 'Table Champion', e: '✖️', d: 'Learn tables with a timer', pool: POOL.tables, t: 20 },
 { id: 'word', n: 'Word Master', e: '📖', d: 'Opposites, nouns and verbs', pool: POOL.word },
 { id: 'scramble', n: 'Word Scramble', e: '🔀', d: 'Fix the jumbled letters', pool: POOL.scramble },
 { id: 'bee', n: 'Spelling Bee', e: '🐝', d: 'Find the missing letter', pool: POOL.bee },
 { id: 'hindi', n: 'Hindi Varnamala', e: 'अ', d: 'Hindi letters and words', pool: POOL.hindi },
 { id: 'pair', n: 'Match the Pair', e: '🍎', d: 'Match picture and name', mem: 'pair' },
 { id: 'memory', n: 'Memory Cards', e: '🃏', d: 'Find the same pictures', mem: 'same' },
 { id: 'sci', n: 'Science Explorer', e: '🔬', d: 'Body, plants and animals', pool: POOL.sci },
 { id: 'gk', n: 'GK Master', e: '🇮🇳', d: 'India and festivals', pool: POOL.gk },
 { id: 'puzzle', n: 'Brain Puzzle', e: '🧩', d: 'Number patterns', gen: seqGen, max: [8, 10] },
 { id: 'fraction', n: 'Fraction Pizza', e: '🍕', d: 'Halves, quarters and more', pool: POOL.fraction },
 { id: 'money', n: 'Money Master', e: '💰', d: 'Count your money', gen: moneyGen, max: [8, 10] },
 { id: 'clock', n: 'Clock Master', e: '🕒', d: 'Read the time', pool: POOL.clock }
];
var BADGES = [['🌱 First Step', function () { return S.stars >= 1; }], ['⭐ 10 Stars', function () { return S.stars >= 10; }], ['🥇 Champion (50 stars)', function () { return S.stars >= 50; }], ['👑 Legend (150 stars)', function () { return S.stars >= 150; }], ['💯 5 Perfect Levels', function () { return S.perfect >= 5; }], ['🎮 5 Different Games', function () { return Object.keys(S.played).length >= 5; }], ['🎯 Daily Hero (3 days)', function () { return S.dailyCount >= 3; }]];
var gById = function (id) { return GAMES.filter(function (x) { return x.id === id; })[0]; };

/* ---------- levels (never repeat a question) ---------- */
var memN = function (l) { return Math.min(6, 2 + Math.ceil(l / 2)); };
function maxLevel(g, c) {
  if (g.mem) { var tot = 0, l = 0, n = WP(c).length; for (;;) { l++; tot += memN(l); if (tot > n) return l - 1; } }
  return g.pool ? Math.floor(g.pool(c).length / 5) : g.max[c - 1];
}
function seenOf(gid, c) { var s = {}, p = gid + c + '_'; Object.keys(S.qs).forEach(function (k) { if (k.indexOf(p) === 0) (S.qs[k].sigs || []).forEach(function (x) { s[x] = 1; }); }); return s; }
function buildLevel(g, c, l) {
  var key = g.id + c + '_' + l; if (S.qs[key]) return S.qs[key];
  var seen = seenOf(g.id, c), qs = [], tries = 0, q, r;
  if (g.mem) { var n = memN(l), left = shuf(WP(c).filter(function (p) { return !seen[p[0]]; })).slice(0, n); if (left.length < n) return null; r = { pairs: left, sigs: left.map(function (p) { return p[0]; }) }; }
  else {
    if (g.pool) { var it = shuf(g.pool(c).filter(function (x) { return !seen[x.sig]; })).slice(0, 5); if (it.length < 5) return null; qs = it.map(function (x) { var y = x.q(); y.sig = x.sig; return y; }); }
    else { while (qs.length < 5 && tries++ < 400) { q = g.gen(c, l); if (!seen[q.sig]) { seen[q.sig] = 1; qs.push(q); } } if (qs.length < 5) return null; }
    r = { qs: qs, sigs: qs.map(function (x) { return x.sig; }) };
  }
  S.qs[key] = r; save(); return r;
}
function dailyQs(c) {
  var ids = ['math', 'word', 'gk', 'sci', 'puzzle', 'money'], qs = [], seen = {}, t = 0, g, q;
  while (qs.length < 5 && t++ < 200) { g = gById(pick(ids)); q = g.gen ? g.gen(c, 2) : pick(g.pool(c)).q(); if (!seen[q.sig || q.en]) { seen[q.sig || q.en] = 1; qs.push(q); } } return qs;
}

/* ---------- screens ---------- */
function show(id) { ['vSetup', 'vHome', 'vPlay', 'vEnd'].forEach(function (v) { $(v).classList.toggle('hid', v !== id); }); window.scrollTo(0, 0); }
function chips(box, sel, fn) {
  box.innerHTML = ''; [1, 2].forEach(function (c) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (c === sel ? ' on' : ''); b.textContent = 'Class ' + c; b.setAttribute('aria-pressed', c === sel ? 'true' : 'false'); b.onclick = function () { fn(c); }; box.appendChild(b);
  });
}
function head() { $('sStars').textContent = '⭐ ' + S.stars; $('sScore').textContent = '🏆 ' + S.score; }
function home() {
  head(); $('hiName').textContent = 'Hello, ' + S.nick + '!';
  $('classCard').classList.toggle('hid', gate === '1' || gate === '2'); $('classCardTxt').textContent = 'Class ' + S.cls;
  chips($('homeClass'), S.cls, function (c) { S.cls = c; save(); home(); });
  var g = $('gameGrid'); g.innerHTML = '';
  GAMES.forEach(function (x) {
    var mx = maxLevel(x, S.cls), lv = S.lvl[x.id + S.cls] || 1, done = lv > mx, b = document.createElement('button'); b.className = 'g'; b.type = 'button';
    b.innerHTML = '<i></i><b></b><small></small><small></small>'; var t = b.children; t[0].textContent = x.e; t[1].textContent = x.n; t[2].textContent = x.d; t[3].textContent = done ? 'All ' + mx + ' levels done ✅' : 'Level ' + lv + ' of ' + mx;
    b.onclick = function () { start(x.id, Math.min(lv, mx)); }; g.appendChild(b);
  });
  var bd = $('badges'); bd.innerHTML = ''; BADGES.forEach(function (x) { var s = document.createElement('span'), ok = x[1](); s.textContent = ok ? x[0] : '🔒 ' + x[0].replace(/^\S+\s/, ''); s.style.opacity = ok ? 1 : 0.5; bd.appendChild(s); });
  var lb = jget(LBK, {}), rows = Object.keys(lb).map(function (k) { return lb[k]; }).filter(function (r) { return r.c === 1 || r.c === 2; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 10), t = $('lb'); t.innerHTML = '';
  rows.forEach(function (r, i) { var tr = document.createElement('tr'); [['🥇', '🥈', '🥉'][i] || String(i + 1), r.n + ' (Class ' + r.c + ')', r.s + ' pts · ' + r.st + ' ⭐'].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); if (r.n === S.nick && r.c === S.cls) tr.style.fontWeight = '700'; t.appendChild(tr); });
  show('vHome');
}

/* ---------- play ---------- */
var cur = null, tm = null;
var today = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
function paint() {
  var q = cur.q; $('pQ').innerHTML = (q.vis ? '<div>' + q.vis + '</div>' : '') + '<div class="qt">' + (cur.hiOn ? q.hi : q.en) + '</div>'; $('pTr').textContent = cur.hiOn ? 'English' : 'हिंदी';
}
function start(id, lvl) {
  var daily = id === 'daily', g = daily ? { id: 'daily', n: 'Daily Quiz Battle', e: '🎯' } : gById(id), c = S.cls, lv;
  if (!g || (c !== 1 && c !== 2)) return;
  cur = { g: g, c: c, l: lvl, i: 0, right: 0, pts: 0, daily: daily, hiOn: false };
  if (daily) cur.qs = dailyQs(c); else { lv = buildLevel(g, c, lvl); if (!lv) { alert('No more new questions in this game for Class ' + c + '.'); cur = null; return; } cur.lv = lv; cur.qs = lv.qs; }
  S.played[id] = 1; $('pTitle').textContent = g.e + ' ' + g.n; $('pLvl').textContent = daily ? today() : 'Class ' + c + ' · Level ' + lvl + ' of ' + maxLevel(g, c);
  show('vPlay'); if (g.mem) memGame(); else nextQ();
}
function nextQ() {
  clearInterval(tm); if (cur.i >= 5) return finish();
  var src = cur.qs[cur.i], q = cur.q = JSON.parse(JSON.stringify(src)), box = $('pOpts'); cur.hiOn = false; cur.done = false;
  if (q.o) { var ct = q.o[q.a]; q.o = shuf(q.o); q.a = q.o.indexOf(ct); }
  $('pBar').style.width = (cur.i * 20) + '%'; $('pMem').classList.add('hid'); $('pFb').textContent = ''; $('pTr').classList.remove('hid'); paint(); box.innerHTML = '';
  $('pIn').classList.toggle('hid', !q.input); box.classList.toggle('hid', !!q.input);
  if (q.input) { $('pAns').value = ''; $('pAns').focus(); }
  else q.o.forEach(function (t, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'o'; b.textContent = t; b.onclick = function () { answer(i); }; box.appendChild(b); });
  var T = cur.g.t; $('pTimer').textContent = '';
  if (T) { cur.left = T; $('pTimer').textContent = '⏱ ' + T; tm = setInterval(function () { cur.left--; $('pTimer').textContent = '⏱ ' + cur.left; if (cur.left <= 0) { clearInterval(tm); answer(-1); } }, 1000); }
}
function answer(i, txt) {
  if (!cur || cur.done) return; cur.done = true; clearInterval(tm); var q = cur.q, ok;
  if (q.input) { ok = (txt || '').trim().toLowerCase() === q.ans; $('pFb').textContent = ok ? '✅ Correct!' : '❌ Correct answer: ' + q.ans; }
  else { ok = i === q.a; var bs = $('pOpts').children; if (bs[q.a]) bs[q.a].classList.add('ok'); if (!ok && bs[i]) bs[i].classList.add('no'); $('pFb').textContent = ok ? '✅ Correct!' : '❌ Try the next one!'; }
  if (ok) { cur.right++; cur.pts += 10 + (cur.g.t ? Math.max(0, cur.left) : 0); }
  var me = cur; setTimeout(function () { if (cur !== me) return; cur.i++; nextQ(); }, q.input && !ok ? 2200 : 1000);
}
function memGame() {
  var g = cur.g, pairs = cur.lv.pairs, n = pairs.length, cards = [], first = null, lock = false, moves = 0, done = 0, me = cur, m = $('pMem'), en = g.mem === 'pair' ? 'Match each picture with its name' : 'Find the cards that match';
  pairs.forEach(function (p, k) { if (g.mem === 'pair') { cards.push({ k: k, t: p[1], big: 1 }); cards.push({ k: k, t: p[0][0].toUpperCase() + p[0].slice(1) }); } else { cards.push({ k: k, t: p[1], big: 1 }); cards.push({ k: k, t: p[1], big: 1 }); } });
  cur.q = { vis: '', en: en, hi: g.mem === 'pair' ? 'हर चित्र को उसके नाम से मिलाओ' : 'एक जैसे कार्ड ढूँढो', o: [], a: 0 }; paint();
  $('pOpts').classList.add('hid'); $('pIn').classList.add('hid'); $('pTimer').textContent = ''; $('pFb').textContent = ''; $('pBar').style.width = '0'; m.innerHTML = ''; m.classList.remove('hid');
  shuf(cards).forEach(function (cd) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'mc'; b.textContent = '?'; b.setAttribute('aria-label', 'card');
    b.onclick = function () {
      if (cur !== me || lock || b.classList.contains('up') || b.classList.contains('done')) return;
      b.classList.add('up'); b.textContent = cd.t; if (!cd.big) b.classList.add('t');
      if (!first) { first = { b: b, cd: cd }; return; }
      moves++; var f = first; first = null;
      if (f.cd.k === cd.k) { f.b.classList.add('done'); b.classList.add('done'); done++; $('pBar').style.width = (done / n * 100) + '%'; if (done === n) setTimeout(function () { if (cur !== me) return; cur.right = moves <= n * 1.6 ? 5 : moves <= n * 2.6 ? 4 : 3; cur.pts = Math.max(10, n * 15 - moves * 3); finish(); }, 600); }
      else { lock = true; setTimeout(function () { [f.b, b].forEach(function (x) { x.classList.remove('up', 't'); x.textContent = '?'; }); lock = false; }, 800); }
    };
    m.appendChild(b);
  });
}
function finish() {
  clearInterval(tm); var c = cur, r = c.right, st = r === 5 ? 3 : r === 4 ? 2 : r === 3 ? 1 : 0, pass = r >= 3, key = c.g.id + S.cls + '_' + c.l, extra = 0, mx = c.daily ? 0 : maxLevel(c.g, S.cls);
  if (c.daily) { if (S.daily === today()) c.pts = Math.floor(c.pts / 2); else { S.daily = today(); S.dailyCount++; extra = 50; } S.stars += st; }
  else { var gain = Math.max(0, st - (S.best[key] || 0)); S.best[key] = Math.max(S.best[key] || 0, st); S.stars += gain; if (st === 3 && gain === 3) S.perfect++; }
  S.score += c.pts + extra;
  if (!c.daily && pass && (S.lvl[c.g.id + S.cls] || 1) === c.l) S.lvl[c.g.id + S.cls] = c.l + 1;
  var lb = jget(LBK, {}); lb[S.nick + '|' + S.cls] = { n: S.nick, c: S.cls, s: S.score, st: S.stars }; jset(LBK, lb); save(); head();
  var last = !c.daily && pass && c.l >= mx;
  $('eTitle').textContent = last ? 'You finished every level! 🏆' : pass ? 'Well done, ' + S.nick + '! 🎉' : 'Try again, you can do it! 💪';
  $('eStars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('eMsg').textContent = r + ' out of 5 correct · +' + (c.pts + extra) + ' points' + (extra ? ' (daily bonus!)' : '') + (pass ? '' : ' · Get 3 correct to unlock the next level.');
  var nb = $('nextBtn'); nb.classList.toggle('hid', c.daily || last); nb.textContent = pass ? 'Next level ▶' : 'Play again ↻';
  nb.onclick = function () { start(c.g.id, pass ? c.l + 1 : c.l); }; show('vEnd');
}

/* ---------- wiring ---------- */
var pickCls = S.cls || 1;
function setupChips() { chips($('setupClass'), pickCls, function (c) { pickCls = c; setupChips(); }); }
setupChips();
$('goBtn').onclick = function () { var n = $('nick').value.trim(); if (!n) { $('nick').focus(); return; } S.nick = n.slice(0, 14); S.cls = (gate === '1' || gate === '2') ? +gate : pickCls; save(); home(); };
$('dailyBtn').onclick = function () { start('daily', 1); };
$('quitBtn').onclick = function () { clearInterval(tm); cur = null; home(); };
$('homeBtn').onclick = home;
$('pTr').onclick = function () { if (cur && cur.q) { cur.hiOn = !cur.hiOn; paint(); } };
$('pCheck').onclick = function () { answer(0, $('pAns').value); };
$('pAns').onkeydown = function (e) { if (e.key === 'Enter') answer(0, this.value); };
if (!allowed) { $('vSetup').innerHTML = '<h2 style="font-size:22px">Sorry! 🙏</h2><p style="margin:10px 0 16px">These games are made only for Class 1 and Class 2 students.</p><a class="btn" style="display:grid;place-items:center;text-decoration:none" href="student-dashboard.html">Back to dashboard</a>'; show('vSetup'); }
else if (S.nick && S.cls) home(); else show('vSetup');
if (window.__GA_TEST) window.__GA_TEST({ GAMES: GAMES, buildLevel: buildLevel, maxLevel: maxLevel, S: S, dailyQs: dailyQs });
})();
