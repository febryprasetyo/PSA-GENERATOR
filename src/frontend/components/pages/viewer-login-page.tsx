"use client";

import { FormEvent, useState } from "react";
import { LayoutDashboard, KeyRound, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { appRoutes } from "@/frontend/lib/routes";
import { useAuth } from "@/frontend/hooks/useAuth";

export default function ViewerLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const passVal = password || (formData.get("password") as string) || "";

    if (!passVal) {
      setError("Kata sandi harus diisi.");
      return;
    }

    try {
      await login("viewer", passVal, appRoutes.viewer);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Periksa kembali kata sandi.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Background Ornaments / Gradients */}
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-blue-100 blur-[100px]"></div>
      <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-indigo-100 blur-[120px]"></div>

      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 md:flex">
          
          {/* Left Panel */}
          <div className="relative flex flex-col justify-between bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 md:w-5/12 lg:p-12 border-b border-slate-100 md:border-b-0 md:border-r">
            <div className="relative z-10">
              <div className="mb-6">
                <img src="/logo-mgm.png" alt="MGM Logo" className="h-16 w-auto object-contain" />
              </div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 lg:text-4xl">
                Layar<br />
                <span className="text-blue-600">Pemantau.</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Akses tampilan layar penuh (*fullscreen*) khusus untuk memonitor data tangki secara langsung tanpa gangguan kontrol operasional.
              </p>
            </div>
            
            <div className="relative z-10 mt-12 md:mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  </div>
                  Optimized for Smart TVs
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                  </div>
                  Auto-refresh Data
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col justify-center bg-white p-8 md:w-7/12 lg:p-14">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-8 text-center md:text-left">
                <h2 className="text-2xl font-bold text-slate-900">Akses Viewer</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Masukkan sandi khusus akun pemantau TV.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Password Viewer</label>
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
                        placeholder="Kata sandi viewer..."
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
                      Masuk sebagai Viewer
                      <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
          
            </div>
            <div className="mt-8 text-center text-xs font-medium text-slate-500">
              Sesi login TV Monitor akan aktif selama 24 jam.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
