import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { seedAdmins } from "./utils/seedAdmins.js";
import { verifyMailer } from "./utils/mailer.js";

const PORT = process.env.PORT || 4000;

await connectDB();
await seedAdmins();
await verifyMailer();

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
 