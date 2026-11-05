/** Prototipe: validasi file basic menggantikan FR-VAL ML. */

export function validatePhotoFile(file: File, maxBytes: number, allowedTypes: readonly string[]): void {
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Format foto harus JPEG, PNG, atau WebP.");
  }
  if (file.size > maxBytes) {
    throw new Error(`Ukuran foto maksimum ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

/**
 * FR-UPL-04: strip EXIF dan metadata tersemat dengan re-encode via canvas.
 * Mengembalikan blob bersih (image/jpeg kualitas 0.92).
 */
export async function stripExif(file: File | Blob): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");
  ctx.drawImage(bitmap, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar."))),
      "image/jpeg",
      0.92,
    );
  });
}

/** FR-UPL-05: thumbnail ~N px sisi panjang. */
export async function makeThumbnail(cleaned: Blob, longEdge: number): Promise<Blob> {
  const bitmap = await createImageBitmap(cleaned);
  const scale = Math.min(1, longEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Gagal membuat thumbnail."))),
      "image/jpeg",
      0.8,
    );
  });
}
