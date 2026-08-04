import type { ContractWarning } from "../contract/types";
import {
  type ContractEventInput,
  validateCommerceContractEvent,
} from "../contract/validate";

/**
 * Best-effort contract classification for an accepted event. Never throws —
 * observational warnings must not turn a stored event into a failed request.
 */
export function collectContractWarnings(
  event: ContractEventInput,
): ContractWarning[] {
  try {
    return validateCommerceContractEvent(event).warnings;
  } catch {
    // Do not log the event or validator error: either may contain merchant data.
    console.error(
      "[collectContractWarnings] Contract classification failed; warnings omitted",
    );
    return [];
  }
}
