import Link from 'next/link';

interface InfoPageProps {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

export default function InfoPage({ eyebrow, title, description, sections }: InfoPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-warm-50 py-12 md:py-16">
        <div className="container max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-3">{eyebrow}</p>
          <h1 className="heading-display text-3xl md:text-4xl text-neutral-900 mb-3">{title}</h1>
          <p className="text-sm md:text-base text-neutral-500 max-w-2xl mx-auto">{description}</p>
        </div>
      </section>

      <section className="container max-w-4xl py-10 md:py-14">
        <div className="rounded-3xl border border-neutral-100 bg-white p-6 md:p-10 shadow-sm">
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.heading}>
                <h2 className="text-xl font-semibold text-neutral-900 mb-3">{section.heading}</h2>
                <div className="space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-neutral-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-neutral-100">
            <Link href="/shop" className="text-sm font-medium text-gold-700 hover:text-gold-800">
              Back to shopping
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
