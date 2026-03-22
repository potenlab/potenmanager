import { useEffect } from "react";
import { useParams, Outlet, Navigate } from "react-router";
import { useWorkspace } from "../../context/WorkspaceContext";

/**
 * Route guard that validates the :orgSlug param.
 * - If slug matches an org → switch to it and set active org
 * - If slug is invalid → redirect to /dashboard (personal)
 */
export function OrgSlugGuard() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { orgs, currentOrg, switchToOrg, isLoading } = useWorkspace();

  useEffect(() => {
    if (!orgSlug || isLoading) return;
    // Find org by slug
    const target = orgs.find((o) => o.org.slug === orgSlug);
    if (target && target.org.id !== currentOrg?.id) {
      switchToOrg(target.org.id);
    }
  }, [orgSlug, orgs, currentOrg, isLoading]);

  if (isLoading) return null;

  // If slug doesn't match any org, go to personal dashboard
  if (orgSlug) {
    const known = orgs.some((o) => o.org.slug === orgSlug);
    if (!known) return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * Redirects "/" to "/dashboard" (personal mode default)
 */
export function OrgRootRedirect() {
  return <Navigate to="/dashboard" replace />;
}
