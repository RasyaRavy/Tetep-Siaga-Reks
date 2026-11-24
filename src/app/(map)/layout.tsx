import type { ReactNode } from "react";
import { DashboardView } from "@/components/layout/DashboardView";

export const revalidate = 1800;

export default function MapGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardView />
      {children}
    </>
  );
}
