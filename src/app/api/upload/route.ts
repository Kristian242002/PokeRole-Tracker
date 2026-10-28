import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/auth";
import { IMAGE_MAX_BYTES, IMAGE_OUTPUT_TYPES, isValidImagePath } from "@/lib/images";

/** Il caricamento è disponibile? (Il client di Blob non riporta i messaggi d'errore del server.) */
export function GET() {
  return NextResponse.json({ configured: !!process.env.BLOB_READ_WRITE_TOKEN });
}

/**
 * Token per il caricamento diretto dal browser su Vercel Blob (§12).
 * Controlla la sessione e che il percorso sia nella cartella dell'utente;
 * l'URL viene poi salvato dalla server action del record (che ne verifica la proprietà).
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Caricamento immagini non configurato (manca BLOB_READ_WRITE_TOKEN)" },
      { status: 503 },
    );
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await currentUser();
        if (!user) throw new Error("Accedi per caricare immagini");
        if (!isValidImagePath(pathname, user.id)) throw new Error("Percorso non valido");
        return {
          allowedContentTypes: IMAGE_OUTPUT_TYPES,
          maximumSizeInBytes: IMAGE_MAX_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Caricamento non riuscito" },
      { status: 400 },
    );
  }
}
