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

      <!-- ── HEADER ─────────────────────────────────────────── -->
      <tr>
        <td style="background:#1E6FBB;padding:28px 36px 24px;">

          <!-- Logo SVG (AVO blue / Carbon gray / GROUP orange) -->
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <!--[if !mso]><!-->
                <svg width="200" height="42" viewBox="0 0 220 44"
                     xmlns="http://www.w3.org/2000/svg"
                     style="display:block;">
                  <text x="2" y="30"
                        font-family="Arial,sans-serif" font-size="30"
                        font-weight="900" font-style="italic"
                        fill="#FFFFFF" letter-spacing="-1">AVO</text>
                  <text x="72" y="30"
                        font-family="Arial,sans-serif" font-size="30"
                        font-weight="400" font-style="italic"
                        fill="rgba(255,255,255,0.85)">Carbon</text>
                  <line x1="2" y1="35" x2="218" y2="35"
                        stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
                  <text x="131" y="44"
                        font-family="Arial,sans-serif" font-size="11"
                        font-weight="700" fill="#F57C00"
                        letter-spacing="2">GROUP</text>
                </svg>
                <!--<![endif]-->
                <!--[if mso]>
                <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;
                           font-weight:900;color:#FFFFFF;">AVOCarbon GROUP</p>
                <![endif]-->
              </td>
            </tr>
          </table>

          <!-- Divider -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="height:1px;background:rgba(255,255,255,.2);
                            padding-top:18px;font-size:0;">&nbsp;</td></tr>
          </table>

          <!-- Title -->
          <p style="margin:18px 0 4px;font-size:10px;font-weight:700;
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