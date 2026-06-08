module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = process.env.GITHUB_OWNER || 'jejutravel2026';
  const REPO  = process.env.GITHUB_REPO  || 'jeju-travel';
  const FILE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/posts.json`;
  const HEADERS = {
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
    const b64 = Buffer.from(JSON.stringify(posts, null, 2), 'utf8').toString('base64');
    const body = { message: 'Update posts', content: b64 };
    if (sha) body.sha = sha;
    const r = await fetch(FILE_URL, {
      method: 'PUT',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.message || '저장 실패: ' + r.status);
    }
  }

  /* GET */
  if (req.method === 'GET') {
    try {
      const { posts } = await getPosts();
      const pub = posts.map(({ _ip, _ua, replies, ...p }) => ({
        ...p,
        replies: (replies || []).map(({ _ip, _ua, ...r }) => r),
      }));
      return res.status(200).json(pub);
    } catch (e) {
      return res.status(200).json([]);
    }
  }

  /* POST - 게시글 or 답글 */
  if (req.method === 'POST') {
    if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN이 설정되지 않았어요' });
    const { nickname, content, adminPassword, replyTo } = req.body || {};
    if (!nickname || !nickname.trim() || !content || !content.trim())
      return res.status(400).json({ error: '닉네임과 내용을 입력해주세요' });
    if (content.length > 300)
      return res.status(400).json({ error: '내용은 300자 이내로 입력해주세요' });

    const isAdmin = adminPassword === process.env.ADMIN_PASSWORD;
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const ua = (req.headers['user-agent'] || '').slice(0, 120);

    try {
      const { posts, sha } = await getPosts();

      /* 답글인 경우 */
      if (replyTo) {
        const idx = posts.findIndex(function(p){ return p.id === replyTo; });
        if (idx === -1) return res.status(404).json({ error: '게시글을 찾을 수 없어요' });
        var reply = {
          id: 'r' + Date.now(),
          nickname: nickname.trim().slice(0, 20),
          content: content.trim().slice(0, 300),
          createdAt: new Date().toISOString(),
          _ip: ip,
          _ua: ua,
        };
        if (isAdmin) reply.isAdmin = true;
        if (!posts[idx].replies) posts[idx].replies = [];
        posts[idx].replies.push(reply);
        await savePosts(posts, sha);
        var pubReply = { id: reply.id, nickname: reply.nickname, content: reply.content, createdAt: reply.createdAt };
        if (reply.isAdmin) pubReply.isAdmin = true;
        return res.status(200).json({ success: true, reply: pubReply });
      }

      /* 새 게시글 */
      var newPost = {
        id: 'p' + Date.now(),
        nickname: nickname.trim().slice(0, 20),
        content: content.trim().slice(0, 300),
        createdAt: new Date().toISOString(),
        replies: [],
        _ip: ip,
        _ua: ua,
      };
      if (isAdmin) newPost.isAdmin = true;
      var updated = [newPost].concat(posts).slice(0, 200);
      await savePosts(updated, sha);
      var pubPost = { id: newPost.id, nickname: newPost.nickname, content: newPost.content, createdAt: newPost.createdAt, replies: [] };
      if (newPost.isAdmin) pubPost.isAdmin = true;
      return res.status(200).json({ success: true, post: pubPost });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* DELETE - 게시글 or 답글 */
  if (req.method === 'DELETE') {
    if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN이 설정되지 않았어요' });
    const { id, replyId, password } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD)
      return res.status(401).json({ error: '비밀번호가 맞지 않아요' });
    try {
      const { posts, sha } = await getPosts();
      if (replyId) {
        const idx = posts.findIndex(function(p){ return p.id === id; });
        if (idx !== -1 && posts[idx].replies)
          posts[idx].replies = posts[idx].replies.filter(function(r){ return r.id !== replyId; });
      } else {
        var filtered = posts.filter(function(p){ return p.id !== id; });
        await savePosts(filtered, sha);
        return res.status(200).json({ success: true });
      }
      await savePosts(posts, sha);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
