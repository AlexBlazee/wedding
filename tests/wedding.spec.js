const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE = 'http://localhost:8080';

/* ============================================================
   HELPERS
   ============================================================ */

// Create a tiny test PNG in memory (1×1 red pixel) for upload tests
function createTestImageFile(dir) {
  const pngBytes = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e0000000c4944415408d76360f8cfc00000000200019e221bc60000000049454e44ae426082',
    'hex'
  );
  const filepath = path.join(dir, 'test-photo.png');
  fs.writeFileSync(filepath, pngBytes);
  return filepath;
}

/* ============================================================
   1. BASICS
   ============================================================ */
test.describe('Page basics', () => {

  test('loads with correct title', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Meenakshi.*Arjun/i);
  });

  test('nav contains all four links', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('nav a[href="#rsvp"]')).toBeVisible();
    await expect(page.locator('nav a[href="#venue"]')).toBeVisible();
    await expect(page.locator('nav a[href="#accommodation"]')).toBeVisible();
    await expect(page.locator('nav a[href="#memories"]')).toBeVisible();
  });

  test('celebration overlay is invisible and non-blocking on load', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const overlay = page.locator('#celebration-overlay');
    await expect(overlay).not.toHaveClass(/is-visible/);
    const pe = await overlay.evaluate(el => getComputedStyle(el).pointerEvents);
    expect(pe).toBe('none');
  });

});

/* ============================================================
   2. RSVP FORM → Google Sheets
   ============================================================ */
test.describe('RSVP form', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('#rsvp').scrollIntoViewIfNeeded();
  });

  test('all RSVP fields are clickable and accept input', async ({ page }) => {
    await page.locator('#rsvp-name').fill('Priya Sharma');
    await page.locator('#rsvp-email').fill('priya@example.com');
    await page.locator('#rsvp-phone').fill('+91 98765 43210');
    await expect(page.locator('#rsvp-name')).toHaveValue('Priya Sharma');
    await expect(page.locator('#rsvp-email')).toHaveValue('priya@example.com');
    await expect(page.locator('#rsvp-phone')).toHaveValue('+91 98765 43210');
  });

  test('elementFromPoint at name field is the INPUT itself', async ({ page }) => {
    const box = await page.locator('#rsvp-name').boundingBox();
    const tag = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x + 10, y + 10);
      return el?.tagName;
    }, { x: box.x, y: box.y });
    expect(tag).toBe('INPUT');
  });

  test('"Joyfully Accept" shows guest stepper, "Decline" hides it', async ({ page }) => {
    await page.locator('.attendance-btn--yes').click();
    await expect(page.locator('#guest-count-field')).toBeVisible();
    await page.locator('.attendance-btn--no').click();
    await expect(page.locator('#guest-count-field')).toBeHidden();
  });

  test('guest stepper adds fields that stay visible and accept text', async ({ page }) => {
    await page.locator('.attendance-btn--yes').click();
    await page.locator('#guest-plus').click();
    await page.locator('#guest-plus').click();
    await expect(page.locator('#guest-count-display')).toHaveText('2');
    await expect(page.locator('#guest-name-1')).toBeVisible();
    await expect(page.locator('#guest-name-2')).toBeVisible();
    await page.locator('#guest-name-1').fill('Rahul');
    await page.locator('#guest-name-2').fill('Anita');
    await expect(page.locator('#guest-name-1')).toHaveValue('Rahul');
    await expect(page.locator('#guest-name-2')).toHaveValue('Anita');
  });

  test('guest stepper minus removes the last field', async ({ page }) => {
    await page.locator('.attendance-btn--yes').click();
    await page.locator('#guest-plus').click();
    await page.locator('#guest-plus').click();
    await page.locator('#guest-minus').click();
    await expect(page.locator('#guest-count-display')).toHaveText('1');
    await expect(page.locator('#guest-name-1')).toBeVisible();
    await expect(page.locator('#guest-name-2')).toBeHidden();
  });

  test('submit with empty form shows all three validation errors', async ({ page }) => {
    await page.locator('#rsvp-submit').click();
    await expect(page.locator('#rsvp-name-error')).not.toBeEmpty();
    await expect(page.locator('#rsvp-email-error')).not.toBeEmpty();
    await expect(page.locator('#rsvp-attending-error')).not.toBeEmpty();
  });

  test('submit with invalid email shows email error', async ({ page }) => {
    await page.locator('#rsvp-name').fill('Test');
    await page.locator('#rsvp-email').fill('not-an-email');
    await page.locator('.attendance-btn--yes').click();
    await page.locator('#rsvp-submit').click();
    await expect(page.locator('#rsvp-email-error')).not.toBeEmpty();
  });

  test('payload fields are correctly populated before submit', async ({ page }) => {
    await page.locator('#rsvp-name').fill('Kavya Reddy');
    await page.locator('#rsvp-email').fill('kavya@test.com');
    await page.locator('#rsvp-phone').fill('9876543210');
    await page.locator('.attendance-btn--yes').click();
    await page.locator('#guest-plus').click();
    await page.locator('#guest-name-1').fill('Vikram');

    // Intercept the fetch to confirm payload shape
    const payloads = [];
    await page.route('**', route => {
      if (route.request().method() === 'POST') {
        try { payloads.push(JSON.parse(route.request().postData())); } catch {}
      }
      route.continue();
    });

    await page.locator('#rsvp-submit').click();
    await page.waitForTimeout(600);

    expect(payloads.length).toBeGreaterThan(0);
    const p = payloads[0];
    expect(p.type).toBe('rsvp');
    expect(p.name).toBe('Kavya Reddy');
    expect(p.email).toBe('kavya@test.com');
    expect(p.guestCount).toBe('1');
    expect(p.guestNames).toContain('Vikram');
    expect(p.token).toBeDefined();
  });

});

