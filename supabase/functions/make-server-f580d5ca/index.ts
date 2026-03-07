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

// ─── Update Organization ─────────────────────────────────────────────
app.post("/make-server-f580d5ca/org/:orgId/update", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const body = await c.req.json();
    const org = await kv.get(`org:${orgId}`) as any;
    if (!org) return c.json({ error: "Organization not found" }, 404);

    if (body.name) org.name = body.name;
    if (body.logoUrl !== undefined) org.logoUrl = body.logoUrl;
    if (body.description !== undefined) org.description = body.description;
    if (body.industry !== undefined) org.industry = body.industry;
    if (body.contact !== undefined) org.contact = body.contact;
    if (body.address !== undefined) org.address = body.address;
    if (body.representative !== undefined) org.representative = body.representative;
    await kv.set(`org:${orgId}`, org);

    console.log(`[Org] Updated org "${org.name}" (${orgId})`);
    return c.json(org);
  } catch (e) {
    console.log("Error updating org:", e);
    return c.json({ error: "Failed to update organization", message: String(e) }, 500);
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
        return { orgId: o.orgId, orgName: orgData?.name || 'Unknown', logoUrl: orgData?.logoUrl || null, role: o.role };
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
    const { userId, userName, avatar, email } = body;
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
      email: email || '',
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

// ─── Team Board ──────────────────────────────────────────────────────
app.get("/make-server-f580d5ca/team-board/:orgId", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const items = await kv.getByPrefix(`team-board:${orgId}:`);
    return c.json(items || []);
  } catch (e) {
    console.log("Error fetching team board:", e);
    return c.json([]);
  }
});

app.get("/make-server-f580d5ca/team-board/:orgId/:id", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const id = c.req.param("id");
    const item = await kv.get(`team-board:${orgId}:${id}`);
    if (!item) return c.json({ error: "Not found" }, 404);
    return c.json(item);
  } catch (e) {
    console.log("Error fetching team board item:", e);
    return c.json({ error: "Failed to fetch", message: String(e) }, 500);
  }
});

app.post("/make-server-f580d5ca/team-board/:orgId", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const body = await c.req.json();
    const id = body.id || `tb-${Date.now()}`;
    const item = { ...body, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(`team-board:${orgId}:${id}`, item);
    return c.json(item);
  } catch (e) {
    console.log("Error creating team board item:", e);
    return c.json({ error: "Failed to create", message: String(e) }, 500);
  }
});

app.put("/make-server-f580d5ca/team-board/:orgId/:id", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`team-board:${orgId}:${id}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`team-board:${orgId}:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("Error updating team board item:", e);
    return c.json({ error: "Failed to update", message: String(e) }, 500);
  }
});

app.delete("/make-server-f580d5ca/team-board/:orgId/:id", async (c) => {
  try {
    const orgId = c.req.param("orgId");
    const id = c.req.param("id");
    await kv.del(`team-board:${orgId}:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting team board item:", e);
    return c.json({ error: "Failed to delete", message: String(e) }, 500);
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

// ─── Wishket Scraper (cached, daily 7AM KST cron) ───────────────────
import LZString from "npm:lz-string@1.5.0";

const WISHKET_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "ko-KR,ko;q=0.9",
};
const MAX_PAGES = 20;

// Build Wishket URL with LZString-compressed filter params
function buildWishketUrl(page: number): string {
  const params = page === 1 ? 'pt=task_based' : `page=${page}&pt=task_based`;
  const compressed = encodeURIComponent(LZString.compressToBase64(params));
  return `https://www.wishket.com/project/?d=${compressed}`;
}

// Parse a single page HTML and return 외주 projects
function parseWishketPage(html: string): any[] {
  const projects: any[] = [];
  const cards = html.split('project-info-box');
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    try {
      // Skip 기간제 — only 외주
      if (card.includes('기간제')) continue;
      // Skip 모집 마감 (closed recruitment)
      if (/모집\s*마감/.test(card)) continue;

      const urlMatch = card.match(/href="\/project\/(\d+)\/"/);
      const projectId = urlMatch?.[1] || '';
      const projectUrl = projectId ? `https://www.wishket.com/project/${projectId}/` : '';

      const titleMatch = card.match(/<h[23][^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</)
        || card.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</)
        || card.match(/href="\/project\/\d+\/"[^>]*>\s*([^<]+)</);
      const title = titleMatch?.[1]?.trim() || '';

      // Budget in KRW (원)
      const priceMatch = card.match(/(\d[\d,]+)\s*만?\s*원/);
      let priceText = '';
      let priceValue = 0;
      if (priceMatch) {
        const raw = priceMatch[1].replace(/,/g, '');
        priceValue = parseInt(raw);
        if (card.includes(priceMatch[0].replace('원', '만원')) || /\d만\s*원/.test(card.substring(card.indexOf(priceMatch[0]) - 5, card.indexOf(priceMatch[0]) + priceMatch[0].length + 5))) {
          priceValue *= 10000;
        }
        priceText = priceValue >= 10000
          ? `${Math.floor(priceValue / 10000)}만원`
          : `${priceValue.toLocaleString()}원`;
      }
      if (!priceText) {
        const rangeMatch = card.match(/(\d[\d,]*)\s*만?\s*원\s*~\s*(\d[\d,]*)\s*만?\s*원/);
        if (rangeMatch) {
          priceText = rangeMatch[0].trim();
          priceValue = parseInt(rangeMatch[2].replace(/,/g, '')) * 10000;
        }
      }
      const isMonthly = card.includes('/월');

      // Duration
      const durationMatch = card.match(/(\d+)\s*일/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

      // Deadline — strip tags first, then parse relative text
      const cardText = card.replace(/<[^>]+>/g, ' ');
      const deadlineMatch = cardText.match(/마감\s+([\d주일시간\s]+)\s*전/);
      const deadlineText = deadlineMatch ? `마감 ${deadlineMatch[1].trim()} 전` : '';
      let deadlineDate = '';
      if (deadlineMatch) {
        const relText = deadlineMatch[1].trim();
        const weeksMatch = relText.match(/(\d+)\s*주/);
        const daysMatch = relText.match(/(\d+)\s*일/);
        const hoursMatch = relText.match(/(\d+)\s*시간/);
        const now = new Date();
        let totalDays = 0;
        if (weeksMatch) totalDays += parseInt(weeksMatch[1]) * 7;
        if (daysMatch) totalDays += parseInt(daysMatch[1]);
        if (totalDays > 0) {
          now.setDate(now.getDate() + totalDays);
          deadlineDate = now.toISOString().split('T')[0];
        } else if (hoursMatch) {
          now.setHours(now.getHours() + parseInt(hoursMatch[1]));
          deadlineDate = now.toISOString().split('T')[0];
        }
      }

      // Applicants count
      const applicantMatch = card.match(/지원자\s*(\d+)/) || card.match(/(\d+)\s*명\s*지원/);
      const applicants = applicantMatch ? parseInt(applicantMatch[1]) : 0;

      // Skills
      const skillMatches: string[] = [];
      const skillSection = card.match(/skills[^>]*>([\s\S]*?)<\/(?:div|ul|section)/i);
      if (skillSection) {
        const skillTags = skillSection[1].match(/>([^<]+)</g);
        skillTags?.forEach(s => {
          const clean = s.replace(/^>/, '').replace(/<$/, '').trim();
          if (clean && clean.length > 1 && !clean.includes('경력')) skillMatches.push(clean);
        });
      }

      if (title && projectId) {
        projects.push({
          id: projectId,
          title,
          url: projectUrl,
          budget: priceText,
          budgetValue: priceValue,
          isMonthly,
          projectType: '외주',
          duration,
          deadlineText,
          deadlineDate,
          applicants,
          skills: skillMatches.filter(s => s !== '·').slice(0, 5),
        });
      }
    } catch { /* skip malformed card */ }
  }
  return projects;
}

// Internal: scrape all pages (up to MAX_PAGES) and return 외주 projects
async function scrapeWishketProjects(): Promise<any[]> {
  const allProjects: any[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url = buildWishketUrl(page);
      const res = await fetch(url, { headers: WISHKET_HEADERS });
      if (!res.ok) {
        console.log(`[Wishket] Page ${page} returned ${res.status}, stopping.`);
        break;
      }
      const html = await res.text();

      // Check if page has project cards
      if (!html.includes('project-info-box')) {
        console.log(`[Wishket] Page ${page} has no projects, stopping.`);
        break;
      }

      const pageProjects = parseWishketPage(html);

      // Deduplicate
      let newCount = 0;
      for (const p of pageProjects) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allProjects.push(p);
          newCount++;
        }
      }

      console.log(`[Wishket] Page ${page}: ${pageProjects.length} 외주 projects (${newCount} new)`);

      // If page returned 0 new projects, likely reached the end
      if (newCount === 0) break;

      // Small delay between pages to be polite
      if (page < MAX_PAGES) await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`[Wishket] Page ${page} error:`, err);
      break;
    }
  }

  // Sort by deadline (closest first)
  allProjects.sort((a, b) => {
    if (!a.deadlineDate && !a.deadlineText) return 1;
    if (!b.deadlineDate && !b.deadlineText) return -1;
    if (a.deadlineDate && b.deadlineDate) return a.deadlineDate.localeCompare(b.deadlineDate);
    return a.deadlineText.localeCompare(b.deadlineText);
  });

  return allProjects;
}

