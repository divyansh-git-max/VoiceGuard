import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

function LoginPage({ onLogin, onGoToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    // Basic validation
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    // Password must be at least 6 characters
    if (password.length < 6) {
    setError("Password must be at least 6 characters.");
    return;
    }

    setLoading(true);

    /*
      Temporary frontend login.

      Later, this will be replaced with a real
      backend authentication API call.
    */
    await new Promise((resolve) => setTimeout(resolve, 800));

    setLoading(false);

    if (onLogin) {
      onLogin({
        email,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">

        {/* ================= LEFT BRANDING ================= */}

        <section className="relative hidden overflow-hidden border-r border-line lg:flex lg:items-center">

          {/* Blue glow */}
          <div className="absolute -left-40 top-1/2 h-[650px] w-[650px] -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />

          {/* Purple glow */}
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />

          {/* Background grid */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          <motion.div
            className="relative z-10 max-w-2xl px-16 xl:px-24"
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >

            {/* Logo icon */}
            <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 shadow-glass">
              <ShieldCheck className="h-9 w-9 text-blue-400" />
            </div>

            {/* Brand name */}
            <h1 className="text-6xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
                VoiceGuard
              </span>
            </h1>

            {/* Description */}
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              AI-powered voice security and impersonation detection.
            </p>

            {/* Divider */}
            <div className="mt-10 h-px w-24 bg-gradient-to-r from-blue-500 to-transparent" />

            {/* Tagline */}
            <p className="mt-6 text-sm tracking-wide text-slate-500">
              Detect. Verify. Protect.
            </p>
          </motion.div>
        </section>

        {/* ================= RIGHT LOGIN ================= */}

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-10">

          {/* Mobile glow */}
          <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl lg:hidden" />

          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
            }}
          >

            {/* Mobile logo */}
            <div className="mb-10 flex items-center gap-3 lg:hidden">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10">
                <ShieldCheck className="h-6 w-6 text-blue-400" />
              </div>

              <span className="text-xl font-bold text-text-strong">
                VoiceGuard
              </span>

            </div>

            {/* Heading */}
            <div className="mb-9">

              <h2 className="text-4xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                  Welcome back
                </span>
              </h2>

              <p className="mt-3 text-sm text-muted">
                Login to your VoiceGuard workspace
              </p>

            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.div>
            )}

            {/* ================= LOGIN FORM ================= */}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* EMAIL */}

              <div>

                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Work email
                </label>

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-purple-500/30 bg-slate-950/60 px-5 py-4 text-sm text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/10"
                />

              </div>

              {/* PASSWORD */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs text-blue-400 transition-colors hover:text-blue-300"
                    onClick={() => {
                      setError(
                        "Password recovery will be connected later."
                      );
                    }}
                  >
                    Forgot password?
                  </button>

                </div>

                <div className="relative">

                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-purple-500/30 bg-slate-950/60 px-5 py-4 pr-14 text-sm text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/10"
                  />

                  {/* Show / hide password */}

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>

                </div>

              </div>

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-2xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/50 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >

                <span className="relative z-10 flex items-center justify-center gap-2">

                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}

                </span>

                {/* Button hover light */}

                <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-0" />

              </button>

            </form>

            {/* SIGNUP LINK */}

            <div className="mt-8 text-center text-sm text-muted">

              Don't have an account?{" "}

              <button
                type="button"
                onClick={onGoToSignup}
                className="font-medium text-blue-400 transition-colors hover:text-blue-300"
              >
                Create account
              </button>

            </div>

          </motion.div>

        </section>

      </div>
    </div>
  );
}

export default LoginPage;