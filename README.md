# AI Morning Brief — Google Sheets edition

A no-code club activity: each member personalizes a Google Sheet, selects news
sources, connects a free Gemini API key, and receives an automatic email brief.
The member's computer does not need to stay on because Google Apps Script runs
the scheduled job in Google's cloud.

## What version 2.2 changes

- **127 verified sources in 15 packs.** New packs: World & US News, Politics &
  Policy, Climate & Energy, Sports, Culture & Media, Higher Ed & Careers, and
  Indiana. AI, Technology, Business, Finance, Economics, Cybersecurity, and
  Science & Health also gained sources. On 2026-09-27 every feed responded with
  the Apps Script User-Agent, and the newest article was fully readable for 125 of 127.
  The exceptions are The Verge's two feeds, which are subscriber-only.
- **Defaults** (on for new copies): OpenAI, Google DeepMind, Hugging Face,
  TechCrunch AI, One Useful Thing, Import AI, BBC World, NPR News, Axios, and
  CNBC Top News.
- **Not included:** AP and Reuters (no official feeds), subscription publishers
  (NYT, WSJ, FT, Economist, Bloomberg, Washington Post, and others), feeds that block
  Apps Script, and stale or broken feeds.
- **Privacy:** the Name setting was removed and is no longer sent to Gemini. The
  Dashboard explains that profile details and articles go to Gemini, and that
  the free tier may use them to improve Google products.
- **Lookback** automatically covers the gap since the previous delivery day
  (Friday → Monday, a full week for *Weekly Monday*).
- **Future-dated entries** (for example event listings) are ignored.
- **NPR** articles are fetched from `text.npr.org`, because npr.org refuses Apps
  Script connections. Paragraph extraction also handles unclosed `<p>` tags.
- **Source Status** has a *Newest entry* column and flags feeds with no new
  entries for 30+ days.
- The Dashboard shows up to 16 source packs.

Upgrading keeps each existing source's checkbox. New catalog sources arrive with
their default setting, so an upgraded sheet may still have GitHub AI & ML, The
Verge AI, and Ars Technica turned on from version 2.1.

## What version 2.1 changes

- **The script now reads the articles itself.** Gemini writes each story from
  article text the script retrieved, instead of being asked to open 20 links
  with URL Context. In a 2026-09-27 check with Apps Script's User-Agent, the
  newest article was fully readable for 37 of the 39 catalog feeds.
- **Source management:** *Add a source* (paste a feed or a website; the feed is
  found and checked), *Remove selected sources*, and pack checkboxes on the
  Dashboard. Removed sources stay removed after upgrades.
- **Verified catalog:** dead or blocked feeds were retired (The Gradient, BLS,
  Google Security Blog, CISA) and finance, economics, AI, technology, and
  cybersecurity feeds were added.
- Presets apply automatically when the *Email preset* dropdown changes.
- RSS 1.0 feeds such as Nature now parse correctly.
- Only stories that were emailed are marked as seen, so unselected stories can
  still appear the next day.
- Removed: version 1 migration, the URL Context retrieval parser, *Show setup
  status*, *Choose source packs*, and *Apply selected email preset*.

## How an article is read

For each story Gemini selected, the script tries these in order and stops at the
first that works:

1. **Long feed text**: 300+ words of full article text already in the RSS feed.
   Many feeds include this (GitHub, Krebs, Harvard Gazette, NY Fed, MIT Technology
   Review, and others).