/* ============================================================
   3. ROOM REQUEST FORM → Google Sheets
   ============================================================ */
test.describe('Room request form', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('#accommodation').scrollIntoViewIfNeeded();
  });

  test('room request fields are interactive', async ({ page }) => {
    await page.locator('#coupon-name').fill('Anand Kumar');
    await page.locator('#coupon-phone').fill('+91 77777 88888');
    await expect(page.locator('#coupon-name')).toHaveValue('Anand Kumar');
    await expect(page.locator('#coupon-phone')).toHaveValue('+91 77777 88888');
  });

  test('room stepper increments and decrements correctly', async ({ page }) => {
    await expect(page.locator('#room-count-display')).toHaveText('1');
    await expect(page.locator('#room-minus')).toBeDisabled();
    await page.locator('#room-plus').click();
    await page.locator('#room-plus').click();
    await expect(page.locator('#room-count-display')).toHaveText('3');
    await expect(page.locator('#room-minus')).toBeEnabled();
    await page.locator('#room-minus').click();
    await expect(page.locator('#room-count-display')).toHaveText('2');
  });

  test('submit with empty fields shows validation errors', async ({ page }) => {
    await page.locator('#coupon-submit').click();
    await expect(page.locator('#coupon-name-error')).not.toBeEmpty();
    await expect(page.locator('#coupon-phone-error')).not.toBeEmpty();
  });

  test('room payload has correct shape', async ({ page }) => {
    await page.locator('#coupon-name').fill('Deepa Nair');
    await page.locator('#coupon-phone').fill('9000011111');
    await page.locator('#room-plus').click();

    const payloads = [];
    await page.route('**', route => {
      if (route.request().method() === 'POST') {
        try { payloads.push(JSON.parse(route.request().postData())); } catch {}
      }
      route.continue();
    });

    await page.locator('#coupon-submit').click();
    await page.waitForTimeout(600);

    expect(payloads.length).toBeGreaterThan(0);
    const p = payloads[0];
    expect(p.type).toBe('room');
    expect(p.name).toBe('Deepa Nair');
    expect(p.phone).toBe('9000011111');
    expect(p.rooms).toBe('2');
    expect(p.hotel).toBeTruthy();
    expect(p.token).toBeDefined();
  });

});

/* ============================================================
   4. PHOTO UPLOAD → Google Drive
   ============================================================ */
