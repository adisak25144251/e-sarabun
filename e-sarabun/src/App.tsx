// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Send,
  Files,
  Users,
  Bell,
  Plus,
  Camera,
  X,
  Menu,
  Moon,
  LogOut,
  Clock,
  Trash2,
  Save,
  Eye,
  FileBarChart,
  Settings,
  RefreshCw,
  FileText,
  Download,
  Printer
} from 'lucide-react';

// --- Types & Interfaces ---

type Role = 'ADMIN' | 'STAFF' | 'BOSS' | 'VIEWER';
type DocType = 'INBOX' | 'OUTBOX';
type DocStatus = 'PENDING' | 'IN_PROCESS' | 'COMPLETED' | 'RETURNED';
type Priority = 'NORMAL' | 'URGENT' | 'VERY_URGENT';

interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
  department: string;
}

interface Attachment {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE';
  url: string;
}

interface Document {
  id: string;
  registerNo: string;
  docNo: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  type: DocType;
  status: DocStatus;
  priority: Priority;
  category: string;
  owner: string;
  attachments: Attachment[];
  tags: string[];
}

interface SystemConfig {
  orgName: string;
  fiscalYear: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

// --- Mock Data & Constants ---

const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'adisak boonprajak',          // <<< เปลี่ยนตรงนี้
    username: 'adisak',
    password: '4152',
    role: 'ADMIN',
    department: 'งานยานพาหนะและขนส่ง',
  },
  {
    id: 'u2',
    name: 'วิภาดา สู้งาน',
    username: 'staff',
    password: '1234',
    role: 'STAFF',
    department: 'กองสารบรรณ',
  },
];


const MOCK_DOCS: Document[] = [
  {
    id: 'd1',
    registerNo: 'รับ-001/2567',
    docNo: 'ศธ 0201/1234',
    subject: 'ขอเชิญประชุมวางแผนยุทธศาสตร์ประจำปี 2567',
    from: 'กระทรวงศึกษาธิการ',
    to: 'สำนักงานปลัด',
    date: '2023-10-25',
    type: 'INBOX',
    status: 'PENDING',
    priority: 'URGENT',
    category: 'การประชุม',
    owner: 'วิภาดา สู้งาน',
    attachments: [],
    tags: ['ยุทธศาสตร์', 'ประชุม']
  },
  {
    id: 'd2',
    registerNo: 'รับ-002/2567',
    docNo: 'กค 0402/5678',
    subject: 'แจ้งมาตรการเร่งรัดการเบิกจ่ายงบประมาณ',
    from: 'กรมบัญชีกลาง',
    to: 'ทุกส่วนราชการ',
    date: '2023-10-26',
    type: 'INBOX',
    status: 'IN_PROCESS',
    priority: 'NORMAL',
    category: 'การเงิน',
    owner: 'สมชาย รักชาติ',
    attachments: [{ id: 'a1', name: 'scan_001.pdf', type: 'PDF', url: '#' }],
    tags: ['งบประมาณ']
  },
  {
    id: 'd3',
    registerNo: 'ส่ง-001/2567',
    docNo: 'สป 0100/001',
    subject: 'รายงานผลการดำเนินงานประจำไตรมาสที่ 1',
    from: 'สำนักงานปลัด',
    to: 'สำนักงบประมาณ',
    date: '2023-10-27',
    type: 'OUTBOX',
    status: 'COMPLETED',
    priority: 'NORMAL',
    category: 'รายงาน',
    owner: 'สมชาย รักชาติ',
    attachments: [],
    tags: ['รายงานผล']
  }
];

const INITIAL_CATEGORIES = ['การเงิน', 'การประชุม', 'พัสดุ', 'บุคคล', 'รายงาน', 'ทั่วไป'];
const DEPARTMENTS = ['สำนักปลัด', 'กองสารบรรณ', 'กองคลัง', 'กองแผนงาน', 'ศูนย์เทคโนโลยีสารสนเทศ'];

// --- Components ---

