import React from "react";
import { notifyError } from "../../utils/tostify";
import { useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../../Context/userContext";  

const ProtectRoute = ({ children }) => {
  const Navigate = useNavigate();
  const Location = useLocation();
  const { user } = useContext(UserContext);

  const validateTocken = async (Tocken) => {
    const response = await fetch("http://localhost:5000/auth/validate", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Token: Tocken }),
    });
    if (response.ok) {
      let res = await response.json();
      if (!res.status) {
        notifyError("You Are Not Authorized");
        Navigate("/login", { replace: true });
      }
    }
  };

  React.useEffect(() => {
    const token = localStorage.getItem("Tocken");
    const isAuthenticated = user.isAuthenticated;
    
    console.log('token', token, "isAuthenticated", isAuthenticated);
    
    if (token && isAuthenticated) {
      if (Location.pathname === "/login" || Location.pathname === "/signup") {
        Navigate("/", { replace: true });
      }
      validateTocken(token);
    } else if (!token || isAuthenticated == false) {
      notifyError("You Are Not Authenticated Yet!");
      Navigate("/login", { replace: true });
    }
  }, [user.isAuthenticated, Location.pathname]);
  
  
  
  return children;
};

export default ProtectRoute;
