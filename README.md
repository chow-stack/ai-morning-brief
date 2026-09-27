# AI Morning Brief — Google Sheets edition

This is the no-code member version of the AI news brief. Members configure a
Google Sheet; a bound Apps Script gathers RSS entries, asks Gemini to read and
summarize up to 20 public article URLs, and sends the result with Gmail.

## Organizer: create the master template

1. Create a blank Google Sheet named **AI Morning Brief Template**.
2. Open **Extensions → Apps Script**.
3. Replace `Code.gs` with the contents of [`Code.gs`](Code.gs).
4. Add an HTML file named `Setup` and paste [`Setup.html`](Setup.html).
5. Open **Project Settings**, enable **Show "appsscript.json" manifest file in editor**,
   and replace the manifest with [`appsscript.json`](appsscript.json).
6. Save. Return to the Sheet and reload it.
7. Choose **AI Morning Brief → 1. Build or repair template**.
8. Fill in your email on the Settings sheet.
9. Choose **AI Morning Brief → 2. Add or update Gemini key**.
10. Choose **Send test brief now** and complete the Google authorization flow.
11. After the test arrives, choose **Install daily delivery**.

Do not put your own API key into a Sheet shared as the club template. API keys
are stored in Apps Script user properties and are not copied with the cells, but
the safest distribution workflow is to remove your key and trigger from the
master or create a fresh clean master after testing.

## Member setup

1. Open the template link and choose **File → Make a copy**.
2. Select sources with the checkboxes and edit the yellow Settings cells.
3. Create a Gemini key at <https://aistudio.google.com/app/apikey>.
4. Choose **AI Morning Brief → Add or update Gemini key** and paste it.
5. Choose **Send test brief now** and authorize the script.
6. Choose **Install daily delivery**.

The computer does not need to remain on. Google runs the time trigger in the
cloud. Delivery occurs sometime within the selected hour, not at an exact minute.

## Distribution

Share the master Sheet as **Viewer**, not Editor. A view-only user can make a
copy and becomes the owner of the copied bound script. Add `/copy` to the end of
the Sheet URL instead of `/edit...` to open the copy prompt directly.

Before the club meeting, test the copy link with a second Google account. Some
school-managed Workspace accounts can disable Google AI Studio or Apps Script;
members can use a personal Google account if club policy permits it.

## Design limits

- One Gemini request per brief.
- At most 20 candidate URLs because Gemini URL Context currently accepts 20.
- Public, non-paywalled URLs only.
- Daily runs fall back to a headline edition when Gemini is temporarily
  unavailable. Manual test runs fail visibly so setup problems are not hidden.
- The free Gemini tier can have changing model and request limits. Update the
  Model cell if Google changes model availability.
