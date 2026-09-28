const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  Date,
  Set,
  Map,
  JSON,
  Object,
  Array,
  Number,
  String,
  RegExp,
  Math,
  Utilities: {
    formatDate(date, timezone, format) {
      if (format === 'u') return String(date.getUTCDay() || 7);
      if (format === 'yyyy-MM-dd') return date.toISOString().slice(0, 10);
      return 'Sep 27';
    },
    sleep() {},
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('Code.gs', 'utf8'), context);
const run = (source) => vm.runInContext(source, context);

const APP_MAX_WORDS = 1000;
assert.ok(run('SOURCE_CATALOG.length') >= 35);
assert.strictEqual(run('new Set(SOURCE_CATALOG.map(row => row[4])).size'), run('SOURCE_CATALOG.length'));
assert.strictEqual(run("SOURCE_CATALOG.every(row => /^https:\\/\\//.test(row[4]))"), true);
assert.strictEqual(run("new Set(SETTINGS.filter(row => row[0] !== 'SECTION').map(row => row[0])).size"), run("SETTINGS.filter(row => row[0] !== 'SECTION').length"));
assert.strictEqual(run("SETTINGS.some(row => row[0] === 'Knowledge level')"), false);
assert.strictEqual(run("SETTINGS.some(row => row[0] === 'Explain jargon')"), false);

assert.deepStrictEqual(JSON.parse(JSON.stringify(run("parseTime_('7:30 AM')"))), { hour: 7, minute: 30 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(run("parseTime_('12:00 AM')"))), { hour: 0, minute: 0 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(run("parseTime_('12:30 PM')"))), { hour: 12, minute: 30 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(run("parseTime_('7:30:00 AM')"))), { hour: 7, minute: 30 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(run('parseTime_(7.5 / 24)'))), { hour: 7, minute: 30 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(run("parseTime_(new Date(2000, 0, 1, 7, 30))"))), { hour: 7, minute: 30 });
assert.strictEqual(run("formatTime_(19, 30)"), '7:30 PM');
assert.strictEqual(run('makeTimes_().length'), 96);
assert.strictEqual(run('makeTimes_()[1]'), '12:15 AM');
assert.deepStrictEqual(JSON.parse(JSON.stringify(run("parseTime_('7:45 AM')"))), { hour: 7, minute: 45 });
assert.throws(() => run("parseTime_('25:00')"), /Delivery time/);

assert.strictEqual(run("shouldRunToday_('Weekdays', new Date('2026-09-28T12:00:00Z'), 'UTC')"), true);
assert.strictEqual(run("shouldRunToday_('Weekdays', new Date('2026-09-27T12:00:00Z'), 'UTC')"), false);
assert.strictEqual(run("shouldRunToday_('Mon/Wed/Fri', new Date('2026-09-30T12:00:00Z'), 'UTC')"), true);
assert.strictEqual(run("shouldRunToday_('Weekly Monday', new Date('2026-09-29T12:00:00Z'), 'UTC')"), false);

run(`testItems = [
  {source:'A',url:'https://a/1',priority:10},{source:'A',url:'https://a/2',priority:9},{source:'A',url:'https://a/3',priority:8},
  {source:'B',url:'https://b/1',priority:7},{source:'B',url:'https://b/2',priority:6}
]`);
assert.deepStrictEqual(JSON.parse(JSON.stringify(run('chooseCandidates_(testItems, 4, 2).map(x => x.url)'))), ['https://a/1', 'https://a/2', 'https://b/1', 'https://b/2']);

// Article text extraction.
assert.strictEqual(run("cleanText_('It&#8217;s &#128512; &amp;lt;ok&amp;gt;')"), 'It’s 😀 &lt;ok&gt;');
run(`longText = Array(150).fill('word').join(' ');
jsonLdPage = '<script type="application/ld+json">{"articleBody":"' + longText + ' \\\\"quoted\\\\""}</script>';
paragraphPage = '<nav><p>Menu link one two three four five six seven eight</p></nav><article><p>' + Array(60).fill('alpha').join(' ') + '</p><p>' + Array(60).fill('beta').join(' ') + '</p><p>short</p></article>';
paywallPage = '<script>{"isAccessibleForFree": false}</script><article><p>' + longText + '</p></article>';`);
assert.ok(run('extractArticleText_(jsonLdPage).words') >= 150);
assert.match(run('extractArticleText_(jsonLdPage).text'), /"quoted"/);
assert.strictEqual(run('extractArticleText_(paragraphPage).words'), 120);
assert.doesNotMatch(run('extractArticleText_(paragraphPage).text'), /Menu/);
assert.strictEqual(run('extractArticleText_(paywallPage).paywalled'), true);
assert.strictEqual(run("extractArticleText_('<p>' + Array(70).fill('open').join(' ') + '<p><p>' + Array(70).fill('again').join(' ') + '</div>').words"), 140);
assert.ok(run("limitWords_(Array(2000).fill('w').join(' '), APP.maxArticleWords).split(/\\s+/).length") <= APP_MAX_WORDS + 1);

