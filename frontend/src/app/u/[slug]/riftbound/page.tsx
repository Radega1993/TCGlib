import { Suspense } from "react";
import { PublicCollection } from "@/components/public-collection";

export default function SharedRiftboundPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <SharedSlot params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SharedSlot({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  return <PublicCollection slug={slug} searchParams={searchParams} game="riftbound" />;
}
