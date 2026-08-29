export interface SignupFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

export const TERMS_REQUIRED_MESSAGE =
  "Please check this box if you want to proceed.";

export type SignupValidationError = {
  target: "form" | "terms";
  message: string;
} | null;

export function getSignupValidationError(
  values: SignupFormValues,
): SignupValidationError {
  if (!values.name.trim()) {
    return { target: "form", message: "Full name is required." };
  }

  if (!values.email.trim()) {
    return { target: "form", message: "Work email is required." };
  }

  if (!values.password) {
    return { target: "form", message: "Password is required." };
  }

  if (!values.confirmPassword) {
    return { target: "form", message: "Confirm password is required." };
  }

  if (values.password !== values.confirmPassword) {
    return { target: "form", message: "Passwords do not match." };
  }

  if (!values.termsAccepted) {
    return { target: "terms", message: TERMS_REQUIRED_MESSAGE };
  }

  return null;
}