// Reading order: long feed text, page, short feed text, then reader; subscriber-only pages never go to the reader.
const pages = {
  'https://page/ok': { code: 200, text: '<article><p>' + Array(200).fill('page').join(' ') + '</p></article>' },
  'https://page/blocked': { code: 403, text: 'Forbidden' },
  'https://page/paywall': { code: 200, text: '"isAccessibleForFree":"False"' },
  'https://page/short': { code: 200, text: '<p>Only a few words here.</p>' },
  'https://page/dns': { throws: true },
  'https://r.jina.ai/https://page/blocked': { code: 200, text: Array(300).fill('reader').join(' ') },
  'https://r.jina.ai/https://page/dns': { code: 200, text: 'Warning: Target URL returned error 403: Forbidden' },
};
const fetched = [];
const fakeResponse = (url) => { fetched.push(url); const p = pages[url]; if (!p || p.throws) throw new Error(`DNS error: ${url}`); return { getResponseCode: () => p.code, getContentText: () => p.text }; };
context.UrlFetchApp = {
  fetchAll(requests) { if (requests.some((r) => pages[r.url] && pages[r.url].throws)) throw new Error('Address unavailable'); return requests.map((r) => fakeResponse(r.url)); },
  fetch(url) { return fakeResponse(url); },
};
run(`readFixture = readArticles_([
  { url: 'https://feed/long', source: 'Feed', feedText: Array(400).fill('feed').join(' '), excerpt: 'x' },
  { url: 'https://page/ok', source: 'Page', feedText: '', excerpt: 'x' },
  { url: 'https://page/blocked', source: 'Blocked', feedText: '', excerpt: 'x' },
  { url: 'https://page/paywall', source: 'Paywall', feedText: '', excerpt: 'x' },
  { url: 'https://page/short', source: 'Short', feedText: Array(150).fill('teaser').join(' '), excerpt: 'x' },
  { url: 'https://page/dns', source: 'Dns', feedText: '', excerpt: 'x' },
], { useReader: true });`);
assert.deepStrictEqual(JSON.parse(JSON.stringify(run('readFixture.map((x) => x.readStatus)'))), ['feed', 'page', 'reader', 'paywall', 'feed', 'excerpt']);
assert.strictEqual(fetched.includes('https://feed/long'), false);
assert.strictEqual(fetched.includes('https://r.jina.ai/https://page/paywall'), false);
assert.match(run('readFixture[5].readDetail'), /page DNS error.*reader was blocked/);
assert.strictEqual(run("readArticles_([{ url: 'https://page/blocked', feedText: '', excerpt: 'x' }], { useReader: false })[0].readStatus"), 'excerpt');
assert.match(run('readingSummaryText_(readFixture)'), /2 from feed, 1 from page, 1 via reader, 1 subscriber-only, 1 excerpt only/);

// RSS 1.0 (RDF) feeds keep items beside the channel.
run(`el = (name, value, kids, attrs) => ({ getName: () => name, getChildren: () => kids || [], getValue: () => value || '', getText: () => value || '', getAttribute: (a) => attrs && attrs[a] ? { getValue: () => attrs[a] } : null });
rdfRoot = el('RDF', '', [el('channel', '', [el('title', 'Nature'), el('items')]), el('item', '', [el('title', 'Paper one'), el('link', 'https://nature.test/1'), el('date', '2026-09-25'), el('description', 'Excerpt')])]);
XmlService = { parse: () => ({ getRootElement: () => rdfRoot }) };`);
assert.strictEqual(run("parseFeed_('<xml/>', { name: 'Nature', pack: 'Science', category: 'Science', priority: 8 }).length"), 1);
assert.strictEqual(run("parseFeed_('<xml/>', { name: 'Nature' })[0].url"), 'https://nature.test/1');
assert.strictEqual(run("feedEntries_('<xml/>').title"), 'Nature');

