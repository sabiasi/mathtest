/**
 * The Geography toolkit's toolbar: coordinates (a tool + ° ′ ″ and the
 * sides of the world) and units, both as plain TEXT in Georgian or Latin
 * letters (the choice is remembered), plus the basic math tab for
 * calculations (scale, density, temperature change).
 */
import { mathTab, mathTabsExcept } from "../math/toolbar";
import type { ToolbarButton, ToolbarTab } from "../types";
import { CoordinateTool } from "./CoordinateTool";

const txt = (text: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}): ToolbarButton => ({ latex: "", display: text, text, ka, en, ...extra });

const MARKS = [txt("°", "გრადუსი", "Degree"), txt("′", "წუთი (კუთხის)", "Minute (of arc)"), txt("″", "წამი (კუთხის)", "Second (of arc)")];

const COORDS_KA: ToolbarButton[] = [
  ...MARKS,
  txt("ჩ. გ.", "ჩრდილოეთის განედი", "North latitude", { group: { ka: "მხარე:", en: "Side:" } }),
  txt("სამხ. გ.", "სამხრეთის განედი", "South latitude"),
  txt("აღმ. გრძ.", "აღმოსავლეთის გრძედი", "East longitude"),
  txt("დას. გრძ.", "დასავლეთის გრძედი", "West longitude"),
  txt("ჩრდილოეთი", "ჩრდილოეთი", "North", { group: { ka: "ჰორიზონტის მხარეები:", en: "Directions:" } }),
  txt("სამხრეთი", "სამხრეთი", "South"),
  txt("აღმოსავლეთი", "აღმოსავლეთი", "East"),
  txt("დასავლეთი", "დასავლეთი", "West"),
];

const COORDS_LATIN: ToolbarButton[] = [
  ...MARKS,
  txt("N", "ჩრდილოეთი (North)", "North", { group: { ka: "მხარე:", en: "Side:" } }),
  txt("S", "სამხრეთი (South)", "South"),
  txt("E", "აღმოსავლეთი (East)", "East"),
  txt("W", "დასავლეთი (West)", "West"),
  txt("NE", "ჩრდილო-აღმოსავლეთი", "North-east"),
  txt("NW", "ჩრდილო-დასავლეთი", "North-west"),
  txt("SE", "სამხრეთ-აღმოსავლეთი", "South-east"),
  txt("SW", "სამხრეთ-დასავლეთი", "South-west"),
];

const UNITS_KA: ToolbarButton[] = [
  txt("კმ", "კილომეტრი", "Kilometre"),
  txt("მ", "მეტრი", "Metre"),
  txt("სმ", "სანტიმეტრი", "Centimetre"),
  txt("მმ", "მილიმეტრი (ნალექიც)", "Millimetre (also precipitation)"),
  txt("კმ²", "კვადრატული კილომეტრი", "Square kilometre"),
  txt("ჰა", "ჰექტარი", "Hectare"),
  txt("°C", "ცელსიუსის გრადუსი", "Degree Celsius"),
  txt("%", "პროცენტი", "Per cent"),
  txt("‰", "პრომილე (მარილიანობა)", "Per mille (salinity)"),
  txt("მ ზ. დ.", "მეტრი ზღვის დონიდან", "Metres above sea level"),
  txt("მმ ვწყ. სვ.", "ვერცხლისწყლის სვეტის მილიმეტრი (წნევა)", "Millimetres of mercury (pressure)"),
  txt("კაცი/კმ²", "მოსახლეობის სიმჭიდროვე", "Population density"),
  txt("ათ.", "ათასი", "thousand", { group: { ka: "რიცხვები:", en: "Numbers:" } }),
  txt("მლნ", "მილიონი", "million"),
  txt("მლრდ", "მილიარდი", "billion"),
  txt("≈", "დაახლოებით", "approximately"),
  txt("↑", "იზრდება", "increases"),
  txt("↓", "კლებულობს", "decreases"),
  txt("UTC+4", "სასაათო სარტყელი (საქართველო: UTC+4)", "time zone (Georgia: UTC+4)"),
  txt("1 : ", "რიცხვითი მასშტაბი: 1 : 50 000", "Numeric scale: 1 : 50 000", { group: { ka: "მასშტაბი:", en: "Scale:" } }),
  txt("1 სმ-ში  კმ", "სახელობითი მასშტაბი", "Scale in words", { caretBack: 3 }),
];

const UNITS_LATIN: ToolbarButton[] = [
  txt("km", "კილომეტრი", "Kilometre"),
  txt("m", "მეტრი", "Metre"),
  txt("cm", "სანტიმეტრი", "Centimetre"),
  txt("mm", "მილიმეტრი", "Millimetre"),
  txt("km²", "კვადრატული კილომეტრი", "Square kilometre"),
  txt("ha", "ჰექტარი", "Hectare"),
  txt("°C", "ცელსიუსის გრადუსი", "Degree Celsius"),
  txt("%", "პროცენტი", "Per cent"),
  txt("‰", "პრომილე", "Per mille"),
  txt("m a.s.l.", "მეტრი ზღვის დონიდან", "Metres above sea level"),
  txt("hPa", "ჰექტოპასკალი (წნევა)", "Hectopascal (pressure)"),
  txt("people/km²", "მოსახლეობის სიმჭიდროვე", "Population density"),
  txt("thsd", "ათასი", "thousand", { group: { ka: "რიცხვები:", en: "Numbers:" } }),
  txt("mln", "მილიონი", "million"),
  txt("bn", "მილიარდი", "billion"),
  txt("≈", "დაახლოებით", "approximately"),
  txt("↑", "იზრდება", "increases"),
  txt("↓", "კლებულობს", "decreases"),
  txt("UTC+4", "სასაათო სარტყელი (საქართველო: UTC+4)", "time zone (Georgia: UTC+4)"),
  txt("1 : ", "რიცხვითი მასშტაბი", "Numeric scale", { group: { ka: "მასშტაბი:", en: "Scale:" } }),
  txt("1 cm =  km", "სახელობითი მასშტაბი", "Scale in words", { caretBack: 3 }),
];

const COORDINATES_TAB: ToolbarTab = {
  id: "coordinates",
  ka: "კოორდინატები",
  en: "Coordinates",
  buttons: COORDS_KA,
  Widget: CoordinateTool,
  styles: {
    storageKey: "mathtest:geo-coords-style",
    options: [
      { id: "georgian", ka: "ქართული", en: "Georgian", buttons: COORDS_KA },
      { id: "latin", ka: "ლათინური", en: "Latin", buttons: COORDS_LATIN },
    ],
  },
};

const UNITS_TAB: ToolbarTab = {
  id: "geo-units",
  ka: "ერთეულები",
  en: "Units",
  buttons: UNITS_KA,
  styles: {
    storageKey: "mathtest:geo-units-style",
    options: [
      { id: "georgian", ka: "ქართული", en: "Georgian", buttons: UNITS_KA },
      { id: "latin", ka: "ლათინური", en: "Latin", buttons: UNITS_LATIN },
    ],
  },
};

export const GEOGRAPHY_TOOLBAR: ToolbarTab[] = [COORDINATES_TAB, UNITS_TAB, mathTab("basic")];
/** The other math symbols: not shown as tabs, but the search finds them. */
export const GEOGRAPHY_SEARCH_EXTRA: ToolbarTab[] = mathTabsExcept("basic");
