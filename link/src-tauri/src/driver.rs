// ── macOS implementation via CoreGraphics Quartz Event Services ──────────────
#[cfg(target_os = "macos")]
use core_graphics::event::{
    CGEvent, CGEventTapLocation, CGEventType, CGKeyCode,
    CGMouseButton, EventField, CGEventFlags,
};
#[cfg(target_os = "macos")]
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
#[cfg(target_os = "macos")]
use foreign_types::ForeignType;
#[cfg(target_os = "macos")]
use core_graphics::geometry::CGPoint;
#[cfg(target_os = "macos")]
use std::cell::Cell;

#[cfg(target_os = "macos")]
fn is_letter_key(hid_code: u8) -> bool {
    hid_code >= 0x04 && hid_code <= 0x1D // A-Z in HID
}

/// Map HID modifier key codes to the corresponding CGEventFlags bit.
#[cfg(target_os = "macos")]
fn hid_to_modifier_flag(hid: u8) -> Option<CGEventFlags> {
    match hid {
        0xE0 | 0xE4 => Some(CGEventFlags::CGEventFlagControl),   // Left/Right Ctrl
        0xE1 | 0xE5 => Some(CGEventFlags::CGEventFlagShift),     // Left/Right Shift
        0xE2 | 0xE6 => Some(CGEventFlags::CGEventFlagAlternate), // Left/Right Alt/Option
        0xE3 | 0xE7 => Some(CGEventFlags::CGEventFlagCommand),   // Left/Right GUI/Cmd/Win
        _ => None,
    }
}

/// Query the current hardware cursor position via a null-source CGEvent.
#[cfg(target_os = "macos")]
fn cursor_position() -> CGPoint {
    #[link(name = "CoreGraphics", kind = "framework")]
    unsafe extern "C" {
        fn CGEventCreate(source: *const std::ffi::c_void) -> *mut std::ffi::c_void;
        fn CGEventGetLocation(event: *mut std::ffi::c_void) -> CGPoint;
        fn CFRelease(cf: *const std::ffi::c_void);
    }
    unsafe {
        let ev = CGEventCreate(std::ptr::null());
        if ev.is_null() { return CGPoint::new(0.0, 0.0); }
        let pt = CGEventGetLocation(ev);
        CFRelease(ev as *const _);
        pt
    }
}

/// HID Usage ID → macOS Virtual Keycode (ANSI layout)
#[cfg(target_os = "macos")]
fn hid_to_cg(hid: u8) -> Option<CGKeyCode> {
    let vk: u16 = match hid {
        0x04 => 0x00, // A
        0x05 => 0x0B, // B
        0x06 => 0x08, // C
        0x07 => 0x02, // D
        0x08 => 0x0E, // E
        0x09 => 0x03, // F
        0x0A => 0x05, // G
        0x0B => 0x04, // H
        0x0C => 0x22, // I
        0x0D => 0x26, // J
        0x0E => 0x28, // K
        0x0F => 0x25, // L
        0x10 => 0x2E, // M
        0x11 => 0x2D, // N
        0x12 => 0x1F, // O
        0x13 => 0x23, // P
        0x14 => 0x0C, // Q
        0x15 => 0x0F, // R
        0x16 => 0x01, // S
        0x17 => 0x11, // T
        0x18 => 0x20, // U
        0x19 => 0x09, // V
        0x1A => 0x0D, // W
        0x1B => 0x07, // X
        0x1C => 0x10, // Y
        0x1D => 0x06, // Z
        0x1E => 0x12, // 1
        0x1F => 0x13, // 2
        0x20 => 0x14, // 3
        0x21 => 0x15, // 4
        0x22 => 0x17, // 5
        0x23 => 0x16, // 6
        0x24 => 0x1A, // 7
        0x25 => 0x1C, // 8
        0x26 => 0x19, // 9
        0x27 => 0x1D, // 0
        0x28 => 0x24, // Return
        0x29 => 0x35, // Escape
        0x2A => 0x33, // Backspace (Delete)
        0x2B => 0x30, // Tab
        0x2C => 0x31, // Space
        0x2D => 0x1B, // -
        0x2E => 0x18, // =
        0x2F => 0x21, // [
        0x30 => 0x1E, // ]
        0x31 => 0x2A, // backslash
        0x33 => 0x29, // ;
        0x34 => 0x27, // '
        0x35 => 0x32, // `
        0x36 => 0x2B, // ,
        0x37 => 0x2F, // .
        0x38 => 0x2C, // /
        0x39 => 0x39, // Caps Lock
        0x3A => 0x7A, // F1
        0x3B => 0x78, // F2
        0x3C => 0x63, // F3
        0x3D => 0x76, // F4
        0x3E => 0x60, // F5
        0x3F => 0x61, // F6
        0x40 => 0x62, // F7
        0x41 => 0x64, // F8
        0x42 => 0x65, // F9
        0x43 => 0x6D, // F10
        0x44 => 0x67, // F11
        0x45 => 0x6F, // F12
        0x4A => 0x73, // Home
        0x4B => 0x74, // Page Up
        0x4C => 0x75, // Forward Delete
        0x4D => 0x77, // End
        0x4E => 0x79, // Page Down
        0x4F => 0x7C, // Right Arrow
        0x50 => 0x7B, // Left Arrow
        0x51 => 0x7D, // Down Arrow
        0x52 => 0x7E, // Up Arrow
        0xE0 => 0x3B, // Left Ctrl
        0xE1 => 0x38, // Left Shift
        0xE2 => 0x3A, // Left Option/Alt
        0xE3 => 0x37, // Left Command/GUI
        0xE4 => 0x3E, // Right Ctrl
        0xE5 => 0x3C, // Right Shift
        0xE6 => 0x3D, // Right Option/Alt
        0xE7 => 0x36, // Right Command/GUI
        _ => return None,
    };
    Some(vk)
}

