"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Car, 
  Search, 
  Plus, 
  Camera, 
  FileText, 
  History, 
  User, 
  Calendar,
  X,
  Upload,
  Loader2,
  ChevronRight,
  Maximize2
} from "lucide-react";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AracTakipPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    plate: "",
    description: "",
    workListText: "",
    notes: ""
  });
  const [vehicleImage, setVehicleImage] = useState<File | null>(null);
  const [workListImage, setWorkListImage] = useState<File | null>(null);
   const [uploading, setUploading] = useState(false);
   const [error, setError] = useState("");
   const [userRole, setUserRole] = useState<string>("USER");

  const vehicleInputRef = useRef<HTMLInputElement>(null);
  const workListInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles");
      
      // Auth check
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json();
      if (json.success) setVehicles(json.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) setUserRole(data.user.role);
      });
  }, []);

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(search.toLowerCase())
  );

  async function handleUpload(file: File) {
    const data = new FormData();
    data.append("file", file);
    data.append("folder", "arac_takip");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: data
    });
    const json = await res.json();
    if (json.success) return json.data.secure_url;
    throw new Error("Yükleme başarısız");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setError("");

    try {
      let vehicleImgUrl = "";
      let workListImgUrl = "";

      if (vehicleImage) vehicleImgUrl = await handleUpload(vehicleImage);
      if (workListImage) workListImgUrl = await handleUpload(workListImage);

      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: formData.plate.toUpperCase().replace(/\s/g, ""),
          description: formData.description,
          workListText: formData.workListText,
          notes: formData.notes,
          vehicleImage: vehicleImgUrl,
          workListImage: workListImgUrl
        })
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setFormData({ plate: "", description: "", workListText: "", notes: "" });
        setVehicleImage(null);
        setWorkListImage(null);
        // Redirect to the detail page of the new/updated vehicle
        if (json.pending) {
          alert("Servis açılış isteği yöneticiye iletildi. Onaylandıktan sonra araç listesinde görünecektir.");
          setIsModalOpen(false);
          setFormData({ plate: "", description: "", workListText: "", notes: "" });
          setVehicleImage(null);
          setWorkListImage(null);
        } else {
          router.push(`/arac-takip/${formData.plate.toUpperCase().replace(/\s/g, "")}`);
        }
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError("Kaydedilirken bir hata oluştu.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Araç Takip Sistemi</h1>
          <p className="text-neutral-400">Araç bakım geçmişini, plakaları ve servis fotoğraflarını yönetin.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="h-12 px-6 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 shrink-0"
        >
          <Plus size={20} />
          Yeni Servis Kaydı
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
        <input 
          type="text" 
          placeholder="Plaka ile ara (örn: 34ABC123)..." 
          className="w-full h-14 pl-12 pr-4 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-orange-500/50 transition-all shadow-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase().replace(/\s/g, ""))}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-neutral-500">
             <Loader2 className="animate-spin mx-auto mb-4" size={32} />
             Yükleniyor...
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="col-span-full py-20 text-center text-neutral-500 bg-neutral-900/50 rounded-3xl border border-dashed border-white/10">
            {search ? "Aradığınız kriterde araç bulunamadı." : "Henüz kayıtlı araç bulunmuyor."}
          </div>
        ) : (
          filteredVehicles.map(v => (
            <button 
              key={v._id} 
              onClick={() => router.push(`/arac-takip/${v.plate}`)}
              className="group p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-white/5 hover:border-orange-500/50 transition-all text-left relative overflow-hidden shadow-xl"
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Car size={80} />
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Car size={28} />
                </div>
                <div>
                  <div className="bg-black/50 px-2.5 py-1 rounded-md border border-white/10 inline-block">
                    <span className="font-bold text-lg tracking-widest text-white uppercase">{v.plate}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 uppercase font-bold tracking-wider">{v.history.length} Servis Kaydı</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed h-10">{v.description || "Açıklama girilmemiş"}</p>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                      <Calendar size={14} />
                      {formatDate(v.updatedAt)}
                   </div>
                   <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 group-hover:text-white group-hover:bg-orange-600 transition-all">
                      <ChevronRight size={18} />
                   </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-2xl my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/5">
              <h3 className="font-bold text-xl sm:text-2xl">Yeni Servis Kaydı</h3>
              <button 
                onClick={() => {
                   if (uploading) return;
                   setIsModalOpen(false);
                }} 
                className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6">
              {error && <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded-xl text-center">{error}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Plate & Description */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Araç Plakası</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="34ABC123" 
                      className="w-full h-14 px-4 rounded-xl bg-black border border-white/10 text-xl font-bold tracking-widest focus:outline-none focus:border-orange-500"
                      value={formData.plate}
                      onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase().replace(/\s/g, "")})}
                    />
                    <p className="text-[10px] text-neutral-600 mt-1">* Boşluk bırakmayın. Otomatik düzeltilir.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Araç Açıklaması</label>
                    <input 
                      type="text" 
                      placeholder="Örn: Mavi BMW 320i" 
                      className="w-full h-12 px-4 rounded-xl bg-black border border-white/10 text-sm focus:outline-none focus:border-orange-500"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>

                {/* Upload Buttons */}
                <div className="grid grid-cols-2 gap-4">
                   <div 
                    onClick={() => vehicleInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${vehicleImage ? "border-green-500 bg-green-500/5 text-green-500" : "border-white/10 hover:border-orange-500/50 bg-black/20 text-neutral-500 hover:text-orange-500"}`}
                   >
                     <Camera size={28} />
                     <span className="text-[10px] font-bold uppercase">{vehicleImage ? "Araç Seçildi" : "Araç Fotosu"}</span>
                     <input ref={vehicleInputRef} hidden type="file" accept="image/*" onChange={(e) => setVehicleImage(e.target.files?.[0] || null)} />
                   </div>
                   <div 
                    onClick={() => workListInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${workListImage ? "border-green-500 bg-green-500/5 text-green-500" : "border-white/10 hover:border-orange-500/50 bg-black/20 text-neutral-500 hover:text-orange-500"}`}
                   >
                     <Upload size={28} />
                     <span className="text-[10px] font-bold uppercase">{workListImage ? "Liste Seçildi" : "İş Listesi Foto"}</span>
                     <input ref={workListInputRef} hidden type="file" accept="image/*" onChange={(e) => setWorkListImage(e.target.files?.[0] || null)} />
                   </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Yapılan İşlem Listesi</label>
                <textarea 
                  placeholder="Yağ değişimi, fren kontrolü..." 
                  className="w-full h-32 p-4 rounded-xl bg-black border border-white/10 text-sm focus:outline-none focus:border-orange-500 resize-none"
                  value={formData.workListText}
                  onChange={(e) => setFormData({...formData, workListText: e.target.value})}
                ></textarea>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Ekstra Notlar</label>
                <textarea 
                  placeholder="Gelecek bakım için su fıskiyesi değişecek..." 
                  className="w-full h-20 p-4 rounded-xl bg-black border border-white/10 text-sm focus:outline-none focus:border-orange-500 resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full h-16 rounded-2xl bg-orange-500 text-white font-bold text-lg hover:bg-orange-600 transition shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Kaydı Onayla ve Sisteme Gönder"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
