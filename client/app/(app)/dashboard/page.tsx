import type { Metadata } from "next";
import DashboardPage from "./dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPageWrapper() {
  return <DashboardPage />;
}
