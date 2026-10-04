// ============================================================
//  FRC Quiz - App Logic
//  Depends on: config.js
// ============================================================

/* ── States, Provinces & Countries List ────────────────────── */
const FRC_REGIONS = [
  // US States
  { code: 'AL', name: 'Alabama', country: 'USA' },
  { code: 'AK', name: 'Alaska', country: 'USA' },
  { code: 'AZ', name: 'Arizona', country: 'USA' },
  { code: 'AR', name: 'Arkansas', country: 'USA' },
  { code: 'CA', name: 'California', country: 'USA' },
  { code: 'CO', name: 'Colorado', country: 'USA' },
  { code: 'CT', name: 'Connecticut', country: 'USA' },
  { code: 'DE', name: 'Delaware', country: 'USA' },
  { code: 'FL', name: 'Florida', country: 'USA' },
  { code: 'GA', name: 'Georgia', country: 'USA' },
  { code: 'HI', name: 'Hawaii', country: 'USA' },
  { code: 'ID', name: 'Idaho', country: 'USA' },
  { code: 'IL', name: 'Illinois', country: 'USA' },
  { code: 'IN', name: 'Indiana', country: 'USA' },
  { code: 'IA', name: 'Iowa', country: 'USA' },
  { code: 'KS', name: 'Kansas', country: 'USA' },
  { code: 'KY', name: 'Kentucky', country: 'USA' },
  { code: 'LA', name: 'Louisiana', country: 'USA' },
  { code: 'ME', name: 'Maine', country: 'USA' },
  { code: 'MD', name: 'Maryland', country: 'USA' },
  { code: 'MA', name: 'Massachusetts', country: 'USA' },
  { code: 'MI', name: 'Michigan', country: 'USA' },
  { code: 'MN', name: 'Minnesota', country: 'USA' },
  { code: 'MS', name: 'Mississippi', country: 'USA' },
  { code: 'MO', name: 'Missouri', country: 'USA' },
  { code: 'MT', name: 'Montana', country: 'USA' },
  { code: 'NE', name: 'Nebraska', country: 'USA' },
  { code: 'NV', name: 'Nevada', country: 'USA' },
  { code: 'NH', name: 'New Hampshire', country: 'USA' },
  { code: 'NJ', name: 'New Jersey', country: 'USA' },
  { code: 'NM', name: 'New Mexico', country: 'USA' },
  { code: 'NY', name: 'New York', country: 'USA' },
  { code: 'NC', name: 'North Carolina', country: 'USA' },
  { code: 'ND', name: 'North Dakota', country: 'USA' },
  { code: 'OH', name: 'Ohio', country: 'USA' },
  { code: 'OK', name: 'Oklahoma', country: 'USA' },
  { code: 'OR', name: 'Oregon', country: 'USA' },
  { code: 'PA', name: 'Pennsylvania', country: 'USA' },
  { code: 'RI', name: 'Rhode Island', country: 'USA' },
  { code: 'SC', name: 'South Carolina', country: 'USA' },
  { code: 'SD', name: 'South Dakota', country: 'USA' },
  { code: 'TN', name: 'Tennessee', country: 'USA' },
  { code: 'TX', name: 'Texas', country: 'USA' },
  { code: 'UT', name: 'Utah', country: 'USA' },
  { code: 'VT', name: 'Vermont', country: 'USA' },
  { code: 'VA', name: 'Virginia', country: 'USA' },
  { code: 'WA', name: 'Washington', country: 'USA' },
  { code: 'WV', name: 'West Virginia', country: 'USA' },
  { code: 'WI', name: 'Wisconsin', country: 'USA' },
  { code: 'WY', name: 'Wyoming', country: 'USA' },
  { code: 'PR', name: 'Puerto Rico', country: 'USA' },
  // Canada
  { code: 'ON', name: 'Ontario', country: 'Canada' },
  { code: 'QC', name: 'Quebec', country: 'Canada' },
  { code: 'BC', name: 'British Columbia', country: 'Canada' },
  { code: 'AB', name: 'Alberta', country: 'Canada' },
  // International
  { code: 'ISR', name: 'Israel', country: 'Israel' },
  { code: 'MEX', name: 'Mexico', country: 'Mexico' },
  { code: 'TUR', name: 'Turkey', country: 'Turkey' },
  { code: 'AUS', name: 'Australia', country: 'Australia' },
  { code: 'BRA', name: 'Brazil', country: 'Brazil' },
  { code: 'TWN', name: 'Taiwan', country: 'Taiwan' },
];

/* ── State ─────────────────────────────────────────────────── */
const state = {
  settings: {
    mode: 'popular',         // 'popular' | 'top' | 'random' | 'state' | 'event'
    topCount: 100,           // 50 | 100 | 250 | 500 | 1000
    stateRegion: { code: 'CA', name: 'California' },
    event: null,             // { key, name }
    year: CONFIG.DEFAULT_YEAR || 2026,
    answerChoices: CONFIG.ANSWER_CHOICES || 4,
    requirePhotos: false,     // only teams with photos toggle
  },
  teamPool: [],              // available teams for current quiz mode
  verifiedPhotoPool: [],     // teams confirmed to have working photos preloaded
  usedTeamKeys: new Set(),   // teams already asked this session
  currentQuestionNumber: 1,  // 1-indexed counter
  score: 0,
  answered: false,
  history: [],               // [{ team, chosen, correct }]
  allEvents: [],             // cache of all official events for the year
  cachedPages: {},           // cache for TBA team pages
  cachedCmpTeams: null,      // cache of world championship teams
  imageCache: {},            // `${year}_${teamKey}` -> imageUrl | null
  quizSession: 0,            // bumped on every quiz start - stale async work checks this
  scannerSession: null,      // quizSession the background photo scanner belongs to
};

