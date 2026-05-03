# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static, single-page South Indian Hindu wedding website (no build step, no package manager). Open `index.html` directly in a browser — all dependencies load from CDN.

## Development

**Running the site:** Open `index.html` in a browser. Requires internet access for CDN resources (Three.js, GSAP, EmailJS, Google Fonts).

**No build, no lint, no tests** — edit HTML/CSS/JS directly and reload the browser.

## Architecture

Three files, three concerns:
- `index.html` — structure and content; placeholder sections are marked with `<!-- PLACEHOLDER -->`
- `style.css` — all styling; theme colors are defined as CSS custom properties on `:root`
- `main.js` — all interactivity; starts with a `CONFIG` object (lines ~9–31) that centralizes EmailJS credentials, venue info, hotel info, and wedding details

### Key systems in `main.js`

- **`initThreeJS()`** — Three.js WebGL canvas rendering falling jasmine/marigold particles in the hero. Pauses when the hero is scrolled off-screen and when the browser tab is hidden (uses `IntersectionObserver` + `visibilitychange`). Respects `prefers-reduced-motion`.
- **`initGSAP()`** — GSAP + ScrollTrigger for section reveal animations on page load and scroll. Also respects `prefers-reduced-motion`.
- **RSVP form** — client-side validation, dynamic guest name fields (stepper controls), and submission via EmailJS. Template variables: `from_name`, `from_email`, `phone`, `attending`, `guest_count`, `guest_names`.
- **Hotel coupon form** — room count stepper, EmailJS submission. Template variables: `requester_name`, `requester_phone`, `room_count`, `hotel_name`.
- **Toast system** — shared success/error notification UI used by both forms.

### EmailJS setup

All four EmailJS values must be filled in `CONFIG` before form submission works:
```js
emailjs: {
  publicKey:        'YOUR_EMAILJS_PUBLIC_KEY',
  serviceId:        'YOUR_EMAILJS_SERVICE_ID',
  rsvpTemplateId:   'YOUR_RSVP_TEMPLATE_ID',
  couponTemplateId: 'YOUR_COUPON_TEMPLATE_ID',
}
```

### Placeholder content

Sections marked `<!-- PLACEHOLDER -->` in `index.html` (and matching values in `CONFIG`) need real data: couple names, parents' names, ceremony dates/times, venue address, hotel details, and photo URLs.
