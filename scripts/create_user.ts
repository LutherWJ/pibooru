import { UserModel } from "../src/server/models/User";
import { initDb } from "../src/server/db";

async function main() {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        console.error("Usage: bun run scripts/create_user.ts <username> <password>");
        process.exit(1);
    }
    
    const [username, password] = args;
    
    await initDb();
    
    if (UserModel.findByUsername(username)) {
        console.error(`User '${username}' already exists.`);
        process.exit(1);
    }
    
    const userId = await UserModel.create(username, password);
    if (userId) {
        console.log(`User '${username}' created successfully with ID ${userId}.`);
    } else {
        console.error("Failed to create user.");
        process.exit(1);
    }
    
    process.exit(0);
}

main().catch(console.error);
