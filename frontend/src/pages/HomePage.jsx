// # HomePage.jsx
// # TODO: Audio upload UI
// #       - File input (accept audio/*)
// #       - "Analyze" button → POST multipart/form-data to backend /analyze
// #       - Show "Analyzing..." spinner while waiting
// #       - On response, navigate to ResultPage with result data


// function HomePage() {
//   return (
//     <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
//       <div className="text-center">
//         <h1 className="text-4xl font-bold text-blue-400">
//           VoiceGuard
//         </h1>

//         <p className="mt-3 text-slate-400">
//           HomePage is working.
//         </p>
//       </div>
//     </div>
//   );
// }

// export default HomePage;
// ==========================================================

function HomePage({ onLogout }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-8 py-4">

        <h1 className="text-xl font-bold text-blue-400">
          VoiceGuard
        </h1>

        <button
          onClick={onLogout}
          className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20"
        >
          Logout
        </button>

      </header>

      {/* Home content */}
      <main className="flex min-h-[calc(100vh-73px)] items-center justify-center">

        <div className="text-center">

          <h2 className="text-4xl font-bold text-blue-400">
            VoiceGuard
          </h2>

          <p className="mt-3 text-slate-400">
            HomePage is working.
          </p>

        </div>

      </main>

    </div>
  );
}

export default HomePage;

// ==========================================================


// import { useRef, useState } from "react";
// import {
//   Activity,
//   CheckCircle2,
//   FileAudio,
//   Mic,
//   Shield,
//   Upload,
//   AlertTriangle,
//   XCircle,
// } from "lucide-react";
// import { motion } from "framer-motion";

// function HomePage() {
//   const fileInputRef = useRef(null);

//   const [selectedFile, setSelectedFile] = useState(null);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState("");

//   /*
//    * Handle audio selection
//    */
//   const handleFileChange = (event) => {
//     const file = event.target.files?.[0];

//     if (!file) {
//       return;
//     }

//     if (!file.type.startsWith("audio/")) {
//       setError("Please select a valid audio file.");
//       setSelectedFile(null);
//       return;
//     }

//     setError("");
//     setSelectedFile(file);
//     setResult(null);
//   };

//   /*
//    * Analyze button
//    *
//    * TEMPORARY:
//    * We use a 5-second timeout to simulate analysis.
//    *
//    * Later this will be replaced with:
//    *
//    * POST /analyze
//    *
//    * to your FastAPI backend.
//    */
//   const handleAnalyze = () => {
//     if (!selectedFile) {
//       setError("Please select an audio file first.");
//       return;
//     }

//     setError("");
//     setResult(null);
//     setIsAnalyzing(true);

//     setTimeout(() => {
//       /*
//        * Demo result.
//        * This will later come from the backend.
//        */
//       setResult({
//         risk_score: 82,
//         risk_level: "high",

//         dsp: {
//           pitch_variance: "high",
//           spectral_anomaly: "medium",
//           phase_irregularity: "high",
//           timing_pattern: "medium",
//         },

//         explanation:
//           "The audio shows multiple characteristics associated with synthetic or cloned speech. The acoustic patterns and phase irregularities indicate a high likelihood of AI-generated voice content.",
//       });

//       setIsAnalyzing(false);
//     }, 5000);
//   };

//   /*
//    * Remove selected file
//    */
//   const handleRemoveFile = () => {
//     setSelectedFile(null);
//     setResult(null);
//     setError("");

//     if (fileInputRef.current) {
//       fileInputRef.current.value = "";
//     }
//   };

//   /*
//    * Risk color helper
//    */
//   const getRiskStyles = (level) => {
//     switch (level) {
//       case "low":
//         return {
//           text: "text-emerald-400",
//           bg: "bg-emerald-500/10",
//           border: "border-emerald-500/30",
//           icon: CheckCircle2,
//         };

//       case "medium":
//         return {
//           text: "text-amber-400",
//           bg: "bg-amber-500/10",
//           border: "border-amber-500/30",
//           icon: AlertTriangle,
//         };

//       case "high":
//       default:
//         return {
//           text: "text-red-400",
//           bg: "bg-red-500/10",
//           border: "border-red-500/30",
//           icon: XCircle,
//         };
//     }
//   };

//   /*
//    * DSP flag color helper
//    */
//   const getFlagStyles = (value) => {
//     switch (value) {
//       case "low":
//         return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";

