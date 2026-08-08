"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasCompletedOnboarding } from "@/lib/onboarding";

/**
 * 탭 화면 진입 시 온보딩을 아직 안 봤으면 그리로 보낸다.
 * 렌더할 게 없는 순수 사이드이펙트 컴포넌트 — (tabs)/layout.tsx에 심어둔다.
 */
export default function OnboardingGate() {
  const router = useRouter();

  useEffect(() => {
    // localStorage 접근은 마운트 후에만 가능 — 한 틱 미뤄서
    // 렌더 중 setState 계열 부작용과 섞이지 않게 한다.
    const id = setTimeout(() => {
      if (!hasCompletedOnboarding()) router.replace("/onboarding");
    }, 0);
    return () => clearTimeout(id);
  }, [router]);

  return null;
}
