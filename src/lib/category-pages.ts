export type CategoryPageConfig = {
  slug: string;
  filterSlug: string;
  imagePath: string;
  shortLabel: string;
  fullLabel: string;
  heading: string;
  seoTitle: string;
  description: string;
  intro: string;
  highlights?: string[];
};

export const categoryPageConfigs: CategoryPageConfig[] = [
  {
    slug: 'women-earrings',
    filterSlug: 'women-earrings',
    imagePath: '/categories/women-earrings.webp',
    shortLabel: 'Women Earrings',
    fullLabel: 'Women Earrings',
    heading: 'Women Earrings',
    seoTitle: 'Women Earrings | Jhumkas, Studs, Hoops & Chandbalis | Gridaan',
    description:
      'Jhumkas, studs, hoops, chandbali earrings and ear cuffs for daily, festive and wedding looks.',
    intro:
      'Browse women earrings with a premium look for casual styling, festive outfits, and wedding guest dressing at affordable prices.',
    highlights: ['Jhumkas', 'Studs', 'Hoops', 'Chandbali', 'Ear Cuffs'],
  },
  {
    slug: 'women-necklaces',
    filterSlug: 'women-necklaces',
    imagePath: '/categories/women-necklaces.webp',
    shortLabel: 'Women Necklaces',
    fullLabel: 'Women Necklaces',
    heading: 'Women Necklaces',
    seoTitle: 'Women Necklaces | Chokers, Pendants & Kundan-Look Styles | Gridaan',
    description:
      'Chokers, pendant sets, layered necklaces and kundan-look necklace styles.',
    intro:
      'Find easy-to-style chokers, layered necklace looks, and statement styles made for gifting, festive dressing, and everyday glam.',
    highlights: ['Chokers', 'Pendant Sets', 'Layered', 'Kundan Look'],
  },
  {
    slug: 'women-bangles-bracelets',
    filterSlug: 'women-bangles-bracelets',
    imagePath: '/categories/women-bangles-bracelets.webp',
    shortLabel: 'Bangles & Bracelets',
    fullLabel: 'Bangles & Bracelets',
    heading: 'Bangles & Bracelets',
    seoTitle: 'Bangles & Bracelets | Lac, Metal & Charm Styles | Gridaan',
    description:
      'Lac bangles, metal bangles, charm bracelets and ethnic bracelet styles.',
    intro:
      'Explore stackable bracelets, festive bangles, and wristwear that completes both ethnic and western-inspired looks.',
  },
  {
    slug: 'women-rings',
    filterSlug: 'women-rings',
    imagePath: '/categories/women-rings.webp',
    shortLabel: 'Women Rings',
    fullLabel: 'Women Rings',
    heading: 'Women Rings',
    seoTitle: 'Women Rings | Cocktail, Adjustable & Stackable Rings | Gridaan',
    description:
      'Cocktail rings, adjustable rings, stackable rings and fashion rings.',
    intro:
      'Discover statement rings and everyday ring styles that add shine to festive outfits, college looks, and gifting edits.',
  },
  {
    slug: 'women-anklets-toe-rings',
    filterSlug: 'women-anklets-toe-rings',
    imagePath: '/categories/women-anklets-toe-rings.webp',
    shortLabel: 'Anklets & Toe Rings',
    fullLabel: 'Anklets & Toe Rings',
    heading: 'Anklets & Toe Rings',
    seoTitle: 'Anklets & Toe Rings | Payal and Bichiya Styles | Gridaan',
    description:
      'Payal, bichiya, anklets and toe rings for ethnic and festive styling.',
    intro:
      'Shop anklets and toe rings that bring a traditional finish to ethnic styling and celebratory dressing.',
  },
  {
    slug: 'women-hair-jewellery',
    filterSlug: 'women-hair-jewellery',
    imagePath: '/categories/women-hair-jewellery.webp',
    shortLabel: 'Maang Tikka & Hair Jewellery',
    fullLabel: 'Maang Tikka & Hair Jewellery',
    heading: 'Maang Tikka & Hair Jewellery',
    seoTitle: 'Maang Tikka & Hair Jewellery | Festive Hair Accessories | Gridaan',
    description:
      'Maang tikka, matha patti, hair chains and traditional hair jewellery.',
    intro:
      'Finish wedding guest and festive looks with traditional hair jewellery, maang tikka styles, and standout head accessories.',
  },
  {
    slug: 'women-full-sets',
    filterSlug: 'women-full-sets',
    imagePath: '/categories/women-full-sets.webp',
    shortLabel: 'Full Jewellery Sets',
    fullLabel: 'Full Jewellery Sets',
    heading: 'Full Jewellery Sets',
    seoTitle: 'Full Jewellery Sets | Necklace, Earring & Festive Sets | Gridaan',
    description:
      'Necklace and earring combos, bridal-look sets and festive jewellery sets.',
    intro:
      'Shop coordinated jewellery sets and combo-led festive styles that make gifting and event styling easier in one purchase.',
  },
  {
    slug: 'men-chains',
    filterSlug: 'men-chains',
    imagePath: '/categories/men-chains.webp',
    shortLabel: 'Men Chains',
    fullLabel: 'Men Chains',
    heading: 'Men Chains',
    seoTitle: 'Men Chains | Cuban, Rope and Box Chains | Gridaan',
    description:
      'Cuban chains, rope chains, box-style chains and gold-tone or silver-tone fashion chain styles.',
    intro:
      'Explore statement and everyday men chain styles designed for easy gifting and bold styling at accessible prices.',
    highlights: ['Cuban', 'Rope', 'Box Style', 'Gold-Tone / Silver-Tone'],
  },
  {
    slug: 'men-pendants',
    filterSlug: 'men-pendants',
    imagePath: '/categories/men-pendants.webp',
    shortLabel: 'Men Pendants',
    fullLabel: 'Men Pendants',
    heading: 'Men Pendants',
    seoTitle: 'Men Pendants | Om, Evil Eye & Statement Styles | Gridaan',
    description:
      'Om pendants, skull pendants, initials, evil eye and statement pendants.',
    intro:
      'Browse men pendants that work for daily wear, gifting, and layered styling with chains.',
  },
  {
    slug: 'men-kadas',
    filterSlug: 'men-kadas',
    imagePath: '/categories/men-kadas.webp',
    shortLabel: 'Men Kadas',
    fullLabel: 'Men Kadas',
    heading: 'Men Kadas',
    seoTitle: 'Men Kadas | Metal and Steel-Finish Wristwear | Gridaan',
    description:
      'Metal kadas, steel-finish kadas and bold everyday wristwear.',
    intro:
      'Shop strong, everyday wristwear looks with metal-finish men kadas that suit festive, casual, and gift-ready styling.',
  },
  {
    slug: 'men-bracelets',
    filterSlug: 'men-bracelets',
    imagePath: '/categories/men-bracelets.webp',
    shortLabel: 'Men Bracelets',
    fullLabel: 'Men Bracelets',
    heading: 'Men Bracelets',
    seoTitle: 'Men Bracelets | Rudraksha, Beaded & Leather-Metal Styles | Gridaan',
    description:
      'Rudraksha bracelets, lava stone bracelets, beaded bracelets and leather-metal styles.',
    intro:
      'Find men bracelets that balance easy daily wear with statement styling for casual outfits and gifting.',
    highlights: ['Rudraksha', 'Lava Stone', 'Beaded', 'Leather + Metal'],
  },
  {
    slug: 'men-rings',
    filterSlug: 'men-rings',
    imagePath: '/categories/men-rings.webp',
    shortLabel: 'Men Rings',
    fullLabel: 'Men Rings',
    heading: 'Men Rings',
    seoTitle: 'Men Rings | Band, Signet and Stone-Look Styles | Gridaan',
    description:
      'Band rings, signet rings, stone-look rings and masculine fashion rings.',
    intro:
      'Explore bold ring styles for men, including sleek bands and eye-catching statement pieces.',
  },
  {
    slug: 'men-ear-studs',
    filterSlug: 'men-ear-studs',
    imagePath: '/categories/men-ear-studs.webp',
    shortLabel: 'Men Ear Studs',
    fullLabel: 'Men Ear Studs',
    heading: 'Men Ear Studs',
    seoTitle: 'Men Ear Studs | Minimal Studs and Hoops | Gridaan',
    description:
      'Small studs, hoops and minimal earrings for men.',
    intro:
      'Shop minimal men ear studs and hoop-led styles designed for simple everyday looks with a polished finish.',
  },
];

export function getCategoryPageBySlug(slug: string) {
  return categoryPageConfigs.find((config) => config.slug === slug) ?? null;
}

export function getCategoryPageByFilterSlug(filterSlug: string) {
  return categoryPageConfigs.find((config) => config.filterSlug === filterSlug) ?? null;
}

export function getCategoryImagePath(filterSlug: string) {
  return getCategoryPageByFilterSlug(filterSlug)?.imagePath ?? null;
}

export function getCategoryPageHref(slug: string) {
  return `/category/${slug}`;
}
