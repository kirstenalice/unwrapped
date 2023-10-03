import React, { useState, useContext, useEffect } from "react";
import noImage from "../img/download.jpeg";
import { AuthContext } from "../firebase/Auth";
import axios from "axios";
import { Redirect, Link } from "react-router-dom";
import { makeStyles } from "@material-ui/core";
import Button from "react-bootstrap/Button";
import "../App.css";
const FormData = require("form-data");

const useStyles = makeStyles({
  h2: {
    color: "#0B86F4",
  },
  h3: {
    fontSize: 24,
    fontWeight: "normal",
  },
  h4: {
    borderBottom: "1px solid #0B86F4",
    fontSize: 16,
    fontWeight: "normal",
    paddingBottom: 10,
  },
  descriptionContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  uploadContainer: {
    display: "flex",
    flexDirection: "row",
    width: 500,
    paddingLeft: 50,
    paddingRight: "auto",
    justifyContent: "space-between",
  },
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
  playlistHeader: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
  },
  playlistImage: {
    height: "250px",
    width: "250px",
  },
  playbackContainer: {
    padding: "20px",
  },
});

const PlaylistTracks = (props) => {
  const { currentUser } = useContext(AuthContext);
  const [playlistData, setPlaylistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaded, setUploaded] = useState(null);
  // eslint-disable-next-line
  const classes = useStyles();

  const onFileChange = (event) => {
    // Update the state
    setSelectedFile(event.target.files[0]);
  };

  const onFileUpload = async () => {
    if (
      selectedFile.name.slice(-4).toLowerCase() !== ".png" &&
      selectedFile.name.slice(-4).toLowerCase() !== ".jpg" &&
      selectedFile.name.slice(-5).toLowerCase() !== ".jpeg"
    ) {
      alert("Image must be a png, jpg, or jpeg");
      return;
    } else if (
      playlistData &&
      playlistData.owner &&
      playlistData.owner.id &&
      currentUser &&
      currentUser.uid &&
      playlistData.owner.id !==
        currentUser.uid.substring(
          currentUser.uid.indexOf(":") + 1,
          currentUser.uid.length
        )
    ) {
      alert("You do not have permission to edit this playlist");
      return;
    }

    const formData = new FormData();
    // Update the formData object
    formData.append("file", selectedFile, selectedFile.name);

    // Details of the uploaded file
    setUploaded("uploading");

    // Request made to the backend api
    // Send formData object
    try {
      let { data } = await axios.post(
        `http://localhost:9000/${currentUser.uid}/${props.match.params.playlistId}/playlistImage`,
        formData
      );
      setUploaded(data);
      if (data.reload) {
        window.location.reload();
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await axios.get(
          `http://localhost:9000/playlists/${currentUser.uid}/${props.match.params.playlistId}`
        );
        setPlaylistData(data);
        setLoading(false);
        setSelectedFile(null);
        setUploaded(null);
      } catch (e) {
        console.log(e);
      }
    }
    fetchData();
  }, [currentUser, props.match.params.playlistId]);

  let message = "";
  if (uploaded && uploaded.message) {
    message = uploaded.message;
  } else if (uploaded && uploaded === "uploading") {
    message = "Updating image...";
  }

  if (!currentUser) {
    return (
      <div>
        <Redirect to="/login" />
      </div>
    );
  } else if (playlistData && playlistData.errorMessage) {
    return (
      <div>
        <h3>{playlistData.errorMessage}</h3>
        <Link to="/playlists">Back to Playlists</Link>
      </div>
    );
  } else if (loading) {
    return (
      <div>
        <h3>Loading...</h3>
      </div>
    );
  } else {
    return (
      <div>
        <div className={classes.playlistHeader}>
          <div className="Playlist-tracks-info">
            <h2 className={classes.h2}>{playlistData.name}</h2>
            <h3 className={classes.h3}>{playlistData.description}</h3>
            <h4 className={classes.h4}>
              A playlist by {playlistData.owner ? playlistData.owner.id : ""}
            </h4>
            <div className={classes.descriptionContainer}>
              <div className={classes.uploadContainer}>
                <label htmlFor="new-playlist-image">New Playlist Image</label>
                <input
                  type="file"
                  accept=".jpg, .jpeg, .png"
                  onChange={onFileChange}
                  id="new-playlist-image"
                />
              </div>
              <Button
                onClick={() => {
                  if (!selectedFile) {
                    alert("Please upload an image first!");
                    return;
                  } else {
                    onFileUpload();
                  }
                }}
                className={classes.button}
                size="lg"
              >
                Update Playlist Image
              </Button>
            </div>
            <br />
            <br />
            <p>{message}</p>
          </div>
          <img
            className={classes.playlistImage}
            src={
              playlistData.images && playlistData.images[0]
                ? playlistData.images[0].url
                : noImage
            }
            alt={playlistData.name + " playlist art"}
          />
        </div>
        <div className={classes.playbackContainer}>
          <iframe
            src={`https://open.spotify.com/embed/playlist/${playlistData.id}`}
            title={`spotify player for playlist ${playlistData.name}`}
            width="100%"
            height="600"
            frameBorder="4"
            allowtransparency="true"
            allow="encrypted-media"
          ></iframe>
        </div>
      </div>
    );
  }
};

export default PlaylistTracks;