const StatusBadge = ({ status }: { status: DocStatus }) => {
  const styles: Record<DocStatus, string> = {
    PENDING: 'bg-accent-100 text-accent-800 border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700',
    IN_PROCESS: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    RETURNED: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  };

  const labels: Record<DocStatus, string> = {
    PENDING: 'รอดำเนินการ',
    IN_PROCESS: 'กำลังดำเนินการ',
    COMPLETED: 'ดำเนินการแล้ว',
    RETURNED: 'ส่งคืน/แก้ไข',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shadow-sm ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// --- Webcam Scanner Modal ---
const WebcamScanner = ({
  isOpen,
  onClose,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งาน");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImages([]);
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImages(prev => [...prev, dataUrl]);
      }
    }
  };

  const handleSave = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const mockFile = new File(["mock content"], `scan_${Date.now()}.pdf`, { type: "application/pdf" });
      onSave(mockFile);
      setIsProcessing(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-accent-500/50">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-sarabun-900 text-white">
          <h3 className="text-lg font-bold flex items-center gap-2 text-accent-400">
            <Camera className="w-5 h-5" /> สแกนเอกสาร
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 bg-black relative flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                onClick={capture}
                className="w-16 h-16 bg-white rounded-full border-4 border-slate-300 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                type="button"
              >
                <div className="w-12 h-12 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
          <div className="w-full lg:w-64 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="p-3 font-bold text-sm text-slate-700 dark:text-slate-300">รูปที่ถ่าย ({capturedImages.length})</div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} alt={`scan-${idx}`} className="w-full rounded border border-slate-300 dark:border-slate-600" />
                  <button
                    onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    type="button"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3">
              <button
                onClick={handleSave}
                disabled={capturedImages.length === 0 || isProcessing}
                className="w-full py-2 bg-sarabun-800 hover:bg-sarabun-700 text-white rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed border border-accent-500"
                type="button"
              >
                {isProcessing ? 'กำลังประมวลผล...' : 'บันทึก PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Document Detail Drawer ---

const DocDetailDrawer = ({
  doc,
  onClose
}: {
  doc: Document | null;
  onClose: () => void;
}) => {
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm no-print">
      <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-[slideIn_0.25s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-sarabun-900 text-white">
          <div>
            <p className="text-xs text-accent-300 tracking-wide uppercase">
              {doc.type === 'INBOX' ? 'ทะเบียนหนังสือรับ' : 'ทะเบียนหนังสือส่ง'}
            </p>
            <h3 className="text-lg font-bold mt-1 line-clamp-2">{doc.subject}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">เลขทะเบียน</p>
              <p className="font-semibold text-sarabun-900 dark:text-white">
                {doc.registerNo}
              </p>
            </div>
            <div>
              <p className="text-slate-500">เลขที่หนังสือ</p>
              <p className="font-semibold text-sarabun-900 dark:text-white">
                {doc.docNo || '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">จาก</p>
              <p className="font-semibold text-sarabun-900 dark:text-white">
                {doc.from || '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">ถึง</p>
              <p className="font-semibold text-sarabun-900 dark:text-white">
                {doc.to || '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">วันที่</p>
              <p className="font-semibold text-sarabun-900 dark:text-white">
                {doc.date}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={doc.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">หมวดหมู่</p>
              <p className="font-semibold text-sarabun-900 dark:text-white">
                {doc.category || '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">ผู้รับผิดชอบ</p>
              <p className="font-semibold text-sarabun-900 dark:text-white">
                {doc.owner || '-'}
              </p>
            </div>
          </div>

          {doc.attachments.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm font-bold mb-2 text-sarabun-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sarabun-600" />
                เอกสารแนบ
              </p>
              <div className="space-y-2">
                {doc.attachments.map((a) => (
                  <button
                    key={a.id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm hover:border-accent-500 hover:bg-accent-50/40 transition-colors"
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sarabun-600" />
                      {a.name}
                    </span>
                    <Download className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            type="button"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Toast ---

const Toast = ({ toast }: { toast: ToastState | null }) => {
  if (!toast) return null;
  const base =
    toast.type === 'success'
      ? 'bg-emerald-600 border-emerald-400'
      : 'bg-red-600 border-red-400';

  return (
    <div className="fixed bottom-6 right-6 z-50 no-print">
      <div className={`px-4 py-3 rounded-lg shadow-lg text-white border ${base} flex items-center gap-2`}>
        <span className="text-sm font-semibold">{toast.message}</span>
      </div>
    </div>
  );
};

// --- Main Application ---

export default function App() {
  // --- Global State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Registration Form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState(DEPARTMENTS[0]);

  // System Config
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('esarabun_config') ||
          JSON.stringify({ orgName: 'ระบบสารบรรณกลาง', fiscalYear: '2567' })
      );
    } catch {
      return { orgName: 'ระบบสารบรรณกลาง', fiscalYear: '2567' };
    }
  });

  // Data Persistence
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('esarabun_users') || JSON.stringify(MOCK_USERS)
      );
    } catch {
      return MOCK_USERS;
    }
  });
  const [docs, setDocs] = useState<Document[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('esarabun_docs') || JSON.stringify(MOCK_DOCS)
      );
    } catch {
      return MOCK_DOCS;
    }
  });
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('esarabun_cats') ||
          JSON.stringify(INITIAL_CATEGORIES)
      );
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  // UI State
  const [currentView, setCurrentView] = useState<
    'dashboard' | 'inbox' | 'outbox' | 'reports' | 'users' | 'settings' | 'create' | 'categories'
  >('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // New UI State: filters + selection + toast
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Effects
  useEffect(() => {
    localStorage.setItem('esarabun_users', JSON.stringify(allUsers));
  }, [allUsers]);
  useEffect(() => {
    localStorage.setItem('esarabun_docs', JSON.stringify(docs));
  }, [docs]);
  useEffect(() => {
    localStorage.setItem('esarabun_cats', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem('esarabun_config', JSON.stringify(systemConfig));
  }, [systemConfig]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Auth Logic
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const found = allUsers.find(
      u =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password.trim()
    );
    if (found) {
      setUser(found);
      setIsAuthenticated(true);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } else {
      setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (allUsers.find(u => u.username.toLowerCase() === regUsername.toLowerCase())) {
      setError('ชื่อผู้ใช้งานนี้มีอยู่แล้ว');
      return;
    }
    const newUser: User = {
      id: `u${Date.now()}`,
      name: regName,
      username: regUsername,
      password: regPassword,
      role: 'STAFF',
      department: regDepartment
    };
    setAllUsers([...allUsers, newUser]);
    setUser(newUser);
    setIsAuthenticated(true);
    showToast('ลงทะเบียนผู้ใช้ใหม่เรียบร้อยแล้ว', 'success');
  };

  const handleCreateDoc = (doc: Document) => {
    setDocs([doc, ...docs]);
    setCurrentView(doc.type === 'INBOX' ? 'inbox' : 'outbox');
    showToast('บันทึกทะเบียนหนังสือเรียบร้อยแล้ว', 'success');
  };

  // --- Views ---

  const DashboardView = () => {
    const inbox = docs.filter(d => d.type === 'INBOX').length;
    const outbox = docs.filter(d => d.type === 'OUTBOX').length;
    const pending = docs.filter(d => d.status === 'PENDING').length;

    return (
      <div className="space-y-6 w-full">
        <h2 className="text-2xl font-bold text-sarabun-900 dark:text-accent-400 border-b-2 border-accent-500 pb-2 inline-block">
          ภาพรวมสถานะการดำเนินงาน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-sarabun-800 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                หนังสือรับทั้งหมด
              </p>
              <h3 className="text-5xl font-bold text-sarabun-900 dark:text-white mt-2">
                {inbox}
              </h3>
            </div>
            <div className="p-4 bg-sarabun-50 dark:bg-slate-700 rounded-full text-sarabun-800 dark:text-sarabun-200 group-hover:scale-110 transition-transform">
              <Inbox className="w-8 h-8" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-accent-500 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                หนังสือส่งทั้งหมด
              </p>
              <h3 className="text-5xl font-bold text-sarabun-900 dark:text-white mt-2">
                {outbox}
              </h3>
            </div>
            <div className="p-4 bg-accent-50 dark:bg-slate-700 rounded-full text-accent-600 dark:text-accent-400 group-hover:scale-110 transition-transform">
              <Send className="w-8 h-8" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-red-500 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                งานค้างดำเนินการ
              </p>
              <h3 className="text-5xl font-bold text-sarabun-900 dark:text-white mt-2">
                {pending}
              </h3>
            </div>
            <div className="p-4 bg-red-50 dark:bg-slate-700 rounded-full text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <Clock className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-sarabun-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sarabun-900 dark:text-white flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-sarabun-700" />
              การเคลื่อนไหวล่าสุด
            </h3>
            <button
              className="text-sm text-sarabun-700 font-bold hover:underline"
              type="button"
              onClick={() => setCurrentView('inbox')}
            >
              ดูทั้งหมด
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {docs.slice(0, 5).map(doc => (
              <div
                key={doc.id}
                className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                onClick={() => setSelectedDoc(doc)}
              >
                <div
                  className={`p-2 rounded-full ${
                    doc.type === 'INBOX'
                      ? 'bg-sarabun-100 text-sarabun-800'
                      : 'bg-accent-100 text-accent-800'
                  }`}
                >
                  {doc.type === 'INBOX' ? (
                    <Inbox className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-slate-800 dark:text-white truncate">
                    {doc.subject}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {doc.registerNo} • {doc.date}
                  </p>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const CreateDocView = () => {
    const [form, setForm] = useState<Partial<Document>>({
      type: 'INBOX',
      priority: 'NORMAL',
      status: 'PENDING',
      category: categories[0],
      date: new Date().toISOString().split('T')[0],
      tags: []
    });
    const [atts, setAtts] = useState<Attachment[]>([]);
    const [scanOpen, setScanOpen] = useState(false);

    return (
      <div className="w-full">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-sarabun-900 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-accent-400" /> ลงทะเบียนหนังสือใหม่
            </h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!user) return;
              handleCreateDoc({
                id: `d${Date.now()}`,
                registerNo: form.registerNo!,
                docNo: form.docNo || '',
                subject: form.subject!,
                from: form.from || '',
                to: form.to || '',
                date: form.date!,
                type: form.type as DocType,
                status: form.status as DocStatus,
                priority: form.priority as Priority,
                category: form.category!,
                owner: user.name,
                attachments: atts,
                tags: []
              });
            }}
            className="p-8 space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  ประเภท
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'INBOX' })}
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                      form.type === 'INBOX'
                        ? 'bg-white dark:bg-slate-600 shadow text-sarabun-900 dark:text-white border-l-4 border-sarabun-800'
                        : 'text-slate-500'
                    }`}
                  >
                    รับ
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'OUTBOX' })}
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                      form.type === 'OUTBOX'
                        ? 'bg-white dark:bg-slate-600 shadow text-sarabun-900 dark:text-white border-l-4 border-accent-500'
                        : 'text-slate-500'
                    }`}
                  >
                    ส่ง
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  ความเร่งด่วน
                </label>
                <select
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={form.priority}
                  onChange={e =>
                    setForm({ ...form, priority: e.target.value as Priority })
                  }
                >
                  <option value="NORMAL">ปกติ</option>
                  <option value="URGENT">ด่วน</option>
                  <option value="VERY_URGENT">ด่วนที่สุด</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  เลขทะเบียน
                </label>
                <input
                  required
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-sarabun-500"
                  value={form.registerNo || ''}
                  onChange={e => setForm({ ...form, registerNo: e.target.value })}
                  placeholder={`เช่น ${form.type === 'INBOX' ? 'รับ' : 'ส่ง'}-001/${systemConfig.fiscalYear}`}
                />
                <p className="text-xs text-slate-500 mt-1">
                  รูปแบบแนะนำ: {form.type === 'INBOX' ? 'รับ-เลขที่/ปีงบประมาณ' : 'ส่ง-เลขที่/ปีงบประมาณ'}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  วันที่
                </label>
                <input
                  type="date"
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  เรื่อง
                </label>
                <input
                  required
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-sarabun-500"
                  value={form.subject || ''}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  จาก
                </label>
                <input
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={form.from || ''}
                  onChange={e => setForm({ ...form, from: e.target.value })}
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  ถึง
                </label>
                <input
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={form.to || ''}
                  onChange={e => setForm({ ...form, to: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-sarabun-800 text-white rounded hover:bg-sarabun-700 transition-colors border border-accent-500"
                >
                  <Camera className="w-4 h-4" /> สแกนเอกสาร
                </button>
              </div>
              {atts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {atts.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm dark:text-white border border-slate-300"
                    >
                      <span>{a.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAtts(atts.filter((_, idx) => idx !== i))
                        }
                        className="text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="px-6 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-sarabun-800 text-white rounded font-bold hover:bg-sarabun-700 shadow-md flex items-center gap-2 border-b-4 border-sarabun-900"
              >
                <Save className="w-4 h-4 text-accent-400" /> บันทึก
              </button>
            </div>
          </form>
        </div>
        <WebcamScanner
          isOpen={scanOpen}
          onClose={() => setScanOpen(false)}
          onSave={(f) =>
            setAtts([
              ...atts,
              {
                id: `a${Date.now()}`,
                name: f.name,
                type: 'PDF',
                url: URL.createObjectURL(f)
              }
            ])
          }
        />
      </div>
    );
  };

  const ReportsView = () => {
    const handleExportCSV = () => {
      const headers = "RegisterNo,Subject,From,To,Date,Status\n";
      const rows = docs
        .map(
          d =>
            `${d.registerNo},"${d.subject.replace(/"/g, '""')}",${d.from},${d.to},${d.date},${d.status}`
        )
        .join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.csv';
      a.click();
    };

    const handleExportPDF = () => {
      alert('สร้างไฟล์ PDF (จำลอง) เรียบร้อยแล้ว');
    };
    const handlePrint = () => {
      window.print();
    };

    return (
      <div className="w-full space-y-6">
        <div className="flex justify-between items-center no-print">
          <h2 className="text-2xl font-bold text-sarabun-900 dark:text-white border-b-2 border-accent-500 pb-1">
            รายงานและสถิติ
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded font-bold hover:bg-green-800 shadow-sm"
              type="button"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded font-bold hover:bg-red-800 shadow-sm"
              type="button"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-sarabun-800 text-white rounded font-bold hover:bg-sarabun-900 shadow-sm"
              type="button"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 print-full">
          <h3 className="font-bold mb-4 dark:text-white text-lg border-l-4 border-sarabun-800 pl-2">
            สรุปรายการเอกสารล่าสุด
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-sarabun-800 text-white border-b-2 border-accent-500">
                <tr>
                  <th className="p-3 font-bold">วันที่</th>
                  <th className="p-3 font-bold">เลขทะเบียน</th>
                  <th className="p-3 font-bold">เรื่อง</th>
                  <th className="p-3 font-bold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                {docs.map(d => (
                  <tr key={d.id}>
                    <td className="p-3 dark:text-slate-300">{d.date}</td>
                    <td className="p-3 dark:text-slate-300 font-semibold">
                      {d.registerNo}
                    </td>
                    <td className="p-3 dark:text-slate-300 max-w-xs truncate">
                      {d.subject}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const CategoriesView = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
      <h2 className="text-xl font-bold mb-4 dark:text-white border-l-4 border-accent-500 pl-3">
        จัดการหมวดหมู่เอกสาร
      </h2>
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 p-3 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-sarabun-400"
          placeholder="ระบุชื่อหมวดหมู่ใหม่..."
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            if (newCatName.trim()) {
              setCategories([...categories, newCatName.trim()]);
              setNewCatName('');
              showToast('เพิ่มหมวดหมู่ใหม่เรียบร้อยแล้ว', 'success');
            }
          }}
          className="px-6 bg-sarabun-800 text-white rounded font-bold hover:bg-sarabun-700 border border-accent-500"
        >
          เพิ่ม
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c, i) => (
          <div
            key={i}
            className="p-4 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 flex justify-between items-center group hover:border-sarabun-400 transition-colors shadow-sm"
          >
            <span className="dark:text-white font-medium flex items-center gap-2">
              <Files className="w-4 h-4 text-sarabun-600" /> {c}
            </span>
            <button
              type="button"
              onClick={() =>
                setCategories(categories.filter((_, idx) => idx !== i))
              }
              className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const UsersView = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
      <h2 className="text-xl font-bold mb-4 dark:text-white border-l-4 border-accent-500 pl-3">
        ผู้ใช้งานในระบบ
      </h2>
      <table className="w-full">
        <thead>
          <tr className="text-left bg-sarabun-800 text-white">
            <th className="pb-3 pl-3 pt-3 rounded-tl">ชื่อ-นามสกุล</th>
            <th className="pb-3 pt-3">แผนก</th>
            <th className="pb-3 pt-3">Username</th>
            <th className="pb-3 pt-3">สิทธิ์</th>
            <th className="pb-3 pt-3 text-right pr-3 rounded-tr">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {allUsers.map(u => (
            <tr
              key={u.id}
              className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <td className="py-3 pl-3 dark:text-slate-300 font-medium">
                {u.name}
              </td>
              <td className="py-3 dark:text-slate-300">{u.department}</td>
              <td className="py-3 dark:text-slate-400 text-sm">
                {u.username}
              </td>
              <td className="py-3">
                <span className="bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded text-xs dark:text-white border border-slate-200 dark:border-slate-500">
                  {u.role}
                </span>
              </td>
              <td className="py-3 text-right pr-3">
                {u.role !== 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() =>
                      setAllUsers(allUsers.filter(user0 => user0.id !== u.id))
                    }
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const SettingsView = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6 dark:text-white border-l-4 border-accent-500 pl-3 flex items-center gap-2">
        <Settings className="w-6 h-6 text-sarabun-600" /> ตั้งค่าระบบ
      </h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            ชื่อหน่วยงาน
          </label>
          <input
            className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-sarabun-400"
            value={systemConfig.orgName}
            onChange={e =>
              setSystemConfig({ ...systemConfig, orgName: e.target.value })
            }
          />
          <p className="text-xs text-slate-500">
            ชื่อที่จะแสดงบนแถบเมนูและหัวกระดาษรายงาน
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            ปีงบประมาณปัจจุบัน
          </label>
          <input
            className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-sarabun-400"
            value={systemConfig.fiscalYear}
            onChange={e =>
              setSystemConfig({ ...systemConfig, fiscalYear: e.target.value })
            }
          />
          <p className="text-xs text-slate-500">
            ใช้สำหรับรันเลขที่เอกสารอัตโนมัติ
          </p>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-red-600 mb-2">พื้นที่อันตราย</h3>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  'คุณแน่ใจหรือไม่ที่จะล้างข้อมูลเอกสารและผู้ใช้ทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้'
                )
              ) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> รีเซ็ตข้อมูลระบบทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );

  // --- Auth Screen ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sarabun-900 via-sarabun-800 to-slate-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl relative overflow-hidden border-t-8 border-accent-500">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-sarabun-50 dark:bg-sarabun-900/50 rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner border-4 border-sarabun-100 dark:border-sarabun-800">
  <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center text-white shadow-lg text-3xl">
    🏛
  </div>
</div>

            <h1 className="text-2xl font-bold text-sarabun-900 dark:text-white">
              {systemConfig.orgName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              ระบบงานสารบรรณอิเล็กทรอนิกส์
            </p>
          </div>

          <div className="flex mb-6 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              className={`flex-1 pb-3 font-bold transition-all ${
                !isRegistering
                  ? 'text-sarabun-800 dark:text-accent-400 border-b-4 border-accent-500'
                  : 'text-slate-400'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError('');
              }}
              className={`flex-1 pb-3 font-bold transition-all ${
                isRegistering
                  ? 'text-sarabun-800 dark:text-accent-400 border-b-4 border-accent-500'
                  : 'text-slate-400'
              }`}
            >
              ลงทะเบียน
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
              <Trash2 className="w-4 h-4" />
              {error}
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none"
                placeholder="ชื่อผู้ใช้งาน"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <input
                required
                type="password"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none"
                placeholder="รหัสผ่าน"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="submit"
                className="w-full py-3 bg-sarabun-900 hover:bg-sarabun-800 text-white font-bold rounded-lg shadow-lg transition-all border-b-4 border-sarabun-950 active:border-b-0 active:translate-y-1"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none"
                placeholder="ชื่อ-นามสกุล"
                value={regName}
                onChange={e => setRegName(e.target.value)}
              />
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none"
                placeholder="ตั้งชื่อผู้ใช้งาน"
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
              />
              <input
                required
                type="password"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none"
                placeholder="ตั้งรหัสผ่าน"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
              />
              <select
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none"
                value={regDepartment}
                onChange={e => setRegDepartment(e.target.value)}
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full py-3 bg-sarabun-900 hover:bg-sarabun-800 text-white font-bold rounded-lg shadow-lg transition-all border-b-4 border-sarabun-950 active:border-b-0 active:translate-y-1"
              >
                สมัครสมาชิก
              </button>
            </form>
          )}
        </div>
        <Toast toast={toast} />
      </div>
    );
  }

  // --- Main Layout ---

  // Pre-compute filtered docs for inbox/outbox view
  const docsForCurrentType = docs.filter(
    d => d.type === (currentView === 'inbox' ? 'INBOX' : 'OUTBOX')
  );
  const filteredDocs = docsForCurrentType
    .filter(d => {
      const keyword = search.trim().toLowerCase();
      if (!keyword) return true;
      return (
        d.registerNo.toLowerCase().includes(keyword) ||
        d.docNo.toLowerCase().includes(keyword) ||
        d.subject.toLowerCase().includes(keyword) ||
        d.from.toLowerCase().includes(keyword)
      );
    })
    .filter(d => (statusFilter === 'ALL' ? true : d.status === statusFilter))
    .filter(d =>
      priorityFilter === 'ALL' ? true : d.priority === priorityFilter
    );

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors ${
        isDarkMode ? 'dark' : ''
      }`}
    >
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 w-72 lg:w-80 bg-gradient-to-b from-sarabun-900 to-sarabun-800 text-white transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl flex flex-col no-print`}>
        <div className="p-6 border-b border-sarabun-950 flex items-center gap-3 bg-sarabun-950/30">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-accent-400">
            <span className="text-2xl">🏛</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-accent-400">
              {systemConfig.orgName}
            </h1>
            <p className="text-xs text-sarabun-200">ระบบสารบรรณกลาง</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'dashboard'
                ? 'bg-white/10 border-l-4 border-accent-400 text-white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> ภาพรวมระบบ
          </button>
          <div className="pt-4 pb-2 px-4 text-xs font-bold text-accent-500 uppercase tracking-wider">
            งานสารบรรณ
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('inbox')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'inbox'
                ? 'bg-white/10 border-l-4 border-accent-400 text-white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <Inbox className="w-5 h-5" /> ทะเบียนหนังสือรับ
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('outbox')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'outbox'
                ? 'bg-white/10 border-l-4 border-accent-400 text-white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <Send className="w-5 h-5" /> ทะเบียนหนังสือส่ง
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-bold text-accent-500 uppercase tracking-wider">
            การบริหาร
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'reports'
                ? 'bg-white/10 border-l-4 border-accent-400 text-white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <FileBarChart className="w-5 h-5" /> รายงานสรุป
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'users'
                ? 'bg-white/10 border-l-4 border-accent-400 text-white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <Users className="w-5 h-5" /> ผู้ใช้งาน
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'categories'
                ? 'bg-white/10 border-l-4 border-accent-400 text-white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <Files className="w-5 h-5" /> หมวดหมู่เอกสาร
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'settings'
                ? 'bg-white/10 border-l-4 border-accent-400 text-white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <Settings className="w-5 h-5" /> ตั้งค่าระบบ
          </button>
        </nav>
        <div className="p-4 border-t border-sarabun-950 bg-sarabun-950/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent-500 flex items-center justify-center font-bold text-sarabun-900 shadow-lg border-2 border-white">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate text-white">
                {user?.name}
              </p>
              <p className="text-xs text-sarabun-300 truncate">
                {user?.department}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="w-full py-2 bg-sarabun-800 hover:bg-red-900/80 text-xs rounded transition-colors flex items-center justify-center gap-2 text-red-200 border border-sarabun-700"
          >
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="lg:ml-80 min-h-screen flex flex-col transition-all duration-300 w-full">
        <header className="h-20 bg-white dark:bg-slate-800 border-b-4 border-accent-500 sticky top-0 z-20 px-8 flex items-center justify-between no-print shadow-md">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2"
            >
              <Menu className="w-6 h-6 dark:text-white" />
            </button>
            <h2 className="text-2xl font-bold text-sarabun-900 dark:text-white hidden md:block">
              {currentView === 'dashboard' && 'ภาพรวมระบบ'}
              {currentView === 'inbox' && 'ทะเบียนหนังสือรับ'}
              {currentView === 'outbox' && 'ทะเบียนหนังสือส่ง'}
              {currentView === 'categories' && 'หมวดหมู่เอกสาร'}
              {currentView === 'users' && 'ผู้ใช้งาน'}
              {currentView === 'reports' && 'รายงาน'}
              {currentView === 'settings' && 'ตั้งค่าระบบ'}
              {currentView === 'create' && 'สร้างเอกสารใหม่'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-sarabun-600 dark:text-sarabun-300"
            >
              <Moon className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 relative text-sarabun-600 dark:text-sarabun-300"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
            </button>
          </div>
        </header>

        <div className="p-8 lg:p-10 flex-1 w-full max-w-none bg-slate-50 dark:bg-slate-900">
          {currentView === 'dashboard' && <DashboardView />}
          {(currentView === 'inbox' || currentView === 'outbox') && (
            <div className="w-full h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-sarabun-900 dark:text-white border-l-8 border-sarabun-900 pl-4">
                  {currentView === 'inbox'
                    ? 'ทะเบียนหนังสือรับ'
                    : 'ทะเบียนหนังสือส่ง'}
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentView('create')}
                  className="px-6 py-2.5 bg-sarabun-900 text-white rounded font-bold hover:bg-sarabun-800 flex items-center gap-2 shadow-lg border-b-4 border-sarabun-950 active:translate-y-1 active:border-b-0"
                >
                  <Plus className="w-5 h-5 text-accent-400" /> สร้างหนังสือใหม่
                </button>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex-1">
                <div className="flex flex-wrap gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <input
                    placeholder="ค้นหา: เลขทะเบียน / เลขที่หนังสือ / เรื่อง / จาก..."
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border dark:bg-slate-800 dark:border-slate-600 dark:text-white text-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <select
                    className="px-3 py-2 rounded-lg border dark:bg-slate-800 dark:border-slate-600 dark:text-white text-sm"
                    value={statusFilter}
                    onChange={e =>
                      setStatusFilter(e.target.value as 'ALL' | DocStatus)
                    }
                  >
                    <option value="ALL">สถานะทั้งหมด</option>
                    <option value="PENDING">รอดำเนินการ</option>
                    <option value="IN_PROCESS">กำลังดำเนินการ</option>
                    <option value="COMPLETED">ดำเนินการแล้ว</option>
                    <option value="RETURNED">ส่งคืน/แก้ไข</option>
                  </select>
                  <select
                    className="px-3 py-2 rounded-lg border dark:bg-slate-800 dark:border-slate-600 dark:text-white text-sm"
                    value={priorityFilter}
                    onChange={e =>
                      setPriorityFilter(
                        e.target.value as 'ALL' | Priority
                      )
                    }
                  >
                    <option value="ALL">ทุกระดับความเร่งด่วน</option>
                    <option value="NORMAL">ปกติ</option>
                    <option value="URGENT">ด่วน</option>
                    <option value="VERY_URGENT">ด่วนที่สุด</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-sarabun-900 text-white border-b-4 border-accent-500">
                      <tr>
                        <th className="p-4 font-bold w-20 text-center">ประเภท</th>
                        <th className="p-4 font-bold">เลขทะเบียน</th>
                        <th className="p-4 font-bold w-1/3">เรื่อง</th>
                        <th className="p-4 font-bold">จาก</th>
                        <th className="p-4 font-bold">วันที่</th>
                        <th className="p-4 font-bold">สถานะ</th>
                        <th className="p-4 font-bold text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
                      {filteredDocs.map(d => (
                        <tr
                          key={d.id}
                          className="hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="p-4 text-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto shadow-sm ${
                                d.type === 'INBOX'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {d.type === 'INBOX' ? (
                                <Inbox className="w-5 h-5" />
                              ) : (
                                <Send className="w-5 h-5" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-sarabun-800 dark:text-white">
                            {d.registerNo}
                          </td>
                          <td className="p-4 dark:text-slate-300 font-medium">
                            {d.subject}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                            {d.from}
                          </td>
                          <td className="p-4 text-slate-500">{d.date}</td>
                          <td className="p-4">
                            <StatusBadge status={d.status} />
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              className="p-2 text-slate-400 hover:text-sarabun-600 hover:bg-slate-100 rounded-full transition-all"
                              onClick={() => setSelectedDoc(d)}
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredDocs.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm"
                          >
                            ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {currentView === 'create' && <CreateDocView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'categories' && <CategoriesView />}
          {currentView === 'users' && <UsersView />}
          {currentView === 'settings' && <SettingsView />}
        </div>
      </main>

      <DocDetailDrawer
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
      <Toast toast={toast} />
    </div>
  );
}
