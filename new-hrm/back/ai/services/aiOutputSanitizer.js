const MAX_ANSWER_LENGTH = 8000;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?\d[\d\s().-]{7,}\d)\b/g;

function sanitizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, MAX_ANSWER_LENGTH);
}

function sanitizeDataCards(dataCards = []) {
  return dataCards.map((card) => ({
    type: String(card.type || "data"),
    title: sanitizeText(String(card.title || "")),
    payload: card.payload,
  }));
}

function sanitizeQuery(query) {
  if (typeof query !== "string") {
    return "";
  }

  return query.replace(/\u0000/g, "").trim().slice(0, 2000);
}

module.exports = {
  MAX_ANSWER_LENGTH,
  sanitizeDataCards,
  sanitizeQuery,
  sanitizeText,
};