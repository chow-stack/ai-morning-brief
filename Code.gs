const APP = Object.freeze({
  menu: 'AI Morning Brief',
  settingsSheet: 'Settings',
  sourcesSheet: 'Sources',
  historySheet: 'History',
  stateSheet: '_State',
  maxCandidates: 20,
  maxPerSource: 4,
  seenRetentionDays: 45,
  defaultModel: 'gemini-3.5-flash',
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/interactions',
});

const DEFAULT_SOURCES = [
  [true, 'OpenAI', 'Official labs', 'https://openai.com/news/rss.xml', 10],
  [true, 'Google DeepMind', 'Official labs', 'https://deepmind.google/blog/rss.xml', 10],
  [true, 'Hugging Face', 'Official labs', 'https://huggingface.co/blog/feed.xml', 9],
  [true, 'GitHub AI & ML', 'Builder tools', 'https://github.blog/ai-and-ml/feed/', 9],
  [true, 'MIT News AI', 'Research', 'https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml', 8],
  [true, 'Hacker News AI', 'Builder tools', 'https://hnrss.org/newest?q=AI+model+OR+AI+tool+OR+LLM&points=20', 7],
  [true, 'TechCrunch AI', 'Industry news', 'https://techcrunch.com/category/artificial-intelligence/feed/', 6],
  [true, 'The Verge AI', 'Industry news', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 6],
  [false, 'The Gradient', 'Research', 'https://thegradient.pub/rss/', 8],
  [false, 'AIhub', 'Research', 'https://aihub.org/feed/?cat=-473', 7],
  [false, 'KDnuggets', 'Builder tools', 'https://www.kdnuggets.com/feed', 6],
  [false, 'The Guardian AI', 'Business & policy', 'https://www.theguardian.com/technology/artificialintelligenceai/rss', 5],
];

const DIGEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'intro', 'stories'],
  properties: {
    subject: { type: 'string' },
    intro: { type: 'string' },
    stories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'url', 'source', 'category', 'summary', 'why_it_matters'],
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          source: { type: 'string' },
          category: { type: 'string' },
          summary: { type: 'string' },
          why_it_matters: { type: 'string' },
        },
      },
    },
  },
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP.menu)
    .addItem('1. Build or repair template', 'initializeTemplate')
    .addItem('2. Add or update Gemini key', 'promptForApiKey')
    .addSeparator()
    .addItem('Send test brief now', 'sendTestBrief')
    .addItem('Install daily delivery', 'installDailyDelivery')
    .addItem('Remove daily delivery', 'removeDailyDelivery')
    .addItem('Show setup status', 'showSetupStatus')
    .addToUi();
}

function initializeTemplate() {
  const ui = SpreadsheetApp.getUi();
  const existing = SpreadsheetApp.getActive().getSheetByName(APP.settingsSheet);
  if (existing) {
    const response = ui.alert(
      'Rebuild template?',
      'This resets Settings and Sources. Your API key and history are preserved.',
      ui.ButtonSet.YES_NO,
    );
    if (response !== ui.Button.YES) return;
  }

  buildSettingsSheet_();
  buildSourcesSheet_();
  buildHistorySheet_();
  buildStateSheet_();
  SpreadsheetApp.getActive().setActiveSheet(getSheet_(APP.settingsSheet));
  ui.alert('Template ready', 'Edit the yellow cells, select sources, then add your Gemini key from the AI Morning Brief menu.', ui.ButtonSet.OK);
}

