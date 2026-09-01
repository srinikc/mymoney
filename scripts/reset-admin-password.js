const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const url = process.argv[2];
const newPassword = process.argv[3];
const email = process.argv[4] || "srinikc@gmail.com";

if (!url || !newPassword) { console.error("Usage: node reset-admin-password.js <DB_URL> <new_password> [email]"); process.exit(1); }

const prisma = new PrismaClient({ datasources: { db: { url } } });

(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) { console.error("No user found with email:", email); return; }

    const hash = await bcrypt.hash(newPassword, 12);
    const verify = await bcrypt.compare(newPassword, hash);
    console.log("Fresh hash verify:", verify);

    await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: hash } });

    const reRead = await prisma.user.findUnique({ where: { id: user.id }, select: { hashedPassword: true } });
    const reVerify = await bcrypt.compare(newPassword, reRead.hashedPassword);
    console.log("DB roundtrip verify:", reVerify);
    console.log("Password reset", reVerify ? "SUCCESS" : "FAILED");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
