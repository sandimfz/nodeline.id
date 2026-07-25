import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import type { ReactNode } from "react";

export default function ApiDirectoryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
