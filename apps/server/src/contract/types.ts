import type { ContractWarningCode } from "./warningCodes";

/** Observational contract warning; it never rejects or rewrites an event. */
export type ContractWarning = {
  code: ContractWarningCode;
  field?: string;
  hint: string;
};

/** Phase 1 result shape for classifying one event against the contract. */
export type ContractCheckResult = {
  eventName: string;
  canonicalName: string | null;
  aliasUsed: boolean;
  warnings: ContractWarning[];
};
