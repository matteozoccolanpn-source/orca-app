"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function checkActive(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub && Notification.permission === "granted";
  } catch {
    return false;
  }
}

async function enableNotifications(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    // iOS Safari fuori da PWA non ha PushManager
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      alert(
        "Su iPhone le notifiche funzionano solo se OrCa è installata.\n\n" +
        "Tocca Condividi → “Aggiungi a Home” → apri OrCa dalla Home."
      );
    } else {
      alert("Notifiche non supportate su questo browser.");
    }
    return false;
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") { alert("Permesso non concesso."); return false; }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) { alert("Manca NEXT_PUBLIC_VAPID_PUBLIC_KEY nella build."); return false; }

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

  if (res.ok) return true;
  alert("Errore salvataggio: " + res.status + " " + (await res.text()));
  return false;
}

export default function NotificationButton() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkActive().then(setActive);
  }, []);

  async function disableNotifications() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await sub.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  }

  async function handleClick() {
    setLoading(true);
    try {
      if (active) {
        await disableNotifications();
        setActive(false);
        alert("Notifiche disattivate");
      } else {
        const ok = await enableNotifications();
        if (ok) {
          setActive(true);
          alert("Notifiche attivate ✅");
        }
      }
    } catch (e) {
      alert("Errore: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label={active ? "Notifiche attive" : "Attiva notifiche"}
      title={active ? "Notifiche attive" : "Attiva notifiche"}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50"
      style={
        active
          ? { borderColor: "rgba(216,188,98,0.5)", color: "#D8BC62", background: "rgba(216,188,98,0.08)" }
          : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(138,144,128,0.6)", background: "rgba(255,255,255,0.03)" }
      }
    >
      <Bell className="size-3.5" fill={active ? "#D8BC62" : "none"} />
      {loading ? "…" : active ? "On" : "Off"}
    </button>
  );
}
