"use strict";
/* LENTERA KECIL — Engine v2
   Fixes: character never overlaps narration · tags wrap properly · richer BG */

/* ── STATE ── */
const S = {
  story: null,
  scene: 0,
  sound: true,
  progress: JSON.parse(localStorage.getItem("lk_prog") || "{}"),
  save() {
    localStorage.setItem("lk_prog", JSON.stringify(this.progress));
  },
  stars() {
    return Object.values(this.progress).reduce((a, p) => a + (p.stars || 0), 0);
  },
  done(id) {
    return !!this.progress[id]?.completed;
  },
  complete(id) {
    this.progress[id] = { completed: true, stars: 3 };
    this.save();
  },
};

/* ── SCREEN ── */
function go(id) {
  document.querySelectorAll(".scr").forEach((s) => {
    s.classList.remove("active");
    s.style.display = "none";
  });
  const t = document.getElementById("scr-" + id);
  t.style.display = "flex";
  requestAnimationFrame(() => t.classList.add("active"));
  if (id === "library") renderLibrary();
}

/* ── SOUND ── */
let AC = null,
  masterG = null,
  ambNodes = [];
function acEnsure() {
  if (AC) return true;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterG = AC.createGain();
    masterG.gain.value = S.sound ? 0.35 : 0;
    masterG.connect(AC.destination);
    return true;
  } catch (e) {
    return false;
  }
}
const AMB = {
  forest: { f: [220, 330], t: "sine", v: 0.04 },
  river: { f: [180, 260, 340], t: "sine", v: 0.05 },
  night: { f: [110, 165], t: "sine", v: 0.03 },
  village: { f: [260, 390], t: "triangle", v: 0.03 },
  sea: { f: [140, 210, 280], t: "sine", v: 0.05 },
  rain: { f: [80, 120, 160], t: "sine", v: 0.04 },
};
function playAmb(type) {
  if (!acEnsure() || !S.sound) return;
  ambNodes.forEach((n) => {
    try {
      n.stop();
    } catch (e) {}
  });
  ambNodes = [];
  const c = AMB[type] || AMB.forest,
    t = AC.currentTime;
  c.f.forEach((f, i) => {
    const o = AC.createOscillator(),
      g = AC.createGain(),
      lfo = AC.createOscillator(),
      lg = AC.createGain();
    o.type = c.t;
    o.frequency.value = f;
    o.detune.value = (i % 2 ? 1 : -1) * 12;
    lfo.frequency.value = 0.12 + i * 0.06;
    lg.gain.value = 18;
    lfo.connect(lg);
    lg.connect(o.detune);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(c.v * (1 - i * 0.15), t + 2);
    o.connect(g);
    g.connect(masterG);
    o.start(t);
    lfo.start(t);
    ambNodes.push(o, lfo);
  });
}
function playClick() {
  if (!acEnsure() || !S.sound) return;
  const t = AC.currentTime,
    o = AC.createOscillator(),
    g = AC.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(600, t);
  o.frequency.exponentialRampToValueAtTime(200, t + 0.12);
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(g);
  g.connect(masterG);
  o.start(t);
  o.stop(t + 0.12);
}
function playSuccess() {
  if (!acEnsure() || !S.sound) return;
  const t = AC.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.14, t + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.35);
    o.connect(g);
    g.connect(masterG);
    o.start(t + i * 0.1);
    o.stop(t + i * 0.1 + 0.35);
  });
}
function playPage() {
  if (!acEnsure() || !S.sound) return;
  const t = AC.currentTime,
    l = Math.ceil(AC.sampleRate * 0.07),
    b = AC.createBuffer(1, l, AC.sampleRate),
    d = b.getChannelData(0);
  for (let i = 0; i < l; i++)
    d[i] = (Math.random() * 2 - 1) * Math.exp((-i / l) * 8);
  const n = AC.createBufferSource(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  n.buffer = b;
  f.type = "highpass";
  f.frequency.value = 2000;
  g.gain.value = 0.08;
  n.connect(f);
  f.connect(g);
  g.connect(masterG);
  n.start(t);
}

/* ── SVG CHARACTERS ── */
const CHARS = {
  kancil: (m) => `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="112" rx="28" ry="22" fill="#d97706"/>
    <ellipse cx="60" cy="90" rx="14" ry="10" fill="#d97706"/>
    <ellipse cx="60" cy="68" rx="22" ry="20" fill="#d97706"/>
    <ellipse cx="42" cy="52" rx="7" ry="14" fill="#92400e" transform="rotate(-20 42 52)"/>
    <ellipse cx="78" cy="52" rx="7" ry="14" fill="#92400e" transform="rotate(20 78 52)"/>
    <ellipse cx="42" cy="52" rx="4" ry="9" fill="#fca5a5" transform="rotate(-20 42 52)"/>
    <ellipse cx="78" cy="52" rx="4" ry="9" fill="#fca5a5" transform="rotate(20 78 52)"/>
    <circle cx="52" cy="66" r="5" fill="#1c1917"/><circle cx="68" cy="66" r="5" fill="#1c1917"/>
    <circle cx="53.5" cy="64.5" r="1.5" fill="#fff"/><circle cx="69.5" cy="64.5" r="1.5" fill="#fff"/>
    ${
      m === "happy" || m === "laugh" || m === "clever"
        ? `<path d="M52 75 Q60 83 68 75" stroke="#92400e" stroke-width="2" fill="#fca5a5" stroke-linecap="round"/>`
        : m === "thinking" || m === "sad"
          ? `<path d="M52 79 Q60 74 68 79" stroke="#92400e" stroke-width="2" fill="none" stroke-linecap="round"/>`
          : `<line x1="53" y1="77" x2="67" y2="77" stroke="#92400e" stroke-width="2" stroke-linecap="round"/>`
    }
    <ellipse cx="60" cy="72" rx="5" ry="3" fill="#92400e"/>
    <circle cx="58" cy="72" r="1.2" fill="#1c1917"/><circle cx="62" cy="72" r="1.2" fill="#1c1917"/>
    <rect x="38" y="130" width="10" height="24" rx="5" fill="#92400e"/>
    <rect x="52" y="130" width="10" height="24" rx="5" fill="#92400e"/>
    <rect x="64" y="130" width="10" height="24" rx="5" fill="#92400e"/>
    <path d="M85 107 Q102 97 97 80" stroke="#d97706" stroke-width="7" fill="none" stroke-linecap="round"/>
    ${m === "laugh" ? '<text x="72" y="44" font-size="16">😄</text>' : m === "thinking" ? '<text x="70" y="40" font-size="14">💭</text>' : m === "clever" ? '<text x="70" y="40" font-size="14">💡</text>' : ""}
  </svg>`,

  buaya: (m) => `<svg viewBox="0 0 180 110" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="72" rx="60" ry="24" fill="#4d7c0f"/>
    <ellipse cx="100" cy="78" rx="46" ry="14" fill="#a3e635" opacity=".5"/>
    <ellipse cx="35" cy="60" rx="36" ry="18" fill="#4d7c0f"/>
    <path d="M2 54 Q2 43 38 46 L72 56 L72 64 L2 64Z" fill="#365314"/>
    <path d="M2 64 L72 64 L72 72 Q38 75 2 70Z" fill="#4d7c0f"/>
    ${
      m === "angry"
        ? `<polygon points="8,64 12,56 16,64" fill="white"/><polygon points="22,64 26,56 30,64" fill="white"/><polygon points="36,64 40,55 44,64" fill="white"/><polygon points="50,64 54,56 58,64" fill="white"/>`
        : `<polygon points="12,64 15,58 18,64" fill="white" opacity=".8"/><polygon points="32,64 35,58 38,64" fill="white" opacity=".8"/>`
    }
    <circle cx="26" cy="49" r="7" fill="#1c1917"/><circle cx="28" cy="47" r="2.2" fill="white"/>
    <circle cx="8" cy="51" r="3" fill="#365314"/><circle cx="16" cy="50" r="3" fill="#365314"/>
    <ellipse cx="80" cy="62" rx="8" ry="5" fill="#365314" opacity=".5"/>
    <ellipse cx="100" cy="60" rx="8" ry="5" fill="#365314" opacity=".5"/>
    <ellipse cx="120" cy="61" rx="8" ry="5" fill="#365314" opacity=".5"/>
    <path d="M68 90 L55 108 L46 108" stroke="#4d7c0f" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M130 90 L143 108 L152 108" stroke="#4d7c0f" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M155 76 Q172 64 174 48" stroke="#4d7c0f" stroke-width="14" fill="none" stroke-linecap="round"/>
    ${m === "angry" ? '<text x="112" y="38" font-size="18">😡</text>' : m === "defeated" ? '<text x="112" y="38" font-size="16">😵</text>' : ""}
  </svg>`,

  timunsmas: (
    m,
  ) => `<svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 100 Q14 145 17 178 L83 178 Q86 145 72 100Z" fill="#22c55e"/>
    <path d="M28 100 L72 100 L67 116 L33 116Z" fill="#16a34a"/>
    <path d="M40 100 Q50 93 60 100 L58 116 L42 116Z" fill="#bbf7d0"/>
    <path d="M46 100 Q50 96 54 100 L53 108 L47 108Z" fill="#fde68a"/>
    <path d="M22 108 Q8 130 10 148" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M78 108 Q92 130 90 148" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/>
    <circle cx="10" cy="149" r="7" fill="#f59e0b"/><circle cx="90" cy="149" r="7" fill="#f59e0b"/>
    ${m === "brave" ? `<path d="M78 108 Q95 116 94 130" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/><text x="88" y="130" font-size="14">🛡️</text>` : ""}
    <rect x="43" y="78" width="14" height="24" rx="7" fill="#f59e0b"/>
    <circle cx="50" cy="64" r="26" fill="#fcd34d"/>
    <ellipse cx="50" cy="40" rx="23" ry="13" fill="#1c1917"/>
    <ellipse cx="50" cy="36" rx="11" ry="9" fill="#374151"/>
    <circle cx="37" cy="39" r="4.5" fill="#fbbf24"/><circle cx="63" cy="39" r="4.5" fill="#fbbf24"/>
    <ellipse cx="42" cy="63" rx="4.2" ry="4.8" fill="#1c1917"/><ellipse cx="58" cy="63" rx="4.2" ry="4.8" fill="#1c1917"/>
    <circle cx="43.5" cy="61.5" r="1.5" fill="white"/><circle cx="59.5" cy="61.5" r="1.5" fill="white"/>
    <path d="M38 56 Q42 54 46 56" stroke="#1c1917" stroke-width="1.5" fill="none"/>
    <path d="M54 56 Q58 54 62 56" stroke="#1c1917" stroke-width="1.5" fill="none"/>
    ${
      m === "happy" || m === "brave"
        ? `<path d="M42 73 Q50 81 58 73" stroke="#c2410c" stroke-width="2" fill="#fca5a5" stroke-linecap="round"/>`
        : m === "scared" || m === "sad"
          ? `<path d="M43 77 Q50 72 57 77" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>`
          : `<path d="M43 75 Q50 78 57 75" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>`
    }
    <ellipse cx="50" cy="70" rx="3" ry="2" fill="#e67e22" opacity=".5"/>
    ${m === "happy" ? '<text x="64" y="41" font-size="12">✨</text>' : m === "scared" ? '<text x="64" y="41" font-size="12">😨</text>' : ""}
  </svg>`,

  ibu: (m) => `<svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 100 Q10 148 14 178 L86 178 Q90 148 76 100Z" fill="#7c3aed"/>
    <path d="M24 100 L76 100 L71 116 L29 116Z" fill="#6d28d9"/>
    <path d="M38 100 Q50 93 62 100 L60 116 L40 116Z" fill="#c4b5fd"/>
    <circle cx="36" cy="132" r="3" fill="#a78bfa" opacity=".5"/>
    <circle cx="55" cy="148" r="3" fill="#a78bfa" opacity=".5"/>
    <circle cx="66" cy="130" r="3" fill="#a78bfa" opacity=".5"/>
    <path d="M24 106 Q10 130 12 148" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M76 106 Q90 130 88 148" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/>
    <circle cx="12" cy="149" r="7" fill="#f59e0b"/><circle cx="88" cy="149" r="7" fill="#f59e0b"/>
    <rect x="43" y="78" width="14" height="24" rx="7" fill="#f59e0b"/>
    <path d="M28 94 Q50 100 72 94" stroke="#fbbf24" stroke-width="3" fill="none"/>
    <circle cx="50" cy="63" r="26" fill="#f59e0b"/>
    <ellipse cx="50" cy="40" rx="25" ry="14" fill="#1c1917"/>
    <ellipse cx="50" cy="36" rx="15" ry="10" fill="#111827"/>
    <ellipse cx="63" cy="37" rx="9" ry="8" fill="#374151"/>
    <ellipse cx="42" cy="62" rx="3.8" ry="4.3" fill="#1c1917"/><ellipse cx="58" cy="62" rx="3.8" ry="4.3" fill="#1c1917"/>
    <circle cx="43" cy="61" r="1.3" fill="white"/><circle cx="59" cy="61" r="1.3" fill="white"/>
    <path d="M37 56 Q41 54 45 56" stroke="#1c1917" stroke-width="1.5" fill="none"/>
    <path d="M55 56 Q59 54 63 56" stroke="#1c1917" stroke-width="1.5" fill="none"/>
    ${
      m === "happy"
        ? `<path d="M41 73 Q50 81 59 73" stroke="#c2410c" stroke-width="2" fill="#fca5a5" stroke-linecap="round"/>`
        : m === "sad" || m === "worried"
          ? `<path d="M42 78 Q50 72 58 78" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="36" cy="79" r="3" fill="#60a5fa" opacity=".7"/>`
          : m === "angry"
            ? `<path d="M42 77 Q50 73 58 77" stroke="#c2410c" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M38 54 Q42 51 46 54" stroke="#1c1917" stroke-width="2" fill="none"/>
        <path d="M54 54 Q58 51 62 54" stroke="#1c1917" stroke-width="2" fill="none"/>`
            : `<path d="M43 75 Q50 78 57 75" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>`
    }
    <ellipse cx="50" cy="69" rx="3" ry="2" fill="#e8a02e" opacity=".5"/>
    ${m === "happy" ? '<text x="66" y="42" font-size="12">💛</text>' : m === "shocked" ? '<text x="62" y="42" font-size="13">😱</text>' : m === "worried" ? '<text x="62" y="42" font-size="12">😟</text>' : ""}
  </svg>`,

  raksasa: (
    m,
  ) => `<svg viewBox="0 0 140 200" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="142" rx="46" ry="50" fill="#dc2626"/>
    <path d="M24 112 Q2 140 6 172 L16 172" stroke="#dc2626" stroke-width="24" fill="none" stroke-linecap="round"/>
    <path d="M116 112 Q138 140 134 172 L124 172" stroke="#dc2626" stroke-width="24" fill="none" stroke-linecap="round"/>
    <circle cx="10" cy="173" r="13" fill="#b91c1c"/><circle cx="130" cy="173" r="13" fill="#b91c1c"/>
    <rect x="55" y="78" width="30" height="38" rx="9" fill="#b91c1c"/>
    <ellipse cx="70" cy="62" rx="39" ry="37" fill="#dc2626"/>
    <polygon points="36,32 29,3 48,28" fill="#7f1d1d"/>
    <polygon points="104,32 111,3 92,28" fill="#7f1d1d"/>
    <circle cx="55" cy="57" r="10" fill="${m === "angry" ? "#ef4444" : "#fbbf24"}"/>
    <circle cx="85" cy="57" r="10" fill="${m === "angry" ? "#ef4444" : "#fbbf24"}"/>
    <circle cx="55" cy="57" r="4.5" fill="#1c1917"/><circle cx="85" cy="57" r="4.5" fill="#1c1917"/>
    <circle cx="57" cy="55" r="1.8" fill="white"/><circle cx="87" cy="55" r="1.8" fill="white"/>
    <path d="M44 46 Q55 41 66 46" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path d="M74 46 Q85 41 96 46" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="70" cy="69" rx="10" ry="6" fill="#b91c1c"/>
    ${
      m === "angry"
        ? `<path d="M48 82 Q70 94 92 82" fill="#7f1d1d" stroke="#7f1d1d" stroke-width="2"/>
      <polygon points="52,82 57,91 62,82" fill="white"/><polygon points="67,82 72,92 77,82" fill="white"/><polygon points="82,82 87,90 92,82" fill="white"/>`
        : m === "defeated"
          ? `<path d="M50 86 Q70 78 90 86" stroke="#7f1d1d" stroke-width="3" fill="none"/>`
          : `<path d="M52 84 Q70 90 88 84" stroke="#7f1d1d" stroke-width="2" fill="none"/>`
    }
    <rect x="36" y="184" width="24" height="14" rx="7" fill="#b91c1c"/>
    <rect x="80" y="184" width="24" height="14" rx="7" fill="#b91c1c"/>
    ${m === "angry" ? '<text x="96" y="26" font-size="20">💢</text>' : m === "defeated" ? '<text x="92" y="26" font-size="17">💫</text>' : m === "neutral" ? '<text x="94" y="26" font-size="16">👁️</text>' : ""}
  </svg>`,

  dayang: (m) => `<svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 96 Q7 148 11 178 L89 178 Q93 148 78 96Z" fill="#f59e0b"/>
    <path d="M22 96 L78 96 L73 112 L27 112Z" fill="#d97706"/>
    <path d="M35 120 Q50 114 65 120 Q50 126 35 120Z" fill="#fde68a" opacity=".6"/>
    <path d="M30 142 Q50 136 70 142 Q50 148 30 142Z" fill="#fde68a" opacity=".5"/>
    <path d="M26 52 Q28 36 50 33 Q72 36 74 52" fill="#fbbf24"/>
    <polygon points="34,52 38,28 43,52" fill="#f59e0b"/>
    <polygon points="47,52 50,23 53,52" fill="#f59e0b"/>
    <polygon points="57,52 62,28 66,52" fill="#f59e0b"/>
    <circle cx="38" cy="30" r="4.5" fill="#ef4444"/><circle cx="50" cy="25" r="4.5" fill="#22c55e"/><circle cx="62" cy="30" r="4.5" fill="#3b82f6"/>
    <path d="M22 102 Q8 126 10 144" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M78 102 Q92 126 90 144" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/>
    <circle cx="10" cy="145" r="7" fill="#f59e0b"/><circle cx="90" cy="145" r="7" fill="#f59e0b"/>
    <rect x="43" y="76" width="14" height="22" rx="7" fill="#fcd34d"/>
    <path d="M33 92 Q50 98 67 92" stroke="#fbbf24" stroke-width="3" fill="none"/>
    <circle cx="50" cy="100" r="3.5" fill="#ef4444"/>
    <circle cx="50" cy="62" r="26" fill="#fcd34d"/>
    <ellipse cx="50" cy="39" rx="24" ry="14" fill="#1c1917"/>
    <ellipse cx="41" cy="62" rx="4.2" ry="4.8" fill="#1c1917"/><ellipse cx="59" cy="62" rx="4.2" ry="4.8" fill="#1c1917"/>
    <circle cx="42.5" cy="60.5" r="1.6" fill="white"/><circle cx="60.5" cy="60.5" r="1.6" fill="white"/>
    <path d="M36 55 Q41 53 46 55" stroke="#1c1917" stroke-width="1.5" fill="none"/>
    <path d="M54 55 Q59 53 64 55" stroke="#1c1917" stroke-width="1.5" fill="none"/>
    ${
      m === "happy"
        ? `<path d="M41 73 Q50 81 59 73" stroke="#c2410c" stroke-width="2" fill="#fca5a5" stroke-linecap="round"/>`
        : m === "sad"
          ? `<path d="M43 77 Q50 72 57 77" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>`
          : m === "shocked" || m === "surprised"
            ? `<ellipse cx="50" cy="76" rx="5.5" ry="6.5" fill="#1c1917" opacity=".8"/>`
            : m === "clever"
              ? `<path d="M42 74 Q50 80 58 74" stroke="#c2410c" stroke-width="2" fill="none"/>`
              : m === "worried"
                ? `<path d="M43 76 Q50 72 57 76" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>`
                : `<path d="M43 74 Q50 77 57 74" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>`
    }
    <ellipse cx="50" cy="70" rx="3" ry="2" fill="#e8a02e" opacity=".5"/>
    ${m === "clever" ? '<text x="66" y="42" font-size="12">🌟</text>' : m === "neutral" ? '<text x="66" y="42" font-size="12">👑</text>' : m === "worried" ? '<text x="66" y="42" font-size="12">😟</text>' : ""}
  </svg>`,

  pemuda: (m) => `<svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 96 Q13 150 17 178 L83 178 Q87 150 75 96Z" fill="#1e40af"/>
    <path d="M25 96 L75 96 L70 112 L30 112Z" fill="#1d4ed8"/>
    <rect x="25" y="113" width="50" height="8" rx="4" fill="#fbbf24"/>
    <path d="M38 96 Q50 89 62 96 L60 112 L40 112Z" fill="#3b82f6"/>
    <path d="M25 102 Q11 126 9 146" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M75 102 Q89 126 91 146" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/>
    <circle cx="9" cy="147" r="7" fill="#f59e0b"/><circle cx="91" cy="147" r="7" fill="#f59e0b"/>
    ${m === "working" ? `<path d="M75 102 Q93 112 94 128" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/><text x="88" y="128" font-size="16">🔨</text>` : ""}
    ${m === "brave" ? `<path d="M75 102 Q93 108 90 126" stroke="#f59e0b" stroke-width="11" fill="none" stroke-linecap="round"/><text x="86" y="126" font-size="14">⚔️</text>` : ""}
    <rect x="43" y="76" width="14" height="22" rx="7" fill="#f59e0b"/>
    <circle cx="50" cy="62" r="25" fill="#f59e0b"/>
    <path d="M26 52 Q28 33 50 30 Q72 33 74 52 Q72 45 50 43 Q28 45 26 52Z" fill="#1c1917"/>
    <rect x="25" y="49" width="50" height="6" rx="3" fill="#dc2626" opacity=".85"/>
    <ellipse cx="42" cy="62" rx="3.8" ry="4.3" fill="#1c1917"/><ellipse cx="58" cy="62" rx="3.8" ry="4.3" fill="#1c1917"/>
    <circle cx="43.5" cy="60.5" r="1.4" fill="white"/><circle cx="59.5" cy="60.5" r="1.4" fill="white"/>
    <path d="M37 55 Q42 52 47 55" stroke="#1c1917" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M53 55 Q58 52 63 55" stroke="#1c1917" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${
      m === "happy" || m === "brave"
        ? `<path d="M42 72 Q50 80 58 72" stroke="#c2410c" stroke-width="2" fill="#fca5a5" stroke-linecap="round"/>`
        : m === "sad"
          ? `<path d="M43 77 Q50 71 57 77" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>`
          : m === "angry"
            ? `<path d="M42 77 Q50 72 58 77" stroke="#c2410c" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M37 53 Q42 50 47 53" stroke="#1c1917" stroke-width="2.5" fill="none"/>
        <path d="M53 53 Q58 50 63 53" stroke="#1c1917" stroke-width="2.5" fill="none"/>`
            : m === "shocked" || m === "surprised"
              ? `<ellipse cx="50" cy="75" rx="5" ry="6" fill="#1c1917" opacity=".75"/>`
              : `<path d="M43 74 Q50 77 57 74" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>`
    }
    <ellipse cx="50" cy="69" rx="3" ry="2" fill="#e8a02e" opacity=".5"/>
    ${m === "brave" ? '<text x="65" y="42" font-size="12">💪</text>' : m === "surprised" ? '<text x="64" y="42" font-size="13">😮</text>' : m === "working" ? '<text x="65" y="42" font-size="12">⚙️</text>' : ""}
  </svg>`,
};

/* ── RICH BACKGROUND RENDERER ── */
const BGDECO = {
  forest: {
    skyExtra: () => {
      // Clouds
      let s = "";
      for (let i = 0; i < 3; i++) {
        const x = 10 + i * 30,
          y = 15 + i * 8,
          w = 50 + i * 20;
        s += `<ellipse cx="${x}%" cy="${y}%" rx="${w}" ry="20" fill="white" opacity=".35"/>`;
      }
      return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
    },
    midExtra:
      () => `<div style="position:absolute;bottom:0;left:0;right:0;display:flex;align-items:flex-end;gap:0">
      <span class="tree-deco" style="left:2%;position:absolute">🌳</span>
      <span class="tree-deco" style="left:12%;position:absolute;font-size:clamp(22px,4vw,42px)">🌿</span>
      <span class="tree-deco" style="left:72%;position:absolute">🌲</span>
      <span class="tree-deco" style="right:5%;position:absolute;font-size:clamp(22px,4vw,42px)">🌿</span>
    </div>`,
    groundExtra:
      () => `<div style="position:absolute;bottom:4px;left:10%;font-size:clamp(14px,2.5vw,22px)">🌸</div>
      <div style="position:absolute;bottom:4px;left:55%;font-size:clamp(14px,2.5vw,22px)">🌼</div>
      <div style="position:absolute;bottom:4px;right:15%;font-size:clamp(14px,2.5vw,22px)">🍄</div>`,
  },
  river: {
    skyExtra:
      () => `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20%" cy="22%" rx="60" ry="18" fill="white" opacity=".28"/>
      <ellipse cx="65%" cy="15%" rx="80" ry="22" fill="white" opacity=".22"/>
    </svg>`,
    midExtra:
      () => `<span class="tree-deco" style="left:5%;position:absolute;bottom:0">🌴</span>
      <span class="tree-deco" style="right:8%;position:absolute;bottom:0">🌴</span>`,
    groundExtra:
      () => `<div style="position:absolute;top:8px;left:0;right:0;height:24px;background:rgba(100,200,255,.4);border-radius:50%"></div>
      <div style="position:absolute;bottom:4px;left:20%;font-size:18px">🪨</div>
      <div style="position:absolute;bottom:4px;right:25%;font-size:18px">🪨</div>`,
  },
  night: {
    skyExtra: () => {
      let s = "";
      for (let i = 0; i < 22; i++)
        s += `<circle cx="${Math.random() * 100}%" cy="${Math.random() * 80}%" r="${0.8 + Math.random() * 1.5}" fill="white" opacity="${0.3 + Math.random() * 0.7}"/>`;
      s += `<text x="82%" y="18%" font-size="22">🌙</text>`;
      return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
    },
    midExtra:
      () => `<span class="tree-deco" style="left:3%;position:absolute;bottom:0;opacity:.5">🌲</span>
      <span class="tree-deco" style="right:5%;position:absolute;bottom:0;opacity:.5">🌲</span>`,
    groundExtra:
      () => `<div style="position:absolute;bottom:6px;left:35%;font-size:14px;opacity:.6">✨</div>
      <div style="position:absolute;bottom:6px;right:30%;font-size:14px;opacity:.6">✨</div>`,
  },
  village: {
    skyExtra:
      () => `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30%" cy="28%" rx="70" ry="22" fill="white" opacity=".3"/>
      <ellipse cx="75%" cy="20%" rx="55" ry="16" fill="white" opacity=".25"/>
      <text x="5%" y="88%" font-size="26">☀️</text>
    </svg>`,
    midExtra:
      () => `<span style="position:absolute;left:5%;bottom:0;font-size:clamp(22px,4vw,40px)">🏡</span>
      <span style="position:absolute;right:8%;bottom:0;font-size:clamp(18px,3vw,32px)">🌾</span>`,
    groundExtra:
      () => `<div style="position:absolute;bottom:4px;left:25%;font-size:16px">🌻</div>
      <div style="position:absolute;bottom:4px;right:22%;font-size:16px">🌻</div>`,
  },
  sea: {
    skyExtra:
      () => `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="25%" cy="20%" rx="65" ry="19" fill="white" opacity=".2"/>
      <text x="80%" y="22%" font-size="22">☀️</text>
    </svg>`,
    midExtra: () =>
      `<span style="position:absolute;left:4%;bottom:0;font-size:clamp(20px,3.5vw,36px)">⛵</span>`,
    groundExtra:
      () => `<div style="position:absolute;top:0;left:0;right:0;height:28px;background:rgba(0,180,255,.35);border-radius:50% 50% 0 0 / 14px 14px 0 0"></div>
      <div style="position:absolute;bottom:4px;right:20%;font-size:16px">🐚</div>`,
  },
  rain: {
    skyExtra: () => {
      let s = "";
      for (let i = 0; i < 18; i++)
        s += `<line x1="${Math.random() * 100}%" y1="${Math.random() * 100}%" x2="${Math.random() * 100 - 0.5}%" y2="${Math.random() * 100 + 4}%" stroke="rgba(150,200,255,.4)" stroke-width="1.5"/>`;
      return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
    },
    midExtra:
      () => `<span class="tree-deco" style="left:6%;position:absolute;bottom:0;opacity:.6">🌲</span>
      <span class="tree-deco" style="right:8%;position:absolute;bottom:0;opacity:.6">🌲</span>`,
    groundExtra: () =>
      `<div style="position:absolute;top:0;left:0;right:0;height:14px;background:rgba(100,150,200,.3)"></div>`,
  },
};

const PTCL_CFG = {
  forest: { c: "#86efac", n: 7 },
  river: { c: "#7dd3fc", n: 11 },
  village: { c: "#fde68a", n: 5 },
  night: { c: "#a5f3fc", n: 12 },
  sea: { c: "#67e8f9", n: 12 },
  rain: { c: "#bae6fd", n: 16 },
};

function renderBg(scene) {
  const bg = scene.bg || "forest";
  const sky = document.getElementById("sc-sky"),
    mid = document.getElementById("sc-mid"),
    gnd = document.getElementById("sc-ground"),
    skyDeco = document.getElementById("sky-deco"),
    gndDeco = document.getElementById("ground-deco"),
    ptcl = document.getElementById("sc-ptcl");

  sky.className = "sc-sky sky-" + bg;
  mid.className = "sc-mid mid-" + bg;
  gnd.className = "sc-ground gnd-" + bg;

  const deco = BGDECO[bg] || BGDECO.forest;
  skyDeco.innerHTML = deco.skyExtra();
  mid.innerHTML = deco.midExtra();
  gndDeco.innerHTML = deco.groundExtra();

  // Particles
  ptcl.innerHTML = "";
  const cfg = PTCL_CFG[bg] || PTCL_CFG.forest;
  for (let i = 0; i < cfg.n; i++) {
    const p = document.createElement("div");
    p.className = "ptcl";
    const s = 3 + Math.random() * 9,
      dur = 3 + Math.random() * 5,
      delay = Math.random() * dur;
    p.style.cssText = `width:${s}px;height:${s}px;background:${cfg.c};opacity:.5;bottom:${10 + Math.random() * 55}%;left:${Math.random() * 100}%;--dx:${(Math.random() - 0.5) * 36}px;animation-duration:${dur}s;animation-delay:${delay}s`;
    ptcl.appendChild(p);
  }
}

/* ── STORY ENGINE ── */
function openStory(id) {
  S.story = DB.find((s) => s.id === id);
  S.scene = 0;
  go("reader");
  document.getElementById("scene-title-bar").textContent = S.story.title;
  renderScene();
  acEnsure();
}

function renderScene() {
  const sc = S.story.scenes[S.scene];
  playPage();
  playAmb(sc.amb);
  renderBg(sc);

  // Render character into char-wrap (already in DOM at correct position)
  const charFn = CHARS[sc.char] || CHARS.kancil;
  document.getElementById("char-wrap").innerHTML = charFn(sc.mood);

  // Narration (below scene, never overlaps)
  const np = document.getElementById("narr-panel");
  const nt = document.getElementById("narr-text");
  np.style.opacity = "0";
  nt.textContent = sc.tx;
  setTimeout(() => {
    np.style.transition = "opacity .45s ease";
    np.style.opacity = "1";
  }, 180);

  // Tap hint
  document.getElementById("tap-hint").textContent = sc.end
    ? "🎉 Selesai! Ketuk untuk melihat bintang"
    : "👆 Ketuk untuk lanjut";

  // Progress
  const total = S.story.scenes.length;
  document.getElementById("prog-bar").style.width =
    (S.scene / (total - 1)) * 100 + "%";

  // Dots
  const dotsEl = document.getElementById("dots");
  dotsEl.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const d = document.createElement("div");
    d.className =
      "dot" + (i === S.scene ? " active" : i < S.scene ? " done" : "");
    d.onclick = () => goScene(i);
    dotsEl.appendChild(d);
  }
  document.getElementById("btn-prev").disabled = S.scene === 0;
  document.getElementById("btn-next").disabled = !!sc.end;
}

