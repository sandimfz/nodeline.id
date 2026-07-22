import type { Metadata } from "next";
import RegisterPage from "./register-content";

export const metadata: Metadata = {
  title: "Daftar",
};

export default function RegisterPageWrapper() {
  return <RegisterPage />;
}
