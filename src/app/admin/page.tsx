/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef } from "react";
import { X, Trash2, UserPlus, ScrollText, RefreshCw, Clock, CheckCircle, XCircle, Camera, Upload, Image as ImageIcon } from "lucide-react";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

const ACTION_STYLES: Record<string, string> = {
  YENI_PARCA: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  STOK_GIRISI: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PARCA_SATISI: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PARCA_SILINDI: "bg-red-500/10 text-red-400 border-red-500/20",
  STOK_ONAYLANDI: "bg-green-500/10 text-green-400 border-green-500/20",
  SATIS_ONAYLANDI: "bg-green-500/10 text-green-400 border-green-500/20",
  YENI_ARAC: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  ARAC_GUNCELLEME: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};
const ACTION_LABELS: Record<string, string> = {
  YENI_PARCA: "Yeni Parça",
  STOK_GIRISI: "Stok Girişi",
  PARCA_SATISI: "Parça Satışı",
  PARCA_SILINDI: "Parça Silindi",
  STOK_ONAYLANDI: "Onaylandı (Stok)",
  SATIS_ONAYLANDI: "Onaylandı (Satış)",
  YENI_ARAC: "Yeni Araç",
  ARAC_GUNCELLEME: "Araç Güncelleme",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"users" | "pending" | "logs">("pending");
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [approvalPrices, setApprovalPrices] = useState<Record<string, string>>({});
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  // Vehicle Approval State
  const [vehicleApprovalModal, setVehicleApprovalModal] = useState<{ 
    isOpen: boolean, 
    request: any, 
    workListText: string, 
    description: string,
    workListImage: string 
  }>({
    isOpen: false,
    request: null,
    workListText: "",
    description: "",
    workListImage: ""
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "", role: "USER" });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    fetchPending();
  }, []);

  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/logs?limit=100");
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function fetchPending() {
    setLoadingPending(true);
    try {
      const res = await fetch("/api/pending-requests?status=PENDING");
      const json = await res.json();
      if (json.success) setPendingRequests(json.data);
    } finally {
      setLoadingPending(false);
    }
  }

  async function handleApprove(requestId: string) {
    const price = approvalPrices[requestId];
    if (!price || Number(price) <= 0) {
      alert("Lütfen geçerli bir fiyat giriniz.");
      return;
    }
    setApprovalLoading(requestId);
    try {
      const res = await fetch(`/api/pending-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", adminPrice: Number(price) }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingRequests(prev => prev.filter(r => r._id !== requestId));
        fetchLogs();
      } else {
        alert(json.error || "Onaylanamadı.");
      }
    } finally {
      setApprovalLoading(null);
    }
  }

  async function handleVehicleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleApprovalModal.request) return;
    
    setApprovalLoading(vehicleApprovalModal.request._id);
    try {
      const res = await fetch(`/api/pending-requests/${vehicleApprovalModal.request._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "APPROVED",
          workListText: vehicleApprovalModal.workListText,
          description: vehicleApprovalModal.description,
          workListImage: vehicleApprovalModal.workListImage
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingRequests(prev => prev.filter(r => r._id !== vehicleApprovalModal.request._id));
        setVehicleApprovalModal({ isOpen: false, request: null, workListText: "", description: "", workListImage: "" });
        fetchLogs();
      } else {
        alert(json.error || "Onaylanamadı.");
      }
    } finally {
      setApprovalLoading(null);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setVehicleApprovalModal(prev => ({ ...prev, workListImage: data.url }));
      } else {
        alert("Resim yüklenemedi: " + data.error);
      }
    } catch (err) {
      alert("Resim yüklenirken hata oluştu.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleReject(requestId: string) {
    if (!confirm("Bu isteği reddetmek istediğinize emin misiniz?")) return;
    setApprovalLoading(requestId);
    try {
      const res = await fetch(`/api/pending-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (res.ok) setPendingRequests(prev => prev.filter(r => r._id !== requestId));
    } finally {
      setApprovalLoading(null);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setUsers([data.data, ...users]);
        setIsModalOpen(false);
        setFormData({ username: "", password: "", role: "USER" });
      } else {
        setError(data.error);
      }
    } catch {
      setError("Eklenemedi.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers(users.filter(u => u._id !== id));
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Yönetim Paneli</h1>
          <p className="text-neutral-400 text-sm">Bekleyen istekleri onaylayın, kullanıcıları yönetin, sistem hareketlerini takip edin.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {activeTab === "users" && (
            <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 rounded-lg bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors shadow-xl shadow-white/10">
              <UserPlus size={16} />
              Yeni Kullanıcı
            </button>
          )}
          {(activeTab === "logs" || activeTab === "pending") && (
            <button onClick={() => { fetchLogs(); fetchPending(); }} className="h-10 px-4 rounded-lg bg-neutral-800 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors">
              <RefreshCw size={14} />
              Yenile
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 mb-5 bg-neutral-900/60 p-1 rounded-xl border border-white/5 w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 shrink-0 ${activeTab === "pending" ? "bg-neutral-700 text-white shadow" : "text-neutral-500 hover:text-white"}`}
        >
          <Clock size={13} />
          Bekleyen İstekler
          {pendingRequests.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">{pendingRequests.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${activeTab === "users" ? "bg-neutral-700 text-white shadow" : "text-neutral-500 hover:text-white"}`}
        >
          Kullanıcılar ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 shrink-0 ${activeTab === "logs" ? "bg-neutral-700 text-white shadow" : "text-neutral-500 hover:text-white"}`}
        >
          <ScrollText size={13} />
          Sistem Hareketleri
        </button>
      </div>

      {/* PENDING REQUESTS TAB */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {loadingPending ? (
            <div className="flex items-center justify-center py-20 text-neutral-500">Yükleniyor...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="bg-neutral-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center py-20 text-neutral-500 gap-3">
              <CheckCircle size={36} className="text-green-500/50" />
              <p className="font-medium text-white">Harika! Bekleyen istek yok.</p>
              <p className="text-sm">Personellerden yeni bir stok veya satış talebi gelmediğinde burada görünür.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req._id} className="bg-neutral-900 border border-white/10 rounded-2xl p-5 shadow-xl hover:border-white/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          req.type === 'VEHICLE_SERVICE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                          req.type === 'SELL' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {req.type === 'VEHICLE_SERVICE' ? 'Araç Servis' : req.type === 'SELL' ? 'Satış Talebi' : 'Stok Girişi'}
                        </span>
                        {req.isNewProduct && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                            Yeni Ürün
                          </span>
                        )}
                        <span className="text-xs text-neutral-500">{formatDate(req.createdAt)}</span>
                      </div>

                      {req.type === 'VEHICLE_SERVICE' ? (
                        <>
                          <p className="font-bold text-white text-xl tracking-wider leading-tight">{req.vehicleMeta?.plate}</p>
                          <p className="text-sm text-neutral-400 mt-1">
                            Açan: <span className="text-orange-400 font-medium">{req.requestedBy}</span>
                            {req.vehicleMeta?.notes && <span className="text-neutral-500 ml-2 italic">— &quot;{req.vehicleMeta.notes}&quot;</span>}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-white text-lg leading-tight">{req.productName}</p>
                          <p className="text-sm text-neutral-400 mt-1">
                            <span className="text-white font-medium">{req.quantity} adet</span>
                            {req.isNewProduct && req.newProductMeta?.category && (
                              <span className="ml-2 text-neutral-500">— {req.newProductMeta.category}</span>
                            )}
                            {" · Talep eden: "}
                            <span className="text-orange-400 font-medium">{req.requestedBy}</span>
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.type === 'VEHICLE_SERVICE' ? (
                        <button 
                             onClick={() => setVehicleApprovalModal({ 
                               isOpen: true, 
                               request: req, 
                               workListText: req.vehicleMeta?.workListText || "", 
                               description: req.vehicleMeta?.description || "",
                               workListImage: req.vehicleMeta?.workListImage || ""
                             })}
                             className="h-10 px-5 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 flex items-center gap-2"
                        >
                           <CheckCircle size={15} />
                           Bilgileri Gir ve Kapat
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₺</span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="Fiyat girin"
                              value={approvalPrices[req._id] || ""}
                              onChange={e => setApprovalPrices(prev => ({ ...prev, [req._id]: e.target.value }))}
                              className="w-36 h-10 pl-7 pr-3 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white"
                            />
                          </div>
                          <button
                            onClick={() => handleApprove(req._id)}
                            disabled={approvalLoading === req._id}
                            className="h-10 px-4 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                          >
                            {approvalLoading === req._id ? <RefreshCw size={14} className="animate-spin" /> : <><CheckCircle size={15} /> Onayla</>}
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleReject(req._id)}
                        disabled={approvalLoading === req._id}
                        className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/80 hover:text-white transition-colors disabled:opacity-50 shrink-0"
                        title="Reddet"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === "users" && (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 shadow-2xl min-h-[400px] max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loadingUsers ? (
              <div className="col-span-1 sm:col-span-2 text-center text-neutral-500 py-10">Yükleniyor...</div>
            ) : users.map((u) => (
              <div key={u._id} className="p-4 bg-black/40 border border-white/5 rounded-xl group hover:border-white/20 transition-colors flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-base">{u.username}</div>
                  <div className={`text-xs mt-1 font-medium inline-block px-2 py-0.5 rounded-full border ${u.role === "SUPERADMIN" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-neutral-800 text-neutral-400 border-white/5"}`}>
                    {u.role}
                  </div>
                </div>
                <button onClick={() => handleDelete(u._id)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500/80 transition-colors shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!loadingUsers && users.length === 0 && (
              <div className="col-span-1 sm:col-span-2 text-neutral-500 text-sm mt-4 text-center">Henüz kullanıcı eklenmedi.</div>
            )}
          </div>
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === "logs" && (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {loadingLogs ? (
            <div className="flex items-center justify-center py-20 text-neutral-500">Loglar yükleniyor...</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-2">
              <ScrollText size={32} className="opacity-30" />
              <p className="text-sm">Henüz hiç hareket kaydı yok.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[560px]">
                <thead className="bg-black/40 text-neutral-500 text-xs uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="px-5 py-3 font-medium">Tarih & Saat</th>
                    <th className="px-5 py-3 font-medium">Kullanıcı</th>
                    <th className="px-5 py-3 font-medium">İşlem</th>
                    <th className="px-5 py-3 font-medium">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-neutral-500 font-mono text-xs">{formatDate(log.createdAt)}</td>
                      <td className="px-5 py-3"><span className="font-semibold text-white">{log.username}</span></td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ACTION_STYLES[log.action] || "bg-neutral-800 text-neutral-400 border-white/5"}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-neutral-300">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-semibold text-lg text-white">Yeni Kullanıcı Ekle</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-5 space-y-4">
              {error && <div className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded">{error}</div>}
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Kullanıcı Adı</label>
                <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Şifre</label>
                <input type="text" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Kullanıcıya vereceğiniz şifre" className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Yetki Rolü</label>
                <select required value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-orange-500/50 text-white">
                  <option value="USER">USER — Sadece Stok & Satış</option>
                  <option value="SUPERADMIN">SUPERADMIN — Tam Yetki + Finans</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-orange-500 text-white font-semibold h-10 rounded-lg text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 mt-4">
                Kullanıcıyı Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
      {/* VEHICLE SERVICE APPROVAL MODAL */}
      {vehicleApprovalModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-lg my-auto animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="font-bold text-xl">Servis Bilgilerini Tamamla</h3>
              <button 
                onClick={() => setVehicleApprovalModal({ ...vehicleApprovalModal, isOpen: false })}
                className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleVehicleApprove} className="p-6 space-y-6">
               <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Araç Plakası</span>
                  <span className="text-lg font-bold text-white tracking-widest">{vehicleApprovalModal.request?.vehicleMeta?.plate}</span>
               </div>

               <div>
                 <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Araç Açıklaması (Gerekirse Güncelle)</label>
                 <input 
                   type="text" 
                   placeholder="Mavi BMW 320i..." 
                   className="w-full h-12 px-4 rounded-xl bg-black border border-white/10 text-sm focus:outline-none focus:border-orange-500"
                   value={vehicleApprovalModal.description}
                   onChange={(e) => setVehicleApprovalModal({ ...vehicleApprovalModal, description: e.target.value })}
                 />
               </div>

               <div>
                 <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Yapılan İşlem Listesi</label>
                 <textarea 
                   required
                   placeholder="Yağ değişimi, balata kontrolü..." 
                   className="w-full h-32 p-4 rounded-xl bg-black border border-white/10 text-sm focus:outline-none focus:border-orange-500 resize-none"
                   value={vehicleApprovalModal.workListText}
                   onChange={(e) => setVehicleApprovalModal({ ...vehicleApprovalModal, workListText: e.target.value })}
                 />
               </div>

                <div 
                  onClick={() => !uploadingImage && fileInputRef.current?.click()}
                  className={`relative group h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                    ${vehicleApprovalModal.workListImage ? "border-green-500/50 bg-green-500/5" : "border-white/10 hover:border-orange-500/50 bg-black/40"}`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                  
                  {uploadingImage ? (
                    <RefreshCw className="text-orange-500 animate-spin" size={24} />
                  ) : vehicleApprovalModal.workListImage ? (
                    <>
                      <img 
                        src={vehicleApprovalModal.workListImage} 
                        alt="Preview" 
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-40 group-hover:opacity-20 transition-opacity" 
                      />
                      <ImageIcon className="text-green-400 relative z-10" size={24} />
                      <span className="text-[10px] font-bold text-green-400 uppercase relative z-10 tracking-widest">Resmi Güncelle</span>
                    </>
                  ) : (
                    <>
                      <Upload className="text-neutral-500 group-hover:text-orange-500 transition-colors" size={24} />
                      <span className="text-[10px] font-bold text-neutral-500 uppercase group-hover:text-orange-400 transition-colors tracking-widest">İş Listesi Fotoğrafı Ekle</span>
                    </>
                  )}
                </div>

               <button 
                type="submit" 
                disabled={approvalLoading === vehicleApprovalModal.request?._id}
                className="w-full h-14 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
               >
                 {approvalLoading === vehicleApprovalModal.request?._id ? <RefreshCw className="animate-spin" /> : "Servis Kaydını Kapat ve Kaydet"}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
