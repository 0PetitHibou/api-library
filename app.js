// import bodyParser from 'body-parser';
import express from 'express';
import cors from 'cors';
import session from "express-session";
import bcrypt from 'bcrypt';
import {createUser, db} from "./config/db.js"

const app = express();
app.set("db", db);
const CLIENT_ORIGIN = "http://127.0.0.1:5501";


// Middleware
app.use(cors(
  {
    origin: CLIENT_ORIGIN,
    credentials: true
  }
));
app.use(express.json());

// Lancer le serveur
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Ajouter un utilisateur
app.post("/users", async (req, res) => {
  const { first_name, last_name, birth_date, mail, password } = req.body;
  const user = await createUser(first_name, last_name, birth_date, mail, password);
  res.status(201).send(user);
})

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,

  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60
  }
}));

app.post("/login", async (req, res) => {

  const {mail, password} = req.body;

  if (!mail || !password) {return res.status(400).json({ message: "Champs manquants" });}

  try {
    const db = app.get("db");
    const [rows] = await db.query('SELECT * FROM users WHERE mail = ?', [mail]);

    if (rows.length === 0) {return res.status(401).json({ error: "Utilisateur non trouvé." });
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {return res.status(401).json({ error: "Mot de passe incorrect." });}

  req.session.user = {
    id: user.id,
    mail: user.mail,
    first_name: user.first_name,
    last_name: user.last_name
  };

  res.status(200).json({ message: "Connexion réussie." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Une erreur est survenue." });
  }

})

app.get("/session", (req, res) => {

  if (req.session.user) {
    res.json({
      mail: req.session.user.mail,
      isLogged: true
    });
  } else {
    res.json({
      mail: null,
      isLogged: false
    });
  }

});

