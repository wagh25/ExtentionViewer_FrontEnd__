import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import UserProvider from "./Context/UserProvider.jsx";
import { PeerProvider } from "./Context/PeerContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <PeerProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </PeerProvider>
    <ToastContainer />
  </BrowserRouter>,
);
