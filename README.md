# 2026 BOEING DAY - Reforge AI Frontend

## 기술 스택

| 구분         | 사용 기술                      |
| ------------ | ------------------------------ |
| Framework    | React 19, TypeScript 6, Vite 8 |
| Routing      | React Router                   |
| Server state | TanStack Query                 |
| Styling      | Tailwind CSS 4                 |
| HTTP         | Axios                          |
| Chart        | Recharts                       |
| PDF          | react-to-print                 |
| Quality      | ESLint                         |

## 시작하기

```bash
npm install
npm run dev
```

- 프론트: `http://localhost:5173`
- 백엔드: `http://localhost:8000` (FastAPI 서버가 먼저 실행되어 있어야 합니다)
- `/api`로 시작하는 요청은 Vite 프록시를 통해 백엔드로 전달됩니다.

## 스크립트

| 명령어            | 설명           |
| ----------------- | -------------- |
| `npm run dev`     | 개발 서버 실행 |
| `npm run build`   | 프로덕션 빌드  |
| `npm run preview` | 빌드 결과 확인 |
| `npm run lint`    | ESLint 검사    |

## 폴더 구조

```text
src/
├─ api/ # Axios 인스턴스, API 함수
├─ hooks/ # TanStack Query 훅
├─ types/ # API 응답 타입
├─ pages/ # 화면 단위 컴포넌트
│ ├─ ScanPage.tsx # 스캔 화면
│ ├─ AnalysisPage.tsx # 분석 진행 화면
│ ├─ ScenarioPage.tsx # 시나리오 화면
│ └─ ProposalPage.tsx # 제안서 화면
├─ components/ # 공통 UI 컴포넌트
├─ router.tsx
└─ main.tsx
```


## 라우팅

| 경로                       | 화면           |
| -------------------------- | -------------- |
| `/`                        | 스캔 화면      |
| `/scans/:scanId/analysis`  | 분석 진행 화면 |
| `/scans/:scanId/scenarios` | 시나리오 화면  |
| `/proposals/:proposalId`   | 제안서 화면    |

## 브랜치 전략

| 브랜치 | 용도                  |
| ------ | --------------------- |
| `main` | 배포 및 시연용        |
| `dev`  | 개발 통합             |
