const express = require("express");
const path = require("path");
const app = express();
const crypto = require("crypto");
const admin = require("firebase-admin");
const axios = require("axios");
const serviceAccount = require("./private/service-account.json");
const redis = require("redis");
const cors = require("cors");
const redisClient = redis.createClient();
const bluebird = require("bluebird");
let wkhtmltopdf = require("wkhtmltopdf");
let cookieParser = require("cookie-parser");
const qs = require("qs");
const fs = require("fs");
const multer = require("multer");
var bodyParser = require("body-parser");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
require("dotenv").config();

//Promisify Redis
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
bluebird.promisifyAll(redis);

// Help from here for custom OAuth2 for Spotify login
// https://firebase.googleblog.com/2016/10/authenticate-your-firebase-users-with.html

//Admin access to create token
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//Function to create custom Firebase token based on Spotify ID
async function createFirebaseAccount(spotifyID, displayName, photoURL) {
  // The UID we'll assign to the user.
  const uid = `spotify:${spotifyID}`;
  // Create or update the user account.
  const userCreationTask = admin
    .auth()
    .updateUser(uid, {
      displayName: displayName,
      photoURL: photoURL,
    })
    .catch((error) => {
      // If user does not exists we create it.
      if (error.code === "auth/user-not-found") {
        return admin.auth().createUser({
          uid: uid,
          displayName: displayName,
          photoURL: photoURL,
        });
      }
      throw error;
    });
  // Wait for all async task to complete then generate and return a custom auth token.
  return Promise.all([userCreationTask]).then(async () => {
    // Create a Firebase custom auth token.
    const token = await admin.auth().createCustomToken(uid);
    return token;
  });
}
//Sign in and close window
function signInFirebaseTemplate(token, spotifyAccessToken) {
  return `
    <script src="https://www.gstatic.com/firebasejs/3.6.0/firebase.js"></script>
    <script>
      let token = '${token}';
      window.opener.postMessage(token, '*');
      window.close();
    </script>`;
}
let clientID = "f6d1d45ce5054cb382dbdf0e305333e2";
//Creds for login page & Auth code setup
const credentials = {
  client: {
    id: clientID,
    secret: "c40002a5b4ff47d3bad5a3a4148fd0c6",
  },
  auth: {
    tokenHost: "https://accounts.spotify.com",
    authorizePath: "/authorize",
    tokenPath: "/api/token",
  },
};
const { AuthorizationCode } = require("simple-oauth2");
const client = new AuthorizationCode(credentials);

//Make cookies visible
app.use(cookieParser());
//Parse for Image uploads
let upload = multer({ dest: `${__dirname}/tmp/` });
//CORS Every Route
app.use(cors());

//Deliver Production react
app.use(express.static(path.join(__dirname, "build")));
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

//Implemneted from blog post
app.get("/login-redirect", (req, res) => {
  // Generate a random state verification cookie.
  const state =
    req.cookies && req.cookies.state
      ? req.cookies.state
      : crypto.randomBytes(20).toString("hex");
  // Allow unsecure cookies on localhost.
  const secureCookie = req.get("host").indexOf("localhost:") !== 0;
  res.cookie("state", state.toString(), {
    maxAge: 3600000,
    secure: secureCookie,
    httpOnly: true,
  });
  const redirectUri = client.authorizeURL({
    redirect_uri: `http://localhost:9000/spotify-callback/`,
    scope:
      "user-read-private user-top-read playlist-read-private playlist-modify-public playlist-modify-private ugc-image-upload",
    state: state,
  });
  res.redirect(redirectUri);
});

