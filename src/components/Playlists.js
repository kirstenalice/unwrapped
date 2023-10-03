import React, { useState, useContext, useEffect } from "react";
import noImage from "../img/download.jpeg";
import { Textfit } from "react-textfit";
import { Link, Redirect } from "react-router-dom";
import { AuthContext } from "../firebase/Auth";
import axios from "axios";
import "../App.css";
import {
  Card,
  CardContent,
  CardMedia,
  Grid,
  Typography,
  makeStyles,
} from "@material-ui/core";

const useStyles = makeStyles({
  title: {
    fontSize: 36,
    marginBottom: 20,
  },
  card: {
    maxWidth: 250,

    height: "auto",
    marginLeft: "auto",
    marginRight: "auto",
    borderRadius: 5,
    border: "1px solid #0B86F4",
    boxShadow: "0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);",
    "&:hover": {
      border: "1px solid #f40b86",
    },
  },
  content: {
    height: 90,
  },
  titleHead: {
    color: "#0077da",
    borderBottom: "1px solid #0B86F4",
    fontWeight: "bold",
    minHeight: 34,
  },
  grid: {
    flexGrow: 1,
    flexDirection: "row",
    paddingLeft: 50,
    paddingRight: 50,
  },
  media: {
    height: 250,
    width: 250,
  },
});

const Playlists = (props) => {
  let card = null;
  //const regex = /(<([^>]+)>)/gi;
  const classes = useStyles();
  const [playlistData, setPlaylistData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await axios.get(
          `http://localhost:9000/playlists/${currentUser.uid}`
        );
        setPlaylistData(data);
        setLoading(false);
      } catch (e) {
        console.log(e);
      }
    }
    fetchData();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div>
        <Redirect to="/login" />
      </div>
    );
  } else if (loading) {
    return (
      <div>
        <h2>Loading...</h2>
      </div>
    );
  } else {
    const buildCard = (playlist) => {
      return (
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={playlist.id}>
          <Card className={classes.card} variant="outlined">
            <Link to={`/playlists/${playlist.id}`}>
              <CardMedia
                className={classes.media}
                component="img"
                image={
                  playlist && playlist.images[0]
                    ? playlist.images[0].url
                    : noImage
                }
                title="show image"
              />
            </Link>
            <CardContent className={classes.content}>
              <Typography
                className={classes.titleHead}
                gutterBottom
                variant="h6"
                component="h2"
              >
                {playlist.name.length >= 45 ? (
                  playlist.name.substring(0, 19) + "..."
                ) : playlist.name.length >= 19 ? (
                  <Textfit mode="single">{playlist.name}</Textfit>
                ) : (
                  playlist.name
                )}
              </Typography>
              <p>{playlist.tracks.total} songs</p>
            </CardContent>
          </Card>
        </Grid>
      );
    };

    card =
      playlistData &&
      playlistData.map((playlist) => {
        return buildCard(playlist);
      });

    return (
      <div>
        <h1 className={classes.title}>{currentUser.displayName}'s Playlists</h1>
        <Grid container className={classes.grid} spacing={5}>
          {card}
        </Grid>
      </div>
    );
  }
};

export default Playlists;
