import { initDb, getKohaDb, getDb } from './src/db.js';

async function main() {
  try {
    await initDb();
    const koha = getKohaDb();
    const [rows] = await koha.query('SELECT itemcallnumber FROM items WHERE itemcallnumber IS NOT NULL AND itemcallnumber != "" LIMIT 15');
    console.log('Sample itemcallnumbers:', rows);

    const [rows621] = await koha.query('SELECT biblionumber, itemcallnumber FROM items WHERE itemcallnumber LIKE "%621.4%" LIMIT 5');
    console.log('Sample 621.4:', rows621);
  } catch (e) {
    console.error('DB Error:', e.message);
  }
  process.exit();
}

main();