// Source list merging keeps member choices and removals across upgrades.
run(`firstRows = mergeSources_([], new Set()); offeredAll = new Set(SOURCE_CATALOG.map((r) => normalizeUrl_(r[4])));
kept = SOURCE_CATALOG.slice(1).map((r) => ({ enabled: !r[0], url: r[4], name: r[2] }));
kept.push({ enabled: true, url: 'https://custom.test/feed', name: 'Custom', pack: '', category: '' }, { enabled: true, url: 'https://thegradient.pub/rss/', name: 'The Gradient' });
upgraded = mergeSources_(kept, offeredAll);`);
assert.strictEqual(run('firstRows.length'), run('SOURCE_CATALOG.length'));
assert.strictEqual(run("upgraded.some((r) => r[4] === SOURCE_CATALOG[0][4])"), false);
assert.strictEqual(run("upgraded.some((r) => r[4] === 'https://thegradient.pub/rss/')"), false);
assert.strictEqual(run("upgraded.find((r) => r[4] === 'https://custom.test/feed')[1]"), 'Custom');
assert.strictEqual(run("upgraded.find((r) => r[4] === SOURCE_CATALOG[1][4])[0]"), run('!SOURCE_CATALOG[1][0]'));
assert.strictEqual(run("mergeSources_([], new Set([normalizeUrl_(SOURCE_CATALOG[0][4])])).length"), run('SOURCE_CATALOG.length - 1'));
assert.strictEqual(run("SOURCE_CATALOG.some((r) => RETIRED_SOURCE_URLS.includes(r[4]))"), false);

// Feed discovery helpers.
assert.strictEqual(run("resolveUrl_('/feed.xml', 'https://site.test/blog/post?x=1')"), 'https://site.test/feed.xml');
assert.strictEqual(run("resolveUrl_('rss', 'https://site.test/blog/')"), 'https://site.test/blog/rss');
assert.deepStrictEqual(JSON.parse(JSON.stringify(run(`feedLinksFromHtml_('<link rel="alternate" type="application/rss+xml" href="/feed?a=1&amp;b=2"><link rel="stylesheet" href="/x.css">', 'https://site.test/')`))), ['https://site.test/feed?a=1&b=2']);

// Digest validation: only fully read stories keep Gemini's details.
run(`candidateFixture = [{title:'Feed title',url:'https://a/1',source:'Source A',category:'Tech',excerpt:'Safe feed excerpt',publishedAt:new Date('2026-09-27T00:00:00Z'),articleText:'Full text',readStatus:'page'},
  {title:'Paywalled',url:'https://b/1',source:'Source B',category:'Tech',excerpt:'B excerpt',articleText:'',readStatus:'paywall'}];
digestFixture = {subject:'Subject',intro:'Intro',tldr:['One'],stories:[{title:'AI title',url:'https://a/1?utm_source=rss',source:'Wrong',category:'Tech',summary:'AI detail',bullets:['Detail'],why_it_matters:'Claim',action_takeaway:'Act',what_to_watch:'Watch'},
  {title:'B title',url:'https://b/1',source:'B',category:'Tech',summary:'Invented',bullets:['Invented'],why_it_matters:'Invented',action_takeaway:'',what_to_watch:''}]};
validationConfig = {preset:'Standard',maxStories:8,bullets:1};
validated = validateDigest_(digestFixture,candidateFixture,validationConfig);`);
assert.strictEqual(run('validated.stories[0].summary'), 'AI detail');
assert.strictEqual(run('validated.stories[0].retrievalStatus'), 'Full article read');
assert.strictEqual(run('validated.stories[1].summary'), 'B excerpt');
assert.strictEqual(run('validated.stories[1].bullets.length'), 0);
assert.strictEqual(run('validated.stories[1].retrievalStatus'), 'Subscriber-only — RSS excerpt');
assert.deepStrictEqual(JSON.parse(JSON.stringify(run('retrievalBySource_(validated.stories)'))), { 'Source A': { success: 1, total: 1 }, 'Source B': { success: 0, total: 1 } });
assert.ok(run("truncateWords_('one two three four five',3).split(/\\s+/).length") <= 3);
run(`longDigest = JSON.parse(JSON.stringify(digestFixture)); longDigest.intro = Array(50).fill('intro').join(' '); longDigest.stories[0].summary = Array(80).fill('summary').join(' '); longDigest.stories[0].bullets = [Array(50).fill('bullet').join(' ')]; longValidated = validateDigest_(longDigest,candidateFixture,validationConfig);`);
assert.ok(run("longValidated.intro.split(/\\s+/).length") <= 21);
assert.ok(run("longValidated.stories[0].summary.split(/\\s+/).length") <= 36);
assert.ok(run("longValidated.stories[0].bullets[0].split(/\\s+/).length") <= 16);

run(`renderConfig = {density:'Compact',showTldr:true,accent:'#3157D5',groupByCategory:true,bullets:1,showDate:true,timezone:'UTC',showWhy:true,showAction:true,showWatch:true,briefName:'Test Brief'};`);
assert.match(run('renderEmail_(validated,renderConfig,true)'), /Full article read/);
assert.match(run('renderEmail_(validated,renderConfig,true)'), /Why it matters/);

// Presets cover every preset choice with valid settings.
assert.strictEqual(run("Object.keys(PRESETS).every((p) => Object.keys(PRESETS[p]).every((n) => SETTINGS.some((r) => r[0] === n)))"), true);

