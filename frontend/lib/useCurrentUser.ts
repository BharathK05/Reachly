"use client";
import useSWR from "swr";

export interface CurrentUser {
  tenant_id: string;
  company_name: string;
  email: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("unauthenticated");
    return r.json();
  });

export function useCurrentUser() {
  const { data, error, isLoading } = useSWR<CurrentUser>("/api/me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return {
    user: data ?? null,
    loading: isLoading,
    error,
  };
}
