import { SignIn } from "@clerk/react";
import { dark } from "@clerk/themes";
import { useLocation } from "wouter";

export default function SignInPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <SignIn
          afterSignInUrl="/dashboard"
          signUpUrl="/auth/sign-up"
          appearance={{
            baseTheme: dark,
            elements: {
              formButtonPrimary:
                "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors",
              card: "bg-slate-800 border border-slate-700 rounded-lg shadow-xl",
              headerTitle: "text-white text-2xl font-bold",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton:
                "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-lg transition-colors",
              dividerLine: "bg-slate-700",
              dividerText: "text-slate-400",
              formFieldLabel: "text-slate-300",
              formFieldInput:
                "bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:border-blue-500 focus:ring-blue-500",
              footerActionLink: "text-blue-400 hover:text-blue-300",
            },
          }}
        />
      </div>
    </div>
  );
}
