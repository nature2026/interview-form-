const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const CLINICS_PATH = path.join(process.cwd(), 'clinics.json');
  let clinics = {};
  try {
    clinics = JSON.parse(fs.readFileSync(CLINICS_PATH, 'utf8'));
  } catch {
    return res.status(500).json({ error: 'データ読み込みエラー' });
  }

  const { id } = req.query;
  if (id) {
    if (!clinics[id]) return res.status(404).json({ error: '治療院が見つかりません' });
    // メールアドレスは返さない（セキュリティ）
    const { email, ...publicInfo } = clinics[id];
    return res.status(200).json({ id, ...publicInfo });
  }

  // 全件（メールなし）
  const publicClinics = Object.entries(clinics).reduce((acc, [k, v]) => {
    const { email, ...rest } = v;
    acc[k] = rest;
    return acc;
  }, {});
  return res.status(200).json(publicClinics);
};
