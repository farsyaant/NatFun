import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PROVINCE_VIEWBOX, provinceShapes } from "@/config/provinceMapShapes";
import { provinceSeed, type ProvinceDetail } from "@/config/provinceSeed";
import "./ProvinceMap.css";

interface Props {
  /** jumlah entri per nama provinsi (nilai asli menimpa total di tooltip) */
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (province: string | null) => void;
  /** detail tooltip per nama provinsi; default: data contoh (seed) dari mockup */
  details?: Record<string, ProvinceDetail>;
}

const STATUS_LABEL = { CR: "Kritis", EN: "Terancam", VU: "Rentan" } as const;

const EMPTY_DETAIL: ProvinceDetail = { a: 0, u: 0, f: 0, l: 0, s: null, lt: null, st: null };

/**
 * FR-BRW-04: peta provinsi interaktif.
 * Provinsi diidentifikasi lewat `data-i` (indeks di provinceShapes) -> provinceShapes[i].name.
 */
function InteractiveMap({ counts, selected, onSelect, details = provinceSeed }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pid = (i: number) => `pm${uid}-p${i}`;

  const stageRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const pointerType = useRef<string>("mouse");

  const [cur, setCur] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);

  const place = useCallback(() => {
    const stage = stageRef.current;
    const tip = tipRef.current;
    if (!stage || !tip) return;
    const r = stage.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const { x, y } = pos.current;
    let l = x - r.left + 16;
    let t = y - r.top + 16;
    if (l + w > r.width - 6) l = x - r.left - w - 16;
    if (l < 6) l = 6;
    if (t + h > r.height - 6) t = y - r.top - h - 16;
    if (t < 6) t = 6;
    tip.style.left = `${l}px`;
    tip.style.top = `${t}px`;
  }, []);

  useLayoutEffect(() => {
    if (cur !== null) place();
  }, [cur, place]);

  const show = (i: number, x: number, y: number) => {
    pos.current = { x, y };
    if (i !== cur) {
      setCur(i);
      setLast(i);
    } else {
      place();
    }
  };
  const hide = () => setCur(null);

  const idxOf = (target: EventTarget | null) => {
    const n = (target as Element | null)?.closest?.("[data-i]") as HTMLElement | null;
    return n ? Number(n.dataset.i) : -1;
  };

  const selIdx = selected ? provinceShapes.findIndex((p) => p.name === selected) : -1;
  const shown = last !== null ? provinceShapes[last] : null;
  const detail = shown ? details[shown.name] ?? EMPTY_DETAIL : undefined;

  return (
    <div className="pm-root">
      <div className="pm-stage" ref={stageRef}>
        <svg
          viewBox={PROVINCE_VIEWBOX}
          role="img"
          aria-label="Peta provinsi Indonesia"
          className={`${cur !== null ? "on" : ""} ${selIdx >= 0 ? "has-sel" : ""}`.trim()}
          onPointerDown={(e) => {
            pointerType.current = e.pointerType;
          }}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return;
            const i = idxOf(e.target);
            if (i < 0) hide();
            else show(i, e.clientX, e.clientY);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") hide();
          }}
          onClick={(e) => {
            const i = idxOf(e.target);
            if (pointerType.current === "mouse") {
              if (i >= 0) onSelect(provinceShapes[i].name === selected ? null : provinceShapes[i].name);
              return;
            }
            if (i < 0) return hide();
            if (i === cur) {
              onSelect(provinceShapes[i].name === selected ? null : provinceShapes[i].name);
              hide();
            } else {
              show(i, e.clientX, e.clientY);
            }
          }}
        >
          <defs>
            {provinceShapes.map((p, i) => (
              <path key={i} id={pid(i)} d={p.d} />
            ))}
          </defs>

          <g>
            {provinceShapes.map((p, i) => (
              <g key={i} className="r" data-i={i}>
                <use
                  href={`#${pid(i)}`}
                  className={`pm-prov${i === selIdx ? " pm-is-sel" : ""}`}
                  fill={p.fill}
                />
              </g>
            ))}
          </g>

          <g>
            {provinceShapes.map((p, i) =>
              p.hit ? <use key={i} href={`#${pid(i)}`} className="pm-hit" data-i={i} /> : null,
            )}
          </g>

          {selIdx >= 0 && <use href={`#${pid(selIdx)}`} className="pm-selring" />}

          <g className="pm-lift">
            {cur !== null && (
              <>
                <use href={`#${pid(cur)}`} className="pm-sh" />
                <use href={`#${pid(cur)}`} className="pm-up" fill={provinceShapes[cur].fill} />
              </>
            )}
          </g>
        </svg>

        <div ref={tipRef} className={`pm-tip${cur !== null ? " show" : ""}`} role="status">
          {shown && detail && <Tip name={shown.name} color={shown.fill} d={detail} total={counts[shown.name]} />}
        </div>
      </div>

      <p className="pm-foot">
        Arahkan kursor ke sebuah provinsi (di layar sentuh: ketuk) untuk melihat ringkasannya; klik untuk
        memfilter. Peta: © Vemaps.com (33 wilayah; belum mencakup pemekaran Papua 2022 dan Kalimantan Utara).
      </p>
    </div>
  );
}

