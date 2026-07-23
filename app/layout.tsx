import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, History, Settings } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spotify Tools Dashboard",
  description:
    "Manage background logger history, playlist smart-shuffling, and OAuth configurations.",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-spotify-black text-foreground">
        <div className="flex w-full min-h-screen">
          {/* Sidebar Navigation */}
          <aside className="w-64 border-r border-white/5 bg-spotify-darkgray flex flex-col justify-between shrink-0 hidden md:flex">
            <div className="p-6 flex flex-col gap-8">
              {/* Brand Logo */}
              <Link
                href="/"
                className="flex items-center gap-2.5 text-white font-bold text-lg hover:opacity-90 transition-opacity"
              >
                <span>Spotify Tools</span>
              </Link>

              {/* Navigation Menu */}
              <nav className="flex flex-col gap-1.5">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                >
                  <LayoutDashboard className="w-5 h-5 text-zinc-400" />
                  Dashboard
                </Link>
                <Link
                  href="/history"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                >
                  <History className="w-5 h-5 text-zinc-400" />
                  Play History
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                >
                  <Settings className="w-5 h-5 text-zinc-400" />
                  Settings
                </Link>
              </nav>
            </div>

            <div className="p-6 border-t border-white/5 text-[10px] text-zinc-500 font-mono">
              v0.1.0 &bull; Spotify Tools
            </div>
          </aside>

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-spotify-black overflow-y-auto">
            {/* Mobile Header */}
            <header className="h-16 border-b border-white/5 bg-spotify-darkgray px-6 flex items-center justify-between md:hidden">
              <Link
                href="/"
                className="flex items-center gap-2 text-white font-bold"
              >
                <span>Spotify Tools</span>
              </Link>
              <div className="flex gap-4">
                <Link
                  href="/"
                  className="text-zinc-400 hover:text-white text-xs"
                >
                  Dash
                </Link>
                <Link
                  href="/history"
                  className="text-zinc-400 hover:text-white text-xs"
                >
                  History
                </Link>
                <Link
                  href="/settings"
                  className="text-zinc-400 hover:text-white text-xs"
                >
                  Settings
                </Link>
              </div>
            </header>

            {/* Main Content Pane */}
            <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
