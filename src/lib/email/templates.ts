/**
 * The emails MathTest sends, in Georgian and English.
 *
 * Email text lives here (not in i18n/dictionaries.ts): it is used only on the
 * server and would otherwise be downloaded by every visitor's browser.
 * `EmailTexts` makes TypeScript check that both languages have every email.
 *
 * `{name}` marks a placeholder. Everything filled in is escaped for the HTML
 * version, so a strange school name can't break the email.
 */
import type { Language } from "@/i18n/dictionaries";
import { BRAND, GRACE_DAYS, TRIAL_DAYS } from "@/lib/plans/plans";

export const EMAIL_KINDS = [
  "welcome",
  "trialEnding3",
  "trialEnding1",
  "paymentReceived",
  "paymentFailed",
  "graceEnding",
  "planEnded",
  "cancelConfirmed",
  "schoolInvite",
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

/** What an email may need. Dates and amounts arrive already formatted for the language. */
export type EmailData = {
  /** Our address, e.g. https://mathtest.ge (links are built from it). */
  siteUrl: string;
  date?: string;
  amount?: string;
  plan?: string;
  receiptNumber?: string;
  /** A full link, e.g. to the receipt or the invitation. */
  link?: string;
  school?: string;
  inviter?: string;
};

type Text = { subject: string; heading: string; body: string[]; button?: string; footer?: string };
type EmailTexts = Record<EmailKind, Text>;

const ka: EmailTexts = {
  welcome: {
    subject: "კეთილი იყოს თქვენი მობრძანება MathTest-ში",
    heading: "გამარჯობა!",
    body: [
      "თქვენი ანგარიში მზადაა. შეგიძლიათ შექმნათ ტესტები, დაბეჭდოთ ან PDF-ად გადმოწეროთ.",
      "პირველი {trialDays} დღე Premium უფასოა — ბარათი არ გვჭირდება. შემდეგ ავტომატურად გადახვალთ უფასო გეგმაზე და ყველა ტესტი დარჩება.",
    ],
    button: "ჩემი ტესტები",
  },
  trialEnding3: {
    subject: "Premium-ის საცდელი პერიოდი 3 დღეში მთავრდება",
    heading: "საცდელი პერიოდი მალე მთავრდება",
    body: [
      "Premium-ის უფასო საცდელი პერიოდი მთავრდება {date}.",
      "არაფერი დაიკარგება: ტესტები და სურათები რჩება, ფული არ ჩამოგეჭრებათ. თუ Premium გსურთ, შეგიძლიათ ახლავე შეიძინოთ.",
    ],
    button: "გეგმების ნახვა",
  },
  trialEnding1: {
    subject: "Premium-ის საცდელი პერიოდი ხვალ მთავრდება",
    heading: "დარჩა ერთი დღე",
    body: [
      "Premium-ის უფასო საცდელი პერიოდი მთავრდება {date}.",
      "შემდეგ გადახვალთ უფასო გეგმაზე. ტესტები და სურათები რჩება, ფული არ ჩამოგეჭრებათ.",
    ],
    button: "გეგმების ნახვა",
  },
  paymentReceived: {
    subject: "გადახდა მიღებულია — ქვითარი № {receiptNumber}",
    heading: "გმადლობთ, გადახდა მიღებულია",
    body: ["მივიღეთ {amount}. თქვენი გეგმა: {plan}, მოქმედებს {date}-მდე.", "ქვითარი № {receiptNumber} შეგიძლიათ ნახოთ და დაბეჭდოთ ქვემოთ მოცემული ბმულით."],
    button: "ქვითრის ნახვა",
  },
  paymentFailed: {
    subject: "გადახდა ვერ მოხერხდა",
    heading: "გადახდა ვერ მოხერხდა",
    body: [
      "თქვენი გეგმის ({plan}) გასაგრძელებლად {amount} ბარათიდან ვერ ჩამოიჭრა.",
      "არაფერი დაკარგულა: გეგმა მოქმედებს {date}-მდე და ამ დროის განმავლობაში კიდევ ვცდით. შეგიძლიათ თავადაც გადაიხადოთ სხვა ბარათით.",
    ],
    button: "გადახდის გამოსწორება",
  },
  graceEnding: {
    subject: "თქვენი გეგმა მალე დასრულდება",
    heading: "გადახდა ჯერ ვერ მოხერხდა",
    body: [
      "თქვენი გეგმა ({plan}) მოქმედებს {date}-მდე. თუ მანამდე გადახდა ვერ მოხერხდა, გადახვალთ უფასო გეგმაზე.",
      "ტესტები და სურათები ნებისმიერ შემთხვევაში რჩება.",
    ],
    button: "გადახდის გამოსწორება",
  },
  planEnded: {
    subject: "თქვენი გეგმა დასრულდა",
    heading: "ახლა უფასო გეგმაზე ხართ",
    body: [
      "თქვენი გეგმა ({plan}) დასრულდა. არაფერი წაშლილა: ყველა ტესტი და სურათი ადგილზეა, დაკეტილია მხოლოდ Premium შესაძლებლობები.",
      "დაბრუნება ნებისმიერ დროს შეგიძლიათ.",
    ],
    button: "გეგმების ნახვა",
  },
  cancelConfirmed: {
    subject: "გამოწერა გაუქმებულია",
    heading: "გამოწერა გაუქმებულია",
    body: ["თქვენი გეგმა ({plan}) აღარ განახლდება და მოქმედებს {date}-მდე. ფული აღარ ჩამოგეჭრებათ.", "თუ გადაიფიქრებთ, ამ თარიღამდე გამოწერის აღდგენა პარამეტრებში შეგიძლიათ."],
    button: "ჩემი გეგმა",
  },
  schoolInvite: {
    subject: "{school} გიწვევთ MathTest-ში",
    heading: "მოწვევა სკოლის გეგმაში",
    body: ["{inviter} გიწვევთ, შეუერთდეთ სკოლას „{school}“ MathTest-ში. სკოლის გეგმით ყველა Premium შესაძლებლობა თქვენთვის უფასოა.", "მოწვევის მისაღებად გახსენით ბმული და შედით ამ ელფოსტით."],
    button: "მოწვევის მიღება",
  },
};

const en: EmailTexts = {
  welcome: {
    subject: "Welcome to MathTest",
    heading: "Hello!",
    body: [
      "Your account is ready. You can create tests, print them or download them as PDF.",
      "The first {trialDays} days of Premium are free — no card needed. After that you move to the Free plan automatically and keep all your tests.",
    ],
    button: "My tests",
  },
  trialEnding3: {
    subject: "Your Premium trial ends in 3 days",
    heading: "Your trial ends soon",
    body: ["Your free Premium trial ends on {date}.", "Nothing will be lost: your tests and pictures stay, and nothing is charged. If you want to keep Premium, you can buy it now."],
    button: "See plans",
  },
  trialEnding1: {
    subject: "Your Premium trial ends tomorrow",
    heading: "One day left",
    body: ["Your free Premium trial ends on {date}.", "After that you move to the Free plan. Your tests and pictures stay, and nothing is charged."],
    button: "See plans",
  },
  paymentReceived: {
    subject: "Payment received — receipt no. {receiptNumber}",
    heading: "Thank you, we received your payment",
    body: ["We received {amount}. Your plan: {plan}, valid until {date}.", "You can view and print receipt no. {receiptNumber} with the link below."],
    button: "View the receipt",
  },
  paymentFailed: {
    subject: "Your payment didn't go through",
    heading: "Your payment didn't go through",
    body: [
      "We couldn't charge {amount} to your card to continue your plan ({plan}).",
      "Nothing is lost: your plan works until {date}, and we will try again during that time. You can also pay yourself with another card.",
    ],
    button: "Fix the payment",
  },
  graceEnding: {
    subject: "Your plan is about to end",
    heading: "The payment still hasn't gone through",
    body: ["Your plan ({plan}) works until {date}. If the payment doesn't succeed before then, you move to the Free plan.", "Your tests and pictures stay in any case."],
    button: "Fix the payment",
  },
  planEnded: {
    subject: "Your plan has ended",
    heading: "You are now on the Free plan",
    body: ["Your plan ({plan}) has ended. Nothing was deleted: every test and picture is still there; only Premium features are locked.", "You can come back any time."],
    button: "See plans",
  },
  cancelConfirmed: {
    subject: "Your subscription is cancelled",
    heading: "Your subscription is cancelled",
    body: ["Your plan ({plan}) will not renew and works until {date}. Nothing more will be charged.", "If you change your mind, you can resume it in Settings before that date."],
    button: "My plan",
  },
  schoolInvite: {
    subject: "{school} invites you to MathTest",
    heading: "An invitation to a School plan",
    body: ["{inviter} invites you to join “{school}” on MathTest. With the School plan every Premium feature is free for you.", "To accept, open the link and sign in with this email address."],
    button: "Accept the invitation",
  },
};

const TEXTS: Record<Language, EmailTexts> = { ka, en };
const FOOTER: Record<Language, string> = {
  ka: "ეს წერილი გამოგზავნილია ავტომატურად თქვენი MathTest ანგარიშის გამო.",
  en: "This email was sent automatically because of your MathTest account.",
};

/** Where each email's button leads when no special link is given. */
const DEFAULT_PATH: Record<EmailKind, string> = {
  welcome: "/tests",
  trialEnding3: "/pricing",
  trialEnding1: "/pricing",
  paymentReceived: "/settings#plan",
  paymentFailed: "/settings#plan",
  graceEnding: "/settings#plan",
  planEnded: "/pricing",
  cancelConfirmed: "/settings#plan",
  schoolInvite: "/tests",
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function fill(template: string, values: Record<string, string>, escape: boolean): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = values[name] ?? "";
    return escape ? escapeHtml(value) : value;
  });
}

