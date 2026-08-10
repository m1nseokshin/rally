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
    //
    // pb-5(20px) — 실기기 홈 인디케이터가 앉을 자리를 미리 비워 둔다.
    // env(safe-area-inset-bottom)으로 정확히 재려다 iOS 26에서 그 값 자체가
    // 고장 나는 걸 겪은 뒤라, 여기서는 기기마다 달라지는 값을 좇지 않고
    // 넉넉한 고정값 하나로 고정한다 — 아이콘 줄(h-[68px])은 그대로 두고
    // 그 아래 여백만 늘린 것이라 탭 터치 영역 위치는 그대로다.
    <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-hairline-soft bg-canvas/95 pb-5 backdrop-blur">
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
