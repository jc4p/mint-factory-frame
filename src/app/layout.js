import { Space_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { FrameInit } from "@/components/FrameInit";

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  variable: "--font-space-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata = {
  title: "NFT Factory",
  description: "Create your own NFT collection",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} ${orbitron.variable}`}>
        <div>
          {children}
          <FrameInit />
        </div>
      </body>
    </html>
  );
}
