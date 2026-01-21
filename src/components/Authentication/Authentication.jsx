import React from "react";
import Nav from "../nav";

const Authentication = (props) => {
  const handleSubmit = () => {};
  return (
    <>
      <Nav active={props.Action} />
      <div className="relative w-full h-screen flex flex-row items-center justify-center overflow-hidden ">
        {/* Curtains */}
        <div
          className={`absolute top-0 left-0 w-full h-1/2 bg-gray-800 transition-transform duration-700 ease-in-out ${
            open ? "-translate-y-full" : "translate-y-0"
          }`}
        ></div>
        <div
          className={`absolute bottom-0 left-0 w-full h-1/2 bg-gray-800 transition-transform duration-700 ease-in-out ${
            open ? "translate-y-full" : "translate-y-0"
          }`}
        ></div>
        <div className="relative z-10">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col bg-white p-6 rounded-xl shadow-lg w-[90vw] max-w-md"
          >
            <input
              name="name"
              className="my-2 px-3 py-2 border rounded"
              placeholder="Name"
              type="text"
            />
            <input
              name="lastName"
              className="my-2 px-3 py-2 border rounded"
              placeholder="Last Name"
              type="text"
            />
            <input
              name="password"
              className="my-2 px-3 py-2 border rounded"
              placeholder="Password"
              type="password"
            />
            <select
              name="type"
              className="my-2 px-5 py-2 border rounded-lg dropdown border-[#646cff] bg-[#1a1a1a] font-medium cursor-pointer transition-colors duration-200"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

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
