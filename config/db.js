import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';


export const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'library'
});

export async function getUser(id)
{
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id])
  return rows[0]
}

export async function createUser(firstName ,lastName, birthDate, mail, password)
{
  const [rows] = await db.query('SELECT * FROM users WHERE mail = ?', [mail]);

  if( rows.length === 0){
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users(first_name, last_name, birth_date, mail, password) VALUES (?,?,?,?,?)',[firstName, lastName, birthDate, mail, hashedPassword])

    return 'success Utilisateur créé';
    
  } else {
    return 'error email déjà existant';
  }
}

export async function addBook(cover, title, author, publish_year)
{

  const [rows] = await db.query('INSERT INTO books(cover, title, author, publish_year) VALUES (?,?,?,?)',[cover, title, author, publish_year])
  return {
    id: rows.insertId,
    cover: cover,
    title: title,
    author: author,
    publish_year: publish_year
  }

}

export async function getBook(id)
{
  const [rows] = await db.query('SELECT * FROM books WHERE id = ?', [id])
  return rows[0]
}

export async function getBooks()
{
  const [rows] = await db.query('SELECT * FROM books')
  return rows
}