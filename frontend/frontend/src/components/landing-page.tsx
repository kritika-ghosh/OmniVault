"use client";

import React, { useEffect } from "react";
import gsap from "gsap";
import { GridDistortionCanvas, Header, Footer } from "@/components/landing/landing-layout";
import { HeroSection, MockIDEPreview } from "@/components/landing/hero-section";
import { ScrollytellingSection } from "@/components/landing/scrollytelling-section";
import {
  InteractivePlayground,
  AgentArchitecture,
  FeatureMatrix,
  FAQSection,
  CTABanner,
} from "@/components/landing/features-section";

export default function LandingPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Hero Entrance Animations
    gsap.fromTo(
      ".gsap-hero-badge",
      { opacity: 0, y: -20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.7)" }
    );

    gsap.fromTo(
      ".gsap-hero-title",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.2, ease: "power3.out" }
    );

    gsap.fromTo(
      ".gsap-hero-desc",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, delay: 0.4, ease: "power2.out" }
    );

    gsap.fromTo(
      ".gsap-hero-btn",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, delay: 0.6, stagger: 0.15, ease: "power2.out" }
    );

    // 2. Floating animation for Mock IDE Preview
    gsap.to(".gsap-mock-ide", {
      y: -10,
      repeat: -1,
      yoyo: true,
      duration: 3.5,
      ease: "sine.inOut",
    });

    // 3. Scroll Cards Entrance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(entry.target, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
            });
          }
        });
      },
      { threshold: 0.05 }
    );

    const scrollCards = document.querySelectorAll(".gsap-scroll-card");
    scrollCards.forEach((card) => {
      gsap.set(card, { opacity: 0.4, y: 20 });
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen text-foreground flex flex-col font-sans select-none antialiased relative">
      <GridDistortionCanvas />
      <Header />
      <HeroSection />
      <ScrollytellingSection />
      <InteractivePlayground />
      <AgentArchitecture />
      <FeatureMatrix />
      <FAQSection />
      <CTABanner />
      <Footer />
    </div>
  );
}