function buildSettingsSheet_() {
  const sheet = getOrCreateSheet_(APP.settingsSheet);
  sheet.clear();
  sheet.getRange('A1:C1').setValues([['Setting', 'Your choice', 'What it controls']]);
  sheet.getRange('A2:C12').setValues([
    ['Brief name', 'My AI Morning Brief', 'Shown at the top of the email'],
    ['Email', '', 'Where the brief is delivered'],
    ['Delivery hour', 7, 'Local hour, 0–23; Google may deliver within that hour'],
    ['Schedule', 'Weekdays', 'Daily or Weekdays'],
    ['Timezone', Session.getScriptTimeZone(), 'Use an IANA timezone such as America/Indiana/Indianapolis'],
    ['Lookback hours', 36, 'How far back to look for articles'],
    ['Maximum stories', 8, 'Between 3 and 12'],
    ['Style', 'Quick scan', 'Quick scan, Beginner-friendly, or Technical'],
    ['Interests', 'AI products, useful tools, research, and major industry changes', 'Write topics you want prioritized'],
    ['Model', APP.defaultModel, 'Must be a Gemini model with free API access and URL Context'],
    ['Accent color', '#3157D5', 'Email highlight color in #RRGGBB format'],
  ]);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 170);
  sheet.setColumnWidth(2, 360);
  sheet.setColumnWidth(3, 430);
  sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#182230').setFontColor('#ffffff');
  sheet.getRange('B2:B12').setBackground('#fff2cc');
  sheet.getRange('B5').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Daily', 'Weekdays'], true).build(),
  );
  sheet.getRange('B9').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Quick scan', 'Beginner-friendly', 'Technical'], true).build(),
  );
  sheet.getRange('B4').setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(0, 23).build(),
  );
  sheet.getRange('B7').setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(6, 168).build(),
  );
  sheet.getRange('B8').setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(3, 12).build(),
  );
}

function buildSourcesSheet_() {
  const sheet = getOrCreateSheet_(APP.sourcesSheet);
  sheet.clear();
  sheet.getRange(1, 1, 1, 5).setValues([['Use?', 'Source', 'Category', 'RSS feed', 'Priority']]);
  sheet.getRange(2, 1, DEFAULT_SOURCES.length, 5).setValues(DEFAULT_SOURCES);
  sheet.getRange(2, 1, Math.max(DEFAULT_SOURCES.length, 50), 1).insertCheckboxes();
  sheet.setFrozenRows(1);
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#182230').setFontColor('#ffffff');
  sheet.setColumnWidth(1, 70);
  sheet.setColumnWidth(2, 190);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 520);
  sheet.setColumnWidth(5, 80);
  sheet.getRange('A2:A50').setBackground('#fff2cc');
  sheet.getRange('A1:E50').createFilter();
}

function buildHistorySheet_() {
  const sheet = getOrCreateSheet_(APP.historySheet);
  if (sheet.getLastRow() === 0) {
    sheet.getRange('A1:E1').setValues([['Run time', 'Result', 'Stories', 'Subject', 'Details']]);
    sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#182230').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(2, 110);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(4, 360);
    sheet.setColumnWidth(5, 500);
  }
}

function buildStateSheet_() {
  const sheet = getOrCreateSheet_(APP.stateSheet);
  if (sheet.getLastRow() === 0) sheet.getRange('A1:B1').setValues([['URL', 'Seen at']]);
  sheet.hideSheet();
}

function promptForApiKey() {
  ensureTemplate_();
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Connect Gemini',
    'Paste your Gemini API key. It will be stored in private Apps Script user properties, not in spreadsheet cells.',
    ui.ButtonSet.OK_CANCEL,
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  saveApiKey(response.getResponseText());
  ui.alert('Gemini connected', 'Your API key was saved. Next, choose Send test brief now.', ui.ButtonSet.OK);
}

function getSetupState() {
  const config = readSettings_();
  return {
    hasKey: Boolean(getApiKey_()),
    email: config.email || '',
    model: config.model || APP.defaultModel,
    hasTrigger: getDailyTriggers_().length > 0,
  };
}

function saveApiKey(apiKey) {
  const cleaned = String(apiKey || '').trim();
  if (!cleaned || cleaned.length < 20) throw new Error('Paste a valid Gemini API key.');
  PropertiesService.getUserProperties().setProperty('GEMINI_API_KEY', cleaned);
}

function sendTestBrief() {
  ensureTemplate_();
  const ui = SpreadsheetApp.getUi();
  try {
    const result = runBrief_({ isTest: true, allowFallback: false, ignoreSeen: true });
    ui.alert('Test sent', `${result.stories} stories were sent to ${result.email}.`, ui.ButtonSet.OK);
  } catch (error) {
    logRun_('Failed test', 0, '', error.message);
    ui.alert('Test failed', error.message, ui.ButtonSet.OK);
    throw error;
  }
}

