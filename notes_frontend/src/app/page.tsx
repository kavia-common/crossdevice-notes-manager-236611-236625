"use client";

import { useEffect, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { NotesWorkspace } from "@/components/NotesWorkspace";
import {
  getCurrentUserLocal,
  loginLocal,
  logoutLocal,
  registerLocal,
} from "@/lib/storage";

type Mode = "login" | "register";

export default function Home() {
  const [mode, setMode] = useState<Mode>("login");
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    setUser(getCurrentUserLocal());
  }, []);

  async function handleLogin(email: string, password: string) {
    const u = await loginLocal(email, password);
    setUser(u);
  }

  async function handleRegister(email: string, password: string) {
    const u = await registerLocal(email, password);
    setUser(u);
  }

  function handleLogout() {
    logoutLocal();
    setUser(null);
    setMode("login");
  }

  if (user) {
    return <NotesWorkspace user={user} onLogout={handleLogout} />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <section className="retro-card p-5 md:p-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Retro Notes
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            A cross-device notes workspace with tags, search, and autosave.
          </p>

          <div className="mt-5 space-y-3">
            <div className="retro-card-sm p-4">
              <p className="font-black">What you get</p>
              <ul className="mt-2 text-sm text-[color:var(--muted)] list-disc pl-5 space-y-1">
                <li>Responsive three-pane notes workspace</li>
                <li>Tags sidebar + quick filtering</li>
                <li>Full-text search across notes</li>
                <li>Autosave while you type</li>
              </ul>
            </div>

            <div className="retro-card-sm p-4">
              <p className="font-black">Local mode</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                This static-export frontend uses local storage by default, and
                includes an API client ready to connect to the FastAPI backend
                when endpoints are available.
              </p>
            </div>
          </div>
        </section>

        <AuthCard
          mode={mode}
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          onSwitchMode={() =>
            setMode((m) => (m === "login" ? "register" : "login"))
          }
        />
      </div>
    </main>
  );
}
