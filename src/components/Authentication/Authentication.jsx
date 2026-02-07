import React from "react";
import Nav from "../nav";
import { useNavigate } from "react-router-dom";
import { notifyError, notifySuccess } from "../../utils/tostify";
import { useContext } from "react";
import { UserContext } from "../../Context/userContext";
import { socket } from "../../Services/socket.io";

const Authentication = (props) => {
  const Navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let payload = {
        ...(props.Action == "Signup"
          ? {
              name: e.target[0].value,
              lastName: e.target[1].value,
              email: e.target[2].value,
              password: e.target[3].value,
              ConfirmPassword: e.target[4].value,
              number: e.target[5]?.value || "",
            }
          : { email: e.target[0].value, password: e.target[1].value }),
      };

      console.log("payload", payload, props.Action);
      let response = await fetch(
        `http://localhost:5000/auth/${props.Action.toLowerCase()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      response = await response.json();

      if (response.status && props.Action === "Login") {
        console.log("response", response);
        socket.emit("registerUser", response.email);
        
        const userData = {
          ...user,
          isAuthenticated: true,
          name: response.name,
          userType: response.userType,
          email: response.email,
        };
        localStorage.setItem("Tocken", response.Tocken);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        notifySuccess("Login Successful");
        Navigate("/", { replace: true });
      } else if (response.status && props.Action === "Signup") {
        notifySuccess(response.message);
        Navigate("/login", { replace: true });
      } else {
        notifyError(response.message);
      }
    } catch (e) {
      console.error(e);
      notifyError("Some Error Occured");
    }
  };
  return (
    <>
      <Nav active={props.Action} />
      <div className="relative w-full h-screen flex flex-row items-center justify-center overflow-hidden ">
        <div className="relative z-10">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col bg-white p-6 rounded-xl shadow-lg w-[90vw] max-w-md"
          >
            {props.Action === "Signup" ? (
              <>
                <input
                  name="name"
                  className="my-2 px-3 py-2 border rounded"
                  placeholder="name"
                  type="name"
                />

                <input
                  name="lastName"
                  className="my-2 px-3 py-2 border rounded"
                  placeholder="Last Name"
                  type="text"
                />
              </>
            ) : (
              ""
            )}
            <input
              name="email"
              className="my-2 px-3 py-2 border rounded"
              placeholder="email"
              type="email"
            />

            <input
              name="password"
              className="my-2 px-3 py-2 border rounded"
              placeholder="Password"
              type="password"
            />

            {props.Action === "Signup" ? (
              <>
                <input
                  name="ConfirmPass"
                  className="my-2 px-3 py-2 border rounded"
                  placeholder="Confirm Password"
                  type="password"
                />
                <input
                  name="number"
                  className="my-2 px-3 py-2 border rounded"
                  placeholder="Number"
                  type="number"
                />
              </>
            ) : (
              ""
            )}

            <input
              className="my-2 px-3 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition-all"
              type="submit"
              value={props.Action}
            />
          </form>
        </div>
      </div>
    </>
  );
};

export default Authentication;
