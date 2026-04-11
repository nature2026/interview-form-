const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const FILE_PATH = 'clinics.json';
const BRANCH = 'main';

async function getFile() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) throw new Error('ファイル取得失敗');
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { clinics: JSON.parse(content), sha: data.sha };
}

async function saveFile(clinics, sha) {
  const content = Buffer.from(JSON.stringify(clinics, null, 2)).toString('base64');
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update clinics.json',
        content,
        sha,
        branch: BRANCH,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || '保存失敗');
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers['authorization'];
  if (auth !== 'Bearer ' + process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '認証エラー' });
  }

  try {
    const { clinics, sha } = await getFile();

    if (req.method === 'GET') {
      return res.status(200).json(clinics);
    }

    if (req.method === 'POST') {
      const { id, name, email, address, tel } = req.body;
      if (!id || !name || !email) return res.status(400).json({ error: 'id・name・emailは必須です' });
      if (clinics[id]) return res.status(400).json({ error: 'そのIDは既に使われています' });
      clinics[id] = { name, email, address: address || '', tel: tel || '' };
      await saveFile(clinics, sha);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const { id, name, email, address, tel } = req.body;
      if (!id || !clinics[id]) return res.status(404).json({ error: '治療院が見つかりません' });
      clinics[id] = { name, email, address: address || '', tel: tel || '' };
      await saveFile(clinics, sha);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id || !clinics[id]) return res.status(404).json({ error: '治療院が見つかりません' });
      delete clinics[id];
      await saveFile(clinics, sha);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
