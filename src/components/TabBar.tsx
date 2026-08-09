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
    // 문서 흐름에서 빼내 프레임 바닥에 붙인다. 흐름에 있으면 주소창이
    // 나타났다 사라지며 뷰포트 높이가 변할 때 탭바도 같이 밀려 흔들린다.
    // 프레임이 transform을 갖고 있어 이 absolute의 기준이 정확히 프레임이다.
    <nav
      className="absolute inset-x-0 bottom-0 z-20 border-t border-hairline-soft bg-canvas/95 backdrop-blur"
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
