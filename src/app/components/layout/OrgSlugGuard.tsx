import { useEffect, useRef } from "react";
import { useParams, Outlet, Navigate, useLocation } from "react-router";
import { useInvite } from "../../context/InviteContext";
import { generateSlug } from "../../hooks/useOrgPath";

/**
 * Route guard that validates the :orgSlug param.
 * - If slug matches active org → render children
 * - If slug matches another org the user belongs to → switch to it
 * - If slug is invalid → redirect to active org's dashboard
 */
export function OrgSlugGuard() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { org, allOrgs, switchOrg, isLoading } = useInvite();
  const switchingRef = useRef(false);

  const activeSlug = org?.slug || (org?.name ? generateSlug(org.name) : null);

  // If slug matches a different org, switch to it
  useEffect(() => {
    if (!orgSlug || !org || isLoading || switchingRef.current) return;
    if (orgSlug === activeSlug) return;

    // Find org by slug
    const target = allOrgs.find(
      (o) => (o.slug || generateSlug(o.orgName)) === orgSlug
    );
    if (target && target.orgId !== org.id) {
      switchingRef.current = true;
      switchOrg(target.orgId).finally(() => {
        switchingRef.current = false;
      });
    }
  }, [orgSlug, activeSlug, allOrgs, org, isLoading]);

  // While loading, show nothing (prevents flash)
  if (isLoading) return null;

  // If no org at all, let the children handle it (they'll show onboarding etc.)
  if (!org) return <Outlet />;

  // If slug doesn't match any known org, redirect to active org
  if (orgSlug !== activeSlug) {
    const knownSlugs = allOrgs.map((o) => o.slug || generateSlug(o.orgName));
    if (!knownSlugs.includes(orgSlug || "")) {
      return <Navigate to={`/${activeSlug}/dashboard`} replace />;
    }
  }

  return <Outlet />;
}

/**
 * Redirects "/" to "/:orgSlug/dashboard"
 */
export function OrgRootRedirect() {
  const { org, isLoading } = useInvite();
  const location = useLocation();

  if (isLoading) return null;

  const slug = org?.slug || (org?.name ? generateSlug(org.name) : "org");

  // If there's a path after /, try to preserve it
  const rest = location.pathname === "/" ? "/dashboard" : location.pathname;
  return <Navigate to={`/${slug}${rest}`} replace />;
}
