import React from "react";
import { notifyError } from "../../utils/tostify";
import { useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { useUserContext } from "../../Context/UserProvider";

const ProtectRoute = ({ children }) => {
  const Navigate = useNavigate();
  const Location = useLocation();
  const { user, setUser } = useUserContext();

  const validateTocken = async (Tocken) => {
    const response = await fetch("http://localhost:5000/auth/validate", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Token: Tocken }),
    });
    if (response.ok) {
      let res = await response.json();
      if (!res.status) {
        if (Location.pathname != "/login") {
          notifyError("You Are Not Authorized");
          Navigate("/login", { replace: true });
        }
      } else {
        if (Location.pathname === "/login") {
          Navigate("/", { replace: true });
        }
      }
    }
  };

  React.useEffect(() => {
    const token = localStorage.getItem("Tocken");
    const isAuthenticated = user.isAuthenticated;

    // console.log("token", token, "isAuthenticated", isAuthenticated);

    if (isAuthenticated === undefined) {
      Navigate("/login", { replace: true });
      return;
    }

    if (token && isAuthenticated) {
      validateTocken(token);
    } else if (!token || isAuthenticated == false) {
      notifyError("You Are Not Authenticated !");
      Navigate("/login", { replace: true });
    }
  }, [user.isAuthenticated, Location.pathname]);

  return children;
};

export default ProtectRoute;
