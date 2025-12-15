// Application State Management
use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub user_session: Mutex<UserSession>,
}

#[derive(Clone)]
pub struct UserSession {
    pub token: String,
    pub user_id: String,
}

impl Default for UserSession {
    fn default() -> Self {
        Self {
            token: String::new(),
            user_id: String::new(),
        }
    }
}
