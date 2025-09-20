/**
 * Environment check script
 * Verifies that required environment variables are set
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function checkEnvironment() {
  console.log('🔍 Checking Environment Configuration\n');
  
  const requiredEnvVars = [
    'COHERE_API_KEY'
  ];
  
  const optionalEnvVars = [
    'PORT',
    'NODE_ENV'
  ];
  
  let allRequired = true;
  
  console.log('📋 Required Environment Variables:');
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      const maskedValue = value.length > 8 
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : '***masked***';
      console.log(`✅ ${envVar}: ${maskedValue}`);
    } else {
      console.log(`❌ ${envVar}: NOT SET`);
      allRequired = false;
    }
  }
  
  console.log('\n📋 Optional Environment Variables:');
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${value}`);
    } else {
      console.log(`ℹ️  ${envVar}: not set (using default)`);
    }
  }
  
  console.log('\n📁 Current Working Directory:', process.cwd());
  console.log('📄 Node Version:', process.version);
  
  if (!allRequired) {
    console.log('\n❌ Missing required environment variables!');
    console.log('\n💡 To fix this:');
    console.log('1. Create a .env file in the backend directory');
    console.log('2. Add your Cohere API key: COHERE_API_KEY=your_api_key_here');
    console.log('3. Get your API key from: https://dashboard.cohere.ai/api-keys');
    process.exit(1);
  }
  
  console.log('\n✅ Environment configuration looks good!');
  return true;
}

// Run the check
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  try {
    checkEnvironment();
    process.exit(0);
  } catch (error) {
    console.error('❌ Environment check failed:', error);
    process.exit(1);
  }
}

export { checkEnvironment };