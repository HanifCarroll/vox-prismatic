import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavigationLayoutServer from "./components/NavigationLayoutServer";
import QueryProvider from "./components/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content Creation System",
  description: "Transform coaching transcripts into social media content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 h-full overflow-hidden`}
      >
        <QueryProvider>
          <NavigationLayoutServer>
            {children}
          </NavigationLayoutServer>
          <Toaster position="bottom-right" richColors expand={false} closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