let isAdvancing = false;

/* ── API Key Helper ────────────────────────────────────────── */
function getTbaKey() {
  const saved = localStorage.getItem('frcq-tba-key');
  if (saved && saved.trim()) return saved.trim();
  if (CONFIG.TBA_API_KEY && CONFIG.TBA_API_KEY !== 'YOUR_TBA_API_KEY_HERE') {
    return CONFIG.TBA_API_KEY.trim();
  }
  return '';
}

/* ── TBA API helpers ───────────────────────────────────────── */
const TBA_BASE = 'https://www.thebluealliance.com/api/v3';

async function tbaFetch(path) {
  const key = getTbaKey();
  if (!key) {
    throw new Error('Missing TBA API key. Enter it in Settings or config.js.');
  }

  const res = await fetch(`${TBA_BASE}${path}`, {
    headers: { 'X-TBA-Auth-Key': key },
  });
  if (!res.ok) throw new Error(`TBA ${res.status}: ${path}`);
  return res.json();
}

/* ── Event & State Helpers ─────────────────────────────────── */
async function loadEvents(year) {
  if (state.allEvents.length > 0 && state.allEvents[0]?.year === year) {
    return state.allEvents;
  }
  const events = await tbaFetch(`/events/${year}/simple`);
  state.allEvents = (events || []).filter(e =>
    e.event_type === 0 || // Regional
    e.event_type === 1 || // District Event
    e.event_type === 2 || // District Championship
    e.event_type === 3 || // CMP Division
    e.event_type === 4    // Einstein
  );
  return state.allEvents;
}

/* ── Build Team Pool ───────────────────────────────────────── */
async function buildTeamPool(session = state.quizSession) {
  const { mode, topCount, stateRegion, event, year } = state.settings;
  let pool = [];

  if (mode === 'popular') {
    // 123 Popular Teams from frc_team_numbers.txt
    if (typeof POPULAR_TEAMS !== 'undefined' && Array.isArray(POPULAR_TEAMS) && POPULAR_TEAMS.length > 0) {
      pool = [...POPULAR_TEAMS];
    } else {
      pool = await fetchTopRankedTeams(year, 100);
    }

  } else if (mode === 'top') {
    pool = await fetchTopRankedTeams(year, parseInt(topCount) || 100);

  } else if (mode === 'state') {
    const region = stateRegion || { code: 'CA', name: 'California' };
    pool = await fetchStateTeams(year, region);

  } else if (mode === 'event') {
    let targetEvent = event;
    if (!targetEvent) {
      const events = await loadEvents(year);
      targetEvent = events[0] || null;
      if (targetEvent && session === state.quizSession) {
        state.settings.event = { key: targetEvent.key, name: targetEvent.name };
        saveSettings();
      }
    }
    if (!targetEvent) throw new Error(`No events found for ${year}.`);
    const teams = await tbaFetch(`/event/${targetEvent.key}/teams/simple`);
    pool = (teams || []).map(normaliseTeam);

  } else {
    // Random / All Teams: Pick random pages of active teams
    const randomPage = Math.floor(Math.random() * 6);
    let batch = await fetchTbaPage(year, randomPage);
    if (!batch || batch.length < state.settings.answerChoices) {
      batch = await fetchTbaPage(year, 0);
    }
    pool = (batch || []).map(normaliseTeam);
  }

  // A newer quiz was started while this one was still fetching.
  // Discard the result so it can never overwrite the newer session's pool.
  if (session !== state.quizSession) return false;

  // Deduplicate and filter out teams without a name
  const seen = new Set();
  pool = pool.filter(t => {
    if (!t.name || t.name.trim().length === 0) return false;
    if (seen.has(t.key)) return false;
    seen.add(t.key);
    return true;
  });

  if (pool.length < state.settings.answerChoices) {
    throw new Error(`Not enough active teams found for ${year} with the selected options.`);
  }

  state.teamPool = pool;

  // Reset infinite queue
  state.usedTeamKeys.clear();
  state.currentQuestionNumber = 1;
  state.score = 0;
  state.history = [];
  return true;
}

/* ── Top Ranked Teams Fetcher ─────────────────────────────── */
async function fetchTopRankedTeams(year, count) {
  if (!state.cachedTopTeams || state.cachedTopTeamsYear !== year) {
    const teamMap = new Map();

    if (year <= 2025) {
      const divKeys = [
        `${year}cmptx`,
        `${year}arc`,
        `${year}cur`,
        `${year}dal`,
        `${year}gal`,
        `${year}hop`,
        `${year}joh`,
        `${year}mil`,
        `${year}new`
      ];

      await Promise.all(
        divKeys.map(async k => {
          try {
            const teams = await tbaFetch(`/event/${k}/teams/simple`);
            (teams || []).forEach(t => {
              if (!teamMap.has(t.key)) {
                teamMap.set(t.key, normaliseTeam(t));
              }
            });
          } catch {}
        })
      );
    } else {
      // Current / Upcoming season (e.g. 2026): championship hasn't completed yet.
      // Load active 2026 teams from TBA team directory pages.
      const neededPages = Math.max(2, Math.ceil(count / 100));
      for (let p = 0; p < neededPages; p++) {
        try {
          const batch = await fetchTbaPage(year, p);
          (batch || []).forEach(t => {
            if (!teamMap.has(t.key)) {
              teamMap.set(t.key, normaliseTeam(t));
            }
          });
        } catch {}
      }
    }

    // If more teams are requested than currently in teamMap, fetch more pages for this year
    let pageIdx = 0;
    while (teamMap.size < count && pageIdx < 6) {
      try {
        const batch = await fetchTbaPage(year, pageIdx);
        if (!batch || batch.length === 0) break;
        batch.forEach(t => {
          if (!teamMap.has(t.key)) {
            teamMap.set(t.key, normaliseTeam(t));
          }
        });
      } catch {}
      pageIdx++;
    }

    state.cachedTopTeams = Array.from(teamMap.values());
    state.cachedTopTeamsYear = year;
  }

  return [...state.cachedTopTeams].slice(0, count);
}

