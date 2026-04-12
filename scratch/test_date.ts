import { normalizeDate } from '../src/lib/formatters';

const testCases = [
  "2026-04-10",
  "2026. 4. 10",
  "2026. 04. 04",
  "2026/04/12",
  "2026. 4. 4.",
  "20260410",
];

testCases.forEach(tc => {
  console.log(`Input: "${tc}" => Output: "${normalizeDate(tc)}"`);
});
