// @ts-check

/**
 * Stub catalog mirroring seeded `security_question` rows (en labels).
 * Replace with a DB/API lookup when wiring the real challenge/setup flows.
 */
export const SECURITY_QUESTION_CATALOG = [
  { id: 1, label: "What was the name of your first pet?" },
  { id: 2, label: "What is your mother's maiden name?" },
  { id: 3, label: "What was the name of your first school?" },
  { id: 4, label: "In what city were you born?" },
  { id: 5, label: "What was your childhood nickname?" },
  { id: 12, label: "What was the company name of your first job?" },
  { id: 13, label: "What was your favorite childhood food?" },
];

/**
 * @param {number} count
 */
export function emptyQuestionSlots(count = 3) {
  return Array.from({ length: count }, (_, i) => ({ slot: i + 1 }));
}
