import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { Role, Permission, hasPermission } from "./permissions.ts";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper to get current user role from headers (Mocked for now)
const getUserRole = (authHeader: string | null): Role => {
  if (!authHeader) return 'viewer';
  if (authHeader.includes('owner')) return 'owner';
  if (authHeader.includes('admin')) return 'admin';
  return 'member';
};

// Middleware for permission check
const checkPermission = (permission: Permission) => {
  return async (c: any, next: any) => {
    const role = getUserRole(c.req.header("Authorization"));
    if (!hasPermission(role, permission)) {
      return c.json({ error: "Forbidden", message: `Required permission: ${permission}` }, 403);
    }
    await next();
  };
};

// Helper: get key prefix based on demo scope
const pfx = (c: any, base: string) => {
  const scope = c.req.query("scope");
  return scope === "demo" ? `demo:${base}` : base;
};

// ─── Health ──────────────────────────────────────────────────────────
app.get("/make-server-f580d5ca/health", (c) => c.json({ status: "ok" }));

// ─── Seed Check ──────────────────────────────────────────────────────
app.get("/make-server-f580d5ca/seeded", async (c) => {
  try {
    const flag = await kv.get("meta:seeded");
    return c.json({ seeded: !!flag });
  } catch (e) {
    console.log("Error checking seed status:", e);
    return c.json({ seeded: false });
  }
});

// ─── Seed Endpoint ───────────────────────────────────────────────────
// Receives initial data from frontend and stores it in KV.
// Only runs if not already seeded.
app.post("/make-server-f580d5ca/seed", async (c) => {
  try {
    const flag = await kv.get("meta:seeded");
    if (flag) {
      return c.json({ success: true, message: "Already seeded" });
    }

    const body = await c.req.json();
    const { tasks = [], goals = [] } = body;

    console.log(`Seeding ${tasks.length} tasks and ${goals.length} goals...`);

    // Store tasks
    for (const task of tasks) {
      if (!task.id) continue;
      await kv.set(`task:${task.id}`, task);
    }

    // Store goals
    for (const goal of goals) {
      if (!goal.id) continue;
      await kv.set(`goal:${goal.id}`, goal);
    }

    // Store initial team members (from mockData)
    const { members = [] } = body;
    for (const member of members) {
      if (!member.id) continue;
      await kv.set(`member:${member.id}`, member);
    }

    // Mark as seeded
    await kv.set("meta:seeded", { seeded: true, timestamp: new Date().toISOString() });

    console.log("Seed complete.");
    return c.json({ success: true });
  } catch (e) {
    console.log("Seed error:", e);
    return c.json({ error: "Seed failed", message: String(e) }, 500);
  }
});

// ─── Task Routes ─────────────────────────────────────────────────────
app.get("/make-server-f580d5ca/tasks", async (c) => {
  try {
    const tasks = await kv.getByPrefix(pfx(c, "task:"));
    return c.json(tasks || []);
  } catch (e) {
    console.log("Error fetching tasks:", e);
    return c.json([]);
  }
});

app.post("/make-server-f580d5ca/tasks", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `t-${Date.now()}`;
    const task = { ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`task:${id}`, task);

    // Log activity
    const logId = `log-${Date.now()}`;
    await kv.set(`activity:task:${id}:${logId}`, {
      id: logId,
      entityId: id,
      entityType: 'task',
      action: 'created',
      actorName: body.actorName || 'System',
      actorId: body.actorId || 'system',
      timestamp: new Date().toISOString(),
      details: `Task created: ${task.title}`,
      detailsKo: `태스크 생성됨: ${task.titleKo || task.title}`,
    });

    return c.json(task);
  } catch (e) {
    console.log("Error creating task:", e);
    return c.json({ error: "Failed to create task", message: String(e) }, 500);
  }
});

app.put("/make-server-f580d5ca/tasks/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const existing = await kv.get(`task:${id}`);
    const updated = { ...(existing || {}), ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`task:${id}`, updated);

    // Log status change if applicable
    if (existing && body.status && body.status !== existing.status) {
      const logId = `log-${Date.now()}`;
      await kv.set(`activity:task:${id}:${logId}`, {
        id: logId,
        entityId: id,
        entityType: 'task',
        action: 'status_changed',
        actorName: body.actorName || 'System',
        actorId: body.actorId || 'system',
        timestamp: new Date().toISOString(),
        details: `Status changed from ${existing.status} to ${body.status}`,
        detailsKo: `상태 변경: ${existing.status} → ${body.status}`,
      });
    } else if (existing) {
      const logId = `log-${Date.now()}`;
      await kv.set(`activity:task:${id}:${logId}`, {
        id: logId,
        entityId: id,
        entityType: 'task',
        action: 'updated',
        actorName: body.actorName || 'System',
        actorId: body.actorId || 'system',
        timestamp: new Date().toISOString(),
        details: `Task updated`,
        detailsKo: `태스크 수정됨`,
      });
    }

    return c.json(updated);
  } catch (e) {
    console.log("Error updating task:", e);
    return c.json({ error: "Failed to update task", message: String(e) }, 500);
  }
});

app.delete("/make-server-f580d5ca/tasks/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`task:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting task:", e);
    return c.json({ error: "Failed to delete task", message: String(e) }, 500);
  }
});

