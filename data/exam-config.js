/* Everything that names the exam this trainer studies for: the tests and the
   manual sections behind them, the pass mark, the manual PDF links, and the
   prose that mentions the CDL. The engine under js/ reads only this file and
   data/questions.js, so a trainer for a different exam is built by replacing
   the data/ directory and the page shell (index.html, manifest.webmanifest,
   icons, CNAME); js/ carries no knowledge of any particular exam.
   Loads after data/questions.js and data/manual-pages.js and may read both. */
const EXAM_CONFIG = {
  storageKey: 'nc-cdl-trainer-v1',      // localStorage; changing it orphans saved progress
  sessionKey: 'nc-cdl-trainer-session', // sessionStorage mirror of the active session
  exportPrefix: 'cdl-progress',         // backup filename: <prefix>-YYYY-MM-DD.json
  repo: 'https://github.com/ullbergm/nc-cdl-test-training',
  passMark: 0.8, // NC requires 80% on every CDL knowledge test

  // Manuals the questions cite. A question picks one with its `manual` field
  // and uses `default` when it has none. `pages` maps the manual's printed
  // page labels to physical PDF pages for #page= deep links. Leave `url` out
  // for a manual that is sold rather than published and its citations render
  // as plain text instead of links. Citations are optional altogether: for an
  // exam with nothing citable, leave this map empty, the `page` field off the
  // questions, and requireCitations false, and no citation is rendered.
  requireCitations: true, // the bank validator rejects a question without a page
  manuals: {
    default: {
      title: 'NC Commercial Driver Manual',
      cite: 'Manual', // prefix on the "p. 2-15" citation
      url: 'https://www.ncdot.gov/dmv/license-id/driver-licenses/new-drivers/Documents/commercial-driver-manual.pdf',
      pages: MANUAL_PAGES,
    },
  },

  // Mock exams: how many questions the real test asks, drawn from which sections.
  exams: [
    { key: 'gk', name: 'General Knowledge', sections: [1, 2, 3], count: 50 },
    { key: 'pass', name: 'Passenger Vehicles', sections: [4], count: 20 },
    { key: 'air', name: 'Air Brakes', sections: [5], count: 25 },
    { key: 'comb', name: 'Combination Vehicles', sections: [6], count: 20 },
    { key: 'dbl', name: 'Doubles & Triples', sections: [7], count: 20 },
    { key: 'tank', name: 'Tank Vehicles', sections: [8], count: 20 },
    { key: 'hazmat', name: 'Hazardous Materials', sections: [9], count: 30 },
    { key: 'bus', name: 'School Bus', sections: [10], count: 20 },
    { key: 'skills', name: 'Skills Test Review', sections: [11, 12, 13], count: 25 },
  ],

  // Knowledge tests / endorsements -> the manual sections that cover them.
  // The Settings picker offers these, grouped by testGroups.
  tests: [
    { key: 'gk', group: 'core', name: 'General Knowledge', note: 'required for every CDL', sections: [1, 2, 3] },
    { key: 'air', group: 'core', name: 'Air Brakes', note: 'skip it and your license gets an air-brake restriction', sections: [5] },
    { key: 'comb', group: 'core', name: 'Combination Vehicles', note: 'required for Class A', sections: [6] },
    { key: 'pass', group: 'endorse', name: 'Passenger (P)', note: '', sections: [4] },
    { key: 'dbl', group: 'endorse', name: 'Doubles/Triples (T)', note: '', sections: [7] },
    { key: 'tank', group: 'endorse', name: 'Tank Vehicles (N)', note: '', sections: [8] },
    { key: 'hazmat', group: 'endorse', name: 'Hazardous Materials (H)', note: '', sections: [9] },
    { key: 'bus', group: 'endorse', name: 'School Bus (S)', note: '', sections: [10] },
    { key: 'skills', group: 'skills', name: 'Skills / road test prep', note: 'pre-trip inspection, control skills, road test', sections: [11, 12, 13] },
  ],
  testGroups: [
    ['core', 'Knowledge tests'],
    ['endorse', 'Endorsements'],
    ['skills', 'Skills / road test'],
  ],

  // Prose that names the exam, injected as HTML into the matching views.
  homeSubtitle: `${QUESTION_BANK.length} questions from the NC Commercial Driver Manual`,
  disclaimerHTML: `Questions were extracted from the
    <a href="https://www.ncdot.gov/dmv/license-id/driver-licenses/new-drivers/Documents/commercial-driver-manual.pdf"
       target="_blank" rel="noopener">NC Commercial Driver Manual</a>;
    accuracy is not guaranteed. Each question links to its manual page, so verify
    anything important against the source. The actual DMV test questions are not public, and no
    claim is made that these match or resemble them. All progress is stored locally in
    your browser and never sent to a server.`,
  aboutIntroHTML: `<p>NC CDL Trainer is a free, open-source study tool for the North Carolina CDL
    knowledge tests. Its ${QUESTION_BANK.length} questions were written from the
    <a href="https://www.ncdot.gov/dmv/license-id/driver-licenses/new-drivers/Documents/commercial-driver-manual.pdf"
       target="_blank" rel="noopener">NC Commercial Driver
    Manual</a>, and every question cites the manual page it came from. The
    citation is a link, so it opens the PDF at that page and you can check
    anything important against the source.</p>`,
  aboutCaveatHTML: `<p>Questions were extracted from the manual by a language model and reviewed for
    accuracy, but mistakes are possible and accuracy is not guaranteed. The actual
    DMV test questions are not public, and no claim is made that these match or
    resemble them.</p>`,
};
