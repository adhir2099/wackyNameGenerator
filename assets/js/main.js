const CONSONANTS = 'BCDFGHJKLMNPRSTVWXYZ';
  const VOWELS = 'AEIOU';
  const ALL = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';

  // Nice name patterns: alternate consonant/vowel for pronounceability
  function genNameLetters(len) {
    const arr = [];
    for (let i = 0; i < len; i++) {
      // Even indices = consonant or vowel depending on pattern
      if (len <= 4) {
        // CVCV / CVC pattern
        arr.push(i % 2 === 0 ? pick(CONSONANTS) : pick(VOWELS));
      } else {
        // Looser pattern for longer names
        const r = Math.random();
        if (r < 0.55) arr.push(pick(CONSONANTS));
        else arr.push(pick(VOWELS));
      }
    }
    return arr;
  }

  function pick(str) {
    return str[Math.floor(Math.random() * str.length)];
  }

  function randomLetter() {
    return ALL[Math.floor(Math.random() * ALL.length)];
  }

  // ---- State ----
  let nameLength = 4;
  let spinning = false;
  let finalLetters = [];

  const reelsEl   = document.getElementById('reels');
  const spinBtn   = document.getElementById('spinBtn');
  const resultEl  = document.getElementById('result');
  const lenSel    = document.getElementById('lengthSelect');
  const lightsRow = document.getElementById('lightsRow');
  const btnsBar   = document.getElementById('btnsBar');
  const armWrap   = document.getElementById('armWrap');

  // ---- Build UI ----
  function buildMachine(len) {
    reelsEl.innerHTML = '';
    for (let i = 0; i < len; i++) {
      const reel = document.createElement('div');
      reel.className = 'reel';
      reel.id = `reel-${i}`;
      const inner = document.createElement('div');
      inner.className = 'reel-inner';
      inner.id = `inner-${i}`;
      // Fill with 3 letters (top, center, bottom) for visual depth
      for (let j = 0; j < 3; j++) {
        const l = document.createElement('div');
        l.className = 'reel-letter';
        l.textContent = randomLetter();
        inner.appendChild(l);
      }
      reel.appendChild(inner);
      reelsEl.appendChild(reel);
    }

    // Rebuild buttons
    btnsBar.innerHTML = '';
    const btnCount = Math.min(len, 7);
    for (let i = 0; i < btnCount; i++) {
      const b = document.createElement('button');
      b.className = 'btn-key';
      btnsBar.appendChild(b);
    }

    // Rebuild lights
    lightsRow.innerHTML = '';
    const colors = ['r','y','g','b'];
    const lightCount = Math.max(6, len + 2);
    for (let i = 0; i < lightCount; i++) {
      const l = document.createElement('div');
      l.className = 'light';
      l.dataset.color = colors[i % 4];
      lightsRow.appendChild(l);
    }
  }

  function setReelLetter(reelIdx, letter) {
    const inner = document.getElementById(`inner-${reelIdx}`);
    if (!inner) return;
    const letters = inner.querySelectorAll('.reel-letter');
    letters.forEach(l => l.textContent = letter);
  }

  // ---- Spin logic ----
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    resultEl.textContent = '';
    resultEl.classList.remove('pop');

    finalLetters = genNameLetters(nameLength);

    // Start all reels spinning
    for (let i = 0; i < nameLength; i++) {
      const reel = document.getElementById(`reel-${i}`);
      const inner = document.getElementById(`inner-${i}`);
      // Randomize letters rapidly
      reel.classList.add('spinning');
      startRapidChange(i);
    }

    // Arm animation
    armWrap.classList.add('pulling');
    setTimeout(() => armWrap.classList.remove('pulling'), 600);

    // Stop reels one by one with stagger
    for (let i = 0; i < nameLength; i++) {
      const delay = 600 + i * 280;
      setTimeout(() => stopReel(i, finalLetters[i]), delay);
    }

    // Final callback
    const totalDelay = 600 + (nameLength - 1) * 280 + 400;
    setTimeout(() => {
      onAllStopped();
    }, totalDelay);
  }

  // Rapid letter change while spinning
  const rapidIntervals = {};
  function startRapidChange(idx) {
    rapidIntervals[idx] = setInterval(() => {
      const inner = document.getElementById(`inner-${idx}`);
      if (!inner) return;
      inner.querySelectorAll('.reel-letter').forEach(l => l.textContent = randomLetter());
    }, 60);
  }

  function stopReel(idx, letter) {
    clearInterval(rapidIntervals[idx]);
    const reel = document.getElementById(`reel-${idx}`);
    reel.classList.remove('spinning');
    reel.classList.add('landing');
    setReelLetter(idx, letter);
    setTimeout(() => reel.classList.remove('landing'), 400);
  }

  function onAllStopped() {
    spinning = false;
    spinBtn.disabled = false;

    const name = finalLetters.join('');
    resultEl.textContent = '✨ ' + name + ' ✨';
    void resultEl.offsetWidth;
    resultEl.classList.add('pop');

    celebrateLights();
    launchCoins();
  }

  // ---- Lights celebration ----
  let lightTimer = null;
  function celebrateLights() {
    if (lightTimer) clearInterval(lightTimer);
    const lights = lightsRow.querySelectorAll('.light');
    let tick = 0;
    const total = 14;
    lightTimer = setInterval(() => {
      lights.forEach((l, i) => {
        l.className = 'light';
        if ((i + tick) % 2 === 0) {
          const c = l.dataset.color;
          l.classList.add(`on-${c}`);
        }
      });
      tick++;
      if (tick > total) {
        clearInterval(lightTimer);
        lights.forEach(l => l.className = 'light');
      }
    }, 120);
  }

  // ---- Coin particles ----
  function launchCoins() {
    const emojis = ['🪙','💰','⭐','✨','🎉'];
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const coin = document.createElement('div');
        coin.className = 'coin';
        coin.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        coin.style.left = (10 + Math.random() * 80) + 'vw';
        coin.style.top = '10vh';
        coin.style.animationDuration = (0.8 + Math.random() * 0.8) + 's';
        document.body.appendChild(coin);
        setTimeout(() => coin.remove(), 2000);
      }, i * 80);
    }
  }

  // ---- Event listeners ----
  spinBtn.addEventListener('click', spin);

  armWrap.addEventListener('click', () => {
    if (!spinning) spin();
  });

  lenSel.addEventListener('change', () => {
    nameLength = parseInt(lenSel.value);
    buildMachine(nameLength);
    resultEl.textContent = '';
    resultEl.classList.remove('pop');
  });

  // ---- Init ----
  nameLength = parseInt(lenSel.value);
  buildMachine(nameLength);