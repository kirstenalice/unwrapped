import React, { useContext } from "react";
import { Link, Redirect } from "react-router-dom";
import Button from "react-bootstrap/Button";
import firebase from "firebase/app";
import { AuthContext } from "../firebase/Auth";
import { makeStyles } from "@material-ui/core";

const useStyles = makeStyles({
  button: {
    marginTop: 10,
    backgroundColor: "#e6007d",
    border: "none",
    "&:hover": {
      backgroundColor: "#b80064",
    },
    "&:active": {
      backgroundColor: "#b80064",
    },
    "&:focus": {
      backgroundColor: "#b80064",
    },
  },
  link: {
    color: "white",
    "&:hover": {
      color: "white",
      textDecoration: "none",
    },
  },
});
function Logout() {
  const { currentUser } = useContext(AuthContext);
  const classes = useStyles();
  async function onSignout() {
    await firebase.auth().signOut();
  }

  if (!currentUser) {
    return (
      <div>
        <Redirect to="login" />
      </div>
    );
  } else {
    return (
      <div>
        <p>Are you sure you want to log out?</p>
        <Button
          type="button"
          onClick={onSignout}
          size="lg"
          className={classes.button}
        >
          <Link to="/" className={classes.link}>
            Log out
          </Link>
        </Button>
      </div>
    );
  }
}

export default Logout;
