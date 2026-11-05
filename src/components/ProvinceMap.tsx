import { useMemo } from "react";
import { provinceGrid, provinces } from "@/config/appConfig";

interface Props {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (province: string | null) => void;
}

/**
 * FR-BRW-04: peta provinsi interaktif.
 * Prototipe memakai tile-grid map (susunan kotak mengikuti geografi kasar) —
 * ringan, tanpa tile server, mudah diganti SVG geometri asli nanti.
 */
export default function ProvinceMap({ counts, selected, onSelect }: Props) {
  const cols = useMemo(() => Math.max(...Object.values(provinceGrid).map(([, c]) => c)) + 1, []);
  const rows = useMemo(() => Math.max(...Object.values(provinceGrid).map(([r]) => r)) + 1, []);

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows * cols }).map((_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const prov = Object.entries(provinceGrid).find(
          ([, [pr, pc]]) => pr === r && pc === c,
        );
        if (!prov) return <div key={idx} />;
        const [name] = prov;
        const count = counts[name] ?? 0;
        const active = selected === name;
        return (
          <button
            key={idx}
            title={`${name} — ${count} entri`}
            onClick={() => onSelect(active ? null : name)}
            className={`rounded-sm px-0.5 py-1 text-[9px] leading-tight font-medium transition-colors ${
              active
                ? "bg-leaf-600 text-white"
                : count > 0
                  ? "bg-leaf-100 text-leaf-700 hover:bg-leaf-500 hover:text-white"
                  : "bg-stone-100 text-stone-400 hover:bg-stone-200"
            }`}
          >
            <span className="block max-w-full truncate">{name.replace("Kepulauan ", "Kp. ").replace("Kalimantan ", "Klm. ").replace("Sulawesi ", "Sul. ").replace("Sumatera ", "Sum. ")}</span>
            <span className="block text-center">{count}</span>
          </button>
        );
      })}
      <p className="col-span-full mt-1 text-xs text-stone-400">
        {provinces.length} provinsi — klik untuk filter. Angka = jumlah entri.
      </p>
    </div>
  );
}
