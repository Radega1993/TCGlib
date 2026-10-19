import { Suspense } from "react";
import { AdminUsersView } from "@/components/admin-users-view";

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <AdminUsersView searchParams={searchParams} />
    </Suspense>
  );
}
