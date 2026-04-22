"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  RefreshCw,
  FileText,
  Package,
  X,
  Edit2,
  Trash2
} from "lucide-react";

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<"summary" | "staff" | "transactions">("summary");
  
  const [pivotData, setPivotData] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search States
  const [transPage, setTransPage] = useState(1);
  const [transSearch, setTransSearch] = useState("");
  const [transSearchInput, setTransSearchInput] = useState("");
  const [totalTransPages, setTotalTransPages] = useState(1);

  // Form States
  const [staffForm, setStaffForm] = useState({ firstName: "", lastName: "", role: "", baseSalary: "", paymentType: "WEEKLY" });
  const [transForm, setTransForm] = useState({ type: "INCOME", category: "REPAIR", amount: "", description: "" });
  const [paymentModal, setPaymentModal] = useState<{isOpen: boolean, staff: any, amount: string}>({ isOpen: false, staff: null, amount: "" });
  const [editStaffModal, setEditStaffModal] = useState<{isOpen: boolean, data: any}>({ isOpen: false, data: null });

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // When page or search changes, refetch transactions
  useEffect(() => {
    fetchTransactions(transPage, transSearch);
  }, [transPage, transSearch]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const [pivotRes, staffRes] = await Promise.all([
        fetch("/api/transactions/summary"),
        fetch("/api/staff")
      ]);
      const pivotJson = await pivotRes.json();
      const staffJson = await staffRes.json();
      
      if (pivotJson.success) setPivotData(pivotJson.data);
      if (staffJson.success) setStaffList(staffJson.data);
    } catch (err) {
      console.warn("Veri çekilemedi", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactions(page: number, search: string) {
    try {
      const transRes = await fetch(`/api/transactions?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
      const transJson = await transRes.json();
      if (transJson.success) {
        setTransactions(transJson.data);
        setTotalTransPages(transJson.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.warn("İşlemler çekilemedi", err);
    }
  }

  function refreshAll() {
    fetchDashboardData();
    fetchTransactions(1, transSearch);
    setTransPage(1);
  }



  async function handleStaffSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staffForm)
    });
    setStaffForm({ firstName: "", lastName: "", role: "", baseSalary: "", paymentType: "WEEKLY" });
    refreshAll();
  }

  async function handleEditStaffSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaffModal.data) return;
    
    await fetch(`/api/staff/${editStaffModal.data._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editStaffModal.data)
    });
    setEditStaffModal({ isOpen: false, data: null });
    refreshAll();
  }

  async function handleDeleteStaff(id: string) {
    if (!confirm("Bu personeli silmek istediğinize emin misiniz?")) return;
    
    await fetch(`/api/staff/${id}`, {
      method: "DELETE"
    });
    setEditStaffModal({ isOpen: false, data: null });
    refreshAll();
  }

  async function handleManualPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentModal.staff || !paymentModal.amount) return;

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "EXPENSE",
        category: "SALARY",
        amount: Number(paymentModal.amount),
        description: `Personel Ödemesi: ${paymentModal.staff.firstName} ${paymentModal.staff.lastName}`,
        relatedStaffId: paymentModal.staff._id
      })
    });
    
    setPaymentModal({ isOpen: false, staff: null, amount: "" });
    refreshAll();
  }

  async function handleTransSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transForm)
    });
    setTransForm({ type: "INCOME", category: "REPAIR", amount: "", description: "" });
    refreshAll();
  }


  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-orange-500/30">
      


      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Finans & Personel Modülü</h1>
            <p className="text-neutral-400 text-sm">Aylık gelir/gider pivot tablosu, personel bordro yönetimi ve kasa defteri.</p>
          </div>
          <div className="flex overflow-x-auto scrollbar-hide bg-neutral-900 border border-white/10 rounded-lg p-1 w-full md:w-auto">
            <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")} icon={<FileText size={16} className="shrink-0" />} title="Pivot Özet" />
            <TabButton active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")} icon={<Wallet size={16} className="shrink-0" />} title="Kasa Giriş/Çıkış" />
            <TabButton active={activeTab === "staff"} onClick={() => setActiveTab("staff")} icon={<Users size={16} className="shrink-0" />} title="Personeller" />
          </div>
        </div>

        {/* PIVOT ÖZET TABLOSU VIEW */}
        {activeTab === "summary" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick KPI for the year */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Yıllık Brüt Gelir" value={`₺${pivotData.reduce((acc, p) => acc + p.grossIncome, 0).toLocaleString()}`} icon={<TrendingUp size={20} />} accent="green" />
              <StatCard title="İşletme Gideri" value={`₺${pivotData.reduce((acc, p) => acc + p.operatingExpense, 0).toLocaleString()}`} icon={<TrendingDown size={20} />} accent="red" />
              <StatCard title="Stok Yatırımı" value={`₺${pivotData.reduce((acc, p) => acc + p.stockInvestment, 0).toLocaleString()}`} icon={<Package size={20} />} accent="orange" />
              <StatCard title="Net Kâr (Gerçek Kazanım)" value={`₺${pivotData.reduce((acc, p) => acc + p.netProfit, 0).toLocaleString()}`} icon={<Wallet size={20} />} accent="default" />
            </div>

            <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
              <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-lg text-white">Ay Sonu Gelir-Gider Pivot Tablosu</h3>
              </div>
              <div className="overflow-x-auto relative">
                <table className="w-full text-left text-sm text-neutral-300 min-w-[700px] whitespace-nowrap">
                  <thead className="bg-black/40 text-neutral-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 font-medium">Ay</th>
                      <th className="px-4 sm:px-6 py-4 font-medium text-right text-green-400">Brüt Gelir</th>
                      <th className="px-4 sm:px-6 py-4 font-medium text-right text-orange-400">Stok Alım Yatırımı</th>
                      <th className="px-4 sm:px-6 py-4 font-medium text-right text-neutral-400">Satılanın Maliyeti</th>
                      <th className="px-4 sm:px-6 py-4 font-medium text-right text-red-400">İşletme Gid.</th>
                      <th className="px-4 sm:px-6 py-4 font-medium text-right text-white text-base">Net Kâr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pivotData.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 sm:px-6 py-4 font-medium text-white">{row.month}</td>
                        <td className="px-4 sm:px-6 py-4 text-right text-green-400">₺{row.grossIncome.toLocaleString()}</td>
                        <td className="px-4 sm:px-6 py-4 text-right text-orange-400">₺{row.stockInvestment.toLocaleString()}</td>
                        <td className="px-4 sm:px-6 py-4 text-right text-neutral-400">₺{row.cogs.toLocaleString()}</td>
                        <td className="px-4 sm:px-6 py-4 text-right text-red-400">₺{row.operatingExpense.toLocaleString()}</td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded font-medium text-sm ${row.netProfit >= 0 ? "bg-white text-black" : "bg-red-500 text-white"}`}>
                            ₺{Math.abs(row.netProfit).toLocaleString()} {row.netProfit >= 0 ? "(+)" : "(-)"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* KASA GİRİŞ / ÇIKIŞ VIEW */}
        {activeTab === "transactions" && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-neutral-900 border border-white/10 rounded-2xl p-5 shadow-2xl">
                 <h3 className="font-semibold text-white mb-4">Yeni Finansal Hareket Ekle</h3>
                 <form onSubmit={handleTransSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">İşlem Yönü</label>
                      <select required value={transForm.type} onChange={e => setTransForm({...transForm, type: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white">
                        <option value="INCOME">Gelir (Kasa Girişi)</option>
                        <option value="EXPENSE">Gider (Kasa Çıkışı)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">Kategori</label>
                      <select required value={transForm.category} onChange={e => setTransForm({...transForm, category: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white">
                        <option value="REPAIR">Tamir Geliri</option>
                        <option value="UTILITY">Fatura vb. Giderler</option>
                        <option value="ACCOUNTING">Muhasebe (SGK, Stopaj vb.)</option>
                        <option value="OTHER">Diğer</option>
                      </select>
                      <p className="text-xs text-neutral-600 mt-1">Parça satışları Stok modülü üzerinden yapılmalıdır.</p>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">Tutar (₺)</label>
                      <input type="number" required value={transForm.amount} onChange={e => setTransForm({...transForm, amount: e.target.value})} placeholder="Örn: 1500" className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">Açıklama</label>
                      <input type="text" value={transForm.description} onChange={e => setTransForm({...transForm, description: e.target.value})} placeholder="Örn: Elektrik Faturası" className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                    </div>
                    <button type="submit" className="w-full bg-white text-black font-semibold h-10 rounded-lg text-sm hover:bg-neutral-200 transition">İşlemi Kaydet</button>
                 </form>
              </div>

              <div className="md:col-span-2 bg-neutral-900 border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col h-[550px]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-semibold text-white">Son İşlemler</h3>
                  <form onSubmit={(e) => { e.preventDefault(); setTransPage(1); setTransSearch(transSearchInput); }} className="flex gap-2 w-full sm:w-auto relative">
                    <input 
                      type="text" 
                      placeholder="Açıklama Ara..." 
                      value={transSearchInput}
                      onChange={(e) => setTransSearchInput(e.target.value)}
                      className="bg-black/50 border border-white/10 rounded-lg h-9 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white w-full sm:w-[180px] pr-8" 
                    />
                    {transSearch && (
                      <button type="button" onClick={() => { setTransSearch(""); setTransSearchInput(""); setTransPage(1); }} className="absolute right-16 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white px-2 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                    <button type="submit" className="bg-white/10 text-white px-3 rounded-lg text-sm hover:bg-white/20 transition-colors font-medium shrink-0">Ara</button>
                  </form>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {transactions.map((tr) => {
                    const categoryLabels: Record<string, string> = {
                      REPAIR: "Tamir Geliri",
                      PART_SALE: "Parça Satış",
                      PART_PURCHASE: "Stok Alımı",
                      SALARY: "Personel Ödemesi",
                      INSURANCE: "Sigorta",
                      UTILITY: "Fatura vb. Giderler",
                      ACCOUNTING: "Muhasebe",
                      OTHER: "Diğer"
                    };
                    
                    const catLabel = categoryLabels[tr.category] || tr.category;
                    
                    return (
                    <div key={tr._id} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-colors">
                       <div>
                         <div className="font-semibold text-sm mb-1 text-white">{tr.description ? `${catLabel} / ${tr.description}` : catLabel}</div>
                         <div className="text-xs text-neutral-500">{new Date(tr.date).toLocaleDateString("tr-TR")}</div>
                       </div>
                       <div className={`font-bold text-lg ${tr.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                         {tr.type === "INCOME" ? "+" : "-"}₺{tr.amount.toLocaleString()}
                       </div>
                    </div>
                  )})}
                  {transactions.length === 0 && <div className="text-neutral-500 text-sm mt-8 text-center">{transSearch ? "Aramanızla eşleşen işlem bulunamadı." : "Henüz finansal işlem eklenmedi."}</div>}
                </div>
                
                {/* Pagination Controls */}
                <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-center shrink-0">
                  <button 
                     onClick={() => setTransPage(p => Math.max(1, p - 1))} 
                     disabled={transPage === 1}
                     className="px-4 py-1.5 bg-white/5 rounded-lg text-sm text-white disabled:opacity-30 hover:bg-white/10 transition-colors font-medium">
                     Önceki
                  </button>
                  <span className="text-sm text-neutral-400">Sayfa <b className="text-white">{transPage}</b> / {totalTransPages}</span>
                  <button 
                     onClick={() => setTransPage(p => Math.min(totalTransPages, p + 1))} 
                     disabled={transPage === totalTransPages || totalTransPages === 0}
                     className="px-4 py-1.5 bg-white/5 rounded-lg text-sm text-white disabled:opacity-30 hover:bg-white/10 transition-colors font-medium">
                     Sonraki
                  </button>
                </div>
              </div>
           </div>
        )}

        {/* STAFF PERSONELLER VIEW */}
        {activeTab === "staff" && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-neutral-900 border border-white/10 rounded-2xl p-5 shadow-2xl">
                 <h3 className="font-semibold text-white mb-4">Yeni Personel Ekle</h3>
                 <form onSubmit={handleStaffSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                          <label className="text-xs text-neutral-400 mb-1 block">Ad</label>
                          <input type="text" required value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                       </div>
                       <div>
                          <label className="text-xs text-neutral-400 mb-1 block">Soyad</label>
                          <input type="text" required value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                       </div>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">Rol / Unvan</label>
                      <input type="text" required placeholder="Örn: Ustabaşı, Çırak" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">Aylık Net Maaş (₺)</label>
                      <input type="number" required value={staffForm.baseSalary} onChange={e => setStaffForm({...staffForm, baseSalary: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">Maaş Periyodu</label>
                      <select required value={staffForm.paymentType} onChange={e => setStaffForm({...staffForm, paymentType: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white">
                        <option value="WEEKLY">Haftalık</option>
                        <option value="MONTHLY">Aylık</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-white text-black font-semibold h-10 rounded-lg text-sm hover:bg-neutral-200 transition">Kaydet</button>
                 </form>
              </div>

              <div className="md:col-span-2 bg-neutral-900 border border-white/10 rounded-2xl p-5 shadow-2xl h-[500px] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-white">Personel Listesi</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {staffList.map((st) => (
                    <div key={st._id} className="p-4 bg-black/40 border border-white/5 rounded-xl group hover:border-white/20 transition-colors">
                       <div className="flex items-start justify-between mb-3">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lg text-orange-500 border border-white/10 shrink-0">
                              {st.firstName[0]}{st.lastName[0]}
                           </div>
                           <div>
                              <div className="font-semibold">{st.firstName} {st.lastName}</div>
                              <div className="text-xs text-neutral-500">{st.role}</div>
                           </div>
                         </div>
                         <button onClick={() => setEditStaffModal({ isOpen: true, data: {...st} })} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
                           <Edit2 size={14} />
                         </button>
                       </div>
                       <hr className="border-white/5 mb-3" />
                       <div className="flex justify-between items-center text-sm mb-1">
                          <span className="text-neutral-400">Hedeflenen Maaş</span>
                          <span className="font-medium text-white">₺{st.baseSalary?.toLocaleString()} <span className="text-xs font-normal text-neutral-500">/{st.paymentType === "WEEKLY" ? "hafta" : "ay"}</span></span>
                       </div>
                       <button onClick={() => setPaymentModal({ isOpen: true, staff: st, amount: st.baseSalary.toString() })} className="w-full mt-3 h-8 rounded bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">💳 Ödeme Yap</button>
                    </div>
                  ))}
                  {staffList.length === 0 && <div className="col-span-2 text-neutral-500 text-sm mt-4 text-center">Henüz personel eklenmedi.</div>}
                </div>
              </div>
           </div>
        )}

        {paymentModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="font-semibold text-lg text-white">Personel Ödemesi</h3>
                <button onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })} className="text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 pb-0">
                <div className="text-sm text-neutral-400 mb-4">
                  <b>{paymentModal.staff?.firstName} {paymentModal.staff?.lastName}</b> {paymentModal.staff?.paymentType === "WEEKLY" ? "(Haftalık)" : "(Aylık)"} için manuel ödeme yapıyorsunuz. Kesinti veya eklemeleri hesaplayarak nihai tutarı girin.
                </div>
              </div>
              <form onSubmit={handleManualPayment} className="px-5 pb-5 space-y-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Ödenecek Net Tutar (₺)</label>
                  <input required value={paymentModal.amount} onChange={e => setPaymentModal({...paymentModal, amount: e.target.value})} type="number" min="0" className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white font-bold" />
                </div>
                
                <p className="text-xs text-neutral-500">Bu işlem kasadan anında düşecek ve gider olarak yansıyacaktır.</p>

                <button type="submit" className="w-full h-10 mt-4 rounded-lg bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
                  <Wallet size={16} /> Kasadan Çıkışı Onayla
                </button>
              </form>
            </div>
          </div>
        )}

        {editStaffModal.isOpen && editStaffModal.data && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="font-semibold text-lg text-white">Personel Düzenle</h3>
                <button onClick={() => setEditStaffModal({ isOpen: false, data: null })} className="text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditStaffSubmit} className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                     <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Ad</label>
                        <input type="text" required value={editStaffModal.data.firstName} onChange={e => setEditStaffModal({ ...editStaffModal, data: { ...editStaffModal.data, firstName: e.target.value } })} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                     </div>
                     <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Soyad</label>
                        <input type="text" required value={editStaffModal.data.lastName} onChange={e => setEditStaffModal({ ...editStaffModal, data: { ...editStaffModal.data, lastName: e.target.value } })} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                     </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Rol / Unvan</label>
                    <input type="text" required value={editStaffModal.data.role} onChange={e => setEditStaffModal({ ...editStaffModal, data: { ...editStaffModal.data, role: e.target.value } })} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Aylık Net Maaş (₺)</label>
                    <input type="number" required value={editStaffModal.data.baseSalary} onChange={e => setEditStaffModal({ ...editStaffModal, data: { ...editStaffModal.data, baseSalary: Number(e.target.value) } })} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Maaş Periyodu</label>
                    <select required value={editStaffModal.data.paymentType} onChange={e => setEditStaffModal({ ...editStaffModal, data: { ...editStaffModal.data, paymentType: e.target.value } })} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white">
                      <option value="WEEKLY">Haftalık</option>
                      <option value="MONTHLY">Aylık</option>
                    </select>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => handleDeleteStaff(editStaffModal.data._id)} className="w-12 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0">
                      <Trash2 size={16} />
                    </button>
                    <button type="submit" className="flex-1 bg-white text-black font-semibold h-10 rounded-lg text-sm hover:bg-neutral-200 transition">Kaydet</button>
                  </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, title }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium rounded-md transition-all shrink-0 ${active ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
    >
      {icon}
      {title}
    </button>
  );
}

function StatCard({ title, value, icon, accent = "default" }: { title: string, value: string, icon: React.ReactNode, accent?: "default" | "green" | "orange" | "red" }) {
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
       <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors"></div>
    </div>
  );
}
