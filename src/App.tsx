import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Forms from "./components/Admin/Forms";
import Authentication from "./components/Authentication/Authentication";
import ProtectRoute from "./components/Authentication/ProtectRoute";
import Call from "./components/Call";
import Chat from "./components/Chat";

const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <ProtectRoute>
              <Authentication Action="Login" />
            </ProtectRoute>
          }
        />
        <Route path="/signup" element={<Authentication Action="Signup" />} />
        <Route
          path="/admin"
          element={
            <ProtectRoute>
              <Forms Action="Add" />
            </ProtectRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectRoute>
              <Chat />
            </ProtectRoute>
          }
        />
        <Route
          path="/call"
          element={
            <ProtectRoute>
              <Call />
            </ProtectRoute>
          }
        />
        <Route
          path="*"
          element={
            <h1 className="text-center mt-20 text-3xl font-bold text-white">
              404 Not Found
            </h1>
          }
        />
      </Routes>
    </>
  );
};

export default App;
