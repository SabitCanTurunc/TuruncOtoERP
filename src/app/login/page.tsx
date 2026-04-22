"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (data.success) {
        // Redirect to home (Stok module)
        window.location.href = "/";
      } else {
        setError(data.error || "Giriş başarısız.");
      }
    } catch (err) {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 selection:bg-orange-500/30 font-sans">
      <div className="w-full max-w-sm">
        
        <div className="flex flex-col items-center justify-center mb-8 text-center animate-in slide-in-from-top-4 duration-500">
          <img src="/logo.png" alt="Turunç ERP Logo" className="w-14 h-14 object-contain mb-4" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Turunç<span className="text-orange-500">ERP</span></h1>
          <p className="text-neutral-500 text-sm mt-2">Dükkanınızı yönetmeye başlamak için giriş yapın.</p>
        </div>

        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-500">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Kullanıcı Adı</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white transition-colors" 
                placeholder="Örn: admin"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Şifre</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-orange-500/50 text-white transition-colors" 
                placeholder="••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
        
        <p className="text-center text-xs text-neutral-600 mt-6 font-medium">İlk (Ana) yönetici girişi için .env.local dosyasındaki <br/> MASTER_ADMIN_KEY parolasını kullanınız.</p>
      </div>
    </div>
  );
}
