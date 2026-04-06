use tokio::net::UdpSocket;
use tokio::sync::mpsc;
use std::time::Duration;
use std::net::SocketAddr;
use std::sync::Arc;

// 键盘事件类型
#[derive(Debug, Clone)]
pub enum KeyboardEvent {
    KeyDown(u8),           // 按键按下
    KeyUp(u8),             // 按键释放
    KeyCombo(Vec<u8>),     // 组合键
    Text(String),          // 文本输入
    MouseMove(f64, f64),   // 鼠标移动
    MouseButton(u8, bool), // 鼠标按键：掩码, 按下/释放
    MouseScroll(i32),      // 鼠标滚轮
    ResetState,            // 释放所有修饰键
    MouseDoubleClick(u8),  // 双击：掩码
    Heartbeat,             // 心跳包
}

// 内部消息结构
#[derive(Debug, Clone)]
pub struct NetworkMessage {
    pub event: KeyboardEvent,
    pub timestamp: u64,
    pub addr: Option<SocketAddr>, // 客户端地址，用于回复心跳
}

// ── 紧凑协议解析器 ────────────────────────────────────────────────────────────
// 每条消息是一行 ASCII，以 \n 结尾：
//   D<HH>       KeyDown,  HH = HID码 大写十六进制
//   U<HH>       KeyUp
//   M<XX><YY>   MouseMove, XX/YY = signed i8 (两补码) 大写十六进制
//   B<HH><P>    MouseButton, HH = 掩码, P = '1' 按下 / '0' 释放
//   S<HH>       MouseScroll, HH = signed i8 大写十六进制
//   C<HH>       MouseDoubleClick, HH = 掩码
//   H           Heartbeat，收到后需立即回复 H
//
// 例：KeyDown(0x07) → "D07"  MouseMove(5,-3) → "M05FD"  MouseScroll(-2) → "SFE"
fn parse_message(s: &str, addr: SocketAddr) -> Option<NetworkMessage> {
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
            let x = u8::from_str_radix(&s[1..3], 16).ok()? as i8 as f64;
            let y = u8::from_str_radix(&s[3..5], 16).ok()? as i8 as f64;
            //println!("[Network] Parsed MouseMove: x={}, y={} from {}", x, y, s);
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
        b'H' => {
            // 心跳包
            KeyboardEvent::Heartbeat
        }
        _ => return None,
    };

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    Some(NetworkMessage { event, timestamp, addr: Some(addr) })
}

pub struct NetworkManager {
    udp_socket: Option<Arc<UdpSocket>>,
    event_sender: mpsc::Sender<NetworkMessage>,
    event_receiver: mpsc::Receiver<NetworkMessage>,
    udp_port: u16,
}

impl NetworkManager {
    pub fn new(udp_port: u16) -> Self {
        let (sender, receiver) = mpsc::channel(100);
        Self {
            udp_socket: None,
            event_sender: sender,
            event_receiver: receiver,
            udp_port,
        }
    }

    pub async fn init_udp(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let socket = UdpSocket::bind(format!("0.0.0.0:{}", self.udp_port)).await?;
       // println!("[UDP] Bound to port {}", self.udp_port);
        self.udp_socket = Some(Arc::new(socket));
        Ok(())
    }

