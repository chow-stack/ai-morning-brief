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

assert.ok(run('SOURCE_CATALOG.length') >= 30);
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
assert.strictEqual(run('makeTimes_().length'), 48);
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

run(`retrievalFixture = {steps:[
  {type:'url_context_call',id:'call-1',arguments:{urls:['https://a/old?utm_source=rss','https://b/1','https://d/original']}},
  {type:'url_context_result',call_id:'call-1',result:[{url:'https://www.a/1',status:'success'},{url:'https://b/1',status:'paywall'},{url:'https://d/final',title:'Fetched title',snippet:'Fetched text'}]},
  {type:'model_output',content:[{type:'text',text:'{}',annotations:[{url:'https://c/1'}]}]}
]}`);
assert.strictEqual(run("retrievalStatusForUrl_(extractRetrieval_(retrievalFixture),'https://a/old?utm_source=rss')"), 'success');
assert.strictEqual(run("retrievalStatusForUrl_(extractRetrieval_(retrievalFixture),'https://b/1')"), 'paywall');
assert.strictEqual(run("retrievalStatusForUrl_(extractRetrieval_(retrievalFixture),'https://d/original')"), 'success');
assert.strictEqual(run("retrievalStatusForUrl_(extractRetrieval_(retrievalFixture),'https://c/1')"), 'success');
assert.strictEqual(run('extractRetrievalDetails_(retrievalFixture).toolCalled'), true);
assert.strictEqual(run("canonicalUrlKey_('https://www.example.com/story/?utm_source=rss')"), 'example.com/story');

run(`candidateFixture = [{title:'Feed title',url:'https://a/1',source:'Source A',category:'Tech',excerpt:'Safe feed excerpt',publishedAt:new Date('2026-09-27T00:00:00Z')}];
digestFixture = {subject:'Subject',intro:'Intro',tldr:['One'],stories:[{title:'AI title',url:'https://a/1',source:'Wrong',category:'Tech',summary:'AI detail',bullets:['Detail'],why_it_matters:'Claim',action_takeaway:'Act',what_to_watch:'Watch'}]};
validationConfig = {preset:'Standard',maxStories:8,bullets:1};`);
assert.strictEqual(run("validateDigest_(digestFixture,candidateFixture,validationConfig,{'https://a/1':'success'}).stories[0].summary"), 'AI detail');
assert.strictEqual(run("validateDigest_(digestFixture,candidateFixture,validationConfig,{'https://a/1':'paywall'}).stories[0].summary"), 'Safe feed excerpt');
assert.strictEqual(run("validateDigest_(digestFixture,candidateFixture,validationConfig,{'https://a/1':'paywall'}).stories[0].bullets.length"), 0);
assert.strictEqual(run("validateDigest_(digestFixture,candidateFixture,validationConfig,{}).stories[0].retrievalStatus"), 'RSS excerpt only');
assert.ok(run("truncateWords_('one two three four five',3).split(/\\s+/).length") <= 3);
run(`longDigest = JSON.parse(JSON.stringify(digestFixture)); longDigest.intro = Array(50).fill('intro').join(' '); longDigest.stories[0].summary = Array(80).fill('summary').join(' '); longDigest.stories[0].bullets = [Array(50).fill('bullet').join(' ')]; longValidated = validateDigest_(longDigest,candidateFixture,validationConfig,{'https://a/1':'success'});`);
assert.ok(run("longValidated.intro.split(/\\s+/).length") <= 21);
assert.ok(run("longValidated.stories[0].summary.split(/\\s+/).length") <= 36);
assert.ok(run("longValidated.stories[0].bullets[0].split(/\\s+/).length") <= 16);

run(`renderConfig = {density:'Compact',showTldr:true,accent:'#3157D5',groupByCategory:true,bullets:1,showDate:true,timezone:'UTC',showWhy:true,showAction:true,showWatch:true,briefName:'Test Brief'};
renderDigest = validateDigest_(digestFixture,candidateFixture,validationConfig,{'https://a/1':'success'});`);
assert.match(run('renderEmail_(renderDigest,renderConfig,true)'), /Full page read/);
assert.match(run('renderEmail_(renderDigest,renderConfig,true)'), /Why it matters/);

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
