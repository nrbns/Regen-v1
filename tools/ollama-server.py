#!/usr/bin/env python3
"""
Ollama Server Wrapper
Provides HTTP API for local Ollama CLI
PR: Local LLM integration
"""

import subprocess
import json
import os
import sys
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
from typing import Optional, Dict, Any

app = Flask(__name__)
CORS(app)

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
DEFAULT_MODEL = os.getenv('OLLAMA_MODEL', 'phi3:mini')


def check_ollama_available() -> bool:
    """Check if Ollama is running and accessible"""
    try:
        response = requests.get(f'{OLLAMA_BASE_URL}/api/tags', timeout=2)
        return response.status_code == 200
    except:
        return False


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    available = check_ollama_available()
    return jsonify({
        'status': 'ok' if available else 'degraded',
        'ollama_available': available,
        'ollama_url': OLLAMA_BASE_URL,
    })


@app.route('/v1/llm', methods=['POST'])
def llm_query():
    """
    Query local Ollama LLM
    Body: { "prompt": "...", "model": "...", "temperature": 0.7, "max_tokens": 1000 }
    """
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        model = data.get('model', DEFAULT_MODEL)
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens', 1000)

        if not prompt:
            return jsonify({'error': 'prompt is required'}), 400

        # Call Ollama API
        ollama_payload = {
            'model': model,
            'prompt': prompt,
            'stream': False,
            'options': {
                'temperature': temperature,
                'num_predict': max_tokens,
            },
        }

        response = requests.post(
            f'{OLLAMA_BASE_URL}/api/generate',
            json=ollama_payload,
            timeout=120,
        )

        if response.status_code != 200:
            return jsonify({
                'error': f'Ollama API error: {response.status_code}',
                'details': response.text,
            }), 500

        result = response.json()
        return jsonify({
            'text': result.get('response', ''),
            'model': model,
            'tokens_used': result.get('eval_count', 0),
            'provider': 'ollama',
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': f'Ollama connection failed: {str(e)}',
            'hint': 'Make sure Ollama is running: ollama serve',
        }), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/v1/llm/stream', methods=['POST'])
def llm_query_stream():
    """
    Stream LLM response
    Body: { "prompt": "...", "model": "..." }
    """
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        model = data.get('model', DEFAULT_MODEL)
        temperature = data.get('temperature', 0.7)

        if not prompt:
            return jsonify({'error': 'prompt is required'}), 400

        ollama_payload = {
            'model': model,
            'prompt': prompt,
            'stream': True,
            'options': {
                'temperature': temperature,
            },
        }

        response = requests.post(
            f'{OLLAMA_BASE_URL}/api/generate',
            json=ollama_payload,
            stream=True,
            timeout=120,
        )

        def generate():
            try:
                for line in response.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            if 'response' in chunk:
                                yield f"data: {json.dumps({'text': chunk['response']})}\n\n"
                            if chunk.get('done', False):
                                yield f"data: [DONE]\n\n"
                                break
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/v1/embeddings', methods=['POST'])
def get_embeddings():
    """
    Get embeddings from Ollama
    Body: { "text": "...", "model": "..." }
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        model = data.get('model', 'nomic-embed-text')  # Default embedding model

        if not text:
            return jsonify({'error': 'text is required'}), 400

        ollama_payload = {
            'model': model,
            'prompt': text,
        }

        response = requests.post(
            f'{OLLAMA_BASE_URL}/api/embeddings',
            json=ollama_payload,
            timeout=30,
        )

        if response.status_code != 200:
            return jsonify({
                'error': f'Ollama API error: {response.status_code}',
            }), 500

        result = response.json()
        return jsonify({
            'embedding': result.get('embedding', []),
            'model': model,
            'provider': 'ollama',
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/v1/models', methods=['GET'])
def list_models():
    """List available Ollama models"""
    try:
        response = requests.get(f'{OLLAMA_BASE_URL}/api/tags', timeout=5)
        if response.status_code == 200:
            data = response.json()
            models = [m['name'] for m in data.get('models', [])]
            return jsonify({'models': models})
        else:
            return jsonify({'models': [], 'error': 'Ollama not available'}), 503
    except:
        return jsonify({'models': [], 'error': 'Ollama not available'}), 503


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f'🚀 Ollama Server Wrapper starting on port {port}')
    print(f'📡 Ollama URL: {OLLAMA_BASE_URL}')
    print(f'🤖 Default model: {DEFAULT_MODEL}')
    
    if not check_ollama_available():
        print('⚠️  Warning: Ollama is not available. Start it with: ollama serve')
    
    app.run(host='0.0.0.0', port=port, debug=False)
