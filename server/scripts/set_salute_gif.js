require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateDb() {
    let c = await prisma.popupConfig.findFirst();
    if (c) {
        await prisma.popupConfig.update({
            where: { id: c.id },
            data: {
                imageUrl: '/uploads/salute.gif',
                quote: 'Salute to all dedicated team members who bring passion & excellence every single day!',
                author: 'Leadership & Team',
                isActive: true
            }
        });
    } else {
        await prisma.popupConfig.create({
            data: {
                imageUrl: '/uploads/salute.gif',
                quote: 'Salute to all dedicated team members who bring passion & excellence every single day!',
                author: 'Leadership & Team',
                isActive: true,
                type: 'INSPIRATIONAL'
            }
        });
    }
    console.log('✅ DB updated successfully with salute.gif!');
}

updateDb()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