#[cfg(target_os = "macos")]
pub struct DriverManager {
    pub initialized: bool,
    caps_lock_on: Cell<bool>,
    /// Bitmask of currently held modifier flags (Shift, Ctrl, Alt, Cmd).
    /// Updated on every modifier KeyDown/KeyUp so regular keys get the right flags.
    held_modifier_flags: Cell<u64>,
    /// Mouse movement remainder for sub-pixel precision
    remain_x: Cell<f64>,
    remain_y: Cell<f64>,
    /// Current mouse button state (Bit 0: Left, Bit 1: Right, Bit 2: Middle)
    /// This is used to maintain button state during drag operations
    mouse_button_state: Cell<u8>,
}

#[cfg(target_os = "macos")]
impl DriverManager {
    pub fn new() -> Self {
        Self {
            initialized: false,
            caps_lock_on: Cell::new(false),
            held_modifier_flags: Cell::new(0),
            remain_x: Cell::new(0.0),
            remain_y: Cell::new(0.0),
            mouse_button_state: Cell::new(0),
        }
    }

    /// Compute the CGEventFlags to attach to a key event.
    /// For letter keys:
    ///   - Shift held alone → replace CGEventFlagShift with CGEventFlagAlphaShift so that
    ///     the event reads as "caps-lock uppercase" rather than "shift down". This prevents
    ///     the macOS Chinese IME from seeing a Shift+letter hotkey and switching modes.
    ///   - Caps + Shift → lowercase (they cancel each other).
    ///   - Caps alone → uppercase via CGEventFlagAlphaShift.
    /// For non-letter keys: pass modifier flags through unchanged (Ctrl+C, Alt+Tab, etc.).
    fn compute_key_flags(&self, is_letter: bool) -> CGEventFlags {
        let raw = self.held_modifier_flags.get();
        let mut flags = CGEventFlags::from_bits_truncate(raw);
        if is_letter {
            let shift_held = flags.contains(CGEventFlags::CGEventFlagShift);
            let caps_on = self.caps_lock_on.get();
            // Want uppercase when exactly one of (shift, caps) is active
            let want_upper = shift_held ^ caps_on;
            // Always strip Shift for letters — use AlphaShift for uppercase instead
            flags.remove(CGEventFlags::CGEventFlagShift);
            if want_upper {
                flags.insert(CGEventFlags::CGEventFlagAlphaShift);
            } else {
                flags.remove(CGEventFlags::CGEventFlagAlphaShift);
            }
        }
        flags
    }

    pub fn initialize(&mut self) -> bool {
        if !is_accessibility_trusted() {
            println!("ERROR: Accessibility permission not granted!");
            println!("ACTION REQUIRED: System Settings → Privacy & Security → Accessibility");
            println!("Add this binary to the Accessibility list, then restart the application.");
            request_accessibility_if_needed();
            return false;
        }
        self.initialized = true;
        println!("Driver manager initialized (macOS CoreGraphics)");
        println!("Accessibility permission: GRANTED");
        true
    }

    pub fn unregister(&mut self) {}

    fn make_source() -> Option<CGEventSource> {
        // CombinedSessionState works under Hardened Runtime (signed .app bundles).
        // HIDSystemState can return None when the process has a code signature,
        // silently dropping all events.
        CGEventSource::new(CGEventSourceStateID::CombinedSessionState).ok()
    }

    pub fn send_key_press(&self, hid_code: u8) -> bool {
        if !self.initialized { return false; }

        // Caps Lock: toggle software state, don't forward to system
        if hid_code == 0x39 {
            self.caps_lock_on.set(!self.caps_lock_on.get());
            println!("[DEBUG] Caps Lock toggled: {}", self.caps_lock_on.get());
            return true;
        }

        // Modifier keys: update bitmask but do NOT post a physical key event.
        // Posting physical Shift/Ctrl/Alt events allows Chinese IMEs to intercept
        // standalone Shift presses and switch input mode. We apply the modifier
        // through CGEventFlags on each subsequent key event instead.
        if let Some(flag) = hid_to_modifier_flag(hid_code) {
            self.held_modifier_flags.set(self.held_modifier_flags.get() | flag.bits());
            return true;
        }

        let is_letter = is_letter_key(hid_code);
        if let Some(cg_key) = hid_to_cg(hid_code) {
            if let Some(src) = Self::make_source() {
                if let Ok(ev) = CGEvent::new_keyboard_event(src, cg_key, true) {
                    ev.set_flags(self.compute_key_flags(is_letter));
                    ev.post(CGEventTapLocation::HID);
                    println!("Key press: HID=0x{:02X} → CGKey={} flags={:?}",
                             hid_code, cg_key, self.compute_key_flags(is_letter));
                    return true;
                }
            }
        } else {
            println!("Key press: HID=0x{:02X} (no macOS mapping)", hid_code);
        }
        false
    }

