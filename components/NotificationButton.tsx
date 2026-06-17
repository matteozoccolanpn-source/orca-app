"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function enableNotifications() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Notifiche non supportate su questo dispositivo/browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { alert("Permesso non concesso."); return; }

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready; // aspetta che il SW sia ATTIVO

    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) { alert("Manca NEXT_PUBLIC_VAPID_PUBLIC_KEY nella build."); return; }

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key),
      }));

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });

    if (res.ok) alert("Notifiche attivate ✅");
    else alert("Errore salvataggio: " + res.status + " " + (await res.text()));
  } catch (e) {
    alert("Errore notifiche: " + (e instanceof Error ? e.message : String(e)));
  }
}

export default function NotificationButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await enableNotifications();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label="Attiva notifiche"
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#8a9080]/70 transition-colors hover:border-[#D8BC62]/40 hover:text-[#D8BC62] disabled:opacity-50"
    >
      <Bell className="size-3.5" />
      {loading ? "…" : "Notifiche"}
    </button>
  );
}
