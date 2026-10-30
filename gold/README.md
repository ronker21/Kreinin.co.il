# GoldCalc

Static web version of the original Swift app: same English labels, black/gold appearance, input order, 22K default, USD asking-price default and calculations. No business content or promotional links.

Target URL: https://www.kreinin.co.il/gold/

Serve the repository root with any static HTTP server and open /gold/. No build, dependencies or API key needed. Run tests: node --test gold/calc.test.mjs

Gold: https://api.gold-api.com/price/XAU (USD per troy ounce).
FX: https://api.frankfurter.dev/v2/rate/USD/ILS (daily rate).

Rates have a 10-second timeout, independent failure handling, timestamps, optional local cache and manual fallback. The old Swift project's embedded API key is excluded. Item inputs are neither saved nor sent to providers.
