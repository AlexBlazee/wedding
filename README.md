

A static, single-page South Indian Hindu wedding website. No build step, no framework — just HTML, CSS, and JavaScript.

## Features

- **RSVP form** — collects name, email, phone, attendance, and additional guest names; submits to Google Sheets with a confetti celebration on accept
- **Room request form** — collects room block requests and logs them to a separate Google Sheets tab
- **Photo upload** — drag-and-drop or click-to-select; compresses images client-side and uploads to a Google Drive folder
- **Email notifications** — HTML-formatted email to your inbox on every RSVP and room request (via Google Apps Script)
- **Automated test suite** — 22 Playwright end-to-end tests covering all forms and interactions

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later (only needed for running tests)
- A Google account (for the Sheets/Drive backend)
- A modern browser

---

## Running the site locally

The site has no build step. Open `index.html` directly in your browser, **or** serve it with any static server:

```bash
# Using Node's built-in http-server (no install needed in Node 18+)
npx serve .

# Or Python
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

> The site requires internet access to load CDN resources (Three.js, GSAP, Google Fonts, canvas-confetti).

---

## Google Apps Script backend setup (one-time, ~10 minutes)

This step connects the RSVP, room request, and photo upload forms to Google Sheets and Drive.

### 1. Create a Google Sheet

Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet. Name it anything you like (e.g. "Wedding Responses").

### 2. Create a Google Drive folder for photos

Go to [drive.google.com](https://drive.google.com), create a new folder called "Wedding Photos", open it, and copy the folder ID from the URL:

```
https://drive.google.com/drive/folders/THIS_PART_IS_THE_FOLDER_ID
```

### 3. Open the Apps Script editor

Inside your spreadsheet: **Extensions → Apps Script**

Delete all existing code in the editor, then paste the entire contents of `gas-code.js` from this repo.

### 4. Fill in the constants at the top

```js
const NOTIFICATION_EMAIL = 'your@email.com';       // your email for notifications
const SECRET_TOKEN        = 'WEDDING_2026';         // keep in sync with main.js
const PHOTO_FOLDER_ID     = 'YOUR_DRIVE_FOLDER_ID'; // from step 2
const NOTIFY_ON_PHOTOS    = false;                  // set true to get an email per photo
```

### 5. Deploy as a Web App

1. Click **Deploy → New deployment**
2. Set **Type** to `Web app`
3. Set **Execute as** to `Me`
4. Set **Who has access** to `Anyone`
5. Click **Deploy** and complete the Google permission prompts
6. Copy the **Web App URL** that appears

### 6. Paste the URL into `main.js`

Open `main.js` and update line 10:

```js
gasUrl: 'PASTE_YOUR_WEB_APP_URL_HERE',
```

The three Sheets tabs (**RSVPs**, **Room Requests**, **Photo Uploads**) are created automatically the first time each form is submitted.

---

## Running the tests

The test suite uses [Playwright](https://playwright.dev/) and requires the site to be running on `http://localhost:8080`.

```bash
# Install dependencies (first time only)
npm install

# Start a local server in one terminal
npx serve . --listen 8080

# Run all 22 tests in another terminal
npx playwright test --reporter=list

# Run a single test by name
npx playwright test --grep "guest stepper"
```

---

## Working with Claude Code

[Claude Code](https://claude.ai/code) is an AI coding assistant that understands this entire codebase. It can help you customise content, debug issues, and extend functionality.

### Installation

```bash
npm install -g @anthropic/claude-code
```

### Starting a session

```bash
cd wedding
claude
```

### Useful things to ask Claude Code

**Customise content**
```
Update the couple names, wedding date, venue, and hotel details in main.js CONFIG
```

**Change colours or fonts**
```
Change the primary gold colour to a deeper rose gold across the site
```

**Add a new section**
```
Add an "Our Story" timeline section between the hero and RSVP
```

**Debug a form issue**
```
The RSVP form is not showing the celebration overlay — can you check why?
```

**Run and interpret tests**
```
Run the Playwright tests and explain any failures
```

### Key files

| File | Purpose |
|------|---------|
| `index.html` | All HTML structure and content |
| `style.css` | All styling; theme colours are CSS custom properties on `:root` |
| `main.js` | All JavaScript; starts with `CONFIG` object for easy customisation |
| `gas-code.js` | Google Apps Script backend — paste into the Apps Script editor |
| `tests/wedding.spec.js` | Playwright end-to-end test suite |
| `CLAUDE.md` | Project guidance loaded automatically by Claude Code |

---

## Deploying the website

Because this is a static site, you can host it for free on:

- **GitHub Pages** — push to a `gh-pages` branch or enable Pages in repo settings
- **Netlify** — drag and drop the project folder at [app.netlify.com](https://app.netlify.com)
- **Vercel** — import the GitHub repo at [vercel.com](https://vercel.com)

No build command is needed — just set the publish directory to `/` (root).
