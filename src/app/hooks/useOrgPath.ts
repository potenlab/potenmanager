import { useCallback } from "react";
import { useInvite } from "../context/InviteContext";

/** Generate a URL-safe slug from org name. Optional orgId used as fallback for non-latin names. */
export function generateSlug(name: string, orgId?: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  if (slug) return slug;
  // Non-latin name: use orgId prefix for uniqueness
  if (orgId) return `org-${orgId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase()}`;
  return `org-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Hook that returns a path-prefixer for the current org.
 *
 * Usage:
 *   const p = useOrgPath();
 *   navigate(p("/dashboard"));  // → /potenlab/dashboard
 */
export function useOrgPath() {
  const { org } = useInvite();
  const slug = org?.slug || (org?.name ? generateSlug(org.name) : "org");

  return useCallback(
    (path: string) => `/${slug}${path.startsWith("/") ? path : "/" + path}`,
    [slug],
  );
}

/**
 * Get org slug without hook (for non-component code).
 * Reads from localStorage fallback.
 */
export function getOrgSlug(): string {
  try {
    const raw = localStorage.getItem("poten_org_slug");
    if (raw) return raw;
  } catch {}
  return "org";
}
