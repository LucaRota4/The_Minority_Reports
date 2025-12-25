"use client";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { MajorityGame } from "@/components/landing/MajorityGame";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CallToAction } from "@/components/landing/CallToAction";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <Hero />
      <Features />
      <MajorityGame />
      <HowItWorks />
      <CallToAction />
      <Footer />
    </main>
  );
}
