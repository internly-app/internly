/**
 * Content Filtering Utility - Optimized for Speed
 *
 * Uses Sets for O(1) lookups and pre-compiled regex for fast matching
 */

// Profanity words as Set for O(1) lookup
const PROFANITY_SET = new Set([
  "fuck",
  "fucking",
  "fucked",
  "fucker",
  "fucks",
  "shit",
  "shitting",
  "shitted",
  "shitter",
  "shits",
  "damn",
  "damned",
  "damnit",
  "dammit",
  "bitch",
  "bitches",
  "bitching",
  "bitched",
  "asshole",
  "assholes",
  "ass",
  "asses",
  "bastard",
  "bastards",
  "crap",
  "crappy",
  "crapped",
  "piss",
  "pissing",
  "pissed",
  "pisser",
  "hell",
  "hells",
  "dick",
  "dicks",
  "dickhead",
  "dickheads",
  "cock",
  "cocks",
  "cocksucker",
  "cocksuckers",
  "pussy",
  "pussies",
  "cunt",
  "cunts",
  "whore",
  "whores",
  "whoring",
  "slut",
  "sluts",
  "slutty",
  "douche",
  "douchebag",
  "douchebags",
  "fag",
  "fags",
  "faggot",
  "faggots",
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "retard",
  "retarded",
  "retards",
  "sex",
  "sexual",
  "sexy",
  "porn",
  "porno",
  "pornography",
  "masturbat",
  "masturbation",
  "orgasm",
  "orgasms",
  "erotic",
  "erotica",
  "nude",
  "nudes",
  "nudity",
  "naked",
  "nakedness",
  "cocaine",
  "coke",
  "heroin",
  "heroine",
  "marijuana",
  "weed",
  "pot",
  "grass",
  "meth",
  "methamphetamine",
  "crack",
  "crackhead",
  "drug",
  "drugs",
  "druggie",
  "stoned",
  "stoner",
  "tripping",
  "kill",
  "killing",
  "killed",
  "killer",
  "killers",
  "murder",
  "murdered",
  "murderer",
  "murderers",
  "rape",
  "raped",
  "rapist",
  "rapists",
  "suicide",
  "suicidal",
  "bomb",
  "bombing",
  "bombed",
  "bomber",
  "terrorist",
  "terrorism",
  "shoot",
  "shooting",
  "shot",
  "shooter",
  "gun",
  "guns",
  "gunman",
  "kike",
  "kikes",
  "chink",
  "chinks",
  "spic",
  "spics",
  "wetback",
  "wetbacks",
  "gook",
  "gooks",
  "jap",
  "japs",
  "towelhead",
  "towelheads",
  "sandnigger",
  "sandniggers",
  "idiot",
  "idiots",
  "idiotic",
  "moron",
  "morons",
  "moronic",
  "stupid",
  "stupidity",
  "dumb",
  "dumbass",
  "dumbasses",
  "imbecile",
  "imbeciles",
  "scam",
  "scams",
  "scammer",
  "scammers",
  "spam",
  "spammer",
  "spammers",
  "phishing",
  "phisher",
  "fraud",
  "fraudulent",
  "fake",
  "fakes",
  "suck",
  "sucks",
  "sucking",
  "sucked",
  "sucker",
  "screw",
  "screws",
  "screwing",
  "screwed",
  "turd",
  "turds",
  "poop",
  "pooping",
  "pooped",
  "pee",
  "peeing",
  "peed",
  "fart",
  "farts",
  "farting",
  "farted",
  "burp",
  "burps",
  "burping",
  "burped",
  "motherfucker",
  "motherfuckers",
  "motherfucking",
  "sonofabitch",
  "sonofabitches",
  "pieceofshit",
  "shithead",
  "shitheads",
  "dipshit",
  "dipshits",
  "bullshit",
  "bullshits",
  "homo",
  "homos",
  "tranny",
  "trannies",
  "shemale",
  "shemales",
]);

// Pre-compile single regex pattern for all profanity words (much faster)
const PROFANITY_WORDS = Array.from(PROFANITY_SET);
const PROFANITY_REGEX = new RegExp(
  `\\b(${PROFANITY_WORDS.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|")})\\b`,
  "i"
);