/* ── State / Province Teams Fetcher (Regional + District) ──── */
async function fetchStateTeams(year, region) {
  const events = await loadEvents(year);
  const code = (region.code || '').toUpperCase().trim();
  const name = (region.name || '').toLowerCase().trim();

  const stateEvents = events.filter(e => {
    const ep = (e.state_prov || '').toUpperCase().trim();
    const en = (e.name || '').toLowerCase();
    return ep === code || en.includes(name);
  });

  const teamMap = new Map();

  await Promise.all(
    stateEvents.map(async ev => {
      try {
        const teams = await tbaFetch(`/event/${ev.key}/teams/simple`);
        (teams || []).forEach(t => teamMap.set(t.key, normaliseTeam(t)));
      } catch {}
    })
  );

  const districtMap = {
    'MI': 'fim', 'TX': 'fit', 'CA': 'ca', 'IN': 'fin',
    'NC': 'fnc', 'SC': 'fsc', 'WI': 'win', 'ON': 'ont',
    'ISR': 'isr', 'MD': 'fch', 'VA': 'fch', 'PA': 'fma',
    'NJ': 'fma', 'WA': 'pnw', 'OR': 'pnw', 'GA': 'pch'
  };

  const distKey = districtMap[code];
  if (distKey) {
    try {
      const distTeams = await tbaFetch(`/district/${year}${distKey}/teams`);
      (distTeams || []).forEach(t => teamMap.set(t.key, normaliseTeam(t)));
    } catch {}
  }

  if (teamMap.size < 4) {
    const page0 = await fetchTbaPage(year, 0);
    page0.forEach(t => {
      if ((t.state_prov || '').toLowerCase() === name || (t.state_prov || '').toUpperCase() === code) {
        teamMap.set(t.key, normaliseTeam(t));
      }
    });
  }

  return Array.from(teamMap.values());
}

async function fetchTbaPage(year, page) {
  const cacheKey = `${year}_${page}`;
  if (state.cachedPages[cacheKey]) {
    return state.cachedPages[cacheKey];
  }
  const batch = await tbaFetch(`/teams/${year}/${page}/simple`);
  if (Array.isArray(batch)) {
    state.cachedPages[cacheKey] = batch;
  }
  return batch || [];
}

function normaliseTeam(t) {
  return {
    number: t.team_number,
    key: t.key,
    name: t.nickname || t.name || `Team ${t.team_number}`,
    city: t.city || '',
    state: t.state_prov || '',
    country: t.country || '',
  };
}

/* ── Direct Image Extractor & Speed Optimizer ────────────── */
function optimizeImageUrl(rawUrl, foreignKey) {
  let url = rawUrl ? String(rawUrl).trim() : '';

  // Ensure https
  if (url.startsWith('http://')) {
    url = 'https://' + url.slice(7);
  }

  // Handle Imgur
  let imgurId = foreignKey ? String(foreignKey).trim() : null;
  if (!imgurId && url.includes('imgur.com')) {
    const m = url.match(/imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)/i);
    if (m) imgurId = m[1];
  }

  if (imgurId) {
    const cleanId = imgurId.replace(/\.(jpeg|jpg|png|webp|gif)$/i, '').replace(/[hlmts]$/, '');
    // If it's a gif, keep gif, otherwise use huge thumbnail h.jpg for 10x-20x faster downloads (~100KB)
    if (url.endsWith('.gif')) {
      return `https://i.imgur.com/${cleanId}.gif`;
    }
    return `https://i.imgur.com/${cleanId}h.jpg`;
  }

  return url || null;
}

function extractDirectImageUrl(mediaList) {
  if (!Array.isArray(mediaList) || mediaList.length === 0) return null;
  const candidates = [];

  for (const m of mediaList) {
    if (!m || m.type === 'avatar' || m.type === 'youtube' || m.type === 'onshape') continue;
    let url = null;

    if (m.type === 'imgur') {
      url = optimizeImageUrl(m.direct_url, m.foreign_key);
    } else if (m.type === 'cd-thread' || m.type === 'cdphotothread') {
      const cdUrl = m.details?.image_url;
      if (cdUrl && !cdUrl.includes('/t/')) {
        url = cdUrl.startsWith('http://') ? 'https://' + cdUrl.slice(7) : cdUrl;
      }
    } else if (m.direct_url) {
      const d = m.direct_url.toLowerCase();
      if (!d.includes('instagram.com') && !d.includes('youtube.com') && !d.includes('onshape.com') && !d.includes('/t/')) {
        url = optimizeImageUrl(m.direct_url, null);
      }
    }

    if (url) {
      const cleanUrl = url.trim();
      const isImgur = cleanUrl.includes('i.imgur.com');
      const isCD = cleanUrl.includes('chiefdelphi.com') && (cleanUrl.includes('/uploads/') || cleanUrl.includes('/media/img/') || /\.(jpeg|jpg|png|webp|gif)/i.test(cleanUrl)) && !cleanUrl.includes('/t/');
      const hasImgExt = /\.(jpeg|jpg|png|webp|gif)($|\?)/i.test(cleanUrl);

      if (isImgur || isCD || hasImgExt) {
        candidates.push({ url: cleanUrl, preferred: !!m.preferred });
      }
    }
  }

  if (candidates.length === 0) return null;
  const pref = candidates.find(x => x.preferred);
  return pref ? pref.url : candidates[0].url;
}

