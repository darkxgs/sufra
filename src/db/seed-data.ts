// Jamr (جمر): a fictional charcoal grill and bakery, used for the public menu
// preview and for every demo restaurant. Prices are in halalas (SAR × 100) and
// include VAT, as Saudi menus must; calories are shown, as SFDA requires.

import type { Tag } from "@/lib/types";

export type SeedOption = { ar: string; en: string; delta?: number; kcal?: number; default?: boolean };
export type SeedGroup = { ar: string; en: string; min: number; max: number; options: SeedOption[] };
export type SeedItem = {
  key: string;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  price: number;
  kcal: number;
  station: string;
  tags?: Tag[];
  photo?: string;
  groups?: SeedGroup[];
};
export type SeedCategory = { ar: string; en: string; items: SeedItem[] };
export type SeedTable = { label: string; seats: number; x: number; y: number; shape: "square" | "round" | "long"; area: "hall" | "terrace" };

export const RESTAURANT = {
  slug: "jamr",
  nameAr: "جمر",
  nameEn: "Jamr",
  taglineAr: "مشويات ومخبوزات على الفحم",
  taglineEn: "Charcoal grill and bakery",
  currency: "SAR",
  vatBps: 1500,
  serviceBps: 0,
  pricesIncludeVat: true,
  showCalories: true,
  // ZATCA's published sample VAT number: Jamr is not a real business.
  vatNumber: "399999999900003",
  timezone: "Asia/Riyadh",
  defaultLang: "ar" as const,
};

export const STATIONS = [
  { key: "grill", ar: "الشواية", en: "Grill" },
  { key: "hot", ar: "المطبخ الساخن", en: "Hot line" },
  { key: "cold", ar: "البارد", en: "Cold" },
  { key: "oven", ar: "الفرن", en: "Oven" },
  { key: "bar", ar: "المشروبات", en: "Drinks" },
];

const SIDES: SeedOption[] = [
  { ar: "أرز بالشعيرية", en: "Vermicelli rice", kcal: 210, default: true },
  { ar: "بطاطا مقلية", en: "Fries", kcal: 310 },
  { ar: "خبز إضافي", en: "Extra bread", kcal: 240 },
];
const SUGAR: SeedOption[] = [
  { ar: "سكر عادي", en: "Regular sugar", default: true },
  { ar: "سكر خفيف", en: "Less sugar", kcal: -30 },
  { ar: "بدون سكر", en: "No sugar", kcal: -60 },
];

