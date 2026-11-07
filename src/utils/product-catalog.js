export const PRODUCT_CATEGORIES = ["Suit", "Saree", "Lehenga", "Kurti", "Sharara"];

export const normalizeProductCategory = (category) => {
  const value = String(category || "").trim().toLowerCase();
  if (value.includes("lehng") || value.includes("lehenga")) return "Lehenga";
  if (value.includes("sari") || value.includes("saree")) return "Saree";
  if (value.includes("sharara")) return "Sharara";
  if (value.includes("kurti") || value.includes("choli") || value.includes("frock")) return "Kurti";
  if (value.includes("suit")) return "Suit";
  return "";
};
