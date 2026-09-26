import React from "react";
import { motion } from "framer-motion";
import { FaMicrophone, FaRobot, FaVolumeUp, FaTimes } from "react-icons/fa";

const JarvisOrb = ({
  isListening,
  speechText,
  jarvisStatus,
  onToggleListen,
  onClose
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className="glass-panel p-5 rounded-3xl border border-indigo-500/40 shadow-2xl shadow-indigo-500/30 max-w-sm w-full backdrop-blur-xl relative"
    >
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Header Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-widest">
          <FaRobot className="animate-spin text-indigo-400" /> Jarvis AI Voice Assistant
        </span>
      </div>

      {/* Central Animated Orb */}
      <div className="flex items-center gap-4 my-2">
        <div className="relative flex items-center justify-center">
          {/* Pulse Rings */}
          {isListening && (
            <>
              <span className="absolute w-16 h-16 rounded-full bg-indigo-500/30 animate-ping" />
              <span className="absolute w-20 h-20 rounded-full bg-purple-500/20 animate-pulse" />
            </>
          )}

          {/* Orb Core */}
          <button
            onClick={onToggleListen}
            title={isListening ? "Listening... Click to stop" : "Click to activate Jarvis"}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg transition-all duration-300 relative z-10 ${
              isListening
                ? "bg-gradient-to-tr from-red-500 via-purple-600 to-indigo-600 shadow-indigo-500/50 scale-105"
                : "bg-gradient-to-tr from-indigo-600 to-purple-600 hover:scale-105 shadow-indigo-600/30"
            }`}
          >
            <FaMicrophone className={isListening ? "animate-bounce" : ""} />
          </button>
        </div>

        {/* Status Speech Text */}
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white tracking-wide">
            {isListening ? "Listening..." : "Jarvis Ready"}
          </h4>
          <p className="text-xs text-indigo-300 font-medium leading-snug mt-0.5 line-clamp-2">
            {jarvisStatus || (isListening ? "Say 'Hey Jarvis call Manish'..." : "Tap mic to give voice command.")}
          </p>
        </div>
      </div>

      {/* Recognized Voice Command Banner */}
      {speechText && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
          <FaVolumeUp className="text-indigo-400 shrink-0" />
          <span className="truncate italic">"{speechText}"</span>
        </div>
      )}
    </motion.div>
  );
};

export default JarvisOrb;