export const MENU: SeedCategory[] = [
  {
    ar: "مقبلات باردة",
    en: "Cold mezze",
    items: [
      {
        key: "hummus",
        ar: "حمص بالطحينة",
        en: "Hummus",
        descAr: "حمص ناعم بالطحينة وزيت الزيتون، يُقدَّم مع خبز طازج.",
        descEn: "Smooth chickpeas with tahini and olive oil, served with fresh bread.",
        price: 1800,
        kcal: 320,
        station: "cold",
        tags: ["veg"],
        photo: "hummus",
        groups: [
          {
            ar: "إضافة",
            en: "Topping",
            min: 0,
            max: 1,
            options: [
              { ar: "صنوبر محمص", en: "Toasted pine nuts", delta: 600, kcal: 90 },
              { ar: "لحم مفروم", en: "Minced lamb", delta: 1200, kcal: 180 },
            ],
          },
        ],
      },
      {
        key: "mutabbal",
        ar: "متبل",
        en: "Mutabbal",
        descAr: "باذنجان مشوي على الفحم مع الطحينة وحب الرمان.",
        descEn: "Charcoal-roasted aubergine with tahini and pomegranate seeds.",
        price: 1900,
        kcal: 260,
        station: "cold",
        tags: ["veg"],
        photo: "mutabbal",
      },
      {
        key: "fattoush",
        ar: "فتوش",
        en: "Fattoush",
        descAr: "خضار موسمية وخبز محمص بالسماق.",
        descEn: "Seasonal greens and toasted bread with sumac.",
        price: 2400,
        kcal: 210,
        station: "cold",
        tags: ["veg"],
        photo: "fattoush",
        groups: [
          {
            ar: "الصلصة",
            en: "Dressing",
            min: 1,
            max: 1,
            options: [
              { ar: "دبس الرمان", en: "Pomegranate molasses", default: true },
              { ar: "ليمون وزيت زيتون", en: "Lemon and olive oil" },
            ],
          },
        ],
      },
      {
        key: "tabbouleh",
        ar: "تبولة",
        en: "Tabbouleh",
        descAr: "بقدونس مفروم ناعمًا مع البرغل والطماطم والليمون.",
        descEn: "Finely chopped parsley with bulgur, tomato and lemon.",
        price: 2200,
        kcal: 180,
        station: "cold",
        tags: ["veg"],
        photo: "tabbouleh",
      },
      {
        key: "muhammara",
        ar: "محمرة",
        en: "Muhammara",
        descAr: "فلفل أحمر مشوي مع الجوز ودبس الرمان.",
        descEn: "Roasted red pepper and walnut dip with pomegranate molasses.",
        price: 2100,
        kcal: 340,
        station: "cold",
        tags: ["veg", "nuts", "spicy"],
        photo: "muhammara",
      },
    ],
  },
  {
    ar: "مقبلات ساخنة",
    en: "Hot mezze",
    items: [
      {
        key: "kibbeh",
        ar: "كبة مقلية",
        en: "Fried kibbeh",
        descAr: "أربع قطع من البرغل المحشو باللحم المتبل والصنوبر، مع اللبن.",
        descEn: "Four bulgur shells filled with spiced lamb and pine nuts, with yoghurt.",
        price: 2800,
        kcal: 420,
        station: "hot",
        tags: ["nuts"],
        photo: "kibbeh",
      },
      {
        key: "sambousek",
        ar: "سمبوسة جبن",
        en: "Cheese sambousek",
        descAr: "خمس قطع مقرمشة محشوة بجبنة العكاوي والنعناع.",
        descEn: "Five crisp pastries filled with akkawi cheese and mint.",
        price: 2200,
        kcal: 380,
        station: "hot",
        tags: ["veg"],
        photo: "sambousek",
      },
      {
        key: "batata-harra",
        ar: "بطاطا حارة",
        en: "Batata harra",
        descAr: "بطاطا مقرمشة مع الثوم والكزبرة والفلفل الحار.",
        descEn: "Crisp potatoes with garlic, coriander and chilli.",
        price: 1900,
        kcal: 350,
        station: "hot",
        tags: ["veg", "spicy"],
        photo: "batata-harra",
        groups: [
          {
            ar: "درجة الحرارة",
            en: "Heat",
            min: 1,
            max: 1,
            options: [
              { ar: "خفيفة", en: "Mild" },
              { ar: "متوسطة", en: "Medium", default: true },
              { ar: "حارة جدًا", en: "Very hot" },
            ],
          },
        ],
      },
    ],
  },
  {
    ar: "من الشواية",
    en: "From the grill",
    items: [
      {
        key: "mixed-grill",
        ar: "مشاوي مشكلة لشخصين",
        en: "Mixed grill for two",
        descAr: "طاووق وكباب وريش وأوصال لحم، مع خضار مشوية وسلطة بصل بالسماق.",
        descEn: "Tawook, kofta, chops and lamb cubes, with grilled vegetables and sumac onions.",
        price: 16500,
        kcal: 1650,
        station: "grill",
        tags: ["signature"],
        photo: "mixed-grill",
        groups: [
          {
            ar: "اختر طبقين جانبيين",
            en: "Choose two sides",
            min: 2,
            max: 2,
            options: [
              { ar: "أرز بالشعيرية", en: "Vermicelli rice", kcal: 210 },
              { ar: "بطاطا مقلية", en: "Fries", kcal: 310 },
              { ar: "حمص", en: "Hummus", kcal: 160 },
              { ar: "خضار مشوية", en: "Grilled vegetables", kcal: 90 },
            ],
          },
        ],
      },
      {
        key: "lamb-chops",
        ar: "ريش غنم",
        en: "Lamb chops",
        descAr: "أربع ريش من الغنم البلدي متبلة بالأعشاب، تُشوى كما تحب.",
        descEn: "Four local lamb chops marinated in herbs, grilled the way you like them.",
        price: 9800,
        kcal: 780,
        station: "grill",
        tags: ["signature"],
        photo: "lamb-chops",
        groups: [
          {
            ar: "درجة الاستواء",
            en: "Doneness",
            min: 1,
            max: 1,
            options: [
              { ar: "متوسطة", en: "Medium" },
              { ar: "فوق المتوسطة", en: "Medium well", default: true },
              { ar: "مستوية تمامًا", en: "Well done" },
            ],
          },
          { ar: "الطبق الجانبي", en: "Side", min: 1, max: 1, options: [...SIDES.slice(0, 2), { ar: "خضار مشوية", en: "Grilled vegetables", delta: 600, kcal: 90 }] },
        ],
      },
      {
        key: "shish-tawook",
        ar: "شيش طاووق",
        en: "Shish tawook",
        descAr: "دجاج متبل باللبن والليمون، مشوي على الفحم، مع الثومية.",
        descEn: "Chicken marinated in yoghurt and lemon, grilled over charcoal, with garlic sauce.",
        price: 5400,
        kcal: 620,
        station: "grill",
        photo: "shish-tawook",
        groups: [{ ar: "الطبق الجانبي", en: "Side", min: 1, max: 1, options: SIDES }],
      },
      {
        key: "lamb-kebab",
        ar: "كباب لحم",
        en: "Lamb kofta",
        descAr: "لحم غنم مفروم مع البقدونس والبصل، مع طماطم وبصل مشوي.",
        descEn: "Minced lamb with parsley and onion, with grilled tomato and onion.",
        price: 6200,
        kcal: 710,
        station: "grill",
        photo: "lamb-kebab",
        groups: [
          { ar: "الطبق الجانبي", en: "Side", min: 1, max: 1, options: SIDES },
          {
            ar: "التتبيلة",
            en: "Seasoning",
            min: 1,
            max: 1,
            options: [
              { ar: "عادية", en: "Classic", default: true },
              { ar: "بالفلفل الحلبي", en: "With Aleppo pepper" },
            ],
          },
        ],
      },
      {
        key: "half-chicken",
        ar: "نصف دجاجة مشوية",
        en: "Half grilled chicken",
        descAr: "دجاج على الفحم بتتبيلة الليمون والثوم، مع المخلل.",
        descEn: "Charcoal-grilled chicken with lemon and garlic, with pickles.",
        price: 4400,
        kcal: 690,
        station: "grill",
        photo: "half-chicken",
        groups: [{ ar: "الطبق الجانبي", en: "Side", min: 1, max: 1, options: SIDES }],
      },
    ],
  },
  {
    ar: "من الفرن",
    en: "From the oven",
    items: [
      {
        key: "zaatar-manakish",
        ar: "منقوشة زعتر",
        en: "Za'atar manakish",
        descAr: "زعتر بلدي وسمسم وزيت زيتون على عجينة طازجة.",
        descEn: "Wild thyme, sesame and olive oil on fresh dough.",
        price: 1400,
        kcal: 410,
        station: "oven",
        tags: ["veg"],
        photo: "zaatar-manakish",
        groups: [
          {
            ar: "إضافات",
            en: "Extras",
            min: 0,
            max: 2,
            options: [
              { ar: "جبنة عكاوي", en: "Akkawi cheese", delta: 400, kcal: 120 },
              { ar: "خضار طازجة", en: "Fresh vegetables", delta: 200, kcal: 20 },
            ],
          },
        ],
      },
      {
        key: "cheese-manakish",
        ar: "منقوشة جبنة",
        en: "Cheese manakish",
        descAr: "جبنة ذائبة مع حبة البركة.",
        descEn: "Melted cheese with nigella seeds.",
        price: 1800,
        kcal: 520,
        station: "oven",
        tags: ["veg"],
        photo: "cheese-manakish",
        groups: [
          {
            ar: "نوع الجبنة",
            en: "Cheese",
            min: 1,
            max: 1,
            options: [
              { ar: "عكاوي", en: "Akkawi", default: true },
              { ar: "موزاريلا", en: "Mozzarella" },
              { ar: "مشكلة", en: "Mixed", delta: 300, kcal: 40 },
            ],
          },
        ],
      },
      {
        key: "lahm-bi-ajeen",
        ar: "لحم بعجين",
        en: "Lahm bi ajeen",
        descAr: "خبز رقيق بلحم مفروم متبل وطماطم وفلفل.",
        descEn: "Thin flatbreads with spiced minced lamb, tomato and pepper.",
        price: 2200,
        kcal: 560,
        station: "oven",
        photo: "lahm-bi-ajeen",
      },
      {
        key: "bread",
        ar: "سلة خبز",
        en: "Bread basket",
        descAr: "خبز عربي يخرج من الفرن الآن.",
        descEn: "Arabic bread, straight from the oven.",
        price: 600,
        kcal: 240,
        station: "oven",
        tags: ["veg"],
        photo: "bread",
      },
    ],
  },
  {
    ar: "الحلويات",
    en: "Desserts",
    items: [
      {
        key: "kunafa",
        ar: "كنافة نابلسية",
        en: "Kunafa nabulsiya",
        descAr: "كنافة ناعمة بالجبنة النابلسية والقطر والفستق الحلبي.",
        descEn: "Fine kunafa with Nabulsi cheese, syrup and pistachio.",
        price: 3200,
        kcal: 590,
        station: "oven",
        tags: ["signature", "veg", "nuts"],
        photo: "kunafa",
        groups: [
          {
            ar: "الحجم",
            en: "Size",
            min: 1,
            max: 1,
            options: [
              { ar: "لشخص", en: "Single", default: true },
              { ar: "للمشاركة", en: "To share", delta: 2200, kcal: 590 },
            ],
          },
        ],
      },
      {
        key: "umm-ali",
        ar: "أم علي",
        en: "Umm Ali",
        descAr: "عجينة مخبوزة بالحليب والمكسرات وجوز الهند.",
        descEn: "Baked pastry pudding with milk, nuts and coconut.",
        price: 2600,
        kcal: 480,
        station: "oven",
        tags: ["veg", "nuts"],
        photo: "umm-ali",
      },
      {
        key: "muhallabia",
        ar: "مهلبية",
        en: "Muhallabia",
        descAr: "مهلبية بماء الورد والفستق الحلبي.",
        descEn: "Milk pudding with rose water and pistachio.",
        price: 1800,
        kcal: 290,
        station: "cold",
        tags: ["veg", "nuts"],
        photo: "muhallabia",
      },
    ],
  },
  {
    ar: "المشروبات",
    en: "Drinks",
    items: [
      {
        key: "saudi-coffee",
        ar: "قهوة سعودية",
        en: "Saudi coffee",
        descAr: "قهوة شقراء بالهيل والزعفران، تُقدَّم بالدلة مع التمر.",
        descEn: "Light-roast coffee with cardamom and saffron, served in a dallah with dates.",
        price: 1600,
        kcal: 15,
        station: "bar",
        tags: ["signature"],
        photo: "saudi-coffee",
        groups: [
          {
            ar: "حجم الدلة",
            en: "Dallah size",
            min: 1,
            max: 1,
            options: [
              { ar: "صغيرة", en: "Small", default: true },
              { ar: "كبيرة", en: "Large", delta: 1200, kcal: 15 },
            ],
          },
        ],
      },
      {
        key: "karak",
        ar: "شاي كرك",
        en: "Karak tea",
        descAr: "شاي بالحليب والهيل والزعفران.",
        descEn: "Tea brewed with milk, cardamom and saffron.",
        price: 900,
        kcal: 120,
        station: "bar",
        photo: "karak",
        groups: [{ ar: "السكر", en: "Sugar", min: 1, max: 1, options: SUGAR }],
      },
      {
        key: "lemon-mint",
        ar: "ليمون بالنعناع",
        en: "Lemon mint",
        descAr: "ليمون طازج ونعناع، مثلج.",
        descEn: "Fresh lemon and mint, blended with ice.",
        price: 1600,
        kcal: 140,
        station: "bar",
        photo: "lemon-mint",
        groups: [{ ar: "السكر", en: "Sugar", min: 1, max: 1, options: SUGAR }],
      },
      {
        key: "ayran",
        ar: "لبن عيران",
        en: "Ayran",
        descAr: "لبن مخفوق بارد مع رشة ملح.",
        descEn: "Chilled whipped yoghurt with a pinch of salt.",
        price: 800,
        kcal: 90,
        station: "bar",
        photo: "ayran",
      },
      {
        key: "water",
        ar: "مياه معدنية",
        en: "Mineral water",
        descAr: "عبوة 330 مل.",
        descEn: "330 ml bottle.",
        price: 300,
        kcal: 0,
        station: "bar",
      },
    ],
  },
];

