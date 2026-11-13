/**
 * The English toolbar: gaps and formatting (many English tasks underline or
 * box words), and IPA phonetic symbols for pronunciation tasks. Text buttons.
 */
import type { ToolbarButton, ToolbarTab } from "../types";

const txt = (text: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}): ToolbarButton => ({
  latex: "",
  display: text,
  text,
  ka,
  en,
  ...extra,
});
const fmt = (mark: NonNullable<ToolbarButton["format"]>, label: string, ka: string, en: string): ToolbarButton => ({
  latex: "",
  display: label,
  format: mark,
  ka,
  en,
});

const GAPS_TAB: ToolbarTab = {
  id: "gaps",
  ka: "გამოტოვება და ფორმატი",
  en: "Gaps and formatting",
  buttons: [
    fmt("bold", "B", "მუქი (⌘/Ctrl + B)", "Bold (⌘/Ctrl + B)"),
    fmt("italic", "I", "დახრილი (⌘/Ctrl + I)", "Italic (⌘/Ctrl + I)"),
    fmt("underline", "U", "ხაზგასმული (⌘/Ctrl + U)", "Underline (⌘/Ctrl + U)"),
    fmt("box", "▭ box", "ჩარჩოში ჩასმა (სიტყვების ყუთი): მონიშნეთ სიტყვები და დააჭირეთ", "Word box: select the words, then click"),
    txt("______", "ცარიელი ხაზი", "Blank line", { group: { ka: "ხაზები:", en: "Lines:" } }),
    txt("(1) ______", "დანომრილი გამოტოვება", "Numbered gap"),
    txt(" / ", "გამყოფი (სიტყვების ჩამონათვალში)", "Separator (in a list of words)"),
    txt("0 ", "მაგალითი (0)", "Example (0)"),
  ],
};

const ipa = (symbol: string, example: string) => txt(symbol, `${symbol} — ${example}`, `${symbol} — as in ${example}`);
const IPA_TAB: ToolbarTab = {
  id: "ipa",
  ka: "ფონეტიკა (IPA)",
  en: "Phonetics (IPA)",
  buttons: [
    { ...txt("/ /", "ტრანსკრიფცია: /…/", "Transcription: /…/"), caretBack: 2 },
    txt("ˈ", "მთავარი მახვილი", "Primary stress"),
    txt("ˌ", "მეორეული მახვილი", "Secondary stress"),
    txt("ː", "გრძელი ხმოვანი", "Long vowel"),
    { ...ipa("ə", "about"), group: { ka: "ხმოვნები:", en: "Vowels:" } },
    ipa("æ", "cat"),
    ipa("ʌ", "cup"),
    ipa("ɑː", "father"),
    ipa("ɒ", "hot"),
    ipa("ɔː", "door"),
    ipa("ɪ", "sit"),
    ipa("iː", "see"),
    ipa("ʊ", "book"),
    ipa("uː", "food"),
    ipa("e", "bed"),
    ipa("ɜː", "bird"),
    ipa("eɪ", "day"),
    ipa("aɪ", "my"),
    ipa("ɔɪ", "boy"),
    ipa("əʊ", "go"),
    ipa("aʊ", "now"),
    ipa("ɪə", "near"),
    ipa("eə", "hair"),
    ipa("ʊə", "tour"),
    { ...ipa("θ", "think"), group: { ka: "თანხმოვნები:", en: "Consonants:" } },
    ipa("ð", "this"),
    ipa("ʃ", "she"),
    ipa("ʒ", "vision"),
    ipa("tʃ", "chair"),
    ipa("dʒ", "jam"),
    ipa("ŋ", "sing"),
    ipa("j", "yes"),
  ],
};

export const ENGLISH_TOOLBAR: ToolbarTab[] = [GAPS_TAB, IPA_TAB];
