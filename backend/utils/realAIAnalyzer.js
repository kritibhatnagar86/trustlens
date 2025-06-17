const { HfInference } = require('@huggingface/inference');
const natural = require('natural');
const compromise = require('compromise');
const Sentiment = require('sentiment');

class RealAIAnalyzer {
  constructor() {
    // Initialize HuggingFace client (free tier - no API key needed for public models)
    this.hf = new HfInference();
    this.sentiment = new Sentiment();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  // Real HuggingFace API integration for text analysis
  async analyzeReviewWithHuggingFace(reviewText) {
    try {
      // Use multiple HuggingFace models for comprehensive analysis
      const [sentimentResult, toxicityResult] = await Promise.all([
        this.hf.textClassification({
          model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
          inputs: reviewText
        }),
        this.hf.textClassification({
          model: 'martin-ha/toxic-comment-model',
          inputs: reviewText
        })
      ]);

      const localSentiment = this.sentiment.analyze(reviewText);
      const linguisticFeatures = this.extractAdvancedLinguisticFeatures(reviewText);
      
      return {
        huggingFaceResults: {
          sentiment: sentimentResult,
          toxicity: toxicityResult
        },
        localAnalysis: {
          sentiment: localSentiment,
          linguistic: linguisticFeatures
        },
        authenticityScore: this.calculateAdvancedAuthenticityScore(
          sentimentResult, 
          toxicityResult, 
          localSentiment, 
          linguisticFeatures
        ),
        isAIGenerated: this.detectAIGeneratedContent(reviewText, linguisticFeatures),
        detailedAnalysis: this.generateDetailedAnalysis(reviewText, linguisticFeatures)
      };
    } catch (error) {
      console.error('HuggingFace API error:', error);
      // Fallback to advanced local analysis
      return this.advancedLocalAnalysis(reviewText);
    }
  }

  // Advanced linguistic feature extraction using multiple NLP libraries
  extractAdvancedLinguisticFeatures(text) {
    const doc = compromise(text);
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Advanced linguistic metrics
    const uniqueWords = new Set(tokens);
    const stemmedWords = tokens.map(word => this.stemmer.stem(word));
    const uniqueStems = new Set(stemmedWords);
    
    // Calculate various complexity metrics
    const avgSentenceLength = tokens.length / Math.max(sentences.length, 1);
    const lexicalDiversity = uniqueWords.size / tokens.length;
    const morphologicalComplexity = uniqueStems.size / uniqueWords.size;
    
    // Syntactic analysis
    const nouns = doc.nouns().out('array');
    const verbs = doc.verbs().out('array');
    const adjectives = doc.adjectives().out('array');
    const adverbs = doc.adverbs().out('array');
    
    // Calculate readability metrics
    const readabilityScore = this.calculateFleschKincaid(text, sentences, tokens);
    const gunningFog = this.calculateGunningFog(sentences, tokens);
    
    return {
      basicMetrics: {
        wordCount: tokens.length,
        sentenceCount: sentences.length,
        avgSentenceLength,
        uniqueWordRatio: uniqueWords.size / tokens.length
      },
      complexityMetrics: {
        lexicalDiversity,
        morphologicalComplexity,
        readabilityScore,
        gunningFog
      },
      syntacticFeatures: {
        nounRatio: nouns.length / tokens.length,
        verbRatio: verbs.length / tokens.length,
        adjectiveRatio: adjectives.length / tokens.length,
        adverbRatio: adverbs.length / tokens.length
      },
      semanticFeatures: {
        namedEntities: doc.people().concat(doc.places()).out('array'),
        topics: doc.topics().out('array'),
        emotionalWords: this.extractEmotionalWords(tokens)
      }
    };
  }

  // Advanced authenticity scoring using multiple factors
  calculateAdvancedAuthenticityScore(hfSentiment, hfToxicity, localSentiment, linguistic) {
    let score = 50; // Base score
    
    // HuggingFace sentiment analysis contribution
    if (hfSentiment && hfSentiment.length > 0) {
      const sentimentConfidence = hfSentiment[0].score;
      score += (sentimentConfidence > 0.8 ? 20 : sentimentConfidence > 0.6 ? 10 : 5);
    }
    
    // Local sentiment intensity (genuine emotions)
    const sentimentIntensity = Math.abs(localSentiment.score);
    score += Math.min(15, sentimentIntensity * 2);
    
    // Lexical diversity (humans write more variably)
    score += linguistic.complexityMetrics.lexicalDiversity * 25;
    
    // Syntactic complexity (natural variation)
    const syntacticVariation = this.calculateSyntacticVariation(linguistic.syntacticFeatures);
    score += syntacticVariation * 20;
    
    // Readability (too perfect = AI)
    if (linguistic.complexityMetrics.readabilityScore > 90) {
      score -= 15; // Too easy to read = potentially AI
    } else if (linguistic.complexityMetrics.readabilityScore < 30) {
      score -= 10; // Too complex = potentially fake
    } else {
      score += 10; // Natural readability
    }
    
    // Semantic richness
    const semanticRichness = (
      linguistic.semanticFeatures.namedEntities.length + 
      linguistic.semanticFeatures.topics.length + 
      linguistic.semanticFeatures.emotionalWords.length
    ) / linguistic.basicMetrics.wordCount;
    
    score += Math.min(15, semanticRichness * 100);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // AI-generated content detection using linguistic patterns
  detectAIGeneratedContent(text, linguistic) {
    const aiIndicators = [];
    
    // Perfect grammar/structure (AI tends to be too perfect)
    if (linguistic.complexityMetrics.readabilityScore > 95) {
      aiIndicators.push('too_perfect_readability');
    }
    
    // Lack of personal pronouns (AI often avoids first person)
    const personalPronouns = (text.match(/\b(I|me|my|mine|myself)\b/gi) || []).length;
    if (personalPronouns === 0 && text.length > 100) {
      aiIndicators.push('no_personal_pronouns');
    }
    
    // Generic language patterns
    const genericPhrases = [
      'overall', 'in conclusion', 'to summarize', 'it is worth noting',
      'furthermore', 'moreover', 'additionally', 'in addition'
    ];
    const genericCount = genericPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase)
    ).length;
    
    if (genericCount > 2) {
      aiIndicators.push('too_many_generic_phrases');
    }
    
    // Low lexical diversity (AI repeats patterns)
    if (linguistic.complexityMetrics.lexicalDiversity < 0.3) {
      aiIndicators.push('low_lexical_diversity');
    }
    
    return aiIndicators.length >= 2;
  }

