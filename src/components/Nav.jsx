import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { socket } from "../Services/socket.io";
import { useUserContext } from "../Context/UserProvider";
import { notifyError } from "../utils/tostify";
import { FaPhoneAlt, FaComments, FaUserCheck, FaUserPlus, FaSignOutAlt, FaUserShield } from "react-icons/fa";

const Nav = (props) => {
  const { user, setUser } = useUserContext();
  const navigate = useNavigate();
  const admin = user.userType === "admin";

  const logoutUser = async () => {
    try {
      let response = await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Token: localStorage.getItem("Tocken"),
          email: user.email,
        }),
      });
      let data = await response.json();
      if (data.status) {
        localStorage.removeItem("Tocken");
        localStorage.removeItem("user");
        socket.disconnect();
        setUser({ name: "", email: "", isAuthenticated: false });
        navigate("/login", { replace: true });
      } else {
        notifyError("Logout Failed. Try Again!");
      }
    } catch (e) {
      console.error("Logout Error:", e);
      notifyError("Error Occured During Logout");
    }
  };

  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
              <FaPhoneAlt className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent tracking-tight">
                ExtentionViewer
              </span>
              <span className="block text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">
                RTC Connect
              </span>
            </div>
          </Link>

          {/* Menu Items */}
          <div className="flex items-center gap-4">
            {!user?.isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all"
                >
                  Login to Call & Chat
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Profile Pill */}
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                    props.active === "Home"
                      ? "bg-slate-800/80 border-indigo-500/50 text-indigo-300"
                      : "border-slate-700/50 text-slate-300 hover:bg-slate-800/40 hover:text-white"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">{user.name || "User"}</span>
                  {admin && (
                    <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold border border-amber-500/30 uppercase tracking-wider">
                      <FaUserShield className="w-2.5 h-2.5" /> Admin
                    </span>
                  )}
                </Link>

                {/* Admin Action Button */}
                {admin && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                      props.active === "Add"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                        : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white border border-slate-700/50"
                    }`}
                  >
                    <FaUserPlus className="w-3.5 h-3.5" />
                    <span>Add User</span>
                  </Link>
                )}

                {/* Logout Button */}
                <button
                  onClick={logoutUser}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-sm font-medium transition-all duration-200"
                >
                  <FaSignOutAlt className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Nav;

