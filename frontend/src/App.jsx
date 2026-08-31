import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomePage from "./pages/HomePage";

function App() {
  const [currentPage, setCurrentPage] = useState("login");

  const handleLogin = (userData) => {
    console.log("Login successful:", userData);
    setCurrentPage("home");
  };

  const handleSignup = (userData) => {
    console.log("Signup successful:", userData);
    setCurrentPage("login");
  };

    // Logout function -------------------------
  const handleLogout = () => {
    console.log("User logged out");
    setCurrentPage("login");
  };

  return (
    <>
      {currentPage === "login" && (
        <LoginPage
          onLogin={handleLogin}
          onGoToSignup={() => setCurrentPage("signup")}
        />
      )}

      {currentPage === "signup" && (
        <SignupPage
          onSignup={handleSignup}
          onGoToLogin={() => setCurrentPage("login")}
        />
      )}

      {currentPage === "home" && <HomePage onLogout={handleLogout} />}
    </>
  );
}

export default App;