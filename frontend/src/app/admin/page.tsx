import { Suspense } from "react";
import { AdminView } from "@/components/admin-view";

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <AdminView searchParams={searchParams} />
    </Suspense>
  );
}
