import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

function SignupPage({ onSignup, onGoToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (
      !name.trim() ||
      !email.trim() ||
      !organization.trim() ||
      !role ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Generate sanitized username (3-50 chars) from full name or email prefix
    let cleanUsername = name.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    if (cleanUsername.length < 3) {
      cleanUsername = `${cleanUsername}_${email.split("@")[0]}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    }
    if (cleanUsername.length < 3) {
      cleanUsername = `user_${Math.floor(Math.random() * 8999 + 1000)}`;
    }

    setLoading(true);

    try {
      const response = await fetch("https://divyansh2025-voiceguard-api.hf.space/gradio_api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: cleanUsername,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let detailMsg = data.detail;
        if (Array.isArray(detailMsg)) {
          detailMsg = detailMsg.map((item) => item.msg || item.loc?.join(".") || "Validation error").join("; ");
        }
        throw new Error(
          detailMsg || "Registration failed. Please check your information and try again."
        );
      }

      if (onSignup) {
        onSignup({
          name: name.trim(),
          email: email.trim(),
          username: data.username || cleanUsername,
          organization,
          role,
        });
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to registration server. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
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
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />

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
            {/* Logo */}
            <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 shadow-glass">
              <ShieldCheck className="h-9 w-9 text-blue-400" />
            </div>

            {/* Brand name */}
            <h1 className="text-6xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
                VoiceGuard
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              AI-powered voice security and impersonation detection.
            </p>

            <div className="mt-10 h-px w-24 bg-gradient-to-r from-blue-500 to-transparent" />

            <p className="mt-6 text-sm tracking-wide text-slate-500">
              Detect. Verify. Protect.
            </p>
          </motion.div>
        </section>

        {/* ================= RIGHT SIGNUP ================= */}

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 sm:px-10">

          {/* Mobile glow */}
          <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl lg:hidden" />

          <motion.div
            className="relative z-10 w-full max-w-lg"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
            }}
          >

            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10">
                <ShieldCheck className="h-6 w-6 text-blue-400" />
              </div>

              <span className="text-xl font-bold text-text-strong">
                VoiceGuard
              </span>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-4xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                  Create your account
                </span>
              </h2>

              <p className="mt-3 text-sm text-muted">
                Set up your VoiceGuard workspace
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* NAME + ORGANIZATION */}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                <div>
                  <label
                    htmlFor="signup-name"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Full name
                  </label>

                  <input
                    id="signup-name"
                    type="text"
                    disabled={loading}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setError("");
                    }}
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full rounded-2xl border border-purple-500/30 bg-slate-950/60 px-4 py-3.5 text-sm text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-organization"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Organization
                  </label>

                  <input
                    id="signup-organization"
                    type="text"
                    disabled={loading}
                    value={organization}
                    onChange={(event) => {
                      setOrganization(event.target.value);
                      setError("");
                    }}
                    placeholder="Company / institution"
                    autoComplete="organization"
                    className="w-full rounded-2xl border border-purple-500/30 bg-slate-950/60 px-4 py-3.5 text-sm text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

              </div>

              {/* EMAIL */}

              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Work email
                </label>

                <input
                  id="signup-email"
                  type="email"
                  disabled={loading}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-purple-500/30 bg-slate-950/60 px-4 py-3.5 text-sm text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* ROLE */}

              <div>
                <label
                  htmlFor="signup-role"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Role
                </label>

                <select
                  id="signup-role"
                  disabled={loading}
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value);
                    setError("");
                  }}
                  className="w-full rounded-2xl border border-purple-500/30 bg-slate-950/60 px-4 py-3.5 text-sm text-white outline-none backdrop-blur-xl transition-all focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    Select your role
                  </option>

                  <option value="Finance / Accounts">
                    Finance / Accounts
                  </option>

                  <option value="Security / SOC">
                    Security / SOC
                  </option>

                  <option value="IT / Administrator">
                    IT / Administrator
                  </option>

                  <option value="Employee">
                    Employee
                  </option>

                  <option value="Manager">
                    Manager
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* PASSWORDS */}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* PASSWORD */}

                <div>
                  <label
                    htmlFor="signup-password"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <div className="relative">

                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      disabled={loading}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError("");
                      }}
                      placeholder="Create password (6+ chars)"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-purple-500/30 bg-slate-950/60 px-4 py-3.5 pr-12 text-sm text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
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

                {/* CONFIRM PASSWORD */}

                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Confirm password
                  </label>

                  <div className="relative">

                    <input
                      id="signup-confirm-password"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      disabled={loading}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setError("");
                      }}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-purple-500/30 bg-slate-950/60 px-4 py-3.5 pr-12 text-sm text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-600 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>

                  </div>
                </div>

              </div>

              {/* CREATE ACCOUNT */}

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 w-full overflow-hidden rounded-2xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/50 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">

                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    "Create account"
                  )}

                </span>

                <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-0" />
              </button>

            </form>

            {/* LOGIN LINK */}

            <div className="mt-7 text-center text-sm text-muted">
              Already have an account?{" "}

              <button
                type="button"
                disabled={loading}
                onClick={onGoToLogin}
                className="font-medium text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50"
              >
                Login
              </button>
            </div>

          </motion.div>
        </section>
      </div>
    </div>
  );
}

export default SignupPage;
