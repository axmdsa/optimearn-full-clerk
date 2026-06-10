import { useAuth as useClerkHook, useUser } from "@clerk/react";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/auth/sign-in" } = options ?? {};
  const { isSignedIn, isLoaded: clerkLoaded, signOut } = useClerkHook();
  const { user: clerkUser } = useUser();
  const utils = trpc.useUtils();

  // Fetch the app user from the database
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isSignedIn && clerkLoaded,
  });

  const logout = useCallback(async () => {
    try {
      await signOut();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    } catch (error: unknown) {
      console.error("Logout error:", error);
    }
  }, [signOut, utils]);

  const state = useMemo(() => {
    if (meQuery.data) {
      console.log("[useAuth] App user data loaded:", meQuery.data.id);
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(meQuery.data)
      );
    }
    
    const loading = !clerkLoaded || (isSignedIn && meQuery.isLoading);
    const isAuthenticated = isSignedIn && Boolean(meQuery.data);
    
    if (clerkLoaded) {
      console.log("[useAuth] State check:", { isSignedIn, hasDbUser: !!meQuery.data, loading, isAuthenticated });
    }

    return {
      user: meQuery.data ?? null,
      loading,
      error: meQuery.error ?? null,
      isAuthenticated,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    isSignedIn,
    clerkLoaded,
  ]);

  // Show error notification for ban or other auth errors
  useEffect(() => {
    if (!meQuery.error) return;
    console.error("[useAuth] meQuery error:", meQuery.error);
    let errorMessage = meQuery.error?.message || '';
    if (!errorMessage && (meQuery.error as any)?.data?.message) {
      errorMessage = (meQuery.error as any).data.message;
    }
    if (!errorMessage) {
      errorMessage = String(meQuery.error);
    }

    if (errorMessage.toLowerCase().includes('banned')) {
      toast.error(errorMessage, { duration: 7000 });
    }
  }, [meQuery.error]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (!clerkLoaded) return;
    
    // Wait for everything to settle
    if (isSignedIn && meQuery.isLoading) return;
    
    if (!isSignedIn || (!meQuery.isLoading && !meQuery.data)) {
      if (typeof window !== "undefined" && window.location.pathname !== redirectPath) {
        console.log("[useAuth] Redirecting to sign-in. Reason:", !isSignedIn ? "Not signed into Clerk" : "No DB user found");
        window.location.href = redirectPath;
      }
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    isSignedIn,
    clerkLoaded,
    meQuery.isLoading,
    meQuery.data
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