/* ── Preload & Verify Image Directly in Browser Cache ──────── */
function verifyAndPreloadUrl(url, timeoutMs = 3500) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    let done = false;
    img.decoding = 'async';

    img.onload = () => {
      if (!done) {
        done = true;
        // Filter out 1x1 tracking pixels or Imgur's 161x81 "removed image" placeholder
        if (img.naturalWidth > 180 && img.naturalHeight > 100) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    };
    img.onerror = () => {
      if (!done) {
        done = true;
        resolve(false);
      }
    };
    img.src = url;

    setTimeout(() => {
      if (!done) {
        done = true;
        resolve(false);
      }
    }, timeoutMs);
  });
}

/* ── Fast Robot Image Fetcher (Strictly for the selected season) ── */
async function fetchRobotImage(teamKey, year) {
  const selectedYear = year || state.settings.year;
  const cacheKey = `${selectedYear}_${teamKey}`;
  if (cacheKey in state.imageCache) {
    return state.imageCache[cacheKey];
  }

  try {
    // Strictly fetch media for the chosen season so robots from previous seasons are never shown
    const media = await tbaFetch(`/team/${teamKey}/media/${selectedYear}`).catch(() => []);
    if (Array.isArray(media) && media.length > 0) {
      const candidateUrl = extractDirectImageUrl(media);
      if (candidateUrl) {
        // Preload and verify that browser can actually load the image
        const isValid = await verifyAndPreloadUrl(candidateUrl);
        if (isValid) {
          state.imageCache[cacheKey] = candidateUrl;
          return candidateUrl;
        }
      }
    }
  } catch {}

  state.imageCache[cacheKey] = null;
  return null;
}

/* ── Background Photo Scanner (Keeps upcoming questions instant) ── */
async function startBackgroundPhotoScanner(maxNeeded = 80, session = state.quizSession) {
  // Only one scanner per quiz session. Starting a new session takes over the
  // slot; the older scanner sees the mismatch on its next tick and exits.
  if (state.scannerSession === session) return;
  state.scannerSession = session;

  try {
    const pool = state.teamPool;
    const year = state.settings.year;

    for (let i = 0; i < pool.length; i += 6) {
      // Stop immediately if a newer quiz (possibly with a different team pool) started
      if (state.quizSession !== session) break;
      if (state.verifiedPhotoPool.length >= maxNeeded) break;

      const chunk = pool.slice(i, i + 6).filter(t => !(`${year}_${t.key}` in state.imageCache));
      if (chunk.length === 0) continue;

      await Promise.all(
        chunk.map(async t => {
          const imgUrl = await fetchRobotImage(t.key, year);
          if (state.quizSession !== session) return;
          if (imgUrl && !state.verifiedPhotoPool.some(v => v.key === t.key)) {
            state.verifiedPhotoPool.push(t);
          }
        })
      );

      // Brief yield so the UI event loop stays responsive
      await new Promise(r => setTimeout(r, 40));
    }
  } catch (err) {
    console.warn('Background photo scanner error:', err);
  } finally {
    if (state.scannerSession === session) state.scannerSession = null;
  }
}

/* ── Pick Next Question (Infinite Queue) ───────────────────── */
async function getNextQuestion(session = state.quizSession) {
  const pool = state.teamPool;
  if (!pool || pool.length === 0) throw new Error('Team pool is empty.');
  const year = state.settings.year;

  if (state.settings.requirePhotos) {
    // 1. Gather all verified teams not yet asked this cycle
    let available = state.verifiedPhotoPool.filter(t => !state.usedTeamKeys.has(t.key));

    // 2. If no available verified teams, scan any remaining unchecked teams in the pool first!
    if (available.length === 0) {
      const unchecked = pool.filter(t => !(`${year}_${t.key}` in state.imageCache));
      if (unchecked.length > 0) {
        for (let i = 0; i < unchecked.length && available.length === 0; i += 12) {
          const batch = unchecked.slice(i, i + 12);
          await Promise.all(
            batch.map(async t => {
              const url = await fetchRobotImage(t.key, year);
              if (state.quizSession !== session) return;
              if (url && !state.verifiedPhotoPool.some(v => v.key === t.key)) {
                state.verifiedPhotoPool.push(t);
              }
            })
          );
          if (state.quizSession !== session) break;
          available = state.verifiedPhotoPool.filter(t => !state.usedTeamKeys.has(t.key));
        }
      }
    }

    // 3. ONLY when all teams in the pool have been scanned AND all verified teams have been asked,
    // reset used keys for an endless loop across all verified teams
    if (available.length === 0 && state.verifiedPhotoPool.length > 0) {
      state.usedTeamKeys.clear();
      available = [...state.verifiedPhotoPool];
    }

    if (available.length === 0) {
      throw new Error(`No verified robot photos found for ${year} with these teams. Please try Top Teams or disable "Only teams with photos".`);
    }

    // Pick from verifiedPhotoPool
    const chosen = available[Math.floor(Math.random() * available.length)];
    state.usedTeamKeys.add(chosen.key);
    const chosenImg = state.imageCache[`${year}_${chosen.key}`];

    // Pick 3 distractors from the broader pool (names only)
    const distractors = pool
      .filter(t => t.key !== chosen.key && t.name !== chosen.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, state.settings.answerChoices - 1);

    const choices = [...distractors, chosen].sort(() => Math.random() - 0.5);
    return { correct: chosen, choices, preloadedImage: chosenImg };

  } else {
    // Normal mode: pick any team
    let available = pool.filter(t => !state.usedTeamKeys.has(t.key));
    if (available.length === 0) {
      state.usedTeamKeys.clear();
      available = [...pool];
    }
    const correct = available[Math.floor(Math.random() * available.length)] || pool[0];
    state.usedTeamKeys.add(correct.key);

    let imgUrl = state.imageCache[`${year}_${correct.key}`] || null;
    if (!(`${year}_${correct.key}` in state.imageCache)) {
      imgUrl = await fetchRobotImage(correct.key, year);
    }

    const distractors = pool
      .filter(t => t.key !== correct.key && t.name !== correct.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, state.settings.answerChoices - 1);

    const choices = [...distractors, correct].sort(() => Math.random() - 0.5);
    return { correct, choices, preloadedImage: imgUrl };
  }
}