app.get("/spotify-callback", async (req, res) => {
  // Check that we received a State Cookie.
  if (!req.cookies || !req.cookies.state) {
    res
      .status(400)
      .send(
        "State cookie not set or expired. Maybe you took too long to authorize. Please try again."
      );
    return;
    // Check the State Cookie is equal to the state parameter.
  } else if (req.cookies.state !== req.query.state) {
    res.status(400).send("State validation failed");
    return;
  } else if (!req.query || !req.query.code) {
    res.status(400).send("Bad Login Attempt");
    return;
  }

  try {
    // Exchange the auth code for an access token.
    await client
      .getToken({
        code: req.query.code,
        redirect_uri: `http://localhost:9000/spotify-callback/`,
      })
      .then(async (results) => {
        // We have an Spotify access token and the user identity now.
        const accessToken = results.token.access_token;
        const refreshToken = results.token.refresh_token;
        const expiresAt = results.token.expires_at;

        try {
          var { data } = await axios.get("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch (e) {
          res.send(e);
          return;
        }
        const id = data.id;
        const displayname = data.display_name;

        const image =
          data.images[0] && data.images[0].url
            ? data.images[0].url
            : "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg";

        try {
          var firebaseToken = await createFirebaseAccount(
            id,
            displayname,
            image
          );
          let uid = `spotify:${id}`;

          await redisClient.hsetAsync(`${uid}`, "accesstoken", accessToken);
          await redisClient.hsetAsync(`${uid}`, "displayname", displayname);
          await redisClient.hsetAsync(`${uid}`, "image", image);
          await redisClient.hsetAsync(`${uid}`, "refreshToken", refreshToken);
          await redisClient.hsetAsync(`${uid}`, "expiresAt", expiresAt);
        } catch (e) {
          console.log(e);
          res.send(e);
          return;
        }
        res
          .status(200)
          .send(signInFirebaseTemplate(firebaseToken, accessToken));
      });
  } catch (e) {
    console.log(e);
  }
});

async function refreshSpotifyToken(sID) {
  let refreshToken = await redisClient.hgetAsync(`${sID}`, "refreshToken");
  let base64 = new Buffer.from(
    clientID + ":" + "c40002a5b4ff47d3bad5a3a4148fd0c6"
  ).toString("base64");

  try {
    var { data } = await axios.post(
      `https://accounts.spotify.com/api/token`,
      qs.stringify({
        grant_type: "refresh_token",
        refresh_token: `${refreshToken}`,
      }),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=utf-8",
          Authorization: `Basic ${base64}`,
        },
      }
    );
    await redisClient.hsetAsync(`${sID}`, "accesstoken", data.access_token);
    await redisClient.hsetAsync(
      `${sID}`,
      "expiresAt",
      new Date() + data.expires_in
    );
  } catch (e) {
    console.log(e);
  }
}

