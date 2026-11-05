import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { fetchImageBlob } from "@/lib/imageCache";

/**
 * <img> untuk resource Pod yang terproteksi (acl:AuthenticatedAgent read).
 * <img src="https://pod/..."> memuat TANPA kredensial → selalu 401, sehingga
 * resource diambil via session fetch + cache blob (B2/B3), lalu dirender
 * sebagai blob URL. Object URL dibuat per instance dan hanya MILIK instance
 * itu yang dicabut saat unmount — aman terhadap StrictMode double-mount.
 * Saat memuat, placeholder aria-busy mencegah layout shift (D11).
 */
interface AuthImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
}

export default function AuthImage({ src, alt, className, ...rest }: AuthImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(!src);
  const [loading, setLoading] = useState(!!src);
  const ownUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!src) {
      // oxlint-disable-next-line react/set-state-in-effect -- sinkron dengan prop src
      setFailed(true);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setFailed(false);
    fetchImageBlob(src)
      .then((blob) => {
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        ownUrl.current = url;
        setObjectUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      // oxlint-disable-next-line react/immutability -- pembatalan efek saat unmount
      alive = false;
      // cabut HANYA object URL milik efek ini (bukan milik mount lain)
      if (ownUrl.current) {
        URL.revokeObjectURL(ownUrl.current);
        ownUrl.current = null;
      }
    };
  }, [src]);

  if (failed) return null;
  if (loading) return <div className={className} aria-busy="true" data-testid="authimg-loading" />;
  if (!objectUrl) return null;
  return <img src={objectUrl} alt={alt} className={className} {...rest} />;
}