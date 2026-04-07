import { Outlet } from "react-router";
import { LanguageProvider } from "../../context/LanguageContext";
import { SidebarProvider } from "../../context/SidebarContext";
import { TaskProvider } from "../../context/TaskContext";
import { GoalProvider } from "../../context/GoalContext";
import { PermissionProvider } from "../../context/PermissionContext";
import { TeamProvider } from "../../context/TeamContext";
import { AuthProvider } from "../../context/AuthContext";
import { InviteProvider } from "../../context/InviteContext";
import { BizRadarProvider } from "../../context/BizRadarContext";
import { MeetingProvider } from "../../context/MeetingContext";
import { NotificationProvider } from "../../context/NotificationContext";
import { LibraryProvider } from "../../context/LibraryContext";
import { TrashProvider } from "../../context/TrashContext";
import { PresenceProvider } from "../../context/PresenceContext";
import { ChatProvider } from "../../context/ChatContext";
import { WorkspaceProvider } from "../../context/WorkspaceContext";
import { TimelineProvider } from "../../context/TimelineContext";
import { ActionItemProvider } from "../../context/ActionItemContext";

/**
 * RootProviders - Centralized context providers for the application.
 * Note: Order matters when providers depend on each other.
 * AuthProvider is outermost so all contexts can access auth state.
 */
export function RootProviders() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <SidebarProvider>
          <WorkspaceProvider>
          <TeamProvider>
            <TaskProvider>
              <GoalProvider>
                <BizRadarProvider>
                <LibraryProvider>
                <MeetingProvider>
                <TimelineProvider>
                <ActionItemProvider>
                <PermissionProvider>
                  <NotificationProvider>
                    <InviteProvider>
                      <TrashProvider>
                        <PresenceProvider>
                          <ChatProvider>
                            <Outlet />
                          </ChatProvider>
                        </PresenceProvider>
                      </TrashProvider>
                    </InviteProvider>
                  </NotificationProvider>
                </PermissionProvider>
                </ActionItemProvider>
                </TimelineProvider>
                </MeetingProvider>
                </LibraryProvider>
                </BizRadarProvider>
              </GoalProvider>
            </TaskProvider>
          </TeamProvider>
        </WorkspaceProvider>
        </SidebarProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}