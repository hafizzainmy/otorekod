"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
      }
    }
    checkUser();
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden text-white font-sans selection:bg-sky-500 selection:text-white">
      
      {/* 1. BACKGROUND IMAGE WITH BLUE TINT OVERLAY */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition duration-700"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1600')",
        }}
      />
      {/* Custom color grading overlay matching your blue palette */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-sky-600/80 via-sky-600/75 to-blue-800/95 mix-blend-multiply" />

      {/* 2. DECORATIVE SIDE ACCENT ARROWS */}
      {/* Left Chevron Stack */}
      <div className="absolute left-6 top-1/3 -translate-y-1/2 z-10 hidden md:flex flex-col gap-3 opacity-30 select-none">
        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </div>

      {/* Right Chevron Stack */}
      <div className="absolute right-6 top-2/3 -translate-y-1/2 z-10 hidden md:flex flex-col gap-3 opacity-30 select-none">
        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </div>

     {/* 3. NAVIGATION HEADER */}
     <header className="relative z-20 w-full px-6 py-5 md:px-12 flex items-center justify-between">
        {/* Logo Brand Link */}
        <Link 
          href={isLoggedIn ? "/dashboard" : "/login"} 
          className="flex items-center gap-3 hover:opacity-85 transition"
        >
          {/* Logo Icon */}
          <svg className="h-8 w-8 text-white fill-current" viewBox="0 0 24 24">
            <path d="M23.5 13.5c0-.828-.672-1.5-1.5-1.5h-1.072l-1.36-3.393c-.34-.848-1.168-1.407-2.08-1.407H6.512c-.912 0-1.74.559-2.08 1.407l-1.36 3.393H2c-.828 0-1.5.672-1.5 1.5V17c0 .828.672 1.5 1.5 1.5h1.5c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5h8c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5h1.5c.828 0 1.5-.672 1.5-1.5v-3.5zM6.5 17c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zm11 0c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zM5.512 9h12.976l1.2 3H4.312l1.2-3z" />
          </svg>
          <span className="text-2xl font-black tracking-tight text-white">OtoRekod</span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6 text-sm font-semibold tracking-wide text-white/90">
          <Link href="/pricing" className="hover:text-white transition">Harga</Link>
          <Link href={isLoggedIn ? "/dashboard" : "/login"} className="hover:text-white transition">Log Masuk</Link>
          
          {/* Linked Daftar Button */}
          <Link 
            href={isLoggedIn ? "/dashboard" : "/login"} 
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-1.5 rounded-lg transition"
          >
            Daftar
          </Link>
        </nav>
      </header>

      {/* 4. HERO SECTION */}
      <section className="relative z-20 w-full px-6 flex flex-col items-center justify-center text-center flex-grow py-12">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-md">
            Rekod digital untuk kenderaan anda
          </h2>
          <p className="text-base md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-medium">
            Urus sejarah penyelenggaraan kereta anda dengan mudah tanpa resit kertas yang cepat pudar
          </p>
        </div>

        {/* Dynamic Dashed CTA Button */}
        <Link 
          href={isLoggedIn ? "/dashboard" : "/login"}
          className="mt-12 group block relative"
        >
          {/* Dashed outer border area */}
          <div className="border-2 border-dashed border-white/45 bg-white/5 backdrop-blur-md px-10 py-8 rounded-3xl transition duration-300 group-hover:bg-white/10 group-hover:scale-105 active:scale-95 shadow-lg select-none max-w-md mx-auto">
            <h3 className="text-3xl md:text-4xl font-extrabold text-sky-200 tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(56,189,248,0.4)]">
              Klik disini untuk
            </h3>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-2 leading-none">
              simpan rekod
            </h3>
            <h3 className="text-3xl md:text-4xl font-extrabold text-sky-200 tracking-tight mt-2 leading-none drop-shadow-[0_2px_12px_rgba(56,189,248,0.4)]">
              kereta anda
            </h3>
          </div>
        </Link>
      </section>

      {/* 5. FOOTER */}
      <footer className="relative z-20 w-full px-6 py-6 md:px-12 flex flex-col md:flex-row items-center justify-between border-t border-white/10 gap-4 text-xs font-semibold tracking-wide text-white/70 bg-gradient-to-t from-blue-900/40 to-transparent">
        <div className="flex items-center gap-2">
          {/* Logo outline icon */}
          <svg className="h-5 w-5 text-white/70 fill-current" viewBox="0 0 24 24">
            <path d="M23.5 13.5c0-.828-.672-1.5-1.5-1.5h-1.072l-1.36-3.393c-.34-.848-1.168-1.407-2.08-1.407H6.512c-.912 0-1.74.559-2.08 1.407l-1.36 3.393H2c-.828 0-1.5.672-1.5 1.5V17c0 .828.672 1.5 1.5 1.5h1.5c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5h8c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5h1.5c.828 0 1.5-.672 1.5-1.5v-3.5zM6.5 17c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zm11 0c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zM5.512 9h12.976l1.2 3H4.312l1.2-3z" />
          </svg>
          <span>@ 2026 OtoRekod.com / All Rights Reserved</span>
        </div>

        <nav className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-white transition">Terma & Syarat</Link>
          <Link href="/privacy" className="hover:text-white transition">Dasar Privacy</Link>
          <Link href="/contact" className="hover:text-white transition">Hubungi Kami</Link>
        </nav>
      </footer>

    </div>
  );
}