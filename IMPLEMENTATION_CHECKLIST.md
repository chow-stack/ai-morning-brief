# Implementation checklist

## Version 2.2 (2026-09-27)

- [x] Catalog expanded to 127 sources in 15 packs; every feed and newest article checked live with the Apps Script User-Agent
- [x] Defaults: 6 AI sources + BBC World, NPR News, Axios, CNBC Top News
- [x] Name setting removed from Settings and the Gemini prompt; Dashboard privacy note about the Gemini free tier
- [x] Lookback extended automatically for weekends, Mon/Wed/Fri, and weekly schedules
- [x] Future-dated feed entries ignored
- [x] NPR articles read from text.npr.org; unclosed paragraph tags handled
- [x] Source Status *Newest entry* column and stale-feed warning (30+ days)
- [x] Dashboard pack rows raised to 16
- [x] Tests for lookback, future dates, NPR rewrite, unclosed paragraphs, catalog shape, and name removal
- [x] Scheduled-run timeout fix: individual retries after a failed `fetchAll` are capped at 60 s; the reader is skipped if page reading passed 150 s
- [x] Progress lines in the Executions log for every brief
- [x] Non-delivery days logged as *Skipped* in History
- [x] *Test scheduled delivery in 5 minutes* menu item (one-time trigger that removes itself)
- [ ] Live test in Google Sheets after upgrade

## Version 2.1 (2026-09-27)

- [x] Script-side article reading: long feed text → page → shorter feed text → free Jina Reader → RSS excerpt
- [x] Subscriber-only pages detected (`isAccessibleForFree: false`) and never sent to the reader
- [x] Gemini writes only from supplied article text; unread stories keep only the RSS excerpt
- [x] URL Context retrieval parser removed
- [x] One failing site no longer breaks a whole `fetchAll` batch
- [x] *Test one article URL* and *Source diagnostics* report how each article is read (no Gemini request)
- [x] Catalog verified live; The Gradient, BLS, Google Security Blog, and CISA retired; finance/economics/AI/security feeds added
- [x] *Add a source* with feed discovery from a website address
- [x] *Remove selected sources*, with removals remembered across upgrades (`_Catalog`)
- [x] Dashboard pack checkboxes replace the typed pack prompt
- [x] Presets apply on dropdown change (simple `onEdit` trigger)
- [x] RSS 1.0 / RDF feeds (Nature) parse correctly
- [x] Only emailed stories are marked as seen
- [x] Removed version 1 migration, *Show setup status*, *Choose source packs*, *Apply selected email preset*, and public helper functions
- [x] Logic tests updated for reading order, extraction, RDF, source merging, and feed discovery
- [ ] Live test in Google Sheets: diagnostics, test brief, *Articles read* count, pack checkboxes, preset dropdown, add/remove source

## Version 2.0

- [x] Half-hour delivery-time picker and flexible delivery days
- [x] Google trigger configured with `nearMinute()` and a visible ±15-minute expectation
- [x] Flash primary model, Flash-Lite backup, and retry for temporary 429/5xx errors
- [x] Final RSS headline fallback for unattended daily runs
- [x] Student profile and safe personalization instructions
- [x] Two-stage AI flow: rank RSS candidates, then write from selected articles
- [x] Compact, Standard, and Deep dive presets
- [x] Controls for TL;DR, categories, bullets, relevance, actions, next signals, dates, subject, language, color, and density
- [x] Hard word limits and tighter rendering for every preset
- [x] Source Status and History diagnostics
- [x] Dashboard, formatted tabs, filters, validations, and cleaner workbook styling
- [x] Clean-template action for club distribution
