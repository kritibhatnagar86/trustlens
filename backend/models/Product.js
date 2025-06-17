const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  images: [String],
  authenticityScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Listed', 'Sold', 'Flagged', 'Under Review'],
    default: 'Listed'
  },
  metadata: {
    imageAnalysis: Object,
    listingBehavior: Object,
    priceAnalysis: Object
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
