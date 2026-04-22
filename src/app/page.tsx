"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Package, 
  Wrench, 
  Users, 
  DollarSign, 
  Activity, 
  Search, 
  Plus,
  AlertTriangle,
  X,
  Pencil
} from "lucide-react";

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExistingStock, setIsExistingStock] = useState(false);
  const [formData, setFormData] = useState({
    name: "", category: "", partNumber: "", salePrice: "", purchasePrice: "", quantity: ""
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{isOpen: boolean, type: "SELL" | "ADD" | null, product: any, quantity: string, price: string}>({
    isOpen: false, type: null, product: null, quantity: "", price: ""
  });
  const [actionError, setActionError] = useState<string>("");
  const [editModal, setEditModal] = useState<{isOpen: boolean, product: any}>({
    isOpen: false, product: null
  });
  const [editForm, setEditForm] = useState({ salePrice: "", averagePurchasePrice: "", name: "" });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Sahte Veri (Fallback)
  const mockProducts = [
    { _id: "1", name: "Fren Balatası", category: "Yedek Parça", stock: 24, averagePurchasePrice: 450, salePrice: 750, partNumber: "BRK-001" },
    { _id: "2", name: "Motor Yağı 5W-30", category: "Sıvı Bakım", stock: 50, averagePurchasePrice: 200, salePrice: 350, partNumber: "OIL-5W30" },
    { _id: "3", name: "Buji Takımı", category: "Yedek Parça", stock: 12, averagePurchasePrice: 800, salePrice: 1200, partNumber: "SPK-009" },
    { _id: "4", name: "Polen Filtresi", category: "Filtre", stock: 35, averagePurchasePrice: 120, salePrice: 250, partNumber: "FLT-004" }
  ];

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("API hatası");
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          setProducts(json.data);
        } else if (json.success) {
           setProducts(mockProducts); // Eğer DB boşsa görsellik için göster
           setDbError(true);
        }
      } catch (err) {
        console.warn("Veritabanı bağlantısı yok, örnek veriler yükleniyor.");
        setDbError(true);
        setProducts(mockProducts);
      } finally {
        setLoading(false);
      }
    }
    async function fetchUserRole() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success) setUserRole(json.user?.role);
      } catch (e) {}
    }
    fetchUserRole();
    fetchProducts();
  }, []);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const purchasePrice = Number(formData.purchasePrice);
    const quantity = Number(formData.quantity) || 1;

    try {
      // Fiyat girilmemişse → Admin onay kuyruğuna gönder
      // Ürün henüz DB'ye kaydedilmez, sadece istek düşer
      if (!purchasePrice || purchasePrice <= 0) {
        const res = await fetch("/api/pending-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "STOCK_ADD",
            // Yeni ürün olduğu için productId yok — backend'de özel "NEW_PRODUCT" tipiyle sakla
            productId: "000000000000000000000000", // placeholder, admin onaylayınca işlenecek
            productName: formData.name,
            quantity,
            // Ürün detaylarını meta olarak gönder
            newProductMeta: {
              name: formData.name,
              category: formData.category,
              partNumber: formData.partNumber,
              salePrice: Number(formData.salePrice) || 0,
              isExistingStock,
            },
          }),
        });
        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          setFormData({ name: "", category: "", partNumber: "", salePrice: "", purchasePrice: "", quantity: "" });
          setIsExistingStock(false);
          alert(`✓ İstek gönderildi! Admin onayı bekleniyor.\n"${formData.name}" — ${quantity} adet stok girişi talebi oluşturuldu.`);
        }
        return;
      }

      // Fiyat girilmişse → Doğrudan kaydet (eski davranış)
      const payload = {
        name: formData.name,
        category: formData.category,
        partNumber: formData.partNumber,
        salePrice: Number(formData.salePrice),
        isExistingStock,
        purchases: [{
          price: purchasePrice,
          quantity,
        }]
      };
      
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: "", category: "", partNumber: "", salePrice: "", purchasePrice: "", quantity: "" });
        setIsExistingStock(false);
        window.location.reload(); 
      }
    } catch(err) {
      console.error(err);
    }
  }


  async function handleActionSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { type, product, quantity, price } = actionModal;
    const qty = Number(quantity);
    const prc = Number(price);

    if (!product || qty <= 0) return;

    try {
      setActionError("");

      // Fiyat girilmemişse → Admin onayına gönder, stok HENÜZ değişmesin
      if (!prc || prc <= 0) {
        const res = await fetch("/api/pending-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: type === "SELL" ? "SELL" : "STOCK_ADD",
            productId: product._id,
            productName: product.name,
            quantity: qty,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setActionModal({ isOpen: false, type: null, product: null, quantity: "", price: "" });
          setActionError("");
          // Stok değişmedi, sadece istek kaydedildi
          alert(`✓ İstek gönderildi! Admin onayı bekleniyor.\n${product.name} — ${qty} adet ${type === "SELL" ? "satış" : "stok girişi"} talebi oluşturuldu.`);
        } else {
          setActionError(json.error || "İstek gönderilemedi.");
        }
        return;
      }

      // Fiyat girilmişse → Doğrudan işle (eski davranış)
      if (type === "SELL" && qty > product.stock) {
        setActionError(`Yetersiz stok! Mevcut: ${product.stock} adet, İstenen: ${qty} adet.`);
        return;
      }

      let payload = {};
      if (type === "SELL") {
        payload = { sell: { sellQuantity: qty, actualSalePrice: prc } };
      } else if (type === "ADD") {
        payload = { newPurchase: { quantity: qty, price: prc } };
      }

      const res = await fetch(`/api/products/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setActionModal({ isOpen: false, type: null, product: null, quantity: "", price: "" });
        setActionError("");
        window.location.reload();
      } else {
        setActionError(json.error || "İşlem başarısız.");
      }
    } catch (err) {
      setActionError("Sunucu bağlantı hatası.");
    }
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    const { product } = editModal;
    if (!product) return;
    try {
      const payload: any = {};
      if (editForm.name) payload.name = editForm.name;
      if (editForm.salePrice !== "") payload.salePrice = Number(editForm.salePrice);
      if (editForm.averagePurchasePrice !== "") payload.averagePurchasePrice = Number(editForm.averagePurchasePrice);

      const res = await fetch(`/api/products/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditModal({ isOpen: false, product: null });
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.partNumber && p.partNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory ? p.category === filterCategory : true;
    const matchesStock = filterLowStock ? p.stock <= 2 : true;
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-orange-500/30">
      


      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {dbError && (
          <div className="mb-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-4 items-start animate-pulse">
            <AlertTriangle className="text-orange-500 flex-shrink-0" />
            <div>
              <h3 className="text-orange-500 font-semibold mb-1">Veritabanı Bağlantısı Bulunamadı</h3>
              <p className="text-sm text-neutral-400">Şu anda <span className="font-mono text-neutral-300">.env.local</span> dosyanızda <span className="font-mono text-neutral-300">MONGODB_URI</span> eksik olabilir veya IP izniniz yoktur. Ekranda gördüğünüz veriler <b>örnek (mock)</b> verilerdir.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Stok & Malzeme Yönetimi</h1>
            <p className="text-neutral-400 text-sm">Dükkandaki parçaları, maliyetleri ve satış fiyatlarını takip edin.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 rounded-lg bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors shadow-xl shadow-white/10 w-full sm:w-auto shrink-0">
            <Plus size={16} />
            Yeni Parça Ekle
          </button>
        </div>

        {/* İSTATİSTİK KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Toplam Parça Çeşidi" value={products.length.toString()} icon={<Package size={20} />} trend="+3 Bu Ay" />
          
          {userRole !== "USER" && (
            <>
              <StatCard title="Toplam Stok Değeri" value={"₺" + products.reduce((acc, p) => acc + (p.stock * p.averagePurchasePrice), 0).toLocaleString()} icon={<DollarSign size={20} />} accent="green" />
              <StatCard title="Beklenen Kar" value={"₺" + products.reduce((acc, p) => acc + (p.stock * (p.salePrice - p.averagePurchasePrice)), 0).toLocaleString()} icon={<Activity size={20} />} accent="orange" />
            </>
          )}

          <StatCard title="Kritik Stok Uyarıları" value={`${products.filter(p => p.stock <= 2).length} Adet`} icon={<AlertTriangle size={20} />} accent="red" />
        </div>

        {/* LİSTE / TABLO */}
        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
          
          <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between">
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
              <input 
                type="text" 
                placeholder="Parça ara (isim, kod...)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors text-white"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 md:flex-none px-3 py-2 rounded-md bg-transparent border border-white/10 text-xs font-medium text-neutral-400 hover:text-white transition-colors focus:outline-none focus:border-orange-500/50 cursor-pointer text-center appearance-none"
              >
                <option value="" className="bg-neutral-900">Tüm Kategoriler</option>
                <option value="Yedek Parça" className="bg-neutral-900">Yedek Parça</option>
                <option value="Sıvı Bakım" className="bg-neutral-900">Sıvı Bakım</option>
                <option value="Filtre" className="bg-neutral-900">Filtre</option>
                <option value="Aksesuar" className="bg-neutral-900">Aksesuar</option>
              </select>
              <button 
                onClick={() => setFilterLowStock(!filterLowStock)} 
                className={`flex-1 md:flex-none px-3 py-2 rounded-md border text-xs font-medium transition-colors ${filterLowStock ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'border-white/10 text-neutral-400 hover:text-white'}`}
              >
                Düşük Stok
              </button>
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[300px]">
             {loading && (
               <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm z-10">
                 <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
               </div>
             )}
            <table className="w-full text-left text-sm text-neutral-300 whitespace-nowrap min-w-[800px]">
              <thead className="bg-black/40 text-neutral-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 sm:px-6 py-4 font-medium">Parça Kodu & Adı</th>
                  <th className="px-4 sm:px-6 py-4 font-medium">Kategori</th>
                  <th className="px-4 sm:px-6 py-4 font-medium text-center">Stok</th>
                  
                  {userRole !== "USER" && (
                     <>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right">Ort. Maliyet</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right">Satış Fiyatı</th>
                     </>
                  )}

                  <th className="px-4 sm:px-6 py-4 font-medium text-right">Durum</th>
                  <th className="px-4 sm:px-6 py-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((m, i) => (
                  <tr key={m._id || i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-white/5 flex items-center justify-center flex-shrink-0">
                          <Package size={18} className="text-neutral-400 group-hover:text-orange-500 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-[120px] sm:max-w-[200px] flex items-center gap-2">
                            {m.name}
                            {(m.averagePurchasePrice === 0 || m.salePrice === 0) && userRole === "SUPERADMIN" && (
                              <span title="Fiyat girilmemiş" className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">Fiyat Bekliyor</span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500 font-mono mt-0.5">{m.partNumber || "-"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-xs text-neutral-400 border border-white/5">{m.category}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md bg-neutral-950 border border-white/10 font-medium">
                        {m.stock}
                      </div>
                    </td>
                    
                    {userRole !== "USER" && (
                       <>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <span className="text-neutral-400 font-medium">₺{m.averagePurchasePrice?.toLocaleString()}</span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <span className="text-white font-medium">₺{m.salePrice?.toLocaleString()}</span>
                          </td>
                       </>
                    )}
                     <td className="px-4 sm:px-6 py-4 text-right">
                        {m.stock > 2 ? (
                          <span className="inline-flex gap-1.5 items-center text-green-400 text-xs font-medium bg-green-400/10 px-2 py-1 rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Yeterli
                          </span>
                        ) : m.stock > 0 ? (
                          <span className="inline-flex gap-1.5 items-center text-amber-400 text-xs font-medium bg-amber-400/10 px-2 py-1 rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Azalıyor
                          </span>
                        ) : (
                          <span className="inline-flex gap-1.5 items-center text-red-400 text-xs font-medium bg-red-400/10 px-2 py-1 rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Tükendi
                          </span>
                        )}
                     </td>
                     <td className="px-4 sm:px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button onClick={() => setActionModal({ isOpen: true, type: "SELL", product: m, quantity: "1", price: m.salePrice })} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-md hover:bg-green-500/20 text-xs font-semibold transition-colors">Satış Yap</button>
                           <button onClick={() => setActionModal({ isOpen: true, type: "ADD", product: m, quantity: "1", price: m.averagePurchasePrice })} className="px-3 py-1.5 bg-white/5 text-white rounded-md hover:bg-white/10 text-xs font-semibold transition-colors">+ Stok</button>
                           {userRole === "SUPERADMIN" && (
                             <button
                               onClick={() => {
                                 setEditModal({ isOpen: true, product: m });
                                 setEditForm({ name: m.name, salePrice: m.salePrice?.toString() || "", averagePurchasePrice: m.averagePurchasePrice?.toString() || "" });
                               }}
                               className="w-7 h-7 bg-orange-500/10 text-orange-400 rounded-md hover:bg-orange-500/20 flex items-center justify-center transition-colors"
                               title="Fiyat Düzenle"
                             >
                               <Pencil size={13} />
                             </button>
                           )}
                         </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="font-semibold text-lg text-white">Yeni Parça & Stok Ekle</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Parça Adı</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Kategori</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white">
                      <option value="">Seçiniz...</option>
                      <option value="Yedek Parça">Yedek Parça</option>
                      <option value="Sıvı Bakım">Sıvı Bakım</option>
                      <option value="Filtre">Filtre</option>
                      <option value="Aksesuar">Aksesuar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Parça Kodu (Opsiyonel)</label>
                    <input value={formData.partNumber} onChange={e => setFormData({...formData, partNumber: e.target.value})} type="text" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50" />
                  </div>
                </div>
                <hr className="border-white/5 my-2" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Alınan Adet</label>
                    <input required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} type="number" min="1" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Birim Alış (₺)</label>
                    <input required={userRole !== "USER"} placeholder="0" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} type="number" min="0" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Satış Fiyatı (₺)</label>
                    <input required={userRole !== "USER"} placeholder="0" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: e.target.value})} type="number" min="0" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                    {Number(formData.purchasePrice) > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-500">%30 marjla &nbsp;<span className="text-amber-400 font-semibold">₺{(Number(formData.purchasePrice) * 1.3).toFixed(2)}</span></span>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, salePrice: (Number(formData.purchasePrice) * 1.3).toFixed(2)})}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        >
                          Uygula
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <input 
                    type="checkbox" 
                    id="existingStock" 
                    checked={isExistingStock} 
                    onChange={e => setIsExistingStock(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-orange-500"
                  />
                  <div>
                    <label htmlFor="existingStock" className="text-sm font-medium text-white cursor-pointer block">Bu ürün dükkanda zaten var (Eski Alım)</label>
                    <p className="text-xs text-neutral-400 mt-0.5">Bunu işaretlerseniz, ürün veritabanına eklenir ancak alım maliyeti <b>bu ayın finans giderlerine (Stok Yatırımı) yansımaz.</b> Geçmişten devreden mallarınız için kullanın.</p>
                  </div>
                </div>

                <button type="submit" className="w-full h-10 mt-4 rounded-lg bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
                  <Plus size={16} /> Parçayı Sisteme Kaydet
                </button>
              </form>
            </div>
          </div>
        )}

        {actionModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="font-semibold text-lg text-white">
                  {actionModal.type === "SELL" ? "Ürün Satışı" : "Stok Ekleme"}
                </h3>
                <button onClick={() => setActionModal({ ...actionModal, isOpen: false })} className="text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 pb-0">
                <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-white/5 mb-4">
                   <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-white/5 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-neutral-400" />
                   </div>
                   <div>
                      <div className="font-medium text-white text-sm">{actionModal.product?.name}</div>
                      <div className="text-xs text-neutral-500">Mevcut Stok: {actionModal.product?.stock}</div>
                   </div>
                </div>
              </div>
              <form onSubmit={handleActionSubmit} className="px-5 pb-5 space-y-4 shadow-xl">
                {actionError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{actionError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">{actionModal.type === "SELL" ? "Satılacak Adet" : "Alınan Adet"}</label>
                    <input required value={actionModal.quantity} onChange={e => setActionModal({...actionModal, quantity: e.target.value})} type="number" min="1" max={actionModal.type === "SELL" ? (actionModal.product?.stock || 1) : undefined} className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">{actionModal.type === "SELL" ? "Birim Satış Fiyatı (₺)" : "Birim Alış Maliyeti (₺)"}</label>
                    <input required={userRole !== "USER"} placeholder="0" value={actionModal.price} onChange={e => setActionModal({...actionModal, price: e.target.value})} type="number" min="0" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                  </div>
                </div>
                
                {actionModal.type === "SELL" && userRole !== "USER" && (
                   <p className="text-xs text-neutral-500">Bu işlem kasaya <b>{(Number(actionModal.quantity) * Number(actionModal.price) || 0).toLocaleString()} ₺</b> gelir olarak yansıyacaktır.</p>
                )}
                {actionModal.type === "ADD" && userRole !== "USER" && (
                   <p className="text-xs text-neutral-500">Bu işlem kasaya <b>{(Number(actionModal.quantity) * Number(actionModal.price) || 0).toLocaleString()} ₺</b> gider olarak yansıyacaktır.</p>
                )}

                <button type="submit" className={`w-full h-10 mt-4 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-colors ${actionModal.type === "SELL" ? "bg-green-600 hover:bg-green-500" : "bg-neutral-700 hover:bg-neutral-600"}`}>
                  {actionModal.type === "SELL" ? "Satışı Onayla" : "Stoğu Ekle"}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ÜRÜN DÜZENLEME MODALI - Sadece SUPERADMIN */}
      {editModal.isOpen && editModal.product && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h3 className="font-semibold text-lg text-white">Fiyat Düzenle</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{editModal.product.name}</p>
              </div>
              <button onClick={() => setEditModal({ isOpen: false, product: null })} className="text-neutral-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Parça Adı</label>
                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} type="text" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Satış Fiyatı (₺)</label>
                <input value={editForm.salePrice} onChange={e => setEditForm({...editForm, salePrice: e.target.value})} type="number" min="0" placeholder="0" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                {Number(editForm.averagePurchasePrice) > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[11px] text-neutral-500">%30 marjla &nbsp;<span className="text-amber-400 font-semibold">₺{(Number(editForm.averagePurchasePrice) * 1.3).toFixed(2)}</span></span>
                    <button
                      type="button"
                      onClick={() => setEditForm({...editForm, salePrice: (Number(editForm.averagePurchasePrice) * 1.3).toFixed(2)})}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                      Uygula
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Ortalama Alış Maliyeti (₺)</label>
                <input value={editForm.averagePurchasePrice} onChange={e => setEditForm({...editForm, averagePurchasePrice: e.target.value})} type="number" min="0" placeholder="0" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                <p className="text-xs text-neutral-600 mt-1">Bu değeri değiştirmek COGS ve kâr hesaplarını etkiler. Dikkatli giriniz.</p>
              </div>

              <button type="submit" className="w-full h-10 rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-500/20">
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, trend, accent = "default" }: { title: string, value: string, icon: React.ReactNode, trend?: string, accent?: "default" | "green" | "orange" | "red" }) {
  const bgColors = {
    default: "bg-white/5 text-white border-white/10",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  }
  const colorClass = bgColors[accent];

  return (
    <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col relative overflow-hidden group hover:border-white/20 transition-colors">
       <div className={`w-10 h-10 rounded-xl mb-4 flex flex-shrink-0 items-center justify-center border ${colorClass}`}>
         {icon}
       </div>
       <div className="text-neutral-400 text-sm mb-1">{title}</div>
       <div className="text-2xl font-bold">{value}</div>
       {trend && <div className="text-xs text-green-400 font-medium mt-3 flex items-center gap-1">{trend}</div>}
       <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors"></div>
    </div>
  );
}
