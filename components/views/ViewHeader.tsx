import { Sunburst } from "../decor/Sunburst";

export function ViewHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="flex items-center gap-1 text-[22px] font-bold leading-tight tracking-[-0.02em] text-navy lg:text-[26px]">
        {title}
        <Sunburst className="-mt-3 size-10 shrink-0" />
      </h1>
      <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>
    </div>
  );
}
