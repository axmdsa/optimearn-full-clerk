export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Redirect to Clerk sign-in page
export const getLoginUrl = () => {
  return "/auth/sign-in";
};
