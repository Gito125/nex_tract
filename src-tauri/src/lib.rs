use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

// Store sidecar child process so we can kill it on exit
pub struct SidecarState(pub Mutex<Option<CommandChild>>);

const API_PORT: u16 = 57000;

#[tauri::command]
fn get_api_port() -> u16 {
    // Port the Python backend listens on
    // Must match NEXTRACT_PORT in Python config
    API_PORT
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            let app_handle = app.handle().clone();
            let data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");
            let resource_dir = app.path().resource_dir()
                .expect("Failed to resolve resource directory");

            // Create data directory if it doesn't exist
            std::fs::create_dir_all(&data_dir)
                .expect("Failed to create app data directory");

            let ffmpeg_name = if cfg!(target_os = "windows") {
                "ffmpeg.exe"
            } else {
                "ffmpeg"
            };

            let ffmpeg_path = resource_dir.join(ffmpeg_name);
            let db_path = data_dir.join("nextract.db");
            let downloads_dir = dirs::download_dir()
                .unwrap_or_else(|| data_dir.join("Downloads"))
                .join("Nextract");

            std::fs::create_dir_all(&downloads_dir)
                .expect("Failed to create downloads directory");

            // Kill any existing zombie sidecar processes to free up the port
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("pkill")
                    .arg("-f")
                    .arg("nextract-server")
                    .status();
            }
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("taskkill")
                    .arg("/F")
                    .arg("/IM")
                    .arg("nextract-server.exe")
                    .arg("/T")
                    .status();
            }

            // Spawn Python sidecar
            let sidecar_cmd = app_handle
                .shell()
                .sidecar("nextract-server")
                .expect("Failed to find nextract-server sidecar")
                .env("NEXTRACT_DATA_DIR", data_dir.to_str().unwrap())
                .env("NEXTRACT_DB_PATH", db_path.to_str().unwrap())
                .env("NEXTRACT_DOWNLOADS_DIR", downloads_dir.to_str().unwrap())
                .env("FFMPEG_PATH", ffmpeg_path.to_str().unwrap())
                .env("NEXTRACT_PORT", API_PORT.to_string())
                .env("NEXTRACT_ENV", "packaged");

            let (mut rx, child) = sidecar_cmd.spawn()
                .expect("Failed to spawn Python sidecar");

            // Consume sidecar output to prevent broken pipe crashes
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                            println!("Sidecar STDOUT: {}", String::from_utf8_lossy(&line));
                        }
                        tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                            eprintln!("Sidecar STDERR: {}", String::from_utf8_lossy(&line));
                        }
                        tauri_plugin_shell::process::CommandEvent::Error(err) => {
                            eprintln!("Sidecar ERROR: {}", err);
                        }
                        tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                            println!("Sidecar Terminated: {:?}", payload);
                        }
                        _ => {}
                    }
                }
            });

            // Store child process handle so we can kill on exit
            *app_handle.state::<SidecarState>().0.lock().unwrap() = Some(child);

            // Poll health endpoint until backend is ready, then open window
            let app_handle_clone = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                wait_for_backend_ready(API_PORT).await;
                // Window is already created by Tauri — just show it
                if let Some(window) = app_handle_clone.get_webview_window("main") {
                    window.show().unwrap();
                }
            });

            // Hide window until backend is ready
            if let Some(window) = app.get_webview_window("main") {
                window.hide().unwrap();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill sidecar on window close
                let state = window.state::<SidecarState>();
                let mut guard = state.0.lock().unwrap();
                if let Some(child) = guard.take() {
                    let _ = child.kill();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_api_port])
        .run(tauri::generate_context!())
        .expect("Error running Nextract desktop app");
}

async fn wait_for_backend_ready(port: u16) {
    let url = format!("http://127.0.0.1:{}/api/health", port);
    let client = reqwest::Client::new();
    let max_attempts = 60; // Increased timeout for slow starts
    let mut attempts = 0;

    loop {
        attempts += 1;
        if attempts > max_attempts {
            eprintln!("Backend failed to start after {} attempts", max_attempts);
            break;
        }

        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                println!("Backend ready after {} attempts", attempts);
                break;
            }
            _ => {
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }
    }
}
