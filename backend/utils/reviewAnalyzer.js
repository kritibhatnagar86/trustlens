// Review Authenticity Analyzer - AI-powered fake review detection
class ReviewAnalyzer {
  
  // Analyze review authenticity using linguistic patterns
  static analyzeReviewAuthenticity(reviewContent) {
    const analysis = {
      sentenceVariety: this.calculateSentenceVariety(reviewContent),
      emotionalAuthenticity: this.analyzeEmotionalAuthenticity(reviewContent),
      specificDetails: this.analyzeSpecificDetails(reviewContent),
      vocabularyComplexity: this.analyzeVocabularyComplexity(reviewContent),
      grammarScore: this.analyzeGrammar(reviewContent)
    };
    
    // Calculate overall authenticity score
    const weights = {
      sentenceVariety: 0.2,
      emotionalAuthenticity: 0.25,
      specificDetails: 0.3,
      vocabularyComplexity: 0.15,
      grammarScore: 0.1
    };
    
    let authenticityScore = 0;
    for (const [metric, score] of Object.entries(analysis)) {
      authenticityScore += score * weights[metric];
    }
    
    return {
      authenticityScore: Math.round(authenticityScore),
      analysis,
      isAIGenerated: authenticityScore < 60
    };
  }
  
  // Calculate sentence variety (humans use varied sentence structures)
  static calculateSentenceVariety(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 50;
    
    const lengths = sentences.map(s => s.trim().split(' ').length);
    const avgLength = lengths.reduce((a, b) => a + b) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    // Higher variance indicates more human-like writing
    return Math.min(100, Math.max(0, variance * 5));
  }
  
  // Analyze emotional authenticity (genuine emotions vs generic sentiment)
  static analyzeEmotionalAuthenticity(text) {
    const emotionalWords = [
      'love', 'hate', 'amazing', 'terrible', 'fantastic', 'awful',
      'excited', 'disappointed', 'thrilled', 'frustrated', 'delighted'
    ];
    
    const genericWords = [
      'good', 'bad', 'nice', 'okay', 'fine', 'decent', 'average'
    ];
    
    const words = text.toLowerCase().split(/\W+/);
    const emotionalCount = words.filter(word => emotionalWords.includes(word)).length;
    const genericCount = words.filter(word => genericWords.includes(word)).length;
    
    // More specific emotions indicate authenticity
    const ratio = emotionalCount / Math.max(1, genericCount);
    return Math.min(100, ratio * 40 + 50);
  }
  
  // Analyze specific details (authentic reviews mention specific features)
  static analyzeSpecificDetails(text) {
    const specificIndicators = [
      /\d+/g, // Numbers (prices, measurements, etc.)
      /color|size|weight|material/gi, // Physical attributes
      /delivery|shipping|package/gi, // Experience details
      /compared to|versus|than/gi // Comparisons
    ];
    
    let detailScore = 0;
    specificIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) detailScore += matches.length * 10;
    });
    
    return Math.min(100, detailScore + 30);
  }
  
  // Analyze vocabulary complexity
  static analyzeVocabularyComplexity(text) {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words);
    const complexWords = words.filter(word => word.length > 6);
    
    const uniqueRatio = uniqueWords.size / words.length;
    const complexRatio = complexWords.length / words.length;
    
    return Math.round((uniqueRatio * 50) + (complexRatio * 50));
  }
  
  // Basic grammar analysis
  static analyzeGrammar(text) {
    // Simple grammar checks
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let grammarScore = 80; // Base score
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      // Check capitalization
      if (trimmed.length > 0 && trimmed[0] !== trimmed[0].toUpperCase()) {
        grammarScore -= 5;
      }
      // Check for basic punctuation
      if (!trimmed.match(/[.!?]$/)) {
        grammarScore -= 3;
      }
    });
    
    return Math.max(0, grammarScore);
  }
}

module.exports = ReviewAnalyzer;
