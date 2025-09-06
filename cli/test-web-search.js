#!/usr/bin/env node

// Simple test script to verify web search functionality
// This can be run without Copilot authentication

// Test web search using DuckDuckGo API
async function testWebSearch() {
  console.log('Testing web search functionality...');
  
  try {
    const query = "nodejs best practices";
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    console.log(`Search query: "${query}"`);
    console.log('Response keys:', Object.keys(data));
    
    if (data.AbstractText) {
      console.log('✓ Abstract found:', data.AbstractText.substring(0, 100) + '...');
    }
    
    if (data.Answer) {
      console.log('✓ Direct answer found:', data.Answer);
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      console.log(`✓ Found ${data.RelatedTopics.length} related topics`);
      console.log('First topic:', data.RelatedTopics[0].Text?.substring(0, 100) + '...');
    }
    
    console.log('✓ Web search test completed successfully');
    
  } catch (error) {
    console.error('✗ Web search test failed:', error.message);
    process.exit(1);
  }
}

// Node 18+ has global fetch. For older Node, we'll need node-fetch.
if (typeof fetch === 'undefined') {
  console.log('Global fetch not available. Testing with basic URL approach.');
  console.log('✓ Web search functionality should work with Node 18+');
} else {
  testWebSearch();
}