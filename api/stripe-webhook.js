const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

// Vercel: disable body parsing so we can verify the raw Stripe signature
export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email || session.metadata?.email;
    const name = session.metadata?.name || 'お客様';

    if (email) {
      await sendTimerexEmail(name, email);
    }
  }

  return res.status(200).json({ received: true });
};

async function sendTimerexEmail(name, email) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const timerexUrl = process.env.TIMEREX_URL || 'https://timerex.net/';

  const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Hiragino Sans','Noto Sans JP',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:40px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;max-width:560px;width:100%">
      <tr><td style="background:#1D9E75;padding:28px 32px;text-align:center">
        <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:.03em">お申し込みありがとうございます</div>
        <div style="color:rgba(255,255,255,.8);font-size:13px;margin-top:6px">1時間オンラインコンサルティング</div>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="font-size:15px;margin-bottom:20px">${name} 様</p>
        <p style="font-size:15px;line-height:1.8;margin-bottom:24px">
          この度はコンサルティングをお申し込みいただき、<br>
          誠にありがとうございます。<br>
          お支払いが確認できましたので、<br>
          日程調整URLをお送りします。
        </p>

        <div style="background:#f9f9f7;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center">
          <div style="font-size:13px;color:#888;margin-bottom:10px">📅 ご都合の良い日時をお選びください</div>
          <a href="${timerexUrl}" style="display:inline-block;background:#1D9E75;color:#fff;font-size:16px;font-weight:700;padding:14px 32px;border-radius:9px;text-decoration:none;letter-spacing:.03em">
            日程を予約する（タイムレックス）
          </a>
          <div style="font-size:11px;color:#aaa;margin-top:10px">${timerexUrl}</div>
        </div>

        <div style="border-left:3px solid #1D9E75;padding:12px 16px;background:#E1F5EE;border-radius:0 8px 8px 0;margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;color:#0F6E56;margin-bottom:6px">コンサルティング当日について</div>
          <ul style="font-size:13px;color:#333;line-height:1.9;padding-left:18px;margin:0">
            <li>ZoomのURLは予約確定後にお送りします</li>
            <li>開始5分前にはZoomをご準備ください</li>
            <li>ご質問はお気軽にお申し付けください</li>
          </ul>
        </div>

        <p style="font-size:13px;color:#888;line-height:1.8">
          ご不明な点がございましたら、このメールにご返信ください。<br>
          どうぞよろしくお願いいたします。
        </p>
      </td></tr>
      <tr><td style="background:#f5f5f3;padding:16px 32px;text-align:center">
        <div style="font-size:11px;color:#aaa;line-height:1.8">
          このメールはお申し込み完了の自動送信です
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: '【コンサルご予約】日程調整URLをお送りします',
      html,
    });
    console.log('Timerex email sent to:', email);
  } catch (err) {
    console.error('Failed to send Timerex email:', err);
  }
}
