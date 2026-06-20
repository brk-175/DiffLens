import type { Metadata } from "next";
import "./globals.css";
import { Noto_Sans } from "next/font/google";
import Navbar from "./components/Navbar";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "600", "700", "900"],
  variable: "--noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DiffLens",
  description: "Expert AI pre-PR code reviewer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${notoSans.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${notoSans.className} min-h-full flex flex-col`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
