use js_sys::Date;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use std::cell::RefCell;
use std::collections::{HashMap, VecDeque};
use wasm_bindgen::prelude::*;

#[cfg(feature = "console_error_panic_hook")]
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

fn now_ms() -> f64 {
    Date::now()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SnapshotMeta {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub app_mode: Option<String>,
    #[serde(default)]
    pub container_id: Option<String>,
    #[serde(default)]
    pub approx_memory_mb: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SnapshotPayload {
    pub state: serde_json::Value,
    #[serde(default)]
    pub meta: Option<SnapshotMeta>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SnapshotRecord {
    pub tab_id: String,
    pub captured_at: f64,
    pub approx_size_bytes: usize,
    pub hits: u32,
    pub state: serde_json::Value,
    #[serde(default)]
    pub meta: Option<SnapshotMeta>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ContextRecord {
    pub key: String,
    pub updated_at: f64,
    pub value: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
struct SnapshotResult {
    #[serde(rename = "tabId")]
    tab_id: String,
    #[serde(rename = "storedIn")]
    stored_in: String,
    evicted: Option<String>,
    #[serde(rename = "hotEntries")]
    hot_entries: usize,
    #[serde(rename = "coldEntries")]
    cold_entries: usize,
    #[serde(rename = "coldBytes")]
    cold_bytes: usize,
}

#[derive(Serialize, Deserialize)]
struct RestoreResult {
    #[serde(rename = "tabId")]
    tab_id: String,
    state: serde_json::Value,
    meta: Option<SnapshotMeta>,
    source: String,
}

#[derive(Serialize, Deserialize)]
struct RuntimeStats {
    #[serde(rename = "hotEntries")]
    hot_entries: usize,
    #[serde(rename = "coldEntries")]
    cold_entries: usize,
    #[serde(rename = "coldBytes")]
    cold_bytes: usize,
    #[serde(rename = "maxHotEntries")]
    max_hot_entries: usize,
    #[serde(rename = "coldBudgetBytes")]
    cold_budget_bytes: usize,
    #[serde(rename = "evictionCount")]
    eviction_count: u64,
}

#[wasm_bindgen]
pub struct RedixRuntime {
    max_hot_entries: usize,
    cold_budget_bytes: usize,
    hot_snapshots: RefCell<HashMap<String, SnapshotRecord>>,
    hot_order: RefCell<VecDeque<String>>,
    cold_snapshots: RefCell<VecDeque<SnapshotRecord>>,
    cold_bytes: RefCell<usize>,
    contexts: RefCell<HashMap<String, ContextRecord>>,
    eviction_count: RefCell<u64>,
}

#[wasm_bindgen]
impl RedixRuntime {
    #[wasm_bindgen(constructor)]
    pub fn new(max_hot_entries: usize, cold_budget_bytes: usize) -> RedixRuntime {
        let hot_cap = max_hot_entries.max(1);
        let cold_cap = cold_budget_bytes.max(1_000_000); // >= 1 MB
        RedixRuntime {
            max_hot_entries: hot_cap,
            cold_budget_bytes: cold_cap,
            hot_snapshots: RefCell::new(HashMap::new()),
            hot_order: RefCell::new(VecDeque::new()),
            cold_snapshots: RefCell::new(VecDeque::new()),
            cold_bytes: RefCell::new(0),
            contexts: RefCell::new(HashMap::new()),
            eviction_count: RefCell::new(0),
        }
    }

    #[wasm_bindgen(js_name = snapshotTab)]
    pub fn snapshot_tab(&self, tab_id: String, payload: JsValue) -> Result<JsValue, JsValue> {
        let snapshot_payload: SnapshotPayload =
            from_value(payload).map_err(|err| err.to_string())?;

        let approx_size = approximate_size(&snapshot_payload.state);
        let record = SnapshotRecord {
            tab_id: tab_id.clone(),
            captured_at: now_ms(),
            approx_size_bytes: approx_size,
            hits: 0,
            state: snapshot_payload.state,
            meta: snapshot_payload.meta,
        };

        let mut hot = self.hot_snapshots.borrow_mut();
        hot.insert(tab_id.clone(), record.clone());
        drop(hot);

        self.touch_hot_order(&tab_id);

        let mut evicted: Option<String> = None;
        if self.hot_snapshots.borrow().len() > self.max_hot_entries {
            evicted = self.demote_oldest_hot();
        }

        let result = SnapshotResult {
            tab_id,
            stored_in: "hot".to_string(),
            evicted,
            hot_entries: self.hot_snapshots.borrow().len(),
            cold_entries: self.cold_snapshots.borrow().len(),
            cold_bytes: *self.cold_bytes.borrow(),
        };

        to_value(&result).map_err(|err| err.to_string().into())
    }

    #[wasm_bindgen(js_name = restoreTab)]
    pub fn restore_tab(&self, tab_id: String) -> Result<JsValue, JsValue> {
        if let Some(record) = self.hot_snapshots.borrow_mut().get_mut(&tab_id) {
            record.hits += 1;
            self.touch_hot_order(&tab_id);
            let response = RestoreResult {
                tab_id,
                state: record.state.clone(),
                meta: record.meta.clone(),
                source: "hot".to_string(),
            };
            return to_value(&response).map_err(|err| err.to_string().into());
        }

        // Search cold store
        let mut cold = self.cold_snapshots.borrow_mut();
        if let Some(index) = cold.iter().position(|entry| entry.tab_id == tab_id) {
            let record = cold.remove(index).expect("snapshot exists");
            *self.cold_bytes.borrow_mut() = self
                .cold_snapshots
                .borrow()
                .iter()
                .map(|entry| entry.approx_size_bytes)
                .sum();
            drop(cold);

            // Promote back to hot
            self.hot_snapshots
                .borrow_mut()
                .insert(record.tab_id.clone(), record.clone());
            self.touch_hot_order(&record.tab_id);

            let mut evicted = None;
            if self.hot_snapshots.borrow().len() > self.max_hot_entries {
                evicted = self.demote_oldest_hot();
            }

            let response = RestoreResult {
                tab_id: record.tab_id,
                state: record.state,
                meta: record.meta,
                source: if evicted.is_some() {
                    "cold.promoted-with-eviction".to_string()
                } else {
                    "cold.promoted".to_string()
                },
            };
            return to_value(&response).map_err(|err| err.to_string().into());
        }

        Ok(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = saveContext)]
    pub fn save_context(&self, key: String, value: JsValue) -> Result<(), JsValue> {
        let json_value: serde_json::Value = from_value(value).map_err(|err| err.to_string())?;
        let record = ContextRecord {
            key: key.clone(),
            updated_at: now_ms(),
            value: json_value,
        };
        self.contexts.borrow_mut().insert(key, record);
        Ok(())
    }

    #[wasm_bindgen(js_name = fetchContext)]
    pub fn fetch_context(&self, key: String) -> Result<JsValue, JsValue> {
        if let Some(record) = self.contexts.borrow().get(&key) {
            return to_value(record).map_err(|err| err.to_string().into());
        }
        Ok(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = stats)]
    pub fn stats(&self) -> Result<JsValue, JsValue> {
        let stats = RuntimeStats {
            hot_entries: self.hot_snapshots.borrow().len(),
            cold_entries: self.cold_snapshots.borrow().len(),
            cold_bytes: *self.cold_bytes.borrow(),
            max_hot_entries: self.max_hot_entries,
            cold_budget_bytes: self.cold_budget_bytes,
            eviction_count: *self.eviction_count.borrow(),
        };
        to_value(&stats).map_err(|err| err.to_string().into())
    }

    #[wasm_bindgen(js_name = clear)]
    pub fn clear(&self) {
        self.hot_snapshots.borrow_mut().clear();
        self.hot_order.borrow_mut().clear();
        self.cold_snapshots.borrow_mut().clear();
        *self.cold_bytes.borrow_mut() = 0;
        self.contexts.borrow_mut().clear();
        *self.eviction_count.borrow_mut() = 0;
    }

    fn touch_hot_order(&self, tab_id: &str) {
        let mut order = self.hot_order.borrow_mut();
        if let Some(pos) = order.iter().position(|id| id == tab_id) {
            order.remove(pos);
        }
        order.push_back(tab_id.to_string());
    }

    fn demote_oldest_hot(&self) -> Option<String> {
        let mut order = self.hot_order.borrow_mut();
        if let Some(oldest_id) = order.pop_front() {
            if let Some(record) = self.hot_snapshots.borrow_mut().remove(&oldest_id) {
                self.push_cold(record);
                *self.eviction_count.borrow_mut() += 1;
                return Some(oldest_id);
            }
        }
        None
    }

    fn push_cold(&self, record: SnapshotRecord) {
        let mut cold = self.cold_snapshots.borrow_mut();
        cold.push_back(record);
        drop(cold);
        self.recompute_cold_bytes();
        self.trim_cold_budget();
    }

    fn recompute_cold_bytes(&self) {
        let total: usize = self
            .cold_snapshots
            .borrow()
            .iter()
            .map(|entry| entry.approx_size_bytes)
            .sum();
        *self.cold_bytes.borrow_mut() = total;
    }

    fn trim_cold_budget(&self) {
        let mut cold = self.cold_snapshots.borrow_mut();
        while *self.cold_bytes.borrow() > self.cold_budget_bytes {
            if let Some(entry) = cold.pop_front() {
                let mut bytes = self.cold_bytes.borrow_mut();
                *bytes = bytes.saturating_sub(entry.approx_size_bytes);
            } else {
                break;
            }
        }
    }
}

fn approximate_size(value: &serde_json::Value) -> usize {
    serde_json::to_string(value)
        .map(|s| s.len())
        .unwrap_or_default()
}

