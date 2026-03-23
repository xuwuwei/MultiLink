use std::net::TcpListener;

/// 从起始端口开始查找可用端口
pub fn find_available_port(start_port: u16) -> Option<u16> {
    let mut port = start_port;

    while port < u16::MAX {
        if is_port_available(port) {
            return Some(port);
        }
        port += 1;
    }

    None
}

/// 检查端口是否可用
fn is_port_available(port: u16) -> bool {
    TcpListener::bind(("0.0.0.0", port)).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_port_available() {
        // 应该能找到可用端口
        let port = find_available_port(8333);
        assert!(port.is_some());
        assert!(port.unwrap() >= 8333);
    }
}
