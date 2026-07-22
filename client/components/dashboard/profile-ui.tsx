import type { ReactNode, SelectHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/* ─── Section ─────────────────────────────────────────── */

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-base">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/* ─── Field ──────────────────────────────────────────── */

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {htmlFor ? (
        <Label htmlFor={htmlFor}>{label}</Label>
      ) : (
        <span className="text-sm font-medium leading-none">{label}</span>
      )}
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

/* ─── NativeSelect ──────────────────────────────────── */

export function NativeSelect({
  className,
  icon,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {icon}
        </span>
      )}
      <select
        className={`h-9 w-full appearance-none rounded-lg border border-input bg-background ${
          icon ? "pl-8" : "pl-3"
        } pr-9 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24 ${
          className ?? ""
        }`}
        {...props}
      />
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 opacity-60"
      >
        <polyline points="4 6 8 10 12 6" />
      </svg>
    </div>
  );
}

/* ─── SecurityRow ───────────────────────────────────── */

export function SecurityRow({
  icon,
  title,
  description,
  cta,
  destructive,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  cta: string;
  destructive?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-lg border p-3.5 ${
        destructive
          ? "border-destructive/40 bg-destructive/[0.03]"
          : "border-border/60 bg-background/40"
      }`}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
          destructive
            ? "bg-destructive/10 text-destructive"
            : "bg-foreground/[0.06]"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm">{title}</div>
        <p className="mt-0.5 text-muted-foreground text-xs">{description}</p>
      </div>
      <Button
        variant={destructive ? "outline" : "ghost"}
        size="sm"
        type="button"
        className={
          destructive
            ? "border-destructive/40 text-destructive hover:bg-destructive/10"
            : ""
        }
      >
        {cta}
      </Button>
    </div>
  );
}
