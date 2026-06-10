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
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkHook();
  const { user: clerkUser } = useUser();
  const utils = trpc.useUtils();

  // Fetch the app user from the database
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isSignedIn && clerkLoaded,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    if (meQuery.data) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(meQuery.data)
      );
    }
    return {
      user: meQuery.data ?? null,
      loading: !clerkLoaded || meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: isSignedIn && Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    isSignedIn,
    clerkLoaded,
  ]);

  // Show error notification for ban or other auth errors
  useEffect(() => {
    if (!meQuery.error) return;
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
    if (isSignedIn) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    isSignedIn,
    clerkLoaded,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
