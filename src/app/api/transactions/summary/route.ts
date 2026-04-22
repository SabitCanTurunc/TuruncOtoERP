import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Transaction from "@/models/Transaction";

export async function GET() {
  try {
    await connectToDatabase();

    const currentYear = new Date().getFullYear();

    const pivotData = await Transaction.aggregate([
      // Sadece bulunduğumuz yılın verilerini al
      {
        $match: {
          date: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
          },
        },
      },
      // Ay ve kategori bazında grupla (Satış Geliri mi, Gider mi, Stok Yatırımı mı ayırmak için)
      {
        $group: {
          _id: { month: { $month: "$date" }, type: "$type", category: "$category" },
          totalAmount: { $sum: "$amount" },
          totalCogs: { $sum: "$costOfGoodsSold" } // Sadece satışlarda dolu gelecek
        },
      },
    ]);

    const monthsTr = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    
    const summaryByMonth = monthsTr.map((m, index) => ({
      month: m,
      monthIndex: index + 1,
      grossIncome: 0,       // Brüt Gelir (Kasaya giren tüm para)
      cogs: 0,              // Satılan Malın Maliyeti
      operatingExpense: 0,  // İşletme Gideri (Maaş, SGK, Fatura vb - Parça alımı hariç)
      stockInvestment: 0,   // Dükkana yatırılan para (Parça alımı)
      netProfit: 0          // Gerçek Kar = Brüt Gelir - İşletme Gideri - Satılan Malın Maliyeti
    }));

    pivotData.forEach((item) => {
      const dbMonth = item._id.month;
      const type = item._id.type;
      const category = item._id.category;
      const total = item.totalAmount;
      const cogs = item.totalCogs || 0;

      const targetMonth = summaryByMonth.find((m) => m.monthIndex === dbMonth);
      if (targetMonth) {
        if (type === "INCOME") {
          targetMonth.grossIncome += total;
          targetMonth.cogs += cogs;
        } else if (type === "EXPENSE") {
          if (category === "PART_PURCHASE") {
            targetMonth.stockInvestment += total;
          } else {
            targetMonth.operatingExpense += total;
          }
        }
      }
    });

    // Son kâr hesaplamasını yapalım
    summaryByMonth.forEach(m => {
      // İş yatırımını (stok malını) kâr'dan düşmüyoruz, o bizim varlığımız!
      // Sadece o ay sattığımız malın geliş fiyatını (cogs) ve maaş/sigorta gibi eriyen giderleri düşüyoruz.
      m.netProfit = m.grossIncome - m.operatingExpense - m.cogs;
    });

    return NextResponse.json({ success: true, data: summaryByMonth });

  } catch (error: any) {
    console.error("API GET Error (Transactions Summary):", error);
    return NextResponse.json(
      { success: false, error: "Pivot verileri alınamadı." },
      { status: 500 }
    );
  }
}
