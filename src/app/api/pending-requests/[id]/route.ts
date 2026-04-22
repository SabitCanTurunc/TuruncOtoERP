import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import PendingRequest from "@/models/PendingRequest";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import Vehicle from "@/models/Vehicle";
import { logAction } from "@/lib/logger";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { status, adminPrice, rejectionReason } = body;

    const request = await PendingRequest.findById(id);
    if (!request) {
      return NextResponse.json({ success: false, error: "İstek bulunamadı" }, { status: 404 });
    }
    if (request.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Bu istek zaten işlenmiş" }, { status: 400 });
    }

    if (status === "REJECTED") {
      request.status = "REJECTED";
      request.rejectionReason = rejectionReason || "Admin tarafından reddedildi";
      await request.save();
      return NextResponse.json({ success: true, data: request });
    }

    if (status === "APPROVED") {
      const price = Number(adminPrice);
      if (price <= 0) {
        return NextResponse.json({ success: false, error: "Onaylamak için geçerli bir fiyat giriniz" }, { status: 400 });
      }

      const qty = request.quantity || 1;

      // YENİ ÜRÜN: isNewProduct flag'i veya placeholder ID ile tespit et
      const isNewProductRequest = request.isNewProduct ||
        request.productId?.toString() === "000000000000000000000000";

      if (isNewProductRequest) {
        const meta = request.newProductMeta;
        // Eski istek (meta yok) ise productName'den ürün adını al, diğer alanlar boş bırakılır
        const productName = meta?.name || request.productName;
        const newProduct = await Product.create({
          name: productName,
          category: meta?.category || "Diğer",
          partNumber: meta?.partNumber || "",
          salePrice: meta?.salePrice || 0,
          stock: qty,
          averagePurchasePrice: price,
          purchases: [{ price, quantity: qty, date: new Date() }],
        });

        // Eski alım değilse gider olarak yansıt
        if (!meta?.isExistingStock) {
          await Transaction.create({
            type: "EXPENSE",
            category: "PART_PURCHASE",
            amount: price * qty,
            description: `Yeni Ürün Stok Girişi (Onaylandı): ${productName} — ${qty} adet (${request.requestedBy})`,
            date: new Date(),
            relatedProductId: newProduct._id,
          });
        }

        await logAction("STOK_ONAYLANDI", `Yeni ürün oluşturuldu: ${productName}, ${qty} adet, ${price}₺/adet (${request.requestedBy} isteği)`);
        request.status = "APPROVED";
        request.adminPrice = price;
        await request.save();
        return NextResponse.json({ success: true, data: request });
      }

      // MEVCUT ÜRÜN: Normal Product lookup
      const product = await Product.findById(request.productId);
      if (!product) {
        return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
      }

      if (request.type === "STOCK_ADD") {
        // Moving average cost — same logic as products/[id] PUT newPurchase
        const prevTotalValue = product.stock * (product.averagePurchasePrice || 0);
        const newPurchaseValue = price * qty;
        const newTotalStock = product.stock + qty;
        const newTotalValue = prevTotalValue + newPurchaseValue;

        product.averagePurchasePrice = newTotalStock > 0 ? newTotalValue / newTotalStock : 0;
        product.stock = newTotalStock;
        product.purchases.push({ price, quantity: qty, date: new Date() });

        await Transaction.create({
          type: "EXPENSE",
          category: "PART_PURCHASE",
          amount: price * qty,
          description: `Stok Alımı (Onaylandı): ${product.name} — ${qty} adet (${request.requestedBy})`,
          date: new Date(),
          relatedProductId: product._id,
        });

        await logAction("STOK_ONAYLANDI", `${product.name}: ${qty} adet, ${price}₺/adet (${request.requestedBy} isteği onaylandı)`);

      } else if (request.type === "SELL") {
        if (product.stock < qty) {
          return NextResponse.json(
            { success: false, error: `Yetersiz stok! Mevcut: ${product.stock} adet, İstenen: ${qty} adet.` },
            { status: 400 }
          );
        }
        product.stock -= qty;
        const cogs = Math.max(0, (product.averagePurchasePrice || 0) * qty);

        await Transaction.create({
          type: "INCOME",
          category: "PART_SALE",
          amount: price * qty,
          costOfGoodsSold: cogs,
          description: `Parça Satışı (Onaylandı): ${product.name} — ${qty} adet (${request.requestedBy})`,
          date: new Date(),
          relatedProductId: product._id,
        });

        await logAction("SATIS_ONAYLANDI", `${product.name}: ${qty} adet, ${price}₺/adet satış onaylandı (${request.requestedBy})`);
      }

      await product.save();

      request.status = "APPROVED";
      request.adminPrice = price;
      await request.save();

      return NextResponse.json({ success: true, data: request });
    }

    // VEHICLE_SERVICE APPROVAL
    if (status === "APPROVED" && request.type === "VEHICLE_SERVICE") {
      const meta = request.vehicleMeta;
      if (!meta) {
        return NextResponse.json({ success: false, error: "Araç verisi bulunamadı" }, { status: 400 });
      }

      // Admin uses workListText and description from the request body if provided, otherwise from meta
      const finalWorkListText = body.workListText || meta.workListText;
      const finalDescription = body.description || meta.description;

      let vehicle = await Vehicle.findOne({ plate: meta.plate });

      const newEntry = {
        date: new Date(),
        vehicleImage: meta.vehicleImage,
        workListImage: body.workListImage || meta.workListImage,
        workListText: finalWorkListText,
        notes: meta.notes,
        createdBy: request.requestedBy, // Original user who opened it
      };

      if (vehicle) {
        vehicle.history.push(newEntry);
        if (finalDescription) vehicle.description = finalDescription;
        await vehicle.save();
        await logAction("ARAC_GUNCELLEME", `${meta.plate} plakalı araca yeni iş kaydı eklendi (Onaylı).`);
      } else {
        vehicle = await Vehicle.create({
          plate: meta.plate,
          description: finalDescription,
          history: [newEntry],
        });
        await logAction("YENI_ARAC", `${meta.plate} plakalı araç sisteme ilk kez kaydedildi (Onaylı).`);
      }

      request.status = "APPROVED";
      await request.save();

      return NextResponse.json({ success: true, data: vehicle });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (error: any) {
    console.error("PendingRequest PUT error:", error);
    return NextResponse.json({ success: false, error: error.message || "İşlem başarısız" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    await PendingRequest.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch(e) {
    return NextResponse.json({ success: false, error: "Silinemedi" }, { status: 500 });
  }
}
