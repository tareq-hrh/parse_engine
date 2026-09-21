import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/shadcn_utils";

type LogoProps = Omit<ImageProps, "src" | "alt" | "width" | "height"> & {
  alt?: string;
  width?: number;
  height?: number;
};

export default function Logo({
  alt = "Parse Engine logo",
  className,
  height = 492,
  priority = true,
  width = 760,
  ...props
}: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("h-8 w-auto object-contain", className)}
      {...props}
    />
  );
}
