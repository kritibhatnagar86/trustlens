const sharp = require('sharp');
const ExifReader = require('exifreader');
const crypto = require('crypto');

class ImageAnalyzer {
  constructor() {
    this.suspiciousPatterns = [
      'photoshop', 'gimp', 'canva', 'figma', 'sketch',
      'ai generated', 'midjourney', 'dalle', 'stable diffusion'
    ];
  }

  // Comprehensive image authenticity analysis
  async analyzeImageAuthenticity(imageBuffer, filename) {
    try {
      const analysis = {
        metadata: await this.extractMetadata(imageBuffer),
        forensics: await this.performForensicAnalysis(imageBuffer),
        aiDetection: await this.detectAIGeneration(imageBuffer),
        manipulation: await this.detectManipulation(imageBuffer),
        authenticity: 0,
        riskFactors: []
      };

      analysis.authenticity = this.calculateAuthenticityScore(analysis);
      return analysis;
    } catch (error) {
      console.error('Image analysis error:', error);
      return this.fallbackAnalysis(filename);
    }
  }

  // Extract comprehensive metadata
  async extractMetadata(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const exifData = ExifReader.load(imageBuffer);
      
      return {
        basic: {
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          channels: metadata.channels,
          density: metadata.density,
          hasProfile: metadata.hasProfile,
          hasAlpha: metadata.hasAlpha
        },
        exif: this.processExifData(exifData),
        technical: {
          fileSize: imageBuffer.length,
          aspectRatio: metadata.width / metadata.height,
          megapixels: (metadata.width * metadata.height) / 1000000
        }
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return { basic: {}, exif: {}, technical: {} };
    }
  }

  // Process EXIF data for analysis
  processExifData(exifData) {
    const processed = {
      camera: null,
      software: null,
      dateTime: null,
      gps: null,
      suspicious: []
    };

    try {
      // Camera information
      if (exifData.Make && exifData.Model) {
        processed.camera = `${exifData.Make.description} ${exifData.Model.description}`;
      }

      // Software detection
      if (exifData.Software) {
        processed.software = exifData.Software.description;
        // Check for suspicious software
        const software = processed.software.toLowerCase();
        this.suspiciousPatterns.forEach(pattern => {
          if (software.includes(pattern)) {
            processed.suspicious.push(`editing_software_${pattern.replace(' ', '_')}`);
          }
        });
      }

      // Date/time analysis
      if (exifData.DateTime) {
        processed.dateTime = exifData.DateTime.description;
        // Check for future dates or suspicious timestamps
        const imageDate = new Date(processed.dateTime);
        const now = new Date();
        if (imageDate > now) {
          processed.suspicious.push('future_timestamp');
        }
      }

      // GPS coordinates
      if (exifData.GPSLatitude && exifData.GPSLongitude) {
        processed.gps = {
          latitude: this.convertGPSCoordinate(exifData.GPSLatitude, exifData.GPSLatitudeRef),
          longitude: this.convertGPSCoordinate(exifData.GPSLongitude, exifData.GPSLongitudeRef)
        };
      }

    } catch (error) {
      console.error('EXIF processing error:', error);
    }

    return processed;
  }

  // Perform forensic analysis
  async performForensicAnalysis(imageBuffer) {
    try {
      const analysis = {
        compressionArtifacts: await this.analyzeCompression(imageBuffer),
        noiseAnalysis: await this.analyzeNoise(imageBuffer),
        edgeConsistency: await this.analyzeEdges(imageBuffer),
        colorConsistency: await this.analyzeColors(imageBuffer),
        duplicateRegions: await this.detectDuplicateRegions(imageBuffer)
      };

      return analysis;
    } catch (error) {
      console.error('Forensic analysis error:', error);
      return {};
    }
  }

  // Detect AI-generated images
  async detectAIGeneration(imageBuffer) {
    try {
      const stats = await sharp(imageBuffer).stats();
      const metadata = await sharp(imageBuffer).metadata();
      
      const indicators = {
        perfectPixelAlignment: this.checkPixelAlignment(stats),
        unnaturalColorDistribution: this.analyzeColorDistribution(stats),
        suspiciousAspectRatio: this.checkAspectRatio(metadata),
        missingNaturalNoise: this.checkNaturalNoise(stats),
        aiSignatures: []
      };

      // Check for common AI generation signatures
      if (metadata.width === metadata.height && [512, 1024, 2048].includes(metadata.width)) {
        indicators.aiSignatures.push('common_ai_resolution');
      }

      if (!metadata.exif || Object.keys(metadata.exif || {}).length === 0) {
        indicators.aiSignatures.push('missing_camera_metadata');
      }

      return indicators;
    } catch (error) {
      console.error('AI detection error:', error);
      return { aiSignatures: [] };
    }
  }

  // Detect image manipulation
  async detectManipulation(imageBuffer) {
    try {
      const manipulation = {
        resizeArtifacts: await this.detectResizeArtifacts(imageBuffer),
        cloning: await this.detectCloning(imageBuffer),
        splicing: await this.detectSplicing(imageBuffer),
        filterApplication: await this.detectFilters(imageBuffer)
      };

      return manipulation;
    } catch (error) {
      console.error('Manipulation detection error:', error);
      return {};
    }
  }

