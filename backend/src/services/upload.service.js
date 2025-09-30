/**
 * File Upload Service
 * Handles file uploads, processing, and storage
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errors');

class FileUploadService {
  constructor() {
    this.uploadDir = config.upload.directory;
    this.maxFileSize = config.upload.maxFileSize;
    this.allowedMimeTypes = config.upload.allowedMimeTypes;
    
    this.initialize();
  }

  /**
   * Initialize upload directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'receipts'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'avatars'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'temp'), { recursive: true });
      logger.info('Upload directories initialized');
    } catch (error) {
      logger.error('Failed to create upload directories', { error: error.message });
    }
  }

  /**
   * Get multer storage configuration
   */
  getStorage(subDir = 'temp') {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(this.uploadDir, subDir));
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });
  }

  /**
   * Get multer memory storage for processing
   */
  getMemoryStorage() {
    return multer.memoryStorage();
  }

  /**
   * File filter for validation
   */
  fileFilter(allowedTypes = this.allowedMimeTypes) {
    return (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, `Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
      }
    };
  }

  /**
   * Create multer upload middleware for receipts
   */
  receiptUpload() {
    return multer({
      storage: this.getMemoryStorage(),
      limits: {
        fileSize: this.maxFileSize,
        files: 1
      },
      fileFilter: this.fileFilter(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
    }).single('receipt');
  }

  /**
   * Create multer upload middleware for avatars
   */
  avatarUpload() {
    return multer({
      storage: this.getMemoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB for avatars
        files: 1
      },
      fileFilter: this.fileFilter(['image/jpeg', 'image/png', 'image/webp'])
    }).single('avatar');
  }

  /**
   * Process and save receipt image
   * @param {Buffer} buffer - Image buffer
   * @param {string} billId - Associated bill ID
   * @returns {Promise<Object>}
   */
  async processReceiptImage(buffer, billId) {
    const filename = `${billId}_${uuidv4()}.jpg`;
    const filepath = path.join(this.uploadDir, 'receipts', filename);
    const thumbnailFilename = `${billId}_${uuidv4()}_thumb.jpg`;
    const thumbnailPath = path.join(this.uploadDir, 'receipts', thumbnailFilename);

    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();

      // Process main image
      const processed = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(filepath);

      // Create thumbnail
      await sharp(buffer)
        .rotate()
        .resize(300, 300, {
          fit: 'cover'
        })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);

      logger.info('Receipt image processed', {
        billId,
        originalSize: buffer.length,
        processedSize: processed.size,
        dimensions: `${processed.width}x${processed.height}`
      });

      return {
        filename,
        filepath,
        thumbnailFilename,
        thumbnailPath,
        mimeType: 'image/jpeg',
        size: processed.size,
        width: processed.width,
        height: processed.height,
        originalWidth: metadata.width,
        originalHeight: metadata.height
      };
    } catch (error) {
      logger.error('Failed to process receipt image', { error: error.message, billId });
      throw new ApiError(500, 'Failed to process receipt image');
    }
  }

  /**
   * Process and save avatar image
   * @param {Buffer} buffer - Image buffer
   * @param {string} userId - Associated user ID
   * @returns {Promise<Object>}
   */
  async processAvatarImage(buffer, userId) {
    const filename = `${userId}_${Date.now()}.jpg`;
    const filepath = path.join(this.uploadDir, 'avatars', filename);

    try {
      // Process avatar - square crop and resize
      const processed = await sharp(buffer)
        .rotate()
        .resize(256, 256, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toFile(filepath);

      logger.info('Avatar image processed', {
        userId,
        size: processed.size
      });

      return {
        filename,
        filepath,
        mimeType: 'image/jpeg',
        size: processed.size,
        width: 256,
        height: 256
      };
    } catch (error) {
      logger.error('Failed to process avatar image', { error: error.message, userId });
      throw new ApiError(500, 'Failed to process avatar image');
    }
  }

  /**
   * Delete file
   * @param {string} filepath - Full path to file
   */
  async deleteFile(filepath) {
    try {
      await fs.unlink(filepath);
      logger.debug('File deleted', { filepath });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete file', { filepath, error: error.message });
      }
    }
  }

  /**
   * Delete receipt files
   * @param {Object} receipt - Receipt object with filenames
   */
  async deleteReceiptFiles(receipt) {
    if (receipt.filename) {
      await this.deleteFile(path.join(this.uploadDir, 'receipts', receipt.filename));
    }
    if (receipt.thumbnailFilename) {
      await this.deleteFile(path.join(this.uploadDir, 'receipts', receipt.thumbnailFilename));
    }
  }

  /**
   * Get file stream for serving
   * @param {string} filename - Filename
   * @param {string} type - File type (receipts, avatars)
   * @returns {Promise<ReadStream>}
   */
  async getFileStream(filename, type = 'receipts') {
    const filepath = path.join(this.uploadDir, type, filename);
    
    try {
      await fs.access(filepath);
      const { createReadStream } = require('fs');
      return createReadStream(filepath);
    } catch (error) {
      throw new ApiError(404, 'File not found');
    }
  }

  /**
   * Get file info
   * @param {string} filename - Filename
   * @param {string} type - File type
   * @returns {Promise<Object>}
   */
  async getFileInfo(filename, type = 'receipts') {
    const filepath = path.join(this.uploadDir, type, filename);
    
    try {
      const stats = await fs.stat(filepath);
      return {
        exists: true,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Clean up temp files older than specified hours
   * @param {number} hoursOld - Age threshold in hours
   */
  async cleanupTempFiles(hoursOld = 24) {
    const tempDir = path.join(this.uploadDir, 'temp');
    const threshold = Date.now() - (hoursOld * 60 * 60 * 1000);
    let deletedCount = 0;

    try {
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filepath = path.join(tempDir, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtimeMs < threshold) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      logger.info('Temp files cleanup complete', { deletedCount });
    } catch (error) {
      logger.error('Temp files cleanup failed', { error: error.message });
    }

    return deletedCount;
  }

  /**
   * Validate image buffer
   * @param {Buffer} buffer - Image buffer
   * @returns {Promise<Object>}
   */
  async validateImage(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      if (!['jpeg', 'png', 'webp', 'heif'].includes(metadata.format)) {
        throw new Error('Unsupported image format');
      }

      if (metadata.width < 100 || metadata.height < 100) {
        throw new Error('Image too small (minimum 100x100)');
      }

      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new Error('Image too large (maximum 10000x10000)');
      }

      return {
        valid: true,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get upload URL path for serving
   * @param {string} filename - Filename
   * @param {string} type - File type
   * @returns {string}
   */
  getPublicUrl(filename, type = 'receipts') {
    return `/uploads/${type}/${filename}`;
  }
}

module.exports = new FileUploadService();
