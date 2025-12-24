import assert from "node:assert/strict";

import {
  postProcessParsedJobDescription,
  type ParsedJobDescription,
} from "./parse-job-description";

function makeParsed(
  overrides: Partial<ParsedJobDescription>
): ParsedJobDescription {
  return {
    requiredSkills: [],
    preferredSkills: [],
    responsibilities: [],
    educationRequirements: [],
    seniorityLevel: "unknown",
    senioritySignals: [],
    yearsOfExperience: null,
    ...overrides,
  };
}

// Regression: don't treat generic phrases as literal required skills.
{
  const jd =
    "Experience in at least one programming language like Python, Java, or JavaScript.";

  const parsed = makeParsed({
    requiredSkills: ["programming language", "Python", "Java", "JavaScript"],
    preferredSkills: [],
  });

  const out = postProcessParsedJobDescription(jd, parsed);

  assert(
    !out.requiredSkills
      .map((s) => s.toLowerCase())
      .includes("programming language")
  );
  assert(
    out.requiredSkills.some((s) =>
      s.toLowerCase().startsWith("at least one of:")
    ),
    "Expected an 'at least one of:' synthetic required group"
  );
}

// Heuristic: skills in "like/such as" lists should be preferred unless explicitly required.
{
  const jd = "Experience with a language such as Python or JavaScript.";

  const parsed = makeParsed({
    requiredSkills: ["Python", "JavaScript"],
    preferredSkills: [],
  });

  const out = postProcessParsedJobDescription(jd, parsed);

  // Since there is no explicit must/required language, these should become preferred.
  assert(
    out.requiredSkills.length === 0 ||
      out.requiredSkills.every(
        (s) => !["python", "javascript"].includes(s.toLowerCase())
      )
  );
  assert(out.preferredSkills.map((s) => s.toLowerCase()).includes("python"));
  assert(
    out.preferredSkills.map((s) => s.toLowerCase()).includes("javascript")
  );
}
