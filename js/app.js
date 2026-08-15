/* NC CDL Trainer: UI and session logic. */
(() => {
  const DAY = 24 * 60 * 60 * 1000;
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SECTION_NAMES = {};
  QUESTION_BANK.forEach(q => { SECTION_NAMES[q.section] = q.sectionName; });
  const SECTION_IDS = Object.keys(SECTION_NAMES).map(Number).sort((a, b) => a - b);
  const BY_ID = {};
  QUESTION_BANK.forEach(q => { BY_ID[q.id] = q; });

  const EXAMS = [
    { key: 'gk', name: 'General Knowledge', sections: [1, 2, 3], count: 50 },
    { key: 'pass', name: 'Passenger Vehicles', sections: [4], count: 20 },
    { key: 'air', name: 'Air Brakes', sections: [5], count: 25 },
    { key: 'comb', name: 'Combination Vehicles', sections: [6], count: 20 },
    { key: 'dbl', name: 'Doubles & Triples', sections: [7], count: 20 },
    { key: 'tank', name: 'Tank Vehicles', sections: [8], count: 20 },
    { key: 'hazmat', name: 'Hazardous Materials', sections: [9], count: 30 },
    { key: 'bus', name: 'School Bus', sections: [10], count: 20 },
    { key: 'skills', name: 'Skills Test Review', sections: [11, 12, 13], count: 25 },
  ];

  // Knowledge tests / endorsements -> the manual sections that cover them
  const TESTS = [
    { key: 'gk', group: 'core', name: 'General Knowledge', note: 'required for every CDL', sections: [1, 2, 3] },
    { key: 'air', group: 'core', name: 'Air Brakes', note: 'skip it and your license gets an air-brake restriction', sections: [5] },
    { key: 'comb', group: 'core', name: 'Combination Vehicles', note: 'required for Class A', sections: [6] },
    { key: 'pass', group: 'endorse', name: 'Passenger (P)', note: '', sections: [4] },
    { key: 'dbl', group: 'endorse', name: 'Doubles/Triples (T)', note: '', sections: [7] },
    { key: 'tank', group: 'endorse', name: 'Tank Vehicles (N)', note: '', sections: [8] },
    { key: 'hazmat', group: 'endorse', name: 'Hazardous Materials (H)', note: '', sections: [9] },
    { key: 'bus', group: 'endorse', name: 'School Bus (S)', note: '', sections: [10] },
    { key: 'skills', group: 'skills', name: 'Skills / road test prep', note: 'pre-trip inspection, control skills, road test', sections: [11, 12, 13] },
  ];
  const TEST_GROUPS = [
    ['core', 'Knowledge tests'],
    ['endorse', 'Endorsements'],
    ['skills', 'Skills / road test'],
  ];

  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const enabledSections = () => {
    const sel = Store.load().settings.sections;
    return sel && sel.length ? sel : SECTION_IDS;
  };

  const endOfToday = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };

  // ---------- exam-date awareness ----------
  function examInfo() {
    const dateStr = Store.load().settings.examDate;
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    const end = new Date(y, m - 1, d, 23, 59, 59).getTime();
    if (end < Date.now()) return null; // exam already happened
    return { end, daysLeft: Math.ceil((end - Date.now()) / DAY), dateStr };
  }

  // Target retention ramps 90% -> 95% over the last 21 days before the exam.
  function targetRetention() {
    const exam = examInfo();
    if (!exam || exam.daysLeft > 21) return FSRS.DEFAULT_RETENTION;
    return Math.min(0.95, 0.9 + 0.05 * (21 - exam.daysLeft) / 21);
  }

  function schedOpts() {
    const exam = examInfo();
    return { retention: targetRetention(), maxDueTs: exam ? exam.end : null };
  }

  // ---------- queue building ----------
  function dueReviewIds() {
    const secs = new Set(enabledSections());
    const cutoff = endOfToday();
    return QUESTION_BANK
      .filter(q => secs.has(q.section))
      .filter(q => {
        const c = Store.load().cards[q.id];
        return c && c.state !== 'new' && c.lastReview && c.due <= cutoff;
      })
      .map(q => q.id);
  }

  function newIds(limit) {
    if (limit <= 0) return [];
    const secs = new Set(enabledSections());
    return QUESTION_BANK
      .filter(q => secs.has(q.section))
      .filter(q => {
        const c = Store.load().cards[q.id];
        return !c || !c.lastReview;
      })
      .slice(0, limit)
      .map(q => q.id);
  }

  const unseenCount = () => newIds(Infinity).length;

  // The pace actually used: the user's setting, auto-boosted when it wouldn't
  // get through every unseen card before the exam (last day reserved for review).
  function effectiveNewPerDay() {
    const base = Store.load().settings.newPerDay;
    const exam = examInfo();
    if (!exam) return base;
    const days = Math.max(1, exam.daysLeft - 1);
    return Math.max(base, Math.ceil(unseenCount() / days));
  }

  function newRemainingToday() {
    const used = (Store.load().daily[Store.todayKey()] || {}).new || 0;
    return Math.max(0, effectiveNewPerDay() - used);
  }

  // ---------- views ----------
  const view = $('#view');
  let session = null; // active study/miss/exam session

  function setNav(active) {
    document.querySelectorAll('nav button').forEach(b => {
      const on = b.dataset.view === active;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
  }

  // Each view swap replaces #view's DOM, which drops keyboard and screen
  // reader focus on the floor; put it on the given element instead.
  function focusEl(el) {
    if (el) el.focus();
  }

  const ROUTES = {
    home: renderHome, study: startStudy, misses: startMisses, exam: renderExamSetup,
    final: startFinal, browse: renderBrowse, stats: renderStats,
    settings: renderSettings, about: renderAbout,
  };
  let currentView = null;

  function render(name) {
    currentView = name;
    session = null;
    setNav(name);
    ROUTES[name]();
  }

  // Renders immediately (hashchange fires async) and records the view in the
  // URL hash, so views are linkable and the back button moves between them.
  function go(name) {
    render(name);
    if (location.hash !== '#' + name) location.hash = name;
  }

  window.addEventListener('hashchange', () => {
    const name = location.hash.slice(1) || 'home';
    if (name !== currentView) render(ROUTES[name] ? name : 'home');
  });

  // ---------- home ----------
  function renderHome() {
    const due = dueReviewIds().length;
    const fresh = newIds(newRemainingToday()).length;
    const missPool = missIds().length;
    const s = Store.load();
    const today = s.daily[Store.todayKey()] || { reviews: 0, correct: 0 };
    const exam = examInfo();
    const studiedCount = QUESTION_BANK.filter(q => {
      const c = s.cards[q.id];
      return c && c.lastReview;
    }).length;
    const boosted = exam && effectiveNewPerDay() > s.settings.newPerDay;
    const banner = exam
      ? `<div class="exambanner">Exam ${exam.daysLeft === 0 ? 'today' :
          exam.daysLeft === 1 ? 'tomorrow' : 'in ' + exam.daysLeft + ' days'}
          · retention target ${Math.round(targetRetention() * 100)}%${
          boosted ? ' · pace boosted to ' + effectiveNewPerDay() + ' new/day' : ''}</div>`
      : '';
    view.innerHTML = `
      <div class="home">
        <p class="sub">${QUESTION_BANK.length} questions from the NC Commercial Driver Manual</p>
        ${banner}
        <div class="tiles">
          <div class="tile"><div class="big">${due}</div><div>reviews due</div></div>
          <div class="tile"><div class="big">${fresh}</div><div>new today</div></div>
          <div class="tile"><div class="big">${missPool}</div><div>to fix</div></div>
          <div class="tile"><div class="big">${today.reviews}</div><div>done today</div></div>
        </div>
        <div class="actions">
          <button class="primary" data-view="study" ${due + fresh ? '' : 'disabled'}>Study (${due + fresh})</button>
          <button data-view="misses" ${missPool ? '' : 'disabled'}>Practice misses (${missPool})</button>
          <button data-view="exam">Mock exam</button>
          ${exam && exam.daysLeft <= 5 && studiedCount
            ? '<button data-view="final" class="primary">Final review sweep</button>' : ''}
        </div>
        <p class="disclaimer">Questions were extracted from the
          <a href="https://www.ncdot.gov/dmv/license-id/driver-licenses/new-drivers/Documents/commercial-driver-manual.pdf"
             target="_blank" rel="noopener">NC Commercial Driver Manual</a>;
          accuracy is not guaranteed. Each question cites its manual page, so verify anything
          important against the source. The actual DMV test questions are not public, and no
          claim is made that these match or resemble them. All progress is stored locally in
          your browser and never sent to a server.</p>
      </div>`;
    view.querySelectorAll('button[data-view]').forEach(b =>
      b.addEventListener('click', () => go(b.dataset.view)));
  }

  // ---------- study session (FSRS) ----------
  function startStudy() {
    const reviews = shuffle(dueReviewIds());
    const fresh = newIds(newRemainingToday());
    const queue = reviews.concat(fresh);
    if (!queue.length) {
      view.innerHTML = `<div class="done"><h2>All caught up</h2>
        <p>Nothing due right now. Come back tomorrow, or take a mock exam.</p>
        <button class="primary" id="back">Home</button></div>`;
      $('#back').addEventListener('click', () => go('home'));
      return;
    }
    session = { mode: 'study', queue, pos: 0, done: 0, correct: 0 };
    renderQuestion();
  }

  // ---------- misses drill (no scheduling changes) ----------
  function missIds() {
    const secs = new Set(enabledSections());
    return QUESTION_BANK
      .filter(q => secs.has(q.section))
      .filter(q => {
        const c = Store.load().cards[q.id];
        return c && (c.lastWrong || (c.lapses > 0 && c.wrong > c.right));
      })
      .map(q => q.id);
  }

  function startMisses() {
    const queue = shuffle(missIds()).slice(0, 25);
    if (!queue.length) {
      view.innerHTML = `<div class="done"><h2>No missed questions</h2>
        <p>Everything you've gotten wrong has since been answered correctly.</p>
        <button class="primary" id="back">Home</button></div>`;
      $('#back').addEventListener('click', () => go('home'));
      return;
    }
    session = { mode: 'misses', queue, pos: 0, done: 0, correct: 0 };
    renderQuestion();
  }

  // ---------- final review sweep (last days before the exam) ----------
  // Ignores due dates: every studied card, weakest memory first, then unseen cards.
  function startFinal() {
    const secs = new Set(enabledSections());
    const s = Store.load();
    const pool = QUESTION_BANK.filter(q => secs.has(q.section));
    const studied = pool.filter(q => s.cards[q.id] && s.cards[q.id].lastReview)
      .sort((a, b) => s.cards[a.id].stability - s.cards[b.id].stability);
    const unseen = pool.filter(q => !s.cards[q.id] || !s.cards[q.id].lastReview);
    const queue = studied.concat(unseen).map(q => q.id);
    if (!queue.length) return go('home');
    session = { mode: 'final', queue, pos: 0, done: 0, correct: 0 };
    renderQuestion();
  }

  // ---------- shared question renderer (study + misses + final) ----------
  function renderQuestion() {
    if (session.pos >= session.queue.length) return renderSessionDone();
    const q = BY_ID[session.queue[session.pos]];
    const order = shuffle([0, 1, 2, 3]);
    const total = session.queue.length;
    const card = Store.load().cards[q.id];
    const badge = !card || !card.lastReview ? '<span class="badge new">new</span>'
      : card.state === 'relearning' || card.state === 'learning' ? '<span class="badge relearn">again</span>'
      : '<span class="badge review">review</span>';
    view.innerHTML = `
      <div class="quiz">
        <div class="meta">
          <span>${session.pos + 1} / ${total}</span>
          ${badge}
          <span class="section">§${q.section} ${esc(q.sectionName)}</span>
        </div>
        <div class="progress" role="progressbar" aria-label="Session progress"
          aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${session.pos}">
          <div style="width:${(session.pos / total) * 100}%"></div></div>
        <h2 class="qtext" tabindex="-1">${esc(q.question)}</h2>
        <div class="choices">
          ${order.map(i => `<button class="choice" data-i="${i}">${esc(q.choices[i])}</button>`).join('')}
        </div>
        <div id="feedback" aria-live="polite"></div>
      </div>`;
    view.querySelectorAll('.choice').forEach(btn =>
      btn.addEventListener('click', () => answer(q, Number(btn.dataset.i), btn)));
    focusEl(view.querySelector('.qtext'));
  }

  function answer(q, picked, btn) {
    const correct = picked === q.answer;
    view.querySelectorAll('.choice').forEach(b => {
      b.disabled = true;
      const i = Number(b.dataset.i);
      if (i === q.answer) b.classList.add('correct');
      else if (b === btn && !correct) b.classList.add('wrong');
    });

    const c = Store.card(q.id);
    const wasNew = !c.lastReview;
    if (correct) { c.right++; c.lastWrong = false; } else { c.wrong++; c.lastWrong = true; }

    const scheduling = session.mode === 'study' || session.mode === 'final';
    if (scheduling) {
      Store.bumpDaily('reviews');
      if (correct) Store.bumpDaily('correct');
      if (wasNew) Store.bumpDaily('new');
    }
    session.done++;
    if (correct) session.correct++;

    const fb = $('#feedback');
    const cite = `<span class="cite">Manual p. ${esc(q.page)}</span>`;
    if (!correct) {
      if (scheduling) {
        Object.assign(c, FSRS.schedule(c, 1, Date.now(), schedOpts())); // Again
        // requeue a few cards later so it comes back this session
        const at = Math.min(session.pos + 4, session.queue.length);
        session.queue.splice(at, 0, q.id);
      }
      fb.innerHTML = `<div class="explain wrongbg"><strong>Incorrect.</strong> ${esc(q.explanation)} ${cite}</div>
        <button class="primary" id="next">Continue</button>`;
      $('#next').addEventListener('click', () => { session.pos++; renderQuestion(); });
      focusEl($('#next'));
    } else if (scheduling) {
      const preview = r => {
        const sched = FSRS.schedule({ ...c }, r, Date.now(), schedOpts());
        return sched.intervalDays >= 1 ? `${sched.intervalDays}d` : '<1d';
      };
      fb.innerHTML = `<div class="explain okbg"><strong>Correct.</strong> ${esc(q.explanation)} ${cite}</div>
        <div class="grades">
          <button data-r="2">Hard <small>${preview(2)}</small></button>
          <button data-r="3" class="primary">Good <small>${preview(3)}</small></button>
          <button data-r="4">Easy <small>${preview(4)}</small></button>
        </div>`;
      fb.querySelectorAll('.grades button').forEach(b =>
        b.addEventListener('click', () => {
          Object.assign(c, FSRS.schedule(c, Number(b.dataset.r), Date.now(), schedOpts()));
          Store.save();
          session.pos++;
          renderQuestion();
        }));
      focusEl(fb.querySelector('[data-r="3"]'));
      return; // save happens on grade click
    } else {
      fb.innerHTML = `<div class="explain okbg"><strong>Correct.</strong> ${esc(q.explanation)} ${cite}</div>
        <button class="primary" id="next">Continue</button>`;
      $('#next').addEventListener('click', () => { session.pos++; renderQuestion(); });
      focusEl($('#next'));
    }
    Store.save();
  }

  function renderSessionDone() {
    const pct = session.done ? Math.round((session.correct / session.done) * 100) : 0;
    view.innerHTML = `
      <div class="done">
        <h2 tabindex="-1">Session complete</h2>
        <p>${session.correct} / ${session.done} correct (${pct}%)</p>
        <button class="primary" id="home">Home</button>
      </div>`;
    $('#home').addEventListener('click', () => go('home'));
    focusEl(view.querySelector('h2'));
    session = null;
  }

  // ---------- mock exam ----------
  function renderExamSetup() {
    const counts = {};
    QUESTION_BANK.forEach(q => { counts[q.section] = (counts[q.section] || 0) + 1; });
    const active = new Set(enabledSections());
    const available = EXAMS.filter(e => e.sections.every(sec => active.has(sec)));
    const hidden = EXAMS.length - available.length;
    view.innerHTML = `
      <div class="examsetup">
        <h2>Mock exam</h2>
        <p class="sub">Real-test format: no feedback until the end, 80% to pass.</p>
        <div class="examlist">
          ${available.map(e => {
            const avail = e.sections.reduce((n, s) => n + (counts[s] || 0), 0);
            const n = Math.min(e.count, avail);
            return `<button class="examopt" data-key="${e.key}" ${n < 5 ? 'disabled' : ''}>
              <strong>${esc(e.name)}</strong><span>${n} questions</span></button>`;
          }).join('')}
        </div>
        ${hidden ? `<p class="hint">${hidden} more hidden. Enable their tests in Settings.</p>` : ''}
      </div>`;
    view.querySelectorAll('.examopt').forEach(b =>
      b.addEventListener('click', () => startExam(b.dataset.key)));
  }

  function startExam(key) {
    const exam = EXAMS.find(e => e.key === key);
    const secs = new Set(exam.sections);
    const pool = shuffle(QUESTION_BANK.filter(q => secs.has(q.section)).map(q => q.id));
    const queue = pool.slice(0, exam.count);
    session = { mode: 'exam', exam, queue, pos: 0, answers: [] };
    renderExamQuestion();
  }

  function renderExamQuestion() {
    if (session.pos >= session.queue.length) return renderExamResult();
    const q = BY_ID[session.queue[session.pos]];
    const order = shuffle([0, 1, 2, 3]);
    const total = session.queue.length;
    view.innerHTML = `
      <div class="quiz">
        <div class="meta"><span>${session.pos + 1} / ${total}</span>
          <span class="section">${esc(session.exam.name)}</span></div>
        <div class="progress" role="progressbar" aria-label="Exam progress"
          aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${session.pos}">
          <div style="width:${(session.pos / total) * 100}%"></div></div>
        <h2 class="qtext" tabindex="-1">${esc(q.question)}</h2>
        <div class="choices">
          ${order.map(i => `<button class="choice" data-i="${i}">${esc(q.choices[i])}</button>`).join('')}
        </div>
      </div>`;
    view.querySelectorAll('.choice').forEach(btn =>
      btn.addEventListener('click', () => {
        session.answers.push({ id: q.id, picked: Number(btn.dataset.i) });
        session.pos++;
        renderExamQuestion();
      }));
    focusEl(view.querySelector('.qtext'));
  }

  function renderExamResult() {
    const wrong = session.answers.filter(a => BY_ID[a.id].answer !== a.picked);
    const correct = session.answers.length - wrong.length;
    const pct = Math.round((correct / session.answers.length) * 100);
    const passed = pct >= 80;

    // feed exam misses into the practice pool (stats only, no rescheduling)
    session.answers.forEach(a => {
      const c = Store.card(a.id);
      const ok = BY_ID[a.id].answer === a.picked;
      if (ok) { c.right++; if (!c.lastWrong) return; c.lastWrong = false; }
      else { c.wrong++; c.lastWrong = true; }
    });
    const s = Store.load();
    s.exams.push({ date: Date.now(), type: session.exam.name,
                   total: session.answers.length, correct, passed });
    Store.save();

    view.innerHTML = `
      <div class="examresult">
        <h2 class="${passed ? 'pass' : 'fail'}" tabindex="-1">${passed ? 'PASS' : 'FAIL'} ${pct}%</h2>
        <p>${correct} / ${session.answers.length} correct on ${esc(session.exam.name)} (80% needed)</p>
        ${wrong.length ? `<h3>Missed questions</h3>
          <div class="misslist">${wrong.map(a => {
            const q = BY_ID[a.id];
            return `<div class="missitem">
              <div class="q">${esc(q.question)}</div>
              <div class="you">Your answer: ${esc(q.choices[a.picked])}</div>
              <div class="ans">Correct: ${esc(q.choices[q.answer])}</div>
              <div class="ex">${esc(q.explanation)} <span class="cite">Manual p. ${esc(q.page)}</span></div>
            </div>`;
          }).join('')}</div>` : '<p>Perfect score.</p>'}
        <button class="primary" id="home">Home</button>
      </div>`;
    $('#home').addEventListener('click', () => go('home'));
    focusEl(view.querySelector('h2'));
    session = null;
  }

  // ---------- browse ----------
  function renderBrowse() {
    const s = Store.load();
    view.innerHTML = `
      <div class="browse">
        <h2>Question bank</h2>
        ${SECTION_IDS.map(sec => {
          const qs = QUESTION_BANK.filter(q => q.section === sec);
          return `<details><summary>§${sec} ${esc(SECTION_NAMES[sec])} <small>(${qs.length})</small></summary>
            ${qs.map(q => {
              const c = s.cards[q.id];
              const status = !c || !c.lastReview ? 'new'
                : c.due <= Date.now() ? 'due'
                : `next in ${Math.max(1, Math.ceil((c.due - Date.now()) / DAY))}d`;
              const acc = c && (c.right + c.wrong) ? ` · ${c.right}/${c.right + c.wrong} right` : '';
              return `<details class="qrow"><summary>${esc(q.question)} <small>[${status}${acc}]</small></summary>
                <div class="qdetail"><strong>${esc(q.choices[q.answer])}</strong><br>
                ${esc(q.explanation)} <span class="cite">Manual p. ${esc(q.page)}</span></div>
              </details>`;
            }).join('')}
          </details>`;
        }).join('')}
      </div>`;
  }

  // ---------- stats ----------
  function renderStats() {
    const s = Store.load();
    const now = Date.now();
    let studied = 0, mature = 0, due = 0;
    QUESTION_BANK.forEach(q => {
      const c = s.cards[q.id];
      if (c && c.lastReview) {
        studied++;
        if (c.stability >= 21) mature++;
        if (c.due <= endOfToday()) due++;
      }
    });

    // streak: consecutive days with reviews, ending today or yesterday
    let streak = 0;
    for (let i = 0; ; i++) {
      const k = Store.todayKey(now - i * DAY);
      const d = s.daily[k];
      if (d && d.reviews > 0) streak++;
      else if (i === 0) continue; // today can still be empty
      else break;
    }

    // 7-day due forecast
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const lo = dayStart.getTime() + i * DAY, hi = lo + DAY;
      let n = 0;
      QUESTION_BANK.forEach(q => {
        const c = s.cards[q.id];
        if (c && c.lastReview && c.due >= (i === 0 ? 0 : lo) && c.due < hi) n++;
      });
      forecast.push(n);
    }
    const fmax = Math.max(1, ...forecast);
    const dayName = i => i === 0 ? 'today' : new Date(now + i * DAY)
      .toLocaleDateString(undefined, { weekday: 'short' });

    view.innerHTML = `
      <div class="stats">
        <h2>Progress</h2>
        <div class="tiles">
          <div class="tile"><div class="big">${studied}</div><div>of ${QUESTION_BANK.length} studied</div></div>
          <div class="tile"><div class="big">${mature}</div><div>mastered (21d+)</div></div>
          <div class="tile"><div class="big">${due}</div><div>due today</div></div>
          <div class="tile"><div class="big">${streak}</div><div>day streak</div></div>
        </div>
        <h3>Due next 7 days</h3>
        <div class="forecast">
          ${forecast.map((n, i) => `<div class="fcol">
            <div class="fbar" style="height:${Math.round((n / fmax) * 60)}px"></div>
            <div class="fnum">${n}</div><div class="flab">${dayName(i)}</div>
          </div>`).join('')}
        </div>
        <h3>By section</h3>
        <table>
          <tr><th>Section</th><th>Studied</th><th>Accuracy</th></tr>
          ${SECTION_IDS.map(sec => {
            const qs = QUESTION_BANK.filter(q => q.section === sec);
            let st = 0, r = 0, w = 0;
            qs.forEach(q => {
              const c = s.cards[q.id];
              if (c && c.lastReview) st++;
              if (c) { r += c.right; w += c.wrong; }
            });
            const acc = r + w ? Math.round((r / (r + w)) * 100) + '%' : '-';
            return `<tr><td>§${sec} ${esc(SECTION_NAMES[sec])}</td>
              <td>${st}/${qs.length}</td><td>${acc}</td></tr>`;
          }).join('')}
        </table>
        ${s.exams.length ? `<h3>Exam history</h3>
        <table>
          <tr><th>Date</th><th>Exam</th><th>Score</th><th></th></tr>
          ${s.exams.slice(-10).reverse().map(e =>
            `<tr><td>${new Date(e.date).toLocaleDateString()}</td><td>${esc(e.type)}</td>
             <td>${e.correct}/${e.total}</td>
             <td class="${e.passed ? 'pass' : 'fail'}">${e.passed ? 'PASS' : 'FAIL'}</td></tr>`).join('')}
        </table>` : ''}
      </div>`;
  }

  // ---------- settings ----------
  function paceInfo() {
    const exam = examInfo();
    const base = Store.load().settings.newPerDay;
    const unseen = unseenCount();
    if (!exam) {
      return `No exam date: steady pace of ${base} new cards/day at a 90% retention target. ` +
        `Setting a date tightens the schedule toward test day and raises the pace if needed.`;
    }
    const eff = effectiveNewPerDay();
    const boost = eff > base
      ? `Pace boosted from ${base} to ${eff} new cards/day to cover all ${unseen} remaining ` +
        `questions before the exam.`
      : `Your ${base}/day pace covers the ${unseen} remaining questions in time.`;
    return `Exam in ${exam.daysLeft} day${exam.daysLeft === 1 ? '' : 's'}, retention target ` +
      `${Math.round(targetRetention() * 100)}%. ${boost}`;
  }

  function renderSettings() {
    const s = Store.load();
    const active = new Set(enabledSections());
    view.innerHTML = `
      <div class="settings">
        <h2>Settings</h2>
        <label>New cards per day
          <input type="number" id="newperday" min="0" max="200" value="${s.settings.newPerDay}">
        </label>
        <label>Exam date
          <input type="date" id="examdate" value="${esc(s.settings.examDate || '')}">
          <button id="cleardate" ${s.settings.examDate ? '' : 'disabled'}>No exam, just studying</button>
        </label>
        <p class="hint" id="paceinfo">${paceInfo()}</p>
        <h3>Tests I'm studying for</h3>
        <p class="hint">Only checked tests feed the study queue and the mock exam list.
          Progress on unchecked sections is kept, so add endorsements whenever you're ready.</p>
        <div class="seclist">
          ${TEST_GROUPS.map(([group, label]) => `
            <h4>${label}</h4>
            ${TESTS.filter(tst => tst.group === group).map(tst => {
              const count = QUESTION_BANK.filter(q => tst.sections.includes(q.section)).length;
              const checked = tst.sections.every(sec => active.has(sec));
              return `<label class="seccheck">
                <input type="checkbox" data-test="${tst.key}" ${checked ? 'checked' : ''}>
                <span>${esc(tst.name)} <small>§${tst.sections.join(', ')} · ${count} q${
                  tst.note ? ' · ' + esc(tst.note) : ''}</small></span></label>`;
            }).join('')}`).join('')}
        </div>
        <h3>Data</h3>
        <p class="hint">Everything is stored locally in this browser and never sent to a
          server. Export makes a JSON backup you can import on another device.</p>
        <div class="actions">
          <button id="export">Export progress</button>
          <button id="import">Import progress</button>
          <button id="reset" class="danger">Reset everything</button>
        </div>
        <input type="file" id="importfile" accept=".json" hidden>
      </div>`;

    $('#newperday').addEventListener('change', e => {
      s.settings.newPerDay = Math.max(0, Number(e.target.value) || 0);
      Store.save();
      $('#paceinfo').textContent = paceInfo();
    });
    $('#examdate').addEventListener('change', e => {
      s.settings.examDate = e.target.value || '';
      Store.save();
      $('#cleardate').disabled = !s.settings.examDate;
      $('#paceinfo').textContent = paceInfo();
    });
    $('#cleardate').addEventListener('click', () => {
      s.settings.examDate = '';
      Store.save();
      renderSettings();
    });
    view.querySelectorAll('input[data-test]').forEach(cb =>
      cb.addEventListener('change', () => {
        const chosen = [...view.querySelectorAll('input[data-test]:checked')]
          .flatMap(x => TESTS.find(tst => tst.key === x.dataset.test).sections)
          .sort((a, b) => a - b);
        // empty or complete selection both mean "study everything"
        s.settings.sections =
          chosen.length === 0 || chosen.length === SECTION_IDS.length ? [] : chosen;
        Store.save();
        if (chosen.length === 0) { renderSettings(); return; } // re-render so boxes show reality
        $('#paceinfo').textContent = paceInfo(); // pace depends on the selected sections
      }));
    $('#export').addEventListener('click', () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cdl-progress-${Store.todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $('#import').addEventListener('click', () => $('#importfile').click());
    $('#importfile').addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        Store.importJSON(await f.text());
        alert('Progress imported.');
        go('home');
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    });
    $('#reset').addEventListener('click', () => {
      if (confirm('Delete ALL progress? This cannot be undone.')) {
        Store.reset();
        go('home');
      }
    });
  }

  // ---------- about ----------
  const REPO = 'https://github.com/ullbergm/nc-cdl-test-training';
  const MANUAL_URL = 'https://www.ncdot.gov/dmv/license-id/driver-licenses/new-drivers/Documents/commercial-driver-manual.pdf';

  // Escapes, then converts markdown [text](url) links to anchors.
  const mdLinks = s => esc(s).replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Minimal renderer for the release-please CHANGELOG.md: headings, bullets, links.
  function changelogHTML(md) {
    const out = [];
    let inList = false;
    md.split('\n').forEach(line => {
      const item = line.match(/^[*-] (.*)/);
      if (!item && inList) { out.push('</ul>'); inList = false; }
      if (/^# /.test(line)) return; // top-level "Changelog" title, the page has its own
      if (/^## /.test(line)) out.push(`<h4>${mdLinks(line.replace(/^## /, ''))}</h4>`);
      else if (/^#+ /.test(line)) out.push(`<h5>${mdLinks(line.replace(/^#+ /, ''))}</h5>`);
      else if (item) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${mdLinks(item[1])}</li>`);
      } else if (line.trim()) out.push(`<p>${mdLinks(line)}</p>`);
    });
    if (inList) out.push('</ul>');
    return out.join('');
  }

  function renderAbout() {
    view.innerHTML = `
      <div class="about">
        <h2>About</h2>
        <p>NC CDL Trainer is a free, open-source study tool for the North Carolina CDL
          knowledge tests. Its ${QUESTION_BANK.length} questions were written from the
          <a href="${MANUAL_URL}" target="_blank" rel="noopener">NC Commercial Driver
          Manual</a>, and every question cites the manual page it came from so you can
          verify anything important against the source.</p>
        <p>Study sessions are scheduled with FSRS, a spaced-repetition algorithm that
          predicts when you are about to forget a card and shows it to you just before
          that. Set your exam date in Settings and the scheduler works backward from it,
          raising the retention target and the daily pace as the test gets close.</p>
        <p>All progress is stored locally in your browser and never sent to a server.
          Use Export in Settings to move it to another device.</p>
        <p>Questions were extracted from the manual by a language model and reviewed for
          accuracy, but mistakes are possible and accuracy is not guaranteed. The actual
          DMV test questions are not public, and no claim is made that these match or
          resemble them.</p>
        <h3>Links</h3>
        <ul>
          <li><a href="${REPO}" target="_blank" rel="noopener">Source code on GitHub</a> (MIT license)</li>
          <li><a href="${REPO}/issues/new?template=question-correction.yml" target="_blank" rel="noopener">Report a question error</a></li>
          <li><a href="${REPO}/issues/new?template=bug-report.yml" target="_blank" rel="noopener">Report a bug</a></li>
          <li><a href="${MANUAL_URL}" target="_blank" rel="noopener">NC Commercial Driver Manual (PDF)</a></li>
        </ul>
        <h3>Changelog${appVersion ? ` <small>current: v${appVersion}</small>` : ''}</h3>
        <div id="changelog" class="changelog"><p class="hint">Loading changelog...</p></div>
      </div>`;
    fetch('CHANGELOG.md')
      .then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .then(md => { $('#changelog').innerHTML = changelogHTML(md); })
      .catch(() => {
        $('#changelog').innerHTML = `<p class="hint">The changelog could not be loaded.
          See the <a href="${REPO}/releases" target="_blank" rel="noopener">releases
          page on GitHub</a>.</p>`;
      });
  }

  // ---------- boot ----------
  // Keyboard shortcuts: 1-4 pick an answer, Enter continues after a wrong
  // answer, and 1/2/3 (or Enter for Good) grade a correct one.
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const next = $('#next');
    const grades = [...view.querySelectorAll('.grades button')];
    const choices = [...view.querySelectorAll('.choice:not(:disabled)')];
    if (next && e.key === 'Enter') {
      e.preventDefault(); // keep the native Enter click from double-firing
      next.click();
    } else if (grades.length) {
      const b = e.key === 'Enter' ? grades.find(g => g.dataset.r === '3')
        : ['1', '2', '3'].includes(e.key) ? grades[Number(e.key) - 1] : null;
      if (b) { e.preventDefault(); b.click(); }
    } else if (choices.length && ['1', '2', '3', '4'].includes(e.key)) {
      const b = choices[Number(e.key) - 1];
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  document.querySelectorAll('nav button').forEach(b =>
    b.addEventListener('click', () => go(b.dataset.view)));
  const initial = location.hash.slice(1);
  render(ROUTES[initial] ? initial : 'home');

  // Installable, offline-capable PWA. Skipped on file:// and http:// (the
  // service worker API needs a secure context), where the app still works.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // version.txt is written by the deploy workflow from the release tag; absent
  // when running from the filesystem, in which case the footer stays empty.
  let appVersion = '';
  fetch('version.txt')
    .then(r => (r.ok ? r.text() : null))
    .then(v => {
      if (!v || !/^\d/.test(v.trim())) return;
      appVersion = v.trim();
      $('#version').textContent = 'v' + appVersion;
    })
    .catch(() => {});
})();
