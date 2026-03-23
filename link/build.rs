use std::process::Command;

fn main() {
    let logo_path = "src-tauri/icons/logo.jpg";
    println!("cargo:rerun-if-changed={}", logo_path);

    // icon.ico files are pre-generated from logo.jpg via Python/PIL.
    // Only regenerate if ImageMagick is available.
    if Command::new("convert").arg("--version").output().is_ok() {
        let _ = Command::new("convert")
            .args(&[
                logo_path,
                "-define", "icon:auto-resize=256,128,64,48,32,16",
                "src-tauri/icons/icon.ico",
            ])
            .output();
        // Also copy to link root so the tray can find it next to the exe
        let _ = std::fs::copy("src-tauri/icons/icon.ico", "icon.ico");
    }
    // If ImageMagick is not available, the pre-generated icon.ico files are used as-is.
}
