"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Monitor, Loader2, KeyRound, User, ChevronRight } from "lucide-react";
import { appRoutes } from "@/frontend/lib/routes";
import { useAuth } from "@/frontend/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const userVal = username || (formData.get("username") as string) || "";
    const passVal = password || (formData.get("password") as string) || "";

    if (!userVal || !passVal) {
      setError("Username dan sandi harus diisi.");
      return;
    }

    try {
      await login(userVal, passVal);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Periksa kembali username dan sandi.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Background Ornaments / Gradients */}
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-blue-100 blur-[100px]"></div>
      <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-indigo-100 blur-[120px]"></div>

      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 md:flex">
          
          {/* Left Panel - Branding & Illustration */}
          <div className="relative flex flex-col justify-between bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 md:w-5/12 lg:p-12 border-b border-slate-100 md:border-b-0 md:border-r">
            <div className="relative z-10">
              <div className="mb-6">
                <img src="/logo-mgm.png" alt="MGM Logo" className="h-16 w-auto object-contain" />
              </div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 lg:text-4xl">
                PSA Oxygen<br />
                <span className="text-blue-600">Monitoring.</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Sistem pemantauan kualitas dan produksi gas medis oksigen PSA secara *real-time* untuk keandalan infrastruktur rumah sakit Anda.
              </p>
            </div>
            
            <div className="relative z-10 mt-12 md:mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  </div>
                  Real-time Data Logger
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                  </div>
                  Smart Threshold Alerts
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-600">
                    <div className="h-2 w-2 rounded-full bg-cyan-600"></div>
                  </div>
                  Multi-hospital Management
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="flex flex-col justify-center bg-white p-8 md:w-7/12 lg:p-14">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-8 text-center md:text-left">
                <h2 className="text-2xl font-bold text-slate-900">Selamat Datang</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Masuk ke akun Anda untuk mengakses panel kontrol.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Username</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        name="username"
                        required
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Masukkan username"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <KeyRound size={18} />
                      </div>
                      <input
                        type="password"
                        name="password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Masukkan kata sandi"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Masuk
                      <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-4 font-bold text-slate-400">ATAU</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={appRoutes.viewer}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                >
                  <Monitor size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  Buka Viewer Monitor
                </Link>
                <p className="mt-4 text-center text-xs font-medium text-slate-500">
                  Mode layar penuh 24 jam untuk display monitoring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
