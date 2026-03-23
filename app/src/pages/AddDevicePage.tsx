import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { X, Camera, Loader2, Check, AlertCircle, Globe, Plus, ChevronDown, History } from 'lucide-react';
import { Device, createDevice, testConnection, getIpHistory, addToIpHistory, IpHistoryItem } from '../services/deviceService';
import { connectionService } from '../services/connectionService';
import { StorageService } from '../services/platformService';
import { translations, Language } from '../i18n';
import { KeyboardTheme } from '../components/Keyboard';
import { Modal } from '../components/Modal';

interface AddDevicePageProps {
  lang: Language;
  theme: KeyboardTheme;
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  setActiveDeviceId: (id: string) => void;
}

export const AddDevicePage: React.FC<AddDevicePageProps> = ({ lang, theme, devices, setDevices, setActiveDeviceId }) => {
  const navigate = useNavigate();
  const [newDeviceIp, setNewDeviceIp] = useState('');
  const [newDevicePort, setNewDevicePort] = useState('8333');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [ipHistory, setIpHistory] = useState<IpHistoryItem[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = translations[lang] || translations['en'];

  // 加载历史IP
  useEffect(() => {
    setIpHistory(getIpHistory());
  }, []);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectFromHistory = (item: IpHistoryItem) => {
    setNewDeviceIp(item.ip);
    setNewDevicePort(item.port);
    setShowHistoryDropdown(false);
    setTestResult(null);
  };

  useEffect(() => {
    const scannedData = StorageService.getItem('scanned_device_data');
    if (scannedData) {
      try {
        const { ip, port } = JSON.parse(scannedData);
        if (ip) setNewDeviceIp(ip);
        if (port) setNewDevicePort(port);
        StorageService.removeItem('scanned_device_data');
        if (ip) {
          handleTestConnection(ip, port || '8333');
        }
      } catch (err) {
        console.error('Failed to parse scanned data:', err);
      }
    }
  }, []);

  const handleTestConnection = async (ipToTest = newDeviceIp, portToTest = newDevicePort) => {
    if (!ipToTest) return;

    setIsTestingConnection(true);
    setTestResult(null);

    const success = await testConnection(ipToTest, portToTest);
    setTestResult(success ? 'success' : 'error');
    setIsTestingConnection(false);
  };

  const handleAddDevice = async () => {
    if (testResult !== 'success' || !newDeviceIp) return;

    const portNum = parseInt(newDevicePort, 10) || 8333;

    // 检查设备是否已存在（注意：d.port 是字符串，需要比较字符串值）
    const existingDevice = devices.find(d => d.ip === newDeviceIp && d.port === newDevicePort);
    if (existingDevice) {
      // 设备已存在，激活它并连接
      connectionService.setActive(existingDevice.id);
      setActiveDeviceId(existingDevice.id);
      await connectionService.connect(existingDevice.id, newDeviceIp, portNum);
      navigate('/');
      return;
    }

    // 保存到历史记录
    addToIpHistory(newDeviceIp, newDevicePort);

    // 设备不存在，创建新设备
    const name = `Device ${devices.length + 1}`;
    const newDevice = createDevice(name, newDeviceIp, newDevicePort);

    // 先添加设备，再连接并设为活跃
    setDevices(prev => [...prev, newDevice]);

    const result = await connectionService.connect(newDevice.id, newDeviceIp, portNum);
    if (result.success) {
      connectionService.setActive(newDevice.id);
      setActiveDeviceId(newDevice.id);
    }

    navigate('/');
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => navigate('/')}
      title={t.addNewDevice || 'Add New Device'}
      theme={theme}
    >
      <div className="flex flex-col gap-[1.5rem]">
        <div className="flex flex-col gap-[1rem]">
          <button
            onClick={() => navigate('/scan-qr')}
            className={`w-full p-[1rem] rounded-[1.2rem] border transition-all flex items-center justify-center gap-[0.8rem] font-bold text-[0.9rem] ${
              theme === 'minimal' || theme === 'retro'
                ? 'bg-black text-white border-black hover:bg-black/90'
                : theme === 'pink'
                ? 'bg-[#ec4899] text-white border-[#ec4899] hover:bg-[#db2777]'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            <Camera size={20} />
            {t.scanQrCode || 'Scan QR Code'}
          </button>

          <div className="flex items-center gap-[1rem] opacity-20">
            <div className="flex-grow h-[1px] bg-current" />
            <span className="text-[0.7rem] uppercase tracking-widest font-bold">OR</span>
            <div className="flex-grow h-[1px] bg-current" />
          </div>

          <div className="flex flex-col gap-[0.4rem]" ref={dropdownRef}>
            <label className="text-[0.8rem] font-bold uppercase tracking-wider opacity-50 ml-[0.5rem]">
              {t.deviceIp || 'IP Address'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={newDeviceIp}
                onChange={(e) => { setNewDeviceIp(e.target.value); setTestResult(null); }}
                placeholder="192.168.1.100"
                className={`w-full p-[1rem] pr-[3rem] rounded-[1.2rem] border transition-all outline-none text-[1rem] ${
                  theme === 'minimal' || theme === 'retro' || theme === 'pink'
                    ? 'bg-black/5 border-black/10 focus:border-black/30 text-black'
                    : 'bg-white/5 border-white/10 focus:border-white/30 text-white'
                }`}
              />
              {ipHistory.length > 0 && (
                <button
                  onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                  className={`absolute right-[0.5rem] top-1/2 -translate-y-1/2 p-[0.5rem] rounded-full transition-colors ${
                    theme === 'minimal' || theme === 'retro' || theme === 'pink'
                      ? 'hover:bg-black/10 text-black/50'
                      : 'hover:bg-white/10 text-white/50'
                  }`}
                  title="History"
                >
                  <History size={18} />
                </button>
              )}

              {/* 历史记录下拉框 */}
              <AnimatePresence>
                {showHistoryDropdown && ipHistory.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute top-full left-0 right-0 mt-[0.5rem] rounded-[1rem] border overflow-hidden z-10 ${
                      theme === 'minimal' || theme === 'retro' || theme === 'pink'
                        ? 'bg-white border-black/10 shadow-lg'
                        : 'bg-black/90 border-white/10 shadow-xl'
                    }`}
                  >
                    <div className={`px-[1rem] py-[0.5rem] text-[0.7rem] uppercase tracking-wider border-b ${
                      theme === 'minimal' || theme === 'retro' || theme === 'pink'
                        ? 'text-black/50 border-black/10'
                        : 'text-white/50 border-white/10'
                    }`}>
                      Recent Connections
                    </div>
                    {ipHistory.map((item, index) => (
                      <button
                        key={`${item.ip}:${item.port}`}
                        onClick={() => selectFromHistory(item)}
                        className={`w-full px-[1rem] py-[0.8rem] text-left flex items-center justify-between transition-colors ${
                          theme === 'minimal' || theme === 'retro' || theme === 'pink'
                            ? 'hover:bg-black/5 text-black'
                            : 'hover:bg-white/10 text-white'
                        } ${index !== ipHistory.length - 1 ? (theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'border-b border-black/5' : 'border-b border-white/5') : ''}`}
                      >
                        <span className="font-mono text-[0.9rem]">{item.ip}:{item.port}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold uppercase tracking-wider opacity-50 ml-[0.5rem]">
              {t.devicePort || 'Port (TCP)'}
            </label>
            <input 
              type="text" 
              value={newDevicePort}
              onChange={(e) => { setNewDevicePort(e.target.value); setTestResult(null); }}
              placeholder="8333"
              className={`w-full p-[1rem] rounded-[1.2rem] border transition-all outline-none text-[1rem] ${
                theme === 'minimal' || theme === 'retro' || theme === 'pink'
                  ? 'bg-black/5 border-black/10 focus:border-black/30 text-black'
                  : 'bg-white/5 border-white/10 focus:border-white/30 text-white'
              }`}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {testResult && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-[1rem] rounded-[1.2rem] flex items-center gap-[0.8rem] border ${
                testResult === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}
            >
              {testResult === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              <span className="text-[0.9rem] font-medium">
                {testResult === 'success' ? (t.connectionSuccess || 'Connection Successful!') : (t.connectionError || 'Connection Failed.')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-[0.8rem]">
          <button 
            onClick={() => handleTestConnection()}
            disabled={!newDeviceIp || isTestingConnection}
            className={`py-[1rem] rounded-[1.2rem] font-bold transition-all flex items-center justify-center gap-[0.6rem] ${
              !newDeviceIp || isTestingConnection ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
            } ${
              theme === 'minimal' || theme === 'retro' || theme === 'pink' ? 'bg-black/5 text-black' : 'bg-white/10 text-white'
            }`}
          >
            {isTestingConnection ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Globe size={18} />
                <span>{t.test || 'Test'}</span>
              </>
            )}
          </button>

          <button 
            onClick={handleAddDevice}
            disabled={!newDeviceIp || testResult !== 'success'}
            className={`py-[1rem] rounded-[1.2rem] font-bold transition-all flex items-center justify-center gap-[0.6rem] shadow-lg ${
              !newDeviceIp || testResult !== 'success'
                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 active:scale-[0.98]'
            }`}
          >
            <Plus size={20} />
            <span>{t.add || 'Add'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
