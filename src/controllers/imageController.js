const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

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

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imagesPath = path.join(__dirname, '..', '..', '..', 'images');
    cb(null, imagesPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files at once
  }
});

// @desc    Upload images to the images directory
// @route   POST /api/images/upload
// @access  Public (for admin interface)
const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      name: file.filename,
      originalName: file.originalname,
      path: `/images/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      data: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message
    });
  }
};

// @desc    Delete an image from the images directory
// @route   DELETE /api/images/:filename
// @access  Public (for admin interface)
const deleteImage = async (req, res) => {
  try {
    const { filename } = req.params;
    const imagesPath = path.join(__dirname, '..', '..', '..', 'images');
    const filePath = path.join(imagesPath, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Delete the file
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

module.exports = {
  getAllImages,
  uploadImages,
  deleteImage,
  upload
};
