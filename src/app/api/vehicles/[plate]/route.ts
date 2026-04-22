import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Vehicle from "@/models/Vehicle";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { logAction } from "@/lib/logger";

// GET: Get a single vehicle by plate
export async function GET(
  req: Request,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    await connectToDatabase();
    const plate = (await params).plate.toUpperCase().replace(/\s/g, "");

    const vehicle = await Vehicle.findOne({ plate });
    if (!vehicle) {
      return NextResponse.json({ success: false, error: "Araç bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: vehicle });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Araç bilgisi alınamadı" }, { status: 500 });
  }
}

// PUT: Update vehicle description or a specific history entry
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    await connectToDatabase();
    const plate = (await params).plate.toUpperCase().replace(/\s/g, "");
    const body = await req.json();
    const { description, entryId, workListText, notes } = body;

    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    const payload = await verifyJwt(token);
    if (!payload || payload.role !== "SUPERADMIN") {
      return NextResponse.json({ success: false, error: "Bu işlem için yetkiniz yok" }, { status: 403 });
    }

    const vehicle = await Vehicle.findOne({ plate });
    if (!vehicle) {
      return NextResponse.json({ success: false, error: "Araç bulunamadı" }, { status: 404 });
    }

    // Update vehicle-wide description if provided
    if (description !== undefined) {
      vehicle.description = description;
    }

    // Update specific history entry if entryId is provided
    if (entryId) {
      const entry = (vehicle.history as any).id(entryId);
      if (entry) {
        if (workListText !== undefined) entry.workListText = workListText;
        if (notes !== undefined) entry.notes = notes;
      }
    }

    await vehicle.save();
    await logAction("ARAC_GUNCELLEME", `${plate} plakalı araç bilgileri güncellendi.`);

    return NextResponse.json({ success: true, data: vehicle });
  } catch (error: any) {
    console.error("Vehicle PUT error:", error);
    return NextResponse.json({ success: false, error: "Güncelleme sırasında hata oluştu" }, { status: 500 });
  }
}
