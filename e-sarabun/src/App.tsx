// src/App.tsx
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  Printer,
  Brain,
} from 'lucide-react';

import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import autoTable from 'jspdf-autotable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

// TODO: เปลี่ยนเป็น Web App URL จาก Google Apps Script ของคุณเอง
const GOOGLE_SHEET_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbyKy0IOBQVnmw_mgR_fKtohre2jMu1cR_awm2VgUAGoA8epqndWIZIwB7CphxvjU23Hjw/exec';

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
// ✅ เพิ่มตรงนี้
interface NotificationItem {
  id: string;
  createdAt: string; // ข้อความวันเวลา
  subject: string;
  from: string;
  to: string;
  type: DocType;
  owner: string; // ผู้บันทึก (เจ้าของเอกสาร)
}
// --- Mock Data & Constants ---

const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'adisak boonprajak', // เปลี่ยนชื่อเป็น admin (สิทธิ์ ADMIN)
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
    registerNo: 'รับ-001/2568',
    docNo: 'ที่ 0030.735/1234',
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
    tags: ['ยุทธศาสตร์', 'ประชุม'],
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
    tags: ['งบประมาณ'],
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
    tags: ['รายงานผล'],
  },
];

const INITIAL_CATEGORIES = [
  'งานสารบัญ',
  'งานการเงินและสวัสดิการ',
  'งานควบคุมยานพาหนะ',
  'งานแผนและนโยบาย',
  'งานซ่อมและซื้อวัสดุ',
  'งานพลขับ',
];
const DEPARTMENTS = [
  'สง.ผบช.ตชด.',
  'สง.ผบก.สสน.บช.ตชด.',
  'สง.ผบก.อก.บช.ตชด.',
  'ฝอ.1 บก.อก.บช.ตชด.',
  'ฝอ.2 บก.อก.บช.ตชด.',
  'ฝอ.3 บก.อก.บช.ตชด.',
  'ฝอ.4 บก.อก.บช.ตชด.',
  'ฝอ.5 บก.อก.บช.ตชด.',
  'ฝอ.6 บก.อก.บช.ตชด.',
  'ฝอ.7 บก.อก.บช.ตชด.',
  'ฝอ.8 บก.อก.บช.ตชด.',
  'ฝสสน.1 บก.สสน.บช.ตชด.',
  'ฝสสน.2 บก.สสน.บช.ตชด.',
  'ฝสสน.3 บก.สสน.บช.ตชด.',
  'ฝสสน.4 บก.สสน.บช.ตชด.',
  'ฝสสน.5 บก.สสน.บช.ตชด.',
  'บก.ตชด.ภาค 1',
  'บก.ตชด.ภาค 2',
  'บก.ตชด.ภาค 3',
  'บก.ตชด.ภาค 4',
  'กก.ตชด.11',
  'กก.ตชด.12',
];

// --- Components ---

