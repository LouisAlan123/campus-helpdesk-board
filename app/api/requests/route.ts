import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { withRedis } from "@/lib/redis";

const LATEST_KEY = "help:latest";
const LATEST_TTL_SECONDS = 60;

type HelpRequest = {
  id: number;
  student_name: string;
  message: string;
  resolved: boolean;
  created_at: string;
};

async function fetchLatestFromDb(): Promise<HelpRequest[]> {
  const { rows } = await pool.query<HelpRequest>(
    `SELECT id, student_name, message, resolved, created_at
       FROM help_requests
      ORDER BY created_at DESC
      LIMIT 10`
  );
  return rows;
}

export async function GET() {
  const cached = await withRedis((redis) => redis.get(LATEST_KEY));

  if (cached) {
    return NextResponse.json({
      source: "Redis",
      requests: JSON.parse(cached) as HelpRequest[],
    });
  }

  const requests = await fetchLatestFromDb();

  await withRedis((redis) =>
    redis.set(LATEST_KEY, JSON.stringify(requests), {
      EX: LATEST_TTL_SECONDS,
    })
  );

  return NextResponse.json({ source: "PostgreSQL", requests });
}

export async function POST(req: NextRequest) {
  let body: { student_name?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const student_name =
    typeof body.student_name === "string" ? body.student_name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!student_name || !message) {
    return NextResponse.json(
      { success: false, error: "student_name and message are required" },
      { status: 400 }
    );
  }

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO help_requests (student_name, message)
     VALUES ($1, $2)
     RETURNING id`,
    [student_name, message]
  );

  await withRedis((redis) => redis.del(LATEST_KEY));

  return NextResponse.json({ success: true, id: rows[0].id });
}
