export const  validateTocken = async (Tocken) => {
    
    const response = await fetch("http://localhost:5000/validate", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Token: Tocken }),
    });
    if (response.ok) {
      let res = await response.json();
      if (res.status) {
        setUser({...user, isAuthenticated: true} );
        if(Location.pathname==="/login" || Location.pathname==="/signup"){
          Navigate("/", { replace: true });
        }
      }
    }
  };