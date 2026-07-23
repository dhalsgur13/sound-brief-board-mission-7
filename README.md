# Sound Brief Board — Mission 7

미션 6의 프론트엔드 MVP를 실제 서버 API와 영구 저장소에 연결한 제출용 풀스택 프로젝트입니다. 사용자는 사운드 아이디어를 저장하고, 목록을 조회하고, 상태를 변경하고, 삭제할 수 있습니다. 화면의 데이터는 Mock Data가 아니라 API 응답만 사용합니다.

## 제출 링크

- GitHub: https://github.com/dhalsgur13/sound-brief-board-mission-7
- Vercel: 배포 후 추가

## MVP 기능

1. 사운드 brief 전체 조회
2. 새 brief 생성
3. `draft` / `ready` 상태 변경
4. brief 삭제
5. 요청값 검증과 읽기 쉬운 오류 메시지
6. 개발/배포 저장 환경 분리

## 기술 스택

- Next.js 16 + React 19
- Next.js Route Handlers 기반 REST API
- 개발 환경: `data/briefs.json`
- Vercel 환경: Vercel Blob의 immutable JSON records
- Node.js 내장 test runner

Vercel Blob은 각 변경을 새 JSON 파일로 저장합니다. 조회 시 ID별 최신 버전을 선택하며 삭제 시 해당 ID의 모든 버전을 제거합니다. 단일 파일을 덮어쓰지 않아 CDN 캐시와 동시 변경 충돌 가능성을 줄였습니다.

## 데이터 모델

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `id` | UUID string | 서버가 생성하는 고유 ID |
| `title` | string, 2–80자 | 아이디어 이름 |
| `goal` | string, 2–160자 | 제작 목표 |
| `mood` | enum | `Warm`, `Bright`, `Dark`, `Moving` |
| `status` | enum | `draft`, `ready` |
| `createdAt` | ISO 8601 | 생성 시각 |
| `updatedAt` | ISO 8601 | 마지막 변경 시각 |

## REST API

### `GET /api/health`

서버와 현재 storage mode를 확인합니다.

### `GET /api/briefs`

최근 수정 순서로 전체 brief를 반환합니다.

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Warm midnight bass",
      "goal": "Leave space for the vocal.",
      "mood": "Warm",
      "status": "draft",
      "createdAt": "2026-07-23T00:00:00.000Z",
      "updatedAt": "2026-07-23T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/briefs`

```json
{
  "title": "Warm midnight bass",
  "goal": "Leave space for the vocal.",
  "mood": "Warm"
}
```

성공 시 `201 Created`, 잘못된 값은 `400 Bad Request`를 반환합니다.

### `PATCH /api/briefs/:id`

```json
{
  "status": "ready"
}
```

성공 시 변경된 brief, 없는 ID는 `404 Not Found`를 반환합니다.

### `DELETE /api/briefs/:id`

성공 시 `204 No Content`, 없는 ID는 `404 Not Found`를 반환합니다.

오류 응답 형식은 모든 API에서 같습니다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted brief fields.",
    "fields": {
      "title": "Use 2–80 characters."
    }
  }
}
```

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

```bash
npm test
npm run build
```

## 환경 설정

| 변수 | 개발값 | 설명 |
| --- | --- | --- |
| `STORAGE_MODE` | `file` | `file` 또는 `blob` |
| `DATA_FILE` | `data/briefs.json` | 로컬 JSON 경로 |

Vercel에서는 `VERCEL=1`을 감지해 자동으로 Blob mode를 사용합니다. Vercel 프로젝트의 **Storage → Create Database → Blob**에서 store를 연결하면 배포 Function에 OIDC 인증이 자동으로 제공됩니다. 토큰이나 `.env.local`은 GitHub에 commit하지 않습니다.

## 배포

1. 이 폴더를 Public GitHub 저장소에 push합니다.
2. Vercel에서 저장소를 Import합니다.
3. 배포 프로젝트의 Storage 탭에서 Public Blob store를 생성하고 연결합니다.
4. Production deployment를 다시 실행합니다.
5. `/api/health`, 생성, 조회, 상태 변경, 삭제를 확인합니다.

## 범위

이번 제출은 핵심 CRUD와 영구 저장, 검증, 오류 UI, 환경 분리, API 문서화에 집중합니다. JWT 로그인은 심화 선택 항목이므로 포함하지 않았습니다.
