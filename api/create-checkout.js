const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'お名前とメールアドレスは必須です' });
  }

  const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            unit_amount: 16500,
            product_data: {
              name: '1時間オンラインコンサルティング',
              description: 'Zoomにて1時間のコンサルティング。決済後にタイムレックスの日程調整URLをお送りします。',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email,
      metadata: { name, email },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/consultation`,
      locale: 'ja',
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
};
