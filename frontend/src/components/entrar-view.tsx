import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/catalog-query";
import { getAuthStatus, getCurrentUser } from "@/lib/session";

const ERRORS: Record<string, string> = {
  cancelado: "Has cancelado el acceso con Google.",
  google: "Google no ha podido completar el acceso. Vuelve a intentarlo.",
  sesion: "La sesión no es válida. Entra otra vez.",
  config: "El acceso con Google todavía no está configurado en el servidor.",
  bloqueado: "Esta cuenta está bloqueada. Si crees que es un error, escribe a quien administra TCGlib.",
};

export async function EntrarView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/biblioteca");

  const params = await searchParams;
  const returnTo = safeNextPath(first(params.return), "/biblioteca");
  const error = first(params.error);
  const status = await getAuthStatus();
  const message = error ? ERRORS[error] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
          Entra en TCGlib
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Con tu cuenta de Google guardas las cartas que tienes y las que estás buscando.
        </p>
      </div>
      {message ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">{message}</p>
      ) : null}
      {status.google ? (
        <a
          href={`/api/auth/google?return=${encodeURIComponent(returnTo)}`}
          className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-white px-4 text-sm font-medium text-stone-900 ring-1 ring-stone-300"
        >
          <span className="grid size-6 place-items-center rounded-full bg-stone-900 text-xs font-semibold text-white">
            G
          </span>
          Continuar con Google
        </a>
      ) : (
        <SetupNotice online={status.online} />
      )}
    </div>
  );
}

function SetupNotice({ online }: { online: boolean }) {
  if (!online) {
    return (
      <p className="text-sm text-stone-700">
        No se pudo conectar con la API en el puerto 3001.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-stone-50 p-3 text-sm leading-6 text-stone-700">
      <p>
        Crea un cliente OAuth de tipo aplicación web en Google Cloud y añade en el{" "}
        <span className="font-medium">.env</span> de la raíz:
      </p>
      <p className="mt-2 font-mono text-xs text-stone-800">
        GOOGLE_CLIENT_ID
        <br />
        GOOGLE_CLIENT_SECRET
      </p>
      <p className="mt-2">
        URI de redirección autorizada:{" "}
        <span className="break-all font-medium">
          http://localhost:3001/api/auth/google/callback
        </span>
        . Después reinicia la API.
      </p>
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