  // Analyze compression artifacts
  async analyzeCompression(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      return {
        format: metadata.format,
        quality: this.estimateJPEGQuality(imageBuffer),
        recompressionSigns: metadata.format === 'jpeg' && metadata.density < 72,
        suspiciousCompression: false
      };
    } catch (error) {
      return { suspiciousCompression: false };
    }
  }

  // Analyze noise patterns
  async analyzeNoise(imageBuffer) {
    try {
      const stats = await sharp(imageBuffer).stats();
      
      return {
        noiseLevel: this.calculateNoiseLevel(stats),
        distribution: 'normal', // Simplified
        consistency: this.checkNoiseConsistency(stats)
      };
    } catch (error) {
      return { noiseLevel: 0, consistency: true };
    }
  }

  // Calculate overall authenticity score
  calculateAuthenticityScore(analysis) {
    let score = 100; // Start with perfect score
    const riskFactors = [];

    // EXIF suspicious patterns
    if (analysis.metadata.exif.suspicious.length > 0) {
      score -= analysis.metadata.exif.suspicious.length * 15;
      riskFactors.push(...analysis.metadata.exif.suspicious);
    }

    // AI generation indicators
    if (analysis.aiDetection.aiSignatures.length > 0) {
      score -= analysis.aiDetection.aiSignatures.length * 20;
      riskFactors.push(...analysis.aiDetection.aiSignatures);
    }

    // Missing metadata (common in AI-generated images)
    if (!analysis.metadata.exif.camera) {
      score -= 10;
      riskFactors.push('missing_camera_info');
    }

    // Suspicious software
    if (analysis.metadata.exif.software && 
        this.suspiciousPatterns.some(pattern => 
          analysis.metadata.exif.software.toLowerCase().includes(pattern))) {
      score -= 25;
      riskFactors.push('suspicious_editing_software');
    }

    // Perfect dimensions (AI often generates perfect squares/ratios)
    const aspectRatio = analysis.metadata.basic.width / analysis.metadata.basic.height;
    if (aspectRatio === 1.0 || aspectRatio === 1.5 || aspectRatio === 0.75) {
      score -= 5;
      riskFactors.push('suspicious_aspect_ratio');
    }

    analysis.riskFactors = riskFactors;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Helper methods
  convertGPSCoordinate(coordinate, ref) {
    // Simplified GPS conversion
    return coordinate ? parseFloat(coordinate.description) : null;
  }

  checkPixelAlignment(stats) {
    // Check if pixel values are too perfect (AI signature)
    return stats.channels.some(channel => 
      channel.mean === Math.round(channel.mean)
    );
  }

  analyzeColorDistribution(stats) {
    // Check for unnatural color distribution
    const variance = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
    return variance < 10; // Too low variance = suspicious
  }

  checkAspectRatio(metadata) {
    const ratio = metadata.width / metadata.height;
    return ratio === 1.0 && [512, 1024, 2048].includes(metadata.width);
  }

  checkNaturalNoise(stats) {
    // Real photos have natural noise, AI images often don't
    const avgStdev = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
    return avgStdev < 5; // Too clean = suspicious
  }

  estimateJPEGQuality(imageBuffer) {
    // Simplified quality estimation
    const compressionRatio = imageBuffer.length / (1024 * 1024); // MB
    return compressionRatio > 0.5 ? 95 : compressionRatio > 0.2 ? 75 : 50;
  }

  calculateNoiseLevel(stats) {
    return stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
  }

  checkNoiseConsistency(stats) {
    const stdevs = stats.channels.map(channel => channel.stdev);
    const variance = stdevs.reduce((sum, val) => sum + Math.pow(val - stdevs[0], 2), 0) / stdevs.length;
    return variance < 10; // Consistent noise across channels
  }

  // Simplified detection methods (would be more complex in production)
  async detectResizeArtifacts(imageBuffer) {
    return { detected: false, confidence: 0 };
  }

  async detectCloning(imageBuffer) {
    return { detected: false, confidence: 0 };
  }

  async detectSplicing(imageBuffer) {
    return { detected: false, confidence: 0 };
  }

  async detectFilters(imageBuffer) {
    return { detected: false, confidence: 0 };
  }

  async analyzeEdges(imageBuffer) {
    return { consistency: true, artifacts: false };
  }

  async analyzeColors(imageBuffer) {
    return { consistency: true, manipulation: false };
  }

  async detectDuplicateRegions(imageBuffer) {
    return { found: false, regions: [] };
  }

  // Fallback analysis when processing fails
  fallbackAnalysis(filename) {
    return {
      metadata: { basic: {}, exif: {}, technical: {} },
      forensics: {},
      aiDetection: { aiSignatures: [] },
      manipulation: {},
      authenticity: 50,
      riskFactors: ['analysis_failed'],
      error: 'Could not process image'
    };
  }
}

module.exports = ImageAnalyzer;