// ─── Goal Routes ─────────────────────────────────────────────────────
app.get("/make-server-f580d5ca/goals", async (c) => {
  try {
    const goals = await kv.getByPrefix(pfx(c, "goal:"));
    return c.json(goals || []);
  } catch (e) {
    console.log("Error fetching goals:", e);
    return c.json([]);
  }
});

app.post("/make-server-f580d5ca/goals", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `g-${Date.now()}`;
    const goal = { ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`goal:${id}`, goal);

    // Log activity
    const logId = `log-${Date.now()}`;
    await kv.set(`activity:goal:${id}:${logId}`, {
      id: logId,
      entityId: id,
      entityType: 'goal',
      action: 'created',
      actorName: body.actorName || 'System',
      actorId: body.actorId || 'system',
      timestamp: new Date().toISOString(),
      details: `Goal created: ${goal.title}`,
      detailsKo: `목표 생성됨: ${goal.titleKo || goal.title}`,
    });

    return c.json(goal);
  } catch (e) {
    console.log("Error creating goal:", e);
    return c.json({ error: "Failed to create goal", message: String(e) }, 500);
  }
});

app.put("/make-server-f580d5ca/goals/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const existing = await kv.get(`goal:${id}`);
    const updated = { ...(existing || {}), ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`goal:${id}`, updated);

    return c.json(updated);
  } catch (e) {
    console.log("Error updating goal:", e);
    return c.json({ error: "Failed to update goal", message: String(e) }, 500);
  }
});

app.delete("/make-server-f580d5ca/goals/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`goal:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting goal:", e);
    return c.json({ error: "Failed to delete goal", message: String(e) }, 500);
  }
});

// ─── Activity Log Routes ─────────────────────────────────────────────
app.get("/make-server-f580d5ca/logs/:entityId", async (c) => {
  try {
    const entityId = c.req.param("entityId");
    // Try both task and goal activity logs
    const taskLogs = await kv.getByPrefix(`activity:task:${entityId}:`);
    const goalLogs = await kv.getByPrefix(`activity:goal:${entityId}:`);
    const allLogs = [...(taskLogs || []), ...(goalLogs || [])];
    // Sort by timestamp descending
    allLogs.sort((a: any, b: any) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
    return c.json(allLogs);
  } catch (e) {
    console.log("Error fetching logs:", e);
    return c.json([]);
  }
});

app.post("/make-server-f580d5ca/logs", async (c) => {
  try {
    const body = await c.req.json();
    const logId = body.id || `log-${Date.now()}`;
    const entityType = body.entityType || 'task';
    const entityId = body.entityId;
    if (!entityId) {
      return c.json({ error: "entityId is required" }, 400);
    }
    const log = { ...body, id: logId, timestamp: body.timestamp || new Date().toISOString() };
    await kv.set(`activity:${entityType}:${entityId}:${logId}`, log);
    return c.json(log);
  } catch (e) {
    console.log("Error creating log:", e);
    return c.json({ error: "Failed to create log", message: String(e) }, 500);
  }
});

// ─── Team Routes ─────────────────────────────────────────────────────
app.get("/make-server-f580d5ca/team/members", async (c) => {
  try {
    const members = await kv.getByPrefix(pfx(c, "member:"));
    return c.json(members || []);
  } catch (e) {
    console.log("Error fetching members:", e);
    return c.json([]);
  }
});

app.post("/make-server-f580d5ca/team/members", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `u-${Date.now()}`;
    const member = { ...body, id, joinedAt: new Date().toISOString() };
    await kv.set(`member:${id}`, member);
    return c.json(member);
  } catch (e) {
    console.log("Error creating member:", e);
    return c.json({ error: "Failed to create member", message: String(e) }, 500);
  }
});

app.put("/make-server-f580d5ca/team/members/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`member:${id}`);
    const updated = { ...(existing || {}), ...body, id };
    await kv.set(`member:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("Error updating member:", e);
    return c.json({ error: "Failed to update member", message: String(e) }, 500);
  }
});

app.delete("/make-server-f580d5ca/team/members/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`member:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting member:", e);
    return c.json({ error: "Failed to delete member", message: String(e) }, 500);
  }
});

// ─── Onboarding Data Persistence ─────────────────────────────────────
// Save/load onboarding profile so it survives across devices & sessions.
// Key format: onboarding:{userId}

app.get("/make-server-f580d5ca/onboarding/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const data = await kv.get(`onboarding:${userId}`);
    if (!data) {
      return c.json({ exists: false, data: null });
    }
    return c.json({ exists: true, data });
  } catch (e) {
    console.log("Error fetching onboarding data:", e);
    return c.json({ exists: false, data: null });
  }
});