app.get("/artists/:id/:time", cors(), async (req, res) => {
  let expDate = Date.parse(
    await redisClient.hgetAsync(`${req.params.id}`, "expiresAt")
  );
  let curDate = new Date();
  if (curDate > expDate) {
    refreshSpotifyToken(req.params.id);
  }
  let artistsInfo = await redisClient.hgetAsync(
    `${req.params.id}`,
    `artists-${req.params.time}`
  );
  if (artistsInfo) {
    res.status(200).send(artistsInfo);
  } else {
    let accessToken = await redisClient.hgetAsync(
      `${req.params.id}`,
      "accesstoken"
    );
    let result = {};
    if (accessToken) {
      try {
        let {
          data,
        } = await axios.get(
          `https://api.spotify.com/v1/me/top/artists?time_range=${req.params.time}&limit=20`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = JSON.stringify(data.items);
        await redisClient.hsetAsync(
          `${req.params.id}`,
          `artists-${req.params.time}`,
          result
        );
        var todayEnd = new Date().setHours(23, 59, 59, 999);
        redisClient.expireat(
          `artists-${req.params.time}`,
          parseInt(todayEnd / 1000)
        );
      } catch (e) {
        console.log(e);
        res.status(500);
      }
    }
    res.status(200).send(result);
  }
});

app.get("/tracks/:id/:time", cors(), async (req, res) => {
  let expDate = Date.parse(
    await redisClient.hgetAsync(`${req.params.id}`, "expiresAt")
  );
  let curDate = new Date();
  if (curDate > expDate) {
    refreshSpotifyToken(req.params.id);
  }
  let tracksInfo = await redisClient.hgetAsync(
    `${req.params.id}`,
    `tracks-${req.params.time}`
  );
  if (tracksInfo) {
    res.status(200).send(tracksInfo);
  } else {
    let accessToken = await redisClient.hgetAsync(
      `${req.params.id}`,
      "accesstoken"
    );
    let result = {};
    if (accessToken) {
      try {
        var {
          data,
        } = await axios.get(
          `https://api.spotify.com/v1/me/top/tracks?time_range=${req.params.time}&limit=20`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        result = JSON.stringify(data.items);
        await redisClient.hsetAsync(
          `${req.params.id}`,
          `tracks-${req.params.time}`,
          result
        );
        var todayEnd = new Date().setHours(23, 59, 59, 999);
        redisClient.expireat(
          `artists-${req.params.time}`,
          parseInt(todayEnd / 1000)
        );
      } catch (e) {
        console.log(e);
        res.status(500);
      }
    }
    res.status(200).send(result);
  }
});
app.get("/stats/:id", cors(), async (req, res) => {
  let tracksInfo = await redisClient.hgetAsync(
    `${req.params.id}`,
    `tracks-long_term`
  );
  let artistsInfo = await redisClient.hgetAsync(
    `${req.params.id}`,
    `artists-long_term`
  );
  var t = JSON.parse(tracksInfo);
  var a = JSON.parse(artistsInfo);
  var trackList = [];

  t.forEach((item) => {
    trackList.push(item.name);
  });

  var artistList = [];

  a.forEach((item) => {
    artistList.push(item.name);
  });

  const info = {
    artists: artistList,
    tracks: trackList,
  };
  let result = JSON.stringify(info);
  res.status(200).send(result);
});

var Parser = bodyParser.text({ type: "text/html" });
app.post("/pdf", cors(), Parser, async (req, res) => {
  var htmlContent = req.body;
  try {
    wkhtmltopdf(
      htmlContent,
      {
        output: "topStats.pdf",
        pageSize: "letter",
      },
      function (err, stream) {
        res.status(200).send("okay");
      }
    );
  } catch (e) {
    console.log(e);
    res.status(500);
  }
});
app.get("/download", async (req, res) => {
  res.download(
    path.join(__dirname, "/topStats.pdf"),
    "topStats.pdf",
    function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("it worked");
      }
    }
  );
});

// prettier-ignore
app.post("/:id/:playlistId/playlistImage", upload.single("file"), async (req, res) => {
  //Help from https://stackoverflow.com/questions/36477145/how-to-upload-image-file-and-display-using-express-nodejs
  let expDate = Date.parse(
    await redisClient.hgetAsync(`${req.params.id}`, "expiresAt")
  );
  let curDate = new Date();
  if (curDate > expDate) {
    refreshSpotifyToken(req.params.id);
  }
  let accessToken = await redisClient.hgetAsync(
    `${req.params.id}`,
    "accesstoken"
  );
  if (accessToken) {
    try {
      if (req.file.originalname.slice(-4) !== ".png" &&  req.file.originalname.slice(-4) !== ".jpg" && req.file.originalname.slice(-5) !== ".jpeg"){
        res.status(400).json({message: "Image must be a .png or .jpg or .jpeg"});
        return;
      } else {
        var file = __dirname + "/tmp/" + req.file.originalname;
        fs.rename(req.file.path, file, async function (err) {
          if (err) {
            console.log(err);
            fs.unlinkSync(req.file.path);
            res.status(500);
          } else {
                let output = `${__dirname}/tmp/playlistImg.jpg`;
                await exec(`convert "${file}" -define jpeg:extent=190kb "${output}"`);
                    let image = await fs.promises.readFile(__dirname + "/tmp/playlistImg.jpg");
                    let send = Buffer.from(image).toString('base64');
                    try {
                      await axios.put(
                        `https://api.spotify.com/v1/playlists/${req.params.playlistId}/images`,
                        send,
                        {
                          headers: { 
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "image/jpeg"
                          },
                        }
                      );
                      let result = {
                        message: "Successfully updated playlist cover image!",
                        reload: true
                      };
                      res.status(200).send(result);
                      fs.unlinkSync(file);
                      fs.unlinkSync(output);
                    } catch (e) {
                      console.log(e);  
                      res.send({ message: "Could not update playlist cover image. Try a different image.", reload: false });
                      fs.unlinkSync(file);
                      fs.unlinkSync(output);
                    }
          }
      });

    }
      } catch (e) {
        console.log(e);
        res.status(500);
      }
    } else {
      console.log("no access token");
      res.status(500);
    }
  }
);