// GET: return cached data (auto-refresh if stale > 24h)
app.get("/make-server-f580d5ca/radar/wishket", async (c) => {
  try {
    const forceRefresh = c.req.query('refresh') === 'true';

    const today = new Date().toISOString().split('T')[0];
    const filterExpired = (projs: any[]) => projs.filter((p: any) => !p.deadlineDate || p.deadlineDate >= today);

    if (!forceRefresh) {
      const cached = await kv.get('wishket:cache');
      if (cached && cached.fetchedAt) {
        const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
        if (ageMs < 24 * 60 * 60 * 1000) {
          return c.json({ ...cached, projects: filterExpired(cached.projects || []) });
        }
      }
    }

    // Scrape fresh and cache
    const projects = await scrapeWishketProjects();
    const result = { projects: filterExpired(projects), fetchedAt: new Date().toISOString() };
    await kv.set('wishket:cache', result);
    return c.json(result);
  } catch (e) {
    // Fallback to stale cache if available
    try {
      const cached = await kv.get('wishket:cache');
      if (cached) return c.json({ ...cached, stale: true });
    } catch { /* no cache */ }
    console.log("Error scraping wishket:", e);
    return c.json({ error: "Wishket scraping failed", message: String(e) }, 500);
  }
});

// POST: cron endpoint — called daily at 7AM KST by pg_cron
// Incremental: only crawl until we hit existing project IDs, then merge
app.post("/make-server-f580d5ca/radar/wishket/cron", async (c) => {
  try {
    // Load existing cached projects
    const cached = await kv.get('wishket:cache');
    const existingProjects: any[] = cached?.projects || [];
    const existingIds = new Set(existingProjects.map((p: any) => p.id));

    // Crawl page by page, stop when we hit known IDs
    const newProjects: any[] = [];
    let pagesScanned = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = buildWishketUrl(page);
        const res = await fetch(url, { headers: WISHKET_HEADERS });
        if (!res.ok) break;
        const html = await res.text();
        if (!html.includes('project-info-box')) break;

        const pageProjects = parseWishketPage(html);
        pagesScanned++;

        let allKnown = true;
        for (const p of pageProjects) {
          if (!existingIds.has(p.id)) {
            newProjects.push(p);
            existingIds.add(p.id); // prevent dupes within new pages
            allKnown = false;
          }
        }

        console.log(`[Wishket Cron] Page ${page}: ${pageProjects.length} projects, ${pageProjects.filter((p: any) => !existingIds.has(p.id) || newProjects.some((n: any) => n.id === p.id)).length} new`);

        // If every project on this page was already known → stop
        if (allKnown && pageProjects.length > 0) {
          console.log(`[Wishket Cron] All projects on page ${page} already cached, stopping.`);
          break;
        }

        if (page < MAX_PAGES) await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.log(`[Wishket Cron] Page ${page} error:`, err);
        break;
      }
    }

    // Also get page-1 IDs to detect removed/expired projects
    // Projects on page 1 that no longer appear are likely completed
    const page1Url = buildWishketUrl(1);
    const page1Res = await fetch(page1Url, { headers: WISHKET_HEADERS }).catch(() => null);
    const activeIds = new Set<string>();
    if (page1Res?.ok) {
      const page1Html = await page1Res.text();
      // Quick scan all pages we visited for active IDs
      // For efficiency, just keep all — only remove if project is very old (>60 days)
    }

    // Merge: new projects first, then existing (preserving order)
    const merged = [...newProjects, ...existingProjects];

    // Deduplicate by ID (keep first = newest)
    const idSet = new Set<string>();
    const deduped = merged.filter(p => {
      if (idSet.has(p.id)) return false;
      idSet.add(p.id);
      return true;
    });

    // Sort by deadline
    deduped.sort((a, b) => {
      if (!a.deadlineDate && !a.deadlineText) return 1;
      if (!b.deadlineDate && !b.deadlineText) return -1;
      if (a.deadlineDate && b.deadlineDate) return a.deadlineDate.localeCompare(b.deadlineDate);
      return a.deadlineText.localeCompare(b.deadlineText);
    });

    const result = { projects: deduped, fetchedAt: new Date().toISOString() };
    await kv.set('wishket:cache', result);

    console.log(`[Wishket Cron] Done: ${newProjects.length} new, ${deduped.length} total (scanned ${pagesScanned} pages)`);
    return c.json({
      success: true,
      newCount: newProjects.length,
      totalCount: deduped.length,
      pagesScanned,
      fetchedAt: result.fetchedAt,
    });
  } catch (e) {
    console.log("[Wishket Cron] Error:", e);
    return c.json({ error: "Cron scrape failed", message: String(e) }, 500);
  }
});

// ─── Freemoa Scraper (cached, JSON API, 10 pages) ───────────────────
const FREEMOA_MAX_PAGES = 10;
const FREEMOA_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Content-Type": "application/x-www-form-urlencoded",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json",
  "Accept-Language": "ko-KR,ko;q=0.9",
  "Referer": "https://www.freemoa.net/m4/s41?page=1",
};