// Reserved names as Set for O(1) lookup
// Only system/admin/reserved names - NOT real company names (those are checked via database uniqueness)
const RESERVED_COMPANY_NAMES_SET = new Set([
  "admin",
  "administrator",
  "root",
  "sysadmin",
  "sample",
  "example",
  "null",
  "undefined",
  "none",
  "n/a",
  "na",
  "www",
  "http",
  "https",
  "ftp",
  "smtp",
  "dns",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "internly",
  "internly.com",
  "internly.io",
  "support",
  "copyright",
  "trademark",
  "index",
  "companies",
  "corporation",
  "business",
  "enterprise",
  "organization",
]);

// Pre-compile spam patterns (single regex is faster)
const SPAM_REGEX = /(.)\1{4,}|[A-Z]{10,}/;

/**
 * Fast profanity check using pre-compiled regex
 * O(1) regex compilation, O(n) text scan where n = text length
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return PROFANITY_REGEX.test(text.toLowerCase());
}

/**
 * Find specific profanity word in text
 */
export function findProfanity(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const match = text.toLowerCase().match(PROFANITY_REGEX);
  return match ? match[0] : null;
}

/**
 * Fast spam pattern check using pre-compiled regex
 */
export function containsSpamPatterns(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return SPAM_REGEX.test(text);
}

/**
 * Fast reserved name check using Set lookup - O(1)
 */
export function isReservedCompanyName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  return RESERVED_COMPANY_NAMES_SET.has(name.toLowerCase().trim());
}

/**
 * Validates company name - optimized for speed
 */
export function validateCompanyName(name: string): {
  isValid: boolean;
  reason?: string;
} {
  if (!name?.trim()) {
    return { isValid: false, reason: "Company name cannot be empty" };
  }

  if (name.length > 200) {
    return { isValid: false, reason: "Company name is too long" };
  }

  const profanity = findProfanity(name);
  if (profanity) {
    return {
      isValid: false,
      reason: `Company name contains inappropriate content: "${profanity}"`,
    };
  }

  if (containsSpamPatterns(name)) {
    return { isValid: false, reason: "Company name contains spam patterns" };
  }

  if (isReservedCompanyName(name)) {
    return { isValid: false, reason: "This company name is reserved" };
  }

  if (!/[a-zA-Z]/.test(name)) {
    return {
      isValid: false,
      reason: "Company name must contain at least one letter",
    };
  }

  return { isValid: true };
}

/**
 * Validates role name - optimized for speed
 */
export function validateRoleName(name: string): {
  isValid: boolean;
  reason?: string;
} {
  if (!name?.trim()) {
    return { isValid: false, reason: "Role name cannot be empty" };
  }

  if (name.length > 200) {
    return { isValid: false, reason: "Role name is too long" };
  }

  const profanity = findProfanity(name);
  if (profanity) {
    return {
      isValid: false,
      reason: `Role name contains inappropriate content: "${profanity}"`,
    };
  }

  if (containsSpamPatterns(name)) {
    return { isValid: false, reason: "Role name contains spam patterns" };
  }

  return { isValid: true };
}

/**
 * Validates review content - optimized for speed
 */
export function validateReviewContent(
  content: string,
  fieldName: string
): {
  isValid: boolean;
  reason?: string;
} {
  if (!content?.trim()) {
    return { isValid: true }; // Empty is allowed
  }

  if (content.length > 2000) {
    return { isValid: false, reason: `${fieldName} is too long` };
  }

  const profanity = findProfanity(content);
  if (profanity) {
    return {
      isValid: false,
      reason: `${fieldName} contains inappropriate content: "${profanity}"`,
    };
  }

  // Only check extreme spam (10+ repeated chars)
  if (/(.)\1{10,}/.test(content)) {
    return { isValid: false, reason: `${fieldName} contains spam patterns` };
  }

  return { isValid: true };
}

/**
 * Fast text sanitization - minimal operations
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") return "";

  return text
    .trim()
    .replace(/\0/g, "") // Remove null bytes
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width
    .normalize("NFKC"); // Normalize unicode
}
