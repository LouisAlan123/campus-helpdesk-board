import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { withRedis } from "@/lib/redis";

const LATEST_KEY = "help:latest";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isInteger(requestId)) {
    return NextResponse.json(
      { success: false, error: "Invalid request id" },
      { status: 400 }
    );
  }

  const { rowCount } = await pool.query(
    `UPDATE help_requests SET resolved = TRUE WHERE id = $1`,
    [requestId]
  );

  if (rowCount === 0) {
    return NextResponse.json(
      { success: false, error: "Request not found" },
      { status: 404 }
    );
  }

  await withRedis((redis) => redis.del(LATEST_KEY));

  return NextResponse.json({ success: true });
}
