const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const session = require('express-session');
const dotenv = require('dotenv');
const randomString = require('randomstring');
const User = require('../database/user.js');
const app = require('./index');

const scope = [
  'user-read-email',
  'streaming',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-library-read',
  'playlist-read-private',
  'user-library-modify',
  'playlist-modify-public',
  'user-read-recently-played',
  'user-read-private',
  'playlist-modify-private',
  'user-top-read',
  'user-read-birthdate',
];

dotenv.config({ silent: true });

app.use(session({ secret: 'tampa vice', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new SpotifyStrategy(
  {
    clientID: process.env.SPOTIFY_ID,
    clientSecret: process.env.SPOTIFY_SECRET,
    callbackURL: 'http://localhost:8082/auth/spotify/callback',
  },
  (accessToken, refreshToken, expiresIn, profile, done) => {
    User.findOrCreate(
      {
        spotifyId: profile.id,
        accessToken,
        refreshToken,
        expiresIn,
      },
      (err, user) => done(err, user),
    );
  },
));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/auth/loggedin', (req, res) => {
  if (req.isAuthenticated()) {
    User.sessionCheck(req.sessionID)
      .then((user) => {
        res.send({ loggedIn: true, username: user.username });
      })
      .catch(console.error);
  } else res.send({ loggedIn: false });
});

app.get('/auth/spotify', passport.authenticate('spotify', { scope, showDialog: true }), (req) => req);

app.get(
  '/auth/spotify/callback*',
  passport.authenticate('spotify', {
    failureRedirect: '/login',
  }),
  (req, res) => {
    const newRoom = randomString.generate({
      length: 5,
      capitalization: 'lowercase',
      readable: true,
    });
    const { user } = req._passport.session; //eslint-disable-line
    User.sessionAdd(user, req.sessionID, newRoom);
    res.redirect(`http://localhost:8080/#/room/${newRoom}`);
  },
);
