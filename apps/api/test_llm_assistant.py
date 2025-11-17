"""
Test LLM Assistant API Endpoints
"""

import asyncio
import httpx
import json
import sys

API_URL = "http://localhost:8000"


async def test_page_extraction():
    """Test page content extraction"""
    print("\n📄 Testing Page Extraction...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_URL}/extract/extract",
                json={"url": "https://en.wikipedia.org/wiki/TypeScript"},
            )
            response.raise_for_status()
            data = response.json()
            print("✅ Page extraction successful")
            print(f"   Title: {data.get('title', 'N/A')}")
            print(f"   Content length: {len(data.get('content', ''))} chars")
            print(f"   Language: {data.get('lang', 'N/A')}")
            return True
    except Exception as e:
        print(f"❌ Page extraction failed: {e}")
        return False


async def test_ask_about_page():
    """Test ask about page endpoint"""
    print("\n❓ Testing Ask About Page...")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{API_URL}/llm/ask-about-page",
                json={
                    "prompt": "What is TypeScript?",
                    "url": "https://en.wikipedia.org/wiki/TypeScript",
                },
            )
            response.raise_for_status()
            
            # Handle SSE stream
            answer = ""
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        if data.get("type") == "token" and data.get("text"):
                            answer += data["text"]
                        elif data.get("type") == "done":
                            break
                    except:
                        pass
            
            print("✅ Ask about page successful")
            print(f"   Answer length: {len(answer)} chars")
            if answer:
                print(f"   Preview: {answer[:100]}...")
            return True
    except Exception as e:
        print(f"❌ Ask about page failed: {e}")
        return False


async def test_page_summarization():
    """Test page summarization endpoint"""
    print("\n📝 Testing Page Summarization...")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{API_URL}/llm/summarize-page",
                json={
                    "url": "https://en.wikipedia.org/wiki/TypeScript",
                    "style": "concise",
                    "max_length": 100,
                },
            )
            response.raise_for_status()
            
            # Handle SSE stream
            summary = ""
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        if data.get("type") == "token" and data.get("text"):
                            summary += data["text"]
                        elif data.get("type") == "done":
                            break
                    except:
                        pass
            
            print("✅ Page summarization successful")
            print(f"   Summary length: {len(summary)} chars")
            if summary:
                print(f"   Summary: {summary[:200]}...")
            return True
    except Exception as e:
        print(f"❌ Page summarization failed: {e}")
        return False


async def test_llm_assistant():
    """Test general LLM assistant endpoint"""
    print("\n🤖 Testing LLM Assistant...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_URL}/llm/assistant",
                json={
                    "prompt": "Explain quantum computing in simple terms",
                    "context": "Quantum computing uses quantum mechanics principles",
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
            print("✅ LLM Assistant successful")
            print(f"   Model: {data.get('model', 'N/A')}")
            print(f"   Response length: {len(data.get('response', ''))} chars")
            if data.get("response"):
                print(f"   Preview: {data['response'][:100]}...")
            return True
    except Exception as e:
        print(f"❌ LLM Assistant failed: {e}")
        return False


async def test_ai_search():
    """Test AI search endpoint"""
    print("\n🔍 Testing AI Search...")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{API_URL}/search/ai-search",
                json={
                    "query": "React performance optimization",
                    "max_results": 10,
                    "include_summary": True,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
            print("✅ AI Search successful")
            print(f"   Total results: {data.get('total_results', 0)}")
            if data.get("summary"):
                print(f"   Summary length: {len(data['summary'])} chars")
                print(f"   Summary preview: {data['summary'][:100]}...")
            return True
    except Exception as e:
        print(f"❌ AI Search failed: {e}")
        return False


async def test_search_with_summary():
    """Test search endpoint with summary"""
    print("\n🔎 Testing Search with Summary...")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{API_URL}/search",
                json={
                    "query": "TypeScript best practices",
                    "max_results": 15,
                    "include_summary": True,
                    "summary_length": 150,
                },
            )
            response.raise_for_status()
            data = response.json()
            print("✅ Search with summary successful")
            print(f"   Total results: {data.get('total_results', 0)}")
            print(f"   Sources used: {', '.join(data.get('sources_used', []))}")
            if data.get("summary"):
                print(f"   Summary: {data['summary'][:150]}...")
            return True
    except Exception as e:
        print(f"❌ Search with summary failed: {e}")
        return False


async def run_all_tests():
    """Run all tests"""
    print("🧪 Starting LLM Assistant & AI Search Tests")
    print(f"API URL: {API_URL}\n")

    results = {
        "page_extraction": await test_page_extraction(),
        "ask_about_page": await test_ask_about_page(),
        "page_summarization": await test_page_summarization(),
        "llm_assistant": await test_llm_assistant(),
        "ai_search": await test_ai_search(),
        "search_with_summary": await test_search_with_summary(),
    }

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    print("\nDetailed Results:")
    for test, result in results.items():
        print(f"  {'✅' if result else '❌'} {test}")

    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)




