const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSION_TO = process.env.SUBMISSION_EMAIL || 'rsandlin@doe.in.gov';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/submit', async (req, res) => {
  const { orgName, contactName, contactEmail, summary, htmlSnapshot } = req.body;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('SMTP credentials not configured');
    return res.status(503).json({ error: 'Email service not configured on server' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const safeOrg = (orgName || 'Application').replace(/[^a-z0-9]/gi, '_');
  const filename = safeOrg + '_MBE_Pilot_Application.html';
  const attachment = { filename, content: htmlSnapshot, contentType: 'text/html' };

  try {
    await transporter.sendMail({
      from: `"Indiana MBE Pilot Program" <${process.env.SMTP_USER}>`,
      to: SUBMISSION_TO,
      replyTo: contactEmail || process.env.SMTP_USER,
      subject: `MBE Pilot Application — ${orgName || 'New Submission'}`,
      text: summary,
      attachments: [attachment],
    });

    if (contactEmail) {
      await transporter.sendMail({
        from: `"Indiana MBE Pilot Program" <${process.env.SMTP_USER}>`,
        to: contactEmail,
        subject: 'MBE Pilot Application — Submission Received',
        text: [
          `Dear ${contactName || 'Applicant'},`,
          '',
          `Your Indiana MBE Pilot Program application for ${orgName} has been successfully submitted to IDOE.`,
          '',
          'A complete copy of your application is attached for your records.',
          '',
          'Thank you,',
          'IDOE Office of Innovation',
        ].join('\n'),
        attachments: [attachment],
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Email send error:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