/** The dining room on a 12 × 9 grid; the terrace is the bottom band. */
export const TABLES: SeedTable[] = [
  { label: "1", seats: 2, x: 0, y: 0, shape: "square", area: "hall" },
  { label: "2", seats: 4, x: 3, y: 0, shape: "square", area: "hall" },
  { label: "3", seats: 4, x: 6, y: 0, shape: "round", area: "hall" },
  { label: "4", seats: 4, x: 9, y: 0, shape: "round", area: "hall" },
  { label: "5", seats: 6, x: 0, y: 3, shape: "long", area: "hall" },
  { label: "6", seats: 4, x: 5, y: 3, shape: "square", area: "hall" },
  { label: "7", seats: 8, x: 8, y: 3, shape: "long", area: "hall" },
  { label: "8", seats: 2, x: 0, y: 7, shape: "round", area: "terrace" },
  { label: "9", seats: 4, x: 3, y: 7, shape: "round", area: "terrace" },
  { label: "10", seats: 6, x: 6, y: 7, shape: "long", area: "terrace" },
];

export const AREAS = { hall: { ar: "الصالة", en: "Dining room" }, terrace: { ar: "التراس", en: "Terrace" } };

/** Notes guests actually write, used by the busy-night simulator. */
export const SIM_NOTES = ["بدون بصل", "حار زيادة", "الصوص على الجنب", "بدون ثومية", "No onions, please", "Extra lemon", "", "", "", ""];
