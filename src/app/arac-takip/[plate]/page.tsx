/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Car, 
  ArrowLeft, 
  Calendar, 
  User, 
  Maximize2, 
  FileText, 
  History,
  Loader2,
  Edit2,
  X,
  Save,
  RefreshCw
} from "lucide-react";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plate = params.plate as string;
  
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string>("USER");

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    type: "VEHICLE" | "ENTRY";
    entryId?: string;
    description: string;
    workListText: string;
    notes: string;
  }>({
    isOpen: false,
    type: "VEHICLE",
    description: "",
    workListText: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) setUserRole(data.user.role);
      });
  }, []);

  useEffect(() => {
    if (plate) {
      fetchVehicle();
    }
  }, [plate]);

  async function fetchVehicle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${plate}`);

      // Auth check
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json();
      if (json.success) {
        setVehicle(json.data);
      } else {
        setError(json.error || "Araç bulunamadı.");
      }
    } catch (err) {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${plate}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editModal.type === "VEHICLE" ? editModal.description : undefined,
          entryId: editModal.type === "ENTRY" ? editModal.entryId : undefined,
          workListText: editModal.type === "ENTRY" ? editModal.workListText : undefined,
          notes: editModal.type === "ENTRY" ? editModal.notes : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setVehicle(json.data);
        setEditModal({ ...editModal, isOpen: false });
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-neutral-400 animate-pulse">Servis kayıtları yükleniyor...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in zoom-in duration-500">
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-red-500 blur-[80px] opacity-10 animate-pulse"></div>
           <div className="w-24 h-24 rounded-3xl bg-neutral-900 border border-white/5 flex items-center justify-center relative z-10 shadow-2xl">
              <Car size={48} className="text-red-500 opacity-50" />
           </div>
           <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white border-4 border-neutral-950 z-20">
              <X size={16} strokeWidth={3} />
           </div>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-3 text-center">Araç Bulunamadı</h2>
        <p className="text-neutral-500 text-center max-w-sm mb-10 leading-relaxed">
          Aradığınız {plate} plakalı araca ait herhangi bir servis kaydı sisteme kaydedilmemiş veya silinmiş olabilir.
        </p>

        <button 
          onClick={() => router.push("/arac-takip")}
          className="flex items-center gap-3 bg-neutral-900 border border-white/10 hover:border-orange-500/50 text-white px-8 py-4 rounded-2xl font-bold transition-all group scale-100 hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={20} className="text-orange-500 group-hover:-translate-x-1 transition-transform" />
          Araç Listesine Dön
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Header & Back Button */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => router.push("/arac-takip")}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group mb-2 sm:mb-0"
        >
          <div className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center group-hover:border-white/30">
            <ArrowLeft size={18} />
          </div>
          <span className="font-medium text-sm">Giriş Ekranına Dön</span>
        </button>
        
        <div className="flex items-center gap-4">
           <div className="bg-orange-500/10 p-3 rounded-2xl">
              <Car className="text-orange-500" size={28} />
           </div>
           <h1 className="text-3xl font-bold tracking-tight uppercase">{vehicle.plate}</h1>
        </div>
      </div>

      {/* Vehicle Info Card */}
      <div className="bg-neutral-900 rounded-3xl border border-white/10 p-5 sm:p-6 mb-8 sm:mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Car size={120} />
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
             <div className="flex items-center justify-between mb-1 ml-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold leading-none">Araç Açıklaması</p>
                {userRole === "SUPERADMIN" && (
                   <button 
                     onClick={() => setEditModal({ isOpen: true, type: "VEHICLE", description: vehicle.description || "", workListText: "", notes: "" })}
                     className="text-orange-500 hover:text-orange-400 transition-colors"
                   >
                     <Edit2 size={12} />
                   </button>
                )}
             </div>
             <p className="text-lg font-medium text-white">{vehicle.description || "Belirtilmemiş"}</p>
          </div>
          <div className="md:col-span-1">
             <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1 ml-1 leading-none">Toplam Servis</p>
             <p className="text-lg font-medium text-white">{vehicle.history.length} Kayıt</p>
          </div>
          <div className="md:col-span-1">
             <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1 ml-1 leading-none">Son İşlem Tarihi</p>
             <p className="text-lg font-medium text-white">{formatDate(vehicle.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="relative space-y-12">
        {/* Vertical Line */}
        <div className="absolute left-[2.4rem] top-8 bottom-8 w-px bg-neutral-800 hidden sm:block"></div>

        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em] mb-8 ml-2">Servis Geçmişi Zaman Tüneli</h3>

        {vehicle.history.slice().reverse().map((entry: any, i: number) => (
          <div key={i} className="relative sm:pl-16 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
            {/* Timeline Dot */}
            <div className="absolute left-[2.1rem] top-1 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-neutral-950 z-10 hidden sm:block"></div>
            
            <div className="bg-neutral-900 border border-white/5 rounded-2xl hover:border-white/10 transition-all p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-white/5 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-orange-500">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{formatDate(entry.date)}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Servis Kaydı #{vehicle.history.length - i}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-500 bg-orange-500/10 px-4 py-2 rounded-full">
                    <User size={14} />
                    <span>{entry.createdBy}</span>
                  </div>
                  {userRole === "SUPERADMIN" && (
                    <button 
                      onClick={() => setEditModal({ 
                        isOpen: true, 
                        type: "ENTRY", 
                        entryId: entry._id, 
                        description: "", 
                        workListText: entry.workListText || "", 
                        notes: entry.notes || "" 
                      })}
                      className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-orange-500 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Data Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Visuals */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {entry.vehicleImage && (
                      <div className="group relative rounded-2xl overflow-hidden aspect-video bg-black border border-white/5">
                        <img src={entry.vehicleImage} alt="Araç" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => window.open(entry.vehicleImage, '_blank')}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Maximize2 className="text-white" size={24} />
                        </button>
                        <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">Araç Fotosu</div>
                      </div>
                    )}
                    {entry.workListImage && (
                      <div className="group relative rounded-2xl overflow-hidden aspect-video bg-black border border-white/5">
                        <img src={entry.workListImage} alt="İş Listesi" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => window.open(entry.workListImage, '_blank')}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Maximize2 className="text-white" size={24} />
                        </button>
                        <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">İş Listesi</div>
                      </div>
                    )}
                 </div>

                 {/* Information */}
                 <div className="space-y-6">
                    {entry.workListText && (
                      <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <FileText size={14} className="text-orange-500" />
                          Yapılan İşlemler
                        </h4>
                        <div className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {entry.workListText}
                        </div>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <History size={14} className="text-neutral-400" />
                          Notlar
                        </h4>
                        <div className="text-neutral-400 text-sm leading-relaxed italic">
                          &quot;{entry.notes}&quot;
                        </div>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 py-10 border-t border-white/5 text-center text-neutral-600 text-xs">
         <p>Turunç ERP | Araç Takip Servis Formu</p>
      </footer>

      {/* EDIT MODAL */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-lg my-auto animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="font-bold text-xl">
                {editModal.type === "VEHICLE" ? "Araç Bilgisini Düzenle" : "Servis Kaydını Düzenle"}
              </h3>
              <button 
                onClick={() => setEditModal({ ...editModal, isOpen: false })}
                className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
               {editModal.type === "VEHICLE" ? (
                 <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Araç Açıklaması</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Mavi BMW 320i..." 
                      className="w-full h-12 px-4 rounded-xl bg-black border border-white/10 text-sm focus:outline-none focus:border-orange-500"
                      value={editModal.description}
                      onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                    />
                 </div>
               ) : (
                 <>
                   <div>
                      <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Yapılan İşlemler</label>
                      <textarea 
                        required
                        placeholder="İşlem detayları..." 
                        className="w-full h-32 p-4 rounded-xl bg-black border border-white/10 text-sm focus:outline-none focus:border-orange-500 resize-none"
                        value={editModal.workListText}
                        onChange={(e) => setEditModal({ ...editModal, workListText: e.target.value })}
                      />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Notlar</label>
                      <input 
                        type="text" 
                        placeholder="Müşteri şikayeti vb..." 
                        className="w-full h-12 px-4 rounded-xl bg-black border border-white/10 text-sm focus:outline-none focus:border-orange-500"
                        value={editModal.notes}
                        onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                      />
                   </div>
                 </>
               )}

               <button 
                type="submit" 
                disabled={saving}
                className="w-full h-14 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
               >
                 {saving ? <RefreshCw className="animate-spin" /> : (
                   <>
                    <Save size={20} />
                    Değişiklikleri Kaydet
                   </>
                 )}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
