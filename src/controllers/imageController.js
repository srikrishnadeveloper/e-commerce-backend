const fs = require('fs').promises;
const path = require('path');

// @desc    Get all available images from the images directory
// @route   GET /api/images
// @access  Public (for admin interface)
const getAllImages = async (req, res) => {
  try {
    const imagesPath = path.join(__dirname, '..', '..', '..', 'images');
    
    // Read the images directory
    const files = await fs.readdir(imagesPath, { withFileTypes: true });
    
    // Filter for image files and get their details
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    const images = [];
    
    for (const file of files) {
      if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          try {
            const filePath = path.join(imagesPath, file.name);
            const stats = await fs.stat(filePath);
            
            images.push({
              name: file.name,
              path: `/images/${file.name}`,
              size: stats.size,
              modified: stats.mtime,
              extension: ext
            });
          } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
          }
        }
      } else if (file.isDirectory()) {
        // Handle subdirectories
        try {
          const subDirPath = path.join(imagesPath, file.name);
          const subFiles = await fs.readdir(subDirPath, { withFileTypes: true });
          
          for (const subFile of subFiles) {
            if (subFile.isFile()) {
              const ext = path.extname(subFile.name).toLowerCase();
              if (imageExtensions.includes(ext)) {
                try {
                  const filePath = path.join(subDirPath, subFile.name);
                  const stats = await fs.stat(filePath);
                  
                  images.push({
                    name: subFile.name,
                    path: `/images/${file.name}/${subFile.name}`,
                    size: stats.size,
                    modified: stats.mtime,
                    extension: ext,
                    directory: file.name
                  });
                } catch (error) {
                  console.error(`Error reading file ${file.name}/${subFile.name}:`, error);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error reading directory ${file.name}:`, error);
        }
      }
    }
    
    // Sort images by name
    images.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    console.error('Error reading images directory:', error);
    res.status(500).json({
      success: false,
      message: 'Error reading images directory',
      error: error.message
    });
  }
};

module.exports = {
  getAllImages
};