function goScene(i) {
  S.scene = i;
  renderScene();
}

function nextScene() {
  playClick();
  const sc = S.story.scenes[S.scene];
  if (sc.end) {
    finishStory();
    return;
  }
  if (S.scene < S.story.scenes.length - 1) {
    // Quick fade transition
    const vp =
      document.getElementById("scene-stage") ||
      document.getElementById("scene");
    S.scene++;
    renderScene();
  }
}
function prevScene() {
  if (S.scene > 0) {
    playClick();
    S.scene--;
    renderScene();
  }
}

function finishStory() {
  if (!S.done(S.story.id)) S.complete(S.story.id);
  playSuccess();
  const last = S.story.scenes[S.story.scenes.length - 1];
  document.getElementById("end-emoji").textContent = S.story.emoji;
  document.getElementById("end-stitle").textContent = S.story.title;
  document.getElementById("moral-txt").textContent =
    last.moral || "Selalu berbuat kebaikan!";
  document.querySelectorAll(".estr").forEach((e, i) => {
    e.style.animation = "none";
    e.offsetHeight;
    e.style.animation = `starPop .4s cubic-bezier(.34,1.56,.64,1) ${0.1 + i * 0.22}s both`;
  });
  // Confetti
  const cf = document.getElementById("confetti");
  cf.innerHTML = "";
  const cols = [
    "#f97316",
    "#fbbf24",
    "#4ade80",
    "#60a5fa",
    "#a78bfa",
    "#f472b6",
    "#34d399",
  ];
  for (let i = 0; i < 50; i++) {
    const p = document.createElement("div");
    p.className = "cp";
    p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};width:${6 + Math.random() * 10}px;height:${6 + Math.random() * 10}px;border-radius:${Math.random() > 0.5 ? "50%" : "3px"};animation-duration:${2 + Math.random() * 3}s;animation-delay:${Math.random() * 2}s`;
    cf.appendChild(p);
  }
  go("end");
  document.getElementById("star-count").textContent = S.stars();
}

/* ── LIBRARY ── */
let activeTag = "all",
  searchQ = "";
function renderLibrary() {
  document.getElementById("star-count").textContent = S.stars();
  const h = new Date().getHours();
  document.getElementById("greeting").textContent =
    h < 10
      ? "Selamat pagi! Yuk mulai hari dengan cerita seru! ☀️"
      : h < 15
        ? "Halo! Saatnya baca cerita sambil istirahat! 📖"
        : h < 18
          ? "Selamat sore! Mau baca cerita apa hari ini? 🌤️"
          : "Selamat malam! Yuk baca cerita sebelum tidur! 🌙";
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  const list = DB.filter((s) => {
    const tagOk = activeTag === "all" || s.tags.includes(activeTag);
    const qOk =
      !searchQ ||
      s.title.toLowerCase().includes(searchQ) ||
      s.sub.toLowerCase().includes(searchQ);
    return tagOk && qOk;
  });
  if (!list.length) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#a16207;font-weight:700">Cerita tidak ditemukan 🔍</div>';
    return;
  }
  list.forEach((s) => {
    const done = S.done(s.id);
    const c = document.createElement("div");
    c.className = "card" + (done ? " done" : "");
    c.innerHTML = `
      <div class="card-thumb" style="background:${s.color}22">
        <div class="card-thumb-bg" style="background:${s.color}"></div>
        <span class="card-emoji">${s.emoji}</span>
      </div>
      <div class="card-body">
        <div class="card-name">${s.title}</div>
        <div class="card-sub">${s.sub}</div>
        <div class="card-meta"><span class="diff diff-${s.diff}">${s.diff}</span><span>${s.dur}</span></div>
      </div>
      ${done ? '<div class="card-done">⭐</div>' : ""}`;
    c.onclick = () => openStory(s.id);
    grid.appendChild(c);
  });
}

/* ── BOOT ── */
window.addEventListener("DOMContentLoaded", () => {
  // Add starPop keyframe
  const style = document.createElement("style");
  style.textContent = `@keyframes starPop{from{transform:scale(0) rotate(-30deg)}to{transform:scale(1) rotate(0)}}`;
  document.head.appendChild(style);

  document.getElementById("btn-start").onclick = () => {
    acEnsure();
    go("library");
  };
  document.getElementById("btn-home").onclick = () => {
    ambNodes.forEach((n) => {
      try {
        n.stop();
      } catch (e) {}
    });
    ambNodes = [];
    go("library");
  };
  const sndBtn = document.getElementById("btn-snd");
  sndBtn.onclick = () => {
    S.sound = !S.sound;
    sndBtn.textContent = S.sound ? "🔊" : "🔇";
    if (masterG)
      masterG.gain.linearRampToValueAtTime(
        S.sound ? 0.35 : 0,
        AC.currentTime + 0.25,
      );
    if (!S.sound) {
      ambNodes.forEach((n) => {
        try {
          n.stop();
        } catch (e) {}
      });
      ambNodes = [];
    } else if (S.story) playAmb(S.story.scenes[S.scene].amb);
  };
  // Clicking the scene stage advances story
  document.getElementById("scene").onclick = nextScene;
  document.getElementById("btn-next").onclick = (e) => {
    e.stopPropagation();
    nextScene();
  };
  document.getElementById("btn-prev").onclick = (e) => {
    e.stopPropagation();
    prevScene();
  };
  document.getElementById("btn-again").onclick = () => openStory(S.story.id);
  document.getElementById("btn-library").onclick = () => go("library");
  document.getElementById("tags").addEventListener("click", (e) => {
    const t = e.target.closest(".tag");
    if (!t) return;
    document
      .querySelectorAll(".tag")
      .forEach((b) => b.classList.remove("active"));
    t.classList.add("active");
    activeTag = t.dataset.tag;
    renderLibrary();
  });
  document.getElementById("search").oninput = (e) => {
    searchQ = e.target.value.toLowerCase();
    renderLibrary();
  };
});
