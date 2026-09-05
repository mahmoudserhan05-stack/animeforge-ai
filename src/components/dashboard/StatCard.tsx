import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: "primary" | "cyan" | "pink";
}) {
  const accentClasses = {
    primary: "from-primary/20 to-primary/5 text-primary",
    cyan: "from-accent-cyan/20 to-accent-cyan/5 text-accent-cyan",
    pink: "from-accent-pink/20 to-accent-pink/5 text-accent-pink",
  }[accent];

  return (
    <div className="glass rounded-xl2 p-5">
      <div className={cn("flex size-11 items-center justify-center rounded-xl bg-gradient-to-br", accentClasses)}>
        {icon}
      </div>
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
