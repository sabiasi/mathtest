/**
 * WHO SELLS: the details printed on every receipt and in payment emails.
 *
 * >>> TO BE FILLED IN BY THE OWNER before real payments. <<<
 * Leave a value empty ("") while it isn't known: the receipt then shows a
 * clear "to be filled in" mark instead of an invented value.
 * These are public details (they appear on receipts), so they may live in code.
 */
export const SELLER = {
  /** The legal name of the company / individual entrepreneur, e.g. "შპს …". */
  companyName: "",
  /** Identification code (საიდენტიფიკაციო კოდი). */
  idCode: "",
  /** Legal address. */
  address: "",
  /** Bank name and account (IBAN), for invoice payments. */
  bankName: "",
  bankAccount: "",
  /** Where customers can write about a payment. */
  supportEmail: "",
};
export type SellerField = keyof typeof SELLER;
export const SELLER_FIELDS = Object.keys(SELLER) as SellerField[];

/** True once every seller detail is filled in (docs/GO_LIVE.md checks this). */
export const sellerComplete = () => SELLER_FIELDS.every((field) => SELLER[field].trim() !== "");
