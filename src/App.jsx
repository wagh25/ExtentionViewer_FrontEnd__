import Home from "./components/Home";
import React from "react";
import { Routes, Route } from "react-router-dom";
import Forms from "./components/Admin/Forms";
import Authentication from "./components/Authentication/Authentication";
import ProtectRoute from "./components/Authentication/protectRoute";  
function App() {
  return (
    <>
    <ProtectRoute/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Authentication Action="Login" />} />
        <Route path="/signup" element={<Authentication Action="Signup" />} />
        <Route path="/admin" element={<Forms Action="Add" />} />
        <Route path="/admin/update" element={<Forms Action="Update" />} />
        <Route path="/admin/delete" element={<Forms Action="Delete" />} />
      </Routes>
     
    </>
  );
}

export default App;
