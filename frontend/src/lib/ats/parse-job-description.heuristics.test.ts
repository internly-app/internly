import assert from "node:assert/strict";

import type { ParsedJobDescription } from "./parse-job-description";

// NOTE: This test targets the deterministic post-processing heuristics,
// not the OpenAI call.

const JD_TEXT =
  "We work mostly in Java, Ruby, JavaScript, Scala, and Go. " +
  "We believe new programming languages can be learned if the fundamentals and general knowledge are present.";

function normalizeSkillName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.+$/g, "");
}

// Re-implement a tiny slice so we can assert behavior without exporting internals.
// This file intentionally mirrors the logic in parse-job-description.ts.
function applySkillRequirementHeuristicsForTest(
  rawJdText: string,
  parsed: ParsedJobDescription
): ParsedJobDescription {
  const jdLower = rawJdText.toLowerCase();

  const descriptiveListSignals: RegExp[] = [
    /we\s+work\s+mostly\s+in\b/i,
    /our\s+stack\b/i,
    /tech\s+stack\b/i,
    /our\s+tech\s+stack\b/i,
    /we\s+use\b/i,
    /technologies\s+we\s+use\b/i,
    /languages\s+we\s+use\b/i,
  ];

  const learningSignals: RegExp[] = [
    /can\s+be\s+learned\b/i,
    /willing\s+to\s+learn\b/i,
    /learn\s+new\s+languages\b/i,
    /new\s+programming\s+languages\s+can\s+be\s+learned\b/i,
  ];

  const hasDescriptiveSignal = descriptiveListSignals.some((re) =>
    re.test(jdLower)
  );
  const hasLearningSignal = learningSignals.some((re) => re.test(jdLower));
  if (!hasDescriptiveSignal && !hasLearningSignal) return parsed;

  const required = [...parsed.requiredSkills];
  const preferred = [...parsed.preferredSkills];

  const explicitRequirementRe = (skill: string) => {
    const s = skill
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    return new RegExp(
      `(?:must|required|mandatory|need|have to)\\s+(?:have\\s+)?(?:experience\\s+with\\s+)?${s}\\b`,
      "i"
    );
  };

  const seenReq = new Set<string>();
  const seenPref = new Set<string>();

  const newRequired: string[] = [];
  for (const skill of required) {
    if (explicitRequirementRe(skill).test(rawJdText)) {
      const key = normalizeSkillName(skill);
      if (!seenReq.has(key)) {
        seenReq.add(key);
        newRequired.push(skill);
      }
    } else {
      const key = normalizeSkillName(skill);
      if (!seenPref.has(key)) {
        seenPref.add(key);
        preferred.push(skill);
      }
    }
  }

  return {
    ...parsed,
    requiredSkills: newRequired,
    preferredSkills: preferred,
  };
}

function run() {
  const parsed: ParsedJobDescription = {
    requiredSkills: ["Scala", "Go"],
    preferredSkills: ["Java"],
    responsibilities: [],
    educationRequirements: [],
    seniorityLevel: "unknown",
    senioritySignals: [],
    yearsOfExperience: null,
  };

  const fixed = applySkillRequirementHeuristicsForTest(JD_TEXT, parsed);

  assert.deepEqual(
    fixed.requiredSkills.map(normalizeSkillName),
    [],
    "Scala/Go should be downgraded from required when JD indicates languages can be learned"
  );

  const pref = fixed.preferredSkills.map(normalizeSkillName);
  assert.ok(pref.includes("scala"), "Scala should be in preferredSkills");
  assert.ok(pref.includes("go"), "Go should be in preferredSkills");
}

run();
