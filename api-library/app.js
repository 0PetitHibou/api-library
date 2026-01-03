// import bodyParser from 'body-parser';
import express from 'express';
import cors from 'cors';
import  jwt  from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {createUser, db, getBooks, getBooksById} from "./config/db.js"
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.set("db", db);

// Middleware
app.use(cors());
app.use(express.json());

// Création de Middleware
function checkToken(req, res, next) {

	const authHeader = req.headers.authorization
	if(!authHeader) return res.status(401).send("Unauthorized"); 

	const token = authHeader.split(" ")[1]

	// verifier le token en décriptant le token via la clé
	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
		if(err) return res.status(401).send("Unauthorized");

		req.user = {
			id: decoded.id,
			mail: decoded.mail
		}
		// appel d'un endpoint ou middleware
		// Middleware : action qu'on fait avant endpoint
		// endpoint :  dernier action que ta requete fait
		console.log("deco. token", decoded)
		next()
	});

}

// Lancer le serveur
const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Serveur démarré sur le port ${PORT}`);
});





app.post("/users", async (req, res) => {
    const { firstName, lastName, mail, password } = req.body;

    try {
        const response = await createUser(firstName, lastName, mail, password);

        if (response?.error) {
            return res.status(400).json({ error: response.error });
        }

		const token = jwt.sign(
			{ id: response.id, mail: response.mail },process.env.JWT_SECRET || "secret",{ expiresIn: "1h" }
		)

        res.status(201).json({ message: "Inscription effectuée",
			token: token,
			user: {
                id: response.id,
                first_name: response.first_name,
                last_name: response.last_name,
                mail: response.mail
            }
		 });


    } catch (err) {
        console.error("Erreur création utilisateur :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});




app.post("/books", async (req, res) => {
	const { cover, title, author, publish_year } = req.body;
	const book = await addBook(cover, title, author, publish_year);
	res.status(201).send(book);
})


app.get("/books", async (req, res) => {
	const rows = await getBooks();
	res.status(200).send(rows);
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
		console.log("JWT", process.env.JWT_SECRET)

		const token = jwt.sign({ id: user.id, mail:user.mail },
			process.env.JWT_SECRET,
			{ expiresIn: "1h" });

		

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

		 console.log(user.id)

	} catch (error) {
	console.error(error);
	res.status(500).json({ error: "Une erreur est survenue." });
	}
});


app.get("/account" , checkToken, async (req, res) => {

	res.send({"account": req.user});
});

app.put("/account" , checkToken, async (req, res) => {

	const { mail } = req.body;
	const userId = req.user.id;

	console.log("mail", mail)
	console.log("id", userId)

	try {
		const db = app.get("db")
		await db.query("UPDATE users SET mail = ? WHERE id = ?", [mail, userId])
		res.json({ message : "Email mis à jour"})
		
	} catch(error) {
		console.error(error)
		res.status(500).json({ error : "Erreur serveur"})
	}

})

app.post("/user/books", checkToken, async (req, res) => {
	
	const userId = req.user.id
	const { bookApiId } = req.body

	console.log("userId", userId)
	console.log("bookId", bookApiId)

	try {

		const db = app.get("db")

		await db.query(
			"INSERT INTO user_books (user_id, book_api_id) VALUES (?, ?)", [userId, bookApiId]
		);

		res.status(200).json({ message : "Livre ajouté"})
	} catch (error) {
		console.log("erreur livre ajouté", error)
		res.status(500).json({error : "Erreur serveur"})
	}

})

app.get("/my-books", checkToken, async (req, res) => {
	const userId = req.user.id

	try {
		const db = app.get("db")

		const [rows] = await db.query(
			"SELECT * FROM user_books WHERE user_id = ?", [userId]
		);

		res.status(201).json(rows)

	} catch (error) {
		console.log(error)
		res.status(500).json({ error: "Erreur serveur - recup livre"})
	}

})

app.get("/books/:id", async (req, res) => {
    const bookId = req.params.id; // ex: "OL40226464W"

    try {

        const response = await fetch(`https://openlibrary.org/works/${bookId}.json`);
        if (!response.ok) {
            return res.status(404).json({ error: "Livre introuvable" });
        }

        const data = await response.json();

        let authorName = "Auteur inconnu";
        if (data.authors && data.authors.length > 0) {
            try {
                const authorRes = await fetch(`https://openlibrary.org${data.authors[0].author.key}.json`);
                const authorData = await authorRes.json();
                authorName = authorData.name;
            } catch {}
        }

        res.json({
            key: `/works/${bookId}`,
            title: data.title,
            cover_i: data.covers ? data.covers[0] : null,
            author_name: [authorName],
            first_publish_year: data.first_publish_year || "Inconnue"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.delete("/user/books/:bookApiId", checkToken, async (req, res) => {
    const userId = req.user.id;
    const { bookApiId } = req.params;
	const bookIdFull =  `/works/${bookApiId}`
	console.log("userid:", userId, "bookid", bookApiId)

    try {
        const db = app.get("db");
        await db.query(
            "DELETE FROM user_books WHERE user_id = ? AND book_api_id = ?",
            [userId, bookIdFull]
        );

        res.status(200).json({ message: "Livre supprimé" });
    } catch (error) {
        console.log("Erreur suppression livre :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});