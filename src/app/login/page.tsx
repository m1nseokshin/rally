"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, PillButton } from "@/components/ui";
import { IconBack } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";
import { useAuth } from "@/lib/auth/useAuth";
import { useDetailBack } from "@/lib/useDetailBack";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const goBack = useDetailBack("/settings");

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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
          onClick={goBack}
          aria-label={t("login.back")}
          className="tap flex size-9 items-center justify-center rounded-full bg-cloud text-ink"
        >
          <IconBack size={16} />
        </button>
      </div>

      <PageHeader eyebrow={t("login.eyebrow")} title={t("login.title")} desc={t("login.desc")} />

      <section className="px-6">
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

/** onboarding의 로그인/회원가입 단계에서도 그대로 쓴다 */
export function Field({
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
