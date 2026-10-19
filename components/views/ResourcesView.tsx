"use client";

import { motion } from "framer-motion";
import { ExternalLink, HandHeart, HeartHandshake, MessageCircle, Phone, Rainbow, School } from "lucide-react";
import { ViewHeader } from "./ViewHeader";

const SUPPORT = [
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988, any time. Free and confidential.",
    href: "https://988lifeline.org",
    icon: Phone,
    tint: "#FF5365",
  },
  {
    name: "Crisis Text Line",
    detail: "Text HOME to 741741 to reach a trained volunteer.",
    href: "https://www.crisistextline.org",
    icon: MessageCircle,
    tint: "#2379EE",
  },
  {
    name: "The Trevor Project",
    detail: "24/7 support for LGBTQ+ young people.",
    href: "https://www.thetrevorproject.org",
    icon: Rainbow,
    tint: "#7952E8",
  },
];

const GET_INVOLVED = [
  {
    name: "DoSomething.org",
    detail: "Youth-led volunteer campaigns you can join from anywhere.",
    href: "https://www.dosomething.org",
    icon: HandHeart,
  },
  {
    name: "VolunteerMatch",
    detail: "Search local volunteer roles by cause and age.",
    href: "https://www.volunteermatch.org",
    icon: HeartHandshake,
  },
  {
    name: "Boys & Girls Clubs of America",
    detail: "Find a club with after-school programs near you.",
    href: "https://www.bgca.org",
    icon: School,
  },
];

function ResourceLink({
  name,
  detail,
  href,
  icon: Icon,
  tint = "#009C9F",
  index,
}: {
  name: string;
  detail: string;
  href: string;
  icon: typeof Phone;
  tint?: string;
  index: number;
}) {
  return (
    <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-14 border border-line bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-12" style={{ background: `${tint}14`, color: tint }}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
            {name}
            <ExternalLink className="size-3 text-ink-soft transition group-hover:text-teal" />
          </span>
          <span className="block text-meta text-ink-muted">{detail}</span>
        </span>
      </a>
    </motion.li>
  );
}

export function ResourcesView() {
  return (
    <div className="px-4 pb-10 pt-5 lg:px-7 lg:pt-6">
      <ViewHeader title="Resources" subtitle="Feeling disconnected is common. Reaching out is a strong move." />

      <h2 className="mt-6 text-micro font-bold uppercase tracking-[0.12em] text-ink-soft">Talk to someone now</h2>
      <ul className="mt-2 grid gap-2.5">
        {SUPPORT.map((r, i) => (
          <ResourceLink key={r.name} {...r} index={i} />
        ))}
      </ul>

      <h2 className="mt-6 text-micro font-bold uppercase tracking-[0.12em] text-ink-soft">Get involved</h2>
      <ul className="mt-2 grid gap-2.5 sm:grid-cols-2">
        {GET_INVOLVED.map((r, i) => (
          <ResourceLink key={r.name} {...r} index={i + SUPPORT.length} />
        ))}
      </ul>

      <div className="mt-6 rounded-18 border border-line bg-pastel-butter/60 p-5">
        <p className="text-sm font-bold text-ink">Tips for trying a new place</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-muted marker:text-amber">
          <li>Bring a friend the first time, or go to a session labeled “beginner friendly.”</li>
          <li>Arrive a few minutes early. Hosts love helping first-timers get settled.</li>
          <li>Tell a parent or guardian where you’re going and how you’re getting there.</li>
        </ul>
      </div>
    </div>
  );
}
