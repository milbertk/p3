// Preloaded currencies (US dollar first, then Costa Rican colón). Only the
// SYMBOL is saved, so each symbol is unique. Used by the company page (one
// currency per store) and shown in the product form.
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US dollar" },
  { code: "CRC", symbol: "₡", name: "Costa Rican colón" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British pound" },
  { code: "GTQ", symbol: "Q", name: "Guatemalan quetzal" },
  { code: "CAD", symbol: "CA$", name: "Canadian dollar" },
  { code: "AUD", symbol: "A$", name: "Australian dollar" },
  { code: "BRL", symbol: "R$", name: "Brazilian real" },
  { code: "MXN", symbol: "MX$", name: "Mexican peso" },
  { code: "JPY", symbol: "¥", name: "Japanese yen" },
  { code: "CNY", symbol: "CN¥", name: "Chinese yuan" },
  { code: "CHF", symbol: "CHF", name: "Swiss franc" },
  { code: "INR", symbol: "₹", name: "Indian rupee" },
  { code: "KRW", symbol: "₩", name: "South Korean won" },
  { code: "SGD", symbol: "S$", name: "Singapore dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish krona" },
  { code: "ZAR", symbol: "R", name: "South African rand" },
  { code: "COP", symbol: "COL$", name: "Colombian peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian sol" },
  { code: "CLP", symbol: "CLP$", name: "Chilean peso" },
  { code: "ARS", symbol: "ARS$", name: "Argentine peso" },
  { code: "NIO", symbol: "C$", name: "Nicaraguan córdoba" },
  { code: "HNL", symbol: "L", name: "Honduran lempira" },
  { code: "PAB", symbol: "B/.", name: "Panamanian balboa" },
  { code: "DOP", symbol: "RD$", name: "Dominican peso" },
];

export const DEFAULT_CURRENCY_SYMBOL = "$";
export const CURRENCY_SYMBOL_MAX_LENGTH = 5;

export const isPreloadedCurrencySymbol = (symbol) =>
  CURRENCIES.some((currency) => currency.symbol === symbol);
