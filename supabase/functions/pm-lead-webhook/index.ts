import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

app.use("/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

// ─── Lead Webhook Receiver ──────────────────────────────────────
// POST /pm-lead-webhook/inbound?org=<org_id>
//
// Accepts JSON body with flexible field mapping:
//   { name, company, email, phone, notes, value, ... }
//
// Also supports Google Forms / Typeform / generic form payloads.

app.post("/pm-lead-webhook/inbound", async (c) => {
  const orgId = c.req.query("org");
  if (!orgId) {
    return c.json({ success: false, error: "Missing org parameter" }, 400);
  }

  // Verify org exists
  const { data: org, error: orgErr } = await supabase
    .from("pm_orgs")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (orgErr || !org) {
    return c.json({ success: false, error: "Invalid organization" }, 404);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  // Flexible field extraction — supports various form payloads
  const name = body.name || body.contactName || body.contact_name || body.이름 || "Unknown Lead";
  const company = body.company || body.companyName || body.company_name || body.회사 || body.회사명 || "";
  const contactEmail = body.email || body.contactEmail || body.contact_email || body.이메일 || "";
  const contactPhone = body.phone || body.contactPhone || body.contact_phone || body.전화번호 || body.연락처 || "";
  const notes = body.notes || body.message || body.description || body.내용 || body.문의내용 || body.메모 || "";
  const value = Number(body.value || body.budget || body.예산 || 0) || 0;

  const { data, error } = await supabase
    .from("pm_clients")
    .insert({
      name,
      company,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      notes,
      value,
      stage: "inquiry",
      org_id: orgId,
    })
    .select()
    .single();

  if (error) {
    console.error("[pm-lead-webhook] Insert error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, clientId: data.id, name, company });
});

// Health check
app.get("/pm-lead-webhook/health", (c) => c.json({ status: "ok" }));

Deno.serve(app.fetch);
