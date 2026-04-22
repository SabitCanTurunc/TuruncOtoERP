import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import PendingRequest from "@/models/PendingRequest";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

// GET: List all pending requests (admin use)
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";

    const requests = await PendingRequest.find({ status })
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "İstekler alınamadı" }, { status: 500 });
  }
}

// POST: Create a new pending request (any authenticated user)
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    // Get the username from the cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    let requestedBy = "Bilinmiyor";
    if (token) {
      const payload = await verifyJwt(token);
      if (payload && payload.username) requestedBy = payload.username as string;
    }

    const isNewProduct = body.productId === "000000000000000000000000" && !!body.newProductMeta;

    const newRequest = await PendingRequest.create({
      type: body.type,
      productId: body.productId,
      productName: body.productName,
      isNewProduct,
      newProductMeta: isNewProduct ? body.newProductMeta : undefined,
      requestedBy,
      quantity: Number(body.quantity),
      status: "PENDING",
    });

    return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
  } catch (error: any) {
    console.error("PendingRequest POST error:", error);
    return NextResponse.json({ success: false, error: "İstek oluşturulamadı" }, { status: 500 });
  }
}
