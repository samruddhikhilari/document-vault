"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format");
      return false;
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setEmail("");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="flex min-h-screen items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 shadow-2xl transition-all hover:shadow-3xl sm:p-10">
          
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email address and we will send you a link to reset your password
            </p>
          </div>

          {isSuccess ? (
            <div className="animate-fade-in rounded-lg bg-green-50 p-6 text-center shadow-inner">
              <svg
                className="mx-auto h-16 w-16 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-4 text-xl font-bold text-gray-900">
                Email Sent!
              </h3>
              <p className="mt-2 text-gray-600">
                Check your email for a link to reset your password.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow-lg transition-colors hover:bg-indigo-700"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-4 py-3 text-gray-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                    error
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
                  }`}
                  placeholder="john@example.com"
                />
                {error && (
                  <p className="text-xs text-red-500 animate-pulse">
                    {error}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-400"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="mr-3 h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          <div className="mt-8 text-center text-sm text-gray-600">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
