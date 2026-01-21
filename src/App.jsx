import Home from "./components/Home";
import { Routes, Route } from "react-router-dom";
import Forms from "./components/Admin/Forms";
import Authentication from "./components/Authentication/Authentication";

function App() {
  return (
    <>
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