/* ── DOM helpers ─────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(`page-${name}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Render quiz question ────────────────────────────────── */
async function renderQuestion(session = state.quizSession) {
  if (session !== state.quizSession) return;
  state.answered = false;

  const nextBtn = $('next-btn');
  if (nextBtn) {
    nextBtn.style.display = 'none';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Next Question →';
  }

  const { correct, choices, preloadedImage } = await getNextQuestion(session);
  // A newer quiz started while we were waiting - never paint a question from an old team pool
  if (session !== state.quizSession) return;
  state.currentQuestion = { correct, choices };

  const totalAnswered = state.history.length;
  const pct = totalAnswered > 0 ? Math.round((state.score / totalAnswered) * 100) : 0;

  // Header updates
  $('quiz-progress').textContent = `Question #${state.currentQuestionNumber}`;
  $('quiz-score').innerHTML = `Score <span>${state.score}</span>/${totalAnswered} (${pct}%)`;

  // Robot number only - NO location text
  $('robot-number').textContent = `#${correct.number}`;
  $('robot-question').textContent = `Which team is Robot #${correct.number}?`;

  // Image loading placeholder
  const imgWrap = $('robot-image-wrap');
  imgWrap.innerHTML = `
    <div class="robot-image-placeholder">
      <div class="icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      </div>
      <div>Loading robot photo…</div>
    </div>
  `;

  // Render choices - TEAM NAMES ONLY (no location)
  renderChoices(choices, correct);

  // Clear feedback
  const fb = $('feedback-banner');
  fb.className = 'feedback-banner';
  fb.textContent = '';

  // Apply image
  const yearKey = `${state.settings.year}_${correct.key}`;
  const imageUrl = preloadedImage || state.imageCache[yearKey];

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Team ${correct.number} Robot`;
    img.loading = 'eager';

    // If already preloaded & cached by browser, render instantly without flash
    if (img.complete && img.naturalWidth > 0) {
      imgWrap.innerHTML = '';
      imgWrap.appendChild(img);
    } else {
      img.onload = () => {
        if (session !== state.quizSession) return;
        imgWrap.innerHTML = '';
        imgWrap.appendChild(img);
      };
      img.onerror = () => {
        if (session !== state.quizSession) return;
        if (state.settings.requirePhotos) {
          console.warn(`Image for team ${correct.number} failed to display, loading next question...`);
          state.imageCache[yearKey] = null;
          state.verifiedPhotoPool = state.verifiedPhotoPool.filter(t => t.key !== correct.key);
          renderQuestion(session);
        } else {
          imgWrap.innerHTML = `
            <div class="robot-image-placeholder">
              <div class="icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <div>No photo available</div>
            </div>
          `;
        }
      };
    }
  } else {
    if (state.settings.requirePhotos) {
      // Safety guard: never show "No photo available" when requirePhotos is active
      renderQuestion(session);
      return;
    }
    imgWrap.innerHTML = `
      <div class="robot-image-placeholder">
        <div class="icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </div>
        <div>No photo available</div>
      </div>
    `;
  }
}

/* ── Clean Team Name for Display (Strips team numbers from answer choices) ── */
function getCleanTeamName(team, correctNumber) {
  let name = (team.name || (`Team ${team.number}`)).trim();
  const numStr = String(team.number);
  const targetNumStr = correctNumber ? String(correctNumber) : null;

  const numbersToStrip = [numStr];
  if (targetNumStr && targetNumStr !== numStr) {
    numbersToStrip.push(targetNumStr);
  }

  for (const n of numbersToStrip) {
    name = name.replace(new RegExp('\\bTeam\\s*#?' + n + '\\b', 'gi'), ' ');
    name = name.replace(new RegExp('\\bFRC\\s*#?' + n + '\\b', 'gi'), ' ');
    name = name.replace(new RegExp('\\(#?' + n + '\\)', 'g'), ' ');
    name = name.replace(new RegExp('\\[#?' + n + '\\]', 'g'), ' ');
    name = name.replace(new RegExp('#' + n + '\\b', 'g'), ' ');
    name = name.replace(new RegExp('\\b' + n + '\\b', 'g'), ' ');
  }

  // Remove empty parens/brackets and clean up leading/trailing punctuation (dashes, colons, commas)
  let cleaned = name
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/^[-–—:,.\s]+/, '')
    .replace(/[-–—:,.\s]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If removing the number leaves nothing or generic "Team", keep original name
  if (!cleaned || cleaned.toLowerCase() === 'team' || cleaned.toLowerCase() === 'frc') {
    return team.name || (`Team ${team.number}`);
  }

  return cleaned;
}

function renderChoices(choices, correct) {
  const grid = $('choices-grid');
  grid.innerHTML = '';
  choices.forEach(team => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    const displayName = getCleanTeamName(team, correct.number);
    btn.innerHTML = `<span class="choice-team-name">${displayName}</span>`;
    btn.addEventListener('click', () => handleAnswer(team, correct, choices));
    grid.appendChild(btn);
  });
}

function handleAnswer(chosen, correct, allChoices) {
  if (state.answered) return;
  state.answered = true;

  const isCorrect = chosen.key === correct.key;
  if (isCorrect) state.score++;

  state.history.push({ team: correct, correct: isCorrect, chosen });

  const totalAnswered = state.history.length;
  const pct = Math.round((state.score / totalAnswered) * 100);

  // Style buttons
  $('choices-grid').querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.disabled = true;
    const team = allChoices[i];
    if (team.key === correct.key) {
      btn.classList.add('correct');
    } else if (team.key === chosen.key) {
      btn.classList.add('wrong');
    }
  });

  // Feedback banner (clean without emojis)
  const fb = $('feedback-banner');
  if (isCorrect) {
    fb.className = 'feedback-banner show correct-fb';
    fb.textContent = `Correct! #${correct.number} is ${correct.name}.`;
  } else {
    fb.className = 'feedback-banner show wrong-fb';
    fb.textContent = `Incorrect. Robot #${correct.number} is ${correct.name}.`;
  }

  // Show Next button immediately and ensure it is enabled
  const nextBtn = $('next-btn');
  if (nextBtn) {
    nextBtn.style.display = 'inline-flex';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Next Question →';
    nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('quiz-score').innerHTML = `Score <span>${state.score}</span>/${totalAnswered} (${pct}%)`;
}

