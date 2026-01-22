import React from "react";
import Nav from "../nav";

const Authentication = (props) => {
  const handleSubmit = () => {};
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
              <><input
                name="name"
                className="my-2 px-3 py-2 border rounded"
                placeholder="name"
                type="name" />
                
                <input
                  name="lastName"
                  className="my-2 px-3 py-2 border rounded"
                  placeholder="Last Name"
                  type="text" /></>
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
              <input
                name="ConfirmPass"
                className="my-2 px-3 py-2 border rounded"
                placeholder="Confirm Password"
                type="password" />
                
            ) : (
              ""
            )}

            <input
              className="my-2 px-3 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition-all"
              type="submit"
              value="Login"
            />
            
          </form>
        </div>
      </div>
    </>
  );
};

export default Authentication;