//       case "medium":
//         return "border-amber-500/30 bg-amber-500/10 text-amber-400";

//       case "high":
//         return "border-red-500/30 bg-red-500/10 text-red-400";

//       default:
//         return "border-slate-500/30 bg-slate-500/10 text-slate-400";
//     }
//   };

//   const riskStyles = result
//     ? getRiskStyles(result.risk_level)
//     : null;

//   const RiskIcon = riskStyles?.icon;

//   return (
//     <div className="relative min-h-screen overflow-hidden bg-background text-text">

//       {/* =========================================
//           Background glows
//           ========================================= */}

//       <div className="pointer-events-none absolute -left-48 top-20 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-3xl" />

//       <div className="pointer-events-none absolute -right-48 bottom-0 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-3xl" />

//       {/* =========================================
//           Main container
//           ========================================= */}

//       <div className="relative z-10 mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-10">

//         {/* =========================================
//             Header
//             ========================================= */}

//         <header className="mb-10 flex items-center justify-between">

//           <div className="flex items-center gap-3">

//             <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 shadow-glass">
//               <Shield className="h-6 w-6 text-blue-400" />
//             </div>

//             <div>
//               <h1 className="text-xl font-bold tracking-tight text-text-strong">
//                 VoiceGuard
//               </h1>

//               <p className="text-xs text-muted">
//                 Voice Integrity Platform
//               </p>
//             </div>

//           </div>

//           <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-400 sm:flex">
//             <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
//             System ready
//           </div>

//         </header>

//         {/* =========================================
//             Page heading
//             ========================================= */}

//         <div className="mb-8">

//           <div className="mb-3 flex items-center gap-2 text-sm text-blue-400">
//             <Activity className="h-4 w-4" />
//             AI Voice Analysis
//           </div>

//           <h2 className="text-3xl font-bold tracking-tight text-text-strong sm:text-4xl">
//             Analyze a voice recording
//           </h2>

//           <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
//             Upload an audio recording to detect potential AI-generated
//             or cloned voice impersonation.
//           </p>

//         </div>

//         {/* =========================================
//             Main two-column layout
//             ========================================= */}

//         <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">

//           {/* =======================================
//               LEFT — Upload Card
//               ======================================= */}

//           <motion.section
//             className="relative overflow-hidden rounded-2xl border border-line bg-panel p-6 shadow-glass backdrop-blur-md sm:p-8"
//             initial={{ opacity: 0, y: 15 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.4 }}
//           >

//             {/* Inner glow */}

//             <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

//             <div className="relative">

//               <div className="mb-6">

//                 <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
//                   Step 01
//                 </p>

//                 <h3 className="mt-2 text-xl font-semibold text-text-strong">
//                   Upload audio
//                 </h3>

//                 <p className="mt-2 text-sm text-muted">
//                   Select an audio recording for voice integrity analysis.
//                 </p>

//               </div>

//               {/* Upload area */}

//               <button
//                 type="button"
//                 onClick={() => fileInputRef.current?.click()}
//                 className="group flex min-h-[270px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-blue-500/30 bg-slate-950/40 px-6 text-center transition-all duration-300 hover:border-blue-400/60 hover:bg-blue-500/5"
//               >

//                 <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 transition-all group-hover:scale-105 group-hover:bg-blue-500/15">
//                   {selectedFile ? (
//                     <FileAudio className="h-8 w-8 text-blue-400" />
//                   ) : (
//                     <Upload className="h-8 w-8 text-blue-400" />
//                   )}
//                 </div>

//                 {selectedFile ? (
//                   <>
//                     <p className="max-w-full truncate text-sm font-medium text-text-strong">
//                       {selectedFile.name}
//                     </p>

//                     <p className="mt-2 text-xs text-muted">
//                       {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
//                     </p>

//                     <p className="mt-4 text-xs text-blue-400">
//                       Click to choose another file
//                     </p>
//                   </>
//                 ) : (
//                   <>
//                     <p className="text-sm font-medium text-text-strong">
//                       Choose an audio file
//                     </p>

//                     <p className="mt-2 text-xs text-muted">
//                       MP3, WAV, M4A and other audio formats
//                     </p>

//                     <p className="mt-4 text-xs text-blue-400">
//                       Click to browse files
//                     </p>
//                   </>
//                 )}

