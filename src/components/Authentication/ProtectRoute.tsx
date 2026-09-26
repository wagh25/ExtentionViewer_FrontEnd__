import React, { useEffect, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserContext } from "../../Context/UserProvider";
import { notifyError } from "../../utils/tostify";

interface ProtectRouteProps {
  children: ReactNode;
}

const ProtectRoute: React.FC<ProtectRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserContext();

  const validateToken = async (token: string) => {
    try {
      const response = await fetch("http://localhost:5000/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Token: token }),
      });
      if (response.ok) {
        const res = await response.json();
        if (!res.status) {
          if (location.pathname !== "/login") {
            notifyError("Session Expired Please Login Again!");
            navigate("/login", { replace: true });
          }
        } else {
          if (location.pathname === "/login") {
            navigate("/", { replace: true });
          }
        }
      }
    } catch (err) {
      console.error("Token validation error:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("Tocken");
    const isAuthenticated = user.isAuthenticated;

    if (isAuthenticated === undefined) {
      navigate("/login", { replace: true });
      return;
    }

    if (token && isAuthenticated) {
      validateToken(token);
    } else if (!token || isAuthenticated === false) {
      notifyError("Please Login!");
      navigate("/login", { replace: true });
    }
  }, [user.isAuthenticated, location.pathname]);

  return <>{children}</>;
};

export default ProtectRoute;
