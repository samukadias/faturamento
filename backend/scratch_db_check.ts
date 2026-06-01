import prisma from "./src/db";

async function main() {
  const notes = await prisma.notaFiscal.findMany({
    where: {
      OR: [
        { razaoSocial: { contains: "IMESP", mode: "insensitive" } },
        { razaoSocial: { contains: "DIÁRIO", mode: "insensitive" } },
        { razaoSocial: { contains: "DIARIO", mode: "insensitive" } }
      ]
    }
  });
  console.log(`Total rows with IMESP/DIARIO in RS: ${notes.length}`);
  console.log("Sample rows:", JSON.stringify(notes.slice(0, 10), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
