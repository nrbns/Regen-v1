"""
Cognitive Router - Model Fusion with LangChain
Routes queries to appropriate models (GPT reasoning, Ollama logic, Claude ethics)
"""

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain, SequentialChain
import os

# Initialize models
def get_models():
    """Get initialized LLM models"""
    models = {}
    
    # GPT for reasoning
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        models["gpt"] = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=openai_key
        )
    
    # Claude for ethics
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        models["claude"] = ChatAnthropic(
            model="claude-3-haiku-20240307",
            temperature=0.1,
            api_key=anthropic_key
        )
    
    # Ollama for local efficiency
    try:
        models["ollama"] = Ollama(
            model="llama3.2",
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        )
    except:
        models["ollama"] = None
    
    return models

# Prompts for different tasks
reason_prompt = PromptTemplate(
    input_variables=["input", "context"],
    template="Reason step-by-step about: {input}\n\nContext: {context}\n\nProvide clear reasoning:"
)

logic_prompt = PromptTemplate(
    input_variables=["reasoning"],
    template="Generate precise logic or code from this reasoning: {reasoning}\n\nOutput:"
)

ethics_prompt = PromptTemplate(
    input_variables=["logic", "criteria"],
    template="Check ethical compliance in: {logic}\n\nCriteria: {criteria}\n\nEthics check:"
)

# Create chains
def create_chains(models):
    """Create LangChain chains for fusion"""
    chains = {}
    
    if "gpt" in models and models["gpt"]:
        chains["reason"] = LLMChain(
            llm=models["gpt"],
            prompt=reason_prompt,
            output_key="reasoning"
        )
    
    if "ollama" in models and models["ollama"]:
        chains["logic"] = LLMChain(
            llm=models["ollama"],
            prompt=logic_prompt,
            output_key="logic"
        )
    
    if "claude" in models and models["claude"]:
        chains["ethics"] = LLMChain(
            llm=models["claude"],
            prompt=ethics_prompt,
            output_key="ethics_check"
        )
    
    return chains

# Fusion chain
def get_fusion_chain():
    """Get the fusion chain for multi-model orchestration"""
    models = get_models()
    chains = create_chains(models)
    
    # Create a simple chain that can handle input/context/criteria
    # For production, enhance with SequentialChain or LangGraph
    
    # Prefer GPT for reasoning, fallback to Ollama, then Claude
    if "gpt" in models and models["gpt"]:
        return LLMChain(
            llm=models["gpt"],
            prompt=PromptTemplate(
                input_variables=["input", "context", "criteria"],
                template="Context: {context}\n\nQuery: {input}\n\nCriteria: {criteria}\n\nAnswer:"
            ),
            output_key="output"
        )
    
    # Fallback: Use Ollama if available
    if "ollama" in models and models["ollama"]:
        return LLMChain(
            llm=models["ollama"],
            prompt=PromptTemplate(
                input_variables=["input", "context", "criteria"],
                template="Context: {context}\n\nQuery: {input}\n\nAnswer:"
            ),
            output_key="output"
        )
    
    # Final fallback: Use Claude if available
    if "claude" in models and models["claude"]:
        return LLMChain(
            llm=models["claude"],
            prompt=PromptTemplate(
                input_variables=["input", "context", "criteria"],
                template="Context: {context}\n\nQuery: {input}\n\nAnswer:"
            ),
            output_key="output"
        )
    
    raise Exception("No models available. Please configure API keys or start Ollama.")