app.put("/make-server-f580d5ca/onboarding/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const record = {
      ...body,
      userId,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`onboarding:${userId}`, record);
    console.log(`[Onboarding] Saved onboarding data for user ${userId}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error saving onboarding data:", e);
    return c.json({ error: "Failed to save onboarding data", message: String(e) }, 500);
  }
});

// ─── User Profile ────────────────────────────────────────────────────────────
// Stores extra profile fields (phone, company, location, jobTitle) per user.
// Key format: profile:{userId}

app.get("/make-server-f580d5ca/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const data = await kv.get(`profile:${userId}`);
    return c.json(data || { phone: "", company: "", location: "", jobTitle: "" });
  } catch (e) {
    console.log("Error fetching profile:", e);
    return c.json({ phone: "", company: "", location: "", jobTitle: "" });
  }
});

app.put("/make-server-f580d5ca/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const existing = (await kv.get(`profile:${userId}`)) || {};
    const record = {
      ...existing,
      ...body,
      userId,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`profile:${userId}`, record);
    console.log(`[Profile] Saved profile for user ${userId}`);
    return c.json({ success: true, data: record });
  } catch (e) {
    console.log("Error saving profile:", e);
    return c.json({ error: "Failed to save profile", message: String(e) }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Organization & Invite System
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: generate 8-char alphanumeric invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Create Organization ─────────────────────────────────────────────
app.post("/make-server-f580d5ca/org", async (c) => {
  try {
    const body = await c.req.json();
    const { name, ownerId, ownerName } = body;
    if (!name || !ownerId) {
      return c.json({ error: "name and ownerId are required" }, 400);
    }

    const orgId = `org-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const org = {
      id: orgId,
      name,
      ownerId,
      ownerName: ownerName || '',
      memberIds: [ownerId],
      createdAt: new Date().toISOString(),
    };
    await kv.set(`org:${orgId}`, org);

    // Also map user → org (multi-org: append to orgs array)
    const existing = await kv.get(`user-org:${ownerId}`) as any;
    let orgs: any[] = [];
    if (existing?.orgs) {
      orgs = existing.orgs;
    } else if (existing?.orgId) {
      // migrate legacy single-org format
      orgs = [{ orgId: existing.orgId, role: existing.role, joinedAt: existing.joinedAt }];
    }
    orgs.push({ orgId, role: 'owner', joinedAt: new Date().toISOString() });
    await kv.set(`user-org:${ownerId}`, { orgs, activeOrgId: orgId });

    console.log(`[Org] Created org "${name}" (${orgId}) by ${ownerId}`);
    return c.json(org);
  } catch (e) {
    console.log("Error creating org:", e);
    return c.json({ error: "Failed to create organization", message: String(e) }, 500);
  }
});

// ─── Get Organization ────────────────────────────────────────────────
app.get("/make-server-f580d5ca/org/:orgId", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const org = await kv.get(`org:${orgId}`);
    if (!org) return c.json({ error: "Organization not found" }, 404);
    return c.json(org);
  } catch (e) {
    console.log("Error fetching org:", e);
    return c.json({ error: "Failed to fetch organization", message: String(e) }, 500);
  }
});

// ─── Get current user's organization ─────────────────────────────────
app.get("/make-server-f580d5ca/user-org/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const userOrg = await kv.get(`user-org:${userId}`) as any;
    if (!userOrg) {
      return c.json({ org: null, allOrgs: [] });
    }

    // Support both legacy single-org and new multi-org format
    let orgs: any[] = [];
    let activeOrgId: string | null = null;

    if (userOrg.orgs) {
      // New multi-org format
      orgs = userOrg.orgs;
      activeOrgId = userOrg.activeOrgId || orgs[0]?.orgId || null;
    } else if (userOrg.orgId) {
      // Legacy single-org format — migrate
      orgs = [{ orgId: userOrg.orgId, role: userOrg.role, joinedAt: userOrg.joinedAt }];
      activeOrgId = userOrg.orgId;
      // Auto-migrate to new format
      await kv.set(`user-org:${userId}`, { orgs, activeOrgId });
    }

    if (!activeOrgId) {
      return c.json({ org: null, allOrgs: [] });
    }

    const activeEntry = orgs.find((o: any) => o.orgId === activeOrgId) || orgs[0];
    const org = await kv.get(`org:${activeEntry.orgId}`);

    // Fetch all org names for switcher
    const allOrgs = await Promise.all(
      orgs.map(async (o: any) => {
        const orgData = await kv.get(`org:${o.orgId}`) as any;
        return { orgId: o.orgId, orgName: orgData?.name || 'Unknown', role: o.role };
      })
    );

    return c.json({ org, userRole: activeEntry.role, allOrgs, activeOrgId });
  } catch (e) {
    console.log("Error fetching user org:", e);
    return c.json({ org: null, allOrgs: [] });
  }
});

// ─── Switch active organization ──────────────────────────────────────
app.put("/make-server-f580d5ca/user-org/:userId/active", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { orgId } = body;
    if (!orgId) return c.json({ error: "orgId is required" }, 400);

    const userOrg = await kv.get(`user-org:${userId}`) as any;
    if (!userOrg?.orgs) return c.json({ error: "No organizations found" }, 404);

    const exists = userOrg.orgs.find((o: any) => o.orgId === orgId);
    if (!exists) return c.json({ error: "User is not a member of this organization" }, 403);

    await kv.set(`user-org:${userId}`, { ...userOrg, activeOrgId: orgId });

    const org = await kv.get(`org:${orgId}`);
    console.log(`[Org] User ${userId} switched active org to ${orgId}`);
    return c.json({ org, userRole: exists.role });
  } catch (e) {
    console.log("Error switching org:", e);
    return c.json({ error: "Failed to switch organization", message: String(e) }, 500);
  }
});

