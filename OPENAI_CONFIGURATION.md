# AI Provider Configuration Guide

## Environment Variables Setup

Create a `.env` file in the root directory with the following configuration:

### Option 1: OpenAI (Direct)

```env
# Server Configuration
PORT=5000
APP_URL=http://localhost:5000

# AI Provider
AI_PROVIDER=openai

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3
```

### Option 2: OpenRouter (Multi-Model Gateway)

```env
# Server Configuration
PORT=5000
APP_URL=http://localhost:5000

# AI Provider
AI_PROVIDER=openrouter

# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-3.5-turbo
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3
```

## Configuration Options

### AI_PROVIDER
Choose between OpenAI direct or OpenRouter gateway.

**Options**:
- `openai` - Direct OpenAI API (requires OpenAI account)
- `openrouter` - OpenRouter gateway (access to 100+ models)

**Default**: `openai`

### OPENAI_API_KEY
Your OpenAI API key. Get it from: https://platform.openai.com/api-keys

**Required**: Yes (if using `AI_PROVIDER=openai`)

### OPENROUTER_API_KEY
Your OpenRouter API key. Get it from: https://openrouter.ai/keys

**Required**: Yes (if using `AI_PROVIDER=openrouter`)

### OPENAI_MODEL (for OpenAI provider)
The OpenAI model to use for analysis.

**Options**:
- `gpt-4-turbo-preview` (recommended) - Most accurate, ~$0.03/1K tokens
- `gpt-4` - Accurate but slower, ~$0.03/1K tokens
- `gpt-3.5-turbo` - Faster and cheaper, ~$0.002/1K tokens

**Default**: `gpt-4-turbo-preview`

### OPENROUTER_MODEL (for OpenRouter provider)
The model to use via OpenRouter. Supports 100+ models!

**Popular Options**:
- `openai/gpt-4-turbo-preview` - OpenAI GPT-4 Turbo, ~$0.03/1K tokens
- `openai/gpt-3.5-turbo` - OpenAI GPT-3.5, ~$0.002/1K tokens (CHEAPEST)
- `anthropic/claude-3-opus` - Claude 3 Opus, ~$0.075/1K tokens (BEST QUALITY)
- `anthropic/claude-3-sonnet` - Claude 3 Sonnet, ~$0.015/1K tokens (BALANCED)
- `anthropic/claude-3-haiku` - Claude 3 Haiku, ~$0.001/1K tokens (FAST & CHEAP)
- `meta-llama/llama-3-70b-instruct` - Llama 3 70B, ~$0.0009/1K tokens
- `google/gemini-pro-1.5` - Gemini Pro 1.5, ~$0.005/1K tokens

**Default**: `openai/gpt-4-turbo-preview`

**See all models**: https://openrouter.ai/models

### OPENAI_MAX_TOKENS
Maximum tokens to generate in response.

**Recommended**: 4000

### OPENAI_TEMPERATURE
Controls randomness in responses (0.0 = deterministic, 1.0 = creative).

**Recommended**: 0.3 (for business analysis consistency)

## Cost Estimation

Based on typical document sizes:

| Document Size | Tokens (approx) | Cost (GPT-4) | Cost (GPT-3.5) |
|---------------|-----------------|--------------|----------------|
| Small (50 KB) | ~5,000          | $0.15        | $0.01          |
| Medium (200 KB) | ~20,000       | $0.60        | $0.04          |
| Large (500 KB) | ~50,000        | $1.50        | $0.10          |

## Setup Instructions

1. Copy this configuration to `.env`:
   ```bash
   cp OPENAI_CONFIGURATION.md .env
   # Then edit .env with your actual API key
   ```

2. Ensure `.env` is in `.gitignore` (already configured)

3. Restart the server:
   ```bash
   npm run server
   ```

## Testing Your Configuration

Run the test script:
```bash
node test-ai-analysis.js
```

This will verify your API key and show a sample analysis.

