# Screenshots

Each image is split diagonally to show the light and dark themes, which follow the
browser's color scheme preference.

They are generated, not captured by hand. `generate.sh` feeds the app a seeded demo
profile (`seed.js`: a GROL attempt twelve days out, with the Element 3 pool lagging
behind), shoots each view once per theme in headless Chrome, and composites the two
across the diagonal. It needs Chrome or Chromium and ImageMagick:

```
./docs/screenshots/generate.sh home study stats
```

## Home

Due reviews, new cards for the day, the misses pool, an exam countdown banner when a
test date is set, and the projected score for each test being studied for.

<img src="home.png" width="700" alt="Home screen with due review, new card, and miss counts, an exam countdown banner, and a projected score for each test">

## Study

A spaced repetition session. The progress bar carries a morse-code texture, and
the header shows the element the question came from.

<img src="study.png" width="700" alt="Study session showing a multiple-choice question with a progress bar carrying a morse-code texture">

## Stats

Mastery tiles, the exam readiness projection with the odds of passing, a 7-day due
forecast, per-section progress and accuracy, and exam history.

<img src="stats.png" width="700" alt="Stats page with mastery tiles, an exam readiness table, a 7-day due forecast, per-section accuracy, and exam history">
