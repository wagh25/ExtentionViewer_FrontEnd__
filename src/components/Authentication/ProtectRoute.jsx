import React from "react";
import { notifyError } from "../../utils/tostify";
import { useLocation, useNavigate } from "react-router-dom";


const ProtectRoute = ({ setIsAuthenticated }) => {
  const Navigate = useNavigate();
  const Location =useLocation

  const validateTocken = async (Tocken) => {
    const response = await fetch("http://localhost:5000/validate", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Token: Tocken }),
    });
    if (response.ok) {
      let res = await response.json();
      if (res.status) {
        setIsAuthenticated(true);
        if(Location.pathname==="/login" || Location.pathname==="/signup"){
          Navigate("/", { replace: true });
        }
      }
    }
  };

  React.useEffect(() => {
    if (localStorage.getItem("Tocken")) {
      validateTocken(localStorage.getItem("Tocken"));
    } else {
      notifyError("Please Login First");
      Navigate("/login", { replace: true });
    }
  }, []);
  return null;
};

export default ProtectRoute;