const StatusBadge = ({ status }: { status: DocStatus }) => {
  const styles: Record<DocStatus, string> = {
    PENDING:
      'bg-accent-100 text-accent-800 border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700',
    IN_PROCESS:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    COMPLETED:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    RETURNED:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  };

  const labels: Record<DocStatus, string> = {
    PENDING: 'รอดำเนินการ',
    IN_PROCESS: 'กำลังดำเนินการ',
    COMPLETED: 'ดำเนินการแล้ว',
    RETURNED: 'ส่งคืน/แก้ไข',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shadow-sm ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

// --- Webcam Scanner Modal ---

const WebcamScanner = ({
  isOpen,
  onClose,
  onSave,
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งาน');
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
      const mockFile = new File(['mock content'], `scan_${Date.now()}.pdf`, {
        type: 'application/pdf',
      });
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
      <div
        className="bg-white dark:bg-slate-900 w-full h-full max-w-none rounded-none
        lg:max-w-4xl lg:h-[85vh] lg:rounded-xl shadow-2xl flex flex-col overflow-hidden
        border border-accent-500/50"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-sarabun-900 text-white">
          <h3 className="text-lg font-bold flex items-center gap-2 text-accent-400">
            <Camera className="w-5 h-5" /> สแกนเอกสาร
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 bg-black relative flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
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
            <div className="p-3 font-bold text-sm text-slate-700 dark:text-slate-300">
              รูปที่ถ่าย ({capturedImages.length})
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`scan-${idx}`}
                    className="w-full rounded border border-slate-300 dark:border-slate-600"
                  />
                  <button
                    onClick={() =>
                      setCapturedImages(prev =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
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
  onClose,
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
            <h3 className="text-lg font-bold mt-1 line-clamp-2">
              {doc.subject}
            </h3>
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
                {doc.attachments.map(a => (
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
      <div
        className={`px-4 py-3 rounded-lg shadow-lg text-white border ${base} flex items-center gap-2`}
      >
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
          JSON.stringify({ orgName: 'ระบบสารบรรณ', fiscalYear: '2567' })
      );
    } catch {
      return { orgName: 'ระบบสารบรรณ', fiscalYear: '2567' };
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
    | 'dashboard'
    | 'inbox'
    | 'outbox'
    | 'reports'
    | 'users'
    | 'settings'
    | 'create'
    | 'categories'
    | 'analysis'
  >('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [localCatName, setLocalCatName] = useState('');

  // Filters + selection + toast
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  // ✅ เพิ่มสอง state นี้
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('esarabun_notifs') || '[]'
      );
    } catch {
      return [];
    }
  });
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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
    localStorage.setItem('esarabun_notifs', JSON.stringify(notifications));
  }, [notifications]);

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

  // === Auto sync เอกสารใหม่ไป Google Sheet ทุกครั้งที่บันทึก (เฉพาะหนังสือรับ/ส่ง) ===
  const syncDocToGoogleSheet = async (doc: Document) => {
    try {
      // เผื่ออนาคตมี DocType อื่น: ปัจจุบันมีแต่ INBOX/OUTBOX อยู่แล้ว
      if (doc.type !== 'INBOX' && doc.type !== 'OUTBOX') {
        return;
      }

      await fetch(GOOGLE_SHEET_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors', // กัน CORS + preflight
        body: JSON.stringify({ docs: [doc] }),
      });

      showToast('บันทึกข้อมูลลง Google Sheet เรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('syncDocToGoogleSheet error:', err);
      showToast(
        'ไม่สามารถบันทึกลง Google Sheet ได้ กรุณาตรวจสอบการเชื่อมต่อ',
        'error'
      );
    }
  };

  // helper สำหรับกดเมนูบน sidebar แล้วซ่อนเมนูในจอเล็ก
  const handleNavClick = (
    view:
      | 'dashboard'
      | 'inbox'
      | 'outbox'
      | 'reports'
      | 'users'
      | 'settings'
      | 'create'
      | 'categories'
      | 'analysis'
  ) => {
    setCurrentView(view);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
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
    if (
      allUsers.find(
        u => u.username.toLowerCase() === regUsername.toLowerCase()
      )
    ) {
      setError('ชื่อผู้ใช้งานนี้มีอยู่แล้ว');
      return;
    }
    const newUser: User = {
      id: `u${Date.now()}`,
      name: regName,
      username: regUsername,
      password: regPassword,
      role: 'STAFF',
      department: regDepartment,
    };
    setAllUsers([...allUsers, newUser]);
    setUser(newUser);
    setIsAuthenticated(true);
    showToast('ลงทะเบียนผู้ใช้ใหม่เรียบร้อยแล้ว', 'success');
  };

  const handleCreateDoc = (doc: Document) => {
    // อัปเดต state เดิม
    setDocs(prev => [doc, ...prev]);
    setCurrentView(doc.type === 'INBOX' ? 'inbox' : 'outbox');
    showToast('บันทึกทะเบียนหนังสือเรียบร้อยแล้ว', 'success');
// ✅ เพิ่มแจ้งเตือนเข้า list
    const ts = new Date().toLocaleString('th-TH', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    setNotifications(prev => [
      {
        id: `n${Date.now()}`,
        createdAt: ts,
        subject: doc.subject,
        from: doc.from,
        to: doc.to,
        type: doc.type,
        owner: doc.owner,
      },
      ...prev,
    ]);
    // 🔁 ส่งข้อมูลเอกสารใหม่ไป Google Sheet อัตโนมัติ (เฉพาะหนังสือรับ/ส่ง)
    syncDocToGoogleSheet(doc);
  };

  // --- Views ---

  const DashboardView = () => {
    const inbox = docs.filter(d => d.type === 'INBOX').length;
    const outbox = docs.filter(d => d.type === 'OUTBOX').length;
    const pending = docs.filter(d => d.status === 'PENDING').length;

    return (
      <div className="space-y-6 w-full">
        <h2 className="text-xl sm:text-2xl font-bold text-sarabun-900 dark:text-accent-400 border-b-2 border-accent-500 pb-2 inline-block">
          ภาพรวมสถานะการดำเนินงาน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border-l-4 border-sarabun-800 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
                หนังสือรับทั้งหมด
              </p>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-sarabun-900 dark:text-white mt-2">
                {inbox}
              </h3>
            </div>
            <div className="p-3 sm:p-4 bg-sarabun-50 dark:bg-slate-700 rounded-full text-sarabun-800 dark:text-sarabun-200 group-hover:scale-110 transition-transform">
              <Inbox className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border-l-4 border-accent-500 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
                หนังสือส่งทั้งหมด
              </p>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-sarabun-900 dark:text-white mt-2">
                {outbox}
              </h3>
            </div>
            <div className="p-3 sm:p-4 bg-accent-50 dark:bg-slate-700 rounded-full text-accent-600 dark:text-accent-400 group-hover:scale-110 transition-transform">
              <Send className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border-l-4 border-red-500 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
                งานค้างดำเนินการ
              </p>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-sarabun-900 dark:text-white mt-2">
                {pending}
              </h3>
            </div>
            <div className="p-3 sm:p-4 bg-red-50 dark:bg-slate-700 rounded-full text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-sarabun-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sarabun-900 dark:text-white flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-5 h-5 text-sarabun-700" />
              การเคลื่อนไหวล่าสุด
            </h3>
            <button
              className="text-xs sm:text-sm text-sarabun-700 font-bold hover:underline"
              type="button"
              onClick={() => handleNavClick('inbox')}
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
                  <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate">
                    {doc.subject}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
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
      tags: [],
    });
    const [atts, setAtts] = useState<Attachment[]>([]);
    const [scanOpen, setScanOpen] = useState(false);

    return (
      <div className="w-full">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-sarabun-900 text-white">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-accent-400" /> ลงทะเบียนหนังสือใหม่
            </h2>
          </div>
          <form
            onSubmit={e => {
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
                tags: [],
              });
            }}
            className="p-5 sm:p-8 space-y-8"
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
                  onChange={e =>
                    setForm({ ...form, registerNo: e.target.value })
                  }
                  placeholder={`เช่น ${
                    form.type === 'INBOX' ? 'รับ' : 'ส่ง'
                  }-001/${systemConfig.fiscalYear}`}
                />
                <p className="text-xs text-slate-500 mt-1">
                  รูปแบบแนะนำ:{' '}
                  {form.type === 'INBOX'
                    ? 'รับ-เลขที่/ปีงบประมาณ'
                    : 'ส่ง-เลขที่/ปีงบประมาณ'}
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
                  onChange={e =>
                    setForm({ ...form, subject: e.target.value })
                  }
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
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-sarabun-800 text-white rounded hover:bg-sarabun-700 transition-colors border border-accent-500 text-sm"
                >
                  <Camera className="w-4 h-4" /> สแกนเอกสาร
                </button>
              </div>
              {atts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {atts.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs sm:text-sm dark:text-white border border-slate-300"
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
                className="px-4 sm:px-6 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded font-bold text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 sm:px-6 py-2 bg-sarabun-800 text-white rounded font-bold hover:bg-sarabun-700 shadow-md flex items-center gap-2 border-b-4 border-sarabun-900 text-sm"
              >
                <Save className="w-4 h-4 text-accent-400" /> บันทึก
              </button>
            </div>
          </form>
        </div>
        <WebcamScanner
          isOpen={scanOpen}
          onClose={() => setScanOpen(false)}
          onSave={f =>
            setAtts([
              ...atts,
              {
                id: `a${Date.now()}`,
                name: f.name,
                type: 'PDF',
                url: URL.createObjectURL(f),
              },
            ])
          }
        />
      </div>
    );
  };

  // --- รายงาน + กราฟ ---
  const ReportsView = () => {
    const handleExportCSV = () => {
      const headers = 'RegisterNo,Subject,From,To,Date,Status\n';
      const rows = docs
        .map(
          d =>
            `${d.registerNo},"${d.subject.replace(/"/g, '""')}",${d.from},${d.to},${d.date},${d.status}`
        )
        .join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.csv';
      a.click();
    };

    // ===================== PDF EXPORT =====================
    const handleExportPDF = () => {
      try {
        const rows = docs.map((d: any, idx: number) => [
          idx + 1,
          d.type || '',
          d.registerNo || '',
          d.docNo || '',
          d.subject || '',
          d.from || '',
          d.to || '',
          d.date || '',
          d.status || '',
          d.priority || '',
        ]);

        if (rows.length === 0) {
          alert('ยังไม่มีข้อมูลให้ export เป็น PDF');
          return;
        }

        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: 'a4',
        });

        doc.setFontSize(16);
        doc.text('รายงานสรุปทะเบียนหนังสือ', 40, 40);

        autoTable(doc, {
          head: [
            [
              'ลำดับ',
              'ประเภท',
              'เลขทะเบียน',
              'เลขที่หนังสือ',
              'เรื่อง',
              'จาก',
              'ถึง',
              'วันที่',
              'สถานะ',
              'ด่วน',
            ],
          ],
          body: rows,
          startY: 60,
          styles: {
            fontSize: 10,
          },
          headStyles: {
            fillColor: [230, 230, 230],
          },
        });

        doc.save('e-sarabun-report.pdf');
      } catch (err) {
        console.error('Export PDF error:', err);
        alert('ไม่สามารถสร้างไฟล์ PDF ได้: ' + err);
      }
    };

    const handlePrint = () => {
      window.print();
    };

    type Agg = { inbox: number; outbox: number };

    const daily: Record<string, Agg> = {};
    const monthly: Record<string, Agg> = {};
    const yearly: Record<string, Agg> = {};
    let pending = 0;
    let completed = 0;
    let inProcess = 0;
    let returned = 0;

    docs.forEach(d => {
      const typeKey: keyof Agg = d.type === 'INBOX' ? 'inbox' : 'outbox';

      const dayKey = d.date;
      const monthKey = d.date.slice(0, 7);
      const yearKey = d.date.slice(0, 4);

      if (!daily[dayKey]) daily[dayKey] = { inbox: 0, outbox: 0 };
      if (!monthly[monthKey]) monthly[monthKey] = { inbox: 0, outbox: 0 };
      if (!yearly[yearKey]) yearly[yearKey] = { inbox: 0, outbox: 0 };

      daily[dayKey][typeKey]++;
      monthly[monthKey][typeKey]++;
      yearly[yearKey][typeKey]++;

      if (d.status === 'PENDING') pending++;
      else if (d.status === 'COMPLETED') completed++;
      else if (d.status === 'IN_PROCESS') inProcess++;
      else if (d.status === 'RETURNED') returned++;
    });

    const dayLabels = Object.keys(daily).sort();
    const monthLabels = Object.keys(monthly).sort();
    const yearLabels = Object.keys(yearly).sort();

    const makeBarData = (labels: string[], map: Record<string, Agg>) => ({
      labels,
      datasets: [
        {
          label: 'หนังสือรับ',
          data: labels.map(l => map[l]?.inbox ?? 0),
          backgroundColor: 'rgba(37, 99, 235, 0.7)',
        },
        {
          label: 'หนังสือส่ง',
          data: labels.map(l => map[l]?.outbox ?? 0),
          backgroundColor: 'rgba(249, 115, 22, 0.7)',
        },
      ],
    });

    const statusData = {
      labels: ['รอดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการแล้ว', 'ส่งคืน/แก้ไข'],
      datasets: [
        {
          data: [pending, inProcess, completed, returned],
          backgroundColor: [
            'rgba(251, 191, 36, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(248, 113, 113, 0.8)',
          ],
          borderWidth: 1,
        },
      ],
    };

    const barOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: { enabled: true },
      },
      scales: {
        x: { ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, precision: 0 },
      },
    };

    const doughnutOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
      },
    };

    const totalDocs = docs.length;

    return (
      <div className="w-full space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <h2 className="text-xl sm:text-2xl font-bold text-sarabun-900 dark:text-white border-b-2 border-accent-500 pb-1">
            รายงานและสถิติ
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-700 text-white rounded font-bold hover:bg-green-800 shadow-sm text-xs sm:text-sm"
              type="button"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-700 text-white rounded font-bold hover:bg-red-800 shadow-sm text-xs sm:text-sm"
              type="button"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-sarabun-800 text-white rounded font-bold hover:bg-sarabun-900 shadow-sm text-xs sm:text-sm"
              type="button"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 print-full space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
              <p className="text-slate-500 dark:text-slate-300 text-xs">
                เอกสารทั้งหมด
              </p>
              <p className="text-2xl font-bold text-sarabun-900 dark:text-white mt-1">
                {totalDocs}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-slate-700/80 border border-blue-200 dark:border-blue-600">
              <p className="text-slate-500 dark:text-slate-300 text-xs">
                หนังสือรับ
              </p>
              <p className="text-2xl font-bold text-sarabun-900 dark:text:white mt-1">
                {docs.filter(d => d.type === 'INBOX').length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-orange-50 dark:bg-slate-700/80 border border-orange-200 dark:border-orange-600">
              <p className="text-slate-500 dark:text-slate-300 text-xs">
                หนังสือส่ง
              </p>
              <p className="text-2xl font-bold text-sarabun-900 dark:text-white mt-1">
                {docs.filter(d => d.type === 'OUTBOX').length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-slate-700/80 border border-emerald-200 dark:border-emerald-600">
              <p className="text-slate-500 dark:text-slate-300 text-xs">
                งานค้างดำเนินการ
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {pending}
              </p>
            </div>
          </div>

          {/* Monthly & Yearly */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[260px] sm:h-[320px] lg:h-[380px] xl:h-[450px] 2xl:h-[520px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
              <h3 className="font-bold text-sm sm:text-base mb-2 dark:text-white flex items-center gap-2">
                <FileBarChart className="w-4 h-4 text-sarabun-600" />
                สรุปจำนวนหนังสือรับ/ส่ง รายเดือน
              </h3>
              {monthLabels.length > 0 ? (
                <Bar data={makeBarData(monthLabels, monthly)} options={barOptions} />
              ) : (
                <p className="text-xs text-slate-500 mt-4">
                  ยังไม่มีข้อมูลสำหรับแสดงกราฟรายเดือน
                </p>
              )}
            </div>

            <div className="h-[260px] sm:h-[320px] lg:h-[380px] xl:h-[450px] 2xl:h-[520px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
              <h3 className="font-bold text-sm sm:text-base mb-2 dark:text-white flex items-center gap-2">
                <FileBarChart className="w-4 h-4 text-sarabun-600" />
                สรุปจำนวนหนังสือรับ/ส่ง รายปี
              </h3>
              {yearLabels.length > 0 ? (
                <Bar data={makeBarData(yearLabels, yearly)} options={barOptions} />
              ) : (
                <p className="text-xs text-slate-500 mt-4">
                  ยังไม่มีข้อมูลสำหรับแสดงกราฟรายปี
                </p>
              )}
            </div>
          </div>

          {/* Daily & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[260px] sm:h-[320px] lg:h-[380px] xl:h-[450px] 2xl:h-[520px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
              <h3 className="font-bold text-sm sm:text-base mb-2 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sarabun-600" />
                ปริมาณหนังสือรับ/ส่ง รายวัน
              </h3>
              {dayLabels.length > 0 ? (
                <Line
                  data={makeBarData(dayLabels, daily)}
                  options={{
                    ...barOptions,
                    elements: { line: { tension: 0.3 } },
                  }}
                />
              ) : (
                <p className="text-xs text-slate-500 mt-4">
                  ยังไม่มีข้อมูลสำหรับแสดงกราฟรายวัน
                </p>
              )}
            </div>

            <div className="h-[260px] sm:h-[320px] lg:h-[380px] xl:h-[450px] 2xl:h-[520px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
              <h3 className="font-bold text-sm sm:text-base mb-2 dark:text-white flex items-center gap-2">
                <StatusBadge status="PENDING" /> สัดส่วนสถานะงาน
              </h3>
              {totalDocs > 0 ? (
                <Doughnut data={statusData} options={doughnutOptions} />
              ) : (
                <p className="text-xs text-slate-500 mt-4">
                  ยังไม่มีข้อมูลสำหรับแสดงสถานะงาน
                </p>
              )}
            </div>
          </div>

          {/* ตารางเดิม */}
          <div>
            <h3 className="font-bold mb-4 dark:text-white text-base sm:text-lg border-l-4 border-sarabun-800 pl-2">
              สรุปรายการเอกสารล่าสุด
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
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
      </div>
    );
  };

  // --- หน้าวิเคราะห์ด้วย AI ---
  const AnalysisView = () => {
    const totalDocs = docs.length;
    const inboxCount = docs.filter(d => d.type === 'INBOX').length;
    const outboxCount = docs.filter(d => d.type === 'OUTBOX').length;

    const pending = docs.filter(d => d.status === 'PENDING').length;
    const completed = docs.filter(d => d.status === 'COMPLETED').length;
    const inProcess = docs.filter(d => d.status === 'IN_PROCESS').length;
    //const returned = docs.filter(d => d.status === 'RETURNED').length;

    const uniqueDays = new Set(docs.map(d => d.date)).size || 1;
    const avgPerDay = totalDocs / uniqueDays;

    const categoryMap: Record<string, number> = {};
    const ownerMap: Record<string, number> = {};

    docs.forEach(d => {
      if (d.category) {
        categoryMap[d.category] = (categoryMap[d.category] || 0) + 1;
      }
      if (d.owner) {
        ownerMap[d.owner] = (ownerMap[d.owner] || 0) + 1;
      }
    });

    const topCategory = Object.entries(categoryMap).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topOwner = Object.entries(ownerMap).sort((a, b) => b[1] - a[1])[0];

    const backlogRate = totalDocs > 0 ? pending / totalDocs : 0;

    return (
      <div className="w-full space-y-6 print-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <h2 className="text-xl sm:text-2xl font-bold text-sarabun-900 dark:text-white border-b-2 border-accent-500 pb-1 flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent-400" />
            สรุปผลการวิเคราะห์
          </h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-sarabun-800 text-white rounded font-bold hover:bg-sarabun-900 shadow-sm text-xs sm:text-sm no-print"
          >
            <Printer className="w-4 h-4" /> พิมพ์รายงานหน้านี้
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          {/* 1. ภาพรวมเชิงปริมาณ */}
          <section>
            <h3 className="font-bold text-base sm:text-lg mb-3 dark:text-white border-l-4 border-sarabun-800 pl-2">
              1. ภาพรวมเชิงปริมาณ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <p className="text-slate-500 dark:text-slate-300 text-xs">
                  ปริมาณเอกสารเฉลี่ยต่อวัน
                </p>
                <p className="text-2xl font-bold text-sarabun-900 dark:text-white mt-1">
                  {avgPerDay.toFixed(1)} ฉบับ/วัน
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  คำนวณจาก {totalDocs} ฉบับ ใน {uniqueDays} วันทำการที่มีการลงทะเบียนจริง
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-slate-700/80 border border-blue-200 dark:border-blue-600">
                <p className="text-slate-500 dark:text-slate-300 text-xs">
                  สัดส่วนหนังสือรับ : ส่ง
                </p>
                <p className="text-2xl font-bold text-sarabun-900 dark:text-white mt-1">
                  {inboxCount} : {outboxCount}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  ใช้ประเมินภาระงานด้านรับเรื่องเข้าระบบเทียบกับการจัดทำหนังสือโต้ตอบ
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-slate-700/80 border border-emerald-200 dark:border-emerald-600">
                <p className="text-slate-500 dark:text-slate-300 text-xs">
                  อัตรางานค้าง (Backlog Rate)
                </p>
                <p className="text-2xl font-bold mt-1">
                  <span
                    className={
                      backlogRate > 0.4
                        ? 'text-red-600 dark:text-red-400'
                        : backlogRate > 0.2
                        ? 'text-amber-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {(backlogRate * 100).toFixed(1)}%
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  คำนวณจากงานค้าง {pending} ฉบับ เทียบกับเอกสารทั้งหมด {totalDocs} ฉบับ
                </p>
              </div>
            </div>
          </section>

          {/* 2. จุดเน้นจากการวิเคราะห์ */}
          <section className="space-y-3">
            <h3 className="font-bold text-base sm:text-lg mb-1 dark:text-white border-l-4 border-accent-500 pl-2">
              2. ผลการวิเคราะห์
            </h3>
            <ul className="list-disc pl-5 text-sm space-y-2 text-slate-700 dark:text-slate-200">
              {topCategory && (
                <li>
                  <span className="font-semibold">
                    หมวดหมู่ที่มีปริมาณงานสูงสุด:
                  </span>{' '}
                  <span className="font-bold text-accent-600 dark:text-accent-400">
                    {topCategory[0]}
                  </span>{' '}
                  ({topCategory[1]} ฉบับ) → ควรจัดทำ Checklist / Template
                  สำหรับหมวดนี้เพื่อให้กรอกข้อมูลได้รวดเร็วและลดความผิดพลาด
                </li>
              )}
              {topOwner && (
                <li>
                  <span className="font-semibold">
                    ผู้รับผิดชอบที่มีงานในระบบมากที่สุด:
                  </span>{' '}
                  <span className="font-bold text-sarabun-900 dark:text-white">
                    {topOwner[0]}
                  </span>{' '}
                  ({topOwner[1]} ฉบับ) → AI แนะนำให้กำหนด “คู่หูสำรอง” หรือ Rotation
                  ในกรณีที่บุคคลนี้ลาป่วย/ลาออก เพื่อไม่ให้ระบบสะดุด
                </li>
              )}
              <li>
                <span className="font-semibold">สัดส่วนงานเสร็จแล้ว:</span>{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {completed} ฉบับ
                </span>{' '}
                เทียบกับงานค้าง{' '}
                <span className="font-bold text-red-500">{pending} ฉบับ</span>{' '}
                แสดงให้เห็นว่า{' '}
                {backlogRate > 0.4
                  ? 'ปริมาณคิวงานค่อนข้างหนาแน่น ควรทบทวนการกระจายงานหรือกำหนด SLA ที่ชัดเจน'
                  : backlogRate > 0.2
                  ? 'ระบบยังพอรองรับปริมาณงานได้ แต่ควรเฝ้าระวังไม่ให้มีคิวค้างสะสมเพิ่ม'
                  : 'การบริหารจัดการงานในปัจจุบันอยู่ในเกณฑ์ดี มีการปิดงานได้ต่อเนื่อง'}
                .
              </li>
              <li>
                <span className="font-semibold">
                  สถานะ “กำลังดำเนินการ”:
                </span>{' '}
                <span className="font-bold text-blue-500">{inProcess} ฉบับ</span> → ควรเพิ่ม
                “ช่องหมายเหตุ / ขั้นตอนปัจจุบัน” ในฟอร์มเพื่อให้ติดตามว่าอยู่ในช่วงใด
                เช่น รอลงนาม, ส่งลงทะเบียน, ส่งไปรษณีย์ เป็นต้น
              </li>
            </ul>
          </section>

          {/* 3. ข้อเสนอแนะเชิงระบบ */}
          <section className="space-y-3">
            <h3 className="font-bold text-base sm:text-lg mb-1 dark:text-white border-l-4 border-sarabun-800 pl-2">
              3. ข้อเสนอแนะและแนวทางปรับปรุง
            </h3>
            <ol className="list-decimal pl-5 text-sm space-y-2 text-slate-700 dark:text-slate-200">
              <li>
                <span className="font-semibold">กำหนด SLA ตามประเภทเอกสาร</span>{' '}
                เช่น หนังสือด่วนที่สุด: ปิดงานใน 1–2 วันทำการ, หนังสือทั่วไป: ภายใน 5–7 วัน
                และให้ระบบแสดง “สีเตือน” เมื่อใกล้ครบกำหนด
              </li>
              <li>
                <span className="font-semibold">
                  ปรับแบบฟอร์มให้รองรับข้อมูลเชิงโครงสร้างมากขึ้น
                </span>{' '}
                เช่น เพิ่มฟิลด์ “วิธีการตอบกลับ (หนังสือ / E-mail / โทรศัพท์)”,
                “อ้างอิงโครงการ / แผนงาน” เพื่อให้ AI วิเคราะห์ในอนาคตได้ละเอียดขึ้น
              </li>
              <li>
                <span className="font-semibold">
                  ใช้ข้อมูลจาก Google Sheet ร่วมกับ AI ภายนอก
                </span>{' '}
                เช่น ดึงข้อมูลจากชีตนี้ไปเข้า Google Colab / Python เพื่อฝึกโมเดล
                คาดการณ์ภาระงานในเดือนถัดไป หรือจำลองผลกระทบหากเพิ่ม/ลดบุคลากรในทีม
              </li>
              <li>
                <span className="font-semibold">
                  ติดตาม “จุดขวดคอ” ของกระบวนการ
                </span>{' '}
                โดยดูวันที่ลงทะเบียน, วันที่ดำเนินการเสร็จ (ในอนาคตอาจเพิ่มช่องนี้)
                แล้วให้ AI ชี้ว่าขั้นตอนใดใช้เวลานานผิดปกติ → ปรับขั้นตอนหรือเพิ่ม
                Template เฉพาะจุด
              </li>
              <li>
                <span className="font-semibold">
                  สร้าง Dashboard ระดับหัวหน้า/ผู้บริหาร
                </span>{' '}
                โดยใช้กราฟจากหน้านี้ (รายวัน/เดือน/ปี + สถานะงาน) และสามารถพิมพ์แนบในเอกสารประชุม
                เพื่อลดเวลาทำสไลด์ด้วยมือ
              </li>
            </ol>
          </section>
        </div>
      </div>
    );
  };

  const CategoriesView = () => (
  <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
    <h2 className="text-lg sm:text-xl font-bold mb-4 dark:text-white border-l-4 border-accent-500 pl-3">
      จัดการหมวดหมู่เอกสาร
    </h2>

    {/* เปลี่ยนจาก form → div และย้าย logic ไปที่ปุ่ม */}
    <div className="flex flex-col sm:flex-row gap-2 mb-6">
      <input
        className="flex-1 p-3 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-sarabun-400"
        placeholder="ระบุชื่อหมวดหมู่ใหม่..."
        value={localCatName}
        onChange={e => setLocalCatName(e.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => {
          const name = localCatName.trim();
          if (!name) return;

          if (categories.includes(name)) {
            showToast('หมวดหมู่นี้มีอยู่แล้ว', 'error');
            return;
          }

          setCategories([...categories, name]);
          setLocalCatName('');
          showToast('เพิ่มหมวดหมู่ใหม่เรียบร้อยแล้ว', 'success');
        }}
        className="px-6 py-2 bg-sarabun-800 text-white rounded font-bold hover:bg-sarabun-700 border border-accent-500"
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


  const SettingsView = () => {
  // ฟังก์ชันบันทึกการตั้งค่า (กดปุ่มแล้วเซฟ + แจ้งเตือน)
  const handleSaveSettings = () => {
    // เผื่ออนาคตมีการแก้ useEffect ก็ยังมีการเซฟตรงนี้ชัดเจน
    localStorage.setItem('esarabun_config', JSON.stringify(systemConfig));
    showToast('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', 'success');
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full max-w-2xl mx-auto">
      <h2 className="text-lg sm:text-xl font-bold mb-6 dark:text-white border-l-4 border-accent-500 pl-3 flex items-center gap-2">
        <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-sarabun-600" /> ตั้งค่าระบบ
      </h2>

      <div className="space-y-6">
        {/* ชื่อหน่วยงาน */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            ชื่อหน่วยงาน
          </label>
          <input
            className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-sarabun-400 text-sm"
            value={systemConfig.orgName}
            onChange={e =>
              setSystemConfig({ ...systemConfig, orgName: e.target.value })
            }
          />
          <p className="text-xs text-slate-500">
            ชื่อที่จะแสดงบนแถบเมนูและหัวกระดาษรายงาน
          </p>
        </div>

        {/* ปีงบประมาณ */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            ปีงบประมาณปัจจุบัน
          </label>
          <input
            className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-sarabun-400 text-sm"
            value={systemConfig.fiscalYear}
            onChange={e =>
              setSystemConfig({ ...systemConfig, fiscalYear: e.target.value })
            }
          />
          <p className="text-xs text-slate-500">
            ใช้สำหรับรันเลขที่เอกสารอัตโนมัติ
          </p>
        </div>

        {/* ปุ่มบันทึกการตั้งค่า */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 sm:px-6 py-2 bg-sarabun-800 text-white rounded-lg font-bold hover:bg-sarabun-700 shadow-md border border-accent-500 text-sm"
          >
            บันทึกการตั้งค่าระบบ
          </button>
          <p className="text-xs text-slate-500 mt-2">
            เมื่อกดปุ่มนี้ ระบบจะบันทึกการตั้งค่าปัจจุบันเก็บไว้ในเครื่อง (Local Storage)
          </p>
        </div>

        {/* พื้นที่อันตราย (คงของเดิมทุกอย่าง) */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-red-600 mb-2 text-sm sm:text-base">
            พื้นที่อันตราย
          </h3>
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
            className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-xs sm:text-sm"
          >
            <RefreshCw className="w-4 h-4" /> รีเซ็ตข้อมูลระบบทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
};

  const UsersView = () => (
    <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
      <h2 className="text-lg sm:text-xl font-bold mb-4 dark:text-white border-l-4 border-accent-500 pl-3">
        ผู้ใช้งานในระบบ
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-sarabun-800 text-white">
              <th className="py-3 pl-3 pr-2 rounded-tl">ชื่อ-นามสกุล</th>
              <th className="py-3 px-2">แผนก</th>
              <th className="py-3 px-2">Username</th>
              <th className="py-3 px-2">สิทธิ์</th>
              <th className="py-3 pr-3 pl-2 text-right rounded-tr">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map(u => (
              <tr
                key={u.id}
                className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <td className="py-3 pl-3 pr-2 dark:text-slate-300 font-medium whitespace-nowrap">
                  {u.name}
                </td>
                <td className="py-3 px-2 dark:text-slate-300 whitespace-nowrap">
                  {u.department}
                </td>
                <td className="py-3 px-2 dark:text-slate-400 text-xs sm:text-sm whitespace-nowrap">
                  {u.username}
                </td>
                <td className="py-3 px-2">
                  <span className="bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded text-xs dark:text-white border border-slate-200 dark:border-slate-500">
                    {u.role}
                  </span>
                </td>
                <td className="py-3 pr-3 pl-2 text-right">
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
    </div>
  );

  // --- Auth Screen ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sarabun-900 via-sarabun-800 to-slate-900 px-4 py-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 px-6 py-8 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden border-t-8 border-accent-500">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-sarabun-50 dark:bg-sarabun-900/50 rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner border-4 border-sarabun-100 dark:border-sarabun-800">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center text-white shadow-lg text-3xl">
                🏛
              </div>
            </div>

            <h1 className="text-2xl font-bold text-sarabun-900 dark:text-white">
              {systemConfig.orgName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              งานสารบรรณอิเล็กทรอนิกส์
            </p>
          </div>

          <div className="flex mb-6 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              className={`flex-1 pb-3 font-bold text-sm sm:text-base transition-all ${
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
              className={`flex-1 pb-3 font-bold text-sm sm:text-base transition-all ${
                isRegistering
                  ? 'text-sarabun-800 dark:text-accent-400 border-b-4 border-accent-500'
                  : 'text-slate-400'
              }`}
            >
              ลงทะเบียน
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs sm:text-sm rounded-lg flex items-center gap-2 border border-red-100">
              <Trash2 className="w-4 h-4" />
              {error}
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none text-sm"
                placeholder="ชื่อผู้ใช้งาน"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <input
                required
                type="password"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none text-sm"
                placeholder="รหัสผ่าน"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="submit"
                className="w-full py-3 bg-sarabun-900 hover:bg-sarabun-800 text-white font-bold rounded-lg shadow-lg transition-all border-b-4 border-sarabun-950 active:border-b-0 active:translate-y-1 text-sm"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none text-sm"
                placeholder="ชื่อ-นามสกุล"
                value={regName}
                onChange={e => setRegName(e.target.value)}
              />
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none text-sm"
                placeholder="ตั้งชื่อผู้ใช้งาน"
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
              />
              <input
                required
                type="password"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none text-sm"
                placeholder="ตั้งรหัสผ่าน"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
              />
              <select
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-sarabun-400 outline-none text-sm"
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
                className="w-full py-3 bg-sarabun-900 hover:bg-sarabun-800 text-white font-bold rounded-lg shadow-lg transition-all border-b-4 border-sarabun-950 active:border-b-0 active:translate-y-1 text-sm"
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

  const docsForCurrentType = docs.filter(
    d => d.type === (currentView === 'inbox' ? 'INBOX' : 'OUTBOX')
  );
  const filteredDocs =
    currentView === 'inbox' || currentView === 'outbox'
      ? docsForCurrentType
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
          .filter(d =>
            statusFilter === 'ALL' ? true : d.status === statusFilter
          )
          .filter(d =>
            priorityFilter === 'ALL' ? true : d.priority === priorityFilter
          )
      : [];

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

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 sm:w-72 lg:w-80 bg-gradient-to-b from-sarabun-900 to-sarabun-800 text-white transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 shadow-2xl flex flex-col no-print`}
      >
        <div className="p-6 border-b border-sarabun-950 flex items-center gap-3 bg-sarabun-950/30">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-accent-400">
            <span className="text-2xl">🏛</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-accent-400">
              {systemConfig.orgName}
            </h1>
            <p className="text-xs text-sarabun-200">ระบบสารบรรณงานยานพาหนะและขนส่ง</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto text-sm">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'dashboard'
                ? 'bg-white/10 border-l-4 border-accent-400 text-white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> ภาพรวมระบบ
          </button>
          <div className="pt-4 pb-2 px-4 text-[10px] sm:text-xs font-bold text-accent-500 uppercase tracking-wider">
            งานสารบรรณ
          </div>
          <button
            type="button"
            onClick={() => handleNavClick('inbox')}
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
            onClick={() => handleNavClick('outbox')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'outbox'
                ? 'bg-white/10 border-l-4 border-accent-400 text:white font-bold'
                : 'text-sarabun-200 hover:bg-white/5'
            }`}
          >
            <Send className="w-5 h-5" /> ทะเบียนหนังสือส่ง
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] sm:text-xs font-bold text-accent-500 uppercase tracking-wider">
            การบริหาร
          </div>

          <button
            type="button"
            onClick={() => handleNavClick('analysis')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'analysis'
                ? 'bg-white/10 border-l-4 border-accent-400 text:white font-bold'
                : 'text-sarabun-200 hover:bg:white/5'
            }`}
          >
            <Brain className="w-5 h-5" /> วิเคราะห์ด้วย AI
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'reports'
                ? 'bg-white/10 border-l-4 border-accent-400 text:white font-bold'
                : 'text-sarabun-200 hover:bg:white/5'
            }`}
          >
            <FileBarChart className="w-5 h-5" /> รายงานสรุป
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'users'
                ? 'bg-white/10 border-l-4 border-accent-400 text:white font-bold'
                : 'text-sarabun-200 hover:bg:white/5'
            }`}
          >
            <Users className="w-5 h-5" /> ผู้ใช้งาน
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'categories'
                ? 'bg-white/10 border-l-4 border-accent-400 text:white font-bold'
                : 'text-sarabun-200 hover:bg:white/5'
            }`}
          >
            <Files className="w-5 h-5" /> หมวดหมู่เอกสาร
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'settings'
                ? 'bg-white/10 border-l-4 border-accent-400 text:white font-bold'
                : 'text-sarabun-200 hover:bg:white/5'
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
            className="w-full py-2 bg-sarabun-800 hover:bg-red-900/80 text-[11px] sm:text-xs rounded transition-colors flex items-center justify-center gap-2 text-red-200 border border-sarabun-700"
          >
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="lg:ml-80 min-h-screen flex flex-col transition-all duration-300 w-full">
        <header className="h-16 md:h-20 bg-white dark:bg-slate-800 border-b-4 border-accent-500 sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between no-print shadow-md">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2"
            >
              <Menu className="w-6 h-6 dark:text-white" />
            </button>
            <h2 className="text-lg md:text-2xl font-bold text-sarabun-900 dark:text-white hidden md:block">
              {currentView === 'dashboard' && 'ภาพรวมระบบ'}
              {currentView === 'inbox' && 'ทะเบียนหนังสือรับ'}
              {currentView === 'outbox' && 'ทะเบียนหนังสือส่ง'}
              {currentView === 'categories' && 'หมวดหมู่เอกสาร'}
              {currentView === 'users' && 'ผู้ใช้งาน'}
              {currentView === 'reports' && 'รายงาน'}
              {currentView === 'settings' && 'ตั้งค่าระบบ'}
              {currentView === 'create' && 'สร้างเอกสารใหม่'}
              {currentView === 'analysis' && 'การวิเคราะห์ข้อมูลด้วย AI ขั้นสูง'}
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
                        <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen(prev => !prev)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 relative text-sarabun-600 dark:text-sarabun-300"
              >
                <Bell className="w-6 h-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
                )}
              </button>

              {/* ✅ กล่องแจ้งเตือนเมื่อคลิกระฆัง */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30">
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <p className="text-sm font-bold text-sarabun-900 dark:text-white">
                      การแจ้งเตือนล่าสุด
                    </p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {notifications.length} รายการ
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        ยังไม่มีการแจ้งเตือน
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60"
                        >
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                            {n.createdAt}
                          </p>
                          <p className="font-bold text-sarabun-900 dark:text-white truncate">
                            [{n.type === 'INBOX' ? 'หนังสือรับ' : 'หนังสือส่ง'}] {n.subject}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            จาก: {n.from || '-'}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            ถึง: {n.to || '-'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            ผู้บันทึก: {n.owner}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setNotifications([])}
                        className="text-[11px] text-red-500 hover:text-red-600"
                      >
                        ล้างรายการแจ้งเตือน
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </header>

        <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10 flex-1 w-full max-w-none bg-slate-50 dark:bg-slate-900">
          {currentView === 'dashboard' && <DashboardView />}
          {(currentView === 'inbox' || currentView === 'outbox') && (
            <div className="w-full h-full flex flex-col">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-sarabun-900 dark:text-white border-l-8 border-sarabun-900 pl-3 sm:pl-4">
                  {currentView === 'inbox'
                    ? 'ทะเบียนหนังสือรับ'
                    : 'ทะเบียนหนังสือส่ง'}
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentView('create')}
                  className="px-4 sm:px-6 py-2.5 bg-sarabun-900 text-white rounded font-bold hover:bg-sarabun-800 flex items-center gap-2 shadow-lg border-b-4 border-sarabun-950 active:translate-y-1 active:border-b-0 text-sm"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-accent-400" />{' '}
                  สร้างหนังสือใหม่
                </button>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex-1">
                <div className="flex flex-wrap gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <input
                    placeholder="ค้นหา: เลขทะเบียน / เลขที่หนังสือ / เรื่อง / จาก..."
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border dark:bg-slate-800 dark:border-slate-600 dark:text:white text-xs sm:text-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <select
                    className="px-3 py-2 rounded-lg border dark:bg-slate-800 dark:border-slate-600 dark:text:white text-xs sm:text-sm"
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
                    className="px-3 py-2 rounded-lg border dark:bg-slate-800 dark:border-slate-600 dark:text:white text-xs sm:text-sm"
                    value={priorityFilter}
                    onChange={e =>
                      setPriorityFilter(e.target.value as 'ALL' | Priority)
                    }
                  >
                    <option value="ALL">ทุกระดับความเร่งด่วน</option>
                    <option value="NORMAL">ปกติ</option>
                    <option value="URGENT">ด่วน</option>
                    <option value="VERY_URGENT">ด่วนที่สุด</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-sarabun-900 text-white border-b-4 border-accent-500 text-xs sm:text-sm">
                      <tr>
                        <th className="p-4 font-bold w-20 text-center">
                          ประเภท
                        </th>
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
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mx-auto shadow-sm ${
                                d.type === 'INBOX'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {d.type === 'INBOX' ? (
                                <Inbox className="w-4 h-4 sm:w-5 sm:h-5" />
                              ) : (
                                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-sarabun-800 dark:text-white text-xs sm:text-sm">
                            {d.registerNo}
                          </td>
                          <td className="p-4 dark:text-slate-300 font-medium text-xs sm:text-sm">
                            {d.subject}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
                            {d.from}
                          </td>
                          <td className="p-4 text-slate-500 text-xs sm:text-sm">
                            {d.date}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={d.status} />
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              className="p-2 text-slate-400 hover:text-sarabun-600 hover:bg-slate-100 rounded-full transition-all"
                              onClick={() => setSelectedDoc(d)}
                            >
                              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredDocs.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm"
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
          {currentView === 'analysis' && <AnalysisView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'categories' && <CategoriesView />}
          {currentView === 'users' && <UsersView />}
          {currentView === 'settings' && <SettingsView />}
        </div>
      </main>

      <DocDetailDrawer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      <Toast toast={toast} />
    </div>
  );
}
