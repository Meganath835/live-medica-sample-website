'use strict';
require('dotenv').config();

const express  = require('express');
const session  = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─────────────────────────────────────────────
   JSON FILE STORE  (replaces better-sqlite3)
───────────────────────────────────────────── */
const DATA_DIR  = path.join(__dirname, 'data');
const DB_FILE   = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE))  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], nextId: 1 }));

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const store = {
  findByEmail(email) {
    return loadDB().users.find(u => u.email === email) || null;
  },
  findById(id) {
    return loadDB().users.find(u => u.id === id) || null;
  },
  findByGoogleIdOrEmail(googleId, email) {
    return loadDB().users.find(u => u.google_id === googleId || u.email === email) || null;
  },
  create({ email, username, password_hash = null, google_id = null, avatar_url = null }) {
    const db   = loadDB();
    const user = {
      id:            db.nextId++,
      email,
      username,
      password_hash,
      google_id,
      avatar_url,
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    saveDB(db);
    return user;
  },
  update(id, fields) {
    const db   = loadDB();
    const idx  = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(db.users[idx], fields);
    saveDB(db);
    return db.users[idx];
  },
};

/* ─────────────────────────────────────────────
   MIDDLEWARE
───────────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'livemedica-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,           // set true when running behind HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  }
}));

app.use(passport.initialize());
app.use(passport.session());

/* ─────────────────────────────────────────────
   PASSPORT — LOCAL STRATEGY
───────────────────────────────────────────── */
passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    try {
      const user = store.findByEmail(email.toLowerCase().trim());
      if (!user)
        return done(null, false, { message: 'No account found with this email.' });
      if (!user.password_hash)
        return done(null, false, { message: 'This account was created with Google. Please use Sign in with Google.' });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match)
        return done(null, false, { message: 'Incorrect password. Please try again.' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

/* ─────────────────────────────────────────────
   PASSPORT — GOOGLE OAUTH STRATEGY
   Only registered when credentials are present in .env
───────────────────────────────────────────── */
const googleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here' &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== 'your_google_client_secret_here';

if (googleConfigured) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/auth/google/callback`,
    },
    (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('Google did not return an email address.'));

        let user = store.findByGoogleIdOrEmail(profile.id, email);

        if (user) {
          if (!user.google_id) {
            user = store.update(user.id, {
              google_id:  profile.id,
              avatar_url: profile.photos?.[0]?.value || null,
            });
          }
          return done(null, user);
        }

        user = store.create({
          email,
          username:   profile.displayName || email.split('@')[0],
          google_id:  profile.id,
          avatar_url: profile.photos?.[0]?.value || null,
        });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
}

/* ─────────────────────────────────────────────
   PASSPORT SERIALIZATION
───────────────────────────────────────────── */
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  const user = store.findById(id);
  if (!user) return done(null, false);
  const { password_hash, ...safe } = user;
  done(null, safe);
});

/* ─────────────────────────────────────────────
   AUTH MIDDLEWARE
───────────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  const wantsJson = req.headers.accept?.includes('application/json') || req.xhr;
  if (wantsJson) return res.status(401).json({ authenticated: false });
  res.redirect('/login.html');
}

/* ─────────────────────────────────────────────
   AUTH ROUTES
───────────────────────────────────────────── */

// Register
app.post('/auth/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  if (store.findByEmail(email.toLowerCase().trim()))
    return res.status(400).json({ error: 'An account with this email already exists.' });

  try {
    const hash = await bcrypt.hash(password, 12);
    store.create({ email: email.toLowerCase().trim(), username: username.trim(), password_hash: hash });
    res.json({ success: true });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Login failed.' });

    req.logIn(user, err => {
      if (err) return next(err);
      res.json({
        success: true,
        user: { email: user.email, username: user.username, avatar: user.avatar_url }
      });
    });
  })(req, res, next);
});

// Logout
app.post('/auth/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ success: true }));
  });
});

// Current user info
app.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      email:    req.user.email,
      username: req.user.username,
      avatar:   req.user.avatar_url
    }
  });
});

// Google OAuth availability flag
app.get('/auth/google-enabled', (_req, res) => {
  res.json({ enabled: googleConfigured });
});

// Google OAuth flow
if (googleConfigured) {
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
  );
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html?error=google_failed' }),
    (req, res) => res.redirect('/')
  );
} else {
  app.get('/auth/google', (_req, res) => {
    res.redirect('/login.html?error=google_not_configured');
  });
}

/* ─────────────────────────────────────────────
   STATIC FILE SERVING
───────────────────────────────────────────── */
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js',  express.static(path.join(__dirname, 'js')));

app.get('/login.html', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/register.html', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/',           requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('*', (req, res) => res.redirect('/login.html'));

/* ─────────────────────────────────────────────
   START SERVER
───────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Live Medica running at http://localhost:${PORT}`);
  console.log(`  Google OAuth : ${googleConfigured ? '✓ Configured' : '✗ Not configured (see .env)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
