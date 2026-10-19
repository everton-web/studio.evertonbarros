import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { Portfolio } from "@/components/Portfolio";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { CustomCursor } from "@/components/CustomCursor";
import { DotGrid } from "@/components/DotGrid";
import { LanguageProvider } from "@/context/LanguageContext";

export default function Home() {
  return (
    <LanguageProvider>
      <DotGrid />
      <CustomCursor />
      <Header />
      <main>
        <Hero />
        <Services />
        <Portfolio />
        <About />
        <Contact />
      </main>
      <Footer />
    </LanguageProvider>
  );
}
