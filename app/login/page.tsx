import { LoginForm } from "@/components/LoginForm";
import { MURAL_TILES, PhotoMural } from "@/components/PhotoMural";
import { getMuralPhotos } from "@/lib/queries/restaurants";

// Signed photo URLs expire, so render on every request.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // The login must work even if the photos can't be loaded.
  const photos = await getMuralPhotos(MURAL_TILES).catch(() => []);

  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
      <PhotoMural photos={photos} />
      <div className="card flex w-full max-w-sm flex-col gap-8 p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-2xl text-white shadow-sm">
            🫶🏻
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Nuestro Camino
            </h1>
            <p className="text-sm text-stone-500">
              Los lugares que queremos conocer, juntos.
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
