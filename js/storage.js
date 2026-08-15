/* Persistence: card scheduling state + answer stats in localStorage. */
const Store = (() => {
  const KEY = 'nc-cdl-trainer-v1';
  const LOG_MAX = 10000; // ~20k reviews would outlast any exam prep; cap the log well before quota

  const defaults = () => ({
    cards: {},          // id -> {stability, difficulty, due, lastReview, reps, lapses, state, wrong, right, lastWrong}
    settings: {
      newPerDay: 10,   // relaxed steady pace; auto-boosted when an exam date demands it
      sections: [],     // empty = all sections enabled
      examDate: '',     // 'YYYY-MM-DD'; drives retention ramp + final review
    },
    daily: {},          // 'YYYY-MM-DD' -> {new: n, reviews: n, correct: n}
    exams: [],          // {date, type, total, correct, passed}
    log: [],            // {id, rating, ts} per scheduled review; raw history for future FSRS parameter optimization
  });

  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const STATES = ['new', 'learning', 'relearning', 'review'];

  // Anything read from outside the running app (a backup file, but also the
  // localStorage value itself, which extensions or an unrelated writer at the
  // same key could have mangled) must not smuggle NaN/undefined into card
  // state where it would silently break scheduling. Coerce every field to a
  // sane value; never throw.
  function sanitize(parsed) {
    const base = defaults();
    if (!parsed || typeof parsed !== 'object') return base;
    const cards = {};
    if (parsed.cards && typeof parsed.cards === 'object') {
      Object.entries(parsed.cards).forEach(([id, c]) => {
        if (!c || typeof c !== 'object') return;
        cards[id] = {
          stability: num(c.stability), difficulty: num(c.difficulty),
          due: num(c.due), lastReview: num(c.lastReview),
          reps: num(c.reps), lapses: num(c.lapses),
          state: STATES.includes(c.state) ? c.state : 'new',
          wrong: num(c.wrong), right: num(c.right),
          lastWrong: c.lastWrong === true,
        };
      });
    }
    const st = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
    return {
      cards,
      settings: {
        newPerDay: Math.max(0, num(st.newPerDay, base.settings.newPerDay)),
        sections: Array.isArray(st.sections) ? st.sections.filter(Number.isInteger) : [],
        examDate: typeof st.examDate === 'string' ? st.examDate : '',
      },
      daily: parsed.daily && typeof parsed.daily === 'object' && !Array.isArray(parsed.daily)
        ? parsed.daily : {},
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      log: Array.isArray(parsed.log)
        ? parsed.log
            .filter(e => e && typeof e === 'object' && typeof e.id === 'string'
              && Number.isFinite(e.ts) && [1, 2, 3, 4].includes(e.rating))
            .slice(-LOG_MAX)
        : [],
    };
  }

  let state = null;

  function load() {
    if (state) return state;
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? sanitize(JSON.parse(raw)) : defaults();
    } catch {
      state = defaults();
    }
    return state;
  }

  // localStorage.setItem can throw (quota, restricted browsing modes). The
  // in-memory session must keep working, so swallow the failure and tell the
  // user once through the onSaveError hook instead of dying mid-answer.
  let saveWarned = false;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      if (!saveWarned && typeof api.onSaveError === 'function') api.onSaveError(err);
      saveWarned = true;
    }
  }

  function card(id) {
    const s = load();
    if (!s.cards[id]) {
      s.cards[id] = { stability: 0, difficulty: 0, due: 0, lastReview: 0,
                      reps: 0, lapses: 0, state: 'new', wrong: 0, right: 0, lastWrong: false };
    }
    return s.cards[id];
  }

  function todayKey(ts = Date.now()) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function bumpDaily(field, by = 1) {
    const s = load();
    const k = todayKey();
    if (!s.daily[k]) s.daily[k] = { new: 0, reviews: 0, correct: 0 };
    s.daily[k][field] += by;
  }

  // One entry per scheduled review (study/final modes; misses and exams do
  // not touch the schedule). The aggregate card state cannot be turned back
  // into a history, so this is what makes per-user FSRS parameter
  // optimization possible later. Callers save(); this only appends.
  function logReview(id, rating, ts = Date.now()) {
    const s = load();
    s.log.push({ id, rating, ts });
    if (s.log.length > LOG_MAX) s.log.splice(0, s.log.length - LOG_MAX);
  }

  // version stamps the backup format, so a future importer can tell old
  // files apart and migrate them instead of guessing. sanitize copies
  // fields explicitly, so the stamp never leaks into live state.
  function exportJSON() {
    return JSON.stringify({ version: 1, ...load() }, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text); // throws on bad input
    if (!parsed || typeof parsed !== 'object'
        || typeof parsed.cards !== 'object' || !parsed.cards
        || typeof parsed.settings !== 'object' || !parsed.settings) {
      throw new Error('Not a valid backup file');
    }
    state = sanitize(parsed);
    save();
  }

  function reset() {
    state = defaults();
    save();
  }

  const api = { load, save, card, todayKey, bumpDaily, logReview, exportJSON, importJSON, reset,
                onSaveError: null };
  return api;
})();
