// 标准键盘 HID 描述符
pub const KEYBOARD_HID_DESCRIPTOR: &[u8] = &[
    0x05, 0x01, // Usage Page (Generic Desktop)
    0x09, 0x06, // Usage (Keyboard)
    0xA1, 0x01, // Collection (Application)
    0x05, 0x07, // Usage Page (Keyboard/Keypad)
    0x19, 0xE0, // Usage Minimum (224)
    0x29, 0xE7, // Usage Maximum (231)
    0x15, 0x00, // Logical Minimum (0)
    0x25, 0x01, // Logical Maximum (1)
    0x75, 0x01, // Report Size (1)
    0x95, 0x08, // Report Count (8)
    0x81, 0x02, // Input (Data,Var,Abs)
    0x95, 0x01, // Report Count (1)
    0x75, 0x08, // Report Size (8)
    0x81, 0x01, // Input (Const,Array,Abs)
    0x95, 0x06, // Report Count (6)
    0x75, 0x08, // Report Size (8)
    0x15, 0x00, // Logical Minimum (0)
    0x25, 0x65, // Logical Maximum (101)
    0x05, 0x07, // Usage Page (Keyboard/Keypad)
    0x19, 0x00, // Usage Minimum (0)
    0x29, 0x65, // Usage Maximum (101)
    0x81, 0x00, // Input (Data,Array,Abs)
    0xC0,       // End Collection
];

// 键盘报告结构
#[derive(Debug, Clone, Copy)]
pub struct KeyboardReport {
    pub modifiers: u8,      // 修饰键状态
    pub reserved: u8,       // 保留字节
    pub keys: [u8; 6],      // 最多 6 个同时按下的键
}

impl KeyboardReport {
    pub fn new() -> Self {
        Self {
            modifiers: 0,
            reserved: 0,
            keys: [0; 6],
        }
    }
    
    pub fn add_key(&mut self, key_code: u8) {
        for i in 0..6 {
            if self.keys[i] == 0 {
                self.keys[i] = key_code;
                break;
            }
        }
    }
    
    pub fn remove_key(&mut self, key_code: u8) {
        for i in 0..6 {
            if self.keys[i] == key_code {
                self.keys[i] = 0;
                // 重新排序，将非零键移到前面
                for j in i..5 {
                    if self.keys[j+1] != 0 {
                        self.keys[j] = self.keys[j+1];
                        self.keys[j+1] = 0;
                    } else {
                        break;
                    }
                }
                break;
            }
        }
    }
    
    pub fn set_modifier(&mut self, modifier: u8, pressed: bool) {
        if pressed {
            self.modifiers |= modifier;
        } else {
            self.modifiers &= !modifier;
        }
    }
    
    pub fn to_bytes(&self) -> [u8; 8] {
        [
            self.modifiers,
            self.reserved,
            self.keys[0],
            self.keys[1],
            self.keys[2],
            self.keys[3],
            self.keys[4],
            self.keys[5],
        ]
    }
}

// 修饰键定义
pub mod modifiers {
    pub const LEFT_CTRL: u8 = 0x01;
    pub const LEFT_SHIFT: u8 = 0x02;
    pub const LEFT_ALT: u8 = 0x04;
    pub const LEFT_GUI: u8 = 0x08;
    pub const RIGHT_CTRL: u8 = 0x10;
    pub const RIGHT_SHIFT: u8 = 0x20;
    pub const RIGHT_ALT: u8 = 0x40;
    pub const RIGHT_GUI: u8 = 0x80;
}

