export type ModerationCategory =
  | "length"
  | "pii"
  | "self_harm"
  | "threat";

export interface ModerationResult {
  ok: boolean;
  reason?: string;
  category?: ModerationCategory;
}

const MIN_CHARS = 10;
const MAX_CHARS = 2000;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s.\-])?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;
const CC_RE = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/;

const SELF_HARM_RE =
  /\b(?:kill\s+myself|killing\s+myself|end\s+my\s+life|ending\s+my\s+life|suicide|cut\s+myself|cutting\s+myself)\b/i;

const THREAT_RE =
  /\b(?:kill|murder|assassinate|stab|shoot)\s+(?!myself|yourself|me\b|the\s+vibe|it|time|the\s+joke)\w+/i;

export function moderate(rawContent: string): ModerationResult {
  const content = rawContent.trim();

  if (content.length < MIN_CHARS) {
    return {
      ok: false,
      reason: `Submission must be at least ${MIN_CHARS} characters.`,
      category: "length",
    };
  }
  if (content.length > MAX_CHARS) {
    return {
      ok: false,
      reason: `Submission must be under ${MAX_CHARS} characters.`,
      category: "length",
    };
  }

  if (SELF_HARM_RE.test(content)) {
    return {
      ok: false,
      reason:
        "This one's not for the Court. If you're struggling, please reach out to a real human — a friend, a hotline, anyone. The Judge isn't qualified for this.",
      category: "self_harm",
    };
  }

  if (EMAIL_RE.test(content)) {
    return { ok: false, reason: "No email addresses, please.", category: "pii" };
  }
  if (PHONE_RE.test(content)) {
    return { ok: false, reason: "No phone numbers, please.", category: "pii" };
  }
  if (SSN_RE.test(content)) {
    return {
      ok: false,
      reason: "Looks like a social security number. Strip it and try again.",
      category: "pii",
    };
  }
  if (CC_RE.test(content)) {
    return {
      ok: false,
      reason: "Looks like a card number. Strip it and try again.",
      category: "pii",
    };
  }

  if (THREAT_RE.test(content)) {
    return {
      ok: false,
      reason: "No threats against real people.",
      category: "threat",
    };
  }

  return { ok: true };
}
