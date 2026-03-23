use qrcode::QrCode;
use qrcode::render::svg;

/// 生成QR码的Data URL格式（使用SVG，无需外部image crate）
pub fn generate_qr_data_url(data: &str) -> Result<String, Box<dyn std::error::Error>> {
    // 生成SVG格式的二维码，然后转换为Data URL
    let svg = generate_qr_svg(data)?;
    let base64 = base64::encode(svg.as_bytes());
    Ok(format!("data:image/svg+xml;base64,{}", base64))
}

/// 生成SVG格式的QR码
pub fn generate_qr_svg(data: &str) -> Result<String, Box<dyn std::error::Error>> {
    let code = QrCode::new(data)?;
    let svg = code.render()
        .min_dimensions(200, 200)
        .dark_color(svg::Color("#000000"))
        .light_color(svg::Color("#ffffff"))
        .build();

    Ok(svg)
}

/// 使用原生base64编码（无需额外crate）
mod base64 {
    const BASE64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    pub fn encode(input: &[u8]) -> String {
        let mut result = String::new();
        let mut i = 0;

        while i < input.len() {
            let b1 = input[i];
            let b2 = if i + 1 < input.len() { input[i + 1] } else { 0 };
            let b3 = if i + 2 < input.len() { input[i + 2] } else { 0 };

            let idx1 = (b1 >> 2) as usize;
            let idx2 = (((b1 & 0x03) << 4) | (b2 >> 4)) as usize;
            let idx3 = (((b2 & 0x0F) << 2) | (b3 >> 6)) as usize;
            let idx4 = (b3 & 0x3F) as usize;

            result.push(BASE64_CHARS[idx1] as char);
            result.push(BASE64_CHARS[idx2] as char);

            if i + 1 < input.len() {
                result.push(BASE64_CHARS[idx3] as char);
            } else {
                result.push('=');
            }

            if i + 2 < input.len() {
                result.push(BASE64_CHARS[idx4] as char);
            } else {
                result.push('=');
            }

            i += 3;
        }

        result
    }
}
