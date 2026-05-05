/**
 * WEDDING WEBSITE — Google Apps Script Backend
 * =============================================
 *
 * SETUP (one-time, ~10 minutes):
 *  1. Open your spreadsheet in Google Sheets
 *  2. Click  Extensions → Apps Script
 *  3. Delete all existing code in the editor
 *  4. Paste this entire file
 *  5. Fill in the four constants below (NOTIFICATION_EMAIL, SECRET_TOKEN, PHOTO_FOLDER_ID)
 *
 *  Getting PHOTO_FOLDER_ID:
 *    a. Go to drive.google.com and create a new folder called "Wedding Photos"
 *    b. Open the folder — copy the long ID from the URL:
 *       https://drive.google.com/drive/folders/THIS_PART_IS_THE_ID
 *    c. Paste it as PHOTO_FOLDER_ID below
 *
 *  6. Click "Deploy" → "New deployment"
 *       Type:            Web app
 *       Execute as:      Me
 *       Who has access:  Anyone
 *  7. Click "Deploy", then authorise the permission prompts
 *     (Allow: Spreadsheets, Gmail, Drive — all required)
 *  8. Copy the Web App URL that appears
 *  9. Paste that URL into CONFIG.gasUrl in main.js
 *
 * RE-DEPLOYING after any code changes:
 *  Deploy → Manage deployments → pencil (Edit) icon → Version: New version → Deploy
 */

const NOTIFICATION_EMAIL = 'meghawedspradeeponjune27@gmail.com';   // notification email
const SECRET_TOKEN        = 'WEDDING_2026';            // ← keep in sync with CONFIG.gasToken in main.js
const PHOTO_FOLDER_ID     = '1zHii2aumQzUr1q7VnWYSE7Hyn66j0ras';   // ← Google Drive folder ID for guest photos
const NOTIFY_ON_PHOTOS    = true;                     // ← set true to get an email for every photo upload

/* ============================================================
   ENTRY POINTS
   ============================================================ */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.token !== SECRET_TOKEN) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'rsvp') {
      const sheet = getOrCreateSheet(ss, 'RSVPs', [
        'Timestamp (IST)', 'Name', 'Email', 'Phone', 'Attending', 'Additional Guests', 'Guest Names',
      ]);

      const newRow = [
        timestamp(),
        data.name,
        data.email || '',
        data.phone || 'Not provided',
        data.attending,
        data.guestCount,
        data.guestNames || 'None',
      ];

      // If email provided, update existing row instead of appending
      let isUpdate = false;
      if (data.email) {
        const values = sheet.getDataRange().getValues();
        for (let i = 1; i < values.length; i++) {
          if (String(values[i][2]).toLowerCase() === data.email.toLowerCase()) {
            sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
            isUpdate = true;
            break;
          }
        }
      }
      if (!isUpdate) sheet.appendRow(newRow);

      MailApp.sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: `${isUpdate ? 'Updated' : 'New'} RSVP: ${data.name} — ${data.attending}`,
        htmlBody: rsvpEmailHtml(data, isUpdate),
      });

      if (data.email) {
        MailApp.sendEmail({
          to: data.email,
          subject: isUpdate ? `RSVP Updated — Megha & Pradeep's Wedding` : `Your RSVP — Megha & Pradeep's Wedding`,
          htmlBody: guestConfirmationEmailHtml(data, isUpdate),
        });
      }

    } else if (data.type === 'room') {
      const sheet = getOrCreateSheet(ss, 'Room Requests', [
        'Timestamp (IST)', 'Name', 'Phone', 'Rooms Requested', 'Hotel',
      ]);
      sheet.appendRow([
        timestamp(),
        data.name,
        data.phone,
        data.rooms,
        data.hotel,
      ]);
      MailApp.sendEmail({ to: NOTIFICATION_EMAIL, subject: `Room Request: ${data.name} — ${data.rooms} room(s)`, htmlBody: roomEmailHtml(data) });

    } else if (data.type === 'photo') {
      const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
      const bytes  = Utilities.base64Decode(data.base64);
      const blob   = Utilities.newBlob(bytes, data.mimeType || 'image/jpeg', data.filename);
      const file   = folder.createFile(blob);
      file.setDescription(`Uploaded by: ${data.uploaderName || 'Guest'} on ${timestamp()}`);

      const photoSheet = getOrCreateSheet(ss, 'Photo Uploads', [
        'Timestamp (IST)', 'Uploader Name', 'Filename', 'Drive Link',
      ]);
      photoSheet.appendRow([timestamp(), data.uploaderName || 'Guest', data.filename, file.getUrl()]);

      if (NOTIFY_ON_PHOTOS) {
        MailApp.sendEmail({
          to: NOTIFICATION_EMAIL,
          subject: `📸 New photo from ${data.uploaderName || 'a guest'}`,
          htmlBody: photoEmailHtml(data, file.getUrl()),
        });
      }
    }

    return jsonResponse({ success: true });

  } catch (err) {
    Logger.log('Error: ' + err.message);
    return jsonResponse({ success: false, error: err.message });
  }
}

