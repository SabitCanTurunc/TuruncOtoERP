import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Staff from "@/models/Staff";

export async function GET() {
  try {
    await connectToDatabase();
    const staffMembers = await Staff.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: staffMembers });
  } catch (error: any) {
    console.error("API GET Error (Staff):", error);
    return NextResponse.json(
      { success: false, error: "Personel verileri alınamadı." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const newStaff = await Staff.create(body);
    return NextResponse.json({ success: true, data: newStaff }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Error (Staff):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Personel eklenemedi." },
      { status: 400 }
    );
  }
}
