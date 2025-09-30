/**
 * OCR Service
 * Handles receipt scanning and text extraction using Tesseract.js
 */

const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errors');

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp'];
  }

  /**
   * Initialize Tesseract worker
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug('OCR Progress', { progress: Math.round(m.progress * 100) });
          }
        }
      });

      this.isInitialized = true;
      logger.info('OCR service initialized');
    } catch (error) {
      logger.error('Failed to initialize OCR service', { error: error.message });
      throw new ApiError(500, 'OCR service initialization failed');
    }
  }

  /**
   * Terminate worker
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      logger.info('OCR service terminated');
    }
  }

  /**
   * Preprocess image for better OCR results
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Buffer>} - Processed image buffer
   */
  async preprocessImage(imageBuffer) {
    try {
      const processed = await sharp(imageBuffer)
        // Convert to grayscale
        .greyscale()
        // Increase contrast
        .normalize()
        // Apply slight sharpening
        .sharpen({
          sigma: 1,
          m1: 1,
          m2: 2
        })
        // Resize if too large (max 4000px on longest side)
        .resize(4000, 4000, {
          fit: 'inside',
          withoutEnlargement: true
        })
        // Convert to PNG for best OCR results
        .png()
        .toBuffer();

      return processed;
    } catch (error) {
      logger.error('Image preprocessing failed', { error: error.message });
      // Return original if preprocessing fails
      return imageBuffer;
    }
  }

  /**
   * Extract text from image
   * @param {Buffer|string} image - Image buffer or file path
   * @returns {Promise<Object>} - Extracted text and confidence
   */
  async extractText(image) {
    await this.initialize();

    try {
      let imageBuffer = image;
      
      if (typeof image === 'string') {
        imageBuffer = await fs.readFile(image);
      }

      // Preprocess image
      const processedImage = await this.preprocessImage(imageBuffer);

      // Perform OCR
      const { data } = await this.worker.recognize(processedImage);

      return {
        text: data.text,
        confidence: data.confidence,
        lines: data.lines.map(line => ({
          text: line.text.trim(),
          confidence: line.confidence,
          bbox: line.bbox
        })),
        words: data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        }))
      };
    } catch (error) {
      logger.error('Text extraction failed', { error: error.message });
      throw new ApiError(500, 'Failed to extract text from image');
    }
  }

  /**
   * Parse receipt from extracted text
   * @param {string} text - Extracted text
   * @param {Array} lines - Line data with bounding boxes
   * @returns {Object} - Parsed receipt data
   */
  parseReceipt(text, lines = []) {
    const result = {
      merchant: null,
      date: null,
      items: [],
      subtotal: null,
      tax: null,
      tip: null,
      total: null,
      paymentMethod: null,
      rawText: text,
      confidence: 0,
      warnings: []
    };

    const textLines = lines.length > 0 
      ? lines.map(l => l.text) 
      : text.split('\n').map(l => l.trim()).filter(l => l);

    // Try to extract merchant name (usually first few lines)
    result.merchant = this.extractMerchant(textLines);

    // Extract date
    result.date = this.extractDate(text);

    // Extract items with prices
    result.items = this.extractItems(textLines);

    // Extract totals
    const totals = this.extractTotals(textLines);
    result.subtotal = totals.subtotal;
    result.tax = totals.tax;
    result.tip = totals.tip;
    result.total = totals.total;

    // Extract payment method
    result.paymentMethod = this.extractPaymentMethod(text);

    // Calculate confidence based on what we found
    result.confidence = this.calculateConfidence(result);

    // Add warnings
    if (!result.total && result.items.length > 0) {
      result.warnings.push('Could not find total amount');
    }
    if (result.items.length === 0) {
      result.warnings.push('No items detected');
    }

    return result;
  }

  /**
   * Extract merchant name from receipt
   * @param {Array<string>} lines - Receipt lines
   * @returns {Object|null}
   */
  extractMerchant(lines) {
    if (lines.length === 0) return null;

    // Common patterns to skip
    const skipPatterns = [
      /^\d+[\s-]?\d+[\s-]?\d+/, // Phone numbers
      /^\d{1,2}[\/\-]\d{1,2}/, // Dates
      /^(tel|phone|fax|www|http)/i,
      /^[\d\s\-\(\)]+$/, // Just numbers/punctuation
      /^(order|table|server|cashier|register)/i
    ];

    // Try first 5 lines for merchant name
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      
      if (line.length < 2 || line.length > 50) continue;
      if (skipPatterns.some(p => p.test(line))) continue;
      
      return {
        name: line,
        address: this.extractAddress(lines.slice(i + 1, i + 4))
      };
    }

    return null;
  }

  /**
   * Extract address from lines
   * @param {Array<string>} lines 
   * @returns {string|null}
   */
  extractAddress(lines) {
    const addressLines = [];
    const addressPattern = /\d+.*(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court)/i;
    const zipPattern = /\d{5}(-\d{4})?/;
    const statePattern = /\b[A-Z]{2}\b/;

    for (const line of lines) {
      if (addressPattern.test(line) || zipPattern.test(line) || 
          (statePattern.test(line) && line.length < 50)) {
        addressLines.push(line);
      }
      if (addressLines.length >= 2) break;
    }

    return addressLines.length > 0 ? addressLines.join(', ') : null;
  }

  /**
   * Extract date from text
   * @param {string} text 
   * @returns {Date|null}
   */
  extractDate(text) {
    const datePatterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      // YYYY-MM-DD
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
      // Month DD, YYYY
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})/i,
      // DD Month YYYY
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const dateStr = match[0];
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Extract items with prices
   * @param {Array<string>} lines 
   * @returns {Array<Object>}
   */
  extractItems(lines) {
    const items = [];
    
    // Pattern for price at end of line
    const pricePattern = /\$?\s*(\d+[,.]?\d*)\s*$/;
    
    // Patterns to exclude (totals, subtotals, etc.)
    const excludePatterns = [
      /^(sub\s*total|total|tax|tip|gratuity|balance|change|cash|credit|debit|visa|mastercard|amex|discover)/i,
      /^(amount|due|paid|tender|card|payment)/i,
      /thank\s*you/i,
      /^\*+$/,
      /^-+$/
    ];

    // Common quantity patterns
    const qtyPattern = /^(\d+)\s*[@xX]\s*/;

    for (const line of lines) {
      if (excludePatterns.some(p => p.test(line))) continue;
      
      const priceMatch = line.match(pricePattern);
      if (!priceMatch) continue;

      const price = parseFloat(priceMatch[1].replace(',', '.'));
      if (isNaN(price) || price <= 0 || price > 10000) continue;

      let name = line.replace(pricePattern, '').trim();
      let quantity = 1;

      // Check for quantity
      const qtyMatch = name.match(qtyPattern);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1]);
        name = name.replace(qtyPattern, '').trim();
      }

      if (name.length < 2) continue;

      items.push({
        name: this.cleanItemName(name),
        quantity,
        unitPrice: price / quantity,
        totalPrice: price,
        raw: line
      });
    }

    return items;
  }

  /**
   * Clean item name
   * @param {string} name 
   * @returns {string}
   */
  cleanItemName(name) {
    return name
      .replace(/[^\w\s\-\&\'\.]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Extract totals (subtotal, tax, tip, total)
   * @param {Array<string>} lines 
   * @returns {Object}
   */
  extractTotals(lines) {
    const result = {
      subtotal: null,
      tax: null,
      tip: null,
      total: null
    };

    const patterns = {
      subtotal: /(?:sub\s*total|subtotal|sub\s*ttl)\s*:?\s*\$?\s*([\d,.]+)/i,
      tax: /(?:tax|hst|gst|vat|sales\s*tax)\s*:?\s*\$?\s*([\d,.]+)/i,
      tip: /(?:tip|gratuity|grat)\s*:?\s*\$?\s*([\d,.]+)/i,
      total: /(?:total|amount\s*due|grand\s*total|balance\s*due)\s*:?\s*\$?\s*([\d,.]+)/i
    };

    const fullText = lines.join(' ');

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = fullText.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value >= 0) {
          result[key] = value;
        }
      }
    }

    // If no total found, try to find the largest amount in the last few lines
    if (result.total === null) {
      const lastLines = lines.slice(-10);
      let maxAmount = 0;
      
      for (const line of lastLines) {
        const match = line.match(/\$?\s*([\d,.]+)\s*$/);
        if (match) {
          const amount = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(amount) && amount > maxAmount && amount < 100000) {
            maxAmount = amount;
          }
        }
      }
      
      if (maxAmount > 0) {
        result.total = maxAmount;
      }
    }

    return result;
  }

  /**
   * Extract payment method
   * @param {string} text 
   * @returns {string|null}
   */
  extractPaymentMethod(text) {
    const methods = [
      { pattern: /visa/i, method: 'visa' },
      { pattern: /master\s*card/i, method: 'mastercard' },
      { pattern: /amex|american\s*express/i, method: 'amex' },
      { pattern: /discover/i, method: 'discover' },
      { pattern: /debit/i, method: 'debit' },
      { pattern: /credit/i, method: 'credit' },
      { pattern: /cash/i, method: 'cash' },
      { pattern: /apple\s*pay/i, method: 'apple_pay' },
      { pattern: /google\s*pay/i, method: 'google_pay' }
    ];

    for (const { pattern, method } of methods) {
      if (pattern.test(text)) {
        return method;
      }
    }

    return null;
  }

  /**
   * Calculate confidence score for parsed receipt
   * @param {Object} receipt 
   * @returns {number}
   */
  calculateConfidence(receipt) {
    let score = 0;
    const maxScore = 100;

    if (receipt.merchant) score += 15;
    if (receipt.date) score += 10;
    if (receipt.items.length > 0) score += 30;
    if (receipt.total) score += 25;
    if (receipt.subtotal) score += 10;
    if (receipt.tax !== null) score += 5;
    if (receipt.paymentMethod) score += 5;

    // Bonus for matching totals
    if (receipt.items.length > 0 && receipt.subtotal) {
      const itemsSum = receipt.items.reduce((sum, item) => sum + item.totalPrice, 0);
      if (Math.abs(itemsSum - receipt.subtotal) < 0.1) {
        score += 10;
      }
    }

    return Math.min(score, maxScore);
  }

  /**
   * Process receipt image and return parsed data
   * @param {Buffer|string} image - Image buffer or file path
   * @returns {Promise<Object>}
   */
  async processReceipt(image) {
    const startTime = Date.now();

    try {
      logger.info('Starting receipt processing');

      // Extract text
      const extraction = await this.extractText(image);
      
      // Parse receipt
      const parsed = this.parseReceipt(extraction.text, extraction.lines);

      const processingTime = Date.now() - startTime;
      
      logger.info('Receipt processing complete', {
        processingTime,
        itemCount: parsed.items.length,
        confidence: parsed.confidence,
        hasTotal: !!parsed.total
      });

      return {
        ...parsed,
        ocrConfidence: extraction.confidence,
        processingTime
      };
    } catch (error) {
      logger.error('Receipt processing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      supportedFormats: this.supportedFormats
    };
  }
}

// Export singleton
module.exports = new OCRService();
