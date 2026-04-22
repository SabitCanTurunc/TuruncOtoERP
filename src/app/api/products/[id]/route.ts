import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

import { logAction } from "@/lib/logger";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    // params is a Promise in Next.js 15, we must await it or access its keys correctly if changed, but standard App router params.id is available, actually in next 15 page/route props `params` is a promise, so we await it
    const { id } = await params;
    
    // In some Next builds (Next 14) you don't await, but in 15 you do.
    const body = await request.json();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    // Eğer yeni bir alım (purchase) eklendiyse (stok girişi)
    if (body.newPurchase) {
      product.purchases.push(body.newPurchase);
      // Doğru Ortalama Alış Maliyeti (Hareketli Ortalama Maliyet - Moving Average Cost)
      // Yeni alışın toplam değeri (handle empty prices safely)
      body.newPurchase.price = Number(body.newPurchase.price) || 0;
      body.newPurchase.quantity = Number(body.newPurchase.quantity) || 1;
      
      const newTotalStock = product.stock + body.newPurchase.quantity;

      // Fiyat girilmişse Hareketli Ortalama Maliyet güncellensin.
      // Fiyat 0 ise sadece adet eklenir, maliyet BOZULMAZ (admin sonradan fiyatı düzeltebilir).
      if (body.newPurchase.price > 0) {
        const previousTotalValue = product.stock * (product.averagePurchasePrice || 0);
        const newPurchaseValue = body.newPurchase.price * body.newPurchase.quantity;
        const newTotalValue = previousTotalValue + newPurchaseValue;
        product.averagePurchasePrice = newTotalStock > 0 ? newTotalValue / newTotalStock : 0;
      }
      // price=0 ise averagePurchasePrice değişmez, sadece stok artar ↓
      product.stock = newTotalStock;

      // KASAYA GİDER (EXPENSE) OLARAK YANSIT
      await Transaction.create({
        type: "EXPENSE",
        category: "PART_PURCHASE",
        amount: body.newPurchase.price * body.newPurchase.quantity,
        description: `Stok Alımı: ${product.name} (${body.newPurchase.quantity} adet)`,
        date: new Date(),
        relatedProductId: product._id
      });
      await logAction("STOK_GIRISI", `${product.name} ürününden ${body.newPurchase.quantity} adet eklendi.`);
    }

    // Eğer ürün satışı yapıldıysa
    if (body.sell) {
      let { sellQuantity, actualSalePrice } = body.sell;
      sellQuantity = Number(sellQuantity) || 1;
      actualSalePrice = Number(actualSalePrice) || 0;
      
      product.stock -= sellQuantity;
      // Stok yetersizse hata dön, sessizce yutma
      if (product.stock < 0) {
        return NextResponse.json(
          { success: false, error: `Yetersiz stok! Mevcut: ${product.stock + sellQuantity} adet, İstenen: ${sellQuantity} adet.` },
          { status: 400 }
        );
      }
      
      // Satılan ürünün maliyeti (ortalama alış fiyatı üzerinden) — negatif olamaz
      const cogs = Math.max(0, (product.averagePurchasePrice || 0) * sellQuantity);

      // KASAYA GELİR (INCOME) OLARAK YANSIT
      await Transaction.create({
        type: "INCOME",
        category: "PART_SALE",
        amount: actualSalePrice * sellQuantity,
        costOfGoodsSold: cogs, // Sadece satılan kısmın maliyeti
        description: `Parça Satışı: ${product.name} (${sellQuantity} adet)`,
        date: new Date(),
        relatedProductId: product._id
      });
      await logAction("PARCA_SATISI", `${product.name} ürününden ${sellQuantity} adet satıldı.`);
    }

    // Diğer alanları güncelleme (isim, satış fiyatı vs)
    if (body.name) product.name = body.name;
    if (body.salePrice !== undefined) product.salePrice = Number(body.salePrice) || 0;
    if (body.partNumber !== undefined) product.partNumber = body.partNumber;
    // Admin fiyat düzeltme modalından gelen doğrudan averagePurchasePrice güncellemesi
    if (body.averagePurchasePrice !== undefined) product.averagePurchasePrice = Number(body.averagePurchasePrice) || 0;

    await product.save();

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error("API PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message || "İşlem başarısız" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const deletedItem = await Product.findByIdAndDelete(id);
    if (!deletedItem) {
      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    await logAction("PARCA_SILINDI", `${deletedItem.name} adlı parça silindi.`);

    return NextResponse.json({ success: true, data: deletedItem });
  } catch (error: any) {
    console.error("API DELETE Error:", error);
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 400 });
  }
}
