// Agent System - Intent Detection + Planner + Tools
// Offline-first agent that acts on tabs/files/pages

use serde::{Deserialize, Serialize};
use crate::ai::{AIService, Intent, AIConfig};
use crate::search::SearchEngine;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPlan {
    pub intent: Intent,
    pub steps: Vec<PlanStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanStep {
    pub tool: Tool,
    pub action: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Tool {
    Browser,   // Browser actions (open tab, navigate, etc.)
    Search,    // Search tool (offline search)
    Notes,     // Notes tool (read/write notes)
    Summarize, // Summarize content
    Compare,   // Compare items
}

pub struct Agent {
    ai_service: AIService,
    search_engine: Option<SearchEngine>,
}

impl Agent {
    pub fn new(ai_config: AIConfig) -> Self {
        Self {
            ai_service: AIService::new(ai_config),
            search_engine: None,
        }
    }

    pub fn with_search_engine(mut self, search_engine: SearchEngine) -> Self {
        self.search_engine = Some(search_engine);
        self
    }

    // Detect intent from user query
    pub fn detect_intent(&self, query: &str) -> Result<Intent, AgentError> {
        self.ai_service
            .detect_intent(query)
            .map_err(|e| AgentError::AIError(e))
    }

    // Create a plan based on intent
    pub async fn plan(&self, intent: Intent, query: &str) -> Result<AgentPlan, AgentError> {
        let steps = match intent {
            Intent::Search => {
                vec![PlanStep {
                    tool: Tool::Search,
                    action: "search".to_string(),
                    params: serde_json::json!({ "query": query }),
                }]
            }
            Intent::Summarize => {
                vec![PlanStep {
                    tool: Tool::Summarize,
                    action: "summarize".to_string(),
                    params: serde_json::json!({ "content": query }),
                }]
            }
            Intent::Compare => {
                vec![PlanStep {
                    tool: Tool::Compare,
                    action: "compare".to_string(),
                    params: serde_json::json!({ "items": query }),
                }]
            }
            Intent::Act => {
                // For "act" intent, parse action from query
                vec![PlanStep {
                    tool: Tool::Browser,
                    action: "navigate".to_string(),
                    params: serde_json::json!({ "url": query }),
                }]
            }
            Intent::Question => {
                // For questions, search first, then summarize
                vec![
                    PlanStep {
                        tool: Tool::Search,
                        action: "search".to_string(),
                        params: serde_json::json!({ "query": query }),
                    },
                    PlanStep {
                        tool: Tool::Summarize,
                        action: "summarize".to_string(),
                        params: serde_json::json!({ "query": query }),
                    },
                ]
            }
        };

        Ok(AgentPlan { intent, steps })
    }

    // Execute a plan step
    pub async fn execute_step(&self, step: &PlanStep) -> Result<ToolResult, AgentError> {
        match step.tool {
            Tool::Search => {
                if let Some(ref search) = self.search_engine {
                    let query = step.params["query"]
                        .as_str()
                        .ok_or_else(|| AgentError::InvalidParams)?;
                    let results = search
                        .search(query, 10)
                        .map_err(|e| AgentError::SearchError(e.to_string()))?;
                    Ok(ToolResult::SearchResults(results.len()))
                } else {
                    Err(AgentError::ToolUnavailable("Search engine not available".to_string()))
                }
            }
            Tool::Browser => {
                // Browser actions are handled by browser.rs
                // This is a placeholder
                Ok(ToolResult::Success)
            }
            Tool::Notes => {
                // Notes are handled by db.rs
                Ok(ToolResult::Success)
            }
            Tool::Summarize => {
                // Use AI service to summarize
                let content = step.params["content"]
                    .as_str()
                    .unwrap_or("");
                let summary = self.ai_service
                    .complete(&format!("Summarize: {}", content))
                    .map_err(|e| AgentError::AIError(e))?;
                Ok(ToolResult::Summary(summary))
            }
            Tool::Compare => {
                // Use AI service to compare
                let items = step.params["items"]
                    .as_str()
                    .unwrap_or("");
                let comparison = self.ai_service
                    .complete(&format!("Compare: {}", items))
                    .map_err(|e| AgentError::AIError(e))?;
                Ok(ToolResult::Comparison(comparison))
            }
        }
    }

    // Execute full plan
    pub async fn execute_plan(&self, plan: AgentPlan) -> Result<Vec<ToolResult>, AgentError> {
        let mut results = Vec::new();
        for step in plan.steps {
            let result = self.execute_step(&step).await?;
            results.push(result);
        }
        Ok(results)
    }
}

#[derive(Debug, Clone)]
pub enum ToolResult {
    Success,
    SearchResults(usize),
    Summary(String),
    Comparison(String),
}

#[derive(Debug, Clone)]
pub enum AgentError {
    AIError(crate::ai::AIError),
    ToolUnavailable(String),
    InvalidParams,
    SearchError(String),
}

impl std::fmt::Display for AgentError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentError::AIError(e) => write!(f, "AI error: {}", e),
            AgentError::ToolUnavailable(msg) => write!(f, "Tool unavailable: {}", msg),
            AgentError::InvalidParams => write!(f, "Invalid parameters"),
            AgentError::SearchError(msg) => write!(f, "Search error: {}", msg),
        }
    }
}

impl std::error::Error for AgentError {}
