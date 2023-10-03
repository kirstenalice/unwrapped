import React from "react";
import { makeStyles } from "@material-ui/core";
import "../App.css";

const useStyles = makeStyles({
  rootContainer: {
    display: "flex",
    flexDirection: "column",
    marginLeft: 10,
    marginRight: 10,
  },
  h1: {
    fontSize: 36,
  },
  h2: { fontSize: 24 },
  h3: { fontSize: 18, textDecoration: "underline solid" },
  container: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  subcontainer: {
    display: "flex",
    width: "50%",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  featuresAndTech: {
    display: "flex",
    flexFlow: "column nowrap",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    textAlign: "left",
  },
});

function Home() {
  const classes = useStyles();
  return (
    <div className={classes.rootContainer}>
      <h1 className={classes.h1}>Welcome to Unwrapped</h1>
      <h2 className={classes.h2}>
        Coded by: Matt Gorman, Kirsten Meidlinger, Amanda Gomes, Ryan Qin, and
        Chaeli Vieira
      </h2>
      <p className={classes.description}>
        This site uses the Spotify API to create a better version of Spotify
        Wrapped! Unlike Spotify Wrapped, this site can be used at any time of
        the year to get your top artists and songs.
      </p>
      <div className={classes.container}>
        <div className={classes.subcontainer}>
          <h3 className={classes.h3}>Site Features</h3>
          <ul className={classes.featuresAndTech}>
            <li>
              See your top artists and songs from the past month, the past year
              and of all time!
            </li>
            <li>
              Create a playlist based on one of your top artists that is save
              directly to your spotify page!
            </li>
            <li>View your top 50 playlists that you already have saved!</li>
            <li>Listen to your public and private playlists!</li>
            <li>Save a PDF of your top 20 artists and tracks of all time!</li>
          </ul>
        </div>
        <div className={classes.subcontainer}>
          <h3 className={classes.h3}>Technologies Used</h3>
          <ul className={classes.featuresAndTech}>
            <li>React Front-End with an Express Back-End</li>
            <li>Spotify API: Getting your listening history</li>
            <li>Firebase: Logging in to your Spotify account</li>
            <li>Redis: Caching often-used information</li>
            <li>Wkhtmltopdf: Creating a PDF of your top songs and artists</li>
            <li>ImageMagick: Uploading custom cover art for playlists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;
