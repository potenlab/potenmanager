# Virtual FS + AI Agent 구현 계획서 v2

> PotenManager 통합 전, **독립 프로젝트로 핵심 엔진을 먼저 구현하고 테스트**한다.

---

## 변경사항 (v1 → v2)

1. **LLM**: Claude API 직접 호출 → **OpenRouter** (Kimi K2, Claude, GPT 등 모델 자유 선택)
2. **ChromaFs 글 분석 반영**: 디렉토리 트리 부트스트래핑, 청크 재조립, grep 최적화, 접근 제어, 읽기 전용 모드 등 실제 구현 패턴 반영

---

## 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| 에이전트 프레임워크 | DeepAgents (npm) | LangGraph 기반 |
| LLM | **OpenRouter** | Kimi K2 기본, 필요시 Claude/GPT 전환 |
| 가상 FS 엔진 | just-bash (npm) | IFileSystem 커스텀 구현 |
| DB | Supabase (PostgreSQL + pgvector) | 정형 + 벡터 |
| 캐시 | 인메모리 (Map) → 추후 Redis | grep 최적화용 |
| 실행 환경 | AWS Lambda (Node.js 20.x) | 15분 타임아웃 |
| 테스트 UI | 간단한 웹 채팅 | React or vanilla |

### OpenRouter 설정

```typescript
// DeepAgents는 LangChain 기반이므로 ChatOpenAI 호환으로 연결
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  modelName: "moonshotai/kimi-k2",    // OpenRouter 모델명
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  // 모델 전환이 필요하면 여기만 바꾸면 됨
  // "anthropic/claude-sonnet-4-20250514"
  // "openai/gpt-4o"
});
```

---

## ChromaFs 글에서 뽑은 핵심 구현 항목

### 반드시 구현 (Core)

| # | 항목 | ChromaFs 원리 | 우리 구현 (SupabaseFs) |
|---|------|--------------|----------------------|
| C1 | **디렉토리 트리 부트스트래핑** | gzip JSON을 Chroma에서 한 번 로드 → Set + Map으로 인메모리 구축. 이후 `ls`, `cd`, `find`는 네트워크 호출 없이 메모리에서 해결 | Supabase에서 프로젝트별 파일 트리를 **한 번 쿼리**해서 인메모리 Map 구축. `ls`, `find`는 로컬 메모리 연산 |
| C2 | **청크 재조립 (cat)** | 여러 chunk를 `chunk_index` 순서로 가져와서 합침 | documents 테이블에서 content 조회. 긴 문서는 chunks 테이블 분리 가능하지만, 초기엔 content 컬럼 하나로 충분 |
| C3 | **grep 최적화** | (1) Chroma로 coarse filter → (2) 매칭된 파일만 캐시 → (3) in-memory regex로 fine filter | (1) PostgreSQL `ILIKE` 또는 `tsvector`로 coarse filter → (2) 결과 캐시 → (3) just-bash에 매칭 파일만 넘겨서 fine filter |
| C4 | **결과 캐싱** | cat 결과를 캐시해서 grep 워크플로우 중 반복 읽기 방지 | 인메모리 Map 캐시 (TTL 30초). 같은 세션 내 반복 읽기 즉시 응답 |
| C5 | **IFileSystem 인터페이스 구현** | just-bash의 pluggable 인터페이스를 Chroma 쿼리로 구현 | 동일하게 just-bash IFileSystem을 Supabase 쿼리로 구현 |
| C6 | **세션 관리 + 히스토리** | (ChromaFs 자체는 stateless) | ai_sessions + ai_messages 테이블로 대화 영속화 |

### 나중에 구현 (Enhanced)

| # | 항목 | 설명 | 우선순위 |
|---|------|------|---------|
| E1 | **접근 제어 (RBAC)** | isPublic/groups 필드로 파일 트리 필터링 | Phase 2 이후 (팀 기능 붙일 때) |
| E2 | **Lazy 파일 포인터** | ls에는 보이지만 cat할 때만 실제 로드 | 대용량 파일 생기면 |
| E3 | **읽기 전용 모드** | 우리는 PM이라 쓰기 필요 → 읽기/쓰기 모두 지원, 권한 체크 추가 | - |
| E4 | **시맨틱 grep (sgrep)** | pgvector 유사도 검색 | Phase 3 이후 |
| E5 | **Redis 캐시** | 인메모리 → Redis로 전환 (Lambda 스케일링 시) | 트래픽 늘면 |

---

## TODO

### Phase 1: Supabase + 프로젝트 세팅 (Day 1~2)