function doGet() {
  return ContentService.createTextOutput('Wedding backend is running.');
}

/* ============================================================
   HELPERS
   ============================================================ */

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight('bold')
         .setBackground('#D4AF37')
         .setFontColor('#ffffff')
         .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 170);
  }
  return sheet;
}

function timestamp() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   EMAIL TEMPLATES
   ============================================================ */

function rsvpEmailHtml(d, isUpdate) {
  const isYes  = d.attending.toLowerCase().includes('yes');
  const color  = isYes ? '#287F54' : '#C22544';
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e0d0b0;border-radius:4px;overflow:hidden;">
      <div style="background:#1A0A10;padding:24px;text-align:center;">
        <h1 style="color:#D4AF37;font-size:22px;margin:0;">Megha &amp; Pradeep</h1>
        <p style="color:#FFF9C4;font-size:13px;margin:6px 0 0;">${isUpdate ? 'RSVP Updated' : 'New RSVP Received'}</p>
      </div>
      <div style="padding:24px;">
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr><td style="padding:9px 12px;font-weight:bold;width:160px;border-bottom:1px solid #f0e0cc;">Name</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.name}</td></tr>
          <tr style="background:#fdf6ec;"><td style="padding:9px 12px;font-weight:bold;border-bottom:1px solid #f0e0cc;">Email</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.email}</td></tr>
          <tr><td style="padding:9px 12px;font-weight:bold;border-bottom:1px solid #f0e0cc;">Phone</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.phone || 'Not provided'}</td></tr>
          <tr style="background:#fdf6ec;"><td style="padding:9px 12px;font-weight:bold;border-bottom:1px solid #f0e0cc;">Attending</td><td style="padding:9px 12px;font-weight:bold;color:${color};border-bottom:1px solid #f0e0cc;">${d.attending}</td></tr>
          <tr><td style="padding:9px 12px;font-weight:bold;border-bottom:1px solid #f0e0cc;">Additional Guests</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.guestCount}</td></tr>
          <tr style="background:#fdf6ec;"><td style="padding:9px 12px;font-weight:bold;">Guest Names</td><td style="padding:9px 12px;">${d.guestNames || 'None'}</td></tr>
        </table>
      </div>
      <div style="padding:12px 24px;background:#fdf6ec;text-align:center;">
        <p style="color:#888;font-size:12px;margin:0;">Received: ${timestamp()}</p>
      </div>
    </div>`;
}

function photoEmailHtml(d, driveUrl) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e0d0b0;border-radius:4px;overflow:hidden;">
      <div style="background:#1A0A10;padding:24px;text-align:center;">
        <h1 style="color:#D4AF37;font-size:22px;margin:0;">Megha &amp; Pradeep</h1>
        <p style="color:#FFF9C4;font-size:13px;margin:6px 0 0;">New Photo Upload</p>
      </div>
      <div style="padding:24px;">
        <p style="font-size:14px;">A guest just shared a photo from your celebration!</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:12px;">
          <tr><td style="padding:9px 12px;font-weight:bold;width:140px;">From</td><td style="padding:9px 12px;">${d.uploaderName || 'Guest'}</td></tr>
          <tr style="background:#fdf6ec;"><td style="padding:9px 12px;font-weight:bold;">Filename</td><td style="padding:9px 12px;">${d.filename}</td></tr>
          <tr><td style="padding:9px 12px;font-weight:bold;">View in Drive</td><td style="padding:9px 12px;"><a href="${driveUrl}" style="color:#C22544;">Open photo</a></td></tr>
        </table>
      </div>
      <div style="padding:12px 24px;background:#fdf6ec;text-align:center;">
        <p style="color:#888;font-size:12px;margin:0;">Received: ${timestamp()}</p>
      </div>
    </div>`;
}

