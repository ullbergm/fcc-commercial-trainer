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

  function importJSON(text) {
    const parsed = JSON.parse(text); // throws on bad input
    if (!parsed.cards || !parsed.settings) throw new Error('Not a valid backup file');
    state = Object.assign(defaults(), parsed);
    save();
  }

  function reset() {
    state = defaults();
    save();
  }

  return { load, save, card, todayKey, bumpDaily, exportJSON, importJSON, reset };
})();
