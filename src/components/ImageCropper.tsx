"use client";

import { useEffect, useRef, useState } from "react";
import type { CropArea } from "@/lib/upload-client";

const VIEW_WIDTH = 280;
const MAX_ZOOM = 4;

interface View {
  zoom: number;
  /** Posizione dell'angolo in alto a sinistra dell'immagine nel riquadro (px). */
  x: number;
  y: number;
}

/**
 * Finestra per inquadrare l'immagine prima del caricamento:
 * trascina (dito, mouse o frecce) per spostarla e usa lo zoom per ingrandirla.
 */
export function ImageCropper({
  bitmap,
  src,
  aspect = 1,
  onCancel,
  onConfirm,
}: {
  bitmap: ImageBitmap;
  /** URL locale del file, per l'anteprima. */
  src: string;
  /** Larghezza / altezza del ritaglio. */
  aspect?: number;
  onCancel: () => void;
  onConfirm: (area: CropArea) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const vw = VIEW_WIDTH;
  const vh = Math.round(VIEW_WIDTH / aspect);
  // Zoom 1 = l'immagine copre esattamente il riquadro.
  const cover = Math.max(vw / bitmap.width, vh / bitmap.height);
  const [view, setView] = useState<View>(() => ({
    zoom: 1,
    x: (vw - bitmap.width * cover) / 2,
    y: (vh - bitmap.height * cover) / 2,
  }));

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const scaleOf = (zoom: number) => cover * zoom;

  /** L'immagine deve sempre coprire tutto il riquadro. */
  function clamp(v: View): View {
    const s = scaleOf(v.zoom);
    return {
      zoom: v.zoom,
      x: Math.min(0, Math.max(vw - bitmap.width * s, v.x)),
      y: Math.min(0, Math.max(vh - bitmap.height * s, v.y)),
    };
  }

  function move(dx: number, dy: number) {
    setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
  }

  /** Cambia lo zoom tenendo fermo il centro del riquadro. */
  function zoomTo(zoom: number) {
    setView((v) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
      const s = scaleOf(v.zoom);
      const cx = (vw / 2 - v.x) / s;
      const cy = (vh / 2 - v.y) / s;
      const ns = scaleOf(z);
      return clamp({ zoom: z, x: vw / 2 - cx * ns, y: vh / 2 - cy * ns });
    });
  }

  function confirm() {
    const s = scaleOf(view.zoom);
    onConfirm({ x: -view.x / s, y: -view.y / s, width: vw / s, height: vh / s });
  }

  const s = scaleOf(view.zoom);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="crop-title"
      className="m-auto w-[min(340px,calc(100vw-32px))] rounded-[20px] border-2 border-edge bg-surface p-4 text-ink shadow-[0_4px_0_var(--edge)] backdrop:bg-black/50"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <h2 id="crop-title" className="h2 self-start">
          Inquadra l&apos;immagine
        </h2>
        <div
          role="application"
          tabIndex={0}
          aria-label="Anteprima del ritaglio: trascina o usa le frecce per spostare l'immagine"
          className="relative cursor-grab touch-none overflow-hidden rounded-[16px] border-2 border-edge bg-surface2 select-none active:cursor-grabbing"
          style={{ width: vw, height: vh }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            move(e.clientX - d.x, e.clientY - d.y);
            drag.current = { id: d.id, x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => zoomTo(view.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 30 : 10;
            const keys: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            };
            const k = keys[e.key];
            if (!k) return;
            e.preventDefault();
            move(k[0], k[1]);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:) */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
            style={{
              width: bitmap.width * s,
              height: bitmap.height * s,
              transform: `translate(${view.x}px, ${view.y}px)`,
            }}
          />
        </div>
        <label className="flex w-full items-center gap-3 text-sm font-extrabold">
          Zoom
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            className="flex-1 accent-[var(--red)]"
            onChange={(e) => zoomTo(Number(e.target.value))}
          />
        </label>
        <div className="flex w-full gap-2">
          <button type="button" className="btn btn-ghost flex-1" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="btn flex-1" onClick={confirm}>
            Usa immagine
          </button>
        </div>
      </div>
    </dialog>
  );
}
