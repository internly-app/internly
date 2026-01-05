import type { Metadata } from "next";
import { Roboto, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
  weight: ["300", "400", "500", "700"],
  preload: true,
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: {
    default: "Internly",
    template: "%s | Internly",
  },
  description:
    "Read honest internship reviews from students who actually did the work. Get insights on interview processes, compensation, company culture, and real day-to-day experiences.",
  keywords: [
    "internship reviews",
    "student internships",
    "tech internships",
    "internship experiences",
    "company reviews",
    "interview tips",
  ],
  authors: [{ name: "Internly Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Internly - Real Internship Reviews from Students",
    description:
      "Read honest internship reviews from students who actually did the work.",
    siteName: "Internly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Internly - Real Internship Reviews from Students",
    description:
      "Read honest internship reviews from students who actually did the work.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Always use dark mode
                  document.documentElement.classList.add('dark');
            `,
          }}
        />
      </head>
      <body
        className={`${roboto.className} ${roboto.variable} ${instrumentSerif.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
