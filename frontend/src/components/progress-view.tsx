import { redirect } from "next/navigation";
import { GoalPicker } from "@/components/goal-picker";
import { SetProgressList } from "@/components/set-progress-list";
import { getCollectionOverview } from "@/lib/collection";
import { gameProfile, GameSlug } from "@/lib/games";
import { getCurrentUser } from "@/lib/session";

export async function ProgressView({ game = "one-piece" }: { game?: GameSlug }) {
  const profile = gameProfile(game);
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?return=${encodeURIComponent(`${profile.base}/progreso`)}`);

  let overview: Awaited<ReturnType<typeof getCollectionOverview>>;
  try {
    overview = await getCollectionOverview(profile.slug);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar el progreso. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!overview) redirect(`/entrar?return=${encodeURIComponent(`${profile.base}/progreso`)}`);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-stone-500">{profile.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Progreso</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Cuánto te falta para completar cada {game === "riftbound" ? "colección" : "set"}, según el objetivo que elijas.
        </p>
      </div>
      <GoalPicker goal={overview.goal} variants={overview.variants} />
      <SetProgressList
        sets={overview.sets}
        base={profile.base}
        placeholder={profile.setSearchPlaceholder}
        emptyLabel={game === "riftbound" ? "Ninguna colección coincide con esta búsqueda." : undefined}
      />
    </div>
  );
}
