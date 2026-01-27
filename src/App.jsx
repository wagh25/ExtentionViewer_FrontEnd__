import Home from "./components/Home";
import React from "react";
import { Routes, Route } from "react-router-dom";
import Forms from "./components/Admin/Forms";
import Authentication from "./components/Authentication/Authentication";
import ProtectRoute from "./components/Authentication/ProtectRoute";  
function App() {
  return (
    <>
    {/* <ProtectRoute/> */}
      <Routes>
        
        <Route path="/" element={<ProtectRoute><Home /></ProtectRoute>} />
        <Route path="/login" element={<ProtectRoute><Authentication Action="Login" /></ProtectRoute>} />
        <Route path="/signup" element={<Authentication Action="Signup" />} />
        <Route path="/admin" element={<ProtectRoute><Forms Action="Add" /></ProtectRoute>} />
        <Route path="/admin/update" element={<ProtectRoute><Forms Action="Update" /></ProtectRoute>} />
        <Route path="/admin/delete" element={<ProtectRoute><Forms Action="Delete" /></ProtectRoute>} />

        <Route path="*" element={<h1 className="text-center mt-20 text-3xl font-bold">404 Not Found</h1>} />
      </Routes>
     
    </>
  );
}

export default App;
