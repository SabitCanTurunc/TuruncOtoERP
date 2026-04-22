import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import ActivityLog from "@/models/ActivityLog";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const logs = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("Logs API Error:", error);
    return NextResponse.json({ success: false, error: "Loglar alınamadı" }, { status: 500 });
  }
}
