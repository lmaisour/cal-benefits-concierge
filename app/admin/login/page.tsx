import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { adminPasswordConfigured, hasAdminSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  if (await hasAdminSession()) {
    redirect("/admin");
  }

  const params = await searchParams;
  const from =
    params.from && params.from.startsWith("/admin") ? params.from : "/admin";

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">Admin sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Internal tool for maintaining the benefits catalog.
      </p>
      <div className="mt-8">
        <AdminLoginForm from={from} configured={adminPasswordConfigured()} />
      </div>
    </section>
  );
}