2. **The page itself**: a normal web request. The script keeps the article
   text (structured `articleBody` data or the article's paragraphs), capped at 1,000 words.
3. **Shorter feed text**: 100–299 words from the feed, if the page failed.
4. **Free Jina Reader** (`r.jina.ai`): no key, 20 requests/minute per network
   address; at most 10 per brief. Only the public article link is sent. It can
   be turned off with *Use free reader fallback* on Settings.
5. **RSS excerpt only**: labelled as such in the email. Gemini may only restate
   the excerpt, and its bullets and details are discarded.

Subscriber-only pages (`isAccessibleForFree: false`) are never worked around:
they skip the reader and use the feed excerpt, labelled *Subscriber-only*. The
Verge often falls in this group.

Apps Script always sends its own `Google-Apps-Script` User-Agent and scripts
cannot change it. A few sites block that, which is why CISA was retired. Use
**Test one article URL** or **Run source diagnostics** to see exactly how a
page is read. No Gemini request is used for either.

## Upgrade the Sheet that already worked

1. Open the Google Sheet you already tested.
2. Open **Extensions → Apps Script**.
3. Replace all of `Code.gs` with this repository's [`Code.gs`](Code.gs).
4. Confirm `appsscript.json` still matches
   [`appsscript.json`](appsscript.json), then save.
5. Reload the Google Sheet.
6. Choose **AI Morning Brief → 1. Build or upgrade workbook** and approve.
7. Review Settings (new: *Use free reader fallback*) and the Dashboard packs.
8. Choose **Run source diagnostics**; the *Article reading* column on Source
   Status shows whether each feed's newest article was fully read.
9. Choose **Send test brief now**. History → *Articles read* should be mostly full.
10. Choose **Install / update delivery** to refresh the trigger.

The upgrade keeps settings, source checkboxes, custom sources, removed sources,
the private Gemini key, history, and the existing trigger.

## Configure a brief

### 1. About the reader

On **Settings**, add only the profile details useful for news selection. Major,
career interests, current classes/projects, priority topics, topics to avoid,
and purpose are all optional but improve ranking. Article content is always
treated as source data, never as an instruction.

### 2. Sources

- **Whole packs:** tick or untick a pack in *Source packs* on the Dashboard.
- **Single sources:** use the checkboxes on **Sources**.
- **Add:** **AI Morning Brief → Add a source**, paste a feed URL or just a
  website address. The script finds the feed and checks that it has entries. Then
  you can type an optional category. New sources join the *Custom* pack.
- **Remove:** on **Sources**, select any cell in each row to remove, then
  **AI Morning Brief → Remove selected sources**. Built-in sources you remove do
  not come back when the workbook is upgraded. Add them again if you want them.

A hidden `_Catalog` tab remembers which built-in feeds were already offered.

### 3. Email format

Pick Compact, Standard, or Deep dive in *Email preset*. The settings below it
change immediately and can then be adjusted individually.

### 4. Delivery

Use **Test scheduled delivery in 5 minutes** to confirm that Google's scheduler can
run your brief. It sends a [TEST] email in about 5–7 minutes, and you can close the Sheet
while you wait. Each run writes timed progress lines to **Extensions → Apps Script →
Executions**, and days that aren't delivery days are logged as *Skipped* in History.

Select a time in 15-minute steps and a day pattern. Apps Script's `nearMinute()` scheduling
runs within about ±15 minutes of the chosen minute. Installing again safely
replaces the previous delivery trigger.

## Gemini use and fallback behavior

A normal brief makes about two model requests:

1. `gemini-3.5-flash-lite` ranks up to 80 RSS candidates and returns no more than
   20 URLs.
2. `gemini-3.5-flash` writes the brief from the retrieved article text (roughly
   up to 20 × 1,000 words of input).

If the writing model is temporarily unavailable, rate-limited, or missing, the
script retries once when appropriate and then uses `gemini-3.5-flash-lite`. It
does **not** hide an invalid/unauthorized key (401 or 403). An unattended
scheduled run can still send an RSS headline edition if all writing models fail;
a manual test fails visibly instead.

Google now lists `gemini-3.5-flash` as a legacy model and `gemini-3.8-flash` as
the current Flash model. Free-tier limits are shown per project in AI Studio.
To switch, change the model cells on Settings. No code change is needed.

## Build the club master template

1. Finish testing your personal Sheet first.
2. Make a separate copy that will become the club master.
3. In that copy, choose **Prepare this copy as a clean club template**. This
   removes the current user's key, trigger, email/profile, run history,
   diagnostics, and seen-story state. Source choices are kept.
4. Confirm the Dashboard shows a missing key/email and no installed delivery.
5. Share the master as **Viewer**, not Editor.
6. Change the end of its URL from `/edit...` to `/copy` so members land on the
   copy prompt.
7. Test that `/copy` link in a private browser window using a second account.

Do not distribute your personal working Sheet as the master.

## Member instructions

1. Open the club `/copy` link and make a copy.
2. On Settings, fill the yellow cells. Use a different delivery time from friends
   when practical.
3. Tick source packs on the Dashboard; fine-tune or add sources if you like.
4. Create a Gemini key at <https://aistudio.google.com/app/apikey>.
5. Choose **AI Morning Brief → 2. Add or update Gemini key** and paste the key.
6. Run **Source diagnostics**, then **Send test brief now** and authorize the
   requested Google permissions.
7. After the email arrives, choose **Install / update delivery**.

If Apps Script reports `PERMISSION_DENIED` with several Google accounts signed
in, retry in a private/incognito window with only the account that owns the Sheet.
Some school-managed Workspace accounts can disable AI Studio or Apps Script; use
a personal Google account only if club/school policy permits it.

## Local verification

From this repository:

```bash
cp Code.gs /tmp/ai-morning-brief-Code.js
node --check /tmp/ai-morning-brief-Code.js
node tests/test_logic.js
jq empty appsscript.json
```

The tests cover time parsing, delivery-day logic, fair candidate limiting, the
article-reading order (feed, page, reader, subscriber-only, failures), HTML
extraction, RSS 1.0 parsing, source merging across upgrades, feed discovery
helpers, claim removal for unread stories, word limits, model fallback, and
authorization-error handling. A final test inside Google Sheets is still
required: local tests cannot emulate Apps Script authorization, triggers, Gmail,
Google's network addresses, or the live Gemini quota.

## Official references

- [Apps Script clock triggers](https://developers.google.com/apps-script/reference/script/clock-trigger-builder)
- [Apps Script URL Fetch service](https://developers.google.com/apps-script/reference/url-fetch)
- [Gemini Interactions API](https://ai.google.dev/api/interactions-api)
- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Jina Reader](https://jina.ai/reader/)
- [Federal Reserve RSS directory](https://www.federalreserve.gov/feeds/feeds.htm)
- [Harvard Gazette RSS directory](https://news.harvard.edu/gazette/rss-feeds/)
