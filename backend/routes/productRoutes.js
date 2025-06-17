const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../models/Product');
const ImageAnalyzer = require('../utils/imageAnalyzer');

// Initialize image analyzer
const imageAnalyzer = new ImageAnalyzer();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Create a new product with AI-powered image analysis
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const productData = req.body;
    
    console.log('🖼️ Starting AI image analysis for product...');
    
    // Analyze uploaded images if any
    if (req.files && req.files.length > 0) {
      const imageAnalyses = [];
      
      for (const file of req.files) {
        console.log(`🔍 Analyzing image: ${file.originalname}`);
        const analysis = await imageAnalyzer.analyzeImageAuthenticity(file.buffer, file.originalname);
        imageAnalyses.push({
          filename: file.originalname,
          analysis: analysis,
          size: file.size,
          mimetype: file.mimetype
        });
      }
      
      // Calculate overall authenticity score from all images
      const avgAuthenticity = imageAnalyses.reduce((sum, img) => sum + img.analysis.authenticity, 0) / imageAnalyses.length;
      
      // Store image analysis data
      productData.metadata = {
        imageAnalysis: imageAnalyses,
        overallImageAuthenticity: Math.round(avgAuthenticity),
        imageCount: imageAnalyses.length,
        riskFactors: imageAnalyses.flatMap(img => img.analysis.riskFactors)
      };
      
      // Set authenticity score based on image analysis
      productData.authenticityScore = Math.round(avgAuthenticity);
      
      // Determine product status based on analysis
      if (avgAuthenticity < 40) {
        productData.status = 'Flagged';
      } else if (avgAuthenticity < 70) {
        productData.status = 'Under Review';
      } else {
        productData.status = 'Listed';
      }
      
      console.log(`✅ Image Analysis Complete - Authenticity: ${Math.round(avgAuthenticity)}%`);
    } else {
      // No images provided
      productData.authenticityScore = 30; // Lower score for no images
      productData.status = 'Under Review';
      productData.metadata = {
        imageAnalysis: [],
        overallImageAuthenticity: 30,
        imageCount: 0,
        riskFactors: ['no_images_provided']
      };
    }
    
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json({
      ...product.toObject(),
      imageAnalysisResults: productData.metadata.imageAnalysis
    });
  } catch (error) {
    console.error('Error in product creation with image analysis:', error);
    res.status(400).json({ message: error.message });
  }
});

// Analyze specific image endpoint
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    console.log('🔍 Performing live image analysis...');
    
    const analysis = await imageAnalyzer.analyzeImageAuthenticity(req.file.buffer, req.file.originalname);
    
    res.json({
      success: true,
      filename: req.file.originalname,
      fileSize: req.file.size,
      analysis: analysis,
      summary: {
        authenticityScore: analysis.authenticity,
        riskLevel: analysis.authenticity < 40 ? 'High' : 
                  analysis.authenticity < 70 ? 'Medium' : 'Low',
        aiGenerated: analysis.aiDetection.aiSignatures.length > 0,
        manipulated: analysis.riskFactors.some(factor => 
          factor.includes('editing') || factor.includes('manipulation')
        ),
        confidence: analysis.riskFactors.length === 0 ? 'High' : 'Medium'
      }
    });
  } catch (error) {
    console.error('Live image analysis error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get all products with image analysis data
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('seller', 'username email');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product by ID with detailed image analysis
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('seller', 'username email');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update product by ID
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete product by ID
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get products by authenticity score range
router.get('/authenticity/:min/:max', async (req, res) => {
  try {
    const min = parseInt(req.params.min);
    const max = parseInt(req.params.max);
    
    const products = await Product.find({
      authenticityScore: { $gte: min, $lte: max }
    }).populate('seller', 'username email');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get flagged products (low authenticity)
router.get('/flagged/all', async (req, res) => {
  try {
    const flaggedProducts = await Product.find({
      $or: [
        { status: 'Flagged' },
        { authenticityScore: { $lt: 40 } }
      ]
    }).populate('seller', 'username email');
    
    res.json(flaggedProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