  // Advanced behavioral analysis for typing patterns
  analyzeTypingBehaviorAdvanced(typingData, mouseData = []) {
    if (!typingData || typingData.length < 5) {
      return { 
        classification: 'insufficient_data', 
        confidence: 0, 
        analysis: 'Need more typing samples' 
      };
    }

    // Statistical analysis
    const stats = this.calculateTypingStatistics(typingData);
    
    // Pattern analysis
    const patterns = this.analyzeTypingPatterns(typingData);
    
    // Mouse correlation (if available)
    const mouseCorrelation = mouseData.length > 0 ? 
      this.analyzeMouseTypingCorrelation(typingData, mouseData) : null;
    
    // Machine learning-style classification
    const classification = this.classifyTypingBehavior(stats, patterns, mouseCorrelation);
    
    return {
      classification: classification.type,
      confidence: classification.confidence,
      analysis: {
        statistics: stats,
        patterns: patterns,
        mouseCorrelation: mouseCorrelation,
        riskFactors: classification.riskFactors
      }
    };
  }

  // Helper methods for advanced analysis
  calculateTypingStatistics(data) {
    const mean = data.reduce((a, b) => a + b) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const skewness = this.calculateSkewness(data, mean, stdDev);
    const kurtosis = this.calculateKurtosis(data, mean, stdDev);
    
    return { mean, variance, stdDev, skewness, kurtosis };
  }

  calculateSkewness(data, mean, stdDev) {
    const n = data.length;
    const skew = data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;
    return skew;
  }

  calculateKurtosis(data, mean, stdDev) {
    const n = data.length;
    const kurt = data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / n;
    return kurt - 3; // Excess kurtosis
  }

  // Additional helper methods...
  extractEmotionalWords(tokens) {
    const emotionalLexicon = [
      'love', 'hate', 'amazing', 'terrible', 'fantastic', 'awful',
      'excited', 'disappointed', 'thrilled', 'frustrated', 'delighted',
      'angry', 'happy', 'sad', 'surprised', 'disgusted', 'fearful'
    ];
    
    return tokens.filter(token => 
      emotionalLexicon.includes(token.toLowerCase())
    );
  }

  calculateSyntacticVariation(syntacticFeatures) {
    const ratios = Object.values(syntacticFeatures);
    const mean = ratios.reduce((a, b) => a + b) / ratios.length;
    const variance = ratios.reduce((sum, ratio) => sum + Math.pow(ratio - mean, 2), 0) / ratios.length;
    return Math.sqrt(variance);
  }

  // Fallback method for when HuggingFace is unavailable
  advancedLocalAnalysis(text) {
    const sentiment = this.sentiment.analyze(text);
    const linguistic = this.extractAdvancedLinguisticFeatures(text);
    
    return {
      huggingFaceResults: null,
      localAnalysis: { sentiment, linguistic },
      authenticityScore: this.calculateLocalAuthenticityScore(sentiment, linguistic),
      isAIGenerated: this.detectAIGeneratedContent(text, linguistic),
      detailedAnalysis: this.generateDetailedAnalysis(text, linguistic)
    };
  }

