#!/usr/bin/env node

/**
 * MITM Proxy Router for Cerebras API
 * Captures all requests and responses for debugging 400 errors
 */

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const PROXY_PORT = process.env.PROXY_PORT || 8080;
const TARGET_BASE_URL = process.env.TARGET_API || 'https://api.cerebras.ai';
const LOG_DIR = path.join(__dirname, 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create Express app
const app = express();

// Raw body parsing middleware to capture exact request body
app.use(express.raw({
  type: '*/*',
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    // Store raw body for logging
    req.rawBody = buf.toString('utf8');
  }
}));

// Request counter for easy tracking
let requestCounter = 0;

// Main proxy middleware
app.use(async (req, res) => {
  const requestId = uuidv4();
  const requestNumber = ++requestCounter;
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  // Parse the body if it's JSON
  let parsedBody = null;
  try {
    parsedBody = JSON.parse(req.rawBody || '{}');
  } catch (e) {
    parsedBody = req.rawBody;
  }

  // Log request details
  console.log(`\n${'='.repeat(80)}`);
  console.log(`REQUEST #${requestNumber} [${requestId}]`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log(`${'='.repeat(80)}`);

  console.log('\n--- REQUEST HEADERS ---');
  console.log(JSON.stringify(req.headers, null, 2));

  console.log('\n--- REQUEST BODY ---');
  if (typeof parsedBody === 'object') {
    console.log(JSON.stringify(parsedBody, null, 2));

    // Log message count if present
    if (parsedBody.messages && Array.isArray(parsedBody.messages)) {
      console.log(`\n--- MESSAGE COUNT: ${parsedBody.messages.length} ---`);

      // Calculate and log body size
      const bodySize = req.rawBody ? req.rawBody.length : 0;
      console.log(`--- BODY SIZE: ${(bodySize / 1024).toFixed(2)} KB ---`);

      // Log each message role and content preview
      parsedBody.messages.forEach((msg, idx) => {
        const contentPreview = msg.content ?
          (msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')) :
          '(no content)';
        console.log(`  Message ${idx + 1}: role=${msg.role}, content=${contentPreview}`);
        if (msg.tool_calls) {
          console.log(`             tool_calls: ${msg.tool_calls.length} calls`);
        }
      });
    }
  } else {
    console.log(parsedBody);
  }

  // Prepare request for forwarding
  const targetUrl = `${TARGET_BASE_URL}${req.path}`;
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders['host']; // Remove host header to avoid issues
  delete forwardHeaders['content-length']; // Let axios calculate this

  // Create request log object
  const requestLog = {
    requestId,
    requestNumber,
    timestamp,
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: parsedBody,
    bodySize: req.rawBody ? req.rawBody.length : 0
  };

  try {
    console.log(`\n--- FORWARDING TO: ${targetUrl} ---`);

    // Forward request to Cerebras API
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: forwardHeaders,
      data: req.rawBody,
      validateStatus: () => true, // Accept any status code
      timeout: 120000, // 2 minute timeout
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const duration = Date.now() - startTime;

    // Log response
    console.log(`\n--- RESPONSE STATUS: ${response.status} ---`);
    console.log(`--- RESPONSE TIME: ${duration}ms ---`);
    console.log('\n--- RESPONSE HEADERS ---');
    console.log(JSON.stringify(response.headers, null, 2));

    console.log('\n--- RESPONSE BODY ---');
    if (response.data) {
      if (typeof response.data === 'object') {
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.log(response.data);
      }
    } else {
      console.log('(empty response body)');
    }

    // Create response log object
    const responseLog = {
      status: response.status,
      headers: response.headers,
      body: response.data,
      duration
    };

    // Save complete log to file
    const logFilePath = path.join(LOG_DIR, `${requestNumber}_${requestId}.json`);
    fs.writeFileSync(logFilePath, JSON.stringify({
      request: requestLog,
      response: responseLog
    }, null, 2));
    console.log(`\n--- LOG SAVED TO: ${logFilePath} ---`);

    // Handle 400 errors specially
    if (response.status === 400) {
      console.log('\n!!! 400 BAD REQUEST DETECTED !!!');
      console.log('Response body:', response.data || '(no body)');

      // Save error-specific log
      const errorLogPath = path.join(LOG_DIR, `ERROR_400_${requestNumber}_${requestId}.json`);
      fs.writeFileSync(errorLogPath, JSON.stringify({
        request: requestLog,
        response: responseLog,
        error: {
          status: 400,
          body: response.data || null,
          timestamp,
          messageCount: parsedBody.messages ? parsedBody.messages.length : 0,
          bodySize: req.rawBody ? req.rawBody.length : 0
        }
      }, null, 2));
      console.log(`--- ERROR LOG SAVED TO: ${errorLogPath} ---`);
    }

    // Forward response to client
    res.status(response.status);

    // Set response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'content-encoding' &&
          key.toLowerCase() !== 'transfer-encoding') {
        res.set(key, value);
      }
    });

    // Send response
    if (response.data) {
      if (typeof response.data === 'object') {
        res.json(response.data);
      } else {
        res.send(response.data);
      }
    } else {
      res.end();
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n--- PROXY ERROR after ${duration}ms ---`);
    console.error(error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }

    // Log error
    const errorLog = {
      request: requestLog,
      error: {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : null,
        duration
      }
    };

    const errorLogPath = path.join(LOG_DIR, `ERROR_${requestNumber}_${requestId}.json`);
    fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
    console.log(`--- ERROR LOG SAVED TO: ${errorLogPath} ---`);

    // Return error to client
    if (error.response) {
      res.status(error.response.status).json(error.response.data || { error: 'Proxy error' });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Gateway timeout', message: error.message });
    } else {
      res.status(502).json({ error: 'Bad gateway', message: error.message });
    }
  }

  console.log(`${'='.repeat(80)}\n`);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal proxy error', message: err.message });
});

// Start server
app.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          CEREBRAS API MITM PROXY ROUTER                     ║
╠════════════════════════════════════════════════════════════╣
║  Proxy URL:     http://localhost:${PROXY_PORT}/v1                     ║
║  Target API:    ${TARGET_BASE_URL}            ║
║  Log Directory: ${LOG_DIR}           ║
╠════════════════════════════════════════════════════════════╣
║  Status: LISTENING FOR REQUESTS                             ║
╚════════════════════════════════════════════════════════════╝
  `);
  console.log('Update ~/.ceregrep.json to use:');
  console.log(JSON.stringify({
    "baseURL": `http://localhost:${PROXY_PORT}/v1`
  }, null, 2));
  console.log('\nReady to intercept and log all Cerebras API traffic...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down proxy server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down proxy server...');
  process.exit(0);
});