async function nextQuestion() {
  if (isAdvancing) return;
  isAdvancing = true;
  const session = state.quizSession;

  const nextBtn = $('next-btn');
  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.textContent = 'Loading...';
  }

  try {
    state.currentQuestionNumber++;
    await renderQuestion(session);
  } catch (err) {
    console.error('Error advancing to next question:', err);
    toast('Loading next question...');
    try {
      if (session === state.quizSession) await renderQuestion(session);
    } catch {}
  } finally {
    isAdvancing = false;
    if (nextBtn && session === state.quizSession) {
      nextBtn.disabled = false;
      nextBtn.textContent = 'Next Question →';
    }
  }
}

/* ── Results ─────────────────────────────────────────────── */
function showResults() {
  const total = state.history.length;
  if (total === 0) {
    showPage('home');
    return;
  }

  const score = state.score;
  const pct = Math.round((score / total) * 100);

  $('results-score-text').textContent = `${score}/${total}`;
  $('results-title').textContent = `${pct}% — ${getRank(pct)}`;
  $('results-sub').textContent = `You answered ${score} out of ${total} correctly in this endless session.`;

  $('breakdown-correct').textContent = score;
  $('breakdown-wrong').textContent = total - score;
  $('breakdown-pct').textContent = `${pct}%`;

  const list = $('review-list');
  list.innerHTML = '';
  state.history.forEach(h => {
    const div = document.createElement('div');
    div.className = `review-item ${h.correct ? 'correct-r' : 'wrong-r'}`;
    div.innerHTML = `
      <div class="review-badge ${h.correct ? 'badge-good' : 'badge-bad'}">${h.correct ? 'Correct' : 'Missed'}</div>
      <div class="review-info">
        <div class="review-team">#${h.team.number} — ${h.team.name}</div>
        ${!h.correct ? `<div class="review-detail">Your guess: ${h.chosen.name}</div>` : ''}
      </div>
    `;
    list.appendChild(div);
  });

  recordSessionResult();
  showPage('results');
}

function getRank(pct) {
  if (pct === 100) return 'World Champion!';
  if (pct >= 90)  return 'FRC Genius!';
  if (pct >= 75)  return 'Drive Coach Level!';
  if (pct >= 50)  return 'Solid Scouter!';
  if (pct >= 25)  return 'Keep Practicing!';
  return 'Rookie Year!';
}

/* ── Settings Initialization ──────────────────────────────── */
function initSettings() {
  const saved = localStorage.getItem('frcq-settings');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      Object.assign(state.settings, s);
    } catch {}
  }

  if (!state.settings.mode || !['popular', 'top', 'random', 'state', 'event'].includes(state.settings.mode)) {
    state.settings.mode = 'popular';
  }
  if (!state.settings.year) state.settings.year = 2026;
  if (!state.settings.topCount) state.settings.topCount = 100;
  if (!state.settings.stateRegion) state.settings.stateRegion = { code: 'CA', name: 'California' };

  // Photo-only toggle
  const photoToggle = $('photo-only-toggle');
  if (photoToggle) {
    photoToggle.checked = !!state.settings.requirePhotos;
    photoToggle.addEventListener('change', e => {
      state.settings.requirePhotos = e.target.checked;
      saveSettings();
    });
  }

  // TBA API Key input
  const apiKeyInput = $('tba-api-input');
  if (apiKeyInput) {
    const currentKey = getTbaKey();
    if (currentKey) apiKeyInput.value = currentKey;
    apiKeyInput.addEventListener('input', e => {
      const val = e.target.value.trim();
      if (val) {
        localStorage.setItem('frcq-tba-key', val);
      } else {
        localStorage.removeItem('frcq-tba-key');
      }
      updateApiNotice();
    });
  }

  updateApiNotice();
  applySettingsToUI();

  // Mode radio buttons
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => {
      state.settings.mode = r.value;
      updateModeSubPickers(r.value);
      saveSettings();
    });
  });

  // Top teams count selector
  $('top-count-select').addEventListener('change', e => {
    state.settings.topCount = parseInt(e.target.value);
    saveSettings();
  });

  // Year selector
  $('year-select').addEventListener('change', e => {
    state.settings.year = parseInt(e.target.value);
    $('stat-year').textContent = state.settings.year;
    state.allEvents = [];
    state.cachedTopTeams = null;
    state.cachedTopTeamsYear = null;
    state.cachedPages = {};
    state.imageCache = {};
    state.verifiedPhotoPool = [];
    state.teamPool = [];
    state.usedTeamKeys.clear();
    saveSettings();
    if (state.settings.mode === 'event') loadEventsUI();
  });

  // Answer choices
  $('choices-select').addEventListener('change', e => {
    state.settings.answerChoices = parseInt(e.target.value);
    saveSettings();
  });

  // State search
  $('state-search').addEventListener('input', debounce(filterStates, 200));

  // Event search
  $('event-search').addEventListener('input', debounce(filterEvents, 250));

  updateModeSubPickers(state.settings.mode);
}