// Catalog shape: every pack fits on the Dashboard; a small set is on by default.
assert.ok(run('unique_(SOURCE_CATALOG.map((r) => r[1])).length') < run('APP.maxPackRows'));
assert.ok(run('SOURCE_CATALOG.filter((r) => r[0]).length') <= 12);
assert.strictEqual(run("SOURCE_CATALOG.every((r) => r.length === 8 && typeof r[0] === 'boolean' && r[5] >= 1 && r[5] <= 10 && ['Public', 'Mixed'].includes(r[6]))"), true);

// Profile prompt no longer includes a name.
assert.strictEqual(run("SETTINGS.some((r) => r[0] === 'Name')"), false);
assert.doesNotMatch(run("profilePrompt_({ purpose: 'x' })"), /Name:/);

// Lookback covers the gap since the previous delivery day.
assert.strictEqual(run("effectiveLookbackHours_({ deliveryDays: 'Weekdays', lookbackHours: 36, timezone: 'UTC' }, new Date('2026-09-28T12:00:00Z'))"), 84);
assert.strictEqual(run("effectiveLookbackHours_({ deliveryDays: 'Weekdays', lookbackHours: 36, timezone: 'UTC' }, new Date('2026-09-29T12:00:00Z'))"), 36);
assert.strictEqual(run("effectiveLookbackHours_({ deliveryDays: 'Weekly Monday', lookbackHours: 36, timezone: 'UTC' }, new Date('2026-09-28T12:00:00Z'))"), 180);
assert.strictEqual(run("effectiveLookbackHours_({ deliveryDays: 'Mon/Wed/Fri', lookbackHours: 36, timezone: 'UTC' }, new Date('2026-09-30T12:00:00Z'))"), 60);
assert.strictEqual(run("effectiveLookbackHours_({ deliveryDays: 'Every day', lookbackHours: 100, timezone: 'UTC' }, new Date('2026-09-30T12:00:00Z'))"), 100);

// NPR pages are fetched from the text-only edition; other URLs are unchanged.
assert.strictEqual(run("articleFetchUrl_('https://www.npr.org/2026/09/27/nx-s1-5982488/south-africa-shootings')"), 'https://text.npr.org/nx-s1-5982488');
assert.strictEqual(run("articleFetchUrl_('https://www.npr.org/sections/health-shots/2026/09/25/1234567890/story')"), 'https://text.npr.org/1234567890');
assert.strictEqual(run("articleFetchUrl_('https://www.bbc.com/news/articles/x')"), 'https://www.bbc.com/news/articles/x');

// Future-dated entries are skipped; newest entry date is reported.
run(`const inDays = (d) => new Date(Date.now() + d * 86400000).toUTCString();
feedRoot = el('rss', '', [el('channel', '', [el('title', 'Events'),
  el('item', '', [el('title', 'Future event'), el('link', 'https://ev.test/future'), el('pubDate', inDays(40))]),
  el('item', '', [el('title', 'Today'), el('link', 'https://ev.test/today'), el('pubDate', inDays(-0.1))]),
  el('item', '', [el('title', 'Old'), el('link', 'https://ev.test/old'), el('pubDate', inDays(-10))])])]);
XmlService = { parse: () => ({ getRootElement: () => feedRoot }) };
UrlFetchApp = { fetchAll: (reqs) => reqs.map(() => ({ getResponseCode: () => 200, getContentText: () => '<rss/>' })) };
futureCheck = gatherCandidates_([{ name: 'Events', url: 'https://ev.test/feed', priority: 5 }], 36, new Set());`);
assert.deepStrictEqual(JSON.parse(JSON.stringify(run('futureCheck.items.map((x) => x.url)'))), ['https://ev.test/today']);
assert.strictEqual(run("futureCheck.statuses[0].sample.url"), 'https://ev.test/today');
assert.ok(run("Date.now() - futureCheck.statuses[0].newest.getTime()") < 86400000);

let statuses = [503, 503, 200];
context.UrlFetchApp = {
  fetch() {
    const status = statuses.shift();
    return {
      getResponseCode: () => status,
      getContentText: () => status === 200
        ? JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"ok":true}' }] }] })
        : JSON.stringify({ error: { message: 'temporary' } }),
    };
  },
};
context.PropertiesService = { getUserProperties: () => ({ getProperty: () => 'test-key-with-more-than-twenty-characters' }) };
assert.strictEqual(run("callGeminiWithFallback_({input:'x'},['primary','backup'],'test').model"), 'backup');

statuses = [403];
assert.throws(() => run("callGeminiWithFallback_({input:'x'},['primary','backup'],'test')"), /authorization error 403/);

console.log('All logic tests passed.');
