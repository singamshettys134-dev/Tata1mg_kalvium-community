"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPage } from "@/components/AuthPage";

function AuthPageWithParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleError = searchParams.get("error") || undefined;

  return (
    <AuthPage
      initialError={googleError}
      onLogin={(role) => {
        if (role === "doctor") router.push("/doctor");
        else if (role === "pharmacist") router.push("/pharmacist");
        else if (role === "admin") router.push("/admin");
      }}
      onBack={() => router.push("/")}
    />
  );
}

export default function Auth() {
  return (
    <Suspense fallback={null}>
      <AuthPageWithParams />
    </Suspense>
  );
}
