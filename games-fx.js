// Sound, speech, pictures and confetti for the games. Nothing here needs a file: sounds are made with the browser, pictures are drawn as SVG.

export function makeSound(isOn) {
  let ctx = null;
  const get = () => { if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); } if (ctx.state === "suspended") ctx.resume(); return ctx; };
  const tone = (freq, start, dur, type = "sine", gain = 0.12) => {
    const c = get(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(c.destination);
    const t0 = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.05);
  };
  const play = (fn) => { if (isOn()) { try { fn(); } catch (e) { /* sound is optional */ } } };
  return {
    correct: () => play(() => { tone(660, 0, 0.12); tone(880, 0.1, 0.18); }),
    wrong: () => play(() => { tone(220, 0, 0.18, "triangle", 0.14); tone(180, 0.16, 0.22, "triangle", 0.14); }),
    click: () => play(() => tone(520, 0, 0.05, "sine", 0.05)),
    star: () => play(() => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.2)); }),
    level: () => play(() => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25)); }),
    tick: () => play(() => tone(900, 0, 0.04, "square", 0.03))
  };
}

export function speak(text, lang) {
  if (!("speechSynthesis" in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || "en-IN"; u.rate = 0.8; u.pitch = 1.05;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}
export const canSpeak = () => "speechSynthesis" in window;

export function confetti(host) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#e11d48", "#f59e0b", "#16a34a", "#2563eb", "#0ea5e9", "#f97316"];
  const box = document.createElement("div"); box.className = "g-confetti"; box.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 36; i++) {
    const s = document.createElement("span");
    s.style.left = Math.random() * 100 + "%"; s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.4 + "s"; s.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
    s.style.transform = "rotate(" + Math.floor(Math.random() * 360) + "deg)";
    box.appendChild(s);
  }
  host.appendChild(box);
  setTimeout(() => box.remove(), 3200);
}

const STAR_PATH = "M12 2.5l2.95 6.2 6.8.85-5 4.7 1.3 6.75L12 17.6 5.95 21l1.3-6.75-5-4.7 6.8-.85z";
export function starSvg(filled, size = 28) {
  return '<svg class="g-star' + (filled ? " on" : "") + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '" fill="' + (filled ? "#f5b50a" : "none") + '" stroke="' + (filled ? "#b27a00" : "#8a8f98") + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
}
export function starsRow(n, size = 28) { return '<span class="g-stars" role="img" aria-label="' + n + " out of 3 stars" + '">' + [0, 1, 2].map((i) => starSvg(i < n, size)).join("") + "</span>"; }

// A round picture for each game: a coloured circle with a simple white drawing.
const GLYPHS = {
  plus: '<path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  bolt: '<path d="M13 3L6 13h5l-1 8 7-10h-5z" fill="#fff"/>',
  times: '<path d="M7 7l10 10M17 7L7 17" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  book: '<path d="M5 5h6v14H5zM13 5h6v14h-6z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
  link: '<circle cx="8" cy="12" r="3" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="16" cy="12" r="3" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M11 12h2" stroke="#fff" stroke-width="2.4"/>',
  flask: '<path d="M10 4h4M11 4v6l-4.5 8a1.5 1.5 0 0 0 1.3 2.2h8.4a1.5 1.5 0 0 0 1.3-2.2L13 10V4" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
  globe: '<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" fill="none" stroke="#fff" stroke-width="1.6"/>',
  puzzle: '<path d="M6 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 0 0 4v3H6z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
  shuffle: '<path d="M4 8h4l8 8h4M4 16h4l2-2M14 10l2-2h4M18 6l2 2-2 2M18 14l2 2-2 2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  letter: '<text x="12" y="17" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" lang="hi">\u0905</text>',
  bee: '<ellipse cx="12" cy="13" rx="6" ry="5" fill="none" stroke="#fff" stroke-width="2"/><path d="M9 9l-2-3M15 9l2-3M9 12h6M9 15h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  pizza: '<path d="M12 4a9 9 0 0 1 8 5l-8 11L4 9a9 9 0 0 1 8-5z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="11" cy="10" r="1.3" fill="#fff"/><circle cx="14.5" cy="12" r="1.3" fill="#fff"/>',
  coin: '<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2"/><text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">\u20B9</text>',
  clock: '<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  cards: '<rect x="5" y="6" width="9" height="12" rx="1.5" fill="none" stroke="#fff" stroke-width="2"/><rect x="10" y="8" width="9" height="12" rx="1.5" fill="none" stroke="#fff" stroke-width="2"/>',
  map: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>',
  daily: '<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" fill="#fff"/>'
};
export function gameIcon(name, color, size = 52) {
  return '<svg class="g-icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="' + color + '"/>' + (GLYPHS[name] || "") + "</svg>";
}

export function badgeSvg(earned, size = 56) {
  const fill = earned ? "#f5b50a" : "#c7cbd1", edge = earned ? "#a86f00" : "#8a8f98";
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true"><path d="M16 4h16l4 12H12z" fill="' + (earned ? "#d6402c" : "#aeb3ba") + '"/><circle cx="24" cy="28" r="15" fill="' + fill + '" stroke="' + edge + '" stroke-width="2.5"/>' +
    (earned ? '<path d="M24 19l2.6 5.4 5.9.8-4.3 4.1 1 5.9L24 32.4l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="#fff8d6"/>' : '<rect x="19" y="26" width="10" height="9" rx="1.5" fill="#8a8f98"/><path d="M21 26v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#8a8f98" stroke-width="2"/>') + "</svg>";
}

export function shapeSvg(id, size = 56) {
  const f = "#e8a317", st = "#7a5200", pts = (n, rot = -90, r = 22) => Array.from({ length: n }, (_, i) => { const a = ((rot + (360 / n) * i) * Math.PI) / 180; return (26 + r * Math.cos(a)).toFixed(1) + "," + (26 + r * Math.sin(a)).toFixed(1); }).join(" ");
  const inner = {
    circle: '<circle cx="26" cy="26" r="22"/>', square: '<rect x="6" y="6" width="40" height="40"/>', triangle: '<polygon points="26,5 48,46 4,46"/>',
    rectangle: '<rect x="3" y="12" width="46" height="28"/>', star: '<polygon points="' + Array.from({ length: 10 }, (_, i) => { const a = (-90 + 36 * i) * Math.PI / 180, r = i % 2 ? 10 : 23; return (26 + r * Math.cos(a)).toFixed(1) + "," + (26 + r * Math.sin(a)).toFixed(1); }).join(" ") + '"/>',
    heart: '<path d="M26 45C8 32 5 22 11 15c5-5 12-3 15 3 3-6 10-8 15-3 6 7 3 17-15 30z"/>', diamond: '<polygon points="26,3 47,26 26,49 5,26"/>',
    pentagon: '<polygon points="' + pts(5) + '"/>', hexagon: '<polygon points="' + pts(6, 0) + '"/>', oval: '<ellipse cx="26" cy="26" rx="23" ry="15"/>'
  }[id] || "";
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 52 52" role="img" aria-label="a ' + id + '"><g fill="' + f + '" stroke="' + st + '" stroke-width="2.5" stroke-linejoin="round">' + inner + "</g></svg>";
}
