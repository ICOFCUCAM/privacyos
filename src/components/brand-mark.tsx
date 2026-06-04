import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/ui";

/**
 * The canonical MyPrivacyOS brand lockup — the real logo mark (gradient shield +
 * keyhole + orbital ring) paired with a crisp white "MyPrivacyOS" wordmark. Used
 * everywhere a brand mark appears so the identity is consistent across the whole
 * product. The wordmark is rendered in the UI (not baked into the image) so it
 * stays sharp white on the dark theme at any size.
 */
export function BrandMark({
  size = 28,
  wordmark = true,
  href = "/",
  wordmarkClass = "text-lg",
  className,
}: {
  size?: number;
  wordmark?: boolean;
  /** Pass null to render without a link wrapper (e.g. inside another link). */
  href?: string | null;
  wordmarkClass?: string;
  className?: string;
}) {
  const content = (
    <>
      <Image
        src="/PrivacyLogo.png"
        alt="MyPrivacyOS"
        width={size}
        height={size}
        priority
        className="shrink-0"
        style={{ width: size, height: size }}
      />
      {wordmark && (
        <span className={cn("font-bold tracking-tight text-white", wordmarkClass)}>
          MyPrivacy<span className="bg-gradient-to-r from-brand-fg to-brand bg-clip-text text-transparent">OS</span>
        </span>
      )}
    </>
  );
  const base = cn("inline-flex items-center gap-2.5", className);
  if (href === null) return <span className={base}>{content}</span>;
  return (
    <Link href={href} className={cn(base, "transition-opacity hover:opacity-90")}>
      {content}
    </Link>
  );
}
