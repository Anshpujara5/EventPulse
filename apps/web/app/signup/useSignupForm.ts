"use client";

import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  getSignupValidationError,
  type SignupFormValues,
} from "./signup-validation";

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      createdAt: string;
    };
    token: string;
  };
}

const INITIAL_VALUES: SignupFormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
};

export function useSignupForm() {
  const router = useRouter();
  const [values, setValues] = useState<SignupFormValues>(INITIAL_VALUES);
  const [error, setError] = useState("");
  const [termsError, setTermsError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const termsInputRef = useRef<HTMLInputElement>(null);

  function updateValue<Key extends keyof SignupFormValues>(
    key: Key,
    value: SignupFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue("name", event.target.value);
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue("email", event.target.value);
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue("password", event.target.value);
  }

  function handleConfirmPasswordChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue("confirmPassword", event.target.value);
  }

  function handleTermsChange(checked: boolean) {
    updateValue("termsAccepted", checked);
    if (checked) {
      setTermsError("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getSignupValidationError(values);
    if (validationError) {
      setError(validationError.target === "form" ? validationError.message : "");
      setTermsError(
        validationError.target === "terms" ? validationError.message : "",
      );
      if (validationError.target === "terms") {
        termsInputRef.current?.focus();
      }
      return;
    }

    setError("");
    setTermsError("");
    setIsLoading(true);

    try {
      const response = await apiRequest<AuthResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      localStorage.setItem("eventpulse_token", response.data.token);
      localStorage.setItem(
        "eventpulse_user",
        JSON.stringify(response.data.user),
      );
      router.push("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create account",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
    values,
    error,
    termsError,
    isLoading,
    showPassword,
    showConfirmPassword,
    termsInputRef,
    handleNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleTermsChange,
    handleSubmit,
    togglePasswordVisibility: () =>
      setShowPassword((current) => !current),
    toggleConfirmPasswordVisibility: () =>
      setShowConfirmPassword((current) => !current),
  };
}
