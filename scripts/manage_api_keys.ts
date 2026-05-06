import { UserModel } from "../src/server/models/User";
import { parseArgs } from "util";
import { initDb } from "../src/server/db";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    user: { type: "string" },
    rotate: { type: "boolean", default: false },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.user) {
  console.error("Usage: bun scripts/manage_api_keys.ts --user <username> [--rotate]");
  process.exit(1);
}

await initDb();

const user = UserModel.findByUsername(values.user);

if (!user) {
  console.error(`User not found: ${values.user}`);
  process.exit(1);
}

if (values.rotate) {
  const newKey = UserModel.generateApiKey(user.id);
  console.log(`New API Key for ${user.username}: ${newKey}`);
} else {
  console.log(`Current API Key for ${user.username}: ${user.api_key || "None"}`);
}
