import assert from "node:assert/strict";
import { ContainsEvaluator } from "../../src/evaluation/evaluators/contains.evaluator";
import { JsonValidatorEvaluator } from "../../src/evaluation/evaluators/json-validator.evaluator";
import { KeywordEvaluator } from "../../src/evaluation/evaluators/keyword.evaluator";
import { RegexEvaluator } from "../../src/evaluation/evaluators/regex.evaluator";

async function main() {
  const contains = new ContainsEvaluator();
  const json = new JsonValidatorEvaluator();
  const regex = new RegexEvaluator();
  const keyword = new KeywordEvaluator();

  const containsResult = await contains.evaluate(
    { id: "1", variables: {} },
    "The sky is blue",
  );
  assert.equal(containsResult.passed, true);

  const jsonResult = await json.evaluate(
    { id: "2", variables: {}, expected: { ok: true } },
    '{"ok":true}',
  );
  assert.equal(jsonResult.passed, true);

  const regexResult = await regex.evaluate(
    { id: "3", variables: {}, expected: "blue" },
    "The sky is blue",
  );
  assert.equal(regexResult.passed, true);

  const keywordResult = await keyword.evaluate(
    { id: "4", variables: {}, expected: "blue, sky" },
    "The sky is blue",
  );
  assert.equal(keywordResult.passed, true);

  console.log("evaluation evaluator tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
