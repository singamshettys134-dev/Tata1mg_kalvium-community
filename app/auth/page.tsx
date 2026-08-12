"use client";

import { useRouter } from "next/navigation";
import { AuthPage } from "@/components/AuthPage";

export default function Auth() {
  const router = useRouter();

  return (
    <AuthPage
      onLogin={(role) => {
        if (role === "doctor") router.push("/doctor");
        else if (role === "pharmacist") router.push("/pharmacist");
        else if (role === "admin") router.push("/admin");
      }}
      onBack={() => router.push("/")}
    />
  );
}