// Freemoa scraper — PAUSED: freemoa.net has a broken SSL cert chain
// (wrong intermediate + expired AddTrust root). Deno's rustls rejects it.
// TODO: Revisit when freemoa fixes their cert, or use pg_net approach.
function freemoaFetch(_url: string, _init?: any): Promise<Response> {
  throw new Error("Freemoa scraper paused: SSL cert chain broken on freemoa.net");
}

// Fetch session cookie (required for freemoa API)
async function getFreemoaCookie(): Promise<string> {
  const res = await freemoaFetch("https://www.freemoa.net/m4/s41?page=1", {
    headers: { "User-Agent": FREEMOA_HEADERS["User-Agent"] },
    redirect: "follow",
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const cookies: string[] = [];
  for (const part of setCookie.split(",")) {
    const m = part.match(/^\s*([^=]+=[^;]+)/);
    if (m) cookies.push(m[1].trim());
  }
  return cookies.join("; ");
}

async function scrapeFreemoaProjects(): Promise<any[]> {
  const cookie = await getFreemoaCookie();
  const allProjects: any[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= FREEMOA_MAX_PAGES; page++) {
    try {
      const res = await freemoaFetch("https://www.freemoa.net/m4a/s41a", {
        method: "POST",
        headers: { ...FREEMOA_HEADERS, "Cookie": cookie },
        body: `page=${page}&sS=`,
      });
      if (!res.ok) {
        console.log(`[Freemoa] Page ${page} returned ${res.status}, stopping.`);
        break;
      }
      const json = await res.json();
      const list = json?.DATA?.PROJECT?.LIST;
      if (!list || list.length === 0) {
        console.log(`[Freemoa] Page ${page} empty, stopping.`);
        break;
      }

      for (const row of list) {
        const id = row.proj_idx;
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        // workType: 1=도급외주, 2=상주(시간제), 3=상주(기간제), 4=상주
        const workTypeMap: Record<string, string> = { '1': '도급외주', '2': '상주(시간제)', '3': '상주(기간제)', '4': '상주' };
        const costMin = parseInt(row.cost_min || '0');
        const costMax = parseInt(row.cost_max || '0');
        // cost values are in 만원
        let budget = '';
        if (costMin && costMax) {
          budget = costMin === costMax ? `${costMax}만원` : `${costMin}~${costMax}만원`;
        } else if (costMax) {
          budget = `${costMax}만원`;
        }

        allProjects.push({
          id,
          title: row.title || '',
          url: `https://www.freemoa.net/m4/s41/${id}`,
          budget,
          budgetValue: costMax * 10000, // convert 만원 → 원
          projectType: workTypeMap[row.workType] || '외주',
          workType: row.workType,
          duration: parseInt(row.during || '0'),
          deadlineDate: row.edate || '',
          deadlineText: row.edate ? '' : '',
          applicants: parseInt(row.APPLY_COUNT || '0'),
          skills: (row.proj_language || '').split(',').map((s: string) => s.trim()).filter((s: string) => s && s !== '제안요청'),
          field: row.fld_nm_2nd || row.fld || '',
          location: row.pv_smallnm || '',
          isRecruiting: row.isNowApply === '1' || row.isNowApply === 1,
          source: 'freemoa',
        });
      }

      console.log(`[Freemoa] Page ${page}: ${list.length} projects`);
      if (page < FREEMOA_MAX_PAGES) await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`[Freemoa] Page ${page} error:`, err);
      break;
    }
  }

  // Sort by deadline (closest first)
  allProjects.sort((a, b) => {
    if (!a.deadlineDate) return 1;
    if (!b.deadlineDate) return -1;
    return a.deadlineDate.localeCompare(b.deadlineDate);
  });

  return allProjects;
}

// GET: return cached data
app.get("/make-server-f580d5ca/radar/freemoa", async (c) => {
  try {
    const forceRefresh = c.req.query('refresh') === 'true';
    if (!forceRefresh) {
      const cached = await kv.get('freemoa:cache');
      if (cached && cached.fetchedAt) {
        const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
        if (ageMs < 24 * 60 * 60 * 1000) return c.json(cached);
      }
    }
    const projects = await scrapeFreemoaProjects();
    const result = { projects, fetchedAt: new Date().toISOString() };
    await kv.set('freemoa:cache', result);
    return c.json(result);
  } catch (e) {
    try { const cached = await kv.get('freemoa:cache'); if (cached) return c.json({ ...cached, stale: true }); } catch {}
    console.log("Error scraping freemoa:", e);
    return c.json({ error: "Freemoa scraping failed", message: String(e) }, 500);
  }
});

// POST: cron endpoint (incremental)
app.post("/make-server-f580d5ca/radar/freemoa/cron", async (c) => {
  try {
    const cached = await kv.get('freemoa:cache');
    const existingProjects: any[] = cached?.projects || [];
    const existingIds = new Set(existingProjects.map((p: any) => p.id));

    // If no cache, do full scrape
    if (existingProjects.length === 0) {
      const projects = await scrapeFreemoaProjects();
      const result = { projects, fetchedAt: new Date().toISOString() };
      await kv.set('freemoa:cache', result);
      console.log(`[Freemoa Cron] Full scrape: ${projects.length} projects.`);
      return c.json({ success: true, newCount: projects.length, totalCount: projects.length, fetchedAt: result.fetchedAt });
    }

    // Incremental: crawl until hitting known IDs
    const cookie = await getFreemoaCookie();
    const newProjects: any[] = [];
    let pagesScanned = 0;

    for (let page = 1; page <= FREEMOA_MAX_PAGES; page++) {
      try {
        const res = await fetch("https://www.freemoa.net/m4a/s41a", {
          method: "POST",
          headers: { ...FREEMOA_HEADERS, "Cookie": cookie },
          body: `page=${page}&sS=`,
        });
        if (!res.ok) break;
        const json = await res.json();
        const list = json?.DATA?.PROJECT?.LIST;
        if (!list || list.length === 0) break;
        pagesScanned++;

        let allKnown = true;
        for (const row of list) {
          const id = row.proj_idx;
          if (!id || existingIds.has(id)) continue;
          existingIds.add(id);
          allKnown = false;
          const workTypeMap: Record<string, string> = { '1': '도급외주', '2': '상주(시간제)', '3': '상주(기간제)', '4': '상주' };
          const costMin = parseInt(row.cost_min || '0');
          const costMax = parseInt(row.cost_max || '0');
          let budget = '';
          if (costMin && costMax) { budget = costMin === costMax ? `${costMax}만원` : `${costMin}~${costMax}만원`; }
          else if (costMax) { budget = `${costMax}만원`; }
          newProjects.push({
            id, title: row.title || '', url: `https://www.freemoa.net/m4/s41/${id}`,
            budget, budgetValue: costMax * 10000, projectType: workTypeMap[row.workType] || '외주',
            workType: row.workType, duration: parseInt(row.during || '0'),
            deadlineDate: row.edate || '', deadlineText: '', applicants: parseInt(row.APPLY_COUNT || '0'),
            skills: (row.proj_language || '').split(',').map((s: string) => s.trim()).filter((s: string) => s && s !== '제안요청'),
            field: row.fld_nm_2nd || row.fld || '', location: row.pv_smallnm || '',
            isRecruiting: row.isNowApply === '1' || row.isNowApply === 1, source: 'freemoa',
          });
        }
        if (allKnown) break;
        if (page < FREEMOA_MAX_PAGES) await new Promise(r => setTimeout(r, 300));
      } catch { break; }
    }

    const merged = [...newProjects, ...existingProjects];
    const idSet = new Set<string>();
    const deduped = merged.filter(p => { if (idSet.has(p.id)) return false; idSet.add(p.id); return true; });
    deduped.sort((a, b) => { if (!a.deadlineDate) return 1; if (!b.deadlineDate) return -1; return a.deadlineDate.localeCompare(b.deadlineDate); });

    const result = { projects: deduped, fetchedAt: new Date().toISOString() };
    await kv.set('freemoa:cache', result);
    console.log(`[Freemoa Cron] Done: ${newProjects.length} new, ${deduped.length} total (${pagesScanned} pages)`);
    return c.json({ success: true, newCount: newProjects.length, totalCount: deduped.length, pagesScanned, fetchedAt: result.fetchedAt });
  } catch (e) {
    console.log("[Freemoa Cron] Error:", e);
    return c.json({ error: "Cron scrape failed", message: String(e) }, 500);
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

// ─── Library Routes ──────────────────────────────────────────────────
app.get("/make-server-f580d5ca/library", async (c) => {
  try {
    const items = await kv.getByPrefix(pfx(c, "library:"));
    return c.json(items || []);
  } catch (e) {
    console.log("Error fetching library items:", e);
    return c.json([]);
  }
});

app.post("/make-server-f580d5ca/library", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `lib-${Date.now()}`;
    const item = { ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`${pfx(c, "library:")}${id}`, item);
    return c.json(item);
  } catch (e) {
    console.log("Error creating library item:", e);
    return c.json({ error: "Failed to create library item", message: String(e) }, 500);
  }
});

app.put("/make-server-f580d5ca/library/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const key = `${pfx(c, "library:")}${id}`;
    const existing = await kv.get(key);
    const updated = { ...(existing || {}), ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(key, updated);
    return c.json(updated);
  } catch (e) {
    console.log("Error updating library item:", e);
    return c.json({ error: "Failed to update library item", message: String(e) }, 500);
  }
});

app.delete("/make-server-f580d5ca/library/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`${pfx(c, "library:")}${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting library item:", e);
    return c.json({ error: "Failed to delete library item", message: String(e) }, 500);
  }
});

