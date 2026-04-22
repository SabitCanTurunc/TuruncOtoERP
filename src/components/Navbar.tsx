"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, Building2, User, LogOut, Car, Menu, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Do not render navbar on login page
  if (pathname === '/login') return null;

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          // Only fetch pending count for superadmins
          if (data.user?.role === "SUPERADMIN") {
            fetch("/api/pending-requests?status=PENDING")
              .then(r => r.json())
              .then(j => { if (j.success) setPendingCount(j.data?.length || 0); });
          }
        }
      });
  }, [pathname]);

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!user) return <div className="h-16 w-full border-b border-white/10 bg-black/50" />; // skeleton

  const isSuperAdmin = user.role === "SUPERADMIN";

  const NavLinks = () => (
    <>
      <Link href="/" className={pathname === "/" ? "text-white" : "hover:text-white transition-colors"}>Stok</Link>
      <Link href="/arac-takip" className={pathname.startsWith("/arac-takip") ? "text-white" : "hover:text-white transition-colors"}>Araç Takip</Link>
      
      {isSuperAdmin && (
        <>
          <Link href="/finans" className={pathname.startsWith("/finans") ? "text-white" : "hover:text-white transition-colors"}>Finans</Link>
          <Link href="/admin" className={`relative ${pathname.startsWith("/admin") ? "text-white" : "hover:text-white transition-colors"}`}>
            Yönetim
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-3 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none min-w-[18px] text-center">
                {pendingCount}
              </span>
            )}
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img src="/logo.png" alt="Turunç ERP Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold tracking-tight">Turunç<span className="text-orange-500">ERP</span></span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden sm:flex flex-1 items-center justify-center gap-6 text-sm font-medium text-neutral-400">
            <NavLinks />
          </div>

          {/* Desktop User / Logout */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-end mr-2">
               <span className="text-sm font-semibold text-white leading-none">{user.username}</span>
               <span className="text-[10px] text-orange-500 leading-none mt-1">{user.role}</span>
            </div>
            <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-colors text-neutral-400">
              <LogOut size={16} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="sm:hidden w-10 h-10 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] sm:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-neutral-950 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <span className="font-bold text-lg">Menü</span>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               {/* User Info in Sidebar */}
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl uppercase">
                    {user.username[0]}
                  </div>
                  <div>
                    <p className="text-white font-bold">{user.username}</p>
                    <p className="text-xs text-orange-500 font-medium uppercase tracking-wider">{user.role}</p>
                  </div>
               </div>

               {/* Links */}
               <nav className="flex flex-col gap-4 text-lg font-medium text-neutral-400">
                  <NavLinks />
               </nav>
            </div>

            <div className="p-6 border-t border-white/5">
               <button 
                onClick={handleLogout}
                className="w-full h-12 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center gap-3 text-red-500 font-bold hover:bg-red-500/10 transition-colors"
               >
                 <LogOut size={18} />
                 Çıkış Yap
               </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