// 键码定义
pub mod key_codes {
    pub const KEY_NONE: u8 = 0x00;
    pub const KEY_A: u8 = 0x04;
    pub const KEY_B: u8 = 0x05;
    pub const KEY_C: u8 = 0x06;
    pub const KEY_D: u8 = 0x07;
    pub const KEY_E: u8 = 0x08;
    pub const KEY_F: u8 = 0x09;
    pub const KEY_G: u8 = 0x0A;
    pub const KEY_H: u8 = 0x0B;
    pub const KEY_I: u8 = 0x0C;
    pub const KEY_J: u8 = 0x0D;
    pub const KEY_K: u8 = 0x0E;
    pub const KEY_L: u8 = 0x0F;
    pub const KEY_M: u8 = 0x10;
    pub const KEY_N: u8 = 0x11;
    pub const KEY_O: u8 = 0x12;
    pub const KEY_P: u8 = 0x13;
    pub const KEY_Q: u8 = 0x14;
    pub const KEY_R: u8 = 0x15;
    pub const KEY_S: u8 = 0x16;
    pub const KEY_T: u8 = 0x17;
    pub const KEY_U: u8 = 0x18;
    pub const KEY_V: u8 = 0x19;
    pub const KEY_W: u8 = 0x1A;
    pub const KEY_X: u8 = 0x1B;
    pub const KEY_Y: u8 = 0x1C;
    pub const KEY_Z: u8 = 0x1D;
    pub const KEY_1: u8 = 0x1E;
    pub const KEY_2: u8 = 0x1F;
    pub const KEY_3: u8 = 0x20;
    pub const KEY_4: u8 = 0x21;
    pub const KEY_5: u8 = 0x22;
    pub const KEY_6: u8 = 0x23;
    pub const KEY_7: u8 = 0x24;
    pub const KEY_8: u8 = 0x25;
    pub const KEY_9: u8 = 0x26;
    pub const KEY_0: u8 = 0x27;
    pub const KEY_ENTER: u8 = 0x28;
    pub const KEY_ESCAPE: u8 = 0x29;
    pub const KEY_BACKSPACE: u8 = 0x2A;
    pub const KEY_TAB: u8 = 0x2B;
    pub const KEY_SPACE: u8 = 0x2C;
    pub const KEY_MINUS: u8 = 0x2D;
    pub const KEY_EQUAL: u8 = 0x2E;
    pub const KEY_LEFT_BRACKET: u8 = 0x2F;
    pub const KEY_RIGHT_BRACKET: u8 = 0x30;
    pub const KEY_BACKSLASH: u8 = 0x31;
    pub const KEY_SEMICOLON: u8 = 0x33;
    pub const KEY_QUOTE: u8 = 0x34;
    pub const KEY_GRAVE: u8 = 0x35;
    pub const KEY_COMMA: u8 = 0x36;
    pub const KEY_PERIOD: u8 = 0x37;
    pub const KEY_SLASH: u8 = 0x38;
    pub const KEY_CAPS_LOCK: u8 = 0x39;
    pub const KEY_F1: u8 = 0x3A;
    pub const KEY_F2: u8 = 0x3B;
    pub const KEY_F3: u8 = 0x3C;
    pub const KEY_F4: u8 = 0x3D;
    pub const KEY_F5: u8 = 0x3E;
    pub const KEY_F6: u8 = 0x3F;
    pub const KEY_F7: u8 = 0x40;
    pub const KEY_F8: u8 = 0x41;
    pub const KEY_F9: u8 = 0x42;
    pub const KEY_F10: u8 = 0x43;
    pub const KEY_F11: u8 = 0x44;
    pub const KEY_F12: u8 = 0x45;
    pub const KEY_PRINT_SCREEN: u8 = 0x46;
    pub const KEY_SCROLL_LOCK: u8 = 0x47;
    pub const KEY_PAUSE: u8 = 0x48;
    pub const KEY_INSERT: u8 = 0x49;
    pub const KEY_HOME: u8 = 0x4A;
    pub const KEY_PAGE_UP: u8 = 0x4B;
    pub const KEY_DELETE: u8 = 0x4C;
    pub const KEY_END: u8 = 0x4D;
    pub const KEY_PAGE_DOWN: u8 = 0x4E;
    pub const KEY_RIGHT: u8 = 0x4F;
    pub const KEY_LEFT: u8 = 0x50;
    pub const KEY_DOWN: u8 = 0x51;
    pub const KEY_UP: u8 = 0x52;
    pub const KEY_NUM_LOCK: u8 = 0x53;
    pub const KEY_KP_DIVIDE: u8 = 0x54;
    pub const KEY_KP_MULTIPLY: u8 = 0x55;
    pub const KEY_KP_SUBTRACT: u8 = 0x56;
    pub const KEY_KP_ADD: u8 = 0x57;
    pub const KEY_KP_ENTER: u8 = 0x58;
    pub const KEY_KP_1: u8 = 0x59;
    pub const KEY_KP_2: u8 = 0x5A;
    pub const KEY_KP_3: u8 = 0x5B;
    pub const KEY_KP_4: u8 = 0x5C;
    pub const KEY_KP_5: u8 = 0x5D;
    pub const KEY_KP_6: u8 = 0x5E;
    pub const KEY_KP_7: u8 = 0x5F;
    pub const KEY_KP_8: u8 = 0x60;
    pub const KEY_KP_9: u8 = 0x61;
    pub const KEY_KP_0: u8 = 0x62;
    pub const KEY_KP_DECIMAL: u8 = 0x63;
    pub const KEY_KP_EQUAL: u8 = 0x67;
    pub const KEY_LEFT_WINDOWS: u8 = 0x68;
    pub const KEY_RIGHT_WINDOWS: u8 = 0x69;
    pub const KEY_MENU: u8 = 0x6A;
}
