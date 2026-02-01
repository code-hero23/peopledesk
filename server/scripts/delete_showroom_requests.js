const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const deleteShowroomRequest = async () => {
    try {
        const requestId = process.argv[2];

        if (!requestId) {
            console.log('\nFetching all Showroom Visit Requests...\n');
            const requests = await prisma.showroomVisitRequest.findMany({
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (requests.length === 0) {
                console.log('No Showroom Visit Requests found.');
            } else {
                console.table(requests.map(req => ({
                    ID: req.id,
                    User: req.user.name,
                    Code: req.user.code,
                    Date: new Date(req.date).toLocaleDateString(),
                    Source: req.sourceShowroom,
                    Dest: req.destinationShowroom,
                    Status: req.status
                })));
                console.log('\nTo delete a request, run: node scripts/delete_showroom_requests.js <ID>');
            }
        } else {
            const id = parseInt(requestId);
            if (isNaN(id)) {
                console.error('Invalid ID provided. Please provide a numeric ID.');
                process.exit(1);
            }

            console.log(`\nAttempting to delete Showroom Visit Request with ID: ${id}...`);

            const deleted = await prisma.showroomVisitRequest.delete({
                where: { id: id }
            });

            console.log(`Successfully deleted request ID ${id} (User: ${deleted.userId}, Date: ${new Date(deleted.date).toLocaleDateString()})`);
        }
    } catch (error) {
        if (error.code === 'P2025') {
            console.error('Error: Request not found or already deleted.');
        } else {
            console.error('Target error:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
};

deleteShowroomRequest();
