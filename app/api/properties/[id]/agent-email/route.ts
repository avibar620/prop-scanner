import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { sendAgentEmail } from "@/lib/email";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    agentEmail?: string;
    message?: string;
  };
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const agentEmail = (body.agentEmail ?? property.agentEmail ?? "").trim();
  if (!agentEmail) return NextResponse.json({ error: "no agent email" }, { status: 400 });

  const res = await sendAgentEmail(property, agentEmail, message);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