// ─── Generate Invite Code ────────────────────────────────────────────
app.post("/make-server-f580d5ca/org/:orgId/invite", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const body = await c.req.json();
    const { createdBy, createdByName, role = 'member' } = body;

    const org = await kv.get(`org:${orgId}`) as any;
    if (!org) return c.json({ error: "Organization not found" }, 404);

    const code = generateInviteCode();
    const invite = {
      code,
      orgId,
      orgName: org.name,
      createdBy,
      createdByName: createdByName || '',
      role, // The role this invite grants
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      used: false,
      usedBy: null,
    };
    await kv.set(`invite:${code}`, invite);

    console.log(`[Invite] Code ${code} created for org "${org.name}" by ${createdBy}`);
    return c.json(invite);
  } catch (e) {
    console.log("Error generating invite:", e);
    return c.json({ error: "Failed to generate invite code", message: String(e) }, 500);
  }
});

// ─── Look up Invite Code ─────────────────────────────────────────────
app.get("/make-server-f580d5ca/invite/:code", async (c) => {
  try {
    const code = c.req.param("code").toUpperCase();
    const invite = await kv.get(`invite:${code}`) as any;
    if (!invite) {
      return c.json({ error: "Invalid invite code", valid: false }, 404);
    }
    // Check expiration
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return c.json({ error: "Invite code has expired", valid: false, expired: true }, 410);
    }
    if (invite.used) {
      return c.json({ error: "Invite code has already been used", valid: false, used: true }, 410);
    }
    return c.json({ ...invite, valid: true });
  } catch (e) {
    console.log("Error looking up invite:", e);
    return c.json({ error: "Failed to look up invite code", message: String(e) }, 500);
  }
});

// ─── Join via Invite Code ────────────────────────────────────────────
app.post("/make-server-f580d5ca/invite/:code/join", async (c) => {
  try {
    const code = c.req.param("code").toUpperCase();
    const body = await c.req.json();
    const { userId, userName } = body;
    if (!userId) return c.json({ error: "userId is required" }, 400);

    const invite = await kv.get(`invite:${code}`) as any;
    if (!invite) return c.json({ error: "Invalid invite code" }, 404);
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return c.json({ error: "Invite code has expired" }, 410);
    }
    if (invite.used) {
      return c.json({ error: "Invite code has already been used" }, 410);
    }

    const org = await kv.get(`org:${invite.orgId}`) as any;
    if (!org) return c.json({ error: "Organization not found" }, 404);

    // Create a join request (pending approval)
    const joinRequest = {
      id: `jr-${Date.now()}`,
      orgId: invite.orgId,
      orgName: invite.orgName || org.name,
      userId,
      userName: userName || '',
      inviteCode: code,
      requestedRole: invite.role || 'member',
      status: 'pending' as const,
      requestedAt: new Date().toISOString(),
    };
    await kv.set(`join-request:${invite.orgId}:${userId}`, joinRequest);

    console.log(`[Join] User ${userId} requested to join org ${invite.orgId} via code ${code}`);
    return c.json({ success: true, joinRequest });
  } catch (e) {
    console.log("Error joining via invite:", e);
    return c.json({ error: "Failed to join via invite", message: String(e) }, 500);
  }
});

// ─── Direct Join (auto-approve: for solo/simple orgs) ────────────────
app.post("/make-server-f580d5ca/invite/:code/direct-join", async (c) => {
  try {
    const code = c.req.param("code").toUpperCase();
    const body = await c.req.json();
    const { userId, userName, avatar } = body;
    if (!userId) return c.json({ error: "userId is required" }, 400);

    const invite = await kv.get(`invite:${code}`) as any;
    if (!invite) return c.json({ error: "Invalid invite code" }, 404);
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return c.json({ error: "Invite code has expired" }, 410);
    }
    if (invite.used) {
      return c.json({ error: "Invite code has already been used" }, 410);
    }

    const org = await kv.get(`org:${invite.orgId}`) as any;
    if (!org) return c.json({ error: "Organization not found" }, 404);

    // Add member to org
    const memberIds = org.memberIds || [];
    if (!memberIds.includes(userId)) {
      memberIds.push(userId);
      await kv.set(`org:${invite.orgId}`, { ...org, memberIds });
    }

    // Map user → org (multi-org: append to orgs array)
    const existingUserOrg = await kv.get(`user-org:${userId}`) as any;
    let userOrgs: any[] = [];
    if (existingUserOrg?.orgs) {
      userOrgs = existingUserOrg.orgs;
    } else if (existingUserOrg?.orgId) {
      userOrgs = [{ orgId: existingUserOrg.orgId, role: existingUserOrg.role, joinedAt: existingUserOrg.joinedAt }];
    }
    if (!userOrgs.some((o: any) => o.orgId === invite.orgId)) {
      userOrgs.push({ orgId: invite.orgId, role: invite.role || 'member', joinedAt: new Date().toISOString() });
    }
    await kv.set(`user-org:${userId}`, { orgs: userOrgs, activeOrgId: invite.orgId });

    // Create member record
    const member = {
      id: userId,
      name: userName || `User ${userId}`,
      avatar: avatar || '',
      role: invite.role || 'member',
      joinedAt: new Date().toISOString(),
    };
    await kv.set(`member:${userId}`, member);

    // Mark invite as used
    await kv.set(`invite:${code}`, { ...invite, used: true, usedBy: userId, usedAt: new Date().toISOString() });

    console.log(`[Join] User ${userId} directly joined org ${invite.orgId} as ${invite.role}`);
    return c.json({ success: true, member, org: { ...org, memberIds } });
  } catch (e) {
    console.log("Error during direct join:", e);
    return c.json({ error: "Failed to join", message: String(e) }, 500);
  }
});

