require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const sites = require('./sites.json');

const app = express();
const PORT = process.env.PORT || 3000;
const validatorEmail = process.env.MAIL_TO;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 25,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

transporter.verify((err) => {
  if (err) console.error('SMTP error:', err.message);
  else console.log('SMTP connection OK');
});

app.get('/api/sites', (req, res) => {
  res.json(sites);
});

app.post('/api/send', async (req, res) => {
  const { siteId, message = '' } = req.body;

  if (!validatorEmail) {
    return res.status(500).json({ error: 'Validator not configured. Add MAIL_TO to the .env file.' });
  }

  if (!siteId) {
    return res.status(400).json({ error: 'Missing site.' });
  }

  const site = sites.find((item) => item.id === siteId);

  if (!site) {
    return res.status(404).json({ error: 'Site not found.' });
  }

  const now = new Date().toLocaleDateString('en-US', { dateStyle: 'full' });
  const safeMessage = escapeHtml(message.trim());
  const safeSiteLabel = escapeHtml(site.label);
  const safeSheetName = escapeHtml(site.sheetName);
  const safeFileUrl = escapeHtml(site.fileUrl);

  const messageBlock = safeMessage ? `
    <tr>
      <td style="padding:0 32px 20px;">
        <table cellpadding="0" cellspacing="0" width="100%"
               style="border-left:3px solid #6366f1;background:#f5f3ff;border-radius:0 8px 8px 0;padding:14px 16px;">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:11px;color:#7c3aed;text-transform:uppercase;letter-spacing:.5px;font-weight:600;">Message</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${safeMessage}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;max-width:100%;">
      <tr>
        <td style="background:#4338ca;padding:28px 32px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#c7d2fe;text-transform:uppercase;letter-spacing:1px;">Avocarbon - Validation System</p>
          <p style="margin:10px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Document Awaiting Validation</p>
          <p style="margin:8px 0 0;font-size:13px;color:#c7d2fe;">${now}</p>
        </td>
      </tr>

      <tr>
        <td style="padding:28px 32px 20px;">
          <p style="margin:0 0 6px;font-size:15px;color:#111827;">Dear Mr. Roberto,</p>
          <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
            The report for site <strong style="color:#111827;">${safeSiteLabel}</strong>
            is ready and awaiting your validation.
          </p>
        </td>
      </tr>

      ${messageBlock}

      <tr>
        <td style="padding:0 32px 24px;">
          <table cellpadding="0" cellspacing="0" width="100%"
                 style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Site</p>
                <p style="margin:5px 0 0;font-size:14px;color:#111827;font-weight:600;">${safeSiteLabel}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 18px;">
                <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Excel Sheet</p>
                <p style="margin:5px 0 0;font-size:14px;color:#111827;font-weight:600;">${safeSheetName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:0 32px 32px;" align="center">
          <a href="${safeFileUrl}"
             style="display:inline-block;padding:14px 36px;background:#4338ca;color:#ffffff;
                    text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;
                    letter-spacing:.3px;">
            Open the ${safeSiteLabel} sheet
          </a>
          <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
            Click to open the matching sheet directly in SharePoint.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            This email was generated automatically by the Avocarbon system. Please do not reply directly.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: validatorEmail,
      subject: `[Validation Required] ${site.label} - sheet ${site.sheetName}`,
      html,
    });

    console.log(`Email sent to ${validatorEmail} - ${site.label} (sheet: ${site.sheetName})`);
    res.json({
      success: true,
      to: validatorEmail,
      siteId: site.id,
      sheetName: site.sheetName,
      fileUrl: site.fileUrl,
    });
  } catch (err) {
    console.error('Send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\nServer: http://localhost:${PORT}`);
  console.log(`   SMTP : ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`   From : ${process.env.MAIL_FROM}`);
  console.log(`   To   : ${validatorEmail || 'MAIL_TO not configured'}\n`);
});
