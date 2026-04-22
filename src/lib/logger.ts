import ActivityLog from "@/models/ActivityLog";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

export async function logAction(action: string, details: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    
    let username = "Sistem"; // Default if token is somehow missing but action occurs

    if (token) {
      const payload = await verifyJwt(token);
      if (payload && payload.username) {
        username = payload.username as string;
      }
    }

    await ActivityLog.create({
      username,
      action,
      details,
    });
  } catch (err) {
    console.error("Logger Failed:", err);
  }
}