// ─── List Join Requests for an Org ───────────────────────────────────
app.get("/make-server-f580d5ca/org/:orgId/join-requests", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const requests = await kv.getByPrefix(`join-request:${orgId}:`);
    return c.json(requests || []);
  } catch (e) {
    console.log("Error fetching join requests:", e);
    return c.json([]);
  }
});

// ─── Approve / Reject Join Request ───────────────────────────────────
app.put("/make-server-f580d5ca/org/:orgId/join-requests/:userId", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { action } = body; // 'approve' | 'reject'

    const jr = await kv.get(`join-request:${orgId}:${userId}`) as any;
    if (!jr) return c.json({ error: "Join request not found" }, 404);

    if (action === 'approve') {
      // Update join request
      await kv.set(`join-request:${orgId}:${userId}`, {
        ...jr,
        status: 'approved',
        processedAt: new Date().toISOString(),
      });

      // Add to org members
      const org = await kv.get(`org:${orgId}`) as any;
      if (org) {
        const memberIds = org.memberIds || [];
        if (!memberIds.includes(userId)) {
          memberIds.push(userId);
          await kv.set(`org:${orgId}`, { ...org, memberIds });
        }
      }

      // Map user → org (multi-org: append to orgs array)
      const existingUserOrg = await kv.get(`user-org:${userId}`) as any;
      let userOrgs: any[] = [];
      if (existingUserOrg?.orgs) {
        userOrgs = existingUserOrg.orgs;
      } else if (existingUserOrg?.orgId) {
        userOrgs = [{ orgId: existingUserOrg.orgId, role: existingUserOrg.role, joinedAt: existingUserOrg.joinedAt }];
      }
      if (!userOrgs.some((o: any) => o.orgId === orgId)) {
        userOrgs.push({ orgId, role: jr.requestedRole || 'member', joinedAt: new Date().toISOString() });
      }
      await kv.set(`user-org:${userId}`, { orgs: userOrgs, activeOrgId: orgId });

      // Create member record
      const member = {
        id: userId,
        name: jr.userName || `User ${userId}`,
        avatar: '',
        role: jr.requestedRole || 'member',
        joinedAt: new Date().toISOString(),
      };
      await kv.set(`member:${userId}`, member);

      // Mark invite as used if present
      if (jr.inviteCode) {
        const invite = await kv.get(`invite:${jr.inviteCode}`) as any;
        if (invite) {
          await kv.set(`invite:${jr.inviteCode}`, { ...invite, used: true, usedBy: userId, usedAt: new Date().toISOString() });
        }
      }

      console.log(`[Join] Approved ${userId} to org ${orgId}`);
      return c.json({ success: true, status: 'approved', member });
    } else {
      // Reject
      await kv.set(`join-request:${orgId}:${userId}`, {
        ...jr,
        status: 'rejected',
        processedAt: new Date().toISOString(),
      });

      console.log(`[Join] Rejected ${userId} from org ${orgId}`);
      return c.json({ success: true, status: 'rejected' });
    }
  } catch (e) {
    console.log("Error processing join request:", e);
    return c.json({ error: "Failed to process join request", message: String(e) }, 500);
  }
});

// ─── List Invites for an Org ─────────────────────────────────────────
app.get("/make-server-f580d5ca/org/:orgId/invites", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const allInvites = await kv.getByPrefix("invite:");
    const orgInvites = (allInvites || []).filter((inv: any) => inv.orgId === orgId);
    return c.json(orgInvites);
  } catch (e) {
    console.log("Error fetching invites:", e);
    return c.json([]);
  }
});

// ─── Biz Radar Routes ────────────────────────────────────────────────
app.get("/make-server-f580d5ca/radar", async (c) => {
  try {
    const items = await kv.getByPrefix(pfx(c, "radar:"));
    return c.json(items || []);
  } catch (e) {
    console.log("Error fetching radar items:", e);
    return c.json([]);
  }
});

app.post("/make-server-f580d5ca/radar", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `biz-${Date.now()}`;
    const item = { ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`radar:${id}`, item);
    return c.json(item);
  } catch (e) {
    console.log("Error creating radar item:", e);
    return c.json({ error: "Failed to create radar item", message: String(e) }, 500);
  }
});

app.put("/make-server-f580d5ca/radar/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`radar:${id}`);
    const updated = { ...(existing || {}), ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`radar:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("Error updating radar item:", e);
    return c.json({ error: "Failed to update radar item", message: String(e) }, 500);
  }
});

app.delete("/make-server-f580d5ca/radar/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`radar:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting radar item:", e);
    return c.json({ error: "Failed to delete radar item", message: String(e) }, 500);
  }
});