function updateModeSubPickers(mode) {
  $('top-count-picker').classList.toggle('show', mode === 'top');
  $('state-picker').classList.toggle('show', mode === 'state');
  $('event-picker').classList.toggle('show', mode === 'event');

  if (mode === 'state') filterStates();
  if (mode === 'event' && state.allEvents.length === 0) loadEventsUI();
}

function applySettingsToUI() {
  const s = state.settings;

  const radio = document.querySelector(`input[name="mode"][value="${s.mode}"]`);
  if (radio) radio.checked = true;

  $('top-count-select').value = s.topCount || 100;
  $('year-select').value = s.year;
  $('choices-select').value = s.answerChoices;

  const photoToggle = $('photo-only-toggle');
  if (photoToggle) photoToggle.checked = !!s.requirePhotos;

  if (s.stateRegion) {
    $('state-search').value = s.stateRegion.name;
  }
  if (s.event) {
    $('event-search').value = s.event.name;
  }
}

function saveSettings() {
  localStorage.setItem('frcq-settings', JSON.stringify(state.settings));
}

function updateApiNotice() {
  const notice = $('api-notice');
  if (!notice) return;
  const key = getTbaKey();
  notice.style.display = key ? 'none' : 'flex';
}

/* ── States List Filter ───────────────────────────────────── */
function filterStates() {
  const q = ($('state-search').value || '').toLowerCase();
  const container = $('state-results');
  container.innerHTML = '';

  const matches = FRC_REGIONS.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.code.toLowerCase().includes(q) ||
    r.country.toLowerCase().includes(q)
  );

  matches.forEach(r => {
    const div = document.createElement('div');
    const isSel = state.settings.stateRegion?.code === r.code;
    div.className = `region-result-item${isSel ? ' selected' : ''}`;
    div.innerHTML = `<span class="region-result-name">${r.name} (${r.code})</span><span class="region-result-key">${r.country}</span>`;
    div.addEventListener('click', () => {
      state.settings.stateRegion = { code: r.code, name: r.name, country: r.country };
      $('state-search').value = r.name;
      saveSettings();
      container.querySelectorAll('.region-result-item').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      toast(`Selected ${r.name}`);
    });
    container.appendChild(div);
  });
}

/* ── Events List UI ───────────────────────────────────────── */
async function loadEventsUI() {
  try {
    const container = $('event-results');
    container.innerHTML = '<div style="padding:10px 12px;font-size:0.85rem;color:var(--text-muted)">Loading events…</div>';
    await loadEvents(state.settings.year);
    filterEvents();
  } catch (e) {
    toast(`Notice: Could not load events: ${e.message}`);
  }
}

function filterEvents() {
  const q = ($('event-search').value || '').toLowerCase();
  const container = $('event-results');
  container.innerHTML = '';

  const matches = state.allEvents.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.key.toLowerCase().includes(q) ||
    (e.city && e.city.toLowerCase().includes(q)) ||
    (e.state_prov && e.state_prov.toLowerCase().includes(q))
  );

  if (matches.length === 0) {
    container.innerHTML = '<div style="padding:10px 12px;font-size:0.85rem;color:var(--text-muted)">No matching events found.</div>';
    return;
  }

  matches.slice(0, 40).forEach(ev => {
    const div = document.createElement('div');
    const isSel = state.settings.event?.key === ev.key;
    div.className = `region-result-item${isSel ? ' selected' : ''}`;
    const loc = [ev.city, ev.state_prov, ev.country].filter(Boolean).join(', ');
    div.innerHTML = `<span class="region-result-name">${ev.name}</span><span class="region-result-key">${loc || ev.key}</span>`;
    div.addEventListener('click', () => {
      state.settings.event = { key: ev.key, name: ev.name };
      $('event-search').value = ev.name;
      saveSettings();
      container.querySelectorAll('.region-result-item').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      toast(`Selected ${ev.name}`);
    });
    container.appendChild(div);
  });
}

