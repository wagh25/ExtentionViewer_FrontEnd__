import React, { useState, useEffect, use } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import debounce from "lodash.debounce";
import Nav from "./nav";
import { useNavigate } from "react-router-dom";
import ProtectRoute from "./Authentication/protectRoute";

const Home = () => {
  const Navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [update, setUpdate] = useState(null);
  const [admin, setAdmin] = useState(false);
  
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

  //UseEffects
  
  //Functions

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

  const handleDelete = async (u) => {
    console.log(u);
    try {
      const response = await fetch("http://localhost:5000/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(u),
      });
      console.log("response", response);
      let res = await response.json();
      alert(res.message);
      setSearchTerm("");
    } catch (e) {
      alert(`Some issue Occured`);
    }
  };

  const handleSubmit = async (e, user) => {
    try {
      user.newNumber = e.target[0].value;
      const response = await fetch("http://localhost:5000/update", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (response.ok) {
        let res = await response.json();
        setUpdate(null);
        setSearchTerm("");
        alert(res.message);
      } else {
        alert("Some Issue Occured");
      }
    } catch (err) {
      console.log(err);
      alert("Some Issue Occured");
    }
  };

  //functions 

  return (
    <>
    <ProtectRoute/>
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
            results.map((u, idx) => (
              <div
                key={idx}
                className={`p-3 flex ${
                  admin ? "justify-between" : "justify-center"
                } items-center 
                border-2  rounded-xl
                 shadow-sm m-3  border-blue-600`}
              >
                <span className="text-1xl">
                  {u.name.toUpperCase() + " " + u.lastName.toUpperCase() + " "}—
                  {update != idx ? (
                    u.number
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit(e, u);
                      }}
                    >
                      <input
                        className="mr-2"
                        type="text"
                        placeholder="Enter New Extention"
                        name="number"
                      />
                      <input type="submit" value="Save" />
                    </form>
                  )}
                </span>

                {admin ? (
                  <div>
                    <button className="mr-2" onClick={() => handleDelete(u)}>
                      Delete
                    </button>
                    <button className="mr-2" onClick={() => setUpdate(idx)}>
                      Update
                    </button>
                    {update == idx ? (
                      <button className="mr-2" onClick={() => setUpdate(null)}>
                        Cancel
                      </button>
                    ) : (
                      ""
                    )}
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
