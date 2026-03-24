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

// Lazy loaded (heavy pages)
const TaskDetailPage = lazy(() => import("./pages/TaskDetailPage").then(m => ({ default: m.TaskDetailPage })));
const GoalDetailPage = lazy(() => import("./pages/GoalDetailPage").then(m => ({ default: m.GoalDetailPage })));
const GoalPage = lazy(() => import("./pages/GoalPage").then(m => ({ default: m.GoalPage })));
const GoalsPage = lazy(() => import("./pages/GoalsPage").then(m => ({ default: m.GoalsPage })));
const GoalSetupWizardPage = lazy(() => import("./pages/GoalSetupWizardPage").then(m => ({ default: m.GoalSetupWizardPage })));
const GoalEditPage = lazy(() => import("./pages/GoalEditPage").then(m => ({ default: m.GoalEditPage })));
const OrgSettingsPage = lazy(() => import("./pages/OrgSettingsPage").then(m => ({ default: m.OrgSettingsPage })));
const StrategyCreationPage = lazy(() => import("./pages/StrategyCreationPage").then(m => ({ default: m.StrategyCreationPage })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then(m => ({ default: m.CalendarPage })));
const TeamPage = lazy(() => import("./pages/TeamPage").then(m => ({ default: m.TeamPage })));
const TeamMemberPage = lazy(() => import("./pages/TeamMemberPage").then(m => ({ default: m.TeamMemberPage })));
const PermissionsPage = lazy(() => import("./pages/PermissionsPage").then(m => ({ default: m.PermissionsPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const MyPage = lazy(() => import("./pages/MyPage").then(m => ({ default: m.MyPage })));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage").then(m => ({ default: m.InviteAcceptPage })));
const MeetingPage = lazy(() => import("./pages/MeetingPage").then(m => ({ default: m.MeetingPage })));
const MeetingDetailPage = lazy(() => import("./pages/MeetingDetailPage").then(m => ({ default: m.MeetingDetailPage })));
const BizRadarPage = lazy(() => import("./pages/BizRadarPage").then(m => ({ default: m.BizRadarPage })));
const BizRadarDetailPage = lazy(() => import("./pages/BizRadarDetailPage").then(m => ({ default: m.BizRadarDetailPage })));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then(m => ({ default: m.LibraryPage })));
const LibraryDetailPage = lazy(() => import("./pages/LibraryDetailPage").then(m => ({ default: m.LibraryDetailPage })));
const TeamBoardDetailPage = lazy(() => import("./pages/TeamBoardDetailPage").then(m => ({ default: m.TeamBoardDetailPage })));
const TrashPage = lazy(() => import("./pages/TrashPage").then(m => ({ default: m.TrashPage })));
const ManagementPage = lazy(() => import("./pages/ManagementPage").then(m => ({ default: m.ManagementPage })));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage").then(m => ({ default: m.ProjectDetailPage })));
const BrandDetailPage = lazy(() => import("./pages/BrandDetailPage").then(m => ({ default: m.BrandDetailPage })));
const SubPageDetailPage = lazy(() => import("./pages/SubPageDetailPage").then(m => ({ default: m.SubPageDetailPage })));
const ChatPage = lazy(() => import("./pages/ChatPage").then(m => ({ default: m.ChatPage })));
const SharePage = lazy(() => import("./pages/SharePage").then(m => ({ default: m.SharePage })));
const DesktopDownloadPage = lazy(() => import("./pages/DesktopDownloadPage").then(m => ({ default: m.DesktopDownloadPage })));
const LeaderBoardPage = lazy(() => import("./pages/LeaderBoardPage").then(m => ({ default: m.LeaderBoardPage })));
const LeaderBoardDetailPage = lazy(() => import("./pages/LeaderBoardDetailPage").then(m => ({ default: m.LeaderBoardDetailPage })));
const OrgCreatePage = lazy(() => import("./pages/OrgCreatePage").then(m => ({ default: m.OrgCreatePage })));
const ToolsPage = lazy(() => import("./pages/ToolsPage").then(m => ({ default: m.ToolsPage })));
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
