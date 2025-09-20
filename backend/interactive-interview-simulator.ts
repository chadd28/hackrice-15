/**
 * Interactive Technical Interview Simulator
 * Randomly selects questions and evaluates your answers in real-time
 */

import dotenv from 'dotenv';
import { TechnicalQuestionEvaluator } from './src/services/technicalEvaluatorService';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to get user input
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper function to pause for user to read
function pause(): Promise<void> {
  return new Promise((resolve) => {
    rl.question('\n📖 Press Enter to continue...', () => {
      resolve();
    });
  });
}

function formatScore(score: number): string {
  if (score >= 85) return `🎉 ${score}/100 (Excellent!)`;
  if (score >= 70) return `✅ ${score}/100 (Good)`;
  if (score >= 50) return `⚠️ ${score}/100 (Partial)`;
  return `❌ ${score}/100 (Needs Improvement)`;
}

function formatSimilarity(similarity: number): string {
  const percent = (similarity * 100).toFixed(1);
  if (similarity >= 0.8) return `🎯 ${percent}% (Very High)`;
  if (similarity >= 0.6) return `✅ ${percent}% (High)`;
  if (similarity >= 0.4) return `📊 ${percent}% (Moderate)`;
  if (similarity >= 0.2) return `⚠️ ${percent}% (Low)`;
  return `❌ ${percent}% (Very Low)`;
}

async function runInteractiveInterview() {
  console.log('🎯 Welcome to the Interactive Technical Interview Simulator!\n');
  console.log('This will randomly select technical questions and evaluate your answers using:');
  console.log('• 🧠 Semantic Similarity (70%): Cosine similarity between your answer and reference');
  console.log('• 🔑 Keyword Matching (30%): Presence of important technical terms');
  console.log('• 📊 Hybrid Score: Combined weighted score out of 100\n');

  try {
    // Initialize evaluator
    console.log('⚡ Initializing the evaluation system...');
    const evaluator = new TechnicalQuestionEvaluator();
    await evaluator.initialize();
    
    const allQuestions = evaluator.getAllQuestions();
    console.log(`✅ System ready! Loaded ${allQuestions.length} technical questions.\n`);

    // Show available roles
    const roles = [...new Set(allQuestions.map(q => q.role))];
    console.log('📋 Available roles:', roles.join(', '));

    while (true) {
      console.log('\n' + '='.repeat(80));
      console.log('🎲 NEW QUESTION');
      console.log('='.repeat(80));

      // Ask for role preference
      console.log('\nWould you like to:');
      console.log('1. Random question from any role');
      console.log('2. Choose a specific role');
      console.log('3. Exit simulator');
      
      const choice = await askQuestion('\nEnter your choice (1-3): ');
      
      if (choice === '3') {
        console.log('\n👋 Thanks for using the Technical Interview Simulator!');
        break;
      }

      let selectedQuestions = allQuestions;
      
      if (choice === '2') {
        console.log('\nAvailable roles:');
        roles.forEach((role, index) => {
          const count = allQuestions.filter(q => q.role === role).length;
          console.log(`${index + 1}. ${role} (${count} questions)`);
        });
        
        const roleChoice = await askQuestion('\nEnter role number: ');
        const roleIndex = parseInt(roleChoice) - 1;
        
        if (roleIndex >= 0 && roleIndex < roles.length) {
          const selectedRole = roles[roleIndex];
          selectedQuestions = allQuestions.filter(q => q.role === selectedRole);
          console.log(`\n🎯 Selected: ${selectedRole} (${selectedQuestions.length} questions)`);
        } else {
          console.log('⚠️ Invalid choice, using random question from any role');
        }
      }

      // Randomly select a question
      const randomQuestion = selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];
      
      console.log(`\n📝 Question ID: ${randomQuestion.id}`);
      console.log(`👨‍💼 Role: ${randomQuestion.role}`);
      console.log(`🔑 Keywords to consider: [${randomQuestion.keywords.join(', ')}]`);
      console.log('\n📋 QUESTION:');
      console.log('-'.repeat(60));
      console.log(randomQuestion.question);
      console.log('-'.repeat(60));

      // Get user's answer
      console.log('\n✍️ Type your answer below (press Enter twice when done):');
      let userAnswer = '';
      let lineCount = 0;
      
      while (true) {
        const line = await askQuestion('');
        if (line.trim() === '' && lineCount > 0) break;
        if (line.trim() !== '') lineCount++;
        userAnswer += line + '\n';
      }

      userAnswer = userAnswer.trim();
      
      if (userAnswer.length === 0) {
        console.log('⚠️ No answer provided, skipping evaluation...');
        continue;
      }

      console.log('\n⚡ Evaluating your answer...');
      
      try {
        // Evaluate the answer
        const evaluation = await evaluator.evaluateAnswer(randomQuestion.id, userAnswer);
        
        console.log('\n' + '📊 EVALUATION RESULTS '.padStart(40, '=').padEnd(80, '='));
        console.log(`\n🎯 Overall Score: ${formatScore(evaluation.score)}`);
        console.log(`🧠 Semantic Similarity: ${formatSimilarity(evaluation.similarity)}`);
        console.log(`🔑 Keywords Found: [${evaluation.keywordMatches.join(', ')}] (${evaluation.keywordMatches.length}/${randomQuestion.keywords.length})`);
        console.log(`✅ Considered Correct: ${evaluation.isCorrect ? '✅ Yes' : '❌ No'}`);
        
        console.log('\n💬 DETAILED FEEDBACK:');
        console.log('-'.repeat(60));
        console.log(evaluation.feedback);
        console.log('-'.repeat(60));

        if (evaluation.suggestions && evaluation.suggestions.length > 0) {
          console.log('\n💡 SUGGESTIONS FOR IMPROVEMENT:');
          evaluation.suggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. ${suggestion}`);
          });
        }

        // Show reference answer option
        const showReference = await askQuestion('\n🔍 Would you like to see the reference answer? (y/n): ');
        if (showReference.toLowerCase() === 'y' || showReference.toLowerCase() === 'yes') {
          console.log('\n📚 REFERENCE ANSWER:');
          console.log('-'.repeat(60));
          console.log(randomQuestion.reference_answer);
          console.log('-'.repeat(60));
        }

        await pause();

      } catch (error) {
        console.error('❌ Evaluation failed:', error);
        console.log('Please try again with a different question.');
      }
    }

  } catch (error) {
    console.error('❌ Failed to initialize the interview simulator:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    rl.close();
  }
}

// Performance tracking
console.log('🚀 Starting Interactive Technical Interview Simulator...\n');
const startTime = Date.now();

runInteractiveInterview()
  .then(() => {
    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Session completed in ${(duration / 1000).toFixed(1)} seconds`);
    console.log('🎓 Keep practicing to improve your technical interview skills!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Simulator failed:', error);
    process.exit(1);
  });