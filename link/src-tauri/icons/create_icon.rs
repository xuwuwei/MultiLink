// Icon generation helper
// Source SVG: link/icon.svg (project root)
//
// This script generates the required icon formats from the SVG source.
// Run: cargo run --example create_icon
//
// Requirements:
//   - ImageMagick: convert icon.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico
//   - Or Inkscape: inkscape icon.svg --export-png=icon.png --export-width=512
//
// Icon design: Keyboard with wireless signal waves
// - Dark circular background (#1a1a2e)
// - Bright keyboard keys (#8a8ab5) - clearly visible
// - Touchpad area at bottom
// - Green wireless signal arcs indicating connectivity
// - Green status dot in top right
//
// Output files needed:
//   - icon.ico (256,128,64,48,32,16 px sizes) - Windows app icon
//   - icon.png (512x512 px) - System tray icon

use std::process::Command;

fn main() {
    let svg_path = "../../icon.svg";

    // Check for ImageMagick
    if Command::new("convert").arg("--version").output().is_ok() {
        println!("✓ ImageMagick found");
        println!("Generating icon.ico...");

        let output = Command::new("convert")
            .args(&[
                svg_path,
                "-define", "icon:auto-resize=256,128,64,48,32,16",
                "icon.ico",
            ])
            .output();

        match output {
            Ok(_) => println!("✓ Created icon.ico"),
            Err(e) => println!("✗ Failed to create icon.ico: {}", e),
        }

        println!("Generating icon.png...");
        let output = Command::new("convert")
            .args(&[
                svg_path,
                "-resize", "512x512",
                "icon.png",
            ])
            .output();

        match output {
            Ok(_) => println!("✓ Created icon.png"),
            Err(e) => println!("✗ Failed to create icon.png: {}", e),
        }
    }
    // Check for Inkscape
    else if Command::new("inkscape").arg("--version").output().is_ok() {
        println!("✓ Inkscape found");
        println!("Generating icon.png...");

        let output = Command::new("inkscape")
            .args(&[
                svg_path,
                "--export-png", "icon.png",
                "--export-width", "512",
                "--export-height", "512",
            ])
            .output();

        match output {
            Ok(_) => println!("✓ Created icon.png"),
            Err(e) => println!("✗ Failed to create icon.png: {}", e),
        }

        println!("⚠ Please manually convert to icon.ico using an online converter or ImageMagick");
    }
    else {
        println!("✗ Neither ImageMagick nor Inkscape found!");
        println!();
        println!("Please install one of:");
        println!("  - ImageMagick: https://imagemagick.org (recommended)");
        println!("  - Inkscape: https://inkscape.org");
        println!();
        println!("Or manually convert icon.svg to:");
        println!("  - icon.ico (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)");
        println!("  - icon.png (512x512)");
    }
}
