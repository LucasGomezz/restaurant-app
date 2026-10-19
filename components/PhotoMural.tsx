import Image from "next/image";
import { MuralSpeed } from "@/components/MuralSpeed";

const COLUMNS = 6;
const TILES_PER_COLUMN = 9;

// Each column starts at a different height so the bricks look staggered.
const COLUMN_OFFSETS = ["-6rem", "-2rem", "-10rem", "-4rem", "-8rem", "-1rem"];

// Varying tile shapes give the brick-wall rhythm even with same-sized photos.
const TILE_SHAPES = [
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[9/16]",
  "aspect-square",
  "aspect-[2/3]",
];

// Relative speed per column so they don't move in lockstep (see MuralSpeed).
const COLUMN_SPEEDS = [1, 0.8, 0.9, 0.75, 1.1, 0.85];

// Columns beyond what fits are hidden on smaller screens.
const COLUMN_VISIBILITY = [
  "flex",
  "flex",
  "flex",
  "hidden sm:flex",
  "hidden lg:flex",
  "hidden lg:flex",
];

/** Tiles on the wall; with at least this many photos, none repeat. */
export const MURAL_TILES = COLUMNS * TILES_PER_COLUMN;

/**
 * Decorative wall of photos in staggered columns. Photos only repeat while
 * there are fewer than MURAL_TILES of them; the order of the list (shuffled
 * by the caller) decides what goes where.
 */
export function PhotoMural({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;

  const columns = Array.from({ length: COLUMNS }, (_, column) =>
    Array.from({ length: TILES_PER_COLUMN }, (_, row) => {
      // Step 7 per row (one more than the column count) so a repeated photo
      // never lands right below itself, nor next to itself in the same row.
      const index = (row * (COLUMNS + 1) + column) % photos.length;
      return {
        key: `${column}-${row}`,
        src: photos[index],
        shape: TILE_SHAPES[(column + row * 2) % TILE_SHAPES.length],
      };
    }),
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-stone-200"
    >
      <div className="absolute inset-x-0 -top-4 flex gap-3 px-3">
        {columns.map((tiles, column) => (
          <div
            key={column}
            className={`mural-column min-w-0 flex-1 flex-col ${COLUMN_VISIBILITY[column]}`}
            style={{
              marginTop: COLUMN_OFFSETS[column],
              // Even columns scroll up, odd ones down.
              animationDirection: column % 2 ? "reverse" : "normal",
            }}
          >
            {/* The tiles twice: when the loop moves exactly one copy's height
                the second copy sits where the first was, so it never jumps.
                Tiles use a bottom margin (not gap) so both halves are equal. */}
            {[0, 1].flatMap((copy) =>
              tiles.map((tile) => (
                <div
                  key={`${copy}-${tile.key}`}
                  className={`relative mb-3 w-full shrink-0 overflow-hidden rounded-xl bg-stone-300 ${tile.shape}`}
                >
                  <Image
                    src={tile.src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 34vw, (max-width: 1024px) 25vw, 17vw"
                  />
                </div>
              )),
            )}
          </div>
        ))}
      </div>
      <MuralSpeed factors={COLUMN_SPEEDS} />
      {/* Soft wash so the login card stays the focus. */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900/25 via-stone-900/10 to-stone-900/35" />
    </div>
  );
}
