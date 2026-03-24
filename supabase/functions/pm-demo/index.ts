import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

app.use("/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

// ─── Demo Seed Data by Industry ─────────────────────────────────

interface DemoConfig {
  orgName: string;
  orgSlug: string;
  industry: string;
  tasks: Array<{ title: string; status: string; priority: string; category?: string; description?: string }>;
  projects: Array<{ name: string; status: string; category?: string; clientName?: string }>;
  library: Array<{ title: string; type: string; url?: string; category?: string }>;
  meetings: Array<{ title: string; type: string; status: string; duration: number }>;
  radar: Array<{ title: string; category: string; stage: string; value: number; probability: number; contactName?: string; contactCompany?: string }>;
  clients: Array<{ name: string; company: string; stage: string; value: number; contactName?: string; contactEmail?: string; contactPhone?: string; notes?: string }>;
  estimates: Array<{ title: string; status: string; clientIndex: number; items: Array<{ name: string; qty: number; unitPrice: number }>; discountRate: number; notes?: string }>;
}

function getDemoData(industry: string): DemoConfig {
  switch (industry) {
    case "freelancer":
      return {
        orgName: "내 워크스페이스",
        orgSlug: `demo-free-${Date.now()}`,
        industry: "freelancer",
        tasks: [
          { title: "포트폴리오 사이트 리뉴얼", status: "in-progress", priority: "high", category: "development" },
          { title: "클라이언트 A - 로고 디자인 시안", status: "pending", priority: "high", category: "design" },
          { title: "견적서 작성 - 웹앱 개발", status: "pending", priority: "medium", category: "planning" },
          { title: "Next.js 15 학습", status: "in-progress", priority: "low", category: "learning" },
          { title: "세금 신고 준비", status: "pending", priority: "high", category: "operations" },
          { title: "블로그 글 작성 - React 팁", status: "pending", priority: "low", category: "content_writing" },
          { title: "클라이언트 B - 랜딩페이지 완료", status: "completed", priority: "high", category: "development" },
          { title: "이력서/CV 업데이트", status: "pending", priority: "medium", category: "planning" },
        ],
        projects: [
          { name: "포트폴리오 사이트", status: "active", category: "personal" },
          { name: "클라이언트 A - 브랜딩", status: "active", clientName: "스타트업X" },
          { name: "클라이언트 B - 랜딩페이지", status: "completed", clientName: "커머스Y" },
        ],
        library: [
          { title: "프리랜서 계약서 템플릿", type: "note", category: "operations" },
          { title: "Tailwind CSS 치트시트", type: "url", url: "https://tailwindcss.com/docs", category: "development" },
          { title: "포트폴리오 레퍼런스 모음", type: "note", category: "design" },
        ],
        meetings: [],
        radar: [],
        clients: [
          { name: "포트폴리오 웹사이트 제작", company: "스타트업X", stage: "proposal", value: 3000000, contactName: "김대표", contactEmail: "kim@startupx.com", contactPhone: "010-1234-5678", notes: "반응형 웹 포트폴리오, 3페이지 구성" },
        ],
        estimates: [
          { title: "포트폴리오 웹사이트 견적", status: "sent", clientIndex: 0, items: [{ name: "디자인", qty: 1, unitPrice: 1000000 }, { name: "퍼블리싱/개발", qty: 1, unitPrice: 1500000 }, { name: "서버 세팅", qty: 1, unitPrice: 500000 }], discountRate: 0 },
        ],
      };

    case "dev_agency":
      return {
        orgName: "데모 개발 에이전시",
        orgSlug: `demo-dev-${Date.now()}`,
        industry: "dev_agency",
        tasks: [
          { title: "클라이언트 A - API 설계", status: "in-progress", priority: "high", category: "development" },
          { title: "클라이언트 A - DB 스키마 리뷰", status: "pending", priority: "high", category: "development" },
          { title: "클라이언트 B - 와이어프레임 수정", status: "in-progress", priority: "medium", category: "design" },
          { title: "클라이언트 C - QA 테스트", status: "pending", priority: "high", category: "development" },
          { title: "신규 프로젝트 견적 작성", status: "pending", priority: "medium", category: "planning" },
          { title: "주간 스프린트 회고", status: "routine", priority: "medium", category: "operations" },
          { title: "CI/CD 파이프라인 개선", status: "pending", priority: "low", category: "development" },
          { title: "클라이언트 A - 1차 배포", status: "completed", priority: "high", category: "development" },
          { title: "인턴 온보딩 자료 준비", status: "pending", priority: "low", category: "operations" },
          { title: "보안 감사 대응", status: "in-progress", priority: "high", category: "development" },
        ],
        projects: [
          { name: "클라이언트 A - 쇼핑몰 앱", status: "active", clientName: "패션브랜드Z", category: "development" },
          { name: "클라이언트 B - 관리자 대시보드", status: "active", clientName: "물류회사K", category: "development" },
          { name: "클라이언트 C - 예약 시스템", status: "active", clientName: "호텔그룹M", category: "development" },
          { name: "자체 서비스 - SaaS 도구", status: "active", category: "product" },
        ],
        library: [
          { title: "코드 리뷰 가이드라인", type: "note", category: "development" },
          { title: "프로젝트 견적 산출 기준표", type: "note", category: "operations" },
          { title: "AWS 아키텍처 레퍼런스", type: "url", url: "https://aws.amazon.com/architecture/", category: "development" },
          { title: "클라이언트 커뮤니케이션 매뉴얼", type: "note", category: "operations" },
        ],
        meetings: [
          { title: "클라이언트 A - 주간 싱크", type: "client", status: "scheduled", duration: 60 },
          { title: "팀 스프린트 플래닝", type: "team", status: "scheduled", duration: 45 },
          { title: "클라이언트 C - 킥오프 미팅", type: "client", status: "scheduled", duration: 90 },
        ],
        radar: [
          { title: "대기업 D - ERP 시스템 구축", category: "sales", stage: "proposal", value: 150000000, probability: 40, contactName: "김부장", contactCompany: "대기업D" },
          { title: "스타트업 E - MVP 개발", category: "sales", stage: "discovered", value: 30000000, probability: 60, contactName: "이대표", contactCompany: "스타트업E" },
          { title: "프리랜서 백엔드 개발자", category: "connection", stage: "reviewing", value: 0, probability: 70, contactName: "박개발", contactCompany: "프리랜서" },
        ],
        clients: [
          { name: "쇼핑몰 앱 개발", company: "패션브랜드Z", stage: "negotiation", value: 50000000, contactName: "정실장", contactEmail: "jung@fashionz.com", contactPhone: "010-9876-5432", notes: "iOS/Android 앱 개발, 3개월 일정" },
        ],
        estimates: [
          { title: "쇼핑몰 앱 개발 견적서", status: "sent", clientIndex: 0, items: [{ name: "UI/UX 디자인", qty: 1, unitPrice: 8000000 }, { name: "프론트엔드 개발", qty: 1, unitPrice: 15000000 }, { name: "백엔드/API 개발", qty: 1, unitPrice: 15000000 }, { name: "QA/테스트", qty: 1, unitPrice: 5000000 }], discountRate: 10, notes: "3개월 기준, 유지보수 별도" },
        ],
      };

    case "marketing_agency":
      return {
        orgName: "데모 마케팅 에이전시",
        orgSlug: `demo-mkt-${Date.now()}`,
        industry: "marketing_agency",
        tasks: [
          { title: "클라이언트 A - SNS 콘텐츠 기획", status: "in-progress", priority: "high", category: "content_writing" },
          { title: "클라이언트 B - 광고 소재 제작", status: "pending", priority: "high", category: "design" },
          { title: "인스타 릴스 촬영 & 편집", status: "in-progress", priority: "medium", category: "content_video" },
          { title: "클라이언트 C - 월간 리포트", status: "pending", priority: "high", category: "analytics" },
          { title: "퍼포먼스 마케팅 - A/B 테스트", status: "in-progress", priority: "medium", category: "marketing" },
          { title: "블로그 SEO 최적화", status: "pending", priority: "low", category: "marketing" },
          { title: "인플루언서 시딩 리스트 작성", status: "pending", priority: "medium", category: "marketing" },
          { title: "클라이언트 A - 캠페인 보고서", status: "completed", priority: "high", category: "analytics" },
        ],
        projects: [
          { name: "클라이언트 A - 인스타 운영", status: "active", clientName: "뷰티브랜드S", category: "marketing" },
          { name: "클라이언트 B - 퍼포먼스 광고", status: "active", clientName: "이커머스T", category: "marketing" },
          { name: "클라이언트 C - 브랜딩 리뉴얼", status: "active", clientName: "F&B브랜드U", category: "design" },
          { name: "자사 SNS 운영", status: "active", category: "marketing" },
        ],
        library: [
          { title: "SNS 콘텐츠 캘린더 템플릿", type: "note", category: "marketing" },
          { title: "Meta 광고 라이브러리", type: "url", url: "https://www.facebook.com/ads/library/", category: "marketing" },
          { title: "카피라이팅 공식 모음", type: "note", category: "content_writing" },
          { title: "Canva 마케팅 템플릿", type: "url", url: "https://www.canva.com/templates/", category: "design" },
        ],
        meetings: [
          { title: "클라이언트 A - 월간 리뷰", type: "client", status: "scheduled", duration: 60 },
          { title: "크리에이티브 브레인스토밍", type: "team", status: "scheduled", duration: 45 },
        ],
        radar: [
          { title: "신규 클라이언트 - 패션 브랜드", category: "sales", stage: "proposal", value: 50000000, probability: 50, contactName: "정팀장", contactCompany: "패션브랜드V" },
          { title: "인플루언서 에이전시 협업", category: "connection", stage: "reviewing", value: 0, probability: 70, contactName: "김매니저", contactCompany: "인플루언서에이전시" },
        ],
        clients: [
          { name: "인스타그램 채널 운영 대행", company: "뷰티브랜드S", stage: "won", value: 36000000, contactName: "박마케터", contactEmail: "park@beautys.com", contactPhone: "010-5555-1234", notes: "월 300만원, 12개월 계약" },
        ],
        estimates: [
          { title: "SNS 운영 대행 월 견적", status: "accepted", clientIndex: 0, items: [{ name: "콘텐츠 기획/제작 (월 20건)", qty: 1, unitPrice: 2000000 }, { name: "광고 운영/리포팅", qty: 1, unitPrice: 800000 }, { name: "인플루언서 시딩 관리", qty: 1, unitPrice: 200000 }], discountRate: 0, notes: "월 단위 청구" },
        ],
      };

    case "production":
      return {
        orgName: "데모 영상 제작사",
        orgSlug: `demo-prod-${Date.now()}`,
        industry: "production",
        tasks: [
          { title: "클라이언트 A - 촬영 콘티 작성", status: "in-progress", priority: "high", category: "content_video" },
          { title: "클라이언트 B - 편집본 수정 (2차)", status: "pending", priority: "high", category: "content_video" },
          { title: "장비 렌탈 예약 (3/25 촬영)", status: "pending", priority: "medium", category: "operations" },
          { title: "유튜브 숏폼 시리즈 기획", status: "in-progress", priority: "medium", category: "planning" },
          { title: "클라이언트 C - 최종 납품", status: "pending", priority: "high", category: "content_video" },
          { title: "색보정 LUT 팩 정리", status: "pending", priority: "low", category: "design" },
          { title: "모델 캐스팅 (다음 촬영)", status: "in-progress", priority: "medium", category: "operations" },
          { title: "BGM 라이선스 구매", status: "completed", priority: "medium", category: "operations" },
        ],
        projects: [
          { name: "클라이언트 A - 브랜드 필름", status: "active", clientName: "테크기업W", category: "video" },
          { name: "클라이언트 B - 제품 광고 (30s)", status: "active", clientName: "화장품X", category: "video" },
          { name: "클라이언트 C - 유튜브 채널 운영", status: "active", clientName: "교육플랫폼Y", category: "video" },
          { name: "자체 유튜브 채널", status: "active", category: "content" },
        ],
        library: [
          { title: "촬영 체크리스트", type: "note", category: "operations" },
          { title: "DaVinci Resolve 무료 LUT", type: "url", url: "https://www.blackmagicdesign.com/products/davinciresolve", category: "development" },
          { title: "Artlist 음원 라이브러리", type: "url", url: "https://artlist.io/", category: "content_video" },
        ],
        meetings: [
          { title: "클라이언트 A - 프리 프로덕션 미팅", type: "client", status: "scheduled", duration: 90 },
          { title: "촬영팀 일정 조율", type: "team", status: "scheduled", duration: 30 },
        ],
        radar: [
          { title: "대기업 광고 영상 제작", category: "sales", stage: "discovered", value: 80000000, probability: 30, contactName: "최마케터", contactCompany: "대기업Z" },
          { title: "장비 렌탈 파트너십", category: "connection", stage: "won", value: 0, probability: 100, contactName: "박대표", contactCompany: "시네렌탈" },
        ],
        clients: [
          { name: "브랜드 필름 제작", company: "테크기업W", stage: "contract", value: 25000000, contactName: "최마케팅팀장", contactEmail: "choi@techw.com", contactPhone: "010-7777-8888", notes: "3분 브랜드 필름, 4월 촬영 예정" },
        ],
        estimates: [
          { title: "브랜드 필름 제작 견적", status: "sent", clientIndex: 0, items: [{ name: "기획/콘티", qty: 1, unitPrice: 3000000 }, { name: "촬영 (2일)", qty: 2, unitPrice: 4000000 }, { name: "편집/색보정/사운드", qty: 1, unitPrice: 5000000 }], discountRate: 5, notes: "모델비/장소 섭외비 별도" },
        ],
      };

    case "startup":
    default:
      return {
        orgName: "데모 스타트업",
        orgSlug: `demo-startup-${Date.now()}`,
        industry: "startup",
        tasks: [
          { title: "MVP 기능 정의서 작성", status: "in-progress", priority: "high", category: "planning" },
          { title: "랜딩페이지 디자인", status: "in-progress", priority: "high", category: "design" },
          { title: "투자 IR 자료 준비", status: "pending", priority: "high", category: "planning" },
          { title: "사용자 인터뷰 5건", status: "pending", priority: "medium", category: "analytics" },
          { title: "백엔드 API 개발", status: "in-progress", priority: "high", category: "development" },
          { title: "경쟁사 분석 리포트", status: "completed", priority: "medium", category: "analytics" },
          { title: "법인 설립 서류 준비", status: "pending", priority: "medium", category: "operations" },
          { title: "Product Hunt 런칭 준비", status: "pending", priority: "low", category: "marketing" },
          { title: "초기 유저 100명 확보", status: "in-progress", priority: "high", category: "marketing" },
        ],
        projects: [
          { name: "MVP 개발", status: "active", category: "product" },
          { name: "투자 유치 (시드)", status: "active", category: "fundraising" },
          { name: "Go-to-Market", status: "active", category: "marketing" },
        ],
        library: [
          { title: "Y Combinator 스타트업 라이브러리", type: "url", url: "https://www.ycombinator.com/library", category: "learning" },
          { title: "SaaS 가격 전략 가이드", type: "note", category: "marketing" },
          { title: "시드 라운드 IR 덱 템플릿", type: "note", category: "planning" },
          { title: "Product Hunt 런칭 체크리스트", type: "url", url: "https://www.producthunt.com/", category: "marketing" },
        ],
        meetings: [
          { title: "투자자 미팅 - ABC벤처스", type: "external", status: "scheduled", duration: 60 },
          { title: "팀 스탠드업", type: "team", status: "scheduled", duration: 15 },
        ],
        radar: [
          { title: "ABC벤처스 - 시드 투자", category: "sales", stage: "proposal", value: 500000000, probability: 30, contactName: "김파트너", contactCompany: "ABC벤처스" },
          { title: "DEF캐피탈 - Pre-A", category: "sales", stage: "discovered", value: 1000000000, probability: 10, contactName: "이심사역", contactCompany: "DEF캐피탈" },
          { title: "프리랜서 디자이너", category: "connection", stage: "won", value: 0, probability: 100, contactName: "박디자인", contactCompany: "프리랜서" },
        ],
        clients: [
          { name: "MVP SaaS 플랫폼 개발", company: "자사", stage: "won", value: 0, contactName: "팀 내부", notes: "시드 투자 전 MVP 완성 목표" },
        ],
        estimates: [
          { title: "MVP 개발 내부 비용 산정", status: "draft", clientIndex: 0, items: [{ name: "디자인 (외주)", qty: 1, unitPrice: 5000000 }, { name: "서버/인프라 (3개월)", qty: 3, unitPrice: 500000 }, { name: "도메인/라이선스", qty: 1, unitPrice: 300000 }], discountRate: 0, notes: "내부 개발 인건비 미포함" },
        ],
      };
  }
}

// ─── Demo Setup Endpoint ─────────────────────────────────────────

app.post("/pm-demo/setup", async (c) => {
  try {
    const { industry } = await c.req.json().catch(() => ({ industry: "startup" }));
    const demo = getDemoData(industry);

    // 1. Create demo user (anonymous)
    const demoUserId = crypto.randomUUID();
    const demoEmail = `demo-${Date.now()}@potenmanager.demo`;

    // Create auth user with fixed demo password
    const demoPassword = `demo-${Date.now()}-pw`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: "정원규", is_demo: true },
    });
    if (authError) throw authError;
    const userId = authData.user.id;

    // Create profile
    await supabase.from("profiles").upsert({
      id: userId,
      email: demoEmail,
      full_name: "정원규",
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent("정원규")}`,
      job_title: industry === "freelancer" ? "프리랜서 개발자" : "대표",
      approval_status: "approved",
      onboarding_completed: true,
    });

    // 2. Create org (skip for freelancer personal mode)
    let orgId: string | null = null;
    if (industry !== "freelancer") {
      const { data: org, error: orgError } = await supabase.from("pm_orgs").insert({
        name: demo.orgName,
        slug: demo.orgSlug,
        industry: demo.industry,
        plan: "demo",
        owner_id: userId,
      }).select().single();
      if (orgError) throw orgError;
      orgId = org.id;

      // Add owner as member
      await supabase.from("pm_org_members").insert({
        org_id: orgId,
        user_id: userId,
        role: "owner",
      });

      // Add fake team members for org modes
      const fakeMembers = [
        { name: "김우진", title: "개발팀 리드", stamp: { text: "우진", color: "#3B82F6", shape: "rounded" } },
        { name: "조유식", title: "기획자", stamp: { text: "유식", color: "#22C55E", shape: "rounded" } },
        { name: "곽민경", title: "디자이너", stamp: { text: "민경", color: "#EC4899", shape: "circle" } },
        { name: "박지현", title: "마케터", stamp: { text: "지현", color: "#8B5CF6", shape: "rounded" } },
        { name: "홍지연", title: "PM", stamp: { text: "지연", color: "#F97316", shape: "circle" } },
      ];
      for (const fm of fakeMembers) {
        const fmEmail = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@potenmanager.demo`;
        const { data: fmAuth } = await supabase.auth.admin.createUser({
          email: fmEmail,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { full_name: fm.name, is_demo: true },
        });
        if (fmAuth?.user) {
          await supabase.from("profiles").upsert({
            id: fmAuth.user.id,
            email: fmEmail,
            full_name: fm.name,
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fm.name)}`,
            job_title: fm.title,
            approval_status: "approved",
            onboarding_completed: true,
          });
          await supabase.from("pm_org_members").insert({
            org_id: orgId,
            user_id: fmAuth.user.id,
            role: "member",
            stamp_config: fm.stamp,
          });
        }
      }

      // Set owner stamp config
      await supabase.from("pm_org_members").update({
        stamp_config: { text: "원규", color: "#EF4444", shape: "rounded" },
      }).eq("org_id", orgId).eq("user_id", userId);
    }

    // 3. Seed tasks
    if (demo.tasks.length > 0) {
      const taskRows = demo.tasks.map((t, i) => ({
        title: t.title,
        title_ko: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        category: t.category || null,
        owner_id: userId,
        org_id: orgId,
        assignee_ids: [userId],
        sort_order: i,
        created_at: new Date(Date.now() - (demo.tasks.length - i) * 86400000).toISOString(),
      }));
      await supabase.from("pm_tasks").insert(taskRows);
    }

    // 4. Seed projects
    if (demo.projects.length > 0) {
      const projRows = demo.projects.map((p) => ({
        name: p.name,
        status: p.status,
        category: p.category || null,
        client_name: p.clientName || null,
        owner_id: userId,
        org_id: orgId,
        member_ids: [userId],
      }));
      await supabase.from("pm_projects").insert(projRows);
    }

    // 5. Seed library
    if (demo.library.length > 0) {
      const libRows = demo.library.map((l) => ({
        title: l.title,
        type: l.type,
        url: l.url || null,
        category: l.category || null,
        visibility: "published",
        owner_id: userId,
        org_id: orgId,
      }));
      await supabase.from("pm_library").insert(libRows);
    }

    // 6. Seed meetings (org only)
    if (orgId && demo.meetings.length > 0) {
      const mtgRows = demo.meetings.map((m) => ({
        title: m.title,
        type: m.type,
        status: m.status,
        duration: m.duration,
        date: new Date(Date.now() + Math.random() * 7 * 86400000).toISOString(),
        attendee_ids: [userId],
        action_items: [],
        org_id: orgId,
        created_by: userId,
      }));
      await supabase.from("pm_meetings").insert(mtgRows);
    }

    // 7. Seed radar (org only)
    if (orgId && demo.radar.length > 0) {
      const radarRows = demo.radar.map((r) => ({
        title: r.title,
        category: r.category,
        stage: r.stage,
        value: r.value,
        probability: r.probability,
        contact_name: r.contactName || null,
        contact_company: r.contactCompany || null,
        assignee_id: userId,
        action_items: [],
        org_id: orgId,
        created_by: userId,
      }));
      await supabase.from("pm_biz_radar").insert(radarRows);
    }

    // 8. Seed clients
    const clientIdMap: string[] = [];
    if (demo.clients.length > 0) {
      const clientRows = demo.clients.map((cl) => ({
        name: cl.name,
        company: cl.company,
        stage: cl.stage,
        value: cl.value,
        contact_name: cl.contactName || null,
        contact_email: cl.contactEmail || null,
        contact_phone: cl.contactPhone || null,
        notes: cl.notes || null,
        org_id: orgId,
        created_by: userId,
      }));
      const { data: insertedClients } = await supabase.from("pm_clients").insert(clientRows).select("id");
      if (insertedClients) {
        insertedClients.forEach((c: { id: string }) => clientIdMap.push(c.id));
      }
    }

    // 9. Seed estimates
    if (demo.estimates.length > 0 && clientIdMap.length > 0) {
      const estRows = demo.estimates.map((est) => {
        const subtotal = est.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        const total = Math.round(subtotal * (1 - (est.discountRate || 0) / 100));
        return {
          title: est.title,
          status: est.status,
          client_id: clientIdMap[est.clientIndex] || clientIdMap[0],
          items: est.items,
          total_amount: total,
          discount_rate: est.discountRate || 0,
          notes: est.notes || null,
          org_id: orgId,
          created_by: userId,
        };
      });
      await supabase.from("pm_estimates").insert(estRows);
    }

    return c.json({
      success: true,
      userId,
      orgId,
      orgSlug: demo.orgSlug,
      industry,
      email: demoEmail,
      password: demoPassword,
    });

  } catch (e) {
    console.error("Demo setup error:", e);
    return c.json({ error: String(e), message: "Demo setup failed" }, 500);
  }
});

// Health check
app.get("/pm-demo/health", (c) => c.json({ status: "ok" }));

Deno.serve(app.fetch);
