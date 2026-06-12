"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting seed...');
    // Create default branch
    const defaultBranch = await prisma.branch.upsert({
        where: { id: 'default-branch' },
        update: {},
        create: {
            id: 'default-branch',
            name: 'Main Branch',
            location: 'Downtown',
        },
    });
    console.log('✅ Default branch created:', defaultBranch.name);
    console.log('🎉 Seeding completed!');
}
main()
    .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
