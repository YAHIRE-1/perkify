import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 48, className = "logo-img", showText = false }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/images/PWaifu.png"
        alt="Perkify"
        width={size}
        height={size}
        className={className}
      />
      {showText && (
        <h1
          className="font-bold leading-none"
          style={{ fontSize: size * 0.5}}
        >
          Perkify
        </h1>
      )}
    </Link>
  );
}