//               </button>

//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="audio/*"
//                 onChange={handleFileChange}
//                 className="hidden"
//               />

//               {/* Error */}

//               {error && (
//                 <motion.div
//                   initial={{ opacity: 0, y: -5 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
//                 >
//                   {error}
//                 </motion.div>
//               )}

//               {/* Selected file */}

//               {selectedFile && !isAnalyzing && (
//                 <button
//                   type="button"
//                   onClick={handleRemoveFile}
//                   className="mt-4 text-xs text-slate-500 transition-colors hover:text-red-400"
//                 >
//                   Remove selected file
//                 </button>
//               )}

//               {/* Analyze button */}

//               <button
//                 type="button"
//                 onClick={handleAnalyze}
//                 disabled={!selectedFile || isAnalyzing}
//                 className="group relative mt-6 w-full overflow-hidden rounded-xl border border-blue-400/30 bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/50 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
//               >

//                 <span className="relative z-10 flex items-center justify-center gap-2">

//                   {isAnalyzing ? (
//                     <>
//                       <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
//                       Analyzing voice...
//                     </>
//                   ) : (
//                     <>
//                       <Mic className="h-4 w-4" />
//                       Analyze audio
//                     </>
//                   )}

//                 </span>

//                 <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-0" />

//               </button>

//               {/* Analysis status */}

//               {isAnalyzing && (
//                 <motion.div
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"
//                 >

//                   <div className="flex items-center gap-3">

//                     <Activity className="h-4 w-4 animate-pulse text-blue-400" />

//                     <div>
//                       <p className="text-xs font-medium text-blue-300">
//                         Analyzing audio
//                       </p>

//                       <p className="mt-1 text-xs text-muted">
//                         Checking acoustic, spectral and timing patterns...
//                       </p>
//                     </div>

//                   </div>

//                 </motion.div>
//               )}

//             </div>

//           </motion.section>

//           {/* =======================================
//               RIGHT — Analysis Result
//               ======================================= */}

//           <motion.section
//             className="relative overflow-hidden rounded-2xl border border-line bg-panel p-6 shadow-glass backdrop-blur-md sm:p-8"
//             initial={{ opacity: 0, y: 15 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.4, delay: 0.08 }}
//           >

//             <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

//             <div className="relative">

//               {/* Result heading */}

//               <div className="mb-7">

//                 <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
//                   Step 02
//                 </p>

//                 <h3 className="mt-2 text-xl font-semibold text-text-strong">
//                   Analysis result
//                 </h3>

//                 <p className="mt-2 text-sm text-muted">
//                   Voice authenticity assessment and supporting evidence.
//                 </p>

//               </div>

//               {/* Empty state */}

//               {!result && !isAnalyzing && (
//                 <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-950/30 px-6 text-center">

//                   <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70">
//                     <Activity className="h-7 w-7 text-slate-600" />
//                   </div>

//                   <h4 className="mt-5 text-sm font-semibold text-slate-300">
//                     No analysis yet
//                   </h4>

//                   <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
//                     Upload an audio file and click "Analyze audio"
//                     to see the voice integrity assessment here.
//                   </p>

//                 </div>
//               )}

//               {/* Analyzing state */}

//               {isAnalyzing && (
//                 <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/5 px-6 text-center">

//                   <div className="relative flex h-20 w-20 items-center justify-center">

//                     <div className="absolute inset-0 animate-ping rounded-full border border-blue-500/20" />

//                     <div className="flex h-16 w-16 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
//                       <Activity className="h-7 w-7 animate-pulse text-blue-400" />
//                     </div>

//                   </div>

//                   <h4 className="mt-6 text-base font-semibold text-text-strong">
//                     Analyzing voice...
//                   </h4>

//                   <p className="mt-2 text-xs text-muted">
//                     Our AI is examining the audio signal.
//                   </p>

//                   <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800">
//                     <motion.div
//                       className="h-full rounded-full bg-linear-to-r from-blue-500 to-indigo-500"
//                       initial={{ width: "0%" }}
//                       animate={{ width: "100%" }}
//                       transition={{ duration: 5, ease: "linear" }}
//                     />
//                   </div>

//                 </div>
//               )}

//               {/* ===================================
//                   RESULT
//                   =================================== */}

//               {result && !isAnalyzing && (
//                 <motion.div
//                   initial={{ opacity: 0, y: 15 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.4 }}
//                   className="space-y-5"
//                 >

