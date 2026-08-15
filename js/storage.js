/* Persistence: card scheduling state + answer stats in localStorage. */
const Store = (() => {
  const KEY = 'nc-cdl-trainer-v1';

  const defaults = () => ({
    cards: {},          // id -> {stability, difficulty, due, lastReview, reps, lapses, state, wrong, right, lastWrong}
    settings: {
      newPerDay: 10,   // relaxed steady pace; auto-boosted when an exam date demands it
      sections: [],     // empty = all sections enabled
      examDate: '',     // 'YYYY-MM-DD'; drives retention ramp + final review
    },
    daily: {},          // 'YYYY-MM-DD' -> {new: n, reviews: n, correct: n}
    exams: [],          // {date, type, total, correct, passed}
  });

  let state = null;

  function load() {
    if (state) return state;
    try {
      const raw = localStorage.getItem(KEY);
      const base = defaults();
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(base, parsed);
        state.settings = Object.assign(defaults().settings, parsed.settings || {});
      } else {
        state = base;
      }
    } catch {
      state = defaults();
    }
    return state;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
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

  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  // A backup is the user's only copy of their progress, so a truncated or
  // hand-edited file must not smuggle NaN/undefined into card state where it
  // would silently break scheduling. Coerce every field to a sane value.
  function importJSON(text) {
    const parsed = JSON.parse(text); // throws on bad input
    if (!parsed || typeof parsed !== 'object'
        || typeof parsed.cards !== 'object' || !parsed.cards
        || typeof parsed.settings !== 'object' || !parsed.settings) {
      throw new Error('Not a valid backup file');
    }
    const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
    const STATES = ['new', 'learning', 'relearning', 'review'];
    const cards = {};
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
    const st = parsed.settings;
    const base = defaults();
    state = {
      cards,
      settings: {
        newPerDay: Math.max(0, num(st.newPerDay, base.settings.newPerDay)),
        sections: Array.isArray(st.sections) ? st.sections.filter(Number.isInteger) : [],
        examDate: typeof st.examDate === 'string' ? st.examDate : '',
      },
      daily: parsed.daily && typeof parsed.daily === 'object' ? parsed.daily : {},
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
    };
    save();
  }

  function reset() {
    state = defaults();
    save();
  }

  return { load, save, card, todayKey, bumpDaily, exportJSON, importJSON, reset };
})();
