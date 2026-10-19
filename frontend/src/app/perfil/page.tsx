import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <LegacyPerfil searchParams={searchParams} />
    </Suspense>
  );
}

async function LegacyPerfil({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lista = Array.isArray(params.lista) ? params.lista[0] : params.lista;
  redirect(lista === "buscando" ? "/deseados" : "/biblioteca");
  return null;
}
