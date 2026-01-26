import mysql from "mysql2/promise";
import { env } from "./env";


const db = mysql.createPool({
  host: env.dbHOST,
  user: env.dbUSER,
  password: env.dbPASSWORD,
  database: env.dbNAME,
  port: env.dbPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// test the database connection
db.getConnection().then((connection) => {
  console.log("Connected to database successfully!✅");
  connection.release();
}).catch((err) => {
  console.error(`Connection to database failed!: ${err.stack}`)
})

export default db;