// ─── Meeting Routes ─────────────────────────────────────────────────
app.get("/make-server-f580d5ca/meetings", async (c) => {
  try {
    const meetings = await kv.getByPrefix(pfx(c, "meeting:"));
    return c.json(meetings || []);
  } catch (e) {
    console.log("Error fetching meetings:", e);
    return c.json([]);
  }
});

app.post("/make-server-f580d5ca/meetings", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `mt-${Date.now()}`;
    const meeting = { ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`meeting:${id}`, meeting);
    return c.json(meeting);
  } catch (e) {
    console.log("Error creating meeting:", e);
    return c.json({ error: "Failed to create meeting", message: String(e) }, 500);
  }
});

app.put("/make-server-f580d5ca/meetings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`meeting:${id}`);
    const updated = { ...(existing || {}), ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`meeting:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("Error updating meeting:", e);
    return c.json({ error: "Failed to update meeting", message: String(e) }, 500);
  }
});

app.delete("/make-server-f580d5ca/meetings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`meeting:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting meeting:", e);
    return c.json({ error: "Failed to delete meeting", message: String(e) }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI Strategy Generation (Gemini API)
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/make-server-f580d5ca/ai/strategy", async (c) => {
  try {
    const body = await c.req.json();
    const { goal, timeline, metric, current, obstacle, strength, action } = body;

    if (!goal || !timeline || !metric) {
      return c.json({ error: "goal, timeline, metric are required" }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.log("[AI] GEMINI_API_KEY not set");
      return c.json({ error: "AI service not configured (missing GEMINI_API_KEY)" }, 500);
    }

    const systemPrompt = `당신은 1인 기업 및 소규모 팀(2~10명)을 위한 최고의 전략 컨설턴트입니다. 
사용자의 답변을 바탕으로 실행 가능하고 구체적인 전략 문서를 JSON으로 생성하세요.

반드시 아래 JSON 스키마를 따르세요. 추가 텍스트 없이 순수 JSON만 반환하세요:

{
  "title": "전략 제목 (목표 기반, 한 줄)",
  "summary": "전략 요약 (2~3문장, 핵심 메시지)",
  "timeline": "달성 기간",
  "kpi": "핵심 성과 지표",
  "currentAnalysis": "현재 상황 분석 (2~3문장)",
  "strengthAnalysis": "강점 활용 방안 (2~3문장)",
  "okrs": [
    {
      "objective": "목표 (Objective)",
      "keyResults": ["핵심 결과 1", "핵심 결과 2", "핵심 결과 3"]
    }
  ],
  "phases": [
    {
      "phase": "Phase 이름",
      "period": "기간",
      "color": "blue | purple | emerald | amber",
      "description": "이 단계의 핵심 목적 (1문장)",
      "tasks": ["구체적 실행 과제 1", "구체적 실행 과제 2", "구체적 실행 과제 3"]
    }
  ],
  "risks": [
    {
      "risk": "위험 요소",
      "impact": "high | medium | low",
      "mitigation": "구체적 대응 방안"
    }
  ],
  "weeklyActions": [
    "이번 주 즉시 실행할 액션 1",
    "이번 주 즉시 실행할 액션 2",
    "이번 주 즉시 실행할 액션 3"
  ],
  "milestones": [
    {
      "title": "마일스톤 제목",
      "targetDate": "상대적 시점 (예: 2주차, 1개월차)",
      "criteria": "달성 기준"
    }
  ]
}

규칙:
- OKR은 1~2개, 각 KR은 측정 가능해야 함
- Phase는 3~4개, 시간순으로 배열
- 리스크는 2~4개, 반드시 구체적 대응책 포함
- weeklyActions는 지금 당장 실행 가능한 것 3가지
- milestones는 3~5개, 체크포인트 역할
- 모든 내용은 한국어로 작성
- 1인 기업/소규모 팀에 현실적인 수준으로 작성 (대기업 전략이 아님)
- 구체적이고 실행 가능한 내용 위주로 작성`;

    const userPrompt = `다음은 사용자의 전략 수립 답변입니다:

🎯 핵심 목표: ${goal}
📅 달성 기간: ${timeline}
📊 성공 지표 (KPI): ${metric}
📍 현재 상황: ${current || '미입력'}
🚧 핵심 장애물: ${obstacle || '미입력'}
💪 핵심 강점: ${strength || '미입력'}
⚡ 즉시 실행 액션: ${action || '미입력'}

위 정보를 바탕으로 맞춤 전략 문서를 JSON으로 생성해주세요.`;

    console.log("[AI] Calling Gemini API for strategy generation...");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.log(`[AI] Gemini API error (${geminiResponse.status}): ${errorText}`);
      return c.json({ 
        error: "AI generation failed", 
        message: `Gemini API returned ${geminiResponse.status}: ${errorText.substring(0, 200)}` 
      }, 502);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.log("[AI] No text in Gemini response:", JSON.stringify(geminiData).substring(0, 500));
      return c.json({ error: "AI returned empty response" }, 502);
    }

    // Parse the JSON response
    let strategy;
    try {
      // Clean up potential markdown code fences
      const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      strategy = JSON.parse(cleaned);
    } catch (parseErr) {
      console.log("[AI] Failed to parse Gemini JSON:", rawText.substring(0, 500));
      return c.json({ 
        error: "Failed to parse AI response as JSON", 
        raw: rawText.substring(0, 1000) 
      }, 502);
    }

    console.log("[AI] Strategy generated successfully for goal:", goal.substring(0, 50));

    // Persist generated strategy to KV
    const strategyId = `strategy-${Date.now()}`;
    await kv.set(`strategy:${strategyId}`, {
      id: strategyId,
      ...strategy,
      inputs: { goal, timeline, metric, current, obstacle, strength, action },
      generatedAt: new Date().toISOString(),
    });

    return c.json({ id: strategyId, ...strategy });
  } catch (e) {
    console.log("[AI] Strategy generation error:", e);
    return c.json({ error: "Strategy generation failed", message: String(e) }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Demo Account Setup
// ═══════════════════════════════════════════════════════════════════════════════

const DEMO_EMAIL = "demo@potenmanager.com";
const DEMO_PASSWORD = "demo1234";

app.post("/make-server-f580d5ca/demo/setup", async (c) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Check if demo user exists, create if not
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
    });
    const { users = [] } = await listRes.json();
    let demoUser = users.find((u: any) => u.email === DEMO_EMAIL);

    if (!demoUser) {
      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          email_confirm: true,
        }),
      });
      demoUser = await createRes.json();
      console.log("[Demo] Created demo user:", demoUser.id);
    }

    const userId = demoUser.id;

    // 2. Check if already seeded (demo: prefix for v2 isolation)
    const seeded = await kv.get(`demo:seeded:${userId}`);
    if (seeded) {
      return c.json({ success: true, message: "Demo already set up", userId });
    }

    // 3. Seed sample data
    const now = new Date();
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

    // Tasks
    const tasks = [
      { id: `t-demo-1`, title: "Prepare investor pitch deck", titleKo: "투자자 피치덱 준비", status: "in-progress", priority: "high", dueDate: daysFromNow(3), assigneeId: userId, progress: 60, createdAt: daysAgo(5) },
      { id: `t-demo-2`, title: "Setup Google Analytics", titleKo: "Google Analytics 설정", status: "completed", priority: "medium", dueDate: daysAgo(1), assigneeId: userId, progress: 100, createdAt: daysAgo(7) },
      { id: `t-demo-3`, title: "Design landing page mockup", titleKo: "랜딩 페이지 목업 디자인", status: "in-progress", priority: "high", dueDate: daysFromNow(5), assigneeId: userId, progress: 40, createdAt: daysAgo(3) },
      { id: `t-demo-4`, title: "Write blog post about product launch", titleKo: "제품 출시 블로그 포스트 작성", status: "pending", priority: "medium", dueDate: daysFromNow(7), assigneeId: userId, progress: 0, createdAt: daysAgo(1) },
      { id: `t-demo-5`, title: "Competitive analysis report", titleKo: "경쟁사 분석 리포트", status: "completed", priority: "high", dueDate: daysAgo(3), assigneeId: userId, progress: 100, createdAt: daysAgo(10) },
      { id: `t-demo-6`, title: "Customer interview scheduling", titleKo: "고객 인터뷰 일정 잡기", status: "pending", priority: "low", dueDate: daysFromNow(10), assigneeId: userId, progress: 0, createdAt: daysAgo(2) },
      { id: `t-demo-7`, title: "Update pricing page", titleKo: "가격 페이지 업데이트", status: "in-progress", priority: "medium", dueDate: daysFromNow(2), assigneeId: userId, progress: 75, createdAt: daysAgo(4) },
    ];

    // Goals
    const goals = [
      { id: `g-demo-year`, title: "Achieve 100M ARR", titleKo: "연간 매출 1억 달성", level: "Year", progress: 35, status: "in-progress", startDate: `${now.getFullYear()}-01-01`, endDate: `${now.getFullYear()}-12-31`, children: ["g-demo-q1", "g-demo-q2"] },
      { id: `g-demo-q1`, title: "Launch MVP and get 50 users", titleKo: "MVP 출시 및 유저 50명 확보", level: "Quarter", progress: 70, status: "in-progress", parentId: "g-demo-year", children: ["g-demo-m1", "g-demo-m2", "g-demo-m3"] },
      { id: `g-demo-q2`, title: "Secure seed funding", titleKo: "시드 투자 유치", level: "Quarter", progress: 10, status: "pending", parentId: "g-demo-year" },
      { id: `g-demo-m1`, title: "Complete core features", titleKo: "핵심 기능 개발 완료", level: "Month", progress: 90, status: "in-progress", parentId: "g-demo-q1" },
      { id: `g-demo-m2`, title: "Beta testing with 10 users", titleKo: "10명 베타 테스트", level: "Month", progress: 50, status: "in-progress", parentId: "g-demo-q1" },
      { id: `g-demo-m3`, title: "Marketing website launch", titleKo: "마케팅 웹사이트 오픈", level: "Month", progress: 30, status: "pending", parentId: "g-demo-q1" },
      // Urgent goals
      { id: `g-demo-u1`, title: "Submit grant application", titleKo: "정부 지원사업 신청서 제출", level: "Urgent", isUrgent: true, urgentCategory: "submission", deadline: daysFromNow(5), progress: 60, status: "in-progress" },
      { id: `g-demo-u2`, title: "Demo Day presentation", titleKo: "데모데이 발표", level: "Urgent", isUrgent: true, urgentCategory: "event", deadline: daysFromNow(14), progress: 20, status: "pending" },
    ];

    // Team members
    const members = [
      { id: userId, name: "Demo User", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo", role: "owner", jobTitle: "CEO / Founder", email: DEMO_EMAIL },
      { id: "m-demo-2", name: "김민지", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=minji", role: "member", jobTitle: "디자이너" },
      { id: "m-demo-3", name: "이준호", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=junho", role: "member", jobTitle: "프론트엔드 개발자" },
    ];

    // Biz Radar Items - Sales
    const radarItems = [
      { id: "biz-demo-1", title: "TechCorp 파트너십 제안", category: "sales", type: "partnership", stage: "proposal", value: 50000000, probability: 60, contactName: "박서연", contactCompany: "TechCorp", assigneeId: userId, actionItems: [{ id: "ai-d1", title: "파트너십 제안서 작성", done: false }, { id: "ai-d2", title: "미팅 일정 잡기", done: true }], createdAt: daysAgo(7) },
      { id: "biz-demo-2", title: "대기업 클라이언트 리드", category: "sales", type: "project", stage: "reviewing", value: 30000000, probability: 40, contactName: "최영수", contactCompany: "삼성전자", assigneeId: userId, actionItems: [], deadline: daysFromNow(14), createdAt: daysAgo(3) },
      { id: "biz-demo-3", title: "정부 혁신 프로그램 선정", category: "sales", type: "funding", stage: "won", value: 20000000, probability: 100, contactName: "정하은", contactCompany: "중소벤처기업부", assigneeId: userId, actionItems: [{ id: "ai-d3", title: "사업계획서 제출", done: true }], createdAt: daysAgo(14) },
      { id: "biz-demo-4", title: "시드 투자 미팅", category: "sales", type: "investment", stage: "negotiation", value: 100000000, probability: 30, contactName: "김투자", contactCompany: "ABC벤처스", assigneeId: userId, actionItems: [], deadline: daysFromNow(7), createdAt: daysAgo(5) },
      { id: "biz-demo-5", title: "마케팅 대행 프로젝트", category: "sales", type: "project", stage: "discovered", value: 15000000, probability: 50, source: "소개", assigneeId: userId, actionItems: [], createdAt: daysAgo(1) },
      // Biz Radar Items - Connections
      { id: "biz-demo-c1", title: "그린솔루션 유통 파트너", category: "connection", connectionType: "distributor", type: "other", stage: "proposal", value: 80000000, probability: 50, contactName: "이동현", contactCompany: "그린솔루션", assigneeId: userId, actionItems: [{ id: "ai-c1", title: "유통 계약 조건 검토", done: false }], createdAt: daysAgo(6) },
      { id: "biz-demo-c2", title: "디자인랩 외주 공급사", category: "connection", connectionType: "supplier", type: "other", stage: "reviewing", value: 20000000, probability: 60, contactName: "한지민", contactCompany: "디자인랩", assigneeId: userId, actionItems: [], createdAt: daysAgo(4) },
      { id: "biz-demo-c3", title: "스타트업허브 대리점", category: "connection", connectionType: "agent", type: "other", stage: "won", value: 35000000, probability: 100, contactName: "조민수", contactCompany: "스타트업허브", assigneeId: userId, actionItems: [{ id: "ai-c2", title: "대리점 계약 체결", done: true }], createdAt: daysAgo(20) },
      { id: "biz-demo-c4", title: "메가코프 고객사 연결", category: "connection", connectionType: "client", type: "other", stage: "discovered", contactName: "김수현", contactCompany: "메가코프", assigneeId: userId, actionItems: [], source: "전시회", createdAt: daysAgo(2) },
    ];

    // Save all data with demo: prefix to isolate from real data
    for (const task of tasks) await kv.set(`demo:task:${task.id}`, { ...task, updatedAt: now.toISOString() });
    for (const goal of goals) await kv.set(`demo:goal:${goal.id}`, { ...goal, updatedAt: now.toISOString() });
    for (const member of members) await kv.set(`demo:member:${member.id}`, member);
    for (const r of radarItems) await kv.set(`demo:radar:${r.id}`, { ...r, updatedAt: now.toISOString() });

    // Mark onboarding as complete for demo user
    await kv.set(`onboarding:${userId}`, {
      userId,
      completedAt: now.toISOString(),
      companyName: "Poten Lab",
      industry: "SaaS",
      teamSize: "2-5",
    });

    // Mark as seeded
    await kv.set(`demo:seeded:${userId}`, { seeded: true, timestamp: now.toISOString() });

    console.log("[Demo] Seeded all sample data for demo user:", userId);
    return c.json({ success: true, userId });
  } catch (e) {
    console.log("[Demo] Setup error:", e);
    return c.json({ error: "Demo setup failed", message: String(e) }, 500);
  }
});

Deno.serve(app.fetch);