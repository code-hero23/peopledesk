const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get the latest active popup config
exports.getPopupConfig = async (req, res) => {
    try {
        const config = await prisma.popupConfig.findFirst({
            orderBy: { updatedAt: 'desc' }
        });
        res.status(200).json(config);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching popup config', error: error.message });
    }
};

// Create or update popup config
exports.updatePopupConfig = async (req, res) => {
    const { quote, author, isActive, imageUrl, type } = req.body;
    try {
        // Normalize imageUrl: ensure it uses /api/uploads/ for Nginx compatibility
        const cleanImageUrl = typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/')
            ? `/api${imageUrl}`
            : imageUrl;

        // We only keep one main config for now, find the latest one or create a new one.
        let config = await prisma.popupConfig.findFirst({
            orderBy: { updatedAt: 'desc' }
        });

        if (config) {
            config = await prisma.popupConfig.update({
                where: { id: config.id },
                data: {
                    quote: quote !== undefined ? quote : config.quote,
                    author: author !== undefined ? author : config.author,
                    isActive: isActive !== undefined ? isActive : config.isActive,
                    imageUrl: cleanImageUrl !== undefined ? cleanImageUrl : config.imageUrl,
                    type: type !== undefined ? type : config.type
                }
            });
        } else {
            config = await prisma.popupConfig.create({
                data: {
                    quote: quote || "Inspiration of the day",
                    author: author || "Visionary",
                    isActive: isActive !== undefined ? isActive : true,
                    imageUrl: cleanImageUrl || "",
                    type: type || "INSPIRATIONAL"
                }
            });
        }

        res.status(200).json({ message: 'Popup configuration updated successfully', config });
    } catch (error) {
        res.status(500).json({ message: 'Error updating popup config', error: error.message });
    }
};
