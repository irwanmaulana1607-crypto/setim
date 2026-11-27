"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthFormProps = { mode: "login" | "signup" };

const AuthForm = ({ mode }: AuthFormProps) => {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (isSignup) {
        const { data, error: signupError } = await supabase.auth.signUp({ email, password });
        if (signupError) throw signupError;
        if (data.session) { router.replace("/"); router.refresh(); }
        else { setMessage("Account created. Check your email to confirm your account, then log in."); setPassword(""); }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        router.replace("/"); router.refresh();
      }
    } catch (authError) { setError(authError instanceof Error ? authError.message : isSignup ? "Sign up failed." : "Login failed."); }
    finally { setLoading(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-[#F5F1EA] px-5 text-[#302A25]"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[#302A25]/10 bg-[#E8DFD3]/35 p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-[#A8795D]">Setim</p><h1 className="mt-2 text-2xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1><p className="mt-2 text-sm text-[#776B60]">{isSignup ? "Join your developer and student community." : "Log in to continue to your community."}</p><div className="mt-6 space-y-3"><label className="block text-xs font-semibold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className="mt-1 w-full rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-3 text-sm font-normal outline-none focus:border-[#A8795D]/60" /></label><label className="block text-xs font-semibold">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={isSignup ? "new-password" : "current-password"} className="mt-1 w-full rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-3 text-sm font-normal outline-none focus:border-[#A8795D]/60" /></label></div>{error && <p role="alert" className="mt-3 text-xs text-[#B65F57]">{error}</p>}{message && <p role="status" className="mt-3 text-xs leading-5 text-[#4D6B55]">{message}</p>}<button type="submit" disabled={loading} className="mt-5 w-full rounded-full bg-[#302A25] px-4 py-3 text-sm font-semibold text-[#F5F1EA] disabled:opacity-60">{loading ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Sign Up" : "Log In"}</button><p className="mt-5 text-center text-xs text-[#776B60]">{isSignup ? "Already have an account?" : "Don't have an account?"} <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-[#A8795D] hover:underline">{isSignup ? "Log in" : "Sign up"}</Link></p></form></main>;
};

export default AuthForm;