    pub fn send_key_release(&self, hid_code: u8) -> bool {
        if !self.initialized { return false; }

        // Caps Lock handled in software only
        if hid_code == 0x39 { return true; }

        // Modifier keys: remove flag, no physical key event (same reason as press).
        if let Some(flag) = hid_to_modifier_flag(hid_code) {
            self.held_modifier_flags.set(self.held_modifier_flags.get() & !flag.bits());
            return true;
        }

        let is_letter = is_letter_key(hid_code);
        if let Some(cg_key) = hid_to_cg(hid_code) {
            if let Some(src) = Self::make_source() {
                if let Ok(ev) = CGEvent::new_keyboard_event(src, cg_key, false) {
                    ev.set_flags(self.compute_key_flags(is_letter));
                    ev.post(CGEventTapLocation::HID);
                    return true;
                }
            }
        }
        false
    }

    pub fn send_key_combo(&self, keys: &[u8]) -> bool {
        if !self.initialized { return false; }
        for &k in keys { self.send_key_press(k); }
        std::thread::sleep(std::time::Duration::from_millis(10));
        for &k in keys { self.send_key_release(k); }
        true
    }

    /// Send text by injecting Unicode directly via set_string — no IME needed.
    pub fn send_text(&self, text: &str) -> bool {
        if !self.initialized { return false; }
        if let Some(src) = Self::make_source() {
            if let Ok(ev) = CGEvent::new_keyboard_event(src, 0, true) {
                let utf16: Vec<u16> = text.encode_utf16().collect();
                ev.set_string_from_utf16_unchecked(&utf16);
                ev.post(CGEventTapLocation::HID);
                println!("Text inject: {:?}", text);
                return true;
            }
        }
        false
    }

    pub fn send_mouse_move(&self, dx: f64, dy: f64) -> bool {
        if !self.initialized { 
            println!("[Driver] send_mouse_move: not initialized");
            return false; 
        }

        println!("[Driver] send_mouse_move: dx={}, dy={}", dx, dy);

        // --- 核心逻辑：余数累加 (确保低速不丢帧) ---
        let total_x = dx + self.remain_x.get();
        let total_y = dy + self.remain_y.get();

        // 整数部分用于标准 API，小数部分留给下一帧
        let move_x = total_x.trunc();
        let move_y = total_y.trunc();
        
        self.remain_x.set(total_x - move_x);
        self.remain_y.set(total_y - move_y);

        println!("[Driver] move_x={}, move_y={}, remain_x={}, remain_y={}", move_x, move_y, self.remain_x.get(), self.remain_y.get());

        // 如果连 1 像素都没凑够，且不是 macOS (macOS支持浮点)，则跳过
        #[cfg(target_os = "windows")]
        if move_x as i32 == 0 && move_y as i32 == 0 {
            println!("[Driver] Skipping small move");
            return true;
        }

        #[cfg(target_os = "macos")]
        return self.execute_move(total_x, total_y, move_x as i64, move_y as i64);
        
        #[cfg(target_os = "windows")]
        return self.execute_move_windows(move_x as i32, move_y as i32);
    }

    // --- macOS 实现 ---
    #[cfg(target_os = "macos")]
    fn execute_move(&self, raw_x: f64, raw_y: f64, int_x: i64, int_y: i64) -> bool {
        use core_graphics::geometry::CGPoint;

        println!("[Driver] execute_move: raw_x={}, raw_y={}, int_x={}, int_y={}, button_state={:02X}",
                 raw_x, raw_y, int_x, int_y, self.mouse_button_state.get());

        let cur = cursor_position();
        println!("[Driver] Current cursor position: {:?}", cur);

        // 计算新位置
        let new_x = cur.x + int_x as f64;
        let new_y = cur.y + int_y as f64;
        println!("[Driver] Target position: x={}, y={}", new_x, new_y);

        let button_state = self.mouse_button_state.get();
        let point = CGPoint::new(new_x, new_y);

        // If any button is pressed, use CGEvent to send mouse move with button state
        // This is necessary for drag operations to work correctly
        if button_state != 0 {
            // Determine the appropriate mouse button for the event
            let btn = if button_state & 0x01 != 0 {
                CGMouseButton::Left
            } else if button_state & 0x02 != 0 {
                CGMouseButton::Right
            } else {
                CGMouseButton::Center
            };

            // Create a mouse moved event with the button held
            // This is the key to making drag operations work
            if let Some(src) = Self::make_source() {
                // Use LeftMouseDragged if left button is held, otherwise use MouseMoved
                let ev_type = if button_state & 0x01 != 0 {
                    CGEventType::LeftMouseDragged
                } else if button_state & 0x02 != 0 {
                    CGEventType::RightMouseDragged
                } else {
                    CGEventType::MouseMoved
                };

                if let Ok(ev) = CGEvent::new_mouse_event(src, ev_type, point, btn) {
                    ev.post(CGEventTapLocation::HID);
                    println!("[Driver] CGEvent mouse drag posted: type={:?}, button={:?}", ev_type, btn);
                    return true;
                }
            }
        }

        // If no button is pressed, use CGWarpMouseCursorPosition for simple movement
        // This is more efficient for regular mouse movement
        unsafe { core_graphics::display::CGWarpMouseCursorPosition(point); }
        println!("[Driver] CGWarpMouseCursorPosition called");

        true
    }