// Get all the playlists of the current user
app.get("/playlists/:id", cors(), async (req, res) => {
  let expDate = Date.parse(
    await redisClient.hgetAsync(`${req.params.id}`, "expiresAt")
  );
  let curDate = new Date();
  if (curDate > expDate) {
    refreshSpotifyToken(req.params.id);
  }
  let accessToken = await redisClient.hgetAsync(
    `${req.params.id}`,
    "accesstoken"
  );
  let result = {};
  if (accessToken) {
    try {
      let uid = req.params.id;
      if (uid.indexOf("spotify:") === 0) {
        uid = uid.substring(uid.indexOf(":") + 1, uid.length);
      }
      const { data } = await axios.get(
        `https://api.spotify.com/v1/users/${uid}/playlists?limit=48`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      result = JSON.stringify(data.items);
      res.status(200).send(result);
    } catch (e) {
      console.log(e);
      res.status(500);
    }
  } else {
    console.log("no access token");
    res.status(500);
  }
});

// Create a playlist of the artist's top tracks
app.post("/playlists/:id/:artistId", cors(), async (req, res) => {
  let expDate = Date.parse(
    await redisClient.hgetAsync(`${req.params.id}`, "expiresAt")
  );
  let curDate = new Date();
  if (curDate > expDate) {
    refreshSpotifyToken(req.params.id);
  }
  let accessToken = await redisClient.hgetAsync(
    `${req.params.id}`,
    "accesstoken"
  );
  if (accessToken) {
    try {
      let uid = req.params.id;
      if (uid.indexOf("spotify:") === 0) {
        uid = uid.substring(uid.indexOf(":") + 1, uid.length);
      }
      const { data } = await axios.get(
        `https://api.spotify.com/v1/artists/${req.params.artistId}/top-tracks?country=us`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      let tracks = data.tracks;
      let artists = tracks[0].artists;
      let artistName = "";

      for (let i = 0; i < artists.length; i++) {
        if (artists[i].id === req.params.artistId) {
          artistName = artists[i].name;
        }
      }

      const playlist = await axios.post(
        `https://api.spotify.com/v1/users/${uid}/playlists?limit=50`,
        {
          name: "Top Tracks from " + artistName,
          public: false,
          description: "Generated by Unwrapped :)",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      let playlistData = playlist.data;

      let trackArr = [];
      for (let i = 0; i < tracks.length; i++) {
        trackArr.push(tracks[i].uri);
      }

      let trackBody = {
        uris: trackArr,
      };
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
        trackBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      res.status(200).send(playlistData.id);
    } catch (e) {
      console.log(e);
      res.status(500);
    }
  } else {
    console.log("no access token");
    res.status(500);
  }
});

// Get a specific playlist
app.get("/playlists/:id/:playlistId", cors(), async (req, res) => {
  let expDate = Date.parse(
    await redisClient.hgetAsync(`${req.params.id}`, "expiresAt")
  );
  let curDate = new Date();
  if (curDate > expDate) {
    refreshSpotifyToken(req.params.id);
  }
  let accessToken = await redisClient.hgetAsync(
    `${req.params.id}`,
    "accesstoken"
  );
  let result = {};
  if (accessToken) {
    try {
      const { data } = await axios.get(
        `https://api.spotify.com/v1/playlists/${req.params.playlistId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      result = JSON.stringify(data);
      res.status(200).send(result);
    } catch (e) {
      console.log(e);
      res.send({ errorMessage: "Playlist not found" });
    }
  } else {
    console.log("no access token");
    res.status(500);
  }
});

app.listen(9000, () => {
  console.log("Server is running!");
  console.log("Your routes will be running on http://localhost:9000");
});
