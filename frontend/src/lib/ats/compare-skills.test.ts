import assert from "assert";

import { compareSkills } from "./compare-skills";

function mockJD(required: string[], preferred: string[] = []) {
  return { requiredSkills: required, preferredSkills: preferred };
}

function mockResumeSkills(skills: string[]) {
  return {
    skills: {
      technical: skills,
      soft: [],
      other: [],
    },
  };
}

function run() {
  // JavaScript/ES6 should match JavaScript
  {
    const result = compareSkills(
      mockJD(["JavaScript/ES6"]),
      mockResumeSkills(["JavaScript"])
    );
    assert.strictEqual(result.missing.length, 0);
    assert.strictEqual(result.matched.required.length, 1);
  }

  // JavaScript should match JavaScript/ES6 on resume
  {
    const result = compareSkills(
      mockJD(["JavaScript"]),
      mockResumeSkills(["JavaScript/ES6"])
    );
    assert.strictEqual(result.missing.length, 0);
    assert.strictEqual(result.matched.required.length, 1);
  }

  // Node.js should match nodejs canonical
  {
    const result = compareSkills(
      mockJD(["Node.js"]),
      mockResumeSkills(["nodejs"])
    );
    assert.strictEqual(result.missing.length, 0);
  }

  // React (Hooks) should match React
  {
    const result = compareSkills(
      mockJD(["React (Hooks)"]),
      mockResumeSkills(["React"])
    );
    assert.strictEqual(result.missing.length, 0);
  }

  // Version tokens alone shouldn't create false matches
  {
    const result = compareSkills(
      mockJD(["ES6"]),
      mockResumeSkills(["TypeScript"])
    );
    assert.strictEqual(result.missing.length, 1);
  }

  if (process.env.TEST_VERBOSE === "1") {
    console.log("compare-skills tests: OK");
  }
}

run();
