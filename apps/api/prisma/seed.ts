import { PrismaClient, Role, Category, BudgetType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  const superadminEmail = (process.env.ADMIN_EMAIL ?? "superadmin").toLowerCase();
  const superadminPassword = process.env.ADMIN_PASSWORD ?? "admin1234";
  const superadminName = process.env.ADMIN_NAME ?? "BuildScience Hokimiyat";
  const superadminPhone = process.env.ADMIN_PHONE ?? "+998901234567";

  await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      role: Role.SUPERADMIN,
      name: superadminName,
      email: superadminEmail,
      phone: superadminPhone,
      passwordHash: await hash(superadminPassword),
      status: "ACTIVE",
    },
  });

  const adminPassword = await hash("Company12345!");
  const userPassword = await hash("Scientist12345!");

  const adminA = await prisma.user.upsert({
    where: { email: "qurilish-invest@buildscience.local" },
    update: {},
    create: {
      role: Role.ADMIN,
      name: "QurilishInvest MChJ",
      email: "qurilish-invest@buildscience.local",
      phone: "+998901112233",
      passwordHash: adminPassword,
      status: "ACTIVE",
    },
  });

  const adminB = await prisma.user.upsert({
    where: { email: "betonstroy@buildscience.local" },
    update: {},
    create: {
      role: Role.ADMIN,
      name: "BetonStroy Servis",
      email: "betonstroy@buildscience.local",
      phone: "+998902223344",
      passwordHash: adminPassword,
      status: "ACTIVE",
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: "aziz.karimov@buildscience.local" },
    update: {},
    create: {
      role: Role.USER,
      name: "Aziz Karimov",
      email: "aziz.karimov@buildscience.local",
      phone: "+998903334455",
      passwordHash: userPassword,
      organization: "Toshkent Arxitektura-Qurilish Instituti",
      specialization: "Beton texnologiyalari",
      bio: "10 yillik tajribaga ega beton texnologiyalari bo'yicha ilmiy xodim.",
      status: "ACTIVE",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "nodira.yusupova@buildscience.local" },
    update: {},
    create: {
      role: Role.USER,
      name: "Nodira Yusupova",
      email: "nodira.yusupova@buildscience.local",
      phone: "+998904445566",
      passwordHash: userPassword,
      organization: "O'zbekiston Milliy Universiteti, Kimyo fakulteti",
      specialization: "Qurilish kimyosi",
      bio: "Sement va qorishma kimyoviy tarkibini optimallashtirish bo'yicha tadqiqotchi.",
      status: "ACTIVE",
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "bekzod.rahimov@buildscience.local" },
    update: {},
    create: {
      role: Role.USER,
      name: "Bekzod Rahimov",
      email: "bekzod.rahimov@buildscience.local",
      phone: "+998905556677",
      passwordHash: userPassword,
      organization: "Seysmik Barqarorlik Ilmiy-Tadqiqot Instituti",
      specialization: "Seysmik xavfsizlik",
      bio: "Zilzilaga chidamli konstruksiyalar bo'yicha muhandis-tadqiqotchi.",
      status: "ACTIVE",
    },
  });

  console.log("Accounts seeded:");
  console.log(`  Superadmin: ${superadminEmail} / ${superadminPassword}`);
  console.log("  Admin A:    qurilish-invest@buildscience.local / Company12345!");
  console.log("  Admin B:    betonstroy@buildscience.local / Company12345!");
  console.log("  User1:      aziz.karimov@buildscience.local / Scientist12345!");
  console.log("  User2:      nodira.yusupova@buildscience.local / Scientist12345!");
  console.log("  User3:      bekzod.rahimov@buildscience.local / Scientist12345!");

  if (process.env.NODE_ENV === "production" && process.env.SEED_FORCE !== "1") {
    console.log("NODE_ENV=production: skipping sample problems/mines/waste (accounts above are seeded).");
    console.log("Set SEED_FORCE=1 to force-reset sample data in production.");
    return;
  }

  await prisma.proposal.deleteMany({});
  await prisma.problem.deleteMany({});
  await prisma.mineImage.deleteMany({});
  await prisma.mine.deleteMany({});
  await prisma.wasteImage.deleteMany({});
  await prisma.waste.deleteMany({});

  const problem1 = await prisma.problem.create({
    data: {
      companyId: adminA.id,
      title: "Beton mustahkamligini 20 foizga oshirish yo'llari",
      description:
        "Bizning quyma beton mahsulotlarimiz standart mustahkamlik ko'rsatkichlariga ega, lekin loyihalarimiz uchun yuqoriroq mustahkamlik talab qilinmoqda. Mavjud xomashyo tarkibini o'zgartirmasdan yoki minimal qo'shimchalar bilan beton mustahkamligini kamida 20 foiz oshirish bo'yicha ilmiy asoslangan yechim izlaymiz. Ishlab chiqarish hajmi oyiga 500 kub metr.",
      category: Category.CONCRETE_CEMENT,
      budgetType: BudgetType.FIXED,
      budgetAmount: 25000000,
      status: "OPEN",
    },
  });

  const problem2 = await prisma.problem.create({
    data: {
      companyId: adminA.id,
      title: "Sement sarfini kamaytirish bo'yicha texnologik yechim",
      description:
        "Qurilish loyihalarimizda sement narxi umumiy xarajatning katta qismini tashkil etadi. Qorishma sifatini pasaytirmagan holda sement sarfini kamaytirish uchun alternativ bog'lovchi materiallar yoki texnologik yechimlar bo'yicha taklif kutamiz. Amaliy sinovdan o'tgan yechimlarga ustunlik beriladi.",
      category: Category.CONCRETE_CEMENT,
      budgetType: BudgetType.NEGOTIABLE,
      status: "OPEN",
    },
  });

  const problem3 = await prisma.problem.create({
    data: {
      companyId: adminB.id,
      title: "Energiya samaradorligi yuqori g'isht ishlab chiqarish",
      description:
        "Qish faslida issiqlik yo'qotilishini kamaytiradigan, issiqlik o'tkazuvchanligi past bo'lgan qurilish g'ishtlarini ishlab chiqarishni yo'lga qo'ymoqchimiz. Mavjud zavod uskunalarimizga moslashadigan tarkib va texnologiya bo'yicha ilmiy taklif kerak. Natija sinov namunalarida tasdiqlangan bo'lishi kerak.",
      category: Category.ENERGY_EFFICIENCY,
      budgetType: BudgetType.FIXED,
      budgetAmount: 18000000,
      status: "OPEN",
    },
  });

  const problem9 = await prisma.problem.create({
    data: {
      companyId: adminA.id,
      title: "Qurilish maydonchasida chang va shovqinni kamaytirish",
      description:
        "Shahar markazidagi qurilish maydonchamizda atrof-muhitga chang va shovqin ta'sirini kamaytirish bo'yicha amaliy va arzon yechimlar kerak. Sanitariya normalariga muvofiqlik muhim ahamiyatga ega.",
      category: Category.ECOLOGY,
      budgetType: BudgetType.FIXED,
      budgetAmount: 8000000,
      status: "OPEN",
    },
  });

  await prisma.proposal.create({
    data: {
      problemId: problem1.id,
      scientistId: user1.id,
      solutionText:
        "Beton tarkibiga mikrokremniy (silica fume) qo'shilishi va suv-sement nisbatini 0.45 dan 0.38 gacha kamaytirish orqali bosimga chidamlilikni 20-25 foizga oshirish mumkin. Ushbu usulni 3 xil qorishma nisbatida laboratoriya sharoitida sinovdan o'tkazishni taklif qilaman.",
      estimatedDays: 45,
      priceNegotiable: false,
      proposedPrice: 22000000,
      status: "PENDING",
    },
  });

  await prisma.proposal.create({
    data: {
      problemId: problem1.id,
      scientistId: user2.id,
      solutionText:
        "Beton tarkibiga polikarboksilat asosidagi superplastifikator va uchuvchi kul qo'shish orqali ham mustahkamlik, ham ishlanuvchanlikni yaxshilash mumkin. Tajriba-sinov bosqichi va ishlab chiqarish nazorati bo'yicha texnik xarita tayyorlab beraman.",
      estimatedDays: 30,
      priceNegotiable: true,
      status: "PENDING",
    },
  });

  const acceptedProposal = await prisma.proposal.create({
    data: {
      problemId: problem9.id,
      scientistId: user3.id,
      solutionText:
        "Vaqtinchalik akustik ekranlar va suv-tuman purkash tizimini birgalikda qo'llash orqali chang darajasini 70 foizga, shovqinni esa 15-20 dB ga kamaytirish mumkin. O'rnatish sxemasi va texnik hisob-kitobni taqdim etaman.",
      estimatedDays: 20,
      priceNegotiable: false,
      proposedPrice: 7200000,
      status: "PENDING",
    },
  });

  const rejectedProposal = await prisma.proposal.create({
    data: {
      problemId: problem9.id,
      scientistId: user1.id,
      solutionText:
        "Maydoncha perimetri bo'ylab vaqtinchalik yashil devor va tuproq namligini saqlovchi qoplama yordamida changni kamaytirish mumkin. Bu usul biroz sekinroq natija beradi, lekin uzoq muddatli ekologik foyda beradi.",
      estimatedDays: 35,
      priceNegotiable: true,
      status: "PENDING",
    },
  });

  await prisma.$transaction([
    prisma.proposal.update({ where: { id: acceptedProposal.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } }),
    prisma.proposal.update({ where: { id: rejectedProposal.id }, data: { status: "REJECTED" } }),
    prisma.problem.update({ where: { id: problem9.id }, data: { status: "MATCHED", matchedAt: new Date() } }),
  ]);

  await prisma.mine.create({
    data: {
      adminId: adminA.id,
      name: "Qibray Toshkoni",
      description: "Yirik don fraksiyali qurilish toshi konlari, doimiy yetkazib berish imkoniyati mavjud.",
      location: "Toshkent viloyati, Qibray tumani",
      rawMaterialType: "Qurilish toshi",
      volume: "500 000 m³",
    },
  });

  await prisma.mine.create({
    data: {
      adminId: adminB.id,
      name: "Zomin Ohaykoni",
      description: "Yuqori sifatli ohaktosh, sement va ohak ishlab chiqarish uchun mos.",
      location: "Jizzax viloyati, Zomin tumani",
      rawMaterialType: "Ohaktosh",
      volume: "1 200 000 tonna",
    },
  });

  await prisma.waste.create({
    data: {
      adminId: adminA.id,
      factoryName: "QurilishInvest beton zavodi",
      composition: "Beton sinig'i va changi, mayda fraksiyali qoldiqlar",
      volume: "40 tonna/oy",
      annualVolume: "480 tonna/yil",
      description: "Yo'l qurilishi va qayta ishlangan beton mahsulotlari uchun xomashyo sifatida ishlatilishi mumkin.",
    },
  });

  await prisma.waste.create({
    data: {
      adminId: adminB.id,
      factoryName: "BetonStroy g'isht zavodi",
      composition: "Kul-shlak aralashmasi",
      volume: "25 tonna/oy",
      annualVolume: "300 tonna/yil",
      description: "Engil betonlar va issiqlik izolyatsiyasi materiallari ishlab chiqarishda foydalanish mumkin.",
    },
  });

  console.log("Sample problems, proposals, mines va waste seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