    pub async fn start_udp_listener(&mut self) {
        if let Some(socket) = &self.udp_socket {
            let socket = socket.clone();
            let sender = self.event_sender.clone();

            // 存储已知的客户端地址，用于发送心跳
            let clients: Arc<std::sync::Mutex<Vec<SocketAddr>>> = Arc::new(std::sync::Mutex::new(Vec::new()));
            let clients_for_heartbeat = clients.clone();
            let socket_for_heartbeat = socket.clone();

            // 启动心跳发送任务（每8秒向所有已知客户端发送心跳）
            tokio::spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_secs(8));
                loop {
                    interval.tick().await;
                    let clients_list = {
                        let guard = clients_for_heartbeat.lock().unwrap();
                        guard.clone()
                    };

                    //eprintln!("[Heartbeat] Tick - {} clients in list", clients_list.len());

                    for addr in clients_list {
                        let heartbeat = b"H";
                        if let Err(e) = socket_for_heartbeat.send_to(heartbeat, addr).await {
                            //eprintln!("[Heartbeat] Failed to send heartbeat to {} at {}: {}", addr, chrono::Local::now().format("%Y-%m-%d %H:%M:%S"), e);
                        } else {
                            //eprintln!("[Heartbeat] Sent to {} at {}", addr, chrono::Local::now().format("%Y-%m-%d %H:%M:%S"));
                        }
                    }
                }
            });

            // 启动接收任务
            let clients_for_recv = clients.clone();
            tokio::spawn(async move {
                let mut buf = [0u8; 64];
                loop {
                    match socket.recv_from(&mut buf).await {
                        Ok((n, addr)) => {
                            let s = std::str::from_utf8(&buf[..n]).unwrap_or("").trim();
                            if !s.is_empty() {
                                // 检查是否是心跳包 (H 或 H<number>)
                                if s.starts_with("H") {
                                    //println!("[UDP] Heartbeat received from {}: {}", addr, s);
                                    
                                    // 添加客户端到已知列表（如果是新客户端）
                                    // 同一个 IP 只保留最后一个客户端，替换之前的
                                    {
                                        let mut clients_guard = clients_for_recv.lock().unwrap();
                                        
                                        // 检查是否已有同 IP 的客户端
                                        let same_ip_clients: Vec<_> = clients_guard.iter()
                                            .filter(|client| client.ip() == addr.ip())
                                            .cloned()
                                            .collect();
                                        
                                        if !clients_guard.contains(&addr) {
                                            // 如果是新客户端，移除同 IP 的旧客户端
                                            for old_client in same_ip_clients {
                                                let index = clients_guard.iter().position(|c| c == &old_client).unwrap();
                                                clients_guard.remove(index);
                                                //println!("[UDP] Replaced old client {} with new client {}", old_client, addr);
                                            }
                                            
                                            // 添加新客户端
                                            clients_guard.push(addr);
                                            //println!("[UDP] New client registered: {}", addr);
                                        }
                                    }
                                    
                                    // 处理心跳响应：如果是 H<number>，返回 H<number+1>
                                    let heartbeat_resp = if s.len() > 1 {
                                        // Parse the number after H
                                        if let Ok(num) = s[1..].parse::<i32>() {
                                            let resp_num = num + 1;
                                            format!("H{}", resp_num)
                                        } else {
                                            "H".to_string()
                                        }
                                    } else {
                                        "H".to_string()
                                    };
                                    
                                    if let Err(e) = socket.send_to(heartbeat_resp.as_bytes(), addr).await {
                                        eprintln!("[UDP] Failed to send heartbeat response to {}: {}", addr, e);
                                    } else {
                                        //println!("[UDP] Heartbeat response sent to {}: {}", addr, heartbeat_resp);
                                    }
                                    
                                    // 也发送给事件处理器记录
                                    if let Some(msg) = parse_message(s, addr) {
                                        if sender.send(msg).await.is_err() { break; }
                                    }
                                } else if let Some(msg) = parse_message(s, addr) {
                                    if sender.send(msg).await.is_err() { break; }
                                } else {
                                    eprintln!("[UDP] Unknown message from {}: {}", addr, s);
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("[UDP] Receive error: {}", e);
                            tokio::time::sleep(Duration::from_millis(100)).await;
                        }
                    }
                }
            });
            //println!("[UDP] Listener started on port {}", self.udp_port);
        }
    }

    pub fn get_event_receiver(&mut self) -> mpsc::Receiver<NetworkMessage> {
        std::mem::replace(&mut self.event_receiver, mpsc::channel(100).1)
    }
}
