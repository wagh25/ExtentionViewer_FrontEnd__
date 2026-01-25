import React from "react";
import { notifyError } from "../../utils/tostify";
import { useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../../Context/userContext";  

const ProtectRoute = () => {
  const Navigate = useNavigate();
  const Location =useLocation;
  const {user, setUser} = useContext(UserContext);

  const validateTocken = async (Tocken) => {
    const response = await fetch("http://localhost:5000/validate", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Token: Tocken }),
    });
    if (response.ok) {
      let res = await response.json();
      if (res.status) {
        setUser({...user, isAuthenticated: true} );
          Navigate("/", { replace: true });
        }else{
        setUser({...user, isAuthenticated: false} );
        notifyError("You Are Not AAuthorized");
        Navigate("/login", { replace: true });
      }
    }
  };

  React.useEffect(() => {
    if (localStorage.getItem("Tocken") && user.isAuthenticated) {
      validateTocken(localStorage.getItem("Tocken"));
    } else {
      notifyError("You Are Not Authenticated Yet!");
      Navigate("/login", { replace: true });
    }
  }, []);
  return null;
};

export default ProtectRoute;
