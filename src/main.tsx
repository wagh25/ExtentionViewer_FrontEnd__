import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import UserProvider from "./Context/UserProvider";
import { PeerProvider } from "./Context/PeerContext";
import { ChatProvider } from "./Context/ChatContext";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(
  <BrowserRouter>
    <PeerProvider>
      <UserProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </UserProvider>
    </PeerProvider>
    <ToastContainer />
  </BrowserRouter>,
);