function installDailyDelivery() {
  ensureTemplate_();
  const config = readSettings_();
  validateConfig_(config);
  if (!getApiKey_()) throw new Error('Add your Gemini API key first.');
  removeDailyTriggers_();
  ScriptApp.newTrigger('runDailyBrief')
    .timeBased()
    .atHour(config.deliveryHour)
    .everyDays(1)
    .inTimezone(config.timezone)
    .create();
  SpreadsheetApp.getUi().alert(
    'Daily delivery installed',
    `Google will run the brief during the ${config.deliveryHour}:00 hour in ${config.timezone}.`,
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

function removeDailyDelivery() {
  const count = removeDailyTriggers_();
  SpreadsheetApp.getUi().alert('Daily delivery removed', `${count} trigger(s) removed.`, SpreadsheetApp.getUi().ButtonSet.OK);
}

function showSetupStatus() {
  ensureTemplate_();
  const state = getSetupState();
  SpreadsheetApp.getUi().alert(
    'Setup status',
    [
      `Gemini key: ${state.hasKey ? 'connected' : 'missing'}`,
      `Email: ${state.email || 'missing'}`,
      `Model: ${state.model}`,
      `Daily delivery: ${state.hasTrigger ? 'installed' : 'not installed'}`,
    ].join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

function runDailyBrief() {
  ensureTemplate_();
  const config = readSettings_();
  if (config.schedule === 'Weekdays') {
    const day = Number(Utilities.formatDate(new Date(), config.timezone, 'u'));
    if (day > 5) return;
  }
  try {
    runBrief_({ isTest: false, allowFallback: true, ignoreSeen: false });
  } catch (error) {
    logRun_('Failed', 0, '', error.message);
    throw error;
  }
}

function runBrief_(options) {
  const config = readSettings_();
  validateConfig_(config);
  const sources = readSources_();
  if (!sources.length) throw new Error('Select at least one source on the Sources sheet.');

  const seen = options.ignoreSeen ? new Set() : loadSeen_();
  const gathered = gatherCandidates_(sources, config.lookbackHours, seen);
  const candidates = chooseCandidates_(gathered.items);
  if (!candidates.length) {
    logRun_(options.isTest ? 'Empty test' : 'No new stories', 0, '', gathered.errors.join(' | '));
    if (options.isTest) throw new Error('No recent articles were found. Increase Lookback hours or select more sources.');
    return { email: config.email, stories: 0 };
  }

  let digest;
  let details = gathered.errors.join(' | ');
  try {
    digest = createDigest_(candidates, config);
  } catch (error) {
    if (!options.allowFallback) throw error;
    digest = fallbackDigest_(candidates, config);
    details = `AI fallback used: ${error.message}${details ? ` | ${details}` : ''}`;
  }

  digest = validateDigest_(digest, candidates, config.maxStories);
  const subject = `${options.isTest ? '[TEST] ' : ''}${digest.subject}`;
  const html = renderEmail_(digest, config, options.isTest);
  const text = renderPlainText_(digest, config, options.isTest);
  MailApp.sendEmail({
    to: config.email,
    subject,
    body: text,
    htmlBody: html,
    name: config.briefName,
  });

  if (!options.isTest) saveSeen_(gathered.items);
  logRun_(options.isTest ? 'Test sent' : 'Sent', digest.stories.length, subject, details);
  return { email: config.email, stories: digest.stories.length, subject };
}

function readSettings_() {
  const values = getSheet_(APP.settingsSheet).getRange('A2:B12').getValues();
  const data = Object.fromEntries(values.map(([key, value]) => [String(key).trim(), value]));
  return {
    briefName: String(data['Brief name'] || '').trim(),
    email: String(data.Email || '').trim(),
    deliveryHour: Number(data['Delivery hour']),
    schedule: String(data.Schedule || '').trim(),
    timezone: String(data.Timezone || '').trim(),
    lookbackHours: Number(data['Lookback hours']),
    maxStories: Number(data['Maximum stories']),
    style: String(data.Style || '').trim(),
    interests: String(data.Interests || '').trim(),
    model: String(data.Model || APP.defaultModel).trim(),
    accent: String(data['Accent color'] || '#3157D5').trim(),
  };
}

function validateConfig_(config) {
  if (!config.briefName) throw new Error('Add a Brief name on the Settings sheet.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) throw new Error('Add a valid Email on the Settings sheet.');
  if (!Number.isInteger(config.deliveryHour) || config.deliveryHour < 0 || config.deliveryHour > 23) {
    throw new Error('Delivery hour must be a whole number from 0 to 23.');
  }
  if (!['Daily', 'Weekdays'].includes(config.schedule)) throw new Error('Schedule must be Daily or Weekdays.');
  if (!config.timezone) throw new Error('Add a timezone on the Settings sheet.');
  if (config.lookbackHours < 6 || config.lookbackHours > 168) throw new Error('Lookback hours must be between 6 and 168.');
  if (!Number.isInteger(config.maxStories) || config.maxStories < 3 || config.maxStories > 12) {
    throw new Error('Maximum stories must be a whole number from 3 to 12.');
  }
  if (!/^#[0-9a-f]{6}$/i.test(config.accent)) throw new Error('Accent color must look like #3157D5.');
}

function readSources_() {
  const sheet = getSheet_(APP.sourcesSheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues()
    .filter((row) => row[0] === true && row[1] && row[3])
    .map((row) => ({
      name: String(row[1]).trim(),
      category: String(row[2] || 'Other').trim(),
      url: String(row[3]).trim(),
      priority: Number(row[4]) || 5,
    }));
}

function gatherCandidates_(sources, lookbackHours, seen) {
  const requests = sources.map((source) => ({
    url: source.url,
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'User-Agent': 'AI Morning Brief/1.0' },
  }));
  const responses = UrlFetchApp.fetchAll(requests);
  const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
  const items = [];
  const errors = [];

  responses.forEach((response, index) => {
    const source = sources[index];
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      errors.push(`${source.name}: HTTP ${response.getResponseCode()}`);
      return;
    }
    try {
      parseFeed_(response.getContentText(), source).forEach((item) => {
        if (seen.has(item.url)) return;
        if (item.publishedAt && item.publishedAt.getTime() < cutoff) return;
        items.push(item);
      });
    } catch (error) {
      errors.push(`${source.name}: ${error.message}`);
    }
  });

  const unique = [];
  const urls = new Set();
  items.sort((a, b) => b.priority - a.priority || dateNumber_(b.publishedAt) - dateNumber_(a.publishedAt));
  items.forEach((item) => {
    const normalized = normalizeUrl_(item.url);
    if (!urls.has(normalized)) {
      urls.add(normalized);
      unique.push(item);
    }
  });
  return { items: unique, errors };
}

function parseFeed_(xmlText, source) {
  const root = XmlService.parse(xmlText).getRootElement();
  const rootName = root.getName().toLowerCase();
  let entries = [];
  if (rootName === 'rss' || rootName === 'rdf') {
    const channel = firstChild_(root, 'channel') || root;
    entries = children_(channel, 'item');
  } else if (rootName === 'feed') {
    entries = children_(root, 'entry');
  } else {
    throw new Error(`Unsupported feed root: ${root.getName()}`);
  }

  return entries.slice(0, 12).map((entry) => {
    const title = cleanText_(childText_(entry, ['title']));
    const url = feedLink_(entry);
    const excerpt = cleanText_(childText_(entry, ['description', 'summary', 'encoded', 'content'])).slice(0, 900);
    const dateText = childText_(entry, ['pubDate', 'published', 'updated', 'date']);
    const parsedDate = dateText ? new Date(dateText) : null;
    return {
      title,
      url,
      excerpt,
      source: source.name,
      category: source.category,
      priority: source.priority,
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    };
  }).filter((item) => item.title && /^https?:\/\//i.test(item.url));
}

function chooseCandidates_(items) {
  const chosen = [];
  const counts = {};
  items.forEach((item) => {
    if (chosen.length >= APP.maxCandidates) return;
    const count = counts[item.source] || 0;
    if (count < APP.maxPerSource) {
      chosen.push(item);
      counts[item.source] = count + 1;
    }
  });
  if (chosen.length < APP.maxCandidates) {
    items.forEach((item) => {
      if (chosen.length < APP.maxCandidates && !chosen.some((value) => value.url === item.url)) chosen.push(item);
    });
  }
  return chosen;
}

function createDigest_(candidates, config) {
  const apiKey = getApiKey_();
  if (!apiKey) throw new Error('Gemini API key is missing. Add it from the AI Morning Brief menu.');
  const articleList = candidates.map((item, index) => [
    `${index + 1}. ${item.title}`,
    `Source: ${item.source}`,
    `Category: ${item.category}`,
    `URL: ${item.url}`,
    item.excerpt ? `Feed excerpt: ${item.excerpt}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  const prompt = [
    `Create a personalized AI morning brief with at most ${config.maxStories} stories.`,
    `Reader interests: ${config.interests}`,
    `Writing style: ${config.style}`,
    '',
    'Use URL Context to read the public article pages. Select only consequential, non-duplicate stories.',
    'Every claim must be supported by the corresponding URL. Do not invent facts when a page cannot be retrieved.',
    'Use only URLs from the supplied list. Keep summary to one or two sentences and why_it_matters to one sentence.',
    'Category must be one of: Top story, Products, Builder tools, Research, Business & policy, Other.',
    '',
    'Candidates:',
    articleList,
  ].join('\n');

  const payload = {
    model: config.model,
    input: prompt,
    tools: [{ type: 'url_context' }],
    response_format: { type: 'text', mime_type: 'application/json', schema: DIGEST_SCHEMA },
    generation_config: { max_output_tokens: 5000, thinking_level: 'low' },
    store: false,
  };
  const response = UrlFetchApp.fetch(APP.apiUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  const body = response.getContentText();
  if (status < 200 || status >= 300) {
    let message = body.slice(0, 500);
    try {
      const parsed = JSON.parse(body);
      message = parsed.error && parsed.error.message ? parsed.error.message : message;
    } catch (_) {}
    throw new Error(`Gemini API error ${status}: ${message}`);
  }

  const result = JSON.parse(body);
  const texts = [];
  (result.steps || []).forEach((step) => {
    if (step.type === 'model_output') {
      (step.content || []).forEach((block) => {
        if (block.type === 'text' && block.text) texts.push(block.text);
      });
    }
  });
  if (!texts.length) throw new Error('Gemini returned no digest text.');
  return JSON.parse(stripJsonFences_(texts.join('\n')));
}

function validateDigest_(digest, candidates, maxStories) {
  const allowed = new Map(candidates.map((item) => [normalizeUrl_(item.url), item]));
  const used = new Set();
  const stories = [];
  (digest.stories || []).forEach((story) => {
    const key = normalizeUrl_(String(story.url || ''));
    const original = allowed.get(key);
    if (!original || used.has(key) || stories.length >= maxStories) return;
    used.add(key);
    stories.push({
      title: cleanText_(story.title || original.title),
      url: original.url,
      source: original.source,
      category: cleanText_(story.category || original.category),
      summary: cleanText_(story.summary || original.excerpt || 'Read the linked article for details.'),
      why_it_matters: cleanText_(story.why_it_matters || ''),
    });
  });
  if (!stories.length) throw new Error('Gemini did not return any valid stories from the supplied URLs.');
  return {
    subject: cleanText_(digest.subject || 'Your AI morning brief'),
    intro: cleanText_(digest.intro || 'The AI news worth knowing today.'),
    stories,
  };
}

function fallbackDigest_(candidates, config) {
  return {
    subject: `${config.briefName} — headline edition`,
    intro: 'Gemini was temporarily unavailable, so this edition contains the latest source headlines.',
    stories: candidates.slice(0, config.maxStories).map((item) => ({
      title: item.title,
      url: item.url,
      source: item.source,
      category: item.category,
      summary: item.excerpt || 'Open the article for details.',
      why_it_matters: '',
    })),
  };
}

function renderEmail_(digest, config, isTest) {
  const stories = digest.stories.map((story) => `
    <div style="padding:20px 0;border-top:1px solid #e4e7ec">
      <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${escapeHtml_(config.accent)}">${escapeHtml_(story.category)}</div>
      <h2 style="margin:6px 0 8px;font-size:20px;line-height:1.3"><a href="${escapeHtml_(story.url)}" style="color:#182230;text-decoration:none">${escapeHtml_(story.title)}</a></h2>
      <div style="font-size:13px;color:#667085;margin-bottom:8px">${escapeHtml_(story.source)}</div>
      <p style="margin:0 0 8px;line-height:1.55;color:#344054">${escapeHtml_(story.summary)}</p>
      ${story.why_it_matters ? `<p style="margin:0;line-height:1.55;color:#344054"><strong>Why it matters:</strong> ${escapeHtml_(story.why_it_matters)}</p>` : ''}
    </div>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#182230">
    <div style="max-width:680px;margin:0 auto;padding:24px 12px">
      <div style="background:#ffffff;border:1px solid #e4e7ec;border-radius:14px;padding:28px">
        ${isTest ? '<div style="color:#b54708;font-weight:700;margin-bottom:12px">TEST EMAIL</div>' : ''}
        <div style="font-size:14px;color:#667085">${escapeHtml_(Utilities.formatDate(new Date(), config.timezone, 'EEEE, MMMM d'))}</div>
        <h1 style="margin:8px 0;font-size:30px">${escapeHtml_(config.briefName)}</h1>
        <p style="font-size:17px;line-height:1.5;color:#475467">${escapeHtml_(digest.intro)}</p>
        ${stories}
        <div style="padding-top:18px;border-top:1px solid #e4e7ec;font-size:12px;color:#98a2b3">Generated from your selected sources with Gemini. Verify important claims at the linked source.</div>
      </div>
    </div></body></html>`;
}

function renderPlainText_(digest, config, isTest) {
  const lines = [isTest ? 'TEST EMAIL' : '', config.briefName, digest.intro, ''].filter(Boolean);
  digest.stories.forEach((story) => {
    lines.push(`${story.category.toUpperCase()}: ${story.title}`);
    lines.push(`${story.source} — ${story.url}`);
    lines.push(story.summary);
    if (story.why_it_matters) lines.push(`Why it matters: ${story.why_it_matters}`);
    lines.push('');
  });
  return lines.join('\n');
}

function loadSeen_() {
  const sheet = getSheet_(APP.stateSheet);
  if (sheet.getLastRow() < 2) return new Set();
  return new Set(sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat().filter(Boolean).map(normalizeUrl_));
}

function saveSeen_(items) {
  const sheet = getSheet_(APP.stateSheet);
  const existing = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const cutoff = Date.now() - APP.seenRetentionDays * 24 * 60 * 60 * 1000;
  const byUrl = new Map();
  existing.forEach(([url, date]) => {
    const parsed = date instanceof Date ? date : new Date(date);
    if (url && !Number.isNaN(parsed.getTime()) && parsed.getTime() >= cutoff) byUrl.set(normalizeUrl_(url), [url, parsed]);
  });
  items.forEach((item) => byUrl.set(normalizeUrl_(item.url), [item.url, new Date()]));
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).clearContent();
  const rows = Array.from(byUrl.values()).slice(-500);
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function logRun_(result, storyCount, subject, details) {
  buildHistorySheet_();
  getSheet_(APP.historySheet).appendRow([new Date(), result, storyCount, subject, details || '']);
}

function getApiKey_() {
  return PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
}

function getDailyTriggers_() {
  return ScriptApp.getProjectTriggers().filter((trigger) => trigger.getHandlerFunction() === 'runDailyBrief');
}

function removeDailyTriggers_() {
  const triggers = getDailyTriggers_();
  triggers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  return triggers.length;
}

function ensureTemplate_() {
  if (!SpreadsheetApp.getActive().getSheetByName(APP.settingsSheet)) {
    throw new Error(`Run ${APP.menu} → 1. Build or repair template first.`);
  }
  buildHistorySheet_();
  buildStateSheet_();
}

function getOrCreateSheet_(name) {
  return SpreadsheetApp.getActive().getSheetByName(name) || SpreadsheetApp.getActive().insertSheet(name);
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error(`Missing sheet: ${name}`);
  return sheet;
}

function children_(element, name) {
  return element.getChildren().filter((child) => child.getName().toLowerCase() === name.toLowerCase());
}

function firstChild_(element, name) {
  return children_(element, name)[0] || null;
}

function childText_(element, names) {
  for (const name of names) {
    const child = firstChild_(element, name);
    if (child) return child.getText();
  }
  return '';
}

function feedLink_(entry) {
  const links = children_(entry, 'link');
  for (const link of links) {
    const href = link.getAttribute('href');
    const rel = link.getAttribute('rel');
    if (href && (!rel || rel.getValue() === 'alternate')) return href.getValue().trim();
    if (!href && link.getText()) return link.getText().trim();
  }
  return childText_(entry, ['guid', 'id']).trim();
}

function cleanText_(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl_(url) {
  return String(url || '').trim().replace(/#.*$/, '').replace(/\/$/, '');
}

function dateNumber_(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function stripJsonFences_(text) {
  return String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function escapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}
