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

    return {
      id: result.insertId,
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      mail: mail
    }
    
  } else {
    return 'email déjà existant';
  }
} 