function Tip({ name, color, d, total }: { name: string; color: string; d: ProvinceDetail; total?: number }) {
  const sum = d.a + d.u;
  const p = sum ? Math.round((d.a / sum) * 100) : 0;
  return (
    <>
      <h2>
        <span className="pm-sw" style={{ background: color }} />
        {name}
      </h2>
      <div className="pm-k">Entri</div>
      <div className="pm-row">
        <span className="pm-big">{total ?? sum}</span>
        <span />
      </div>
      <div className="pm-bar">
        <i style={{ width: `${p}%` }} />
        <i style={{ width: `${sum ? 100 - p : 0}%` }} />
      </div>
      <div className="pm-lg">
        <span>Foto admin: {d.a}</span>
        <span>Unggahan pengguna: {d.u}</span>
      </div>
      <div className="pm-k">Jenis endemik</div>
      <div className="pm-row">
        <span>
          Fauna: <b>{d.f}</b>
        </span>
        <span>
          Flora: <b>{d.l}</b>
        </span>
      </div>
      <div className="pm-k">Contoh terancam punah</div>
      {d.st && d.s ? (
        <div>
          <b>{d.s}</b>
          <br />
          <em>{d.lt}</em>{" "}
          <span className={`pm-bd pm-${d.st}`}>
            {STATUS_LABEL[d.st]} ({d.st})
          </span>
        </div>
      ) : (
        <div>
          <em>Belum ada entri terancam</em>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Preview kecil (statis) + tombol perbesar -> peta interaktif layar penuh */
/* ------------------------------------------------------------------ */

export default function ProvinceMap(props: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const selIdx = props.selected ? provinceShapes.findIndex((p) => p.name === props.selected) : -1;

  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  return (
    <div className="pm-root">
      <div className="pm-stage pm-preview">
        <svg
          viewBox={PROVINCE_VIEWBOX}
          role="img"
          aria-label="Pratinjau peta provinsi Indonesia"
          className={selIdx >= 0 ? "has-sel" : ""}
        >
          <g>
            {provinceShapes.map((p, i) => (
              <path key={i} d={p.d} fill={p.fill} className={`pm-ps${i === selIdx ? " pm-is-sel" : ""}`} />
            ))}
          </g>
          {selIdx >= 0 && <path d={provinceShapes[selIdx].d} className="pm-selring" />}
        </svg>

        <button
          ref={btnRef}
          type="button"
          className="pm-expand"
          onClick={() => setOpen(true)}
          aria-label="Perbesar peta"
          title="Perbesar peta"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
      </div>
      <p className="pm-foot">Peta: © Vemaps.com</p>

      {open && (
        <Modal onClose={close}>
          <InteractiveMap
            {...props}
            onSelect={(name) => {
              props.onSelect(name);
              close();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="pm-modal pm-root"
      role="dialog"
      aria-modal="true"
      aria-label="Peta provinsi (layar penuh)"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button ref={closeRef} type="button" className="pm-close" onClick={onClose} aria-label="Tutup peta" title="Tutup (Esc)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="pm-modal-body">
        <h2 className="pm-title text-xl font-semibold tracking-tight antialiased sm:text-2xl">
          Peta Persebaran Flora dan Fauna
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}