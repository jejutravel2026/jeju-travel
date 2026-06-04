module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, places } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 맞지 않아요' });
  }

  const TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = process.env.GITHUB_OWNER || 'jejutravel2026';
  const REPO  = process.env.GITHUB_REPO  || 'jeju-travel';

  if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN이 설정되지 않았어요' });

  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/index.html`,
      { headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'RiraGuide' } }
    );
    if (!getRes.ok) throw new Error('GitHub 파일 조회 실패: ' + getRes.status);
    const fileData = await getRes.json();

    const currentHTML = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const newData     = JSON.stringify(places || [], null, 2);
    const updatedHTML = currentHTML.replace(
      /\/\/ __PLACES_DATA_START__[\s\S]*?\/\/ __PLACES_DATA_END__/,
      `// __PLACES_DATA_START__\nconst SEED_PLACES = ${newData};\n// __PLACES_DATA_END__`
    );

    if (updatedHTML === currentHTML) throw new Error('SEED_PLACES 마커를 찾을 수 없어요');

    const putRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/index.html`,
      {
        method: 'PUT',
        headers: {
          Authorization:  `token ${TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent':   'RiraGuide',
        },
        body: JSON.stringify({
          message: `[RiraGuide] 장소 업데이트 ${new Date().toLocaleString('ko-KR')}`,
          content: Buffer.from(updatedHTML).toString('base64'),
          sha:     fileData.sha,
        }),
      }
    );
    if (!putRes.ok) {
      const e = await putRes.json();
      throw new Error('GitHub 업데이트 실패: ' + (e.message || putRes.status));
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[admin] error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
