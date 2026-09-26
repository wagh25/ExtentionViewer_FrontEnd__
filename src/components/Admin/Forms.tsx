import React, { useState, FormEvent } from "react";
import Nav from "../Nav";
import { notifyError, notifySuccess } from "../../utils/tostify";
import { motion } from "framer-motion";
import { FaUserPlus, FaUser, FaEnvelope, FaLock, FaPhoneAlt, FaCheckCircle } from "react-icons/fa";

interface FormsProps {}

const Forms: React.FC<FormsProps> = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");

    try {
      const target = e.target as typeof e.target & {
        name: { value: string };
        lastName: { value: string };
        email: { value: string };
        password: { value: string };
        ConfirmPassword: { value: string };
        number: { value: string };
        reset: () => void;
      };

      const payload = {
        name: target.name.value,
        lastName: target.lastName.value,
        email: target.email.value,
        password: target.password.value,
        ConfirmPassword: target.ConfirmPassword.value,
        number: target.number.value,
      };

      const response = await fetch("http://localhost:5000/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.status) {
        notifySuccess(data.message || "User added successfully");
        setSuccessMsg(data.message || "User extension added successfully!");
        target.reset();
      } else {
        notifyError(data.message || "Failed to add user");
      }
    } catch (err) {
      console.error(err);
      notifyError("Connection error while adding user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Nav active="Add" />

      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl mx-auto mb-3">
              <FaUserPlus />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Add New User Extension
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Create an extension user account with a unique 4-digit number
            </p>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-semibold">
              <FaCheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <FaUser className="absolute left-3.5 top-3.5 text-slate-500 text-xs" />
                <input
                  name="name"
                  type="text"
                  placeholder="First Name"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs"
                  required
                />
              </div>
              <div className="relative">
                <FaUser className="absolute left-3.5 top-3.5 text-slate-500 text-xs" />
                <input
                  name="lastName"
                  type="text"
                  placeholder="Last Name"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <FaEnvelope className="absolute left-3.5 top-3.5 text-slate-500 text-xs" />
              <input
                name="email"
                type="email"
                placeholder="User Email Address"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs"
                required
              />
            </div>

            <div className="relative">
              <FaPhoneAlt className="absolute left-3.5 top-3.5 text-slate-500 text-xs" />
              <input
                name="number"
                type="text"
                maxLength={4}
                placeholder="4-Digit Extension Number (e.g. 1001)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs font-mono"
                required
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-3.5 top-3.5 text-slate-500 text-xs" />
              <input
                name="password"
                type="password"
                placeholder="Account Password"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs"
                required
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-3.5 top-3.5 text-slate-500 text-xs" />
              <input
                name="ConfirmPassword"
                type="password"
                placeholder="Confirm Password"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all duration-200 mt-2"
            >
              {loading ? "Adding User..." : "Add User Extension"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Forms;