    pub fn send_mouse_button(&self, button_mask: u8, pressed: bool) -> bool {
        if !self.initialized { return false; }

        // Update internal button state tracking (like HID report Byte 0)
        let current_state = self.mouse_button_state.get();
        let new_state = if pressed {
            current_state | button_mask
        } else {
            current_state & !button_mask
        };
        self.mouse_button_state.set(new_state);
        println!("[Driver] Button state updated: mask={:02X}, pressed={}, state={:02X}", button_mask, pressed, new_state);

        let (ev_type, btn) = if pressed {
            if button_mask & 0x01 != 0 { (CGEventType::LeftMouseDown,  CGMouseButton::Left)   }
            else if button_mask & 0x02 != 0 { (CGEventType::RightMouseDown, CGMouseButton::Right)  }
            else if button_mask & 0x04 != 0 { (CGEventType::OtherMouseDown, CGMouseButton::Center) }
            else { return false; }
        } else {
            if button_mask & 0x01 != 0 { (CGEventType::LeftMouseUp,  CGMouseButton::Left)   }
            else if button_mask & 0x02 != 0 { (CGEventType::RightMouseUp, CGMouseButton::Right)  }
            else if button_mask & 0x04 != 0 { (CGEventType::OtherMouseUp, CGMouseButton::Center) }
            else { return false; }
        };
        let pos = cursor_position();
        if let Some(src) = Self::make_source() {
            if let Ok(ev) = CGEvent::new_mouse_event(src, ev_type, pos, btn) {
                // Explicitly set clickState=1 for single clicks so macOS can
                // correctly sequence to clickState=2 for double-click
                ev.set_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE, 1);
                ev.post(CGEventTapLocation::HID);
                return true;
            }
        }
        false
    }

    // --- Windows 实现 ---
    #[cfg(target_os = "windows")]
    fn execute_move_windows(&self, dx: i32, dy: i32) -> bool {
        println!("[Driver] execute_move_windows: dx={}, dy={}, button_state={:02X}", dx, dy, self.mouse_button_state);

        // Build mouse event flags
        // Similar to HID report: when buttons are pressed, we need to include them in move events
        // for drag operations to work correctly
        let mut flags = MOUSEEVENTF_MOVE;

        // If left button is held (Bit 0), include LEFTDOWN flag
        if self.mouse_button_state & 0x01 != 0 {
            flags |= MOUSEEVENTF_LEFTDOWN;
        }
        // If right button is held (Bit 1), include RIGHTDOWN flag
        if self.mouse_button_state & 0x02 != 0 {
            flags |= MOUSEEVENTF_RIGHTDOWN;
        }
        // If middle button is held (Bit 2), include MIDDLEDOWN flag
        if self.mouse_button_state & 0x04 != 0 {
            flags |= MOUSEEVENTF_MIDDLEDOWN;
        }

        let input = INPUT {
            type_: INPUT_MOUSE,
            union_: INPUT_UNION {
                mi: ManuallyDrop::new(MOUSEINPUT {
                    dx: dx,
                    dy: dy,
                    mouseData: 0,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: std::ptr::null_mut(),
                }),
            },
        };
        let result = unsafe { SendInput(1, &input, size_of::<INPUT>() as c_int) > 0 };
        println!("[Driver] SendInput result: {}, flags={:08X}", result, flags);
        result
    }

    /// Send a complete double-click sequence.
    /// macOS requires clickState=1 for first click, clickState=2 for second click.
    /// Timing: press(50ms) -> release(50ms) -> press(50ms) -> release
    pub fn send_mouse_double_click(&self, button_mask: u8) -> bool {
        if !self.initialized { return false; }
        let (down_type, up_type, btn) = if button_mask & 0x01 != 0 {
            (CGEventType::LeftMouseDown, CGEventType::LeftMouseUp, CGMouseButton::Left)
        } else if button_mask & 0x02 != 0 {
            (CGEventType::RightMouseDown, CGEventType::RightMouseUp, CGMouseButton::Right)
        } else {
            return false;
        };
        let pos = cursor_position();
        
        // First click with clickState=1: press -> hold 50ms -> release
        if let Some(src) = Self::make_source() {
            if let Ok(ev) = CGEvent::new_mouse_event(src, down_type, pos, btn) {
                ev.set_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE, 1);
                ev.post(CGEventTapLocation::HID);
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
        if let Some(src) = Self::make_source() {
            if let Ok(ev) = CGEvent::new_mouse_event(src, up_type, pos, btn) {
                ev.set_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE, 1);
                ev.post(CGEventTapLocation::HID);
            }
        }
        
        // Interval between clicks: 50ms
        std::thread::sleep(std::time::Duration::from_millis(50));
        
        // Second click with clickState=2: press -> hold 50ms -> release
        if let Some(src) = Self::make_source() {
            if let Ok(ev) = CGEvent::new_mouse_event(src, down_type, pos, btn) {
                ev.set_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE, 2);
                ev.post(CGEventTapLocation::HID);
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
        if let Some(src) = Self::make_source() {
            if let Ok(ev) = CGEvent::new_mouse_event(src, up_type, pos, btn) {
                ev.set_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE, 2);
                ev.post(CGEventTapLocation::HID);
            }
        }
        true
    }

    pub fn send_mouse_scroll(&self, delta: i32) -> bool {
        if !self.initialized { return false; }
        #[link(name = "CoreGraphics", kind = "framework")]
        unsafe extern "C" {
            fn CGEventCreateScrollWheelEvent(
                source: *const std::ffi::c_void,
                units: u32,
                wheel_count: u32,
                wheel1: i32,
            ) -> *mut std::ffi::c_void;
            fn CGEventPost(tap: u32, event: *mut std::ffi::c_void);
        }
        if let Some(src) = Self::make_source() {
            unsafe {
                // kCGScrollEventUnitLine = 1
                let ev = CGEventCreateScrollWheelEvent(
                    src.as_ptr() as *const _,
                    1, // LINE units
                    1, // wheel_count = 1 (vertical)
                    delta,
                );
                if !ev.is_null() {
                    // kCGHIDEventTap = 0
                    CGEventPost(0, ev);
                    return true;
                }
            }
        }
        false
    }
}

