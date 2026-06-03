# 제주트래블 배포 가이드
카카오톡·인스타그램에서 링크로 공유할 수 있는 웹앱으로 배포하는 방법입니다.
**소요 시간: 약 10~15분 / 비용: 무료**

---

## 사전 준비 (5분)

### 1. 필요한 계정 만들기
아래 두 가지 계정이 필요해요. 모두 무료입니다.

- **GitHub** → https://github.com (코드 저장소)
- **Vercel** → https://vercel.com (무료 호스팅, GitHub 계정으로 가입 가능)

### 2. Anthropic API 키 발급
- https://console.anthropic.com 접속
- 회원가입 후 → "API Keys" → "Create Key"
- 생성된 키(sk-ant-...)를 메모장에 복사해두세요

---

## 배포 방법 (10분)

### Step 1. GitHub에 파일 올리기
1. GitHub 로그인 후 우측 상단 `+` → `New repository`
2. Repository name: `jeju-travel` 입력
3. `Create repository` 클릭
4. 화면에서 `uploading an existing file` 클릭
5. 이 폴더 안의 파일들을 모두 드래그앤드롭
   - `index.html`
   - `api/schedule.js`
   - `vercel.json`
6. `Commit changes` 클릭

### Step 2. Vercel에 연결하기
1. https://vercel.com 접속 → `Add New Project`
2. `Import Git Repository` → 방금 만든 `jeju-travel` 선택
3. `Import` 클릭
4. **⚠️ 배포 전 필수: 환경변수 설정**
   - `Environment Variables` 섹션 찾기
   - Name: `ANTHROPIC_API_KEY`
   - Value: 위에서 복사한 API 키 붙여넣기 (sk-ant-...)
   - `Add` 클릭
5. `Deploy` 클릭

### Step 3. 완료!
- 배포가 완료되면 `jeju-travel.vercel.app` 같은 URL이 생겨요
- 이 URL을 카카오톡, 인스타그램에 공유하면 돼요!

---

## 카카오톡 공유 미리보기 설정 (선택)

카카오톡에서 링크 공유 시 예쁜 미리보기가 뜨게 하려면:

1. https://developers.kakao.com 접속
2. `내 애플리케이션` → `애플리케이션 추가하기`
3. `플랫폼` → `Web` → 사이트 도메인 입력
4. `index.html`의 `shareKakao()` 함수에 Kakao SDK 연동

---

## 나중에 수정할 때

파일을 수정해서 GitHub에 올리면 Vercel이 자동으로 재배포해요.
별도 작업 없이 URL은 그대로 유지됩니다.

---

## 비용 안내

| 서비스     | 무료 한도                    | 초과 시          |
|-----------|----------------------------|-----------------|
| Vercel    | 월 100GB 트래픽              | 월 $20~          |
| Claude API | 없음 (사용량만큼 과금)        | 일정 1회 = 약 $0.003 |

**예상 비용 계산 예시**
- 월 1,000명 사용, 1인당 2회 생성 = 2,000회
- Claude API 비용: 2,000 × $0.003 = 약 $6 (약 8,000원)
- Vercel: 무료 (트래픽 100GB 이내)

---

## 문제 해결

**일정이 생성되지 않아요**
→ Vercel 대시보드 → `Functions` → `Logs` 에서 오류 확인
→ ANTHROPIC_API_KEY가 정확히 설정됐는지 확인

**카카오톡 공유 시 미리보기가 안 나와요**
→ 배포 후 시간이 좀 걸릴 수 있어요 (최대 24시간)
→ index.html의 og:image URL을 실제 이미지 URL로 교체 필요

---

준비가 됐으면 언제든지 추가 도움 요청하세요!
