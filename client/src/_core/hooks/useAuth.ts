import { useAuth as useClerkHook, useUser } from "@clerk/react";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/auth/sign-in" } = options ?? {};
  const { isSignedIn, isLoaded: clerkLoaded, signOut } = useClerkHook();
  const { user: clerkUser } = useUser();
  const utils = trpc.useUtils();
  const [redirectCount, setRedirectCount] = useState(0);

  // Fetch the app user from the database
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 1,
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
    const loading = !clerkLoaded || (isSignedIn && meQuery.isLoading);
    const isAuthenticated = isSignedIn && Boolean(meQuery.data);
    
    if (clerkLoaded) {
      console.log("[useAuth] State check:", { 
        isSignedIn, 
        hasDbUser: !!meQuery.data, 
        loading, 
        isAuthenticated,
        dbError: meQuery.error?.message 
      });
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

  // Show error notification
  useEffect(() => {
    if (!meQuery.error) return;
    
    const errorMessage = meQuery.error.message || "Authentication failed";
    console.error("[useAuth] Backend error:", meQuery.error);
    
    // If it's a database connection error, show a persistent toast
    if (errorMessage.toLowerCase().includes("database") || errorMessage.toLowerCase().includes("connection")) {
      toast.error("Database connection failed. Please check your DATABASE_URL in Vercel.", {
        id: "db-error",
        duration: 10000
      });
    } else {
      toast.error(errorMessage);
    }
  }, [meQuery.error]);

  // Redirect unauthenticated users with loop protection
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (!clerkLoaded) return;
    if (isSignedIn && meQuery.isLoading) return;
    
    // Stop if we've redirected too many times in one session
    if (redirectCount > 2) {
      console.error("[useAuth] Redirect loop detected. Stopping.");
      return;
    }

    const needsRedirect = !isSignedIn || (!meQuery.isLoading && !meQuery.data);
    
    if (needsRedirect) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (currentPath !== redirectPath) {
        console.log("[useAuth] Redirecting to:", redirectPath, "Reason:", !isSignedIn ? "Not signed into Clerk" : "No DB user");
        setRedirectCount(prev => prev + 1);
        window.location.href = redirectPath;
      }
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    isSignedIn,
    clerkLoaded,
    meQuery.isLoading,
    meQuery.data,
    redirectCount
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
