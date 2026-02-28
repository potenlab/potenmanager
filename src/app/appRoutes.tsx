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
              { path: "goals", Component: GoalPage },
              { path: "goals/setup", Component: GoalSetupWizardPage },
              { path: "goals/:goalId", Component: GoalDetailPage },
              { path: "strategy", Component: GoalsPage },
              { path: "strategy/new", Component: StrategyCreationPage },
              { path: "meetings", Component: MeetingPage },
              { path: "meetings/:meetingId", Component: MeetingDetailPage },
              { path: "team", Component: TeamPage },
              { path: "team/permissions", Component: PermissionsPage },
              { path: "team/:memberId", Component: TeamMemberPage },
              { path: "notifications", Component: NotificationsPage },
              { path: "mypage", Component: MyPage },
              { path: "*", Component: DashboardPage },
            ],
          },
        ],
      },
    ],
  },
]);