test.describe('Photo upload — Share Your Memories', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('#memories').scrollIntoViewIfNeeded();
  });

  test('memories section renders with all key elements', async ({ page }) => {
    await expect(page.locator('#memories h2')).toBeVisible();
    await expect(page.locator('#upload-dropzone')).toBeVisible();
    await expect(page.locator('#uploader-name')).toBeVisible();
    await expect(page.locator('#upload-btn')).toBeHidden();
  });

  test('uploader name field is interactive', async ({ page }) => {
    await page.locator('#uploader-name').fill('Sanjay & Meena');
    await expect(page.locator('#uploader-name')).toHaveValue('Sanjay & Meena');
  });

  test('selecting an image file shows thumbnail and upload button', async ({ page }) => {
    const tmpDir = require('os').tmpdir();
    const imgPath = createTestImageFile(tmpDir);

    await page.locator('#photo-input').setInputFiles(imgPath);
    await page.waitForTimeout(300);

    // At least one thumbnail in the preview grid
    await expect(page.locator('.upload-item')).toHaveCount(1);
    // Upload button should now be visible
    const btn = page.locator('#upload-btn');
    const display = await btn.evaluate(el => el.style.display);
    expect(display).not.toBe('none');

    fs.unlinkSync(imgPath);
  });

  test('selecting multiple images shows multiple thumbnails', async ({ page }) => {
    const tmpDir = require('os').tmpdir();
    const file1 = path.join(tmpDir, 'upload-a.png');
    const file2 = path.join(tmpDir, 'upload-b.png');
    createTestImageFile(tmpDir); // creates test-photo.png
    const src = path.join(tmpDir, 'test-photo.png');
    fs.copyFileSync(src, file1);
    fs.copyFileSync(src, file2);

    await page.locator('#photo-input').setInputFiles([file1, file2]);
    await page.waitForTimeout(400);

    await expect(page.locator('.upload-item')).toHaveCount(2);

    [src, file1, file2].forEach(f => { try { fs.unlinkSync(f); } catch {} });
  });

  test('remove button clears a thumbnail and hides upload button when empty', async ({ page }) => {
    const tmpDir = require('os').tmpdir();
    const imgPath = createTestImageFile(tmpDir);

    await page.locator('#photo-input').setInputFiles(imgPath);
    await page.waitForTimeout(300);
    await expect(page.locator('.upload-item')).toHaveCount(1);

    await page.locator('.upload-item__remove').first().click();
    await page.waitForTimeout(200);
    await expect(page.locator('.upload-item')).toHaveCount(0);
    const display = await page.locator('#upload-btn').evaluate(el => el.style.display);
    expect(display).toBe('none');

    fs.unlinkSync(imgPath);
  });

  test('upload button sends photo payload with correct fields', async ({ page }) => {
    const tmpDir = require('os').tmpdir();
    const imgPath = createTestImageFile(tmpDir);

    // Mock fetch at JS level before upload — no-cors requests aren't readable via route interception
    await page.addInitScript(() => {
      window.__photoPayloads = [];
      const origFetch = window.fetch;
      window.fetch = (url, opts = {}) => {
        if (opts.method === 'POST') {
          try { window.__photoPayloads.push(JSON.parse(opts.body)); } catch {}
        }
        // Resolve immediately (no real network needed for this test)
        return Promise.resolve(new Response('', { status: 200 }));
      };
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#memories').scrollIntoViewIfNeeded();
    await page.locator('#uploader-name').fill('Lakshmi Devi');
    await page.locator('#photo-input').setInputFiles(imgPath);
    await page.waitForTimeout(400);

    await page.locator('#upload-btn').click();
    await page.waitForTimeout(2500); // wait for canvas compression + mock fetch

    const payloads = await page.evaluate(() => window.__photoPayloads);
    expect(payloads.length).toBeGreaterThan(0);
    const p = payloads[0];
    expect(p.type).toBe('photo');
    expect(p.uploaderName).toBe('Lakshmi Devi');
    expect(p.filename).toContain('Lakshmi_Devi');
    expect(p.base64).toBeTruthy();
    expect(p.mimeType).toMatch(/image\//);
    expect(p.token).toBeDefined();

    fs.unlinkSync(imgPath);
  });

  test('dropzone highlights on drag-over', async ({ page }) => {
    const dropzone = page.locator('#upload-dropzone');
    // Dispatch drag events via evaluate to avoid DataTransfer constructor issues
    await page.evaluate(() => {
      document.getElementById('upload-dropzone')
        .dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
    });
    await expect(dropzone).toHaveClass(/is-dragging/);
    await page.evaluate(() => {
      document.getElementById('upload-dropzone')
        .dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
    });
    await expect(dropzone).not.toHaveClass(/is-dragging/);
  });

});
