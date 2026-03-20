import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
config();
const prisma = new PrismaClient();
async function main() {
  const links = await prisma.$queryRawUnsafe('SELECT * FROM link_externo_documento');
  console.log("LINKS ENCONTRADOS NO BANCO:", JSON.stringify(links, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
