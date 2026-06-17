export type CategoryPageConfig = {
  slug: string;
  filterSlug: string;
  shortLabel: string;
  fullLabel: string;
  heading: string;
  seoTitle: string;
  description: string;
  intro: string;
};

export const categoryPageConfigs: CategoryPageConfig[] = [
  {
    slug: 'earrings',
    filterSlug: 'earrings',
    shortLabel: 'Earrings',
    fullLabel: 'Earrings',
    heading: 'Earrings Collection',
    seoTitle: 'Earrings Collection | Jhumka, Studs & Chandbali | Gridaan',
    description:
      'Shop affordable earrings at Gridaan including jhumkas, studs, chandbalis, oxidised earrings, pearl earrings, and AD earrings.',
    intro:
      'Explore everyday studs, festive chandbalis, oxidised pairs, and statement earrings designed to give your outfit a premium look without stretching your budget.',
  },
  {
    slug: 'necklace-sets',
    filterSlug: 'necklace-sets',
    shortLabel: 'Necklace Sets',
    fullLabel: 'Necklace Sets',
    heading: 'Necklace Sets',
    seoTitle: 'Necklace Sets | Kundan, Pearl & Oxidised Sets | Gridaan',
    description:
      'Shop premium-look necklace sets at Gridaan including kundan chokers, pearl chokers, oxidised necklace sets, and AD necklace sets.',
    intro:
      'From festive chokers to easy-to-style necklace sets, this collection is built for wedding guests, gifting, and dressy looks that still feel affordable.',
  },
  {
    slug: 'combo-packs',
    filterSlug: 'combo-packs',
    shortLabel: 'Combo Packs',
    fullLabel: 'Combo Packs',
    heading: 'Jewelry Combo Packs',
    seoTitle: 'Jewelry Combo Packs | Affordable Fashion Jewelry Sets | Gridaan',
    description:
      'Shop value jewelry combo packs at Gridaan including earrings combos, rings combos, festive combos, and college girl jewelry combos.',
    intro:
      'Choose combo packs when you want more value in one order, whether you are shopping for gifting, festive styling, or quick daily-wear updates.',
  },
  {
    slug: 'wedding-guest-jewelry',
    filterSlug: 'wedding-guest',
    shortLabel: 'Wedding Guest',
    fullLabel: 'Wedding Guest Jewelry',
    heading: 'Wedding Guest Jewelry',
    seoTitle: 'Wedding Guest Jewelry | Festive Jewelry Sets | Gridaan',
    description:
      'Shop affordable wedding guest jewelry at Gridaan including kundan sets, chandbalis, maang tikka, hathphool, nath, and choker sets.',
    intro:
      'Build a polished wedding guest look with affordable festive jewelry that pairs easily with sarees, lehengas, suits, and occasion dresses.',
  },
  {
    slug: 'daily-wear-jewelry',
    filterSlug: 'daily-wear',
    shortLabel: 'Daily Wear',
    fullLabel: 'Daily Wear Jewelry',
    heading: 'Daily Wear Jewelry',
    seoTitle: 'Daily Wear Jewelry | Minimal Earrings, Rings & Bracelets | Gridaan',
    description:
      'Shop lightweight daily wear jewelry at Gridaan including minimal earrings, small studs, simple rings, pendants, and bracelets.',
    intro:
      'Find simple, easy-to-wear pieces for work, college, gifting, and everyday styling with a neat premium look at accessible prices.',
  },
];

export function getCategoryPageBySlug(slug: string) {
  return categoryPageConfigs.find((config) => config.slug === slug) ?? null;
}

export function getCategoryPageByFilterSlug(filterSlug: string) {
  return categoryPageConfigs.find((config) => config.filterSlug === filterSlug) ?? null;
}

export function getCategoryPageHref(slug: string) {
  return `/category/${slug}`;
}
