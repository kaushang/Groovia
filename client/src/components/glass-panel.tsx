import { cn } from "@/lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "subtle";
}

export default function GlassPanel({
  children,
  className,
  variant = "default",
  ...props
}: GlassPanelProps) {
  const baseClasses =
    variant === "subtle" ? "glass-panel-subtle" : "glass-panel";

  return (
    <div className={cn(baseClasses, className)} {...props}>
      {children}
    </div>
  );
}
