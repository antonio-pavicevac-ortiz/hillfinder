"use client";

import { FieldError } from "react-hook-form";

type FormFieldProps = {
  label?: string;
  type?: string;
  name: string;
  placeholder?: string;
  register: any;
  error?: FieldError;
  autoComplete?: string;
};

export default function FormField({
  label,
  type = "text",
  name,
  placeholder,
  register,
  error,
  autoComplete = "off",
}: FormFieldProps) {
  return (
    <div className="text-left space-y-1">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        {...register(name)}
        className={`border p-2 rounded w-full focus:ring-2 focus:ring-green-500 focus:outline-none ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      {error && <p className="text-sm text-red-600">{error.message}</p>}
    </div>
  );
}
