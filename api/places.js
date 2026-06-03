// api/places.js
// 네이버 검색 API로 실제 장소 검색

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, display = 5 } = req.query;
  if (!query) return res.status(400).json({ error: '검색어를 입력해주세요' });

  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query + ' 제주')}&display=${display}&sort=comment`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        }
      }
    );

    if (!response.ok) throw new Error('네이버 API 오류');
    const data = await response.json();

    // 필요한 정보만 정리해서 반환
    const places = data.items.map((item, i) => ({
      rank: i + 1,
      name: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      category: item.category,
      address: item.roadAddress || item.address,
      tel: item.telephone,
      link: item.link,
      mapx: item.mapx,
      mapy: item.mapy,
      naverMapUrl: `https://map.naver.com/p/search/${encodeURIComponent(item.title.replace(/<[^>]*>/g, ''))}`
    }));

    return res.status(200).json({ places, total: data.total });

  } catch (e) {
    console.error('Places API 오류:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
