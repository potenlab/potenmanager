import { createBrowserRouter, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import { Layout } from "./components/layout/Layout";
import { RootProviders } from "./components/layout/RootProviders";
import { AuthGuard } from "./components/layout/AuthGuard";
import { OrgSlugGuard, OrgRootRedirect } from "./components/layout/OrgSlugGuard";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eagerly loaded (core pages)
import { LoginPage } from "./pages/LoginPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TasksPage } from "./pages/TasksPage";
import { OnboardingPage } from "./pages/OnboardingPage";

// Auto-reload on chunk load failure (stale deploy)
function lazyRetry<T extends { [key: string]: any }>(
  factory: () => Promise<T>,
  pick: keyof T,
) {
  return lazy(() =>
    factory()
      .then((m) => ({ default: m[pick] as React.ComponentType }))
      .catch(() => {
        const reloaded = sessionStorage.getItem("chunk_reload");
        if (!reloaded) {
          sessionStorage.setItem("chunk_reload", "1");
          window.location.reload();
        }
        return { default: () => null };
      }),
  );
}

// Lazy loaded (heavy pages)
const TaskDetailPage = lazyRetry(() => import("./pages/TaskDetailPage"), "TaskDetailPage");
const GoalDetailPage = lazyRetry(() => import("./pages/GoalDetailPage"), "GoalDetailPage");
const GoalPage = lazyRetry(() => import("./pages/GoalPage"), "GoalPage");
const GoalsPage = lazyRetry(() => import("./pages/GoalsPage"), "GoalsPage");
const GoalSetupWizardPage = lazyRetry(() => import("./pages/GoalSetupWizardPage"), "GoalSetupWizardPage");
const GoalEditPage = lazyRetry(() => import("./pages/GoalEditPage"), "GoalEditPage");
const OrgSettingsPage = lazyRetry(() => import("./pages/OrgSettingsPage"), "OrgSettingsPage");
const StrategyCreationPage = lazyRetry(() => import("./pages/StrategyCreationPage"), "StrategyCreationPage");
const CalendarPage = lazyRetry(() => import("./pages/CalendarPage"), "CalendarPage");
const TeamPage = lazyRetry(() => import("./pages/TeamPage"), "TeamPage");
const TeamMemberPage = lazyRetry(() => import("./pages/TeamMemberPage"), "TeamMemberPage");
const PermissionsPage = lazyRetry(() => import("./pages/PermissionsPage"), "PermissionsPage");
const NotificationsPage = lazyRetry(() => import("./pages/NotificationsPage"), "NotificationsPage");
const MyPage = lazyRetry(() => import("./pages/MyPage"), "MyPage");
const InviteAcceptPage = lazyRetry(() => import("./pages/InviteAcceptPage"), "InviteAcceptPage");
const MeetingPage = lazyRetry(() => import("./pages/MeetingPage"), "MeetingPage");
const MeetingDetailPage = lazyRetry(() => import("./pages/MeetingDetailPage"), "MeetingDetailPage");
const BizRadarPage = lazyRetry(() => import("./pages/BizRadarPage"), "BizRadarPage");
const BizRadarDetailPage = lazyRetry(() => import("./pages/BizRadarDetailPage"), "BizRadarDetailPage");
const LibraryPage = lazyRetry(() => import("./pages/LibraryPage"), "LibraryPage");
const LibraryDetailPage = lazyRetry(() => import("./pages/LibraryDetailPage"), "LibraryDetailPage");
const TeamBoardDetailPage = lazyRetry(() => import("./pages/TeamBoardDetailPage"), "TeamBoardDetailPage");
const TrashPage = lazyRetry(() => import("./pages/TrashPage"), "TrashPage");
const ManagementPage = lazyRetry(() => import("./pages/ManagementPage"), "ManagementPage");
const ProjectDetailPage = lazyRetry(() => import("./pages/ProjectDetailPage"), "ProjectDetailPage");
const BrandDetailPage = lazyRetry(() => import("./pages/BrandDetailPage"), "BrandDetailPage");
const SubPageDetailPage = lazyRetry(() => import("./pages/SubPageDetailPage"), "SubPageDetailPage");
const ChatPage = lazyRetry(() => import("./pages/ChatPage"), "ChatPage");
const SharePage = lazyRetry(() => import("./pages/SharePage"), "SharePage");
const DesktopDownloadPage = lazyRetry(() => import("./pages/DesktopDownloadPage"), "DesktopDownloadPage");
const LeaderBoardPage = lazyRetry(() => import("./pages/LeaderBoardPage"), "LeaderBoardPage");
const LeaderBoardDetailPage = lazyRetry(() => import("./pages/LeaderBoardDetailPage"), "LeaderBoardDetailPage");
const OrgCreatePage = lazyRetry(() => import("./pages/OrgCreatePage"), "OrgCreatePage");
const ToolsPage = lazyRetry(() => import("./pages/ToolsPage"), "ToolsPage");
const SalesPage = lazy(() => import("./pages/SalesPage").then(m => ({ default: m.SalesPage })));
const RevenuePage = lazy(() => import("./pages/RevenuePage").then(m => ({ default: m.RevenuePage })));

/** All app pages – shared between the /:orgSlug layout and the legacy fallback */
const APP_PAGES = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: "dashboard", Component: DashboardPage },
  { path: "tasks", Component: TasksPage },
  { path: "tasks/:taskId", Component: TaskDetailPage },
  { path: "calendar", Component: CalendarPage },
  { path: "projects", Component: ManagementPage },
  { path: "projects/:projectId", Component: ProjectDetailPage },
  { path: "branding", Component: ManagementPage },
  { path: "branding/:brandId", Component: BrandDetailPage },
  { path: "organization", Component: GoalPage },
  { path: "organization/info", Component: OrgSettingsPage },
  { path: "organization/vision", Component: GoalPage },
  { path: "organization/setup", Component: GoalSetupWizardPage },
  { path: "organization/edit", Component: GoalEditPage },
  { path: "organization/:goalId", Component: GoalDetailPage },
  { path: "strategy", Component: GoalsPage },
  { path: "strategy/new", Component: StrategyCreationPage },
  { path: "meetings", Component: MeetingPage },
  { path: "meetings/:meetingId", Component: MeetingDetailPage },
  { path: "radar", Component: BizRadarPage },
  { path: "radar/new", Component: BizRadarDetailPage },
  { path: "radar/:itemId", Component: BizRadarDetailPage },
  { path: "library", Component: LibraryPage },
  { path: "library/new", Component: LibraryDetailPage },
  { path: "library/:itemId", Component: LibraryDetailPage },
  { path: "board/new", Component: TeamBoardDetailPage },
  { path: "board/:itemId", Component: TeamBoardDetailPage },
  { path: "team", Component: TeamPage },
  { path: "team/permissions", Component: PermissionsPage },
  { path: "team/:memberId", Component: TeamMemberPage },
  { path: "notifications", Component: NotificationsPage },
  { path: "mypage", Component: MyPage },
  { path: "pages/:pageId", Component: SubPageDetailPage },
  { path: "chat", Component: ChatPage },
  { path: "leader-board", Component: LeaderBoardPage },
  { path: "leader-board/new", Component: LeaderBoardDetailPage },
  { path: "leader-board/:itemId", Component: LeaderBoardDetailPage },
  { path: "trash", Component: TrashPage },
  { path: "org/new", Component: OrgCreatePage },
  { path: "tools", Component: ToolsPage },
  { path: "sales", Component: SalesPage },
  { path: "sales/clients", Component: SalesPage },
  { path: "sales/estimates", Component: SalesPage },
  { path: "sales/revenue", Component: SalesPage },
  { path: "revenue", Component: RevenuePage },
  { path: "*", Component: DashboardPage },
];

export const router = createBrowserRouter([
  // ── Standalone public route (no providers needed) ────
  { path: "/download", Component: DesktopDownloadPage },

  {
    path: "/",
    Component: RootProviders,
    errorElement: <ErrorBoundary />,
    children: [
      // ── Public routes ──────────────────────────────────
      { path: "login", Component: LoginPage },
      { path: "auth/callback", Component: AuthCallbackPage },
      { path: "onboarding", Component: OnboardingPage },
      { path: "invite/:code", Component: InviteAcceptPage },
      { path: "share/:token", Component: SharePage },

      // ── Protected routes (AuthGuard) ───────────────────
      {
        path: "",
        Component: AuthGuard,
        children: [
          // ── Direct routes (no org slug needed — personal + org) ──
          {
            path: "",
            Component: Layout,
            errorElement: <ErrorBoundary />,
            children: APP_PAGES,
          },
          // ── Legacy org-scoped routes: /:orgSlug/... (redirect to direct) ──
          {
            path: ":orgSlug",
            Component: OrgSlugGuard,
            children: [
              {
                path: "",
                Component: Layout,
                errorElement: <ErrorBoundary />,
                children: APP_PAGES,
              },
            ],
          },
        ],
      },
    ],
  },
]);
