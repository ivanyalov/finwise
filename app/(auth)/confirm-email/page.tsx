"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Mail, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleResendEmail = async () => {
    if (!email) {
      setResendStatus("error");
      setMessage("Email address not found. Please sign up again.");
      return;
    }

    setResendStatus("loading");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) throw error;

      setResendStatus("success");
      setMessage("Confirmation email sent! Please check your inbox.");
    } catch (err: any) {
      setResendStatus("error");
      setMessage(err.message || "Failed to resend confirmation email. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Mail className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Check Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We've sent a confirmation link to
          </p>
          {email && (
            <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-1">
              {email}
            </p>
          )}
        </div>

        <Card>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    Check your inbox
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click the confirmation link in the email we sent you
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    Check your spam folder
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sometimes emails end up there by mistake
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    Return here after confirming
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Once confirmed, you can sign in to your account
                  </p>
                </div>
              </div>
            </div>

            {resendStatus === "success" && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-400">
                  {message}
                </p>
              </div>
            )}

            {resendStatus === "error" && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-400">
                  {message}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Didn't receive the email?
              </p>
              <Button
                onClick={handleResendEmail}
                isLoading={resendStatus === "loading"}
                disabled={resendStatus === "success"}
                className="w-full"
                variant="secondary"
              >
                Resend Confirmation Email
              </Button>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

