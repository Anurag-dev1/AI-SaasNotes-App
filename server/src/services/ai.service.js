const env = require('../config/env');
const logger = require('../config/logger');
const { AppError } = require('../middleware/error-handler');

let googleGenAI = null;
let openaiClient = null;

if (env.AI_PROVIDER === 'google') {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  googleGenAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
} else if (env.AI_PROVIDER === 'openai') {
  const OpenAI = require('openai');
  openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

function checkContentSize(content) {
  if (Buffer.byteLength(content, 'utf8') > env.AI_CONTENT_MAX_BYTES) {
    throw new AppError(400, 'Content exceeds maximum size for AI processing');
  }
}

exports.summarize = async (content) => {
  checkContentSize(content);

  try {
    if (env.AI_PROVIDER === 'google') {
      const model = googleGenAI.getGenerativeModel({ model: env.SUMMARY_MODEL });
      const prompt = `Summarize the following note content concisely in 2-3 sentences, capturing the key points:\n\n${content}`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } else {
      const response = await openaiClient.chat.completions.create({
        model: env.SUMMARY_MODEL,
        messages: [
          { role: 'system', content: 'Summarize the following note content concisely in 2-3 sentences, capturing the key points.' },
          { role: 'user', content }
        ],
      });
      return response.choices[0].message.content;
    }
  } catch (error) {
    logger.error(`AI Summarization Error: ${error.message}`);
    throw new AppError(500, 'Failed to summarize content via AI');
  }
};

exports.generateEmbedding = async (text) => {
  checkContentSize(text);

  try {
    if (env.AI_PROVIDER === 'google') {
      const model = googleGenAI.getGenerativeModel({ model: env.EMBEDDING_MODEL });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } else {
      const response = await openaiClient.embeddings.create({
        model: env.EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0].embedding;
    }
  } catch (error) {
    logger.error(`AI Embedding Error: ${error.message}`);
    throw new AppError(500, 'Failed to generate embedding via AI');
  }
};
