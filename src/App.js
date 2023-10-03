import React from "react";
import { AuthProvider } from "./firebase/Auth";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Playlists from "./components/Playlists";
import PlaylistTracks from "./components/PlaylistTracks";
import Stats from "./components/Stats";
import Nav from "./components/Nav";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1>
              <Link to="/" className="Title-link">
                Unwrapped
              </Link>
            </h1>
            <Nav />
          </header>
          <div className="App-body">
            <br />
            <Route exact path="/" component={Home} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/logout" component={Logout} />
            <Route exact path="/stats" component={Stats} />
            <Route exact path="/playlists" component={Playlists} />
            {/* prettier-ignore */}
            <Route exact path="/playlists/:playlistId" component={PlaylistTracks} />
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
