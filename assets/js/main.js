(() => {
  'use strict';

  // ==========================================================
  //  Letters & name generation
  // ==========================================================
  const CONSONANTS = 'BCDFGHJKLMNPRSTVWXYZ';
  const VOWELS = 'AEIOU';
  const ALL = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';

  // Consonant pairs that read naturally at the start, middle or end of a name
  const START_PAIRS = new Set(['BL','BR','CH','CL','CR','DR','FL','FR','GL','GR','KL','KR','PH','PL','PR','SH','SK','SL','SM','SN','SP','ST','SW','TH','TR','TW','VR','WH','ZH']);
  const END_PAIRS   = new Set(['CH','CK','CT','FT','KS','LD','LF','LK','LL','LM','LP','LT','MP','ND','NG','NK','NS','NT','NZ','PS','RB','RC','RD','RF','RG','RK','RL','RM','RN','RP','RS','RT','RX','SH','SK','SP','SS','ST','TH','TS','TT','ZZ','FF','NX']);
  const MID_PAIRS   = new Set([...START_PAIRS, ...END_PAIRS, 'BB','DD','GG','MM','NN','PP','RR','ZZ','MB','NC','NJ','NF','NV','RV','RZ','LV','LB','SC','MN','GN','KK','DG','BS','DL']);
  const VOWEL_PAIRS = new Set(['AE','AI','AO','AU','EA','EE','EI','EO','EU','IA','IE','IO','IU','OA','OE','OI','OO','OU','UA','UE','UI','UO']);

  const isVowel = (c) => VOWELS.includes(c);
  const pick = (str) => str[Math.floor(Math.random() * str.length)];
  const randomLetter = () => pick(ALL);

  function isPronounceable(arr) {
    const n = arr.length;
    let runC = 0, runV = 0;
    for (let i = 0; i < n; i++) {
      if (isVowel(arr[i])) { runV++; runC = 0; } else { runC++; runV = 0; }
      if (runC > 2 || runV > 2) return false;
      if (i === 0) continue;
      const pair = arr[i - 1] + arr[i];
      const prevV = isVowel(arr[i - 1]), curV = isVowel(arr[i]);
      if (!prevV && !curV) {
        if (i === 1 && !START_PAIRS.has(pair)) return false;
        if (i === n - 1 && !END_PAIRS.has(pair)) return false;
        if (i > 1 && i < n - 1 && !MID_PAIRS.has(pair)) return false;
      } else if (prevV && curV && !VOWEL_PAIRS.has(pair)) {
        return false;
      }
    }
    // Need at least one vowel (or Y) so the name can be said out loud
    return arr.some((c) => isVowel(c) || c === 'Y');
  }

  // Build a name, keeping any held letters in place
  function generateName(len, held) {
    for (let attempt = 0; attempt < 800; attempt++) {
      const arr = [];
      for (let i = 0; i < len; i++) {
        if (held[i]) { arr.push(held[i]); continue; }
        const prev = arr[i - 1];
        let vowelChance;
        if (i === 0) vowelChance = 0.3;
        else if (isVowel(prev)) vowelChance = 0.18;
        else vowelChance = 0.75;
        arr.push(Math.random() < vowelChance ? pick(VOWELS) : pick(CONSONANTS));
      }
      if (isPronounceable(arr)) return arr;
    }
    // Held letters can make a "nice" name impossible — fall back to a simple alternation
    return Array.from({ length: len }, (_, i) => held[i] || (i % 2 ? pick(VOWELS) : pick(CONSONANTS)));
  }

  const toTitle = (letters) => letters[0] + letters.slice(1).join('').toLowerCase();

  // ==========================================================
  //  State & elements
  // ==========================================================
  const MIN_LEN = 3, MAX_LEN = 9;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const $ = (id) => document.getElementById(id);
  const reelsEl = $('reels');
  const holdsEl = $('holds');
  const lengthOptions = $('lengthOptions');
  const spinBtn = $('spinBtn');
  const spinLabel = $('spinLabel');
  const lever = $('lever');
  const marquee = $('marquee');
  const ticket = $('ticket');
  const ticketName = $('ticketName');
  const copyBtn = $('copyBtn');
  const saveBtn = $('saveBtn');
  const savedList = $('savedList');
  const savedEmpty = $('savedEmpty');
  const savedCount = $('savedCount');
  const clearBtn = $('clearBtn');
  const announcer = $('announcer');
  const toast = $('toast');

  let nameLength = loadNumber('wng.length', 4);
  let current = [];          // letters currently on the reels
  let held = [];             // held[i] = letter or null
  let spinning = false;
  let currentName = '';      // last finished name (title case)
  let saved = loadSaved();
  const intervals = {};

  // ==========================================================
  //  Storage (best effort)
  // ==========================================================
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem('wng.saved')) || []; } catch { return []; }
  }
  function persistSaved() {
    try { localStorage.setItem('wng.saved', JSON.stringify(saved)); } catch { /* ignore */ }
  }
  function loadNumber(key, fallback) {
    try {
      const v = parseInt(localStorage.getItem(key), 10);
      return v >= MIN_LEN && v <= MAX_LEN ? v : fallback;
    } catch { return fallback; }
  }

  // ==========================================================
  //  Build UI
  // ==========================================================
  function buildLengthOptions() {
    for (let n = MIN_LEN; n <= MAX_LEN; n++) {
      const id = `len-${n}`;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'length';
      input.id = id;
      input.value = n;
      input.checked = n === nameLength;
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = n;
      label.title = `${n} letters`;
      input.setAttribute('aria-label', `${n} letters`);
      input.addEventListener('change', () => setLength(n));
      lengthOptions.append(input, label);
    }
  }

  function buildMachine(len) {
    reelsEl.innerHTML = '';
    holdsEl.innerHTML = '';
    reelsEl.style.setProperty('--n', len);
    held = Array(len).fill(null);
    current = generateName(len, held);

    for (let i = 0; i < len; i++) {
      const reel = document.createElement('div');
      reel.className = 'reel';
      const inner = document.createElement('div');
      inner.className = 'reel-inner';
      for (let j = 0; j < 3; j++) {
        const l = document.createElement('div');
        l.className = 'reel-letter';
        l.textContent = current[i];
        inner.appendChild(l);
      }
      reel.appendChild(inner);
      reelsEl.appendChild(reel);

      const hold = document.createElement('button');
      hold.type = 'button';
      hold.className = 'hold-btn';
      hold.textContent = 'Hold';
      hold.setAttribute('aria-pressed', 'false');
      hold.addEventListener('click', () => toggleHold(i));
      holdsEl.appendChild(hold);
    }
    updateHoldLabels();
    updateSpinState();
  }

  const reelAt = (i) => reelsEl.children[i];
  const holdAt = (i) => holdsEl.children[i];

  function setReelLetter(i, letter) {
    reelAt(i).querySelectorAll('.reel-letter').forEach((l) => { l.textContent = letter; });
  }

  function updateHoldLabels() {
    for (let i = 0; i < nameLength; i++) {
      const btn = holdAt(i);
      const isHeld = !!held[i];
      btn.setAttribute('aria-pressed', String(isHeld));
      btn.textContent = isHeld ? 'Held' : 'Hold';
      btn.setAttribute('aria-label', `${isHeld ? 'Release' : 'Hold'} letter ${i + 1}, ${current[i]}`);
      reelAt(i).classList.toggle('held', isHeld);
    }
  }

  function updateSpinState() {
    const allHeld = held.length > 0 && held.every(Boolean);
    spinBtn.disabled = spinning || allHeld;
    lever.disabled = spinning || allHeld;
    spinBtn.classList.toggle('busy', spinning);
    spinLabel.textContent = spinning ? 'Spinning…' : allHeld ? 'Release one' : 'Spin';
    holdsEl.querySelectorAll('.hold-btn').forEach((b) => { b.disabled = spinning; });
    lengthOptions.querySelectorAll('input').forEach((r) => { r.disabled = spinning; });
  }

  // ==========================================================
  //  Actions
  // ==========================================================
  function setLength(n) {
    if (spinning || n === nameLength) return;
    nameLength = n;
    try { localStorage.setItem('wng.length', n); } catch { /* ignore */ }
    buildMachine(n);
  }

  function toggleHold(i) {
    if (spinning) return;
    held[i] = held[i] ? null : current[i];
    updateHoldLabels();
    updateSpinState();
  }

  function spin() {
    if (spinning || held.every(Boolean)) return;
    spinning = true;
    updateSpinState();

    const fast = reduceMotion.matches;
    const finalLetters = generateName(nameLength, held);
    const spinIdx = [];
    for (let i = 0; i < nameLength; i++) if (!held[i]) spinIdx.push(i);

    spinIdx.forEach((i) => {
      reelAt(i).classList.add('spinning');
      intervals[i] = setInterval(() => {
        reelAt(i).querySelectorAll('.reel-letter').forEach((l) => { l.textContent = randomLetter(); });
      }, 60);
    });

    lever.classList.remove('pulling');
    void lever.offsetWidth;
    lever.classList.add('pulling');
    setTimeout(() => lever.classList.remove('pulling'), 650);

    const start = fast ? 250 : 650;
    const step = fast ? 90 : 260;
    spinIdx.forEach((i, n) => setTimeout(() => stopReel(i, finalLetters[i]), start + n * step));

    setTimeout(() => finish(finalLetters), start + (spinIdx.length - 1) * step + (fast ? 80 : 380));
  }

  function stopReel(i, letter) {
    clearInterval(intervals[i]);
    const reel = reelAt(i);
    reel.classList.remove('spinning');
    setReelLetter(i, letter);
    reel.classList.add('landing');
    setTimeout(() => reel.classList.remove('landing'), 380);
  }

  function finish(letters) {
    current = letters;
    spinning = false;
    currentName = toTitle(letters);
    updateHoldLabels();
    updateSpinState();
    printTicket(currentName);
    announcer.textContent = `New name: ${currentName}`;
    celebrate();
  }

  function printTicket(name) {
    ticket.hidden = false;
    ticketName.textContent = name;
    updateSaveBtn();
    ticket.classList.remove('printing');
    void ticket.offsetWidth;
    ticket.classList.add('printing');
  }

  function celebrate() {
    marquee.classList.remove('celebrate');
    void marquee.offsetWidth;
    marquee.classList.add('celebrate');
    if (reduceMotion.matches) return;
    const emojis = ['🪙', '🪙', '⭐', '✨', '🎉'];
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const coin = document.createElement('div');
        coin.className = 'coin';
        coin.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        coin.style.left = (8 + Math.random() * 84) + 'vw';
        coin.style.animationDuration = (1 + Math.random() * 0.8) + 's';
        document.body.appendChild(coin);
        setTimeout(() => coin.remove(), 2000);
      }, i * 70);
    }
  }

  // ---------- Copy & save ----------
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  async function copyName(name) {
    const ok = await copyText(name);
    showToast(ok ? `Copied “${name}”` : 'Couldn’t copy. Select the name and copy it manually.');
  }

  function updateSaveBtn() {
    const isSaved = saved.includes(currentName);
    saveBtn.textContent = isSaved ? 'Saved' : 'Save';
    saveBtn.setAttribute('aria-pressed', String(isSaved));
  }

  function toggleSave() {
    if (!currentName) return;
    if (saved.includes(currentName)) {
      saved = saved.filter((n) => n !== currentName);
      showToast(`Removed “${currentName}”`);
    } else {
      saved.unshift(currentName);
      showToast(`Saved “${currentName}”`);
    }
    persistSaved();
    renderSaved();
    updateSaveBtn();
  }

  function renderSaved() {
    savedList.innerHTML = '';
    saved.forEach((name) => {
      const li = document.createElement('li');
      li.className = 'saved-item';

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'saved-copy';
      copy.textContent = name;
      copy.title = `Copy ${name}`;
      copy.addEventListener('click', () => copyName(name));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'saved-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${name}`);
      remove.addEventListener('click', () => {
        saved = saved.filter((n) => n !== name);
        persistSaved();
        renderSaved();
        updateSaveBtn();
      });

      li.append(copy, remove);
      savedList.appendChild(li);
    });
    const count = saved.length;
    savedEmpty.hidden = count > 0;
    clearBtn.hidden = count === 0;
    savedCount.textContent = count ? `(${count})` : '';
  }

  // ==========================================================
  //  Events
  // ==========================================================
  spinBtn.addEventListener('click', spin);
  lever.addEventListener('click', spin);
  copyBtn.addEventListener('click', () => currentName && copyName(currentName));
  saveBtn.addEventListener('click', toggleSave);
  clearBtn.addEventListener('click', () => {
    if (!saved.length) return;
    const backup = saved;
    saved = [];
    persistSaved();
    renderSaved();
    updateSaveBtn();
    showToast(`Cleared ${backup.length} name${backup.length === 1 ? '' : 's'}`);
  });

  // Space / Enter spins, number keys 3–9 change the length
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = e.target.tagName;
    const onControl = tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    if ((e.code === 'Space' || e.key === 'Enter') && !onControl) {
      e.preventDefault();
      spin();
    } else if (/^[3-9]$/.test(e.key) && tag !== 'TEXTAREA') {
      const n = parseInt(e.key, 10);
      const radio = $(`len-${n}`);
      if (radio && !spinning) { radio.checked = true; setLength(n); }
    }
  });

  // ==========================================================
  //  Init
  // ==========================================================
  buildLengthOptions();
  buildMachine(nameLength);
  renderSaved();
})();