function guestConfirmationEmailHtml(d, isUpdate) {
  const isYes  = d.attending && d.attending.toLowerCase().includes('yes');
  const color  = isYes ? '#287F54' : '#C22544';
  const message = isUpdate
    ? (isYes
        ? `Your RSVP has been successfully updated — we're so glad you're still joining us!`
        : `Your RSVP has been updated. We're sorry you won't be able to make it — our warmest blessings are with you!`)
    : (isYes
        ? `We are absolutely thrilled that you'll be joining us! Your presence will make our celebration even more special.`
        : `We understand you won't be able to make it, and we'll truly miss having you on our special day.`);
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e0d0b0;border-radius:4px;overflow:hidden;">
      <div style="background:#1A0A10;padding:28px 24px;text-align:center;">
        <h1 style="color:#D4AF37;font-size:24px;margin:0;letter-spacing:1px;">Megha &amp; Pradeep</h1>
        <p style="color:#FFF9C4;font-size:13px;margin:8px 0 0;">June 27, 2026 &nbsp;·&nbsp; Frisco, TX</p>
      </div>
      <div style="padding:24px;">
        <p style="font-size:16px;font-weight:bold;color:#1A0A10;margin:0 0 6px;">Dear ${d.name},</p>
        <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">${message}</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr><td style="padding:9px 12px;font-weight:bold;width:160px;border-bottom:1px solid #f0e0cc;">Attending</td><td style="padding:9px 12px;font-weight:bold;color:${color};border-bottom:1px solid #f0e0cc;">${d.attending}</td></tr>
          ${isYes ? `<tr style="background:#fdf6ec;"><td style="padding:9px 12px;font-weight:bold;border-bottom:1px solid #f0e0cc;">Guests</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.guestCount} person(s)</td></tr>` : ''}
          ${isYes && d.guestNames && d.guestNames !== 'None' ? `<tr><td style="padding:9px 12px;font-weight:bold;border-bottom:1px solid #f0e0cc;">Guest Names</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.guestNames}</td></tr>` : ''}
        </table>
        ${isYes ? `<div style="margin-top:20px;padding:14px 16px;background:#fdf6ec;border-left:4px solid #D4AF37;border-radius:2px;font-size:13px;color:#555;line-height:1.5;"><strong>Venue:</strong> Grandion Event Venue<br/>1810 Parkwood Blvd, Frisco, TX 75034<br/><strong>Date:</strong> June 27, 2026 &nbsp;·&nbsp; <strong>Time:</strong> 9:00 AM</div>` : ''}
      </div>
      <div style="padding:16px 24px;background:#1A0A10;text-align:center;">
        <p style="color:#D4AF37;font-size:13px;margin:0;">With love &amp; blessings,</p>
        <p style="color:#FFF9C4;font-size:14px;font-weight:bold;margin:4px 0 0;">Megha &amp; Pradeep's Families</p>
      </div>
    </div>`;
}

function roomEmailHtml(d) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e0d0b0;border-radius:4px;overflow:hidden;">
      <div style="background:#1A0A10;padding:24px;text-align:center;">
        <h1 style="color:#D4AF37;font-size:22px;margin:0;">Megha &amp; Pradeep</h1>
        <p style="color:#FFF9C4;font-size:13px;margin:6px 0 0;">Room Block Request</p>
      </div>
      <div style="padding:24px;">
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr><td style="padding:9px 12px;font-weight:bold;width:160px;border-bottom:1px solid #f0e0cc;">Name</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.name}</td></tr>
          <tr style="background:#fdf6ec;"><td style="padding:9px 12px;font-weight:bold;border-bottom:1px solid #f0e0cc;">Phone</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.phone}</td></tr>
          <tr><td style="padding:9px 12px;font-weight:bold;border-bottom:1px solid #f0e0cc;">Rooms Requested</td><td style="padding:9px 12px;border-bottom:1px solid #f0e0cc;">${d.rooms}</td></tr>
          <tr style="background:#fdf6ec;"><td style="padding:9px 12px;font-weight:bold;">Hotel</td><td style="padding:9px 12px;">${d.hotel}</td></tr>
        </table>
      </div>
      <div style="padding:12px 24px;background:#fdf6ec;text-align:center;">
        <p style="color:#888;font-size:12px;margin:0;">Received: ${timestamp()}</p>
      </div>
    </div>`;
}
