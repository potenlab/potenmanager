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
    const tasks = await kv.getByPrefix("task:");
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
    const goals = await kv.getByPrefix("goal:");
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
    const members = await kv.getByPrefix("member:");
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

    // Also map user → org
    await kv.set(`user-org:${ownerId}`, { orgId, role: 'owner', joinedAt: new Date().toISOString() });

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
    if (!userOrg || !userOrg.orgId) {
      return c.json({ org: null });
    }
    const org = await kv.get(`org:${userOrg.orgId}`);
    return c.json({ org, userRole: userOrg.role });
  } catch (e) {
    console.log("Error fetching user org:", e);
    return c.json({ org: null });
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

    // Map user → org
    await kv.set(`user-org:${userId}`, { orgId: invite.orgId, role: invite.role || 'member', joinedAt: new Date().toISOString() });

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

      // Map user → org
      await kv.set(`user-org:${userId}`, { orgId, role: jr.requestedRole || 'member', joinedAt: new Date().toISOString() });

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

// ─── Opportunity Routes ──────────────────────────────────────────────
app.get("/make-server-f580d5ca/opportunities", async (c) => {
  try {
    const opportunities = await kv.getByPrefix("opportunity:");
    return c.json(opportunities || []);
  } catch (e) {
    console.log("Error fetching opportunities:", e);
    return c.json([]);
  }
});

app.post("/make-server-f580d5ca/opportunities", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `opp-${Date.now()}`;
    const opp = { ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`opportunity:${id}`, opp);
    return c.json(opp);
  } catch (e) {
    console.log("Error creating opportunity:", e);
    return c.json({ error: "Failed to create opportunity", message: String(e) }, 500);
  }
});

app.put("/make-server-f580d5ca/opportunities/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`opportunity:${id}`);
    const updated = { ...(existing || {}), ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`opportunity:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    console.log("Error updating opportunity:", e);
    return c.json({ error: "Failed to update opportunity", message: String(e) }, 500);
  }
});

app.delete("/make-server-f580d5ca/opportunities/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`opportunity:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Error deleting opportunity:", e);
    return c.json({ error: "Failed to delete opportunity", message: String(e) }, 500);
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

Deno.serve(app.fetch);