#[cfg(target_os = "macos")]
impl Drop for DriverManager { fn drop(&mut self) {} }

// ── Other platforms stub ─────────────────────────────────────────────────────
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub struct DriverManager { pub initialized: bool }
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
impl DriverManager {
    pub fn new() -> Self { Self { initialized: false } }
    pub fn initialize(&mut self) -> bool { self.initialized = true; true }
    pub fn unregister(&mut self) {}
    pub fn send_key_press(&self, _: u8) -> bool { false }
    pub fn send_key_release(&self, _: u8) -> bool { false }
    pub fn send_key_combo(&self, _: &[u8]) -> bool { false }
    pub fn send_mouse_move(&self, _: f64, _: f64) -> bool { false }
    pub fn send_mouse_button(&self, _: u8, _: bool) -> bool { false }
    pub fn send_mouse_scroll(&self, _: i32) -> bool { false }
    pub fn send_mouse_double_click(&self, _: u8) -> bool { false }
}
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
impl Drop for DriverManager { fn drop(&mut self) {} }

// ── Windows implementation ───────────────────────────────────────────────────
#[cfg(target_os = "windows")]
use std::ffi::{c_int, c_void};
#[cfg(target_os = "windows")]
use std::mem::{size_of, ManuallyDrop};
#[cfg(target_os = "windows")]
use std::ptr::null_mut;
#[cfg(target_os = "windows")]
use std::os::raw::c_ulong;
#[cfg(target_os = "windows")]
use std::cell::Cell;
#[cfg(target_os = "windows")]
use crate::scancode::hid_to_vk;

#[cfg(target_os = "windows")]
const INPUT_KEYBOARD: c_int = 1;
#[cfg(target_os = "windows")]
const INPUT_MOUSE: c_int = 0;
#[cfg(target_os = "windows")]
const KEYEVENTF_KEYUP: c_int = 0x0002;
#[cfg(target_os = "windows")]
const MOUSEEVENTF_MOVE: c_int = 0x0001;
#[cfg(target_os = "windows")]
const MOUSEEVENTF_LEFTDOWN: c_int = 0x0002;
#[cfg(target_os = "windows")]
const MOUSEEVENTF_LEFTUP: c_int = 0x0004;
#[cfg(target_os = "windows")]
const MOUSEEVENTF_RIGHTDOWN: c_int = 0x0008;
#[cfg(target_os = "windows")]
const MOUSEEVENTF_RIGHTUP: c_int = 0x0010;
#[cfg(target_os = "windows")]
const MOUSEEVENTF_MIDDLEDOWN: c_int = 0x0020;
#[cfg(target_os = "windows")]
const MOUSEEVENTF_MIDDLEUP: c_int = 0x0040;
#[cfg(target_os = "windows")]
const MOUSEEVENTF_WHEEL: c_int = 0x0800;
#[cfg(target_os = "windows")]
const WHEEL_DELTA: c_int = 120;

#[cfg(target_os = "windows")]
#[repr(C)]
pub struct INPUT {
    pub type_: c_int,
    pub union_: INPUT_UNION,
}

#[cfg(target_os = "windows")]
#[repr(C)]
pub union INPUT_UNION {
    pub ki: ManuallyDrop<KEYBDINPUT>,
    pub mi: ManuallyDrop<MOUSEINPUT>,
}

#[cfg(target_os = "windows")]
#[repr(C)]
pub struct KEYBDINPUT {
    pub wVk: u16,
    pub wScan: u16,
    pub dwFlags: c_int,
    pub time: c_int,
    pub dwExtraInfo: *mut c_void,
}

#[cfg(target_os = "windows")]
#[repr(C)]
pub struct MOUSEINPUT {
    pub dx: c_int,
    pub dy: c_int,
    pub mouseData: c_int,
    pub dwFlags: c_int,
    pub time: c_int,
    pub dwExtraInfo: *mut c_void,
}

#[cfg(target_os = "windows")]
#[link(name = "user32")]
unsafe extern "system" {
    fn SendInput(nInputs: c_int, pInputs: *const INPUT, cbSize: c_int) -> c_int;
}

#[cfg(target_os = "windows")]
type HANDLE = *mut c_void;
#[cfg(target_os = "windows")]
type HKEY = HANDLE;
#[cfg(target_os = "windows")]
type LPSECURITY_ATTRIBUTES = *mut c_void;
#[cfg(target_os = "windows")]
type LPCWSTR = *const u16;
#[cfg(target_os = "windows")]
type LPWSTR = *mut u16;
#[cfg(target_os = "windows")]
type LPDWORD = *mut c_ulong;
#[cfg(target_os = "windows")]
type LPBYTE = *mut u8;
#[cfg(target_os = "windows")]
type LONG = c_int;

