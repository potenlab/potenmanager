/**
 * New Route Structure — Personal-first, org expansion
 *
 * 개인 모드: /tasks, /calendar, /library, /projects
 * 조직 모드: + /branding, /meetings, /chat, /radar, /team
 */

import { createBrowserRouter } from "react-router";
import { NewLayout } from "./components/layout/NewLayout";

// Auth pages (reuse existing)
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";

// Core personal pages (reuse existing, will rewire data later)
import TasksPage from "./pages/TasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import CalendarPage from "./pages/CalendarPage";
import LibraryPage from "./pages/LibraryPage";
import LibraryDetailPage from "./pages/LibraryDetailPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";

// Org pages (lazy load later)
import MeetingPage from "./pages/MeetingPage";
import MeetingDetailPage from "./pages/MeetingDetailPage";
import TeamPage from "./pages/TeamPage";
import ChatPage from "./pages/ChatPage";
import BizRadarPage from "./pages/BizRadarPage";
import BizRadarDetailPage from "./pages/BizRadarDetailPage";

// Placeholder for management page (projects/branding board)
import { ManagementPage } from "./pages/ManagementPage";

// TODO: Create these new pages
// import OrgCreatePage from "./pages/OrgCreatePage";
// import SettingsPage from "./pages/SettingsPage";

export const newRouter = createBrowserRouter([
  // ── Public Routes ──
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },

  // ── App Routes (protected by AuthGuard in layout) ──
  {
    path: "/",
    element: <NewLayout />,
    children: [
      // Dashboard / Home
      { index: true, element: <TasksPage /> },

      // ── Personal (always available) ──
      { path: "tasks", element: <TasksPage /> },
      { path: "tasks/:taskId", element: <TaskDetailPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "library/:itemId", element: <LibraryDetailPage /> },
      { path: "projects", element: <ManagementPage /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },

      // ── Org-only (rendered only when org mode) ──
      { path: "branding", element: <ManagementPage /> },
      { path: "meetings", element: <MeetingPage /> },
      { path: "meetings/:meetingId", element: <MeetingDetailPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "radar", element: <BizRadarPage /> },
      { path: "radar/:itemId", element: <BizRadarDetailPage /> },
      { path: "team", element: <TeamPage /> },

      // ── Settings & Org ──
      // { path: "settings", element: <SettingsPage /> },
      // { path: "org/new", element: <OrgCreatePage /> },
    ],
  },
]);
