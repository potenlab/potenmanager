import { Outlet } from "react-router";
import { LanguageProvider } from "../../context/LanguageContext";
import { SidebarProvider } from "../../context/SidebarContext";
import { TaskProvider } from "../../context/TaskContext";
import { GoalProvider } from "../../context/GoalContext";
import { PermissionProvider } from "../../context/PermissionContext";
import { TeamProvider } from "../../context/TeamContext";
import { AuthProvider } from "../../context/AuthContext";
import { InviteProvider } from "../../context/InviteContext";
import { OpportunityProvider } from "../../context/OpportunityContext";
import { NotificationProvider } from "../../context/NotificationContext";

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
          <TeamProvider>
            <TaskProvider>
              <GoalProvider>
                <OpportunityProvider>
                <PermissionProvider>
                  <NotificationProvider>
                    <InviteProvider>
                      <Outlet />
                    </InviteProvider>
                  </NotificationProvider>
                </PermissionProvider>
                </OpportunityProvider>
              </GoalProvider>
            </TaskProvider>
          </TeamProvider>
        </SidebarProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}