#[cfg(target_os = "windows")]
const ERROR_ALREADY_EXISTS: c_ulong = 183;
#[cfg(target_os = "windows")]
const HKEY_CURRENT_USER: HKEY = 0x80000001 as HKEY;
#[cfg(target_os = "windows")]
const KEY_ALL_ACCESS: c_ulong = 0xF003F;
#[cfg(target_os = "windows")]
const KEY_READ: c_ulong = 0x20019;
#[cfg(target_os = "windows")]
const REG_DWORD: c_ulong = 4;

#[cfg(target_os = "windows")]
const MUTEX_NAME: &str = "Global\\RustKeyboardSimulator_Instance";
#[cfg(target_os = "windows")]
const REGISTRY_KEY: &str = "Software\\RustKeyboard";
#[cfg(target_os = "windows")]
const REGISTRY_VALUE: &str = "Registered";

#[cfg(target_os = "windows")]
#[link(name = "kernel32")]
unsafe extern "system" {
    fn CreateMutexW(lpMutexAttributes: LPSECURITY_ATTRIBUTES, bInitialOwner: bool, lpName: LPCWSTR) -> HANDLE;
    fn CloseHandle(hObject: HANDLE) -> bool;
    fn GetLastError() -> c_ulong;
    fn GetCurrentProcessId() -> c_ulong;
}

#[cfg(target_os = "windows")]
#[link(name = "advapi32")]
unsafe extern "system" {
    fn RegCreateKeyExW(hKey: HKEY, lpSubKey: LPCWSTR, Reserved: c_ulong, lpClass: LPWSTR, dwOptions: c_ulong, samDesired: c_ulong, lpSecurityAttributes: LPSECURITY_ATTRIBUTES, phkResult: *mut HKEY, lpdwDisposition: LPDWORD) -> LONG;
    fn RegOpenKeyExW(hKey: HKEY, lpSubKey: LPCWSTR, ulOptions: c_ulong, samDesired: c_ulong, phkResult: *mut HKEY) -> LONG;
    fn RegSetValueExW(hKey: HKEY, lpValueName: LPCWSTR, Reserved: c_ulong, dwType: c_ulong, lpData: LPBYTE, cbData: c_ulong) -> LONG;
    fn RegQueryValueExW(hKey: HKEY, lpValueName: LPCWSTR, lpReserved: LPDWORD, lpType: LPDWORD, lpData: LPBYTE, lpcbData: LPDWORD) -> LONG;
    fn RegDeleteValueW(hKey: HKEY, lpValueName: LPCWSTR) -> LONG;
    fn RegCloseKey(hKey: HKEY) -> LONG;
}

