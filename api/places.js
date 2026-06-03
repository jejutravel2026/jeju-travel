module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, display = 15 } = req.query;
  if (!query) return res.status(400).json({ error: '검색어 없음' });

  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=comment`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        }
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error('네이버 API 오류: ' + err);
    }

    const data = await response.json();

    const places = data.items.map((item, i) => ({
      rank: i + 1,
      name: item.title.replace(/<[^>]*>/g, ''),
      category: item.category,
      address: item.roadAddress || item.address,
      tel: item.telephone,
      naverMapUrl: `https://map.naver.com/p/search/${encodeURIComponent(item.title.replace(/<[^>]*>/g, ''))}`
    }));

    return res.status(200).json({ places, total: data.total });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
