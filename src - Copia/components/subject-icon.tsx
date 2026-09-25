import {
  BookOpen,
  Calculator,
  FileText,
  Landmark,
  Monitor,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

function iconForSubject(name: string): LucideIcon {
  if (/portugu/i.test(name)) return BookOpen;
  if (/raciocínio|lógico|matemát/i.test(name)) return Calculator;
  if (/informática|tecnologia/i.test(name)) return Monitor;
  if (/constitucional|previdenci/i.test(name)) return Scale;
  if (/administrativo/i.test(name)) return Landmark;
  if (/ética/i.test(name)) return ShieldCheck;
  if (/legisla|lei|seguridade/i.test(name)) return FileText;
  return BookOpen;
}

export function SubjectIcon({ name, className, size = "md" }: { name: string; className?: string; size?: "sm" | "md" }) {
  const Icon = iconForSubject(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-50/80 dark:bg-blue-950/40",
        size === "sm" ? "h-9 w-9" : "h-10 w-10",
        className
      )}
      aria-hidden="true"
    >
      <Icon className={cn("text-blue-600 dark:text-blue-400", size === "sm" ? "h-4 w-4" : "h-5 w-5")} strokeWidth={2.25} />
    </span>
  );
}