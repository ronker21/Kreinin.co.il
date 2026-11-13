# kreinin.co.il — working brief for Claude

Owner: Ron (GitHub `ronker21`). Often works from a phone: keep replies short,
show results (screenshots), and don't make them read diffs to approve trivial work.
Owner prefers a blunt mentor: challenge weak ideas, say what's risky, don't flatter.

## What this is
Static site, no build step, no package.json. Deployed by **GitHub Pages from `main`**
(push = publish, usually live within ~1–2 min). Custom domain via `CNAME` →
`www.kreinin.co.il` (DNS at MyNames). Verified 2026-11-13: served directly by GitHub Pages (`server: GitHub.com`, no `cf-ray`) — Cloudflare is NOT proxying.

| Path | What |
|---|---|
| `/` `index.html` + `pricing*.html`, `privacy.html`, `accessibility.html`, `thanks.html` | Ron's freelance business site (Hebrew, RTL): Excel tools/models for self-employed people. Shared `fonts.css`, `legal.css`, self-hosted Heebo/Assistant fonts (`font-*.woff2`). |
| `/yomhaiati/` | "הלוח המרוקאי" — humorous daily-animal calendar (Hebrew). |
| `/gold/` | GoldCalc — English gold-value calculator (port of a Swift app). See `gold/README.md`. |
| `sitemap.xml`, `robots.txt` | SEO. Sitemap currently lists only `/`, `pricing.html`, `pricing-guide.html`. |

## /yomhaiati — how it actually works
- `app.js`: `animals` (24, each with emoji + grammatical gender m/f) × `variants`
  (20, each with m/f form) = 480 combos. Daily pick: `(day*137+83) mod 480`,
  date in `Asia/Jerusalem`. 137 is coprime with 480 → every combo exactly once per 480 days.
  Changing `animals`/`variants` length or order **reshuffles every past and future day**.
- `readings.js` (~900 KB): `const dailyReadings = { "<animal> <variant-form>": [5 × {motto, story, mission}] }`
  plus `readingFor()`. Keys must match `animal.name + ' ' + variant[gender]` from `app.js`
  **exactly**, or the page throws `Missing readings for …`.
- `index.html` loads `readings.js?v=…` and `app.js?v=…`. **Bump the `?v=` string whenever
  you change either file**, or returning visitors get the cached old version.
- Content is Hebrew and gendered: verbs/adjectives must agree with the animal's gender.

## Rules for every change
1. Before editing: `git pull` (the clone is shallow; fetch with `--depth`, never unshallow).
2. Validate before pushing:
   - JS syntax: `node --check yomhaiati/app.js && node --check yomhaiati/readings.js`
   - Readings integrity (all 480 keys present, 5 entries each, no empty fields) —
     write/run a quick node script that evals both files.
   - GoldCalc: `node --test gold/calc.test.mjs` (note: `node --test gold/` does NOT work).
   - Visual check: `python3 -m http.server` from repo root + Playwright (preinstalled)
     screenshot at mobile size (e.g. iPhone 13). Send the screenshot to Ron.
3. Small, focused commits with clear messages. Ron's workflow is push straight to `main`;
   still confirm with Ron before pushing anything non-trivial, since push = live.
4. After pushing: verify live with `curl -sI https://www.kreinin.co.il/<path>` and check
   the new `?v=` string is served. Don't claim "published" without this check.
5. Never add a root-level `.md` you don't want public: there is no `.nojekyll`, so Pages
   runs Jekyll and publishes Markdown as HTML. Dot-folders (like this `.claude/`) are skipped.
6. No secrets in the repo — it is public. (GoldCalc deliberately dropped the Swift app's API key.)

## External services (not reachable from a session unless credentials are added)
- GitHub Pages (deploy) · MyNames (DNS) · Cloudflare (status unknown) ·
  Firebase project `kreinins-website` (old visitor counter, status unknown) ·
  Google Search Console (verified). Contact: ron@kreinin.co.il (public on the site).
- Ask Ron before touching DNS/Cloudflare; a mistake there takes the whole domain down.

## Known open items
- `/yomhaiati/` and `/gold/` missing from `sitemap.xml`.
- `readings.js` is ~900 KB raw / ~210 KB gzip loaded up front on mobile; could split per
  combo if load time matters. Not urgent.
- `?v=` cache-busting is manual — candidate for automation (e.g. content hash).
- Firebase status unverified; whether Cloudflare still holds DNS is unverified (it is not proxying).
