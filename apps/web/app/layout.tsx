import type { Metadata } from "next";
import { Limelight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { GoogleAuthProvider } from "@/components/google-oauth-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

const limelight = Limelight({
  variable: "--font-limelight",
  subsets: ["latin"],
  weight: "400",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EventTix — Event Ticketing",
  description: "Discover events and book tickets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${limelight.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <GoogleAuthProvider>
          <AuthProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <Toaster />
          </AuthProvider>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
