const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const r = await fetch(
      `https://api.github.com/repos/${REPO}/contents/clinics.json`,
      { headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!r.ok) throw new Error('取得失敗');
    const data = await r.json();
    const clinics = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));

    const { id } = req.query;
    if (id) {
      if (!clinics[id]) return res.status(404).json({ error: '治療院が見つかりません' });
      return res.status(200).json({ id, ...clinics[id] });
    }
    return res.status(200).json(clinics);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
