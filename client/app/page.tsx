import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/layout/hero";

export const metadata: Metadata = {
  title: "Beranda",
};

export default function Home() {
  return (
    <>
    <Header/>
    <Hero/>
    <Footer/>
    </>
  );
}
