// import bodyParser from 'body-parser';
import express from 'express';
import cors from 'cors';
import  jwt  from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {createUser, db} from "./config/db.js"
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.set("db", db);

// Middleware
app.use(cors());
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

app.post("/login", async (req, res) => {

	const { mail, password } = req.body;

	if (!mail || !password) {
		return res.status(400).json({ message: "Champs manquants" });
	}

	try {
		const db = app.get("db");
		const [rows] = await db.query('SELECT * FROM users WHERE mail = ?', [mail]);

		if (rows.length === 0) {
		return res.status(401).json({ error: "Utilisateur non trouvé." });
		}

		const user = rows[0];
		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
		return res.status(401).json({ error: "Mot de passe incorrect." });
		}
		
		const token = jwt.sign({ id: user.id, mail:user.mail }, process.env.JWT_SECRET, { expiresIn: "1h" });


		res.status(200).json({ message: "Connexion réussie.",
			user: {
				id: user.id,
				first_name: user.first_name,
				last_name: user.last_name,
				birth_date: user.birth_date,
				mail: user.mail
			},
			token
		 });

	} catch (error) {
	console.error(error);
	res.status(500).json({ error: "Une erreur est survenue." });
	}
});

// Création de Middleware
function checkToken(req, res, next) {
	if(!req.headers.authorization) return res.status(401).send("Unauthorized"); 

	// verifier le token en décriptant le token via la clé
	jwt.verify(req.headers.authorization, process.env.JWT_SECRET, (err, decoded) => {
		if(err) return res.status(401).send("Unauthorized");
		req.user = {
			id: decoded.id,
			mail: decoded.mail
		}
	});

	next()
}

app.get("/account" , checkToken, async (req, res) => {

	res.send("account");
});

