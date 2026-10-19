import { Suspense } from "react";
import { AdminView } from "@/components/admin-view";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <AdminView />
    </Suspense>
  );
}
