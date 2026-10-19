import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Everton Brito · Web Designer · UX/UI",
  description:
    "I create strategic digital experiences that connect your essence to the right audience. 7+ years, 200+ projects.",
  keywords: [
    "web designer",
    "UX/UI designer",
    "landing page",
    "business website",
    "interface design",
    "website creation",
    "freelance web design",
  ],
  authors: [{ name: "Everton Brito", url: "https://evertonbrito.com" }],
  creator: "Everton Brito",
  metadataBase: new URL("https://evertonbrito.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Everton Brito · Web Designer · UX/UI",
    description:
      "Strategic digital experiences that connect your essence to the right audience.",
    url: "https://evertonbrito.com",
    siteName: "Everton Brito",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Everton Brito · Web Designer · UX/UI",
    description:
      "Strategic digital experiences that connect your essence to the right audience.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              name: "Everton Brito · Web Designer",
              url: "https://evertonbrito.com",
              description:
                "I create strategic digital experiences that connect your essence to the right audience.",
              founder: {
                "@type": "Person",
                name: "Everton Brito",
                jobTitle: "Web Designer & UX/UI Designer",
              },
              areaServed: "Worldwide",
              serviceType: [
                "Web Design",
                "UX/UI Design",
                "Landing Pages",
                "Business Websites",
              ],
            }),
          }}
        />
      </head>
      <body>
        {/* Microsoft Clarity — maps de calor e gravações (ID ynkvl1zisv) */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "ynkvl1zisv");`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
