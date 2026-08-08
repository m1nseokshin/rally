"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconWave,
  IconDevice,
  IconInsight,
  IconSettings,
} from "./icons";
import { useLocale } from "@/lib/i18n/useLocale";
import type { DictKey } from "@/lib/i18n/dictionary";

const tabs: { href: string; labelKey: DictKey; Icon: typeof IconHome }[] = [
  { href: "/", labelKey: "nav.home", Icon: IconHome },
  { href: "/play", labelKey: "nav.play", Icon: IconWave },
  { href: "/devices", labelKey: "nav.devices", Icon: IconDevice },
  { href: "/insights", labelKey: "nav.insights", Icon: IconInsight },
  { href: "/settings", labelKey: "nav.settings", Icon: IconSettings },
];

export default function TabBar() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav
      className="relative z-20 shrink-0 border-t border-hairline-soft bg-canvas/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-[68px] items-stretch">
        {tabs.map(({ href, labelKey, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="tap flex h-full flex-col items-center justify-center gap-1"
              >
                <Icon
                  size={22}
                  className={`transition-[color,transform] duration-200 ${
                    active ? "scale-110 text-primary" : "text-stone"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium transition-colors duration-200 ${
                    active ? "text-ink" : "text-stone"
                  }`}
                >
                  {t(labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
