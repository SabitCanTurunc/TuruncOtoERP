import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Transaction from "@/models/Transaction";
import "@/models/Staff";
import "@/models/Product";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";

    const query: any = {};
    if (search) {
      const trStr = search.toLowerCase();
      const matchedCategories: string[] = [];
      if ("tamir geliri".includes(trStr)) matchedCategories.push("REPAIR");
      if ("parça satış".includes(trStr)) matchedCategories.push("PART_SALE");
      if ("stok alımı".includes(trStr)) matchedCategories.push("PART_PURCHASE");
      if ("personel ödemesi".includes(trStr) || "maaş".includes(trStr)) matchedCategories.push("SALARY");
      if ("sigorta".includes(trStr)) matchedCategories.push("INSURANCE");
      if ("fatura".includes(trStr) || "gider".includes(trStr)) matchedCategories.push("UTILITY");
      if ("muhasebe".includes(trStr)) matchedCategories.push("ACCOUNTING");
      if ("diğer".includes(trStr)) matchedCategories.push("OTHER");

      if (matchedCategories.length > 0) {
        query.$or = [
          { description: { $regex: search, $options: "i" } },
          { category: { $in: matchedCategories } }
        ];
      } else {
        query.description = { $regex: search, $options: "i" };
      }
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("relatedStaffId")
      .populate("relatedProductId");

    return NextResponse.json({ 
      success: true, 
      data: transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("API GET Error (Transactions):", error);
    return NextResponse.json(
      { success: false, error: "İşlem verileri alınamadı." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Tekil işlem için:
    const newTransaction = await Transaction.create(body);
    return NextResponse.json({ success: true, data: newTransaction }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Error (Transactions):", error);
    return NextResponse.json(
      { success: false, error: "İşlem kaydedilemedi." },
      { status: 400 }
    );
  }
}
