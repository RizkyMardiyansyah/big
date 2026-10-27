import {db} from '../db.js';import {seed,seedContent} from '../seedData.js';
console.log(await seed(db)?'Initial data (roles, permissions, workflows) inserted.':'Roles/permissions already exist, skipped.');await seedContent(db);console.log('Landing content checked/inserted.');await db.destroy();
