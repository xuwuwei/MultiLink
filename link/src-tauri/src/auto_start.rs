use std::io;
#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

pub struct AutoStartManager {
    app_name: String,
}

impl AutoStartManager {
    pub fn new(app_name: &str) -> Self {
        Self {
            app_name: app_name.to_string(),
        }
    }

    /// 设置开机启动状态
    #[cfg(target_os = "windows")]
    pub fn set_enabled(&self, enabled: bool) -> io::Result<()> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu.open_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            KEY_WRITE
        )?;

        if enabled {
            // 获取当前可执行文件路径
            let exe_path = std::env::current_exe()?;
            let exe_path_str = exe_path.to_string_lossy();
            run_key.set_value(&self.app_name, &exe_path_str.as_ref())?;
        } else {
            // 删除注册表项
            let _ = run_key.delete_value(&self.app_name);
        }

        Ok(())
    }

    /// 检查是否已设置开机启动
    #[cfg(target_os = "windows")]
    pub fn is_enabled(&self) -> io::Result<bool> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu.open_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            KEY_READ
        )?;

        match run_key.get_value::<String, &str>(&self.app_name) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// macOS/Linux 非 Windows 平台的占位实现
    #[cfg(not(target_os = "windows"))]
    pub fn set_enabled(&self, _enabled: bool) -> io::Result<()> {
        // macOS/Linux 可以通过其他方式实现
        // 例如：LaunchAgent (macOS) 或 systemd (Linux)
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn is_enabled(&self) -> io::Result<bool> {
        Ok(false)
    }
}
