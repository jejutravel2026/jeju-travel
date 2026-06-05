module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = process.env.GITHUB_OWNER || 'jejutravel2026';
  const REPO  = process.env.GITHUB_REPO  || 'jeju-travel';
  const FILE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/posts.json`;
  const HEADERS  = {
    'Authorization': `token ${TOKEN}`,
    'User-Agent': 'RiraGuide',
    'Accept': 'application/vnd.github.v3+json',
  };

  async function getPosts() {
    const r = await fetch(FILE_URL, { headers: HEADERS });
    if (r.status === 404) return { posts: [], sha: null };
    if (!r.ok) throw new Error('파일 읽기 실패: ' + r.status);
    const data = await r.json();
    const clean = (data.content || '').replace(/\n/g, '');
    const posts = JSON.parse(Buffer.from(clean, 'base64').toString('utf8'));
    return { posts: Array.isArray(posts) ? posts : [], sha: data.sha };
  }

  async function savePosts(posts, sha) {
    const json = JSON.stringify(posts, null, 2);
    const b64 = Buffer.from(json, 'utf8').toString('base64');
    const body = { message: 'Update posts', content: b64 };
    if (sha) body.sha = sha;
    const r = await fetch(FILE_URL, {
      method: 'PUT',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      const msg = errData.message
        || (errData.errors && errData.errors[0] && errData.errors[0].message)
        || ('저장 실패: ' + r.status);
      throw new Error(msg);
    }
  }

  if (req.method === 'GET') {
    try {
      const { posts } = await getPosts();
      const pub = posts.map(({ _ip, _ua, ...p }) => p);
      return res.status(200).json(pub);
    } catch (e) {
      return res.status(200).json([]);
    }
  }

  if (req.method === 'POST') {
    if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN이 설정되지 않았어요' });
    const { nickname, content, adminPassword } = req.body || {};
    if (!nickname?.trim() || !content?.trim())
      return res.status(400).json({ error: '닉네임과 내용을 입력해주세요' });
    if (content.length > 300)
      return res.status(400).json({ error: '내용은 300자 이내로 입력해주세요' });

    const isAdmin = adminPassword === process.env.ADMIN_PASSWORD;
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
            || req.socket?.remoteAddress || 'unknown';
    const ua = (req.headers['user-agent'] || '').slice(0, 120);

    try {
      const { posts, sha } = await getPosts();
      const newPost = {
        id: `p${Date.now()}`,
        nickname: nickname.trim().slice(0, 20),
        content: content.trim().slice(0, 300),
        createdAt: new Date().toISOString(),
        ...(isAdmin && { isAdmin: true }),
        _ip: ip,
        _ua: ua,
      };
      const updated = [newPost, ...posts].slice(0, 200);
      await savePosts(updated, sha);
      const { _ip, _ua, ...publicPost } = newPost;
      return res.status(200).json({ success: true, post: publicPost });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN이 설정되지 않았어요' });
    const { id, password } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD)
      return res.status(401).json({ error: '비밀번호가 맞지 않아요' });
    try {
      const { posts, sha } = await getPosts();
      const updated = posts.filter(p => p.id !== id);
      await savePosts(updated, sha);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