  calculateLocalAuthenticityScore(sentiment, linguistic) {
    let score = 50;
    score += Math.min(20, Math.abs(sentiment.score) * 3);
    score += linguistic.complexityMetrics.lexicalDiversity * 30;
    score += Math.min(15, linguistic.semanticFeatures.emotionalWords.length * 2);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  generateDetailedAnalysis(text, linguistic) {
    return {
      textLength: text.length,
      complexity: linguistic.complexityMetrics.readabilityScore > 60 ? 'appropriate' : 'complex',
      emotionalTone: linguistic.semanticFeatures.emotionalWords.length > 2 ? 'emotional' : 'neutral',
      writingStyle: linguistic.complexityMetrics.lexicalDiversity > 0.6 ? 'varied' : 'repetitive'
    };
  }

    // Calculate Flesch-Kincaid readability score
  calculateFleschKincaid(text, sentences, words) {
    const syllables = this.countSyllables(text);
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = syllables / words.length;
    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  // Calculate Gunning Fog Index
  calculateGunningFog(sentences, words) {
    const complexWords = words.filter(word => this.countSyllables(word) >= 3);
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const complexWordRatio = complexWords.length / words.length;
    return 0.4 * (avgSentenceLength + 100 * complexWordRatio);
  }

  // Count syllables in text
  countSyllables(text) {
    if (!text || text.length === 0) return 0;
    text = text.toLowerCase();
    let syllableCount = 0;
    const vowels = 'aeiouy';
    let prevCharWasVowel = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (vowels.includes(char)) {
        if (!prevCharWasVowel) {
          syllableCount++;
          prevCharWasVowel = true;
        }
      } else {
        prevCharWasVowel = false;
      }
    }
    
    // Subtract silent 'e' at the end
    if (text.endsWith('e') && syllableCount > 1) {
      syllableCount--;
    }
    
    return Math.max(1, syllableCount);
  }

  // Analyze typing patterns for classification
  analyzeTypingPatterns(typingData) {
    const patterns = {
      consistency: this.calculateConsistency(typingData),
      rhythm: this.detectRhythm(typingData),
      acceleration: this.detectAcceleration(typingData),
      pauses: this.detectPauses(typingData)
    };
    
    return patterns;
  }

  // Calculate typing consistency
  calculateConsistency(data) {
    if (data.length < 3) return 0;
    const differences = [];
    for (let i = 1; i < data.length; i++) {
      differences.push(Math.abs(data[i] - data[i-1]));
    }
    const avgDifference = differences.reduce((a, b) => a + b) / differences.length;
    return 1 - Math.min(1, avgDifference / 50); // Normalize to 0-1
  }

  // Detect natural rhythm
  detectRhythm(data) {
    if (data.length < 5) return false;
    const intervals = [];
    for (let i = 1; i < data.length; i++) {
      intervals.push(data[i] - data[i-1]);
    }
    const variance = this.calculateVariance(intervals);
    return variance > 10; // Natural rhythm has variation
  }

  // Detect acceleration patterns
  detectAcceleration(data) {
    if (data.length < 3) return false;
    let accelerations = 0;
    for (let i = 2; i < data.length; i++) {
      const accel = data[i] - 2*data[i-1] + data[i-2];
      if (Math.abs(accel) > 5) accelerations++;
    }
    return accelerations / (data.length - 2) > 0.3;
  }

  // Detect typing pauses
  detectPauses(data) {
    const threshold = data.reduce((a, b) => a + b) / data.length * 1.5;
    return data.filter(speed => speed < threshold).length > 0;
  }

  // Calculate variance helper
  calculateVariance(data) {
    const mean = data.reduce((a, b) => a + b) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }

  // Classify typing behavior using ML-style approach
  classifyTypingBehavior(stats, patterns, mouseCorrelation) {
    let botScore = 0;
    const riskFactors = [];

    // Perfect consistency = bot
    if (stats.variance === 0) {
      botScore += 0.9;
      riskFactors.push('perfect_consistency');
    } else if (stats.variance < 25) {
      botScore += 0.6;
      riskFactors.push('low_variance');
    }

    // Lack of natural rhythm
    if (!patterns.rhythm) {
      botScore += 0.5;
      riskFactors.push('no_natural_rhythm');
    }

    // Abnormal acceleration patterns
    if (!patterns.acceleration) {
      botScore += 0.3;
      riskFactors.push('uniform_acceleration');
    }

    // No pauses (bots don't pause to think)
    if (!patterns.pauses) {
      botScore += 0.4;
      riskFactors.push('no_thinking_pauses');
    }

    // Statistical anomalies
    if (Math.abs(stats.skewness) < 0.1) {
      botScore += 0.3;
      riskFactors.push('perfect_distribution');
    }

    const confidence = Math.min(95, botScore * 100);
    const type = botScore > 0.7 ? 'Bot' : botScore > 0.4 ? 'Suspicious' : 'Human';

    return {
      type,
      confidence,
      riskFactors
    };
  }

  // Analyze mouse-typing correlation
  analyzeMouseTypingCorrelation(typingData, mouseData) {
    // Simple correlation analysis
    if (mouseData.length !== typingData.length) return null;
    
    let correlation = 0;
    for (let i = 0; i < Math.min(typingData.length, mouseData.length); i++) {
      // Check if mouse movement correlates with typing speed
      correlation += Math.abs(typingData[i] - mouseData[i]) < 20 ? 1 : 0;
    }
    
    return {
      correlationScore: correlation / Math.min(typingData.length, mouseData.length),
      isNaturalCorrelation: correlation / Math.min(typingData.length, mouseData.length) > 0.3
    };
  }
}

module.exports = RealAIAnalyzer;
