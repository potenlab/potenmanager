import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout/Layout";
import { RootProviders } from "./components/layout/RootProviders";
import { AuthGuard } from "./components/layout/AuthGuard";
import { LoginPage } from "./pages/LoginPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { GoalDetailPage } from "./pages/GoalDetailPage";
import { GoalPage } from "./pages/GoalPage";
import { GoalsPage } from "./pages/GoalsPage";
import { GoalSetupWizardPage } from "./pages/GoalSetupWizardPage";
import { GoalEditPage } from "./pages/GoalEditPage";
import { OrgSettingsPage } from "./pages/OrgSettingsPage";
import { StrategyCreationPage } from "./pages/StrategyCreationPage";
import { CalendarPage } from "./pages/CalendarPage";
import { TasksPage } from "./pages/TasksPage";
import { TeamPage } from "./pages/TeamPage";
import { TeamMemberPage } from "./pages/TeamMemberPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MyPage } from "./pages/MyPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { InviteAcceptPage } from "./pages/InviteAcceptPage";
import { MeetingPage } from "./pages/MeetingPage";
import { MeetingDetailPage } from "./pages/MeetingDetailPage";
import { BizRadarPage } from "./pages/BizRadarPage";
import { BizRadarDetailPage } from "./pages/BizRadarDetailPage";
import { LibraryPage } from "./pages/LibraryPage";
import { LibraryDetailPage } from "./pages/LibraryDetailPage";
import { TeamBoardDetailPage } from "./pages/TeamBoardDetailPage";
import { TrashPage } from "./pages/TrashPage";
import { ManagementPage } from "./pages/ManagementPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { BrandDetailPage } from "./pages/BrandDetailPage";
import { SubPageDetailPage } from "./pages/SubPageDetailPage";
import { ChatPage } from "./pages/ChatPage";
import { SharePage } from "./pages/SharePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootProviders,
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
          {
            path: "",
            Component: Layout,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
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
              { path: "trash", Component: TrashPage },
              { path: "*", Component: DashboardPage },
            ],
          },
        ],
      },
    ],
  },
]);