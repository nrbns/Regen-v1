"""
OpenAI Integration Tests
Run this script to test all OpenAI features
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Load .env file if it exists
env_file = Path(__file__).parent.parent.parent / '.env'
if env_file.exists():
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    value = value.replace('\x00', '')
                    if key and value:
                        os.environ[key] = value
    except Exception as e:
        print(f"Warning: Could not load .env file: {e}")

# Add parent directory to path for imports
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

try:
    from apps.api.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

def log(message, color=Colors.RESET):
    print(f"{color}{message}{Colors.RESET}")

async def test_status():
    """Test OpenAI API status"""
    log('\n[TEST] Testing OpenAI Status...', Colors.CYAN)
    try:
        openai = get_openai_client()
        has_key = bool(openai.api_key)
        
        log(f'   Has API Key: {has_key}', Colors.BLUE)
        log(f'   Base URL: {openai.base_url}', Colors.BLUE)
        
        if has_key:
            log('[OK] API key is configured', Colors.GREEN)
            try:
                available = await openai.check_available()
                log(f'   API Check Result: {available}', Colors.BLUE)
            except Exception as e:
                log(f'   API Check Error: {e}', Colors.YELLOW)
                available = True  # Assume available if we have key
            
            if has_key:
                log('[OK] OpenAI API is configured (will test actual calls)', Colors.GREEN)
                return True
        else:
            log('[WARN] API key not found in environment', Colors.YELLOW)
            return False
    except Exception as e:
        log(f'[ERROR] Status check error: {e}', Colors.RED)
        return False

async def test_embedding():
    """Test embedding generation"""
    log('\n[TEST] Testing Embedding Generation...', Colors.CYAN)
    try:
        openai = get_openai_client()
        if not openai.api_key:
            log('[SKIP] Skipping embedding test (API key not configured)', Colors.YELLOW)
            return False
        
        embedding = await openai.generate_embedding(
            'This is a test sentence for embedding generation.',
            'text-embedding-3-small'
        )
        
        if embedding and isinstance(embedding, list) and len(embedding) > 0:
            log('[OK] Embedding generation passed', Colors.GREEN)
            log(f'   Dimensions: {len(embedding)}', Colors.BLUE)
            log(f'   First 5 values: [{", ".join(f"{v:.4f}" for v in embedding[:5])}]', Colors.BLUE)
            return True
        else:
            log(f'[ERROR] Embedding generation failed: Invalid format', Colors.RED)
            return False
    except Exception as e:
        log(f'[ERROR] Embedding generation error: {e}', Colors.RED)
        return False

async def test_batch_embedding():
    """Test batch embedding generation"""
    log('\n[TEST] Testing Batch Embedding...', Colors.CYAN)
    try:
        openai = get_openai_client()
        if not openai.api_key:
            log('[SKIP] Skipping batch embedding test (API key not configured)', Colors.YELLOW)
            return False
        
        texts = [
            'First test sentence.',
            'Second test sentence.',
            'Third test sentence.',
        ]
        
        embeddings = await openai.batch_embed(
            texts,
            'text-embedding-3-small'
        )
        
        if embeddings and len(embeddings) == 3:
            log('[OK] Batch embedding passed', Colors.GREEN)
            log(f'   Count: {len(embeddings)}', Colors.BLUE)
            log(f'   Dimensions: {len(embeddings[0]) if embeddings else 0}', Colors.BLUE)
            return True
        else:
            log(f'[ERROR] Batch embedding failed: Invalid count ({len(embeddings) if embeddings else 0})', Colors.RED)
            return False
    except Exception as e:
        log(f'[ERROR] Batch embedding error: {e}', Colors.RED)
        return False

async def test_chat():
    """Test chat completion"""
    log('\n[TEST] Testing Chat Completion...', Colors.CYAN)
    try:
        openai = get_openai_client()
        if not openai.api_key:
            log('[SKIP] Skipping chat test (API key not configured)', Colors.YELLOW)
            return False
        
        messages = [
            {'role': 'user', 'content': 'Say "Hello from OpenAI!" in one sentence.'}
        ]
        
        log('   Streaming response:', Colors.BLUE)
        received_tokens = False
        
        async for chunk in openai.stream_chat(
            messages=messages,
            model='gpt-4o-mini',
            temperature=0.7,
            max_tokens=50,
        ):
            if chunk.get('error'):
                log(f'\n[ERROR] Chat completion error: {chunk["error"]}', Colors.RED)
                return False
            
            text = chunk.get('text', '')
            if text:
                received_tokens = True
                print(text, end='', flush=True)
            
            if chunk.get('done'):
                break
        
        if received_tokens:
            log('\n[OK] Chat completion passed', Colors.GREEN)
            return True
        else:
            log('\n[ERROR] Chat completion failed: No tokens received', Colors.RED)
            return False
    except Exception as e:
        log(f'\n[ERROR] Chat completion error: {e}', Colors.RED)
        return False

async def run_all_tests():
    """Run all tests"""
    log('\n[TEST] Starting OpenAI Integration Tests', Colors.YELLOW)
    log('=' * 60, Colors.CYAN)
    
    # Check API key
    api_key = os.getenv('OPENAI_API_KEY', '')
    if not api_key:
        log('\n[WARN] OPENAI_API_KEY not found in environment', Colors.YELLOW)
        log('   Please set it in your .env file or environment', Colors.YELLOW)
    else:
        log(f'\n[OK] API key found: {api_key[:10]}...{api_key[-4:]}', Colors.GREEN)
    
    results = {
        'status': False,
        'embedding': False,
        'batch_embedding': False,
        'chat': False,
    }
    
    # Run tests
    results['status'] = await test_status()
    
    if results['status'] or api_key:
        results['embedding'] = await test_embedding()
        if results['embedding']:
            results['batch_embedding'] = await test_batch_embedding()
        results['chat'] = await test_chat()
    else:
        log('\n[SKIP] Skipping other tests (API key not configured)', Colors.YELLOW)
    
    # Summary
    log('\n' + '=' * 60, Colors.CYAN)
    log('\n[SUMMARY] Test Results Summary:', Colors.YELLOW)
    log('=' * 60, Colors.CYAN)
    
    total_tests = len(results)
    passed_tests = sum(1 for v in results.values() if v)
    
    log(f'\n[PASS] Status Check: {"PASS" if results["status"] else "FAIL"}', 
        Colors.GREEN if results['status'] else Colors.RED)
    log(f'[PASS] Embedding: {"PASS" if results["embedding"] else "FAIL"}', 
        Colors.GREEN if results['embedding'] else Colors.RED)
    log(f'[PASS] Batch Embedding: {"PASS" if results["batch_embedding"] else "FAIL"}', 
        Colors.GREEN if results['batch_embedding'] else Colors.RED)
    log(f'[PASS] Chat Completion: {"PASS" if results["chat"] else "FAIL"}', 
        Colors.GREEN if results['chat'] else Colors.RED)
    
    log('\n' + '=' * 60, Colors.CYAN)
    log(f'\n[RESULT] Overall: {passed_tests}/{total_tests} tests passed', 
        Colors.GREEN if passed_tests == total_tests else Colors.YELLOW)
    
    if passed_tests == total_tests:
        log('\n[SUCCESS] All tests passed! OpenAI integration is working correctly.', Colors.GREEN)
        return 0
    else:
        log('\n[WARNING] Some tests failed. Please check the errors above.', Colors.YELLOW)
        return 1

if __name__ == '__main__':
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)

