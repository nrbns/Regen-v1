// Stability Features - Watchdog, Safe Mode, Memory Guard
// Crash-proof, low-RAM, real app stability

use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri;

// Platform-specific RAM detection
#[cfg(target_os = "windows")]
mod ram_detection {
    use winapi::um::sysinfoapi::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    
    pub fn get_system_ram() -> Result<u64, String> {
        unsafe {
            let mut mem_status = std::mem::zeroed::<MEMORYSTATUSEX>();
            mem_status.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
            if GlobalMemoryStatusEx(&mut mem_status) == 0 {
                return Err("Failed to get system memory".to_string());
            }
            Ok(mem_status.ullTotalPhys as u64)
        }
    }
}

#[cfg(target_os = "linux")]
mod ram_detection {
    use std::fs;
    
    pub fn get_system_ram() -> Result<u64, String> {
        // Read from /proc/meminfo
        match fs::read_to_string("/proc/meminfo") {
            Ok(contents) => {
                for line in contents.lines() {
                    if line.starts_with("MemTotal:") {
                        if let Some(kb_str) = line.split_whitespace().nth(1) {
                            if let Ok(kb) = kb_str.parse::<u64>() {
                                return Ok(kb * 1024); // Convert KB to bytes
                            }
                        }
                    }
                }
                Err("Could not parse /proc/meminfo".to_string())
            }
            Err(e) => Err(format!("Failed to read /proc/meminfo: {}", e)),
        }
    }
}

#[cfg(target_os = "macos")]
mod ram_detection {
    use libc::{sysctl, CTL_HW, HW_MEMSIZE};
    
    pub fn get_system_ram() -> Result<u64, String> {
        unsafe {
            let mut mib: [i32; 2] = [CTL_HW, HW_MEMSIZE];
            let mut memsize: u64 = 0;
            let mut size: usize = std::mem::size_of::<u64>();

            if sysctl(
                mib.as_mut_ptr(),
                2,
                &mut memsize as *mut _ as *mut std::ffi::c_void,
                &mut size,
                std::ptr::null_mut(),
                0,
            ) == 0
            {
                Ok(memsize)
            } else {
                Err("Failed to get system memory".to_string())
            }
        }
    }
}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
mod ram_detection {
    pub fn get_system_ram() -> Result<u64, String> {
        Err("Platform not supported for RAM detection".to_string())
    }
}

// Public function for system RAM detection
pub fn get_system_ram() -> Result<u64, String> {
    ram_detection::get_system_ram()
}

#[derive(Debug, Clone)]
pub struct SafeMode {
    enabled: Arc<Mutex<bool>>,
    crash_count: Arc<Mutex<u32>>,
    max_crashes: u32,
}

impl SafeMode {
    pub fn new(max_crashes: u32) -> Self {
        Self {
            enabled: Arc::new(Mutex::new(false)),
            crash_count: Arc::new(Mutex::new(0)),
            max_crashes,
        }
    }

    // Check if safe mode should be enabled
    pub fn should_enable(&self) -> bool {
        let count = self.crash_count.lock().unwrap();
        *count >= self.max_crashes
    }

    // Record a crash
    pub fn record_crash(&self) {
        let mut count = self.crash_count.lock().unwrap();
        *count += 1;
        
        if *count >= self.max_crashes {
            let mut enabled = self.enabled.lock().unwrap();
            *enabled = true;
            eprintln!("[SafeMode] Enabled after {} crashes", *count);
        }
    }

    // Check if safe mode is enabled
    pub fn is_enabled(&self) -> bool {
        let enabled = self.enabled.lock().unwrap();
        *enabled
    }

    // Reset crash count (after successful session)
    pub fn reset_crash_count(&self) {
        let mut count = self.crash_count.lock().unwrap();
        *count = 0;
        let mut enabled = self.enabled.lock().unwrap();
        *enabled = false;
    }

    // Get crash count
    pub fn get_crash_count(&self) -> u32 {
        let count = self.crash_count.lock().unwrap();
        *count
    }
}

// Memory Guard - Manages tab freezing and unloading
// Note: This will be called via IPC commands that have access to TabManager state
pub struct MemoryGuard {
    freeze_threshold: Duration,  // Freeze tabs after this idle time
    memory_threshold: u64,        // Unload tabs if RAM exceeds this (bytes)
    low_ram_mode: Arc<Mutex<bool>>, // Low-RAM mode enabled (adjusts thresholds dynamically)
}

impl MemoryGuard {
    pub fn new(
        freeze_threshold: Duration,
        memory_threshold: u64,
    ) -> Self {
        Self {
            freeze_threshold,
            memory_threshold,
            low_ram_mode: Arc::new(Mutex::new(false)),
        }
    }

    // Set low-RAM mode (adjusts thresholds)
    pub fn set_low_ram_mode(&self, enabled: bool) {
        let mut mode = self.low_ram_mode.lock().unwrap();
        *mode = enabled;
    }

    // Get low-RAM mode
    pub fn get_low_ram_mode(&self) -> bool {
        let mode = self.low_ram_mode.lock().unwrap();
        *mode
    }

    // Get freeze threshold (adjusted for low-RAM mode)
    pub fn get_freeze_threshold(&self) -> Duration {
        let low_ram = self.get_low_ram_mode();
        if low_ram {
            // In low-RAM mode, freeze tabs more aggressively (50% of normal time)
            Duration::from_secs(self.freeze_threshold.as_secs() / 2)
        } else {
            self.freeze_threshold
        }
    }

    // Get memory threshold (adjusted for low-RAM mode)
    pub fn get_memory_threshold(&self) -> u64 {
        let low_ram = self.get_low_ram_mode();
        if low_ram {
            // In low-RAM mode, use 50% of normal memory threshold
            self.memory_threshold / 2
        } else {
            self.memory_threshold
        }
    }

    // Check if tab should be frozen based on idle time
    pub fn should_freeze_tab(&self, last_active: i64, is_active: bool) -> bool {
        if is_active {
            return false; // Never freeze active tab
        }

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        let idle_time = now - last_active;
        let threshold = self.get_freeze_threshold().as_secs() as i64;
        idle_time > threshold
    }

    // Get max tabs based on low-RAM mode
    pub fn get_max_tabs(&self) -> u32 {
        let low_ram = self.get_low_ram_mode();
        if low_ram {
            5  // Low limit in low-RAM mode
        } else {
            15 // Normal limit
        }
    }
}

// Watchdog - Monitors WebView responsiveness and auto-recovers
// Note: Actual tab checking will be done via IPC commands
pub struct Watchdog {
    check_interval: Duration,
    response_timeout: Duration,
}

impl Watchdog {
    pub fn new(
        check_interval: Duration,
        response_timeout: Duration,
    ) -> Self {
        Self {
            check_interval,
            response_timeout,
        }
    }

    // Get check interval
    pub fn get_check_interval(&self) -> Duration {
        self.check_interval
    }

    // Get response timeout
    pub fn get_response_timeout(&self) -> Duration {
        self.response_timeout
    }
}

// Watchdog task (to be called from Tauri setup after runtime is initialized)
// This function should be called from within Tauri's setup() closure where async runtime exists
pub fn start_watchdog_task_async(
    check_interval: Duration,
    _response_timeout: Duration,
) {
    // Use Tauri's async runtime (available in setup context)
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(check_interval);
        
        loop {
            interval.tick().await;
            
            // TODO: Access tab_manager via Tauri state and check responsiveness
            // For now, just log that watchdog is running
            // This will be implemented when WebView integration is complete
            // eprintln!("[Watchdog] Running check...");
        }
    });
}

