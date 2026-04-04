import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export function BrandLogo({ className, size = 20 }: BrandLogoProps) {
  return (
    <>
      <img
        src="/logo-transparent-bg.png"
        alt="Doctrinally.AI"
        width={size}
        height={size}
        className={cn("rounded dark:hidden", className)}
      />
      <img
        src="/logo-orange-bg.png"
        alt="Doctrinally.AI"
        width={size}
        height={size}
        className={cn("hidden rounded dark:block", className)}
      />
    </>
  );
}
