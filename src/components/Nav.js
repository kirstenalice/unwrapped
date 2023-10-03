import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../firebase/Auth";
import "../App.css";

function Nav() {
  const { currentUser } = useContext(AuthContext);
  if (currentUser) {
    return (
      <nav className="nav">
        <NavLink to="/playlists" className="navlink">
          Playlists
        </NavLink>
        <NavLink to="/stats" className="navlink">
          Listening History
        </NavLink>
        <NavLink to="/logout" className="navlink">
          Log out
        </NavLink>
      </nav>
    );
  } else {
    return (
      <nav className="nav">
        <NavLink to="/login" className="navlink">
          Playlists
        </NavLink>
        <NavLink to="/login" className="navlink">
          Listening History
        </NavLink>
        <NavLink to="/login" className="navlink">
          Log in
        </NavLink>
      </nav>
    );
  }
}

export default Nav;