//                   {/* Risk score */}

//                   <div
//                     className={`rounded-2xl border ${riskStyles.border} ${riskStyles.bg} p-6`}
//                   >

//                     <div className="flex items-start justify-between gap-4">

//                       <div>

//                         <p className="text-xs uppercase tracking-widest text-muted">
//                           Impersonation risk
//                         </p>

//                         <div className="mt-3 flex items-baseline gap-2">

//                           <span className="text-5xl font-bold tracking-tight text-text-strong">
//                             {result.risk_score}
//                           </span>

//                           <span className="text-sm text-muted">
//                             / 100
//                           </span>

//                         </div>

//                       </div>

//                       <div
//                         className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase ${riskStyles.border} ${riskStyles.bg} ${riskStyles.text}`}
//                       >
//                         {RiskIcon && (
//                           <RiskIcon className="h-4 w-4" />
//                         )}

//                         {result.risk_level} risk
//                       </div>

//                     </div>

//                     {/* Risk bar */}

//                     <div className="mt-6">

//                       <div className="h-2 overflow-hidden rounded-full bg-slate-800">

//                         <motion.div
//                           className={`h-full rounded-full ${
//                             result.risk_level === "low"
//                               ? "bg-emerald-400"
//                               : result.risk_level === "medium"
//                                 ? "bg-amber-400"
//                                 : "bg-red-400"
//                           }`}
//                           initial={{ width: 0 }}
//                           animate={{
//                             width: `${result.risk_score}%`,
//                           }}
//                           transition={{
//                             duration: 0.8,
//                             ease: "easeOut",
//                           }}
//                         />

//                       </div>

//                     </div>

//                   </div>

//                   {/* DSP flags */}

//                   <div className="rounded-2xl border border-line bg-slate-950/30 p-5">

//                     <div className="mb-4">

//                       <h4 className="text-sm font-semibold text-text-strong">
//                         DSP signal analysis
//                       </h4>

//                       <p className="mt-1 text-xs text-muted">
//                         Detected acoustic and behavioral indicators.
//                       </p>

//                     </div>

//                     <div className="grid grid-cols-2 gap-3">

//                       {Object.entries(result.dsp).map(
//                         ([name, value]) => (
//                           <div
//                             key={name}
//                             className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
//                           >

//                             <p className="text-xs capitalize text-slate-400">
//                               {name.replaceAll("_", " ")}
//                             </p>

//                             <span
//                               className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${getFlagStyles(value)}`}
//                             >
//                               {value}
//                             </span>

//                           </div>
//                         )
//                       )}

//                     </div>

//                   </div>

//                   {/* LLM explanation */}

//                   <div className="rounded-2xl border border-line bg-slate-950/30 p-5">

//                     <div className="mb-3 flex items-center gap-2">

//                       <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
//                         <Shield className="h-4 w-4 text-blue-400" />
//                       </div>

//                       <div>

//                         <h4 className="text-sm font-semibold text-text-strong">
//                           AI assessment
//                         </h4>

//                         <p className="text-[11px] text-muted">
//                           LLM evidence analysis
//                         </p>

//                       </div>

//                     </div>

//                     <p className="text-sm leading-6 text-slate-300">
//                       {result.explanation}
//                     </p>

//                   </div>

//                   {/* New analysis */}

//                   <button
//                     type="button"
//                     onClick={() => {
//                       setResult(null);
//                       setSelectedFile(null);

//                       if (fileInputRef.current) {
//                         fileInputRef.current.value = "";
//                       }
//                     }}
//                     className="w-full rounded-xl border border-line bg-slate-900/40 px-4 py-3 text-sm font-medium text-slate-300 transition-all hover:border-line-strong hover:bg-panel-strong hover:text-white"
//                   >
//                     Analyze another recording
//                   </button>

//                 </motion.div>
//               )}

//             </div>

//           </motion.section>

//         </div>

//         {/* =========================================
//             Footer
//             ========================================= */}

//         <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-800/60 pt-5 text-xs text-slate-600 sm:flex-row">

//           <p>
//             VoiceGuard • AI-powered voice integrity verification
//           </p>

//           <p>
//             Audio is processed securely for analysis.
//           </p>

//         </footer>

//       </div>
//     </div>
//   );
// }

// export default HomePage;