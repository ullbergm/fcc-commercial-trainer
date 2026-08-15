# Changelog

## [1.7.0](https://github.com/ullbergm/nc-cdl-test-training/compare/v1.6.0...v1.7.0) (2026-08-15)


### Features

* underline tabs and scroll fades in the top bar ([a8fd80c](https://github.com/ullbergm/nc-cdl-test-training/commit/a8fd80c02b5f3157551987548701467eac5da59a))

## [1.6.0](https://github.com/ullbergm/nc-cdl-test-training/compare/v1.5.0...v1.6.0) (2026-08-15)


### Features

* add extra new cards on demand ([07f311a](https://github.com/ullbergm/nc-cdl-test-training/commit/07f311a0b5464d62b6ba70116cffdf17ef683d71))
* keep a per-review log for future FSRS parameter optimization ([7ffbc97](https://github.com/ullbergm/nc-cdl-test-training/commit/7ffbc972d53564d1e19e020de9caafcf02dfb258))
* light/dark theme override in Settings ([4cab303](https://github.com/ullbergm/nc-cdl-test-training/commit/4cab303adc821afc7904e2169a19216c2df1cca7))
* make the nav entries real links ([b018802](https://github.com/ullbergm/nc-cdl-test-training/commit/b018802c440889797095c5f9bee3c26b2883d53a))


### Bug Fixes

* report a sub-day interval when the exam clamp lands on today ([c694a6b](https://github.com/ullbergm/nc-cdl-test-training/commit/c694a6b662a7b32a3d2fc2fd6bdcdd778602428c))
* roll back an answer abandoned before grading ([1fc3ca4](https://github.com/ullbergm/nc-cdl-test-training/commit/1fc3ca43798ca8aff5644779feb6264458afb88e))
* sanitize state loaded from localStorage, not just imported backups ([608c3ae](https://github.com/ullbergm/nc-cdl-test-training/commit/608c3ae8d26cda38455160cab78bce1ab59988c6))
* stop refreshing precached files so two releases never mix in one cache ([8fc9b1a](https://github.com/ullbergm/nc-cdl-test-training/commit/8fc9b1afb15a99328a57373b198cbe6477e227ed))

## [1.5.0](https://github.com/ullbergm/nc-cdl-test-training/compare/v1.4.0...v1.5.0) (2026-08-15)


### Features

* link every explanation to a prefilled error report ([501eca3](https://github.com/ullbergm/nc-cdl-test-training/commit/501eca3737c5e3561e6287c00c4fdb34edcefd06))
* stamp a schema version into exported backups ([f7586b7](https://github.com/ullbergm/nc-cdl-test-training/commit/f7586b70e12838eedd6e9c721f02eb002c5e7589))


### Bug Fixes

* keep "all of the above" choices below the choices they refer to ([5774896](https://github.com/ullbergm/nc-cdl-test-training/commit/577489634af8d6a970014445e5a5a8c6ed2bc6f4))
* let Enter activate the focused button instead of always continuing ([b867782](https://github.com/ullbergm/nc-cdl-test-training/commit/b867782626ca7e7c5f7fbe9c6c5c9e8a6bf926ba))
* reject a restored exam session whose answers list is corrupt ([54071e2](https://github.com/ullbergm/nc-cdl-test-training/commit/54071e26cd8c6e0c106c180e9ffb1cc2aa511ade))
* serve query-string URLs from the offline cache ([3730c01](https://github.com/ullbergm/nc-cdl-test-training/commit/3730c01a7b51ec7096051841c1a6ef66cd2dcb82))
* step stats by calendar day so DST does not skip or repeat a day ([b548a37](https://github.com/ullbergm/nc-cdl-test-training/commit/b548a377051d840df5d0b2bd14126162d9968e69))
* warn once when progress cannot be saved instead of failing silently ([007cf26](https://github.com/ullbergm/nc-cdl-test-training/commit/007cf26e78f8d3c7d550744eadfb60d3a6f8a55f))

## [1.4.0](https://github.com/ullbergm/nc-cdl-test-training/compare/v1.3.0...v1.4.0) (2026-08-15)


### Features

* 30-day review history chart on the stats page ([58defbf](https://github.com/ullbergm/nc-cdl-test-training/commit/58defbffd1c34921188bd6900362f3dfb0709d97))
* add a content security policy ([18d2574](https://github.com/ullbergm/nc-cdl-test-training/commit/18d257406b7ee647dd19e3babb3521f6eab7f30c))
* confirm before an import replaces existing progress ([2bfe460](https://github.com/ullbergm/nc-cdl-test-training/commit/2bfe460da19a6debc1758913e559d008eb8af8b9))
* expand the thin manual sections with 34 new questions ([c7e5b7e](https://github.com/ullbergm/nc-cdl-test-training/commit/c7e5b7ed4e95d2345030b81f6e7988ddf29e37d1))
* offer a reload when a new release is deployed ([8845254](https://github.com/ullbergm/nc-cdl-test-training/commit/88452542d7a6944fb283bc323db2e04b47ebbc4e))
* undo the answer just given ([6f68076](https://github.com/ullbergm/nc-cdl-test-training/commit/6f68076675304c3cdc6c2f8e3ba228c2b70180b9))


### Bug Fixes

* apply the exact schedule previewed on the grade buttons ([a7df9d3](https://github.com/ullbergm/nc-cdl-test-training/commit/a7df9d32e81b2634d9bacec609d17bcb83f69fbf))
* deduplicate the bus front-tire question across sections ([4efb1a5](https://github.com/ullbergm/nc-cdl-test-training/commit/4efb1a5c3fca46374c319e684ca0692a0398ade1))
* give the maskable icon a full-bleed background ([d08103a](https://github.com/ullbergm/nc-cdl-test-training/commit/d08103ad4f0a4b430f82a731968f5b6250ad5792))
* keep the session progress bar from moving backward ([bb01e95](https://github.com/ullbergm/nc-cdl-test-training/commit/bb01e95d80fe0f04ac076626632e2067eac8983f))
* precache the changelog and version file for offline use ([11da9bf](https://github.com/ullbergm/nc-cdl-test-training/commit/11da9bf7ffc79094f3cdeefa8e674c41d4de2ba9))
* rebalance answer lengths so the correct choice is not the longest ([cfce30b](https://github.com/ullbergm/nc-cdl-test-training/commit/cfce30b101c590c1de43ef72c4331542e9efc3fd))
* sanitize imported backups instead of trusting them verbatim ([75d58bf](https://github.com/ullbergm/nc-cdl-test-training/commit/75d58bfd48fb56e13636434c725bdb1602c09334))

## [1.3.0](https://github.com/ullbergm/nc-cdl-test-training/compare/v1.2.0...v1.3.0) (2026-08-15)


### Features

* highway signage visual theme ([66117c2](https://github.com/ullbergm/nc-cdl-test-training/commit/66117c21bd582323dc7dee36c40f5b304c2c3370))

## [1.2.0](https://github.com/ullbergm/nc-cdl-test-training/compare/v1.1.0...v1.2.0) (2026-08-15)


### Features

* draw new cards round-robin across sections and interleave with reviews ([c743299](https://github.com/ullbergm/nc-cdl-test-training/commit/c743299611c3e9acbe9316445a45613d769147e6))
* fuzz review intervals to spread out due dates ([dd7f8b4](https://github.com/ullbergm/nc-cdl-test-training/commit/dd7f8b432d4b3c475a1aefeec3dfe03829e2f71c))
* hash-based routing for views ([4f7d997](https://github.com/ullbergm/nc-cdl-test-training/commit/4f7d9976c827917687288b8c3df1b343110ce256))
* installable PWA with offline support ([bbe7ee8](https://github.com/ullbergm/nc-cdl-test-training/commit/bbe7ee80e560bfcd85603b4cba8e99c67509c2ee))
* keyboard and screen reader accessibility ([70d02e1](https://github.com/ullbergm/nc-cdl-test-training/commit/70d02e1d1fca268c20abd3b1bcef122e9c69803c))
* keyboard shortcuts for answering and grading ([edc8c57](https://github.com/ullbergm/nc-cdl-test-training/commit/edc8c57e8f90a8576b3560ab3c7b11a875226149))
* resume the active session after a page reload ([d856606](https://github.com/ullbergm/nc-cdl-test-training/commit/d8566063395eb31ecc574fa6e04cd38c66eccd32))
* show keyboard shortcut badges on buttons ([f6756a6](https://github.com/ullbergm/nc-cdl-test-training/commit/f6756a6dd0c20414d50486805b098c1961a82385))


### Bug Fixes

* **ci:** deploy only the app files, not the whole repository ([e4d82e3](https://github.com/ullbergm/nc-cdl-test-training/commit/e4d82e3523634db525226e59780dc4fc926ecc5d))
* **ci:** write version.txt from the release tag at deploy time ([41ed92c](https://github.com/ullbergm/nc-cdl-test-training/commit/41ed92c7bba1ef9ec9da0f832116054463965eba))

## [1.1.0](https://github.com/ullbergm/nc-cdl-test-training/compare/v1.0.0...v1.1.0) (2026-08-15)


### Features

* add About page with links and changelog ([b765b0f](https://github.com/ullbergm/nc-cdl-test-training/commit/b765b0f618609be193f4fc9ed6e78a48a187bf0d))
* link to the github repo from the footer ([7212b19](https://github.com/ullbergm/nc-cdl-test-training/commit/7212b19f6e00df07a14722ffef4736ff0b7b8515))
* show release version in the footer ([887d613](https://github.com/ullbergm/nc-cdl-test-training/commit/887d613c511e6820d124f102d4b50636f4dd5a11))


### Bug Fixes

* pace updates on section toggle ([40bded0](https://github.com/ullbergm/nc-cdl-test-training/commit/40bded0cafa7319c75b9b17da2f30c71ae99ded4))

## 1.0.0 (2026-08-15)


### Features

* initial release ([4de0775](https://github.com/ullbergm/nc-cdl-test-training/commit/4de0775ce1ef580cc5ab6cb4576786678ac7d0d5))
