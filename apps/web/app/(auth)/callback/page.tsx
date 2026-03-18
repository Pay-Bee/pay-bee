"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const error = params.get("error");
    if (error) {
      router.replace("/");
    } else {
      router.replace("/catalog");
    }
  }, [params, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-gray-400">
      Signing you in…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-gray-400">Loading…</div>}>
      <CallbackContent />
    </Suspense>
  );
}
