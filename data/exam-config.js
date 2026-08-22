/* Everything that names the exams this trainer studies for: the FCC
   commercial radio operator written elements, the licenses they add up to,
   the pass mark, the question pool PDF links, and the prose that mentions
   them. The engine under js/ reads only this file and data/questions.js, so
   a trainer for a different exam is built by replacing the data/ directory
   and the page shell (index.html, manifest.webmanifest, icons, CNAME); js/
   carries no knowledge of any particular exam.
   Loads after data/questions.js and data/manual-pages.js and may read both. */
const EXAM_CONFIG = {
  storageKey: 'fcc-commercial-trainer-v1',      // localStorage; changing it orphans saved progress
  sessionKey: 'fcc-commercial-trainer-session', // sessionStorage mirror of the active session
  exportPrefix: 'fcc-commercial-progress',      // backup filename: <prefix>-YYYY-MM-DD.json
  repo: 'https://github.com/ullbergm/fcc-commercial-trainer',
  passMark: 0.75, // every FCC written element passes at 75% (18/24, 75/100, 38/50)

  // Section numbers are the written elements (globally unique across pools),
  // not per-pool chapters; `manual` says only which pool PDF a question
  // cites. Sections read as "§ N" in the UI.
  flatSections: true,
  sectionWord: '§',

  // The bank reproduces the FCC's published pools verbatim, so the validator
  // relaxes its duplicate rules: pools repeat a stem with different choices
  // (and Element 7R repeats Element 7 questions), and these two ids repeat a
  // choice in the published PDFs themselves (6A251 prints A twice, 9-23C1
  // prints B twice).
  verbatimPool: true,
  allowDuplicateChoices: ['6A251', '9-23C1'],

  // The questions come verbatim from the FCC's published pools, which have
  // nothing further to say about an answer, so no per-question explanations.
  requireExplanations: false,

  // The "manuals" the questions cite are the pool PDFs themselves: every
  // question carries the physical pool page it appears on, so the citation
  // deep links to the exact page and the pool number can be checked against
  // the source. The maps are identities (see data/manual-pages.js).
  requireCitations: true,
  manuals: {
    el1: {
      title: 'FCC Element 1 Question Pool (2009)',
      cite: 'Pool',
      url: 'https://www.fcc.gov/sites/default/files/Element%201_0.pdf',
      pages: MANUAL_PAGES.el1,
    },
    el3: {
      title: 'FCC Element 3 Question Pool (2009)',
      cite: 'Pool',
      url: 'https://www.fcc.gov/sites/default/files/Element%203_0.pdf',
      pages: MANUAL_PAGES.el3,
    },
    el6: {
      title: 'FCC Element 6 Question Pool',
      cite: 'Pool',
      url: 'https://www.fcc.gov/sites/default/files/Element%206_0.pdf',
      pages: MANUAL_PAGES.el6,
    },
    el7: {
      title: 'FCC Element 7 Question Pool (2019)',
      cite: 'Pool',
      url: 'https://www.fcc.gov/sites/default/files/question_pool_7_0.pdf',
      pages: MANUAL_PAGES.el7,
    },
    el7r: {
      title: 'FCC Element 7R Question Pool (2012)',
      cite: 'Pool',
      url: 'https://www.fcc.gov/sites/default/files/Element%207R_0.pdf',
      pages: MANUAL_PAGES.el7r,
    },
    el8: {
      title: 'FCC Element 8 Question Pool (2009, file revised 2024)',
      cite: 'Pool',
      url: 'https://www.fcc.gov/sites/default/files/Element%208%20Question%20Pool%20updated%2003062024.pdf',
      pages: MANUAL_PAGES.el8,
    },
    el9: {
      title: 'FCC Element 9 Question Pool (2012)',
      cite: 'Pool',
      url: 'https://www.fcc.gov/sites/default/files/Element%209_0.pdf',
      pages: MANUAL_PAGES.el9,
    },
  },

  // Mock exams sized like the real written elements. The real exam draws one
  // question per key topic; these draw randomly from the whole pool, which
  // is a little less predictable but studies the same material.
  // Section numbers are the element numbers; Element 7R is section 17.
  exams: [
    { key: 'el1', name: 'Element 1 (Marine Radio Operator)', sections: [1], count: 24 },
    { key: 'el3', name: 'Element 3 (General Radiotelephone)', sections: [3], count: 100 },
    { key: 'el6', name: 'Element 6 (Advanced Radiotelegraph)', sections: [6], count: 100 },
    { key: 'el7', name: 'Element 7 (GMDSS Operating Practices)', sections: [7], count: 100 },
    { key: 'el7r', name: 'Element 7R (Restricted GMDSS)', sections: [17], count: 50 },
    { key: 'el8', name: 'Element 8 (Ship Radar Techniques)', sections: [8], count: 50 },
    { key: 'el9', name: 'Element 9 (GMDSS Maintenance)', sections: [9], count: 50 },
  ],

  // Licenses and endorsements -> the written elements behind them, per the
  // FCC's "Commercial Radio Operator Types of Licenses" page. The
  // Radiotelegraph license also requires telegraphy (code) elements 1 and 2,
  // which a written-question trainer cannot cover.
  tests: [
    { key: 'mrop', group: 'license', name: 'Marine Radio Operator Permit (MP)', note: 'written Element 1', sections: [1] },
    { key: 'grol', group: 'license', name: 'General Radiotelephone Operator License (PG)', note: 'written Elements 1 and 3', sections: [1, 3] },
    { key: 'gmdss-do', group: 'license', name: 'GMDSS Radio Operator (DO)', note: 'written Elements 1 and 7', sections: [1, 7] },
    { key: 'gmdss-rg', group: 'license', name: 'Restricted GMDSS Radio Operator (RG)', note: 'written Elements 1 and 7R', sections: [1, 17] },
    { key: 'gmdss-dm', group: 'license', name: 'GMDSS Radio Maintainer (DM)', note: 'written Elements 1, 3, and 9', sections: [1, 3, 9] },
    { key: 'teleg', group: 'license', name: 'Radiotelegraph Operator License (T)', note: 'written Elements 1 and 6, plus telegraphy code tests', sections: [1, 6] },
    { key: 'radar', group: 'endorse', name: 'Ship Radar Endorsement', note: 'written Element 8, added to a PG, T, or DM license', sections: [8] },
  ],
  testGroups: [
    ['license', 'Licenses'],
    ['endorse', 'Endorsements'],
  ],

  // Prose that names the exams, injected as HTML into the matching views.
  homeSubtitle: `${QUESTION_BANK.length} questions from the FCC commercial operator license examination question pools`,
  disclaimerHTML: `Questions come verbatim from the FCC's published
    <a href="https://www.fcc.gov/wireless/bureau-divisions/mobility-division/commercial-radio-operator-license-program/examinations"
       target="_blank" rel="noopener">commercial operator license examination question pools</a>
    (Elements 1, 3, 6, 7, 7R, 8, and 9) with their official answer keys. Each question links
    to its page in the pool PDF. A few dozen pool questions that refer to a drawing are not
    included here; study those from the pool PDFs directly. All progress is stored locally in
    your browser and never sent to a server.`,
  aboutIntroHTML: `<p>FCC Commercial Radio Trainer is a free, open-source study tool for the FCC
    commercial radio operator written exams: the Marine Radio Operator Permit, the General
    Radiotelephone Operator License (GROL), the GMDSS operator and maintainer licenses, the
    Radiotelegraph Operator License, and the Ship Radar Endorsement. Its ${QUESTION_BANK.length}
    questions are the FCC's own published
    <a href="https://www.fcc.gov/wireless/bureau-divisions/mobility-division/commercial-radio-operator-license-program/examinations"
       target="_blank" rel="noopener">examination question pools</a>, converted verbatim
    with their official answer keys. Every question cites the pool PDF page it appears on,
    and the citation is a link that opens the pool at that page.</p>`,
  aboutCaveatHTML: `<p>The real exams are administered by Commercial Operator License Examination
    Managers (COLEMs) and draw one question per key topic; the mock exams here draw randomly
    from the whole pool but use the real question counts and the real 75 percent pass mark.
    Questions that refer to a drawing in the pool, and two whose answer text the FCC left
    blank (43 of the 2860 published questions), are not included, since this trainer renders
    text only; review those from the pool PDFs before exam day. A handful of typos in the
    pool text are the FCC's own; the questions are reproduced as published. The pools shown
    are the ones the FCC published as current when this bank was generated; check the FCC
    page for revisions.</p>`,
};
