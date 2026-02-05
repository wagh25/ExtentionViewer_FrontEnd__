import React, { useState, useEffect, useContext, use } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import debounce from "lodash.debounce";
import Nav from "./nav";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Context/userContext";
import { notifyError, notifySuccess } from "../utils/tostify";
import { io } from "socket.io-client";

const Home = () => {
  const Navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [update, setUpdate] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const { user } = useContext(UserContext);
  const admin = user.userType === "admin";
  const socket = io("http://localhost:5000");

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  //UseEffects

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    console.log("what user said: ", transcript);
    if (transcript) {
      fetchSearch(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    setSearchTerm("");
  }, [listening]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to socket server", socket.id);
      socket.emit("registerUser", user.email);
    });
  }, []);

  //UseEffects

  //Functions

  const handleCall = (user) => {
    console.log("Calling user:", user);
    socket.emit("callUser", user.email);
  };
  const fetchSearch = async (text) => {
    if (!text) {
      setResults([]);
      return;
    }
    try {
      const resp = await fetch("http://localhost:5000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (resp.ok) {
        const data = await resp.json();
        console.log("data", data);
        setResults(data.users || data); // adjust based on your API response shape
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Search error", err);
      setResults([]);
    }
  };

  const debouncedSearch = debounce((q) => fetchSearch(q), 500);

  const handleTextChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStart = () => {
    if (browserSupportsSpeechRecognition) {
      resetTranscript();
      SpeechRecognition.startListening({
        continuous: false,
        language: "en-IN",
      });
    } else {
      alert("Speech recognition not supported");
    }
  };

  const handleDelete = async (e, emailToDelete) => {
    try {
      const response = await fetch("http://localhost:5000/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: user.email,
          password: e.target[0].value,
          emailToDelete,
        }),
      });
      console.log("response", response);
      let res = await response.json();
      if (res.status) {
        notifySuccess(res.message);
        setDeleteUser(null);
        setResults([]);
        setSearchTerm("");
      } else {
        notifyError(res.message);
        setDeleteUser(null);
      }
    } catch (e) {
      notifyError(`Some issue Occured`);
    }
  };

  const handleUpdate = async (e, userEmail) => {
    try {
      user.newNumber = e.target[0].value;
      const response = await fetch("http://localhost:5000/update", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          newNumber: e.target[0].value,
          adminEmail: user.email,
        }),
      });
      if (response.ok) {
        let res = await response.json();
        setUpdate(null);
        setResults([]);
        setSearchTerm("");
        notifySuccess(res.message);
      } else {
        notifyError("Update Failed");
      }
    } catch (err) {
      console.log(err);
      notifyError("Some Error Occured");
    }
  };

  //functions

  return (
    <>
      <Nav active="Home" />
      <div className="container mx-auto mt-20 text-center align-middle">
        <button onClick={handleStart}>(🎤 Mic)</button>
        <h1>{listening ? "Listening..." : "Click mic to speak"}</h1>
        <input
          className="bg-black hover:border-amber-200"
          type="text"
          value={searchTerm}
          onChange={handleTextChange}
          placeholder=" Or type name..."
        />
        <div className="bg-blend-color" style={{ marginTop: 20 }}>
          {results.length > 0 ? (
            results.map((user, idx) => (
              <div
                key={idx}
                className={`p-3 flex ${
                  admin ? "justify-between" : "justify-center"
                } items-center 
                border-2  rounded-xl
                 shadow-sm m-3  border-blue-600`}
              >
                <span className="text-1xl">
                  {user.name.toUpperCase() +
                    " " +
                    user.lastName.toUpperCase() +
                    " "}
                  —
                  {update != idx && deleteUser != idx ? (
                    user.number
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (deleteUser == idx) {
                          handleDelete(e, user.email);
                        } else {
                          handleUpdate(e, user.email);
                        }
                      }}
                    >
                      <input
                        className="mr-2"
                        type="text"
                        placeholder={
                          update == idx
                            ? "Enter New Extention"
                            : "Enter Password to Delete"
                        }
                        name="number"
                      />
                      <input
                        type="submit"
                        value={update == idx ? "Update" : "Delete"}
                      />
                    </form>
                  )}
                </span>

                {admin ? (
                  <div>
                    {update == idx || deleteUser == idx ? null : (
                      <button
                        className="mr-2"
                        onClick={() => {
                          setDeleteUser(idx);
                          setUpdate(null);
                        }}
                      >
                        Delete
                      </button>
                    )}
                    {update == idx || deleteUser == idx ? null : (
                      <button
                        className="mr-2"
                        onClick={() => {
                          setUpdate(idx);
                          setDeleteUser(null);
                        }}
                      >
                        Update
                      </button>
                    )}
                    {update == idx || deleteUser == idx ? (
                      <button
                        className="mr-2"
                        onClick={() => {
                          setUpdate(null);
                          setDeleteUser(null);
                        }}
                      >
                        Cancel
                      </button>
                    ) : (
                      ""
                    )}
                    <button
                      className="mr-2"
                      onClick={() => {
                        setUpdate(null);
                        setDeleteUser(null);
                        handleCall(user);
                      }}
                    >
                      call
                    </button>
                  </div>
                ) : (
                  ""
                )}
              </div>
            ))
          ) : (
            <p>No results</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
