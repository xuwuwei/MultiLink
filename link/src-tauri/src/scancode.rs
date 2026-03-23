// 从字符到 HID 键码的转换
pub fn char_to_hid(c: char) -> Option<u8> {
    match c.to_ascii_uppercase() {
        'A' => Some(0x04),
        'B' => Some(0x05),
        'C' => Some(0x06),
        'D' => Some(0x07),
        'E' => Some(0x08),
        'F' => Some(0x09),
        'G' => Some(0x0A),
        'H' => Some(0x0B),
        'I' => Some(0x0C),
        'J' => Some(0x0D),
        'K' => Some(0x0E),
        'L' => Some(0x0F),
        'M' => Some(0x10),
        'N' => Some(0x11),
        'O' => Some(0x12),
        'P' => Some(0x13),
        'Q' => Some(0x14),
        'R' => Some(0x15),
        'S' => Some(0x16),
        'T' => Some(0x17),
        'U' => Some(0x18),
        'V' => Some(0x19),
        'W' => Some(0x1A),
        'X' => Some(0x1B),
        'Y' => Some(0x1C),
        'Z' => Some(0x1D),
        '1' => Some(0x1E),
        '2' => Some(0x1F),
        '3' => Some(0x20),
        '4' => Some(0x21),
        '5' => Some(0x22),
        '6' => Some(0x23),
        '7' => Some(0x24),
        '8' => Some(0x25),
        '9' => Some(0x26),
        '0' => Some(0x27),
        ' ' => Some(0x2C),
        '!' => Some(0x1E), // 需要 SHIFT
        '@' => Some(0x1F), // 需要 SHIFT
        '#' => Some(0x20), // 需要 SHIFT
        '$' => Some(0x21), // 需要 SHIFT
        '%' => Some(0x22), // 需要 SHIFT
        '^' => Some(0x23), // 需要 SHIFT
        '&' => Some(0x24), // 需要 SHIFT
        '*' => Some(0x25), // 需要 SHIFT
        '(' => Some(0x26), // 需要 SHIFT
        ')' => Some(0x27), // 需要 SHIFT
        '-' => Some(0x2D),
        '_' => Some(0x2D), // 需要 SHIFT
        '=' => Some(0x2E),
        '+' => Some(0x2E), // 需要 SHIFT
        '[' => Some(0x2F),
        '{' => Some(0x2F), // 需要 SHIFT
        ']' => Some(0x30),
        '}' => Some(0x30), // 需要 SHIFT
        '\\' => Some(0x31),
        '|' => Some(0x31), // 需要 SHIFT
        ';' => Some(0x33),
        ':' => Some(0x33), // 需要 SHIFT
        '\'' => Some(0x34),
        '"' => Some(0x34), // 需要 SHIFT
        '`' => Some(0x35),
        '~' => Some(0x35), // 需要 SHIFT
        ',' => Some(0x36),
        '<' => Some(0x36), // 需要 SHIFT
        '.' => Some(0x37),
        '>' => Some(0x37), // 需要 SHIFT
        '/' => Some(0x38),
        '?' => Some(0x38), // 需要 SHIFT
        _ => None,
    }
}

// HID 键码到虚拟键码的映射
pub fn hid_to_vk(hid_code: u8) -> u8 {
    match hid_code {
        // 字母键
        0x04 => 0x41, // A
        0x05 => 0x42, // B
        0x06 => 0x43, // C
        0x07 => 0x44, // D
        0x08 => 0x45, // E
        0x09 => 0x46, // F
        0x0A => 0x47, // G
        0x0B => 0x48, // H
        0x0C => 0x49, // I
        0x0D => 0x4A, // J
        0x0E => 0x4B, // K
        0x0F => 0x4C, // L
        0x10 => 0x4D, // M
        0x11 => 0x4E, // N
        0x12 => 0x4F, // O
        0x13 => 0x50, // P
        0x14 => 0x51, // Q
        0x15 => 0x52, // R
        0x16 => 0x53, // S
        0x17 => 0x54, // T
        0x18 => 0x55, // U
        0x19 => 0x56, // V
        0x1A => 0x57, // W
        0x1B => 0x58, // X
        0x1C => 0x59, // Y
        0x1D => 0x5A, // Z
        
        // 数字键
        0x1E => 0x31, // 1
        0x1F => 0x32, // 2
        0x20 => 0x33, // 3
        0x21 => 0x34, // 4
        0x22 => 0x35, // 5
        0x23 => 0x36, // 6
        0x24 => 0x37, // 7
        0x25 => 0x38, // 8
        0x26 => 0x39, // 9
        0x27 => 0x30, // 0
        
        // 功能键
        0x3A => 0x70, // F1
        0x3B => 0x71, // F2
        0x3C => 0x72, // F3
        0x3D => 0x73, // F4
        0x3E => 0x74, // F5
        0x3F => 0x75, // F6
        0x40 => 0x76, // F7
        0x41 => 0x77, // F8
        0x42 => 0x78, // F9
        0x43 => 0x79, // F10
        0x44 => 0x7A, // F11
        0x45 => 0x7B, // F12
        
        // 控制键
        0x29 => 0x1B, // ESC
        0x28 => 0x0D, // ENTER
        0x2A => 0x08, // BACKSPACE
        0x2B => 0x09, // TAB
        0x2C => 0x20, // SPACE
        
        // 方向键
        0x52 => 0x26, // UP
        0x51 => 0x28, // DOWN
        0x50 => 0x25, // LEFT
        0x4F => 0x27, // RIGHT
        
        // 修饰键
        0xE0 => 0x11, // CTRL
        0xE1 => 0x10, // SHIFT
        0xE2 => 0x12, // ALT
        0xE3 => 0x5B, // WIN
        0xE6 => 0x5D, // MENU
        
        // 其他键
        0x2D => 0xBD, // -_
        0x2E => 0xBB, // =+
        0x2F => 0xDB, // [{ 
        0x30 => 0xDD, // ]}
        0x31 => 0xDC, // \
        0x33 => 0xBA, // ;:
        0x34 => 0xDE, // '"
        0x35 => 0xC0, // `~
        0x36 => 0xBC, // ,<
        0x37 => 0xBE, // .>
        0x38 => 0xBF, // /?
        0x39 => 0x14, // CAPS LOCK
        
        _ => 0x00, // 未知键
    }
}
