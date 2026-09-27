# AI Morning Brief — Google Sheets edition

A no-code club activity: each member personalizes a Google Sheet, selects news
sources, connects a free Gemini API key, and receives an automatic email brief.
The member's computer does not need to stay on because Google Apps Script runs
the scheduled job in Google's cloud.

## What version 2 adds

- A clean Dashboard and guided, color-coded workbook.
- Delivery times in 30-minute increments and four day schedules.
- A personal profile that controls story selection and writing level.
- Source packs for AI, technology, finance and markets, economics and policy,
  business and startups, cybersecurity, and science and research.
- Compact, Standard, and Deep dive email presets plus individual controls.
- A two-stage Gemini workflow: Flash-Lite ranks RSS candidates, then Flash reads
  the selected public pages and writes the email.
- Automatic model fallback, temporary-error retry, and an RSS headline fallback
  for unattended daily runs.
- Source, page-retrieval, model, fallback, and run diagnostics.

The complete build checklist is in
[`IMPLEMENTATION_CHECKLIST.md`](IMPLEMENTATION_CHECKLIST.md).

## Upgrade the Sheet that already worked

This is the manual part required after updating the local repository:

1. Open the Google Sheet you already tested.
2. Open **Extensions → Apps Script**.
3. Replace all of `Code.gs` with this repository's [`Code.gs`](Code.gs).
4. Confirm `appsscript.json` still matches
   [`appsscript.json`](appsscript.json), then save.
5. Reload the Google Sheet.
6. Choose **AI Morning Brief → 1. Build or upgrade workbook** and approve the
   upgrade.
7. Review the yellow Settings cells and the Sources checkboxes.
8. Choose **Run source diagnostics**.
9. Choose **Send test brief now**.
10. If the test looks right, choose **Install / update delivery**. This replaces
    the old trigger with the selected time.

The upgrade preserves matching settings, enabled/custom sources, the private
Gemini key, history, and the existing trigger until step 10. It does not expose
the key in a Sheet cell.

## Configure a brief

### 1. About the reader

On **Settings**, add only the profile details useful for news selection. Major,
career interests, current classes/projects, priority topics, topics to avoid,
and purpose are all optional but improve ranking.

The “Additional instructions” cell is for preferences such as “favor practical
tools I can try this week” or “explain finance terms.” The script explicitly
tells Gemini that article content is source data, not an instruction.

### 2. Sources

Use **AI Morning Brief → Choose source packs** for a quick setup, then fine-tune
checkboxes on **Sources**. A member can add a custom RSS/Atom feed as another row
using the same columns.

Run **Source diagnostics** after changing feeds. A feed can be temporarily down,
block automated requests, change its URL, or return no stories within the chosen
lookback. Those failures now appear on **Source Status**.

### 3. Email format

Choose Compact, Standard, or Deep dive in “Email preset,” then run
**Apply selected email preset**. Individual controls can be changed afterward:

- maximum stories, language, grouping, and TL;DR;
- zero to three bullets per story;
- why it matters, an action, and what to watch;
- publication date, subject style, accent color, and spacing density.

### 4. Delivery

Select a half-hour time and a day pattern. Apps Script's `nearMinute()` scheduling
is approximate: Google documents that it runs within about ±15 minutes of the
chosen minute. Installing again safely replaces the previous delivery trigger.

## Is Gemini reading the article?

The script uses Gemini URL Context for the final selected URLs. It parses the
tool result for `success`, `error`, `paywall`, or `unsafe` status.

- **Full page read**: URL Context reported success, so the email may use the
  article summary and detailed fields Gemini wrote.
- **RSS excerpt only**: success was not confirmed. The script discards Gemini's
  detailed claims for that story and uses the feed excerpt.
- **Paywalled / Blocked**: the email is likewise restricted to the feed excerpt.

Every email labels the retrieval level, and **History** records how many pages
were successfully read.

Use **AI Morning Brief → Test one article URL** to diagnose a specific public
page. It reports whether URL Context ran, which model handled the request, the
status returned, and a redirect when Google retrieved a different canonical URL.
The retrieval parser matches tool calls to results by call ID and position,
recognizes canonical/redirected URLs, and handles responses that return retrieved
page content without an explicit `status` field.

## Conciseness guarantees

The three presets now use 4, 6, and 8 stories. Gemini is prompted with strict
word limits, and the script applies those limits again after generation, so a
model cannot produce an unexpectedly long email. Even Deep dive caps summaries
at 44 words, bullets at 18 words, detail fields at 22 words, and TL;DR at three
short items. The email layout also uses tighter spacing, smaller metadata, and
shorter section blocks.

## Gemini use and fallback behavior

A normal brief makes about two model requests:

1. `gemini-3.5-flash-lite` ranks up to 80 RSS candidates and returns no more than
   20 URLs.
2. `gemini-3.5-flash` reads those URLs and writes the brief.

If the writing model is temporarily unavailable, rate-limited, or missing, the
script retries once when appropriate and then uses
`gemini-3.5-flash-lite`. It does **not** hide an invalid/unauthorized key (401 or
403). An unattended scheduled run can still send an RSS headline edition if all
writing models fail; a manual test fails visibly instead so setup problems are
not hidden.

Gemini free-tier limits are per Google Cloud project and can change by model.
Each member should use their own AI Studio project/key and check the current
limits in AI Studio. If Google changes model availability, update the three model
cells on Settings—no code change is required.

## Build the club master template

1. Finish testing your personal Sheet first.
2. Make a separate copy that will become the club master.
3. In that copy, choose **Prepare this copy as a clean club template**. This
   removes the current user's key, trigger, email/profile, run history,
   diagnostics, and seen-story state.
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
3. Choose source packs or individual source checkboxes.
4. Create a Gemini key at <https://aistudio.google.com/app/apikey>.
5. Choose **AI Morning Brief → Add or update Gemini key** and paste the key.
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

The tests cover time parsing, delivery-day logic, fair candidate limiting,
retrieval-status parsing, claim removal when full-page retrieval is unconfirmed,
temporary-error model fallback, and authorization-error handling. A final test
inside Google Sheets is still required because local tests cannot emulate
Apps Script authorization, triggers, Gmail, or the live Gemini account quota.

## Official references

- [Apps Script clock triggers](https://developers.google.com/apps-script/reference/script/clock-trigger-builder)
- [Gemini Interactions API and URL Context](https://ai.google.dev/api/interactions-api)
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Ars Technica RSS directory](https://arstechnica.com/rss-feeds/)
- [Federal Reserve RSS directory](https://www.federalreserve.gov/feeds/feeds.htm)
- [St. Louis Fed RSS directory](https://www.stlouisfed.org/rss)
- [BLS RSS directory](https://www.bls.gov/feed/)
- [Harvard Gazette RSS directory](https://news.harvard.edu/gazette/rss-feeds/)
