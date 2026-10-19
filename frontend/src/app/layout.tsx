import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppChrome } from "@/components/app-frame";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TCGlib · One Piece",
  description: "Tu biblioteca de One Piece: las cartas que tienes y las que buscas.",
  applicationName: "TCGlib",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="min-h-full md:grid md:grid-cols-[16.5rem_minmax(0,1fr)]">
          <Suspense fallback={<AppChrome user={null} />}>
            <AuthedChrome />
          </Suspense>
          <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

async function AuthedChrome() {
  const user = await getCurrentUser();
  return <AppChrome user={user} />;
}
