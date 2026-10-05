// ============================================================
//  FRCQ - App Logic
//  Depends on: config.js, popular_teams.js
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
    year: (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_YEAR) || 2026,
    answerChoices: (typeof CONFIG !== 'undefined' && CONFIG.ANSWER_CHOICES) || 4,
    requirePhotos: false,    // only teams with photos toggle
    statboticsOnly: false,   // Statbotics-only mode flag
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
  cachedTopTeams: null,      // cache of top teams
  cachedTopTeamsYear: null,
  imageCache: {},            // `${year}_${teamKey}` -> imageUrl | null
  quizSession: 0,            // bumped on every quiz start - stale async work checks this
  scannerSession: null,      // quizSession the background photo scanner belongs to
};

let isAdvancing = false;

/* ── DOM helper ───────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }

/* ── Theme Customization ───────────────────────────────────── */
const THEME_STORAGE_KEY = 'frcq-theme-custom';

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function adjustBrightness(hex, percent) {
  try {
    let { r, g, b } = hexToRgb(hex);
    r = Math.max(0, Math.min(255, Math.round(r * (1 + percent / 100))));
    g = Math.max(0, Math.min(255, Math.round(g * (1 + percent / 100))));
    b = Math.max(0, Math.min(255, Math.round(b * (1 + percent / 100))));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

function getStoredTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return {
    mode: 'dark',
    noOutlines: false,
    accentColor: '#2563eb',
  };
}

function applyTheme(theme, save = true) {
  const root = document.documentElement;
  const mode = theme.mode || 'dark';
  root.setAttribute('data-theme', mode);

  if (theme.noOutlines) {
    document.body.classList.add('no-outlines');
  } else {
    document.body.classList.remove('no-outlines');
  }

  const accent = theme.accentColor || '#2563eb';
  const { r, g, b } = hexToRgb(accent);
  const glow = `rgba(${r}, ${g}, ${b}, 0.25)`;
  const dark = adjustBrightness(accent, -18);

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-glow', glow);
  root.style.setProperty('--accent-dark', dark);

  if (save) {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }

  // Update theme UI controls if present
  const darkRadio = $('theme-dark');
  const lightRadio = $('theme-light');
  if (darkRadio && lightRadio) {
    if (mode === 'light') lightRadio.checked = true;
    else darkRadio.checked = true;
  }

  const outlineToggle = $('no-outlines-toggle');
  if (outlineToggle) {
    outlineToggle.checked = !!theme.noOutlines;
  }

  const customPicker = $('custom-color-picker');
  if (customPicker) {
    customPicker.value = accent;
  }

  document.querySelectorAll('.color-swatch').forEach(swatch => {
    const col = swatch.getAttribute('data-color') || '';
    swatch.classList.toggle('active', col.toLowerCase() === accent.toLowerCase());
  });
}

// Immediate initial theme execution to prevent dark/light flash
applyTheme(getStoredTheme(), false);

/* ── API Key & Statbotics Helpers ─────────────────────────── */
function getTbaKey() {
  const saved = localStorage.getItem('frcq-tba-key');
  if (saved && saved.trim()) return saved.trim();
  if (typeof CONFIG !== 'undefined' && CONFIG.TBA_API_KEY && CONFIG.TBA_API_KEY !== 'YOUR_TBA_API_KEY_HERE') {
    return CONFIG.TBA_API_KEY.trim();
  }
  return '';
}

function isStatboticsOnly() {
  return localStorage.getItem('frcq-statbotics-only') === 'true' || state.settings.statboticsOnly === true;
}

const TBA_BASE = 'https://www.thebluealliance.com/api/v3';
const STATBOTICS_BASE = 'https://api.statbotics.io/v3';

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

async function statboticsFetch(path) {
  const res = await fetch(`${STATBOTICS_BASE}${path}`);
  if (!res.ok) throw new Error(`Statbotics ${res.status}: ${path}`);
  return res.json();
}

function normaliseStatboticsTeam(item) {
  const num = item.team != null ? item.team : item.team_number;
  return {
    number: num,
    key: `frc${num}`,
    name: item.name || `Team ${num}`,
    city: item.city || '',
    state: item.state || '',
    country: item.country || '',
  };
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

/* ── Modal Helpers ────────────────────────────────────────── */
function showApiKeyModal() {
  const modal = $('api-key-modal');
  if (!modal) return;
  const input = $('modal-tba-input');
  if (input) input.value = getTbaKey();
  modal.style.display = 'flex';
  if (input) input.focus();
}

function hideApiKeyModal() {
  const modal = $('api-key-modal');
  if (modal) modal.style.display = 'none';
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

/* ── Statbotics Fetchers ───────────────────────────────────── */
async function fetchTopStatboticsTeams(year, count) {
  let list = [];
  try {
    list = await statboticsFetch(`/team_years?year=${year}&metric=norm_epa&limit=${Math.min(count, 100)}`);
  } catch {
    list = [];
  }
  if (!list || list.length === 0) {
    try {
      list = await statboticsFetch(`/teams?limit=${Math.min(count, 100)}`);
    } catch {
      list = [];
    }
  }
  return list.map(normaliseStatboticsTeam);
}

async function fetchStateStatboticsTeams(region) {
  const code = (region.code || '').toUpperCase().trim();
  let list = [];
  try {
    list = await statboticsFetch(`/teams?state=${encodeURIComponent(code)}&limit=100`);
  } catch {
    list = [];
  }
  if (!list || list.length === 0) {
    if (typeof POPULAR_TEAMS !== 'undefined' && Array.isArray(POPULAR_TEAMS)) {
      list = POPULAR_TEAMS.filter(t => (t.state || '').toUpperCase() === code);
    }
  }
  return (list || []).map(normaliseStatboticsTeam);
}

async function fetchRandomStatboticsTeams() {
  const offset = Math.floor(Math.random() * 25) * 50;
  const list = await statboticsFetch(`/teams?limit=100&offset=${offset}`);
  return (list || []).map(normaliseStatboticsTeam);
}

/* ── Build Team Pool ───────────────────────────────────────── */
async function buildTeamPool(session = state.quizSession) {
  const { mode, topCount, stateRegion, event, year } = state.settings;
  const statOnly = isStatboticsOnly();
  let pool = [];

  const loadingText = $('quiz-loading-text');

  if (statOnly) {
    if (loadingText) loadingText.textContent = 'Fetching teams from Statbotics…';

    if (mode === 'popular') {
      if (typeof POPULAR_TEAMS !== 'undefined' && Array.isArray(POPULAR_TEAMS) && POPULAR_TEAMS.length > 0) {
        pool = [...POPULAR_TEAMS];
      } else {
        pool = await fetchTopStatboticsTeams(year, 100);
      }
    } else if (mode === 'top') {
      pool = await fetchTopStatboticsTeams(year, parseInt(topCount) || 100);
    } else if (mode === 'state') {
      pool = await fetchStateStatboticsTeams(stateRegion || { code: 'CA', name: 'California' });
      if (pool.length < state.settings.answerChoices) {
        pool = await fetchTopStatboticsTeams(year, 100);
      }
    } else if (mode === 'event') {
      toast('Live event rosters require a TBA key. Using top teams in Statbotics mode.');
      pool = await fetchTopStatboticsTeams(year, 100);
    } else {
      pool = await fetchRandomStatboticsTeams();
      if (!pool || pool.length < state.settings.answerChoices) {
        pool = await fetchTopStatboticsTeams(year, 100);
      }
    }
  } else {
    // Normal TBA mode
    if (loadingText) loadingText.textContent = 'Fetching teams from The Blue Alliance…';

    if (mode === 'popular') {
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
      // Random / All Teams
      const randomPage = Math.floor(Math.random() * 6);
      let batch = await fetchTbaPage(year, randomPage);
      if (!batch || batch.length < state.settings.answerChoices) {
        batch = await fetchTbaPage(year, 0);
      }
      pool = (batch || []).map(normaliseTeam);
    }
  }

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
    throw new Error(`Not enough active teams found for ${year}. Try Popular Teams or All Teams.`);
  }

  state.teamPool = pool;
  state.usedTeamKeys.clear();
  state.currentQuestionNumber = 1;
  state.score = 0;
  state.history = [];
  return true;
}

/* ── Top Ranked Teams Fetcher (TBA) ────────────────────────── */
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

/* ── State Teams Fetcher (TBA) ─────────────────────────────── */
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

/* ── Robot Photo Fetcher & Cache ───────────────────────────── */
function optimizeImageUrl(rawUrl, foreignKey) {
  let url = rawUrl ? String(rawUrl).trim() : '';
  if (url.startsWith('http://')) {
    url = 'https://' + url.slice(7);
  }

  let imgurId = foreignKey ? String(foreignKey).trim() : null;
  if (!imgurId && url.includes('imgur.com')) {
    const m = url.match(/imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)/i);
    if (m) imgurId = m[1];
  }

  if (imgurId) {
    const cleanId = imgurId.replace(/\.(jpeg|jpg|png|webp|gif)$/i, '').replace(/[hlmts]$/, '');
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

function verifyAndPreloadUrl(url, timeoutMs = 3500) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    let done = false;
    img.decoding = 'async';

    img.onload = () => {
      if (!done) {
        done = true;
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

async function fetchRobotImage(teamKey, year) {
  if (isStatboticsOnly()) {
    return null;
  }

  const selectedYear = year || state.settings.year;
  const cacheKey = `${selectedYear}_${teamKey}`;
  if (cacheKey in state.imageCache) {
    return state.imageCache[cacheKey];
  }

  try {
    const media = await tbaFetch(`/team/${teamKey}/media/${selectedYear}`).catch(() => []);
    if (Array.isArray(media) && media.length > 0) {
      const candidateUrl = extractDirectImageUrl(media);
      if (candidateUrl) {
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

async function startBackgroundPhotoScanner(maxNeeded = 80, session = state.quizSession) {
  if (isStatboticsOnly()) return;
  if (state.scannerSession === session) return;
  state.scannerSession = session;

  try {
    const pool = state.teamPool;
    const year = state.settings.year;

    for (let i = 0; i < pool.length; i += 6) {
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
  const statOnly = isStatboticsOnly();

  if (state.settings.requirePhotos && !statOnly) {
    let available = state.verifiedPhotoPool.filter(t => !state.usedTeamKeys.has(t.key));

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

    if (available.length === 0 && state.verifiedPhotoPool.length > 0) {
      state.usedTeamKeys.clear();
      available = [...state.verifiedPhotoPool];
    }

    if (available.length === 0) {
      throw new Error(`No verified robot photos found for ${year} with these teams. Please try Top Teams or disable "Only teams with photos".`);
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    state.usedTeamKeys.add(chosen.key);
    const chosenImg = state.imageCache[`${year}_${chosen.key}`];

    const distractors = pool
      .filter(t => t.key !== chosen.key && t.name !== chosen.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, state.settings.answerChoices - 1);

    const choices = [...distractors, chosen].sort(() => Math.random() - 0.5);
    return { correct: chosen, choices, preloadedImage: chosenImg };

  } else {
    // Normal / Statbotics mode
    let available = pool.filter(t => !state.usedTeamKeys.has(t.key));
    if (available.length === 0) {
      state.usedTeamKeys.clear();
      available = [...pool];
    }
    const correct = available[Math.floor(Math.random() * available.length)] || pool[0];
    state.usedTeamKeys.add(correct.key);

    let imgUrl = null;
    if (!statOnly) {
      imgUrl = state.imageCache[`${year}_${correct.key}`] || null;
      if (!(`${year}_${correct.key}` in state.imageCache)) {
        imgUrl = await fetchRobotImage(correct.key, year);
      }
    }

    const distractors = pool
      .filter(t => t.key !== correct.key && t.name !== correct.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, state.settings.answerChoices - 1);

    const choices = [...distractors, correct].sort(() => Math.random() - 0.5);
    return { correct, choices, preloadedImage: imgUrl };
  }
}

/* ── Navigation & Toasts ──────────────────────────────────── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(`page-${name}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toast(msg) {
  const container = $('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
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
  if (session !== state.quizSession) return;
  state.currentQuestion = { correct, choices };

  const totalAnswered = state.history.length;
  const pct = totalAnswered > 0 ? Math.round((state.score / totalAnswered) * 100) : 0;

  // Header updates
  $('quiz-progress').textContent = `Question #${state.currentQuestionNumber}`;
  $('quiz-score').innerHTML = `Score <span>${state.score}</span>/${totalAnswered} (${pct}%)`;

  // Robot number
  $('robot-number').textContent = `#${correct.number}`;
  $('robot-question').textContent = `Which team is Robot #${correct.number}?`;

  const imgWrap = $('robot-image-wrap');
  imgWrap.innerHTML = `
    <div class="robot-image-placeholder">
      <div class="icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      </div>
      <div>${isStatboticsOnly() ? 'Statbotics Mode (No photo)' : 'Loading robot photo…'}</div>
    </div>
  `;

  renderChoices(choices, correct);

  const fb = $('feedback-banner');
  fb.className = 'feedback-banner';
  fb.textContent = '';

  const statOnly = isStatboticsOnly();
  if (statOnly) {
    imgWrap.innerHTML = `
      <div class="robot-image-placeholder">
        <div class="icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <div>Statbotics Mode • Team #${correct.number}</div>
      </div>
    `;
    return;
  }

  const yearKey = `${state.settings.year}_${correct.key}`;
  const imageUrl = preloadedImage || state.imageCache[yearKey];

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Team ${correct.number} Robot`;
    img.loading = 'eager';

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

/* ── Clean Team Name for Display ─────────────────────────── */
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

  let cleaned = name
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/^[-–—:,.\s]+/, '')
    .replace(/[-–—:,.\s]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

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

  $('choices-grid').querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.disabled = true;
    const team = allChoices[i];
    if (team.key === correct.key) {
      btn.classList.add('correct');
    } else if (team.key === chosen.key) {
      btn.classList.add('wrong');
    }
  });

  const fb = $('feedback-banner');
  if (isCorrect) {
    fb.className = 'feedback-banner show correct-fb';
    fb.textContent = `Correct! #${correct.number} is ${correct.name}.`;
  } else {
    fb.className = 'feedback-banner show wrong-fb';
    fb.textContent = `Incorrect. Robot #${correct.number} is ${correct.name}.`;
  }

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
  $('results-sub').textContent = `You answered ${score} out of ${total} correctly in this session.`;

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

  // Load Statbotics preference
  state.settings.statboticsOnly = isStatboticsOnly();

  if (!state.settings.mode || !['popular', 'top', 'random', 'state', 'event'].includes(state.settings.mode)) {
    state.settings.mode = 'popular';
  }
  if (!state.settings.year) state.settings.year = 2026;
  if (!state.settings.topCount) state.settings.topCount = 100;
  if (!state.settings.stateRegion) state.settings.stateRegion = { code: 'CA', name: 'California' };

  // Photo-only toggle
  const photoToggle = $('photo-only-toggle');
  if (photoToggle) {
    photoToggle.checked = !!state.settings.requirePhotos && !state.settings.statboticsOnly;
    photoToggle.addEventListener('change', e => {
      state.settings.requirePhotos = e.target.checked;
      saveSettings();
    });
  }

  // Statbotics Only toggle
  const statToggle = $('statbotics-only-toggle');
  if (statToggle) {
    statToggle.checked = state.settings.statboticsOnly;
    statToggle.addEventListener('change', e => {
      const enabled = e.target.checked;
      state.settings.statboticsOnly = enabled;
      if (enabled) {
        localStorage.setItem('frcq-statbotics-only', 'true');
        toast('Statbotics Only mode enabled.');
      } else {
        localStorage.removeItem('frcq-statbotics-only');
        toast('Statbotics Only mode disabled.');
      }
      saveSettings();
      updateApiNotice();
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

  // Theme Settings
  const storedTheme = getStoredTheme();

  const darkRadio = $('theme-dark');
  const lightRadio = $('theme-light');
  if (darkRadio && lightRadio) {
    darkRadio.addEventListener('change', () => {
      storedTheme.mode = 'dark';
      applyTheme(storedTheme);
    });
    lightRadio.addEventListener('change', () => {
      storedTheme.mode = 'light';
      applyTheme(storedTheme);
    });
  }

  const outlineToggle = $('no-outlines-toggle');
  if (outlineToggle) {
    outlineToggle.addEventListener('change', e => {
      storedTheme.noOutlines = e.target.checked;
      applyTheme(storedTheme);
    });
  }

  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const color = swatch.getAttribute('data-color');
      if (color) {
        storedTheme.accentColor = color;
        applyTheme(storedTheme);
      }
    });
  });

  const customPicker = $('custom-color-picker');
  if (customPicker) {
    customPicker.addEventListener('input', e => {
      storedTheme.accentColor = e.target.value;
      applyTheme(storedTheme);
    });
  }

  applyTheme(storedTheme, false);
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
  const topCountSelect = $('top-count-select');
  if (topCountSelect) {
    topCountSelect.addEventListener('change', e => {
      state.settings.topCount = parseInt(e.target.value);
      saveSettings();
    });
  }

  // Year selector
  const yearSelect = $('year-select');
  if (yearSelect) {
    yearSelect.addEventListener('change', e => {
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
  }

  // Answer choices
  const choicesSelect = $('choices-select');
  if (choicesSelect) {
    choicesSelect.addEventListener('change', e => {
      state.settings.answerChoices = parseInt(e.target.value);
      saveSettings();
    });
  }

  // State search
  const stateSearch = $('state-search');
  if (stateSearch) {
    stateSearch.addEventListener('input', debounce(filterStates, 200));
  }

  // Event search
  const eventSearch = $('event-search');
  if (eventSearch) {
    eventSearch.addEventListener('input', debounce(filterEvents, 250));
  }

  updateModeSubPickers(state.settings.mode);
}

function updateModeSubPickers(mode) {
  const popularNotice = $('popular-notice');
  const topPicker = $('top-count-picker');
  const statePicker = $('state-picker');
  const eventPicker = $('event-picker');

  if (popularNotice) popularNotice.classList.toggle('show', mode === 'popular');
  if (topPicker) topPicker.classList.toggle('show', mode === 'top');
  if (statePicker) statePicker.classList.toggle('show', mode === 'state');
  if (eventPicker) eventPicker.classList.toggle('show', mode === 'event');

  if (mode === 'state') filterStates();
  if (mode === 'event' && state.allEvents.length === 0 && !isStatboticsOnly()) loadEventsUI();
}

function applySettingsToUI() {
  const s = state.settings;

  const radio = document.querySelector(`input[name="mode"][value="${s.mode}"]`);
  if (radio) radio.checked = true;

  if ($('top-count-select')) $('top-count-select').value = s.topCount || 100;
  if ($('year-select')) $('year-select').value = s.year;
  if ($('choices-select')) $('choices-select').value = s.answerChoices;

  const photoToggle = $('photo-only-toggle');
  if (photoToggle) photoToggle.checked = !!s.requirePhotos && !isStatboticsOnly();

  const statToggle = $('statbotics-only-toggle');
  if (statToggle) statToggle.checked = isStatboticsOnly();

  if (s.stateRegion && $('state-search')) {
    $('state-search').value = s.stateRegion.name;
  }
  if (s.event && $('event-search')) {
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
  const statOnly = isStatboticsOnly();

  if (statOnly) {
    notice.style.display = 'flex';
    notice.innerHTML = '<span><strong>Statbotics Only Mode active:</strong> Playing with public Statbotics stats (no API key required). Robot photos and live TBA event lists are disabled.</span>';
  } else if (key) {
    notice.style.display = 'none';
  } else {
    notice.style.display = 'flex';
    notice.innerHTML = '<span>Set your TBA API key below or in <strong>config.js</strong> before playing, or switch to Statbotics Only mode. Get a free key at <a href="https://www.thebluealliance.com/account" target="_blank" style="color:var(--warn)">thebluealliance.com/account</a>.</span>';
  }

  const photoRow = $('photo-only-row');
  const photoToggle = $('photo-only-toggle');
  if (photoToggle && photoRow) {
    if (statOnly) {
      photoToggle.checked = false;
      photoToggle.disabled = true;
      photoRow.style.opacity = '0.5';
    } else {
      photoToggle.disabled = false;
      photoRow.style.opacity = '1';
    }
  }

  const eventDisclaimer = $('event-statbotics-disclaimer');
  if (eventDisclaimer) {
    eventDisclaimer.style.display = statOnly ? 'flex' : 'none';
  }
}

/* ── States List Filter ───────────────────────────────────── */
function filterStates() {
  const input = $('state-search');
  if (!input) return;
  const q = (input.value || '').toLowerCase();
  const container = $('state-results');
  if (!container) return;
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
    if (!container) return;
    container.innerHTML = '<div style="padding:10px 12px;font-size:0.85rem;color:var(--text-muted)">Loading events…</div>';
    await loadEvents(state.settings.year);
    filterEvents();
  } catch (e) {
    toast(`Notice: Could not load events: ${e.message}`);
  }
}

function filterEvents() {
  const input = $('event-search');
  if (!input) return;
  const q = (input.value || '').toLowerCase();
  const container = $('event-results');
  if (!container) return;
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
  const statOnly = isStatboticsOnly();

  // Prompt the user for TBA key before playing if no key is entered and Statbotics-only is not active
  if (!key && !statOnly) {
    showApiKeyModal();
    return;
  }

  const session = ++state.quizSession;
  state.verifiedPhotoPool = [];
  state.usedTeamKeys.clear();

  showPage('quiz');
  $('quiz-content').style.display = 'none';
  $('quiz-loading').classList.add('show');
  const loadingText = $('quiz-loading-text');

  try {
    if (loadingText) {
      loadingText.textContent = statOnly ? 'Building roster with Statbotics…' : 'Building team roster…';
    }
    const built = await buildTeamPool(session);
    if (!built || session !== state.quizSession) return;

    state.verifiedPhotoPool = [];
    state.usedTeamKeys.clear();
    state.currentQuestionNumber = 1;
    state.score = 0;
    state.history = [];

    // If photos are required and we are NOT in Statbotics mode, preload photos
    if (state.settings.requirePhotos && !statOnly) {
      if (loadingText) loadingText.textContent = 'Pre-loading robot photos for instant quiz…';

      const year = state.settings.year;
      state.teamPool.forEach(t => {
        if (state.imageCache[`${year}_${t.key}`]) {
          state.verifiedPhotoPool.push(t);
        }
      });

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
    $('quiz-content').style.display = 'block';

    if (!statOnly) {
      startBackgroundPhotoScanner(80, session);
    }

    await renderQuestion(session);
  } catch (e) {
    if (session !== state.quizSession) return;
    $('quiz-loading').classList.remove('show');
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
  if ($('stat-sessions')) $('stat-sessions').textContent = sessions;
  if ($('stat-best')) $('stat-best').textContent = best.pct != null ? `${best.pct}% (${best.score}/${best.total})` : '—';
  if ($('stat-year')) $('stat-year').textContent = state.settings.year;
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

  // Home Start button
  const startBtn = $('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startQuiz);
  }

  // Modal handlers
  const modalSaveBtn = $('modal-save-btn');
  if (modalSaveBtn) {
    modalSaveBtn.addEventListener('click', () => {
      const input = $('modal-tba-input');
      const val = input ? input.value.trim() : '';
      if (!val) {
        toast('Please enter a valid TBA API key or choose Statbotics Only.');
        return;
      }
      localStorage.setItem('frcq-tba-key', val);
      localStorage.removeItem('frcq-statbotics-only');
      state.settings.statboticsOnly = false;
      const tbaInput = $('tba-api-input');
      if (tbaInput) tbaInput.value = val;
      const statToggle = $('statbotics-only-toggle');
      if (statToggle) statToggle.checked = false;
      updateApiNotice();
      hideApiKeyModal();
      toast('TBA API key saved!');
      startQuiz();
    });
  }

  const modalStatBtn = $('modal-statbotics-btn');
  if (modalStatBtn) {
    modalStatBtn.addEventListener('click', () => {
      localStorage.setItem('frcq-statbotics-only', 'true');
      state.settings.statboticsOnly = true;
      const statToggle = $('statbotics-only-toggle');
      if (statToggle) statToggle.checked = true;
      updateApiNotice();
      hideApiKeyModal();
      toast('Running in Statbotics Only mode.');
      startQuiz();
    });
  }

  const modalCloseBtn = $('modal-close-btn');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', hideApiKeyModal);
  }

  // Close modal when clicking outside of card
  const modalOverlay = $('api-key-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) hideApiKeyModal();
    });
  }

  // Next question button
  const nextBtn = $('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', nextQuestion);
  }

  // Keyboard shortcut (Enter / Space) to advance question
  window.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) return;
      if (state.answered && nextBtn && nextBtn.style.display !== 'none' && !nextBtn.disabled) {
        e.preventDefault();
        nextQuestion();
      }
    }
  });

  // Finish quiz button
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
