import React, { useContext } from "react";
import Songs from "./Songs";
import Artists from "./Artists";
import { Redirect } from "react-router-dom";
import { AuthContext } from "../firebase/Auth";
import Button from "react-bootstrap/Button";
import { Textfit } from "react-textfit";
import { makeStyles } from "@material-ui/core";
import "../App.css";
const axios = require("axios");

const useStyles = makeStyles({
  h1: {
    fontSize: 36,
    marginBottom: 20,
  },
  h2: {
    marginTop: 20,
  },
  pdfContainer: {
    marginLeft: "auto",
    marginRight: "auto",
    width: 600,
    display: "flex",
    flexFlow: "column nowrap",
    justifyContent: "center",
  },
  pdfButton: {
    width: "auto",
    fontSize: 28,
    backgroundColor: "#F40B86",
    border: "none",
    alignSelf: "center",
    "&:hover": {
      backgroundColor: "#c3096b",
    },
    "&:focus": {
      backgroundColor: "#c3096b",
    },
    "&:active": {
      backgroundColor: "#c3096b",
    },
  },
});

function Stats() {
  const { currentUser } = useContext(AuthContext);
  const classes = useStyles();
  function makeOL(array) {
    var list = document.createElement("ol");
    for (var i = 0; i < array.length; i++) {
      var item = document.createElement("li");
      item.setAttribute("class", "remove");
      item.appendChild(document.createTextNode(array[i]));
      list.appendChild(item);
    }
    return list;
  }
  async function getData() {
    try {
      var data = await axios.get(
        `http://localhost:9000/stats/${currentUser.uid}`
      );
      return data;
    } catch (e) {
      console.log(e);
    }
  }

  async function sendData() {
    var htmlContent = document.getElementById("foo").outerHTML;
    try {
      await axios({
        method: "post",
        url: `http://localhost:9000/pdf`,
        headers: { "Content-Type": "text/html" },
        data: htmlContent,
      });
      window.open("http://localhost:9000/download");
      const removeElements = (elms) => elms.forEach((el) => el.remove());
      removeElements(document.querySelectorAll(".remove"));
    } catch (e) {
      console.log(e);
    }
  }

  const handle_pdf = async () => {
    const data = await getData();
    var item = document.createElement("h2");
    item.setAttribute("class", "remove");
    item.appendChild(document.createTextNode("Top Artists"));
    document.getElementById("foo").appendChild(item);
    document.getElementById("foo").appendChild(makeOL(data.data.artists));
    item = document.createElement("h2");
    item.setAttribute("class", "remove");
    item.appendChild(document.createTextNode("Top Songs"));
    document.getElementById("foo").appendChild(item);
    document.getElementById("foo").appendChild(makeOL(data.data.tracks));
    await sendData();
  };
  return (
    <div>
      {!currentUser ? (
        <Redirect to="/login" />
      ) : (
        <div>
          <h1 className={classes.h1}>
            {currentUser.displayName}'s Listening History
          </h1>
          <div className={classes.pdfContainer}>
            <Button
              variant="secondary"
              onClick={handle_pdf}
              className={classes.pdfButton}
            >
              Download Listening History From All Time PDF
            </Button>
            <Textfit mode="single" forceSingleModeWidth={true}>
              Disclaimer: If your Top Artists or Top Songs of All Time are
              empty, nothing will show in that field on the PDF
            </Textfit>
            <div id="foo"></div>
          </div>
          <h2 className={classes.h2}>Top Songs:</h2>
          <Songs />
          <h2 className={classes.h2}>Top Artists:</h2>
          <Artists />
        </div>
      )}
    </div>
  );
}

export default Stats;
