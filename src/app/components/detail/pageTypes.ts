// ─── Detail Page Type Registry ───────────────────────────────────
// Central registry of all detail page types and their metadata.
// Used by createDetailPage factory and route configuration.

export interface PageTypeMeta {
  /** Share link type */
  shareType: string;
  /** Back navigation path */
  backPath: string;
  /** Back button label */
  backLabel: { ko: string; en: string };
  /** Route param name for the ID */
  paramName: string;
  /** Route path pattern */
  routePath: string;
}

export const PAGE_TYPES: Record<string, PageTypeMeta> = {
  task: {
    shareType: "task",
    backPath: "/tasks",
    backLabel: { ko: "태스크", en: "Tasks" },
    paramName: "taskId",
    routePath: "tasks/:taskId",
  },
  meeting: {
    shareType: "meeting",
    backPath: "/meetings",
    backLabel: { ko: "회의 목록", en: "Meetings" },
    paramName: "meetingId",
    routePath: "meetings/:meetingId",
  },
  project: {
    shareType: "project",
    backPath: "/projects",
    backLabel: { ko: "프로젝트", en: "Projects" },
    paramName: "projectId",
    routePath: "projects/:projectId",
  },
  brand: {
    shareType: "brand",
    backPath: "/branding",
    backLabel: { ko: "브랜딩", en: "Branding" },
    paramName: "brandId",
    routePath: "branding/:brandId",
  },
  library: {
    shareType: "library",
    backPath: "/library",
    backLabel: { ko: "자료실", en: "Library" },
    paramName: "itemId",
    routePath: "library/:itemId",
  },
  radar: {
    shareType: "radar",
    backPath: "/radar",
    backLabel: { ko: "비즈니스 레이더", en: "Biz Radar" },
    paramName: "itemId",
    routePath: "radar/:itemId",
  },
  board: {
    shareType: "board",
    backPath: "/team",
    backLabel: { ko: "팀 보드", en: "Team Board" },
    paramName: "itemId",
    routePath: "board/:itemId",
  },
};
