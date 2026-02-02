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
    const { quote, author, isActive, imageUrl } = req.body;
    try {
        // We only keep one main config for now, but we can have history.
        // For simplicity, we find the first one or create a new one.
        let config = await prisma.popupConfig.findFirst();

        if (config) {
            config = await prisma.popupConfig.update({
                where: { id: config.id },
                data: {
                    quote: quote !== undefined ? quote : config.quote,
                    author: author !== undefined ? author : config.author,
                    isActive: isActive !== undefined ? isActive : config.isActive,
                    imageUrl: imageUrl !== undefined ? imageUrl : config.imageUrl
                }
            });
        } else {
            config = await prisma.popupConfig.create({
                data: {
                    quote: quote || "Inspiration of the day",
                    author: author || "Visionary",
                    isActive: isActive !== undefined ? isActive : true,
                    imageUrl: imageUrl || ""
                }
            });
        }

        res.status(200).json({ message: 'Popup configuration updated successfully', config });
    } catch (error) {
        res.status(500).json({ message: 'Error updating popup config', error: error.message });
    }
};
