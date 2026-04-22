import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Staff from "@/models/Staff";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id } = await params;

    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return NextResponse.json({ success: false, error: "Personel bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedStaff });
  } catch (error: any) {
    console.error("API PUT Error (Staff):", error);
    return NextResponse.json(
      { success: false, error: "Personel güncellenemedi." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const deletedStaff = await Staff.findByIdAndDelete(id);

    if (!deletedStaff) {
      return NextResponse.json({ success: false, error: "Personel bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Personel başarıyla silindi" });
  } catch (error: any) {
    console.error("API DELETE Error (Staff):", error);
    return NextResponse.json(
      { success: false, error: "Personel silinemedi." },
      { status: 500 }
    );
  }
}
