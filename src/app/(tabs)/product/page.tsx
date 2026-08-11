"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SectionTitle } from "@/components/ui";
import { IconBack, IconChevron } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";
import { useDetailBack } from "@/lib/useDetailBack";
import { BASE_PATH } from "@/lib/basePath";
import { findProduct, products, type Product } from "@/lib/products";

/**
 * 제품 소개 — 목록과 뉴스룸형 기사를 한 라우트에서 처리한다.
 * ?id=vision 이면 그 제품의 기사를, 없으면 목록을 보여준다.
 * (정적 export라 동적 세그먼트보다 쿼리 파라미터가 다루기 쉽다)
 */
function ProductInner() {
  const params = useSearchParams();
  const product = findProduct(params.get("id"));
  return product ? <Article product={product} /> : <ProductList />;
}

/** 이미지가 아직 없으면 브랜드 그라디언트로 대신한다 */
function Cover({
  src,
  cover,
  className,
}: {
  src?: string;
  cover: [string, string];
  className: string;
}) {
  if (src) {
    return (
      // object-cover로 꽉 채운다 — object-contain은 레터박스 여백이 남아
      // 별로였다. 대신 소스 이미지 쪽에 여백을 미리 넣어 어느 카드 비율로
      // 잘려도 제품 자체는 안 잘리게 해뒀다(rally-paddle.png 참고).
      // eslint-disable-next-line @next/next/no-img-element -- public/ 정적 이미지, next/image 설정 불필요
      <img src={`${BASE_PATH}${src}`} alt="" className={`${className} object-cover`} />
    );
  }
  return (
    <div
      className={className}
      style={{ background: `linear-gradient(150deg, ${cover[0]} 0%, ${cover[1]} 100%)` }}
    />
  );
}

function ProductList() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("product.eyebrow")}
        title={t("product.pageTitle")}
        desc={t("product.desc")}
      />

      <section className="stagger space-y-4 px-6">
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => router.push(`/product?id=${p.id}`)}
            className="tap block w-full overflow-hidden text-left"
            style={{ borderRadius: "var(--radius-panel)" }}
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
              <Cover src={p.image} cover={p.cover} className="absolute inset-0 size-full" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="type-eyebrow text-[11px] font-medium uppercase text-primary">
                  {t(p.eyebrowKey)}
                </p>
                <h2 className="type-display mt-1.5 text-[28px] leading-[0.95] text-white">
                  {t(p.nameKey)}
                </h2>
                <p className="mt-1.5 text-[13px] text-white/70">{t(p.taglineKey)}</p>
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}

/** 뉴스룸형 기사 — 대형 히어로 + 스펙 + 소제목 단락들 */
function Article({ product }: { product: Product }) {
  const { t } = useLocale();
  const goBack = useDetailBack("/");

  return (
    <div className="pb-12">
      {/* 히어로 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
        <Cover
          src={product.hero ?? product.image}
          cover={product.cover}
          className="absolute inset-0 size-full opacity-85"
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />

        <button
          type="button"
          onClick={goBack}
          aria-label={t("common.back")}
          className="tap absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
        >
          <IconBack size={18} />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="type-eyebrow text-[11px] font-medium uppercase text-primary">
            {t(product.eyebrowKey)}
          </p>
          <h1 className="type-display mt-2 text-[38px] leading-[0.92] text-white">
            {t(product.nameKey)}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">
            {t(product.taglineKey)}
          </p>
        </div>
      </div>

      {/* 본문 — 소제목 + 단락. 뉴스룸처럼 넉넉한 행간과 큰 소제목. */}
      <article className="stagger mt-8 space-y-9 px-6">
        {product.sections.map((s) => (
          <section key={s.headingKey}>
            {s.image && (
              <Cover
                src={s.image}
                cover={product.cover}
                className="mb-4 aspect-[16/9] w-full"
              />
            )}
            <h2 className="type-display text-[24px] leading-[1.15] text-ink">
              {t(s.headingKey)}
            </h2>
            <p className="mt-3 text-[15px] leading-[1.75] text-mute">{t(s.bodyKey)}</p>
          </section>
        ))}
      </article>

      {/* 스펙 — 박스 카드 대신 줄마다 구분선으로 나눈 리스트. 설명을 다 읽은
          다음에 오는 참고 자료라 본문 아래로 옮겼다. */}
      <section className="mt-9 px-6">
        <h2 className="type-display text-[24px] leading-[1.15] text-ink">
          {t("product.specTitle")}
        </h2>
        <div className="mt-3 border-t border-hairline-soft">
          {product.specs.map((s) => (
            <div
              key={s.labelKey}
              className="flex items-center justify-between border-b border-hairline-soft py-3.5"
            >
              <p className="text-[13px] text-mute">{t(s.labelKey)}</p>
              <p className="text-[14px] font-semibold text-ink">{t(s.valueKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 다른 제품 */}
      <section className="mt-12">
        <SectionTitle>{t("product.eyebrow")}</SectionTitle>
        <div className="border-t border-hairline-soft">
          {products
            .filter((p) => p.id !== product.id)
            .map((p) => (
              <a
                key={p.id}
                href={`${BASE_PATH}/product?id=${p.id}`}
                className="tap flex items-center gap-4 border-b border-hairline-soft px-6 py-4"
              >
                <Cover
                  src={p.image}
                  cover={p.cover}
                  className="size-12 shrink-0 rounded-[6px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">
                    {t(p.nameKey)}
                  </span>
                  <span className="block truncate text-[12px] text-mute">
                    {t(p.taglineKey)}
                  </span>
                </span>
                <IconChevron size={16} className="text-stone" />
              </a>
            ))}
        </div>
      </section>
    </div>
  );
}

export default function ProductPage() {
  // useSearchParams는 Suspense 경계가 필요하다(정적 export 빌드에서 특히)
  return (
    <Suspense fallback={null}>
      <ProductInner />
    </Suspense>
  );
}
