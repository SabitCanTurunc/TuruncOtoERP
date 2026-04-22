import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { logAction } from "@/lib/logger";

export async function GET() {
  try {
    await connectToDatabase();
    const products = await Product.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error("API GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Veritabanı bağlantı hatası veya işlem hatası." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    // Basit bir hesaplama: Eğer ilk eklemede direkt purchase varsa averagePrice hesapla
    let averagePurchasePrice = 0;
    if (body.purchases && body.purchases.length > 0) {
      const totalStock = body.purchases.reduce((acc: number, p: any) => acc + p.quantity, 0);
      const totalCost = body.purchases.reduce((acc: number, p: any) => acc + p.price * p.quantity, 0);
      averagePurchasePrice = totalStock > 0 ? totalCost / totalStock : 0;
      body.stock = totalStock;
    }

    // Ensure we handle falsy/empty salePrice properly.
    const salePrice = Number(body.salePrice) || 0;
    
    // Ensure all purchases map properly preventing NaN
    if (body.purchases) {
       body.purchases = body.purchases.map((p: any) => ({
          ...p,
          price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 1
       }));
    }

    const newProduct = await Product.create({
      name: body.name,
      category: body.category,
      partNumber: body.partNumber,
      salePrice: salePrice,
      purchases: body.purchases,
      stock: body.stock,
      averagePurchasePrice,
    });

    // İlk eklemede maliyet varsa ve bu ürün DÜKKANDA ZATEN VAR (Eski Alım) değilse, Gider olarak işle
    if (body.purchases && body.purchases.length > 0 && !body.isExistingStock) {
      const initialStock = body.purchases[0];
      await Transaction.create({
        type: "EXPENSE",
        category: "PART_PURCHASE",
        amount: initialStock.price * initialStock.quantity,
        description: `Sisteme Yeni Stok Girişi: ${newProduct.name} (${initialStock.quantity} adet)`,
        date: new Date(),
        relatedProductId: newProduct._id
      });
    }
    
    await logAction("YENI_PARCA", `Yeni Parça Eklendi: ${newProduct.name} (${body.stock} adet)`);

    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "İşlem başarısız." },
      { status: 400 }
    );
  }
}
