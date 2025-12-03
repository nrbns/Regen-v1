#!/usr/bin/env python3
"""
FAISS Vector Search Service
Local vector store for embeddings and semantic search
PR: Vector search integration
"""

import os
import json
import pickle
from typing import List, Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

# Try to import FAISS, fallback to in-memory if not available
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    print('⚠️  FAISS not installed. Using in-memory fallback.')
    print('   Install with: pip install faiss-cpu  # or faiss-gpu')

app = Flask(__name__)
CORS(app)

# Storage
VECTOR_DIM = 384  # Default embedding dimension (sentence-transformers)
INDEX_FILE = os.getenv('FAISS_INDEX_FILE', 'faiss_index.bin')
METADATA_FILE = os.getenv('FAISS_METADATA_FILE', 'faiss_metadata.json')

# In-memory fallback
if not FAISS_AVAILABLE:
    vectors: List[np.ndarray] = []
    metadata_list: List[Dict[str, Any]] = []
else:
    index: Optional[faiss.Index] = None
    metadata_list: List[Dict[str, Any]] = []


def initialize_index(dimension: int = VECTOR_DIM):
    """Initialize FAISS index"""
    global index
    if FAISS_AVAILABLE:
        index = faiss.IndexFlatL2(dimension)
        print(f'✅ FAISS index initialized (dimension={dimension})')
    else:
        print('✅ In-memory index initialized')


def load_index():
    """Load index from disk"""
    global index, metadata_list
    
    if os.path.exists(INDEX_FILE) and FAISS_AVAILABLE:
        try:
            index = faiss.read_index(INDEX_FILE)
            print(f'✅ Loaded FAISS index from {INDEX_FILE}')
        except Exception as e:
            print(f'⚠️  Failed to load index: {e}')
            initialize_index()
    else:
        initialize_index()
    
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, 'r') as f:
                metadata_list = json.load(f)
            print(f'✅ Loaded {len(metadata_list)} metadata entries')
        except Exception as e:
            print(f'⚠️  Failed to load metadata: {e}')
            metadata_list = []


def save_index():
    """Save index to disk"""
    if FAISS_AVAILABLE and index is not None:
        try:
            faiss.write_index(index, INDEX_FILE)
            print(f'✅ Saved FAISS index to {INDEX_FILE}')
        except Exception as e:
            print(f'⚠️  Failed to save index: {e}')
    
    try:
        with open(METADATA_FILE, 'w') as f:
            json.dump(metadata_list, f)
        print(f'✅ Saved metadata to {METADATA_FILE}')
    except Exception as e:
        print(f'⚠️  Failed to save metadata: {e}')


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'ok',
        'faiss_available': FAISS_AVAILABLE,
        'vector_count': len(metadata_list),
        'dimension': VECTOR_DIM,
    })


@app.route('/v1/add', methods=['POST'])
def add_embedding():
    """
    Add embedding to vector store
    Body: { "text": "...", "embedding": [0.1, 0.2, ...], "metadata": {...} }
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        embedding = data.get('embedding', [])
        metadata = data.get('metadata', {})

        if not text:
            return jsonify({'error': 'text is required'}), 400

        if not embedding:
            return jsonify({'error': 'embedding is required'}), 400

        embedding_array = np.array(embedding, dtype=np.float32)

        if embedding_array.shape[0] != VECTOR_DIM:
            return jsonify({
                'error': f'Embedding dimension mismatch. Expected {VECTOR_DIM}, got {embedding_array.shape[0]}',
            }), 400

        # Add to index
        if FAISS_AVAILABLE and index is not None:
            embedding_2d = embedding_array.reshape(1, -1)
            index.add(embedding_2d)
        else:
            vectors.append(embedding_array)

        # Store metadata
        entry_id = len(metadata_list)
        metadata_list.append({
            'id': entry_id,
            'text': text,
            'metadata': metadata,
        })

        save_index()

        return jsonify({
            'id': entry_id,
            'status': 'added',
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/v1/search', methods=['POST'])
def search():
    """
    Search for similar embeddings
    Body: { "query_embedding": [0.1, 0.2, ...], "k": 5 }
    """
    try:
        data = request.get_json()
        query_embedding = data.get('query_embedding', [])
        k = data.get('k', 5)

        if not query_embedding:
            return jsonify({'error': 'query_embedding is required'}), 400

        query_array = np.array(query_embedding, dtype=np.float32).reshape(1, -1)

        if query_array.shape[1] != VECTOR_DIM:
            return jsonify({
                'error': f'Query dimension mismatch. Expected {VECTOR_DIM}, got {query_array.shape[1]}',
            }), 400

        # Search
        if FAISS_AVAILABLE and index is not None:
            distances, indices = index.search(query_array, min(k, len(metadata_list)))
            results = []
            for i, idx in enumerate(indices[0]):
                if idx < len(metadata_list):
                    results.append({
                        'id': metadata_list[idx]['id'],
                        'text': metadata_list[idx]['text'],
                        'score': float(distances[0][i]),
                        'metadata': metadata_list[idx].get('metadata', {}),
                    })
        else:
            # In-memory search
            results = []
            for i, vec in enumerate(vectors):
                distance = np.linalg.norm(query_array[0] - vec)
                results.append({
                    'id': i,
                    'text': metadata_list[i]['text'],
                    'score': float(distance),
                    'metadata': metadata_list[i].get('metadata', {}),
                })
            results.sort(key=lambda x: x['score'])
            results = results[:k]

        return jsonify({
            'results': results,
            'count': len(results),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/v1/clear', methods=['POST'])
def clear():
    """Clear all embeddings"""
    global index, metadata_list, vectors
    
    if FAISS_AVAILABLE:
        initialize_index()
    else:
        vectors = []
    
    metadata_list = []
    save_index()
    
    return jsonify({'status': 'cleared'})


@app.route('/v1/stats', methods=['GET'])
def stats():
    """Get statistics"""
    return jsonify({
        'vector_count': len(metadata_list),
        'dimension': VECTOR_DIM,
        'faiss_available': FAISS_AVAILABLE,
        'index_file': INDEX_FILE if os.path.exists(INDEX_FILE) else None,
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    print(f'🚀 FAISS Service starting on port {port}')
    
    load_index()
    
    app.run(host='0.0.0.0', port=port, debug=False)
