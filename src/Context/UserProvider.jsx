import React, { use } from "react";
import { useState, useEffect } from "react";
import { createContext, useContext } from "react";

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [user, setUser] = useState({ name: "", email: "" });

  useEffect(() => {
    // On mount, check if there's a token in localStorage
    const token = localStorage.getItem("Tocken");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      // Restore user from localStorage
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    // Save user to localStorage whenever it changes
    if (user.isAuthenticated) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

  return (
    <div>
      <UserContext.Provider value={{ user, setUser }}>
        {children}
      </UserContext.Provider>
    </div>
  );
};

export const useUserContext = () => useContext(UserContext);

export default UserProvider;
