const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, printHtml } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: '必須パラメータが不足しています' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: to,
      subject: subject,
      html: html,
      attachments: printHtml ? [
        {
          filename: '問診票_印刷用.html',
          content: Buffer.from(printHtml).toString('base64'),
        }
      ] : [],
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({ error: error.message });
  }
};
