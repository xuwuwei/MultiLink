use super::network::NetworkMessage;
use tokio::sync::mpsc;
use std::collections::VecDeque;
use std::time::{Duration, SystemTime};

// 缓冲配置
#[derive(Clone)]
pub struct BufferConfig {
    pub max_buffer_size: usize,      // 最大缓冲大小
    pub target_interval: Duration,    // 目标按键间隔
    pub max_delay: Duration,          // 最大延迟
    pub jitter_threshold: Duration,   // 抖动阈值
}

impl Default for BufferConfig {
    fn default() -> Self {
        Self {
            max_buffer_size: 100,
            target_interval: Duration::from_millis(10),
            max_delay: Duration::from_millis(50),
            jitter_threshold: Duration::from_millis(5),
        }
    }
}

// 缓冲项
struct BufferItem {
    message: NetworkMessage,
    timestamp: u64,
    scheduled_time: u64, // 计划执行时间
}

// 抖动平衡和时间缓冲器
pub struct JitterBuffer {
    config: BufferConfig,
    buffer: VecDeque<BufferItem>,
    last_execution_time: u64,
    event_sender: mpsc::Sender<NetworkMessage>,
}

impl JitterBuffer {
    pub fn new(config: BufferConfig, event_sender: mpsc::Sender<NetworkMessage>) -> Self {
        Self {
            config: config.clone(),
            buffer: VecDeque::with_capacity(config.max_buffer_size),
            last_execution_time: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            event_sender,
        }
    }
    
    // 添加消息到缓冲
    pub fn add_message(&mut self, message: NetworkMessage) {
        // 计算计划执行时间
        let current_time = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // 计算与上一个事件的时间差
        let time_since_last = current_time - self.last_execution_time;
        
        // 根据目标间隔调整计划执行时间
        let scheduled_time = if time_since_last < self.config.target_interval.as_millis() as u64 {
            // 如果时间间隔太小，延迟执行
            self.last_execution_time + self.config.target_interval.as_millis() as u64
        } else {
            // 否则立即执行
            current_time
        };
        
        // 创建缓冲项
        let item = BufferItem {
            message,
            timestamp: current_time,
            scheduled_time,
        };
        
        // 添加到缓冲
        if self.buffer.len() >= self.config.max_buffer_size {
            // 缓冲已满，移除最早的项
            self.buffer.pop_front();
        }
        
        self.buffer.push_back(item);
    }
    
    // 处理缓冲中的消息
    pub async fn process_buffer(&mut self) {
        let current_time = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // 处理所有已到执行时间的消息
        while let Some(item) = self.buffer.front() {
            if current_time >= item.scheduled_time {
                // 发送消息
                if self.event_sender.send(item.message.clone()).await.is_err() {
                    break;
                }
                
                // 更新最后执行时间
                self.last_execution_time = current_time;
                
                // 移除已处理的项
                self.buffer.pop_front();
            } else {
                // 还未到执行时间，跳出循环
                break;
            }
        }
        
        // 清理过期消息（超过最大延迟）
        let max_timestamp = current_time - self.config.max_delay.as_millis() as u64;
        while let Some(item) = self.buffer.front() {
            if item.timestamp < max_timestamp {
                self.buffer.pop_front();
            } else {
                break;
            }
        }
    }
    
    // 获取缓冲大小
    pub fn buffer_size(&self) -> usize {
        self.buffer.len()
    }
    
    // 清空缓冲
    pub fn clear(&mut self) {
        self.buffer.clear();
    }
}

// 防抖处理器
pub struct Debouncer {
    last_event_time: u64,
    debounce_duration: Duration,
    pending_event: Option<NetworkMessage>,
}

impl Debouncer {
    pub fn new(debounce_duration: Duration) -> Self {
        Self {
            last_event_time: 0,
            debounce_duration,
            pending_event: None,
        }
    }
    
    // 处理事件
    pub fn process_event(&mut self, event: NetworkMessage) -> Option<NetworkMessage> {
        let current_time = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        let time_since_last = current_time - self.last_event_time;
        
        if time_since_last < self.debounce_duration.as_millis() as u64 {
            // 在防抖时间内，暂存事件
            self.pending_event = Some(event);
            None
        } else {
            // 超过防抖时间，直接返回事件
            self.last_event_time = current_time;
            self.pending_event = None;
            Some(event)
        }
    }
    
    // 检查是否有 pending 事件
    pub fn check_pending(&mut self) -> Option<NetworkMessage> {
        if self.pending_event.is_some() {
            let current_time = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            
            if current_time - self.last_event_time >= self.debounce_duration.as_millis() as u64 {
                let event = self.pending_event.take();
                self.last_event_time = current_time;
                event
            } else {
                None
            }
        } else {
            None
        }
    }
}

// 平滑处理器
pub struct Smoother {
    event_history: VecDeque<(u64, NetworkMessage)>, // (timestamp, event)
    window_size: usize,
    smooth_factor: f64,
}

impl Smoother {
    pub fn new(window_size: usize, smooth_factor: f64) -> Self {
        Self {
            event_history: VecDeque::with_capacity(window_size),
            window_size,
            smooth_factor,
        }
    }
    
    // 添加事件到历史
    pub fn add_event(&mut self, event: NetworkMessage) {
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        if self.event_history.len() >= self.window_size {
            self.event_history.pop_front();
        }
        
        self.event_history.push_back((timestamp, event));
    }
    
    // 平滑处理事件
    pub fn smooth(&self) -> Option<NetworkMessage> {
        if self.event_history.len() < 2 {
            return self.event_history.back().map(|(_, event)| event.clone());
        }
        
        // 简单的移动平均平滑
        // 这里可以根据需要实现更复杂的平滑算法
        self.event_history.back().map(|(_, event)| event.clone())
    }
}