#[cfg(target_os = "windows")]
fn to_wide_string(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
pub struct DriverManager {
    initialized: bool,
    instance_mutex: HANDLE,
    registered: bool,
    /// Mouse movement remainder for sub-pixel precision
    remain_x: Cell<f64>,
    remain_y: Cell<f64>,
    /// Current mouse button state (Bit 0: Left, Bit 1: Right, Bit 2: Middle)
    /// This is used to maintain button state during drag operations
    mouse_button_state: Cell<u8>,
}

#[cfg(target_os = "windows")]
impl DriverManager {
    pub fn new() -> Self {
        Self {
            initialized: false,
            instance_mutex: null_mut(),
            registered: false,
            remain_x: Cell::new(0.0),
            remain_y: Cell::new(0.0),
            mouse_button_state: Cell::new(0),
        }
    }

    pub fn initialize(&mut self) -> bool {
        if self.check_and_cleanup_existing() {
            println!("Cleaned up existing registration");
        }
        if !self.register() {
            eprintln!("Failed to register virtual keyboard");
            return false;
        }
        self.initialized = true;
        println!("Driver manager initialized with Windows API");
        true
    }

    fn register(&mut self) -> bool {
        unsafe {
            let mutex_name = to_wide_string(MUTEX_NAME);
            let mutex = CreateMutexW(null_mut(), true, mutex_name.as_ptr());
            if mutex.is_null() { eprintln!("Failed to create mutex"); return false; }
            let error = GetLastError();
            if error == ERROR_ALREADY_EXISTS {
                println!("Another instance is already running");
                CloseHandle(mutex);
                return false;
            }
            self.instance_mutex = mutex;
            let sub_key = to_wide_string(REGISTRY_KEY);
            let mut h_key: HKEY = null_mut();
            let mut disposition: c_ulong = 0;
            let result = RegCreateKeyExW(HKEY_CURRENT_USER, sub_key.as_ptr(), 0, null_mut(), 0, KEY_ALL_ACCESS, null_mut(), &mut h_key, &mut disposition);
            if result != 0 { eprintln!("Failed to create registry key: {}", result); return false; }
            let value_name = to_wide_string(REGISTRY_VALUE);
            let pid = GetCurrentProcessId();
            let data = pid.to_le_bytes();
            let result = RegSetValueExW(h_key, value_name.as_ptr(), 0, REG_DWORD, data.as_ptr() as LPBYTE, size_of::<c_ulong>() as c_ulong);
            RegCloseKey(h_key);
            if result != 0 { eprintln!("Failed to set registry value: {}", result); return false; }
            self.registered = true;
            println!("Virtual keyboard registered (PID: {})", pid);
            true
        }
    }

    pub fn unregister(&mut self) {
        if !self.registered { return; }
        unsafe {
            let sub_key = to_wide_string(REGISTRY_KEY);
            let mut h_key: HKEY = null_mut();
            let result = RegOpenKeyExW(HKEY_CURRENT_USER, sub_key.as_ptr(), 0, KEY_ALL_ACCESS, &mut h_key);
            if result == 0 && !h_key.is_null() {
                let value_name = to_wide_string(REGISTRY_VALUE);
                RegDeleteValueW(h_key, value_name.as_ptr());
                RegCloseKey(h_key);
                println!("Virtual keyboard unregistered");
            }
            if !self.instance_mutex.is_null() {
                CloseHandle(self.instance_mutex);
                self.instance_mutex = null_mut();
            }
            self.registered = false;
        }
    }

    fn check_and_cleanup_existing(&self) -> bool {
        unsafe {
            let sub_key = to_wide_string(REGISTRY_KEY);
            let mut h_key: HKEY = null_mut();
            let result = RegOpenKeyExW(HKEY_CURRENT_USER, sub_key.as_ptr(), 0, KEY_READ, &mut h_key);
            if result != 0 { return false; }
            let value_name = to_wide_string(REGISTRY_VALUE);
            let mut value_type: c_ulong = 0;
            let mut value_data: c_ulong = 0;
            let mut value_size: c_ulong = size_of::<c_ulong>() as c_ulong;
            let query_result = RegQueryValueExW(h_key, value_name.as_ptr(), null_mut(), &mut value_type, &mut value_data as *mut c_ulong as LPBYTE, &mut value_size);
            RegCloseKey(h_key);
            if query_result == 0 {
                println!("Found existing registration (PID: {})", value_data);
                let mutex_name = to_wide_string(MUTEX_NAME);
                let mutex = CreateMutexW(null_mut(), false, mutex_name.as_ptr());
                if !mutex.is_null() {
                    let error = GetLastError();
                    CloseHandle(mutex);
                    if error == ERROR_ALREADY_EXISTS { println!("Another instance is still running"); return false; }
                }
                println!("Previous instance is not running, cleaning up registry");
                return true;
            }
            false
        }
    }

    pub fn send_key_press(&self, hid_code: u8) -> bool {
        if !self.initialized { return false; }
        println!("Key press: HID=0x{:02X}", hid_code);
        let vk = hid_to_vk(hid_code) as u16;
        let input = INPUT {
            type_: INPUT_KEYBOARD,
            union_: INPUT_UNION {
                ki: ManuallyDrop::new(KEYBDINPUT { wVk: vk, wScan: hid_code as u16, dwFlags: 0, time: 0, dwExtraInfo: std::ptr::null_mut() }),
            },
        };
        unsafe { SendInput(1, &input, size_of::<INPUT>() as c_int) > 0 }
    }

    pub fn send_key_release(&self, hid_code: u8) -> bool {
        if !self.initialized { return false; }
        println!("Key release: HID=0x{:02X}", hid_code);
        let vk = hid_to_vk(hid_code) as u16;
        let input = INPUT {
            type_: INPUT_KEYBOARD,
            union_: INPUT_UNION {
                ki: ManuallyDrop::new(KEYBDINPUT { wVk: vk, wScan: hid_code as u16, dwFlags: KEYEVENTF_KEYUP, time: 0, dwExtraInfo: std::ptr::null_mut() }),
            },
        };
        unsafe { SendInput(1, &input, size_of::<INPUT>() as c_int) > 0 }
    }

    pub fn send_key_combo(&self, keys: &[u8]) -> bool {
        if !self.initialized { return false; }
        println!("Key combo: HID={:?}", keys);
        for &key in keys { if !self.send_key_press(key) { return false; } }
        std::thread::sleep(std::time::Duration::from_millis(10));
        for &key in keys { if !self.send_key_release(key) { return false; } }
        true
    }

    pub fn send_mouse_button(&self, button_mask: u8, pressed: bool) -> bool {
        if !self.initialized { return false; }

        // Update internal button state tracking (like HID report Byte 0)
        let current_state = self.mouse_button_state.get();
        let new_state = if pressed {
            current_state | button_mask
        } else {
            current_state & !button_mask
        };
        self.mouse_button_state.set(new_state);
        println!("[Driver] Button state updated: mask={:02X}, pressed={}, state={:02X}", button_mask, pressed, new_state);

        let flags = if pressed {
            if button_mask & 0x01 != 0 { MOUSEEVENTF_LEFTDOWN }
            else if button_mask & 0x02 != 0 { MOUSEEVENTF_RIGHTDOWN }
            else if button_mask & 0x04 != 0 { MOUSEEVENTF_MIDDLEDOWN }
            else { return false; }
        } else {
            if button_mask & 0x01 != 0 { MOUSEEVENTF_LEFTUP }
            else if button_mask & 0x02 != 0 { MOUSEEVENTF_RIGHTUP }
            else if button_mask & 0x04 != 0 { MOUSEEVENTF_MIDDLEUP }
            else { return false; }
        };
        let input = INPUT {
            type_: INPUT_MOUSE,
            union_: INPUT_UNION {
                mi: ManuallyDrop::new(MOUSEINPUT { dx: 0, dy: 0, mouseData: 0, dwFlags: flags, time: 0, dwExtraInfo: std::ptr::null_mut() }),
            },
        };
        unsafe { SendInput(1, &input, size_of::<INPUT>() as c_int) > 0 }
    }

    pub fn send_mouse_scroll(&self, delta: i32) -> bool {
        if !self.initialized { return false; }
        let input = INPUT {
            type_: INPUT_MOUSE,
            union_: INPUT_UNION {
                mi: ManuallyDrop::new(MOUSEINPUT { dx: 0, dy: 0, mouseData: (delta * WHEEL_DELTA) as c_int, dwFlags: MOUSEEVENTF_WHEEL, time: 0, dwExtraInfo: std::ptr::null_mut() }),
            },
        };
        unsafe { SendInput(1, &input, size_of::<INPUT>() as c_int) > 0 }
    }

    pub fn send_mouse_move(&self, dx: f64, dy: f64) -> bool {
        if !self.initialized { 
            println!("[Driver] send_mouse_move: not initialized");
            return false; 
        }

        println!("[Driver] send_mouse_move: dx={}, dy={}", dx, dy);

        // --- Core logic: remainder accumulation (ensure low speed doesn't lose frames) ---
        let total_x = dx + self.remain_x.get();
        let total_y = dy + self.remain_y.get();

        // Integer part for standard API, decimal part for next frame
        let move_x = total_x.trunc();
        let move_y = total_y.trunc();
        
        self.remain_x.set(total_x - move_x);
        self.remain_y.set(total_y - move_y);

        println!("[Driver] move_x={}, move_y={}, remain_x={}, remain_y={}", move_x, move_y, self.remain_x.get(), self.remain_y.get());

        // Skip if less than 1 pixel
        if move_x as i32 == 0 && move_y as i32 == 0 {
            println!("[Driver] Skipping small move");
            return true;
        }

        // Execute Windows mouse move
        self.execute_move_windows(move_x as i32, move_y as i32)
    }

    fn execute_move_windows(&self, dx: i32, dy: i32) -> bool {
        println!("[Driver] execute_move_windows: dx={}, dy={}", dx, dy);
        
        let input = INPUT {
            type_: INPUT_MOUSE,
            union_: INPUT_UNION {
                mi: ManuallyDrop::new(MOUSEINPUT { 
                    dx: dx as c_int, 
                    dy: dy as c_int, 
                    mouseData: 0, 
                    dwFlags: MOUSEEVENTF_MOVE, 
                    time: 0, 
                    dwExtraInfo: std::ptr::null_mut() 
                }),
            },
        };
        unsafe { SendInput(1, &input, size_of::<INPUT>() as c_int) > 0 }
    }

    /// Send a double-click sequence.
    /// Windows USER32 auto-generates WM_LBUTTONDBLCLK when two clicks arrive
    /// within the system double-click interval at the same cursor position.
    /// Timing: press(50ms) -> release(50ms) -> press(50ms) -> release
    /// Total time: ~150ms, well within the system double-click time (500ms)
    pub fn send_mouse_double_click(&self, button_mask: u8) -> bool {
        if !self.initialized { return false; }
        
        // First click: press -> hold 50ms -> release
        self.send_mouse_button(button_mask, true);
        std::thread::sleep(std::time::Duration::from_millis(50));
        self.send_mouse_button(button_mask, false);
        
        // Interval between clicks: 50ms
        std::thread::sleep(std::time::Duration::from_millis(50));
        
        // Second click: press -> hold 50ms -> release
        self.send_mouse_button(button_mask, true);
        std::thread::sleep(std::time::Duration::from_millis(50));
        self.send_mouse_button(button_mask, false);
        
        true
    }
    
}

#[cfg(target_os = "windows")]
impl Drop for DriverManager {
    fn drop(&mut self) {
        println!("DriverManager dropping, cleaning up...");
        self.unregister();
    }
}

/// macOS: check whether Accessibility is trusted (no prompt).
#[cfg(target_os = "macos")]
pub fn is_accessibility_trusted() -> bool {
    #[link(name = "ApplicationServices", kind = "framework")]
    unsafe extern "C" {
        fn AXIsProcessTrusted() -> bool;
    }
    unsafe { AXIsProcessTrusted() }
}

/// macOS: open System Settings Accessibility pane and trigger the system prompt.
#[cfg(target_os = "macos")]
pub fn request_accessibility_if_needed() {
    #[link(name = "ApplicationServices", kind = "framework")]
    unsafe extern "C" {
        fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
    }
    #[link(name = "CoreFoundation", kind = "framework")]
    unsafe extern "C" {
        fn CFDictionaryCreate(
            allocator: *const std::ffi::c_void,
            keys: *const *const std::ffi::c_void,
            values: *const *const std::ffi::c_void,
            num_values: isize,
            key_callbacks: *const std::ffi::c_void,
            value_callbacks: *const std::ffi::c_void,
        ) -> *const std::ffi::c_void;
        fn CFRelease(cf: *const std::ffi::c_void);
        static kCFBooleanTrue: *const std::ffi::c_void;
        static kAXTrustedCheckOptionPrompt: *const std::ffi::c_void;
        static kCFTypeDictionaryKeyCallBacks: std::ffi::c_void;
        static kCFTypeDictionaryValueCallBacks: std::ffi::c_void;
    }

    unsafe {
        let keys = [kAXTrustedCheckOptionPrompt as *const std::ffi::c_void];
        let values = [kCFBooleanTrue as *const std::ffi::c_void];
        let opts = CFDictionaryCreate(
            std::ptr::null(),
            keys.as_ptr(),
            values.as_ptr(),
            1,
            &kCFTypeDictionaryKeyCallBacks as *const _ as *const std::ffi::c_void,
            &kCFTypeDictionaryValueCallBacks as *const _ as *const std::ffi::c_void,
        );
        AXIsProcessTrustedWithOptions(opts);
        CFRelease(opts);
    }
}
