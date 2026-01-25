import React, { useState } from "react";
import Nav from "../nav";

const Forms = (props) => {
  const [open, setOpen] = useState(false);
  const [message, setmessage] = useState("");
  const handleSubmit = async (e) => {
    console.log("clicked");
    e.preventDefault();
    try {
      let payload = {
        name: e.target[0].value,
        lastName: e.target[1].value,
        ...(props.Action == "Update"
          ? {
              oldNumber: e.target[2].value,
              number: e.target[3].value,
            }
          : { number: e.target[2].value }),
      };

      console.log("payload", payload, props.Action);
      let response = await fetch(
        `http://localhost:5000/${props.Action.toLowerCase()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      response = await response.json();

      setOpen(response.status);
      setmessage(response.message);
    } catch (e) {
      console.error(e)
      setmessage("Some Error Occured");
      setOpen(true);
    }
  };

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

        {open ? (
          <p>
            {message}
            <button
              onClick={() => {
                setOpen(false);
              }}
            >
              ok
            </button>{" "}
          </p>
        ) : (
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
              {props.Action == "Update" ? (
                <input
                  name="number"
                  className="my-2 px-3 py-2 border rounded"
                  placeholder="Number"
                  type="Number"
                />
              ) : (
                ""
              )}
              <input
                name={props.Action == "Update" ? "newNumber" : "number"}
                className="my-2 px-3 py-2 border rounded"
                placeholder={props.Action == "Update" ? "newNumber" : "number"}
                type="Number"
              />

              <input
                className="my-2 px-3 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition-all"
                type="submit"
                value={`${props.Action} User`}
              />
            </form>
          </div>
        )}
      </div>
    </>
  );
};

export default Forms;
