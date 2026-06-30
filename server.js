require('dotenv').config({ path: __dirname + '/.env' });

const express    = require('express');
const nodemailer = require('nodemailer');
const path       = require('path');
const sites      = require('./sites.json');

const app            = express();
const PORT           = process.env.PORT || 3000;
const validatorEmail = process.env.MAIL_TO;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

/* ── helpers ──────────────────────────────────────────────── */
function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

function formatTime() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ── SMTP ─────────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT, 10) || 25,
  secure: process.env.SMTP_SECURE === 'true',
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls:    { rejectUnauthorized: false },
});

transporter.verify((err) => {
  if (err) console.error('SMTP error:', err.message);
  else     console.log('SMTP connection OK');
});

/* ── routes ───────────────────────────────────────────────── */
app.get('/api/sites', (_req, res) => res.json(sites));

app.post('/api/send', async (req, res) => {
  const { siteId, message = '' } = req.body;

  if (!validatorEmail)
    return res.status(500).json({ error: 'Validator not configured. Add MAIL_TO to .env.' });
  if (!siteId)
    return res.status(400).json({ error: 'Missing site.' });

  const site = sites.find((s) => s.id === siteId);
  if (!site)
    return res.status(404).json({ error: 'Site not found.' });

  /* ── escaped values ──────────────────────────────────────── */
  const safeLabel     = escapeHtml(site.label);
  const safeSheet     = escapeHtml(site.sheetName);
  const safeUrl       = escapeHtml(site.fileUrl);
  const safeMessage   = escapeHtml(message.trim());
  const dateStr       = formatDate();
  const timeStr       = formatTime();

  /* ── optional message block ──────────────────────────────── */
  const messageBlock = safeMessage ? `
      <!-- Message block -->
      <tr>
        <td style="padding:0 32px 24px;">
          <table cellpadding="0" cellspacing="0" width="100%"
                 style="border-left:4px solid #F57C00;background:#FFF8F0;border-radius:0 6px 6px 0;padding:0;">
            <tr>
              <td style="padding:14px 18px;">
                <p style="margin:0 0 5px;font-size:10px;font-weight:700;color:#E65100;
                           text-transform:uppercase;letter-spacing:1px;">Additional note</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">${safeMessage}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>` : '';

  /* ════════════════════════════════════════════════════════════
     EMAIL HTML — AVOCarbon identity
     Blue  : #1E6FBB  |  Orange : #F57C00  |  Gray : #4A4A4A
  ════════════════════════════════════════════════════════════ */
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Validation Request – AVOCarbon</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#F0F4F8;padding:40px 16px;">
  <tr><td align="center">

    <!-- ╔══════════════════════════════════════════════════╗
         ║  OUTER WRAPPER  max-width 600px                 ║
         ╚══════════════════════════════════════════════════╝ -->
    <table width="600" cellpadding="0" cellspacing="0"
           style="max-width:100%;border-radius:10px;overflow:hidden;
                  border:1px solid #D1DCE8;background:#ffffff;
                  box-shadow:0 4px 24px rgba(0,0,0,.08);">

      <!-- ── TOP ACCENT BAR (blue → orange) ────────────────── -->
      <tr>
        <td style="height:5px;background:linear-gradient(90deg,#1E6FBB 0%,#2D7FC9 60%,#F57C00 100%);
                   font-size:0;line-height:0;">&nbsp;</td>
      </tr>

      <!-- ── LOGO BAND (white background, matches official logo) ──── -->
      <tr>
        <td style="background:#FFFFFF;padding:24px 36px;border-bottom:1px solid #E2E8F0;">
          <img src="data:image/png;base64,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"
               alt="AVOCarbon Group"
               width="190"
               style="display:block;border:0;outline:none;
                      max-width:190px;height:auto;">
        </td>
      </tr>

      <!-- ── HEADER (blue title band) ──────────────────────────── -->
      <tr>
        <td style="background:#1E6FBB;padding:24px 36px;">

          <!-- Title -->
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;
                     color:rgba(255,255,255,.65);text-transform:uppercase;
                     letter-spacing:1.5px;">Validation System — Internal Portal</p>
          <p style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;
                     line-height:1.25;letter-spacing:-.3px;">
            Document Awaiting Validation
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,.7);">
            ${dateStr} &nbsp;·&nbsp; ${timeStr}
          </p>
        </td>
      </tr>

      <!-- ── GREETING ───────────────────────────────────────── -->
      <tr>
        <td style="padding:28px 36px 20px;">
          <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#1A1A2E;">
            Dear Mr. Roberto,
          </p>
          <p style="margin:0;font-size:14px;color:#4A4A4A;line-height:1.7;">
            A document has been submitted for your review and validation through
            the <strong style="color:#1E6FBB;">AVOCarbon Internal Validation System</strong>.
            Please find the details below and use the button at the end of this
            email to access the file directly on SharePoint.
          </p>
        </td>
      </tr>

      <!-- ── INFO TABLE ──────────────────────────────────────── -->
      <tr>
        <td style="padding:0 36px 24px;">
          <table cellpadding="0" cellspacing="0" width="100%"
                 style="border:1px solid #D1DCE8;border-radius:8px;overflow:hidden;">

            <!-- Row: Site -->
            <tr>
              <td width="36" style="background:#EBF4FC;padding:16px 14px;
                                     border-right:1px solid #D1DCE8;vertical-align:top;">
                <!-- Location pin icon -->
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="#1E6FBB" stroke-width="2.2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </td>
              <td style="padding:12px 16px;background:#F7FAFD;
                          border-bottom:1px solid #D1DCE8;">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;
                           color:#1E6FBB;text-transform:uppercase;letter-spacing:.8px;">Site</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#1A1A2E;">
                  ${safeLabel}
                </p>
              </td>
            </tr>

            <!-- Row: Sheet -->
            <tr>
              <td width="36" style="background:#EBF4FC;padding:16px 14px;
                                     border-right:1px solid #D1DCE8;vertical-align:top;">
                <!-- File icon -->
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="#1E6FBB" stroke-width="2.2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </td>
              <td style="padding:12px 16px;background:#F7FAFD;
                          border-bottom:1px solid #D1DCE8;">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;
                           color:#1E6FBB;text-transform:uppercase;letter-spacing:.8px;">Excel Sheet</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#1A1A2E;">
                  ${safeSheet}
                </p>
              </td>
            </tr>

            <!-- Row: Submitted by -->
            <tr>
              <td width="36" style="background:#EBF4FC;padding:16px 14px;
                                     border-right:1px solid #D1DCE8;vertical-align:top;">
                <!-- User icon -->
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="#1E6FBB" stroke-width="2.2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </td>
              <td style="padding:12px 16px;background:#F7FAFD;">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;
                           color:#1E6FBB;text-transform:uppercase;letter-spacing:.8px;">Submitted via</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#1A1A2E;">
                  AVOCarbon Intranet — Validation System
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- ── OPTIONAL MESSAGE ────────────────────────────────── -->
      ${messageBlock}

      <!-- ── CTA BUTTON ──────────────────────────────────────── -->
      <tr>
        <td style="padding:0 36px 32px;" align="center">

          <!-- Orange top bar on button section -->
          <table cellpadding="0" cellspacing="0" width="100%"
                 style="background:#FFF8F0;border:1px solid #FFD199;
                         border-radius:8px;overflow:hidden;margin-bottom:20px;">
            <tr>
              <td style="height:3px;background:#F57C00;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:20px 24px;" align="center">
                <p style="margin:0 0 16px;font-size:13px;color:#4A4A4A;line-height:1.6;">
                  Click the button below to open the Excel sheet directly on SharePoint
                  and proceed with your validation.
                </p>
                <a href="${safeUrl}"
                   style="display:inline-block;padding:14px 40px;
                           background:#1E6FBB;color:#FFFFFF;
                           text-decoration:none;border-radius:6px;
                           font-size:15px;font-weight:700;letter-spacing:.2px;
                           box-shadow:0 3px 10px rgba(30,111,187,.35);">
                  Open ${safeLabel} Sheet →
                </a>
                <p style="margin:12px 0 0;font-size:11px;color:#94A3B8;">
                  Or copy this link:
                  <a href="${safeUrl}"
                     style="color:#1E6FBB;word-break:break-all;">${safeUrl}</a>
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- ── FOOTER ──────────────────────────────────────────── -->
      <tr>
        <td style="padding:16px 36px 20px;border-top:1px solid #E2E8F0;
                    background:#F7FAFD;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.7;">
                  This message was generated automatically by the
                  <strong style="color:#4A4A4A;">AVOCarbon Internal Validation System</strong>.
                  Please do not reply directly to this email.<br>
                  For any issues, contact your system administrator.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── BOTTOM ACCENT BAR ──────────────────────────────── -->
      <tr>
        <td style="height:4px;background:linear-gradient(90deg,#F57C00 0%,#1E6FBB 100%);
                    font-size:0;line-height:0;">&nbsp;</td>
      </tr>

    </table>
    <!-- /outer wrapper -->

    <!-- below-card note -->
    <p style="margin:20px 0 0;font-size:11px;color:#94A3B8;text-align:center;
               letter-spacing:.3px;">
      &copy; AVOCarbon Group &nbsp;·&nbsp; Internal Portal &nbsp;·&nbsp; Confidential
    </p>

  </td></tr>
</table>
</body>
</html>`;

  /* ── send ──────────────────────────────────────────────── */
  try {
    await transporter.sendMail({
      from:    process.env.MAIL_FROM,
      to:      validatorEmail,
      subject: `[Validation Required] ${site.label} — ${site.sheetName}`,
      html,
    });

    console.log(`✅ Email sent → ${validatorEmail} | ${site.label} (${site.sheetName})`);
    res.json({
      success:   true,
      to:        validatorEmail,
      siteId:    site.id,
      sheetName: site.sheetName,
      fileUrl:   site.fileUrl,
    });
  } catch (err) {
    console.error('❌ Send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`   SMTP : ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`   From : ${process.env.MAIL_FROM}`);
  console.log(`   To   : ${validatorEmail || '⚠  MAIL_TO not configured'}\n`);
});