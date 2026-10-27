import {db,migrationsDir} from '../db.js';
const [n,l]=await db.migrate.latest({directory:migrationsDir});console.log(l.length?`Migrations run: ${l.join(', ')}`:'Schema is up to date.');await db.destroy();