export type RenderedEmail = { subject: string; text: string; html: string };

export function renderEmail(kind: EmailKind, language: Language, data: EmailData): RenderedEmail {
  const texts = TEXTS[language][kind];
  const values: Record<string, string> = {
    trialDays: String(TRIAL_DAYS),
    graceDays: String(GRACE_DAYS),
    date: data.date ?? "",
    amount: data.amount ?? "",
    plan: data.plan ?? "",
    receiptNumber: data.receiptNumber ?? "",
    school: data.school ?? "",
    inviter: data.inviter ?? "",
  };
  const link = data.link ?? `${data.siteUrl}${DEFAULT_PATH[kind]}`;
  const subject = fill(texts.subject, values, false);
  const paragraphs = texts.body.map((line) => fill(line, values, false));
  const text = [fill(texts.heading, values, false), "", ...paragraphs, "", texts.button ? `${texts.button}: ${link}` : "", "", `— ${BRAND.name}`, FOOTER[language]]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  // Plain, widely supported HTML: email programs ignore most modern CSS.
  const html = `<!doctype html>
<html lang="${language}">
<body style="margin:0;padding:24px;background:#f5f5f7;font-family:'Noto Sans Georgian',Arial,Helvetica,sans-serif;color:#1c1c28;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4ea;border-radius:12px;">
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 20px;font-size:15px;font-weight:bold;color:#4f46e5;">${escapeHtml(BRAND.name)}</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;">${fill(texts.heading, values, true)}</h1>
${texts.body.map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${fill(line, values, true)}</p>`).join("\n")}
${texts.button ? `<p style="margin:24px 0 8px;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:11px 20px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold;">${escapeHtml(texts.button)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e4e4ea;font-size:12px;line-height:1.5;color:#6b6b7b;">${escapeHtml(FOOTER[language])}</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
  return { subject, text, html };
}
