import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@animeforge.ai";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Demo user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.create({
    data: {
      name: "Demo Creator",
      email,
      passwordHash,
    },
  });

  await prisma.creditTransaction.create({
    data: { userId: user.id, amount: 200, reason: "signup_bonus" },
  });

  console.log("──────────────────────────────────────────────");
  console.log(" Demo account ready:");
  console.log(`   email:    ${email}`);
  console.log("   password: demo1234");
  console.log("──────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
