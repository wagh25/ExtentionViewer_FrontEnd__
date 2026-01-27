import React from "react";
import { Link ,useNavigate} from "react-router-dom";
import { UserContext } from "../Context/userContext";



const Nav = (props) => {
  const {user} = React.useContext(UserContext);
  const navigate = useNavigate();
  const admin = user.userType === "admin";
  return (
    <nav className="w-full bg-amber-200 text-black shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <div className="text-xl font-bold tracking-wide hover:text-blue-500 transition-all duration-200">
            ExtentionViewer📞
          </div>

          {/* Menu */}
          {props.active == "Login" || props.active == "Signup" ? (
            <div className="flex gap-6 text-lg">
              <Link
                to="/login"
                className={
                  props.active == "Login"
                    ? "text-blue-700"
                    : "text-amber-950 hover:text-blue-500 transition-all duration-200"
                }
              >
                Login
              </Link>
              <Link
                to="/signup"
                className={
                  props.active == "Signup"
                    ? "text-blue-700"
                    : "text-amber-950 hover:text-blue-500 transition-all duration-200"
                }
              >
                Sign-up
              </Link>
            </div>
          ) : (
            <div className="flex gap-6 text-lg">
              <Link
                to="/"
                className={
                  props.active == "Home"
                    ? "text-blue-700"
                    : "text-amber-950 hover:text-blue-500 transition-all duration-200"
                }
              >
                Home
              </Link>

              {admin && (<><Link
                to="/admin"
                className={
                  props.active == "Add"
                    ? "text-blue-700"
                    : "text-amber-950 hover:text-blue-500 transition-all duration-200"
                }
              >
                Add User
              </Link>

              <Link
                to="/admin/update"
                className={
                  props.active == "Update"
                    ? "text-blue-700"
                    : "text-amber-950 hover:text-blue-500 transition-all duration-200"
                }
              >
                Update User
              </Link>

              <Link
                to="/admin/delete"
                className={
                  props.active == "Delete"
                    ? "text-blue-700"
                    : "text-amber-950 hover:text-blue-500 transition-all duration-200"
                }
              >
                Delete User
              </Link> 
              
              </>)}
              <button  className=" text-amber-950 hover:text-blue-500 transition-all duration-200"
                onClick={() => {
                  localStorage.removeItem("Tocken"); 
                  localStorage.removeItem("user");
                  navigate("/login");
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Nav;
