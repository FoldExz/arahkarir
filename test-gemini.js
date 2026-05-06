require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // get list of models
    const request = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await request.json();
    console.log(data.models.map(m => m.name).filter(n => n.includes('gemini')));
  } catch (err) {
    console.error('ERROR OCCURRED:', err.message, err.status);
  }
}
test();
