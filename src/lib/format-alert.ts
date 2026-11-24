export interface FormattedCapDescription {
  leadSentence: string;
  regionsTitleCase: string[];
  advisoryParagraphs: string[];
  rawFallback: string;
}

function toTitleCaseId(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      if (word === "di" || word === "dan") return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Rapikan teks deskripsi resmi CAP 1.2 BMKG yang umumnya menggabungkan puluhan
 * nama kecamatan HURUF KAPITAL dalam satu paragraf panjang menjadi ringkasan,
 * imbauan/dampak, dan daftar wilayah Title Case yang mudah dibaca.
 */
export function formatCapDescription(raw: string): FormattedCapDescription {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const match = cleaned.match(
    /^(.*?khususnya di)\s+([A-Z0-9,\-\s/.]+?)\.\s*(.*)$/,
  );

  if (!match) {
    return {
      leadSentence: "",
      regionsTitleCase: [],
      advisoryParagraphs: cleaned
        .split(/(?<=\.)\s+/)
        .filter((s) => s.trim().length > 0),
      rawFallback: cleaned,
    };
  }

  const leadPrefix = (match[1] ?? "").replace(/,?\s*khususnya di$/i, "").trim();
  const rawList = match[2] ?? "";
  const rest = (match[3] ?? "").trim();

  const regionsTitleCase = rawList
    .split(",")
    .map((item) => toTitleCaseId(item.trim()))
    .filter((item) => item.length > 0);

  const advisoryParagraphs = rest
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    leadSentence: leadPrefix ? `${leadPrefix}.` : "",
    regionsTitleCase,
    advisoryParagraphs,
    rawFallback: cleaned,
  };
}
