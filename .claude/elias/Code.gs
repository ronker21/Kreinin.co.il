/**
 * Elias word collector — backend for https://www.kreinin.co.il/elias
 *
 * Sheet layout (Sheet1): row 2 = headers "אבא" (A) / "אמא" (B), words from row 3 down.
 *
 * GET  ?action=state                       -> {count, target, dad[], mom[]}
 * POST body {"word","who":"dad"|"mom","force":bool}   (Content-Type: text/plain)
 *                                          -> {status: added|exists|similar|invalid|busy, match?, count}
 *
 * Deploy: Deploy -> New deployment -> Web app -> Execute as: Me, Who has access: Anyone.
 * After editing this file: Deploy -> Manage deployments -> edit -> Version: New version
 * (otherwise the /exec URL keeps serving the old code).
 */

var SHEET_NAME = 'Sheet1';
var FIRST_ROW = 3;          // first word row (row 2 = headers)
var TARGET = 500;
var MAX_LEN = 40;
var COLS = { dad: 1, mom: 2 };

function doGet(e) {
  var lists = readLists_();
  return json_({ count: lists.dad.length + lists.mom.length, target: TARGET, dad: lists.dad, mom: lists.mom });
}

function doPost(e) {
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ status: 'invalid' }); }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ status: 'busy' });
  try {
    var lists = readLists_();
    var res = decide(req, lists);
    if (res.status === 'added') {
      appendWord_(req.who, res.word);
      lists[req.who].push(res.word);
    }
    res.count = lists.dad.length + lists.mom.length;
    delete res.word;
    return json_(res);
  } finally {
    lock.releaseLock();
  }
}

/* ---------- pure logic (no Google services; unit-tested) ---------- */

function decide(req, lists) {
  var who = req && req.who;
  var word = cleanWord(req && req.word);
  if (!COLS[who] || !word || word.length > MAX_LEN || !/[֐-׿A-Za-z0-9]/.test(word)) {
    return { status: 'invalid' };
  }
  var key = normKey(word);
  var all = lists.dad.concat(lists.mom);
  for (var i = 0; i < all.length; i++) {
    if (normKey(all[i]) === key) return { status: 'exists', match: all[i] };
  }
  if (!req.force) {
    for (var j = 0; j < all.length; j++) {
      if (isSimilar(key, normKey(all[j]))) return { status: 'similar', match: all[j] };
    }
  }
  return { status: 'added', word: word };
}

/** What gets stored: trimmed, single spaces, no niqqud, unified geresh. */
function cleanWord(s) {
  return String(s == null ? '' : s)
    .replace(/[֑-ׇ]/g, '')          // niqqud / cantillation
    .replace(/[׳'`’]/g, '׳')             // geresh variants -> ׳
    .replace(/[״"“”]/g, '״')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Comparison key: also lowercase, final letters folded, punctuation dropped. */
function normKey(s) {
  return cleanWord(s).toLowerCase()
    .replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ')
    .replace(/[׳״\-–.,!?()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSimilar(a, b) {
  if (!a || !b) return false;
  var na = a.replace(/ /g, ''), nb = b.replace(/ /g, '');
  if (na === nb) return true;                                   // differs only by spaces
  var shorter = Math.min(na.length, nb.length);
  if (shorter >= 4 && (na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0)) return true;  // "נעים ברגל" ⊂ "נעים ברגלים"
  var max = shorter <= 3 ? 0 : shorter <= 6 ? 1 : 2;
  return max > 0 && Math.abs(na.length - nb.length) <= max && lev(na, nb) <= max;
}

function lev(a, b) {
  var prev = [], cur, i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    cur = [i];
    for (j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/* ---------- sheet I/O ---------- */

function sheet_() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); }

function readLists_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  var out = { dad: [], mom: [] };
  if (last < FIRST_ROW) return out;
  var rows = sh.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, 2).getDisplayValues();
  rows.forEach(function (r) {
    var d = cleanWord(r[0]), m = cleanWord(r[1]);
    if (d) out.dad.push(d);
    if (m) out.mom.push(m);
  });
  return out;
}

/** Writes below the last non-empty cell of that person's column. */
function appendWord_(who, word) {
  var sh = sheet_();
  var col = COLS[who];
  var last = sh.getLastRow();
  var row = FIRST_ROW;
  if (last >= FIRST_ROW) {
    var vals = sh.getRange(FIRST_ROW, col, last - FIRST_ROW + 1, 1).getDisplayValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      if (String(vals[i][0]).trim() !== '') { row = FIRST_ROW + i + 1; break; }
    }
  }
  sh.getRange(row, col).setNumberFormat('@').setValue(word);   // '@' = plain text (keeps "1-2" etc. as typed)
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
