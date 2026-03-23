use mdns_sd::{ServiceDaemon, ServiceInfo};

pub struct MdnsManager {
    daemon: Option<ServiceDaemon>,
    service_type: String,
    service_name: String,
    port: u16,
    ip: Option<String>,
    fullname: Option<String>,
}

impl MdnsManager {
    pub fn new(service_type: &str, service_name: &str, port: u16, ip: Option<String>) -> Self {
        let daemon = match ServiceDaemon::new() {
            Ok(d) => Some(d),
            Err(e) => {
                eprintln!("mDNS: Failed to create daemon: {}", e);
                None
            }
        };
        Self {
            daemon,
            service_type: service_type.to_string(),
            service_name: service_name.to_string(),
            port,
            ip,
            fullname: None,
        }
    }

    pub fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let daemon = match &self.daemon {
            Some(d) => d,
            None => return Err("mDNS daemon not available".into()),
        };

        let hostname = get_local_hostname();

        // TXT 记录里写入电脑名，供 iOS/Android 解析后显示正确设备名
        let txt = std::collections::HashMap::from([
            ("name".to_string(), self.service_name.clone()),
        ]);

        let service_info = if let Some(ref ip_str) = self.ip {
            ServiceInfo::new(
                &self.service_type,
                &self.service_name,
                &hostname,
                ip_str.as_str(),
                self.port,
                Some(txt.clone()),
            )?
        } else {
            ServiceInfo::new(
                &self.service_type,
                &self.service_name,
                &hostname,
                (),
                self.port,
                Some(txt),
            )?
            .enable_addr_auto()
        };

        self.fullname = Some(service_info.get_fullname().to_string());
        daemon.register(service_info)?;

        println!("mDNS: Registered \"{}\" on port {} (type: {})",
            self.service_name, self.port, self.service_type);
        Ok(())
    }

    pub fn stop(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if let (Some(daemon), Some(fullname)) = (&self.daemon, &self.fullname) {
            let _ = daemon.unregister(fullname);
        }
        Ok(())
    }
}

fn get_local_hostname() -> String {
    // Windows: COMPUTERNAME env var
    #[cfg(target_os = "windows")]
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        let name = name.to_lowercase();
        return if name.ends_with(".local.") { name } else { format!("{}.local.", name) };
    }

    // macOS / Linux: gethostname() syscall (reliable in GUI apps)
    #[cfg(not(target_os = "windows"))]
    {
        let mut buf = [0u8; 256];
        unsafe {
            if libc::gethostname(buf.as_mut_ptr() as *mut libc::c_char, buf.len()) == 0 {
                let end = buf.iter().position(|&b| b == 0).unwrap_or(buf.len());
                if let Ok(name) = std::str::from_utf8(&buf[..end]) {
                    let name = name.trim_end_matches(".local").to_lowercase();
                    return format!("{}.local.", name);
                }
            }
        }
    }

    "multilink.local.".to_string()
}
