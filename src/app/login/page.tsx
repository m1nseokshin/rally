"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, PillButton } from "@/components/ui";
import { IconBack } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";
import { useAuth } from "@/lib/auth/useAuth";
import { startKakaoLogin } from "@/lib/kakao/auth";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  async function handleKakao() {
    setError(null);
    setKakaoLoading(true);
    try {
      // 카카오 로그인 화면으로 전체 페이지가 이동한다 — 성공/실패 처리는
      // 돌아온 뒤 /callback/kakao 페이지에서 이어서 한다.
      await startKakaoLogin("login");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.kakao.missingKey"));
      setKakaoLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!id.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError(t("login.error.required"));
      return;
    }

    try {
      if (mode === "signup") {
        signUpWithEmail(id.trim(), password, name.trim());
      } else {
        signInWithEmail(id.trim(), password);
      }
      router.push("/settings");
    } catch (e) {
      const key = e instanceof Error ? e.message : "invalid";
      setError(key === "exists" ? t("login.error.exists") : t("login.error.invalid"));
    }
  }

  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 px-6 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t("login.back")}
          className="tap flex size-9 items-center justify-center rounded-full bg-cloud text-ink"
        >
          <IconBack size={16} />
        </button>
      </div>

      <PageHeader eyebrow={t("login.eyebrow")} title={t("login.title")} desc={t("login.desc")} />

      <section className="px-6">
        <button
          type="button"
          onClick={handleKakao}
          disabled={kakaoLoading}
          className="tap flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] text-[15px] font-semibold text-[#191600] disabled:opacity-60"
        >
          <KakaoGlyph />
          {t("login.kakao")}
        </button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-hairline-soft" />
          <span className="text-[12px] font-medium text-mute">{t("login.divider")}</span>
          <span className="h-px flex-1 bg-hairline-soft" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <Field
              label={t("profile.namePlaceholder")}
              value={name}
              onChange={setName}
              placeholder={t("profile.namePlaceholder")}
            />
          )}
          <Field
            label={t("login.id")}
            value={id}
            onChange={setId}
            placeholder={t("login.idPlaceholder")}
          />
          <Field
            label={t("login.password")}
            value={password}
            onChange={setPassword}
            placeholder={t("login.passwordPlaceholder")}
            type="password"
          />

          {error && <p className="text-[12px] text-primary">{error}</p>}

          <div className="pt-2">
            <PillButton full type="submit">
              {mode === "signup" ? t("login.signupSubmit") : t("login.submit")}
            </PillButton>
          </div>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setError(null);
          }}
          className="tap mt-4 w-full text-center text-[13px] font-medium text-mute underline underline-offset-4"
        >
          {mode === "login" ? t("login.signupToggle") : t("login.loginToggle")}
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-mute">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full bg-cloud px-4 text-[15px] text-ink outline-none placeholder:text-stone"
        style={{ borderRadius: "var(--radius-input)" }}
      />
    </label>
  );
}

function KakaoGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="#191600">
      <path d="M12 3C6.48 3 2 6.48 2 10.7c0 2.7 1.83 5.07 4.6 6.44-.2.73-.72 2.63-.83 3.04-.13.5.18.5.39.36.16-.11 2.6-1.77 3.66-2.49.7.1 1.42.15 2.18.15 5.52 0 10-3.48 10-7.5S17.52 3 12 3Z" />
    </svg>
  );
}
