import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Vehicle from "@/models/Vehicle";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { logAction } from "@/lib/logger";

// GET: List all vehicles or search by plate
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const plate = searchParams.get("plate")?.toUpperCase().replace(/\s/g, "");

    let query = {};
    if (plate) {
      query = { plate: { $regex: plate, $options: "i" } };
    }

    const vehicles = await Vehicle.find(query).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: vehicles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Araçlar alınamadı" }, { status: 500 });
  }
}

// POST: Create a new vehicle or add a history entry to an existing one
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Yetkisiz işlem" }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Oturum geçersiz" }, { status: 401 });
    }
    const username = payload.username as string;
    const role = payload.role as string;

    const plate = body.plate.toUpperCase().replace(/\s/g, "");
    if (!plate) {
      return NextResponse.json({ success: false, error: "Plaka gereklidir" }, { status: 400 });
    }

    // Role-based logic
    if (role === "USER") {
      // Create a pending request instead of a vehicle entry
      const PendingRequest = (await import("@/models/PendingRequest")).default;
      const newRequest = await PendingRequest.create({
        type: "VEHICLE_SERVICE",
        requestedBy: username,
        vehicleMeta: {
          plate,
          description: body.description,
          vehicleImage: body.vehicleImage,
          workListImage: body.workListImage,
          workListText: body.workListText,
          notes: body.notes,
        },
        status: "PENDING",
      });
      return NextResponse.json({ 
        success: true, 
        message: "Servis açılış isteği yöneticiye iletildi.", 
        data: newRequest,
        pending: true 
      });
    }

    // Admin logic (SUPERADMIN saves directly)
    let vehicle = await Vehicle.findOne({ plate });

    const newEntry = {
      date: body.date ? new Date(body.date) : new Date(),
      vehicleImage: body.vehicleImage,
      workListImage: body.workListImage,
      workListText: body.workListText,
      notes: body.notes,
      createdBy: username,
    };

    if (vehicle) {
      vehicle.history.push(newEntry);
      if (body.description) vehicle.description = body.description;
      await vehicle.save();
      await logAction("ARAC_GUNCELLEME", `${plate} plakalı araca yeni iş kaydı eklendi.`);
    } else {
      vehicle = await Vehicle.create({
        plate,
        description: body.description,
        history: [newEntry],
      });
      await logAction("YENI_ARAC", `${plate} plakalı araç sisteme ilk kez kaydedildi.`);
    }

    return NextResponse.json({ success: true, data: vehicle });
  } catch (error: any) {
    console.error("Vehicle POST error:", error);
    return NextResponse.json({ success: false, error: error.message || "İşlem sırasında hata oluştu" }, { status: 500 });
  }
}
