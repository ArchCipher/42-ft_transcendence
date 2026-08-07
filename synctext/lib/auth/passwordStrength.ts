import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

// password strength estimation - zxcvbn (The Copenhagen Book recommendation)
// language set to english
const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs, // catches "qwerty", "asdfgh"
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary
    }, // common passwords
  useLevenshteinDistance: true, // passw0rd ~ password
};

const zxcvbn = new ZxcvbnFactory(options); // build once at module load

// result.score 0-4
export const MIN_SCORE = 3;

export function isPasswordStrong(
  password: string,
  userInputs: string[] = [],
): { ok: boolean; score: number; feedback: string } {
  const result = zxcvbn.check(password, userInputs);
  return {
    ok: result.score >= MIN_SCORE,
    score: result.score,
    feedback: result.feedback.suggestions.join(" "),
  };
}
