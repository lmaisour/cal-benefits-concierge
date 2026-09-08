import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { hasAdminSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const signedIn = await hasAdminSession();
  return (
    <div className="min-h-full bg-background">
      {signedIn ? <AdminNav /> : null}
      {children}
    </div>
  );
}