/* ── Start Quiz Flow ──────────────────────────────────────── */
async function startQuiz() {
  const key = getTbaKey();
  if (!key) {
    toast('Notice: Please enter your TBA API key in Settings first.');
    showPage('settings');
    return;
  }

  // Start a brand new quiz session. Any quiz still loading (or any background
  // scanner) from a previous selection becomes stale and stops writing state,
  // so an old team pool can never leak into this one.
  const session = ++state.quizSession;
  state.verifiedPhotoPool = [];
  state.usedTeamKeys.clear();

  showPage('quiz');
  $('quiz-content').style.display = 'none';
  $('quiz-loading').classList.add('show');
  const loadingText = $('quiz-loading-text');

  try {
    if (loadingText) loadingText.textContent = 'Building team roster…';
    const built = await buildTeamPool(session);
    if (!built || session !== state.quizSession) return; // superseded by a newer quiz start

    state.verifiedPhotoPool = [];
    state.usedTeamKeys.clear();
    state.currentQuestionNumber = 1;
    state.score = 0;
    state.history = [];

    // If "Only teams with photos" is enabled, ensure we have an initial batch of verified teams
    if (state.settings.requirePhotos) {
      if (loadingText) loadingText.textContent = 'Pre-loading robot photos for instant quiz…';

      const year = state.settings.year;

      // Check existing cached teams first
      state.teamPool.forEach(t => {
        if (state.imageCache[`${year}_${t.key}`]) {
          state.verifiedPhotoPool.push(t);
        }
      });

      // When the pool is relatively small (<= 80 teams, e.g. regional events or states),
      // scan ALL teams in the pool upfront so every single robot with a photo in that event is found!
      const unchecked = state.teamPool.filter(t => !(`${year}_${t.key}` in state.imageCache));
      const targetCount = state.teamPool.length <= 80 ? unchecked.length : Math.max(20, Math.ceil(state.teamPool.length * 0.4));

      for (let i = 0; i < unchecked.length && (state.teamPool.length <= 80 || state.verifiedPhotoPool.length < targetCount); i += 12) {
        const batch = unchecked.slice(i, i + 12);
        await Promise.all(
          batch.map(async t => {
            const url = await fetchRobotImage(t.key, year);
            if (session !== state.quizSession) return;
            if (url && !state.verifiedPhotoPool.some(v => v.key === t.key)) {
              state.verifiedPhotoPool.push(t);
            }
          })
        );
        if (session !== state.quizSession) return;
      }

      if (state.verifiedPhotoPool.length === 0) {
        throw new Error('No teams with verified robot photos found for this selection. Try Top Teams or another region.');
      }
    }

    if (session !== state.quizSession) return;

    $('quiz-loading').classList.remove('show');
    if (loadingText) loadingText.textContent = 'Fetching teams from The Blue Alliance…';
    $('quiz-content').style.display = 'block';

    // Start background scanner to continuously preload upcoming questions
    startBackgroundPhotoScanner(80, session);

    await renderQuestion(session);
  } catch (e) {
    if (session !== state.quizSession) return; // superseded - don't hijack the newer quiz
    $('quiz-loading').classList.remove('show');
    if (loadingText) loadingText.textContent = 'Fetching teams from The Blue Alliance…';
    toast(`Error: ${e.message}`);
    console.error(e);
    showPage('home');
  }
}

/* ── Utilities ────────────────────────────────────────────── */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── Home Stats ───────────────────────────────────────────── */
function updateHomeStats() {
  const best = JSON.parse(localStorage.getItem('frcq-best') || '{}');
  const sessions = parseInt(localStorage.getItem('frcq-sessions') || '0');
  $('stat-sessions').textContent = sessions;
  $('stat-best').textContent = best.pct != null ? `${best.pct}% (${best.score}/${best.total})` : '—';
  $('stat-year').textContent = state.settings.year;
}

function recordSessionResult() {
  if (state.history.length === 0) return;

  const sessions = parseInt(localStorage.getItem('frcq-sessions') || '0') + 1;
  localStorage.setItem('frcq-sessions', sessions);

  const total = state.history.length;
  const score = state.score;
  const pct = Math.round((score / total) * 100);

  const best = JSON.parse(localStorage.getItem('frcq-best') || '{}');
  if (best.pct == null || pct > best.pct || (pct === best.pct && total > (best.total || 0))) {
    localStorage.setItem('frcq-best', JSON.stringify({ pct, score, total }));
  }
}

/* ── Document Ready ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  updateHomeStats();
  showPage('home');

  // Navigation
  $('nav-home').addEventListener('click', () => { showPage('home'); updateHomeStats(); });
  $('nav-settings').addEventListener('click', () => showPage('settings'));
  $('logo-link').addEventListener('click', () => { showPage('home'); updateHomeStats(); });

  // Home buttons
  $('start-btn').addEventListener('click', startQuiz);
  $('start-btn-2').addEventListener('click', startQuiz);
  $('settings-link').addEventListener('click', () => showPage('settings'));

  // Next question button
  const nextBtn = $('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', nextQuestion);
  }

  // Keyboard shortcut to advance to next question
  window.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const activeEl = document.activeElement;
      // Don't trigger if user is typing in an input
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) return;
      if (state.answered && nextBtn && nextBtn.style.display !== 'none' && !nextBtn.disabled) {
        e.preventDefault();
        nextQuestion();
      }
    }
  });

  // Stop / Finish quiz anytime
  $('finish-btn').addEventListener('click', () => {
    if (state.history.length === 0) {
      toast('Returned home.');
      showPage('home');
    } else {
      showResults();
    }
  });

  // Results page actions
  $('play-again-btn').addEventListener('click', startQuiz);
  $('home-btn').addEventListener('click', () => { showPage('home'); updateHomeStats(); });

  // Settings start button
  const settingsStartBtn = $('settings-start-btn');
  if (settingsStartBtn) {
    settingsStartBtn.addEventListener('click', startQuiz);
  }
});
