use tokio::net::{UdpSocket, TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio::io::{BufReader, AsyncBufReadExt};
use std::net::SocketAddr;
use std::time::Duration;

// 键盘事件类型
#[derive(Debug, Clone)]
pub enum KeyboardEvent {
    KeyDown(u8),           // 按键按下
    KeyUp(u8),             // 按键释放
    KeyCombo(Vec<u8>),     // 组合键
    Text(String),          // 文本输入
    MouseMove(i32, i32),   // 鼠标移动
    MouseButton(u8, bool), // 鼠标按键：掩码, 按下/释放
    MouseScroll(i32),      // 鼠标滚轮
    ResetState,            // 释放所有修饰键
    MouseDoubleClick(u8),  // 双击：掩码
}

// 内部消息结构
#[derive(Debug, Clone)]
pub struct NetworkMessage {
    pub event: KeyboardEvent,
    pub timestamp: u64,
}

// ── 紧凑协议解析器 ────────────────────────────────────────────────────────────
// 每条消息是一行 ASCII，以 \n 结尾：
//   D<HH>       KeyDown,  HH = HID码 大写十六进制
//   U<HH>       KeyUp
//   M<XX><YY>   MouseMove, XX/YY = signed i8 (两补码) 大写十六进制
//   B<HH><P>    MouseButton, HH = 掩码, P = '1' 按下 / '0' 释放
//   S<HH>       MouseScroll, HH = signed i8 大写十六进制
//   C<HH>       MouseDoubleClick, HH = 掩码
//
// 例：KeyDown(0x07) → "D07"  MouseMove(5,-3) → "M05FD"  MouseScroll(-2) → "SFE"
fn parse_message(s: &str) -> Option<NetworkMessage> {
    let b = s.as_bytes();
    if b.is_empty() { return None; }

    let event = match b[0] {
        b'D' if b.len() >= 3 => {
            KeyboardEvent::KeyDown(u8::from_str_radix(&s[1..3], 16).ok()?)
        }
        b'U' if b.len() >= 3 => {
            KeyboardEvent::KeyUp(u8::from_str_radix(&s[1..3], 16).ok()?)
        }
        b'M' if b.len() >= 5 => {
            let x = u8::from_str_radix(&s[1..3], 16).ok()? as i8 as i32;
            let y = u8::from_str_radix(&s[3..5], 16).ok()? as i8 as i32;
            KeyboardEvent::MouseMove(x, y)
        }
        b'B' if b.len() >= 4 => {
            let mask = u8::from_str_radix(&s[1..3], 16).ok()?;
            KeyboardEvent::MouseButton(mask, b[3] == b'1')
        }
        b'S' if b.len() >= 3 => {
            let delta = u8::from_str_radix(&s[1..3], 16).ok()? as i8 as i32;
            KeyboardEvent::MouseScroll(delta)
        }
        b'C' if b.len() >= 3 => {
            KeyboardEvent::MouseDoubleClick(u8::from_str_radix(&s[1..3], 16).ok()?)
        }
        _ => return None,
    };

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    Some(NetworkMessage { event, timestamp })
}

use std::sync::Arc;

pub struct NetworkManager {
    udp_socket: Option<Arc<UdpSocket>>,
    tcp_listener: Option<Arc<TcpListener>>,
    event_sender: mpsc::Sender<NetworkMessage>,
    event_receiver: mpsc::Receiver<NetworkMessage>,
    udp_port: u16,
    tcp_port: u16,
}

impl NetworkManager {
    pub fn new(udp_port: u16, tcp_port: u16) -> Self {
        let (sender, receiver) = mpsc::channel(100);
        Self {
            udp_socket: None,
            tcp_listener: None,
            event_sender: sender,
            event_receiver: receiver,
            udp_port,
            tcp_port,
        }
    }

    pub async fn init_udp(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let socket = UdpSocket::bind(format!("0.0.0.0:{}", self.udp_port)).await?;
        self.udp_socket = Some(Arc::new(socket));
        Ok(())
    }

    pub async fn init_tcp(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let addr = format!("0.0.0.0:{}", self.tcp_port);
        println!("[TCP] Binding to {}", addr);
        self.tcp_listener = Some(Arc::new(TcpListener::bind(&addr).await?));
        println!("[TCP] Successfully bound to {}", addr);
        Ok(())
    }

    pub async fn start_udp_listener(&mut self) {
        if let Some(socket) = &self.udp_socket {
            let socket = socket.clone();
            let sender = self.event_sender.clone();
            tokio::spawn(async move {
                let mut buf = [0u8; 16];
                loop {
                    match socket.recv_from(&mut buf).await {
                        Ok((n, _)) => {
                            let s = std::str::from_utf8(&buf[..n]).unwrap_or("").trim();
                            if let Some(msg) = parse_message(s) {
                                if sender.send(msg).await.is_err() { break; }
                            }
                        }
                        Err(e) => {
                            eprintln!("UDP receive error: {}", e);
                            tokio::time::sleep(Duration::from_millis(100)).await;
                        }
                    }
                }
            });
        }
    }

    pub async fn start_tcp_listener(&mut self) {
        if let Some(listener) = &self.tcp_listener {
            let listener = listener.clone();
            let sender = self.event_sender.clone();
            println!("[TCP] Starting TCP listener...");
            tokio::spawn(async move {
                println!("[TCP] Waiting for connections...");
                loop {
                    match listener.accept().await {
                        Ok((stream, addr)) => {
                            println!("[TCP] client connected: {}", addr);
                            tokio::spawn(handle_tcp_connection(stream, sender.clone()));
                        }
                        Err(e) => {
                            eprintln!("[TCP] accept error: {}", e);
                            tokio::time::sleep(Duration::from_millis(100)).await;
                        }
                    }
                }
            });
        } else {
            eprintln!("[TCP] Cannot start listener: no tcp_listener");
        }
    }

    pub fn get_event_receiver(&mut self) -> mpsc::Receiver<NetworkMessage> {
        std::mem::replace(&mut self.event_receiver, mpsc::channel(100).1)
    }

    pub async fn send_message(&self, _addr: &SocketAddr, _msg: &str) -> Result<(), Box<dyn std::error::Error>> {
        Ok(()) // 服务器不主动向客户端发送数据
    }
}

async fn handle_tcp_connection(stream: TcpStream, sender: mpsc::Sender<NetworkMessage>) {
    let reader = BufReader::new(stream);
    let mut lines = reader.lines();
    loop {
        match lines.next_line().await {
            Ok(Some(line)) => {
                let s = line.trim();
                if s.is_empty() { continue; }
                if let Some(msg) = parse_message(s) {
                    if sender.send(msg).await.is_err() { break; }
                } else {
                    eprintln!("[TCP] unknown message: {}", s);
                }
            }
            Ok(None) => break,
            Err(e) => { eprintln!("[TCP] read error: {}", e); break; }
        }
    }
    // 客户端断开 → 释放所有修饰键，防止卡键
    println!("[TCP] client disconnected, resetting modifier state");
    let _ = sender.send(NetworkMessage {
        event: KeyboardEvent::ResetState,
        timestamp: 0,
    }).await;
}
