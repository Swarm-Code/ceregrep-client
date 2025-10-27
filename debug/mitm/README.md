# Cerebras API MITM Proxy Router

This is a transparent proxy server for debugging issues with Cerebras API requests, particularly 400 errors.

## Features

- Captures ALL requests and responses
- Logs full request/response bodies without truncation
- Saves detailed logs to `./logs/` directory
- Special handling for 400 errors
- Request timing information
- Message count and body size tracking

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the proxy server:
```bash
npm start
```

Or run in development mode with auto-restart:
```bash
npm run dev
```

## Configuration

Environment variables:
- `PROXY_PORT`: Port to run the proxy on (default: 8080)
- `TARGET_API`: Target API base URL (default: https://api.cerebras.ai)

## Usage

1. Start the proxy server
2. Update your `~/.ceregrep.json` to use the proxy:
```json
{
  "provider": {
    "baseURL": "http://localhost:8080/v1"
  }
}
```

3. Run scout commands as normal - all traffic will be logged

## Log Files

Logs are saved to `./logs/` directory:
- `{number}_{uuid}.json` - Complete request/response for each call
- `ERROR_400_{number}_{uuid}.json` - Special logs for 400 errors
- `ERROR_{number}_{uuid}.json` - Other error logs

## Analyzing 400 Errors

When a 400 error occurs, the proxy will:
1. Log "!!! 400 BAD REQUEST DETECTED !!!" to console
2. Save detailed error log with message count and body size
3. Show the response body (if any) from Cerebras

## Example Output

```
================================================================================
REQUEST #1 [abc-123-def]
Timestamp: 2024-10-24T12:00:00.000Z
Method: POST
Path: /v1/chat/completions
================================================================================

--- MESSAGE COUNT: 14 ---
--- BODY SIZE: 15.63 KB ---
  Message 1: role=system, content=You are a helpful AI assistant...
  Message 2: role=user, content=Analyze the complete architecture...
  ...

--- RESPONSE STATUS: 400 ---
--- RESPONSE TIME: 234ms ---
!!! 400 BAD REQUEST DETECTED !!!
```