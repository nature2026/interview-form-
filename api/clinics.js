const fs = require('fs');
const path = require('path');

const CLINICS_PATH = path.join(process.cwd(), 'clinics.json');

function readClinics() {
  try {
    return JSON.parse(fs.readFileSync(CLINICS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeClinics(data) {
  fs.writeFileSync(CLINICS_PATH, JSON.stringify(data, null, 2));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 簡易認証
  const auth = req.headers['authorization'];
  if (auth !== 'Bearer ' + process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '認証エラー' });
  }

  const clinics = readClinics();

  if (req.method === 'GET') {
    return res.status(200).json(clinics);
  }

  if (req.method === 'POST') {
    const { id, name, email, address, tel } = req.body;
    if (!id || !name || !email) {
      return res.status(400).json({ error: 'id・name・emailは必須です' });
    }
    if (clinics[id]) {
      return res.status(400).json({ error: 'そのIDは既に使われています' });
    }
    clinics[id] = { name, email, address: address || '', tel: tel || '' };
    writeClinics(clinics);
    return res.status(200).json({ ok: true, clinic: clinics[id] });
  }

  if (req.method === 'PUT') {
    const { id, name, email, address, tel } = req.body;
    if (!id || !clinics[id]) {
      return res.status(404).json({ error: '治療院が見つかりません' });
    }
    clinics[id] = { name, email, address: address || '', tel: tel || '' };
    writeClinics(clinics);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id || !clinics[id]) {
      return res.status(404).json({ error: '治療院が見つかりません' });
    }
    delete clinics[id];
    writeClinics(clinics);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