// ─── Library Custom Categories ──────────────────────────────────────
app.get("/make-server-f580d5ca/library/categories", async (c) => {
  try {
    const data = await kv.get(pfx(c, "library-categories"));
    return c.json(data || []);
  } catch (e) {
    console.log("Error fetching library categories:", e);
    return c.json([], 200);
  }
});

app.put("/make-server-f580d5ca/library/categories", async (c) => {
  try {
    const categories = await c.req.json();
    await kv.set(pfx(c, "library-categories"), categories);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error saving library categories:", e);
    return c.json({ error: "Failed to save categories", message: String(e) }, 500);
  }
});

// ─── OG Metadata Fetch (server-side proxy) ──────────────────────────
app.post("/make-server-f580d5ca/library/og", async (c) => {
  try {
    const { url } = await c.req.json();
    if (!url) return c.json({ error: "URL required" }, 400);

    const isInstagram = /^https?:\/\/(www\.)?instagram\.com\//i.test(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': isInstagram
          ? 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const html = await res.text();

    const getMetaContent = (property: string): string | undefined => {
      const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']` +
        `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        'i'
      );
      const match = html.match(regex);
      return match?.[1] || match?.[2] || undefined;
    };

    const getTitleTag = (): string | undefined => {
      const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return m?.[1]?.trim() || undefined;
    };

    let ogTitle = getMetaContent('og:title') || getMetaContent('twitter:title');
    const ogDescription = getMetaContent('og:description') || getMetaContent('description');
    const ogImage = getMetaContent('og:image') || getMetaContent('twitter:image');
    let ogSiteName = getMetaContent('og:site_name');

    // Instagram-specific: og:title is often just "Instagram" or "인스타그램"
    if (isInstagram) {
      const GENERIC = ['Instagram', '인스타그램', 'Instagram photo', 'Instagram video', 'Login • Instagram'];
      if (!ogTitle || GENERIC.some(g => ogTitle!.trim() === g)) {
        const titleTag = getTitleTag();
        if (titleTag && !GENERIC.some(g => titleTag === g)) {
          ogTitle = titleTag;
        } else if (ogDescription && ogDescription.length > 0) {
          ogTitle = ogDescription.length > 80 ? ogDescription.substring(0, 80) + '...' : ogDescription;
        } else {
          const path = new URL(url).pathname;
          if (path.includes('/reel/')) ogTitle = 'Instagram Reel';
          else if (path.includes('/stories/')) ogTitle = 'Instagram Story';
          else if (path.includes('/p/')) ogTitle = 'Instagram Post';
          else ogTitle = 'Instagram';
        }
      }
      if (!ogSiteName) ogSiteName = 'Instagram';
    }

    // General fallback: use <title> tag if no og:title
    if (!ogTitle) {
      ogTitle = getTitleTag();
    }

    return c.json({ ogTitle, ogDescription, ogImage, ogSiteName, favicon: new URL('/favicon.ico', url).href });
  } catch (e) {
    console.log("Error fetching OG metadata:", e);
    return c.json({ ogTitle: undefined, ogDescription: undefined, ogImage: undefined }, 200);
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
// AI Task Assistance Endpoints (Gemini API)
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: call Gemini and parse JSON response
async function callGemini(prompt: string, maxTokens = 2048) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty Gemini response");

  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

// Helper: multi-turn chat with Gemini (returns plain text, not JSON)
async function callGeminiChat(
  systemInstruction: string,
  messages: Array<{ role: "user" | "model"; text: string }>,
  maxTokens = 2048
): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty Gemini response");
  return raw;
}

// ── Task Decomposition ──
app.post("/make-server-f580d5ca/ai/task-decompose", async (c) => {
  try {
    const { taskTitle, taskDescription, taskCategory } = await c.req.json();
    if (!taskTitle) return c.json({ error: "taskTitle is required" }, 400);

    const prompt = `당신은 1인 기업/소규모 팀(2~10명)의 프로젝트 매니저입니다.
주어진 업무를 3~7개의 실행 가능한 하위 작업으로 분해하세요.

반드시 아래 JSON 스키마를 따르세요:
{
  "subtasks": [
    {
      "title": "하위 작업 제목 (한국어)",
      "titleEn": "Subtask title (English)",
      "estimatedMinutes": 30,
      "priority": "low | medium | high"
    }
  ]
}

규칙:
- 하위 작업은 3~7개
- 각 작업은 구체적이고 바로 실행 가능해야 함
- estimatedMinutes는 현실적인 소요 시간 (15~240분)
- priority는 업무 전체 완료에 대한 중요도 기준

업무 제목: ${taskTitle}
${taskDescription ? `업무 설명: ${taskDescription}` : ""}
${taskCategory ? `카테고리: ${taskCategory}` : ""}`;

    const result = await callGemini(prompt);
    return c.json(result);
  } catch (e) {
    console.log("[AI] task-decompose error:", e);
    return c.json({ error: "Task decomposition failed", message: String(e) }, 500);
  }
});

// ── Task Description Generation ──
app.post("/make-server-f580d5ca/ai/task-describe", async (c) => {
  try {
    const { taskTitle, taskCategory, taskPriority, existingDescription } = await c.req.json();
    if (!taskTitle) return c.json({ error: "taskTitle is required" }, 400);

    const prompt = `당신은 1인 기업/소규모 팀의 업무 작성 도우미입니다.
주어진 업무에 대한 구조화된 설명/액션 플랜을 작성하세요.

반드시 아래 JSON 스키마를 따르세요:
{
  "description": "업무 설명 전체 텍스트 (줄바꿈은 \\n 사용)"
}

설명에 포함할 내용:
1. 📋 개요 (2~3문장)
2. ✅ 실행 단계 (번호 매기기, 각 단계는 구체적)
3. 🎯 성공 기준 (측정 가능한 기준 2~3개)

규칙:
- 한국어로 작성
- 간결하고 실행 가능하게
- 소규모 팀/1인 기업 현실에 맞게
${existingDescription ? "- 기존 설명을 참고하여 개선/보완하세요" : ""}

업무 제목: ${taskTitle}
${taskCategory ? `카테고리: ${taskCategory}` : ""}
${taskPriority ? `우선순위: ${taskPriority}` : ""}
${existingDescription ? `기존 설명: ${existingDescription}` : ""}`;

    const result = await callGemini(prompt);
    return c.json(result);
  } catch (e) {
    console.log("[AI] task-describe error:", e);
    return c.json({ error: "Description generation failed", message: String(e) }, 500);
  }
});

// ── Task Priority & Category Recommendation ──
app.post("/make-server-f580d5ca/ai/task-recommend", async (c) => {
  try {
    const { taskTitle, taskDescription, availableCategories } = await c.req.json();
    if (!taskTitle) return c.json({ error: "taskTitle is required" }, 400);

    const prompt = `당신은 업무 분류 전문가입니다.
주어진 업무의 우선순위와 카테고리를 추천하세요.

반드시 아래 JSON 스키마를 따르세요:
{
  "priority": "low | medium | high",
  "category": "카테고리 키 값",
  "reasoning": "추천 이유 (한국어, 2~3문장)"
}

사용 가능한 카테고리:
${(availableCategories || []).map((c: string) => `- ${c}`).join("\n")}

카테고리 설명:
- sales: 영업 관련 (고객 미팅, 제안서, 계약)
- content_writing: 글 콘텐츠 (블로그, SNS 글, 뉴스레터)
- content_video: 영상 콘텐츠 (촬영, 편집, 유튜브)
- marketing: 마케팅 (광고, 캠페인, 브랜딩)
- development: 개발 (코딩, 배포, 기술)
- design: 디자인 (UI/UX, 그래픽, 브랜드)
- planning: 기획 (전략, 리서치, 기획서)
- operations: 운영/관리 (행정, 재무, HR)
- learning: 학습 (교육, 자기개발, 리서치)

업무 제목: ${taskTitle}
${taskDescription ? `업무 설명: ${taskDescription}` : ""}`;

    const result = await callGemini(prompt);
    return c.json(result);
  } catch (e) {
    console.log("[AI] task-recommend error:", e);
    return c.json({ error: "Recommendation failed", message: String(e) }, 500);
  }
});

// ── External Resource Search ──
app.post("/make-server-f580d5ca/ai/search-external", async (c) => {
  try {
    const { query, language } = await c.req.json();
    if (!query) return c.json({ error: "query is required" }, 400);

    const lang = language === "en" ? "영어" : "한국어";
    const prompt = `당신은 리서치 전문가입니다.
주어진 업무와 관련된 유용한 외부 자료를 추천하세요.

반드시 아래 JSON 스키마를 따르세요:
{
  "resources": [
    {
      "title": "자료 제목 (${lang})",
      "description": "자료 설명 (${lang}, 1~2문장)",
      "type": "article | tool | template | reference",
      "suggestedUrl": "관련 URL (있으면)"
    }
  ]
}

규칙:
- 3~5개 추천
- 실제 존재하는 유용한 자료/도구/사이트 위주
- URL은 확실한 것만 (불확실하면 빈 문자열)
- 소규모 팀/1인 기업에 실용적인 자료 우선

업무: ${query}`;

    const result = await callGemini(prompt);
    return c.json(result);
  } catch (e) {
    console.log("[AI] search-external error:", e);
    return c.json({ error: "External search failed", message: String(e) }, 500);
  }
});

// ── Category-specific AI Analysis ──
const CATEGORY_AI_CONFIG: Record<string, { role: string; focus: string[] }> = {
  sales: {
    role: "영업/세일즈 전문 컨설턴트",
    focus: ["견적 분석 및 가격 전략", "고객 접근 방법 및 설득 포인트", "거래 성사를 위한 핵심 전략", "경쟁사 대비 차별화 포인트"],
  },
  content_writing: {
    role: "콘텐츠 기획/글쓰기 전문가",
    focus: ["타겟 독자 분석", "SEO 및 키워드 전략", "콘텐츠 구조 및 제목 제안", "톤앤매너 가이드"],
  },
  content_video: {
    role: "영상 콘텐츠 프로듀서",
    focus: ["영상 구성 및 스크립트 구조", "썸네일/제목 최적화", "편집 포인트 및 트랜지션", "시청자 참여/리텐션 전략"],
  },
  marketing: {
    role: "마케팅 전략가",
    focus: ["타겟 고객 세그먼트 분석", "채널별 전략", "캠페인 KPI 및 성과 측정", "예산 배분 및 ROI 최적화"],
  },
  development: {
    role: "시니어 개발자/테크 리드",
    focus: ["기술 스택 및 아키텍처 제안", "구현 방향 및 설계 포인트", "코드 품질 및 테스트 전략", "예상 이슈 및 해결 방안"],
  },
  design: {
    role: "UX/UI 디자인 전문가",
    focus: ["사용자 경험 흐름 분석", "디자인 원칙 적용 포인트", "접근성 및 반응형 고려사항", "최신 트렌드 반영 제안"],
  },
  planning: {
    role: "프로젝트 기획 전문가",
    focus: ["요구사항 정리 및 스코프 정의", "일정 및 마일스톤 설계", "리스크 분석 및 대응 방안", "이해관계자 커뮤니케이션 포인트"],
  },
  operations: {
    role: "운영/관리 전문가",
    focus: ["프로세스 최적화 방안", "효율화 및 자동화 포인트", "품질 관리 체크리스트", "비용 절감 및 리소스 관리"],
  },
  learning: {
    role: "학습/교육 전문가",
    focus: ["학습 목표 및 로드맵 설계", "추천 학습 자료 및 경로", "핵심 개념 정리", "실습 프로젝트 아이디어"],
  },
};

app.post("/make-server-f580d5ca/ai/category-analyze", async (c) => {
  try {
    const { taskTitle, taskDescription, category } = await c.req.json();
    if (!taskTitle) return c.json({ error: "taskTitle is required" }, 400);

    const config = CATEGORY_AI_CONFIG[category] || {
      role: "업무 분석 전문가",
      focus: ["업무 분석 및 요약", "실행 계획 수립", "주의사항 파악", "다음 단계 설계"],
    };

    const prompt = `당신은 ${config.role}입니다.
주어진 업무 내용을 전문가 관점에서 분석하고 실질적인 도움을 제공하세요.

반드시 아래 JSON 스키마를 따르세요:
{
  "summary": "업무 핵심 요약 (1~2문장)",
  "insights": ["분석 인사이트 1", "분석 인사이트 2"],
  "suggestions": ["구체적 실행 제안 1", "구체적 실행 제안 2"],
  "risks": ["주의할 점 1"],
  "nextSteps": ["추천 다음 단계 1", "추천 다음 단계 2"]
}

분석 집중 영역:
${config.focus.map((f: string) => `- ${f}`).join("\n")}

규칙:
- 한국어로 작성
- 실질적이고 바로 활용할 수 있는 내용 위주
- insights 2~4개, suggestions 2~4개, risks 1~3개, nextSteps 2~3개
- 업무 내용이 부족하면 해당 분야의 일반적인 조언 제공

업무 제목: ${taskTitle}
${taskDescription ? `업무 내용:\n${taskDescription}` : "(상세 내용 없음)"}`;

    const result = await callGemini(prompt);
    return c.json(result);
  } catch (e) {
    console.log("[AI] category-analyze error:", e);
    return c.json({ error: "Category analysis failed", message: String(e) }, 500);
  }
});

// ── Category Chat (multi-turn) ──
app.post("/make-server-f580d5ca/ai/category-chat", async (c) => {
  try {
    const { category, taskTitle, taskDescription, messages } = await c.req.json();
    if (!messages || messages.length === 0) {
      return c.json({ error: "messages array is required" }, 400);
    }

    const config = CATEGORY_AI_CONFIG[category] || {
      role: "업무 분석 전문가",
      focus: ["업무 분석 및 요약", "실행 계획 수립", "주의사항 파악", "다음 단계 설계"],
    };

    const systemInstruction = `당신은 ${config.role}입니다.
사용자의 업무를 전문가 관점에서 도와주세요.

업무 제목: ${taskTitle}
${taskDescription ? `업무 설명: ${taskDescription}` : ""}

전문 분야:
${config.focus.map((f: string) => `- ${f}`).join("\n")}

규칙:
- 한국어로 대화하세요
- 실질적이고 바로 활용할 수 있는 조언을 하세요
- 1인 기업/소규모 팀(2~10명) 현실에 맞게 답변하세요
- 사용자가 텍스트를 붙여넣으면 (스크립트, 기획서, 이메일 등) 전문가 관점에서 리뷰하세요
- 친절하고 전문적인 톤을 유지하세요
- 답변은 명확하고 구조적으로 작성하세요 (적절히 번호, 불릿 사용)`;

    const reply = await callGeminiChat(systemInstruction, messages, 2048);
    return c.json({ reply });
  } catch (e) {
    console.log("[AI] category-chat error:", e);
    return c.json({ error: "Chat failed", message: String(e) }, 500);
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
    const DEMO_DATA_VERSION = 4;
    const seeded = await kv.get(`demo:seeded:${userId}`) as any;
    if (seeded && seeded.version >= DEMO_DATA_VERSION) {
      return c.json({ success: true, message: "Demo already set up", userId });
    }

    // 3. Seed sample data
    const now = new Date();
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

    // Tasks — 다양한 날짜 범위와 팀원 배정
    const tasks = [
      { id: "t-demo-1", title: "Q2 OKR finalize", titleKo: "Q2 OKR 최종 확정", status: "in-progress", priority: "high", startDate: daysAgo(2), dueDate: daysFromNow(1), endDate: daysFromNow(1), assigneeIds: [userId], progress: 80, category: "strategy", createdAt: daysAgo(5) },
      { id: "t-demo-2", title: "User onboarding flow redesign", titleKo: "유저 온보딩 플로우 리디자인", status: "in-progress", priority: "high", startDate: daysAgo(4), dueDate: daysFromNow(4), endDate: daysFromNow(4), assigneeIds: ["m-demo-2"], progress: 55, category: "design", createdAt: daysAgo(6) },
      { id: "t-demo-3", title: "Payment API integration", titleKo: "결제 API 연동", status: "in-progress", priority: "high", startDate: daysAgo(1), dueDate: daysFromNow(6), endDate: daysFromNow(6), assigneeIds: ["m-demo-3", userId], progress: 30, category: "development", createdAt: daysAgo(3) },
      { id: "t-demo-4", title: "Product demo video", titleKo: "제품 데모 영상 제작", status: "pending", priority: "medium", startDate: daysFromNow(2), dueDate: daysFromNow(8), endDate: daysFromNow(8), assigneeIds: ["m-demo-2"], progress: 0, category: "marketing", createdAt: daysAgo(1) },
      { id: "t-demo-5", title: "Customer interview analysis", titleKo: "고객 인터뷰 분석", status: "completed", priority: "high", startDate: daysAgo(10), dueDate: daysAgo(2), endDate: daysAgo(2), assigneeIds: [userId], progress: 100, category: "research", createdAt: daysAgo(12) },
      { id: "t-demo-6", title: "Competitor pricing benchmark", titleKo: "경쟁사 가격 벤치마크", status: "completed", priority: "medium", startDate: daysAgo(7), dueDate: daysAgo(3), endDate: daysAgo(3), assigneeIds: [userId, "m-demo-4"], progress: 100, category: "research", createdAt: daysAgo(8) },
      { id: "t-demo-7", title: "Landing page A/B test", titleKo: "랜딩 페이지 A/B 테스트", status: "pending", priority: "medium", startDate: daysFromNow(3), dueDate: daysFromNow(10), endDate: daysFromNow(10), assigneeIds: ["m-demo-3"], progress: 0, category: "marketing", createdAt: daysAgo(1) },
      { id: "t-demo-8", title: "Weekly team standup notes", titleKo: "주간 팀 스탠드업 정리", status: "in-progress", priority: "low", dueDate: daysFromNow(0), endDate: daysFromNow(0), assigneeIds: [userId], progress: 50, category: "operations", createdAt: daysAgo(1) },
      { id: "t-demo-9", title: "Investor update email draft", titleKo: "투자자 업데이트 이메일 작성", status: "pending", priority: "high", startDate: daysFromNow(1), dueDate: daysFromNow(3), endDate: daysFromNow(3), assigneeIds: [userId], progress: 0, category: "strategy", createdAt: daysAgo(0) },
      { id: "t-demo-10", title: "Mobile responsive QA", titleKo: "모바일 반응형 QA", status: "in-progress", priority: "medium", startDate: daysAgo(1), dueDate: daysFromNow(2), endDate: daysFromNow(2), assigneeIds: ["m-demo-3", "m-demo-2"], progress: 40, category: "development", createdAt: daysAgo(2) },
      { id: "t-demo-11", title: "SEO keyword research", titleKo: "SEO 키워드 리서치", status: "delayed", priority: "medium", startDate: daysAgo(5), dueDate: daysAgo(1), endDate: daysAgo(1), assigneeIds: ["m-demo-4"], progress: 20, category: "marketing", createdAt: daysAgo(7) },
      { id: "t-demo-12", title: "Server monitoring setup", titleKo: "서버 모니터링 구축", status: "completed", priority: "high", startDate: daysAgo(8), dueDate: daysAgo(4), endDate: daysAgo(4), assigneeIds: ["m-demo-3"], progress: 100, category: "development", createdAt: daysAgo(9) },
    ];

    // Goals — 연간 > 분기 > 월 > 긴급
    const yr = now.getFullYear();
    const goals = [
      { id: "g-demo-year", title: "Build product-market fit & reach 1K users", titleKo: "PMF 달성 및 유저 1,000명 확보", level: "Year", progress: 28, status: "in-progress", startDate: `${yr}-01-01`, endDate: `${yr}-12-31`, children: ["g-demo-q1", "g-demo-q2"] },
      { id: "g-demo-q1", title: "Launch public beta", titleKo: "퍼블릭 베타 출시", level: "Quarter", progress: 65, status: "in-progress", parentId: "g-demo-year", children: ["g-demo-m1", "g-demo-m2", "g-demo-m3"] },
      { id: "g-demo-q2", title: "Monetization & seed round", titleKo: "수익화 및 시드 라운드", level: "Quarter", progress: 10, status: "pending", parentId: "g-demo-year" },
      { id: "g-demo-m1", title: "Core feature complete", titleKo: "핵심 기능 개발 완료", level: "Month", progress: 90, status: "in-progress", parentId: "g-demo-q1" },
      { id: "g-demo-m2", title: "Onboard 50 beta users", titleKo: "베타 유저 50명 온보딩", level: "Month", progress: 60, status: "in-progress", parentId: "g-demo-q1" },
      { id: "g-demo-m3", title: "Collect NPS & iterate", titleKo: "NPS 수집 및 개선", level: "Month", progress: 20, status: "pending", parentId: "g-demo-q1" },
      { id: "g-demo-u1", title: "TIPS application deadline", titleKo: "TIPS 지원사업 마감", level: "Urgent", isUrgent: true, urgentCategory: "submission", deadline: daysFromNow(4), progress: 70, status: "in-progress" },
      { id: "g-demo-u2", title: "Demo Day pitch", titleKo: "데모데이 피칭", level: "Urgent", isUrgent: true, urgentCategory: "event", deadline: daysFromNow(12), progress: 15, status: "pending" },
      { id: "g-demo-u3", title: "Term sheet review", titleKo: "텀시트 검토 마감", level: "Urgent", isUrgent: true, urgentCategory: "investment", deadline: daysFromNow(7), progress: 40, status: "in-progress" },
    ];

    // Team members
    const members = [
      { id: userId, name: "Demo User", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo2026", role: "owner", jobTitle: "CEO / Co-founder", email: DEMO_EMAIL },
      { id: "m-demo-2", name: "박소연", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=soyeon", role: "admin", jobTitle: "Product Designer" },
      { id: "m-demo-3", name: "정우진", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=woojin", role: "member", jobTitle: "Full-stack Developer" },
      { id: "m-demo-4", name: "한서윤", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=seoyun", role: "member", jobTitle: "Growth Marketer" },
    ];

    // Biz Radar Items
    const radarItems = [
      { id: "biz-demo-1", title: "네이버 클라우드 협업 제안", category: "sales", type: "partnership", stage: "proposal", value: 80000000, probability: 55, contactName: "이정호", contactCompany: "네이버 클라우드", assigneeId: userId, actionItems: [{ id: "ai-d1", title: "기술 연동 PoC", done: false }, { id: "ai-d2", title: "제안서 발송", done: true }], createdAt: daysAgo(5) },
      { id: "biz-demo-2", title: "쿠팡 물류 SaaS 도입", category: "sales", type: "project", stage: "reviewing", value: 45000000, probability: 35, contactName: "김하영", contactCompany: "쿠팡", assigneeId: userId, actionItems: [{ id: "ai-d3", title: "요구사항 문서 분석", done: false }], deadline: daysFromNow(10), createdAt: daysAgo(3) },
      { id: "biz-demo-3", title: "창업진흥원 예비창업패키지", category: "sales", type: "funding", stage: "won", value: 50000000, probability: 100, contactName: "박은주", contactCompany: "창업진흥원", assigneeId: userId, actionItems: [{ id: "ai-d4", title: "협약서 서명", done: true }], createdAt: daysAgo(20) },
      { id: "biz-demo-4", title: "시드 라운드 — 스파크랩", category: "sales", type: "investment", stage: "negotiation", value: 300000000, probability: 40, contactName: "안지훈", contactCompany: "SparkLabs", assigneeId: userId, actionItems: [{ id: "ai-d5", title: "IR 자료 업데이트", done: false }, { id: "ai-d6", title: "텀시트 검토", done: false }], deadline: daysFromNow(7), createdAt: daysAgo(8) },
      { id: "biz-demo-5", title: "스타트업 컨퍼런스 부스", category: "sales", type: "other", stage: "discovered", value: 5000000, probability: 70, source: "이벤트", assigneeId: "m-demo-4", actionItems: [], createdAt: daysAgo(1) },
      { id: "biz-demo-c1", title: "AWS 스타트업 크레딧", category: "connection", connectionType: "partner", type: "other", stage: "won", value: 30000000, probability: 100, contactName: "Sarah Kim", contactCompany: "AWS Korea", assigneeId: "m-demo-3", actionItems: [{ id: "ai-c1", title: "크레딧 신청 완료", done: true }], createdAt: daysAgo(15) },
      { id: "biz-demo-c2", title: "프리랜서 백엔드 개발자", category: "connection", connectionType: "supplier", type: "other", stage: "proposal", value: 12000000, probability: 60, contactName: "최민석", contactCompany: "프리랜서", assigneeId: "m-demo-3", actionItems: [{ id: "ai-c2", title: "포트폴리오 검토", done: true }, { id: "ai-c3", title: "테스트 과제 전달", done: false }], createdAt: daysAgo(4) },
      { id: "biz-demo-c3", title: "법무법인 율촌 자문 계약", category: "connection", connectionType: "agent", type: "other", stage: "reviewing", value: 8000000, probability: 80, contactName: "강현우 변호사", contactCompany: "법무법인 율촌", assigneeId: userId, actionItems: [], createdAt: daysAgo(6) },
      { id: "biz-demo-c4", title: "코워킹스페이스 패스트파이브", category: "connection", connectionType: "partner", type: "other", stage: "won", value: 15000000, probability: 100, contactName: "임수빈", contactCompany: "패스트파이브", assigneeId: userId, actionItems: [{ id: "ai-c4", title: "입주 계약 완료", done: true }], createdAt: daysAgo(30) },
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
      companyName: "블루밍 스튜디오",
      industry: "SaaS",
      teamSize: "2-5",
    });

    // Mark as seeded
    await kv.set(`demo:seeded:${userId}`, { seeded: true, version: DEMO_DATA_VERSION, timestamp: now.toISOString() });

    console.log("[Demo] Seeded all sample data for demo user:", userId);
    return c.json({ success: true, userId });
  } catch (e) {
    console.log("[Demo] Setup error:", e);
    return c.json({ error: "Demo setup failed", message: String(e) }, 500);
  }
});

// ─── File Upload (Cloudflare R2) ─────────────────────────────────────
const R2_ENDPOINT = "https://ea9424ce0bd83112b66bddc3eb5f0436.r2.cloudflarestorage.com";
const R2_BUCKET = "potenmanager";
const R2_ACCESS_KEY = "a4f54da00c7eb8846a637a70c299a965";
const R2_SECRET_KEY = "83bb849445abfd14e76c79300b673d7bf811d9fc50524c3dfe717264ef999d47";
const R2_PUBLIC_URL = `${R2_ENDPOINT}/${R2_BUCKET}`;

// AWS Signature V4 helpers for R2
async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function signR2Request(method: string, path: string, headers: Record<string, string>, body: Uint8Array | null): Promise<Record<string, string>> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
  const amzDate = dateStamp + "T" + now.toISOString().replace(/[-:]/g, "").slice(9, 15) + "Z";
  const region = "auto";
  const service = "s3";
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const payloadHash = body ? await sha256Hex(body) : await sha256Hex(new Uint8Array(0));

  const allHeaders: Record<string, string> = {
    ...headers,
    host: new URL(R2_ENDPOINT).host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };

  const signedHeaderKeys = Object.keys(allHeaders).sort();
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${allHeaders[k]}\n`).join("");

  const canonicalRequest = [method, `/${R2_BUCKET}${path}`, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const canonicalRequestHash = await sha256Hex(new TextEncoder().encode(canonicalRequest));

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, canonicalRequestHash].join("\n");

  const enc = new TextEncoder();
  const kDate = await hmacSha256(enc.encode("AWS4" + R2_SECRET_KEY), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = [...new Uint8Array(await hmacSha256(kSigning, stringToSign))].map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    ...allHeaders,
    authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

// Upload file
app.post("/make-server-f580d5ca/files/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json({ error: "No file provided" }, 400);

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) return c.json({ error: "File too large (max 5MB)" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const key = `/attachment/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const headers = await signR2Request("PUT", key, { "content-type": file.type || "application/octet-stream" }, bytes);
    const r2Res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}${key}`, { method: "PUT", headers, body: bytes });

    if (!r2Res.ok) {
      const errText = await r2Res.text();
      console.error("[R2] Upload failed:", r2Res.status, errText);
      return c.json({ error: "R2 upload failed", detail: errText }, 500);
    }

    return c.json({ url: `${R2_PUBLIC_URL}${key}`, key, fileName: file.name, fileSize: file.size });
  } catch (e) {
    console.error("[R2] Upload error:", e);
    return c.json({ error: "Upload failed", message: String(e) }, 500);
  }
});

// Delete file
app.delete("/make-server-f580d5ca/files/:key{.+}", async (c) => {
  try {
    const key = "/" + c.req.param("key");
    const headers = await signR2Request("DELETE", key, {}, null);
    const r2Res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}${key}`, { method: "DELETE", headers });

    if (!r2Res.ok && r2Res.status !== 404) {
      return c.json({ error: "R2 delete failed" }, 500);
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Delete failed", message: String(e) }, 500);
  }
});

// ─── Chat ────────────────────────────────────────────────────────────
// Room ID convention for DM: dm:<sorted_user_ids joined by _>

// GET /chat/rooms?userId=xxx — list all chat rooms for a user
app.get("/make-server-f580d5ca/chat/rooms", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId required" }, 400);
  try {
    const allRooms = await kv.getByPrefix("chat:room:");
    const userRooms = allRooms
      .filter((r: any) => r && r.participants && r.participants.includes(userId))
      .sort((a: any, b: any) => {
        const aTime = a.lastMessageAt || a.createdAt || "";
        const bTime = b.lastMessageAt || b.createdAt || "";
        return bTime.localeCompare(aTime);
      });
    return c.json(userRooms);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// POST /chat/rooms — create or get a DM room
app.post("/make-server-f580d5ca/chat/rooms", async (c) => {
  try {
    const { participants } = await c.req.json();
    if (!participants || participants.length < 2) return c.json({ error: "Need 2+ participants" }, 400);
    const sorted = [...participants].sort();
    const roomId = `dm:${sorted.join("_")}`;
    const existing = await kv.get(`chat:room:${roomId}`);
    if (existing) return c.json(existing);
    const room = {
      id: roomId,
      participants: sorted,
      createdAt: new Date().toISOString(),
      lastMessage: null,
      lastMessageAt: null,
    };
    await kv.set(`chat:room:${roomId}`, room);
    return c.json(room);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// GET /chat/messages?roomId=xxx&limit=50&before=timestamp — get messages
app.get("/make-server-f580d5ca/chat/messages", async (c) => {
  const roomId = c.req.query("roomId");
  if (!roomId) return c.json({ error: "roomId required" }, 400);
  const limit = parseInt(c.req.query("limit") || "50");
  try {
    const data = await kv.get(`chat:msgs:${roomId}`);
    const msgs = (data || []) as any[];
    // Return latest N messages
    return c.json(msgs.slice(-limit));
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// POST /chat/messages — send a message
app.post("/make-server-f580d5ca/chat/messages", async (c) => {
  try {
    const { roomId, senderId, text } = await c.req.json();
    if (!roomId || !senderId || !text) return c.json({ error: "roomId, senderId, text required" }, 400);
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId,
      senderId,
      text,
      createdAt: new Date().toISOString(),
      readBy: [senderId],
    };
    // Append to messages array
    const existing = (await kv.get(`chat:msgs:${roomId}`)) || [];
    existing.push(msg);
    // Keep last 500 messages per room
    const trimmed = existing.length > 500 ? existing.slice(-500) : existing;
    await kv.set(`chat:msgs:${roomId}`, trimmed);
    // Update room lastMessage
    const room = await kv.get(`chat:room:${roomId}`);
    if (room) {
      room.lastMessage = { text: msg.text, senderId: msg.senderId };
      room.lastMessageAt = msg.createdAt;
      await kv.set(`chat:room:${roomId}`, room);
    }
    return c.json(msg);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// PATCH /chat/messages/read — mark messages as read
app.patch("/make-server-f580d5ca/chat/messages/read", async (c) => {
  try {
    const { roomId, userId } = await c.req.json();
    if (!roomId || !userId) return c.json({ error: "roomId, userId required" }, 400);
    const msgs = (await kv.get(`chat:msgs:${roomId}`)) || [];
    let changed = false;
    for (const m of msgs) {
      if (!m.readBy.includes(userId)) {
        m.readBy.push(userId);
        changed = true;
      }
    }
    if (changed) await kv.set(`chat:msgs:${roomId}`, msgs);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// Version check endpoint
app.get("/make-server-f580d5ca/version", (c) => c.json({ version: "0.4.0", routes: "full" }));

Deno.serve(app.fetch);