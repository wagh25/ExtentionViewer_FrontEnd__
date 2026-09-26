import React, { useState, useEffect } from "react";
import Nav from "../Nav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { notifyError, notifySuccess } from "../../utils/tostify";
import { useUserContext } from "../../Context/UserProvider";
import { socket } from "../../Services/socket.io";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock, FaUser, FaPhoneAlt, FaSignInAlt, FaUserPlus, FaPhoneVolume } from "react-icons/fa";

const Authentication = (props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useUserContext();
  const [loading, setLoading] = useState(false);

  const inviteFrom = searchParams.get("inviteFrom");
  const callerName = searchParams.get("callerName");
  const actionNotice = searchParams.get("actionNotice");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = e.target.email.value;
      const password = e.target.password.value;

      let payload = {
        email,
        password,
        ...(props.Action === "Signup" && {
          name: e.target.name.value,
          lastName: e.target.lastName.value,
          ConfirmPassword: e.target.ConfirmPassword.value,
          number: e.target.number.value,
        }),
      };

      let response = await fetch(
        `http://localhost:5000/auth/${props.Action.toLowerCase()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();

      if (data.status && props.Action === "Login") {
        socket.connect();
        socket.emit("registerUser", data.email);

        const userData = {
          isAuthenticated: true,
          name: data.name,
          userType: data.userType,
          email: data.email,
        };
        localStorage.setItem("Tocken", data.Tocken);
        localStorage.setItem("user", JSON.stringify(userData));

        if (inviteFrom) {
          localStorage.setItem("autoOpenContactEmail", inviteFrom);
        }

        setUser(userData);
        notifySuccess("Logged in successfully");
        navigate("/", { replace: true });
      } else if (data.status && props.Action === "Signup") {
        notifySuccess(data.message || "Signed up successfully");
        navigate("/login", { replace: true });
      } else {
        notifyError(data.message || "Authentication failed");
      }
    } catch (e) {
      console.error(e);
      notifyError("Connection error. Make sure backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Nav active={props.Action} />

      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10"
        >
          {/* Call Invite Banner if arrived via notification */}
          {(inviteFrom || actionNotice) && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/40 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-sm mb-1">
                <FaPhoneVolume className="animate-bounce text-emerald-400" />
                <span>Call Invite Received</span>
              </div>
              <p className="text-xs text-slate-200">
                {callerName ? `${callerName} invited you to join a call!` : "You must log in to view call invites & messages."} Log in below to connect instantly.
              </p>
            </div>
          )}

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl mx-auto mb-3">
              {props.Action === "Login" ? <FaSignInAlt /> : <FaUserPlus />}
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {props.Action === "Login" ? "Welcome Back" : "Create an Account"}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              {props.Action === "Login"
                ? "Enter your extension account credentials to continue"
                : "Register a new user extension"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {props.Action === "Signup" && (
              <>
                <div className="relative">
                  <FaUser className="absolute left-4 top-3.5 text-slate-500 text-sm" />
                  <input
                    name="name"
                    type="text"
                    placeholder="First Name"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                    required
                  />
                </div>
                <div className="relative">
                  <FaUser className="absolute left-4 top-3.5 text-slate-500 text-sm" />
                  <input
                    name="lastName"
                    type="text"
                    placeholder="Last Name"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                    required
                  />
                </div>
              </>
            )}

            <div className="relative">
              <FaEnvelope className="absolute left-4 top-3.5 text-slate-500 text-sm" />
              <input
                name="email"
                type="email"
                placeholder="Email Address"
                className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                required
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-4 top-3.5 text-slate-500 text-sm" />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                required
              />
            </div>

            {props.Action === "Signup" && (
              <>
                <div className="relative">
                  <FaLock className="absolute left-4 top-3.5 text-slate-500 text-sm" />
                  <input
                    name="ConfirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                    required
                  />
                </div>
                <div className="relative">
                  <FaPhoneAlt className="absolute left-4 top-3.5 text-slate-500 text-sm" />
                  <input
                    name="number"
                    type="text"
                    placeholder="4-Digit Extension Number"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                    required
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 mt-2"
            >
              {loading ? "Processing..." : props.Action}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Authentication;

