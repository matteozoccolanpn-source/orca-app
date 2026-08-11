import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import "./ds.css";
import GlobalChrome from "@/components/GlobalChrome";
import VersionGuard from "@/components/VersionGuard";
import SeenPing from "@/components/SeenPing";
import { TooltipProvider } from "@/components/ui/tooltip";
import SuggestProvider from "@/app/components/keiko/SuggestProvider";

// Famiglia UI unica, stile SF Pro / App Store — Inter (font variabile:
// pesi 400-700 disponibili senza dichiararli). Usata sia per corpo che
// per i titoli (la gerarchia la fanno i pesi).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Mono — solo per codici/PNR/referenze.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Font display del redesign (v4): titoli hero/saluto. Corpo resta Inter.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700"],
  display: "swap",
});

// Font display della UI V2. È lo STESSO Fraunces, ma variabile e con l'asse
// ottico acceso (`opsz`): è così che lo carica docs/mockups/keiko-v2-mock.html,
// ed è l'unico modo perché i titoli abbiano lo stesso disegno del mock — con
// un'istanza statica le lettere hanno lo stesso ingombro ma un altro spessore.
// Sta separato apposta: la UI attuale continua a leggere --font-fraunces e non
// cambia di un pixel. Quando la V2 avrà preso tutta l'app, i due diventano uno.
const frauncesV2 = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces-v2",
  axes: ["opsz"],
  display: "swap",
  preload: false,
});

// Anteprima dei link (WhatsApp, Telegram, iMessage): serve un indirizzo
// ASSOLUTO, altrimenti l'immagine non viene scaricata e resta l'icona generica.
// In produzione l'indirizzo lo mette Vercel da sé; in locale vale localhost.
// Con un dominio tuo, NEXT_PUBLIC_SITE_URL ha la precedenza su tutto.
const SITO =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const DESCRIZIONE = "Il tuo calendario, organizzato";

// Keiko è un'app da telefono: non si ingrandisce con le dita e non si gira.
// `viewportFit: "cover"` è la riga che fa funzionare gli env(safe-area-inset-*)
// già usati in mezza app: senza, valgono zero, ed è il motivo per cui aperta
// dall'icona (barra di stato trasparente) l'intestazione finiva sotto l'orologio.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITO),
  title: "Keiko",
  description: DESCRIZIONE,
  // L'icona che iOS usa quando Keiko finisce nella schermata Home.
  // (favicon.ico non sta qui: è `app/favicon.ico`, che Next collega da sé.)
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Keiko",
    locale: "it_IT",
    url: "/",
    title: "Keiko",
    description: DESCRIZIONE,
    images: [{ url: "/og-keiko.png", width: 1200, height: 630, alt: "Keiko" }],
  },
  // summary_large_image = l'immagine grande sopra il titolo, non la miniatura
  // quadrata. La leggono anche altri servizi quando manca il tag og.
  twitter: {
    card: "summary_large_image",
    title: "Keiko",
    description: DESCRIZIONE,
    images: ["/og-keiko.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Keiko",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      style={{ backgroundColor: "#0C0E13" }}
      className={`dark ${inter.variable} ${geistMono.variable} ${fraunces.variable} ${frauncesV2.variable} h-full antialiased`}
    >
      <head>
        {/* Tema scuro UNICO: forza .dark prima del primo paint e cancella
           eventuali preferenze "chiaro" salvate (keiko-theme/keiko-mood),
           così l'app non può più ribaltarsi in chiaro. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{document.documentElement.classList.add('dark');localStorage.removeItem('keiko-theme');localStorage.removeItem('keiko-mood');}catch(e){}})()",
          }}
        />
        {/* Blocca il pizzico per ingrandire. Serve perché in Safari come sito
           (non aperta dall'icona) iOS ignora `user-scalable: false`: l'unico
           modo è fermare i suoi gesti, che sono un'invenzione di WebKit e non
           esistono sugli altri browser. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{['gesturestart','gesturechange','gestureend'].forEach(function(t){document.addEventListener(t,function(e){e.preventDefault()},{passive:false})})}catch(e){}})()",
          }}
        />
        {/* DEV ONLY — Keiko è una PWA: in sviluppo un service worker residuo
           può servire asset vecchi e far vedere UI non fresca. Qui lo si
           disiscrive e si svuotano le cache a ogni load, così ciò che vedi è
           sempre l'ultimo build del dev server. In produzione questo blocco
           non viene renderizzato (le notifiche push restano intatte). */}
        {process.env.NODE_ENV !== "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})})}if(window.caches){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})})}}catch(e){}})()",
            }}
          />
        )}
      </head>
      <body className="min-h-full font-sans text-foreground">
        <TooltipProvider>
          <SuggestProvider>
            {children}
          </SuggestProvider>
        </TooltipProvider>
        <GlobalChrome />
        <SeenPing />
        <VersionGuard buildId={process.env.VERCEL_GIT_COMMIT_SHA ?? "dev"} />
      </body>
    </html>
  );
}
