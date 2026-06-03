// api/schedule.js
// Claude AI 일정 생성 API (Vercel Serverless Function)
// ANTHROPIC_API_KEY 환경변수가 Vercel 대시보드에 설정되어 있어야 합니다.

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { dir, theme, trans, startTime, endTime } = req.body;
  if (!dir || !theme || !trans) return res.status(400).json({ error: '필수 파라미터 누락' });

  const isBus = trans === '뚜벅이';
  const eastSide = dir === '제주 동쪽';

  const prompt = `당신은 제주도에서 오래 거주한 현지인 여행 전문가입니다.
아래 조건에 맞는 하루 여행 일정을 작성해주세요.

[여행 조건]
- 지역: ${dir}
- 여행 테마: ${theme}
- 이동수단: ${trans} (${isBus ? '버스/도보 접근 가능한 장소만 포함' : '렌트카로 제주 전역 이동 가능'})
- 출발 시간: ${startTime}
- 종료 시간: ${endTime}

[일정 구성 규칙]
1. 아침식사(~09:30), 점심식사(12:00~13:30), 저녁식사(18:00~) 각 1회씩만
2. 카페는 오후 13:30~17:00에 딱 1회만 (절대 연속 배치 금지)
3. 식사와 관광지, 카페가 자연스럽게 번갈아 배치되도록
4. 이동 시간을 현실적으로 반영 (렌트카 장소 간 평균 10~30분, 뚜벅이 20~50분)
5. 테마(${theme})에 맞는 장소를 우선 배치
${eastSide ? '6. 제주 동쪽 코스이므로 오후 카페는 반드시 "카페치즈태비" (제주시 구좌읍 행원리 위치, 조용하고 바다뷰 있는 현지인 감성 카페)로 포함할 것' : ''}
${isBus ? `6. 뚜벅이이므로 버스 정류장 근처 장소만 포함 (우도, 한라산 어리목, 새별오름, 카멜리아힐, 사려니숲길 제외)` : ''}

[각 장소 설명 요건]
- desc에 현지인만 아는 실용적인 꿀팁 포함 (1~2문장)
- 추천 이유나 특별한 점 한 가지씩 언급

반드시 JSON 배열만 반환하고 다른 텍스트나 마크다운은 절대 포함하지 마세요:
[
  {
    "name": "장소 이름",
    "desc": "장소 설명 + 현지인 꿀팁",
    "type": "meal 또는 cafe 또는 sight",
    "start": "09:00",
    "end": "10:30",
    "stay": 90,
    "move": 20
  }
]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API 오류');
    }

    const data = await response.json();
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // JSON 파싱 (마크다운 코드블록 제거 후)
    const clean = text.replace(/```json|```/gi, '').trim();
    const schedule = JSON.parse(clean);

    return res.status(200).json({ schedule });

  } catch (e) {
    console.error('Claude API 오류:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
