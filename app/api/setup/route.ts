import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// One-shot admin bootstrap. Idempotent: refuses if any users already exist.
export async function POST() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json(
      { ok: false, message: "Users already exist; setup not allowed." },
      { status: 409 }
    );
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "ADMIN_EMAIL and ADMIN_PASSWORD env vars are required." },
      { status: 500 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name: "Admin", role: "admin" },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ ok: true, user });
}
