import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import HeyKeikoBar from "@/components/HeyKeikoBar";
import { TooltipProvider } from "@/components/ui/tooltip";

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

export const metadata: Metadata = {
  title: "Keiko",
  description: "Il tuo calendario, organizzato",
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
      className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Applica il tema salvato prima del primo paint (niente flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('keiko-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()",
          }}
        />
      </head>
      <body className="min-h-full font-sans text-foreground">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <HeyKeikoBar />
        <BottomNav />
      </body>
    </html>
  );
}