- [ ] **1.1** Supabase 테이블 생성 (projects, documents, todos, events, budget_items, ai_sessions, ai_messages)
- [ ] **1.2** RLS 정책 설정
- [ ] **1.3** RPC 함수 생성 (get_task_summary, get_project_dashboard)
- [ ] **1.4** pgvector 확장 활성화 + FTS 인덱스
- [ ] **1.5** 시드 데이터 스크립트
- [ ] **1.6** 프로젝트 초기화 (`poten-agent/`, package.json, tsconfig)
- [ ] **1.7** OpenRouter 연결 테스트 (Kimi K2로 간단한 질의)

### Phase 2: 가상 파일시스템 (Day 3~6)

- [ ] **2.1** `TreeBuilder` — 프로젝트 트리 부트스트래핑 (C1)
- [ ] **2.2** `SupabaseFs` — IFileSystem 구현 (readdir, stat은 인메모리) (C5)
- [ ] **2.3** `SupabaseFs` — readFile (cat) + 캐싱 (C2, C4)
- [ ] **2.4** `SupabaseFs` — writeFile (쓰기 + 트리 갱신)
- [ ] **2.5** grep 최적화 — coarse filter + bulk prefetch + fine filter (C3)
- [ ] **2.6** just-bash 연동 테스트

### Phase 3: DeepAgents + OpenRouter (Day 7~9)

- [ ] **3.1** DeepAgents에 OpenRouter LLM 연결 (ChatOpenAI 호환)
- [ ] **3.2** 시스템 프롬프트 작성
- [ ] **3.3** 커스텀 도구 연결 (execute_command, create_task, update_task, create_event, search_docs)
- [ ] **3.4** 로컬 터미널 대화형 테스트

### Phase 4: 세션 + 히스토리 (Day 10~11)

- [ ] **4.1** SessionManager 구현 (생성, 목록, 삭제)
- [ ] **4.2** HistoryLoader 구현 (저장, 로드, 컨텍스트 윈도우)
- [ ] **4.3** 에이전트에 히스토리 주입
- [ ] **4.4** 세션 전환 테스트

### Phase 5: Lambda 배포 + 테스트 UI (Day 12~14)

- [ ] **5.1** Lambda 배포 (Node.js 20.x, 타임아웃 15분)
- [ ] **5.2** API Gateway 설정 (POST /chat, GET/POST /sessions, GET /sessions/{id}/messages)
- [ ] **5.3** Lambda Response Streaming
- [ ] **5.4** 테스트 웹 UI (채팅 + 세션 사이드바)
- [ ] **5.5** 통합 테스트 (세션 유지, DB 반영, 동시 세션)

---

## 프로젝트 구조

```
poten-agent/
├── src/
│   ├── virtual-fs/
│   │   ├── supabase-fs.ts        ← IFileSystem 구현 (핵심)
│   │   ├── tree-builder.ts       ← 디렉토리 트리 부트스트래핑
│   │   ├── grep-optimizer.ts     ← grep coarse/fine filter
│   │   ├── cache-layer.ts        ← 인메모리 캐시 (TTL)
│   │   └── path-parser.ts        ← 경로 파싱 유틸
│   ├── agent/
│   │   ├── create-agent.ts       ← DeepAgents + OpenRouter 설정
│   │   ├── tools.ts              ← 커스텀 도구
│   │   └── system-prompt.ts      ← 시스템 프롬프트
│   ├── session/
│   │   ├── session-manager.ts    ← 세션 CRUD
│   │   └── history-loader.ts     ← 대화 히스토리 + 요약
│   ├── config/
│   │   └── openrouter.ts         ← OpenRouter LLM 설정
│   └── handler.ts                ← Lambda 진입점
├── scripts/
│   ├── seed.ts                   ← 테스트 데이터
│   └── test-local.ts             ← 로컬 REPL 테스트
├── test-ui/                      ← 간단한 채팅 UI
│   ├── index.html
│   └── app.js
├── supabase/
│   └── migrations/
│       ├── 001_tables.sql
│       ├── 002_rls.sql
│       └── 003_rpc_functions.sql
├── package.json
├── tsconfig.json
└── serverless.yml                ← Lambda 배포
```

---

## 체크포인트별 검증 기준

| Phase | 완료 기준 |
|-------|----------|
| 1 | Supabase에 테이블 + 시드 데이터 확인. OpenRouter로 Kimi K2 응답 받기 성공 |
| 2 | `test-local.ts`에서 `ls`, `cat`, `grep` 정상 동작. grep이 전수 스캔 아닌 coarse→fine 필터 확인 |
| 3 | 터미널에서 "마감 임박한 태스크 알려줘" → 에이전트가 자동으로 ls/cat 실행 후 답변 |
| 4 | 세션 A에서 대화 → 세션 B 전환 → 세션 A 복귀 시 이전 맥락 기억 |
| 5 | 웹 UI에서 채팅 + 세션 전환 + 에이전트가 만든 태스크가 Supabase에 실제 반영 |
