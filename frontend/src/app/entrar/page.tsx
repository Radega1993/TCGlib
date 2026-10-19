import { Suspense } from "react";
import { EntrarView } from "@/components/entrar-view";

export default function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-md rounded-2xl bg-stone-200" />}>
      <EntrarView searchParams={searchParams} />
    </Suspense>
  );
}
