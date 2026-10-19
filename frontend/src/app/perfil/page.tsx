import { Suspense } from "react";
import { ProfileView } from "@/components/profile-view";

export default function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <ProfileView searchParams={searchParams} />
    </Suspense>
  );
}
