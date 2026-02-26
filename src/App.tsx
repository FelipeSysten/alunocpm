import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, 
  Users, 
  FileText, 
  Upload, 
  Search, 
  X, 
  Calendar, 
  Hash, 
  User,
  Download,
  Trash2,
  Plus,
  Loader2,
  Edit2,
  Lock,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Student {
  id: number;
  student_code: string;
  full_name: string;
  birth_date: string;
}

interface StudentFile {
  id: number;
  student_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  upload_date: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('cpm_auth') === 'true';
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFiles, setStudentFiles] = useState<StudentFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [newStudent, setNewStudent] = useState({
    student_code: '',
    full_name: '',
    birth_date: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentFiles(selectedStudent.id);
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentFiles = async (studentId: number) => {
    try {
      const response = await fetch(`/api/students/${studentId}/files`);
      const data = await response.json();
      setStudentFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      
      if (response.ok) {
        setNewStudent({ student_code: '', full_name: '', birth_date: '' });
        setIsAddingStudent(false);
        setEditingStudent(null);
        fetchStudents();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao processar aluno');
      }
    } catch (error) {
      console.error('Error processing student:', error);
    }
  };

  const handleDeleteStudent = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este aluno e todos os seus documentos?')) return;

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchStudents();
        if (selectedStudent?.id === id) setSelectedStudent(null);
      } else {
        alert('Erro ao excluir aluno');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const openEditModal = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setEditingStudent(student);
    setNewStudent({
      student_code: student.student_code,
      full_name: student.full_name,
      birth_date: student.birth_date
    });
    setIsAddingStudent(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/students/${selectedStudent.id}/files`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        fetchStudentFiles(selectedStudent.id);
      } else {
        alert('Erro ao enviar arquivo');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (fileId: number) => {
    try {
      const response = await fetch(`/api/files/${fileId}`);
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Erro ao obter link do arquivo');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (selectedStudent) fetchStudentFiles(selectedStudent.id);
      } else {
        alert('Erro ao excluir arquivo');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.email === 'admincpm@cpmitabuna.com' && loginForm.password === 'cpm') {
      setIsAuthenticated(true);
      localStorage.setItem('cpm_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Credenciais inválidas. Tente novamente.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('cpm_auth');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-200"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-200">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Alunos CPM</h1>
            <p className="text-slate-500 text-sm mt-1">Acesso restrito ao sistema</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="admincpm@cpmitabuna.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  value={loginForm.email}
                  onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                />
              </div>
            </div>

            {loginError && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm font-medium text-center"
              >
                {loginError}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
            >
              Entrar no Sistema
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Alunos CPM</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar aluno..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-lg text-sm w-64 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsAddingStudent(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Novo Aluno</span>
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-slate-500 font-medium">Carregando alunos...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhum aluno encontrado</h3>
            <p className="text-slate-500 mt-1">Comece cadastrando um novo aluno no sistema.</p>
            <button 
              onClick={() => setIsAddingStudent(true)}
              className="mt-6 text-indigo-600 font-medium hover:underline"
            >
              Cadastrar primeiro aluno
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <motion.div
                layoutId={`student-${student.id}`}
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <User size={24} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">
                      #{student.student_code}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => openEditModal(e, student)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteStudent(e, student.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {student.full_name}
                </h3>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>Nasc: {new Date(student.birth_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>Ver documentos</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Modal: Add Student */}
      <AnimatePresence>
        {isAddingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingStudent(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{editingStudent ? 'Editar Aluno' : 'Cadastrar Aluno'}</h2>
                <button onClick={() => { setIsAddingStudent(false); setEditingStudent(null); setNewStudent({ student_code: '', full_name: '', birth_date: '' }); }} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <Hash size={14} /> Código do Aluno
                  </label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: 2024001"
                    value={newStudent.student_code}
                    onChange={e => setNewStudent({...newStudent, student_code: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <User size={14} /> Nome Completo
                  </label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Nome do aluno"
                    value={newStudent.full_name}
                    onChange={e => setNewStudent({...newStudent, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <Calendar size={14} /> Data de Nascimento
                  </label>
                  <input 
                    required
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={newStudent.birth_date}
                    onChange={e => setNewStudent({...newStudent, birth_date: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-all mt-4"
                >
                  {editingStudent ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Student Details & Files */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              layoutId={`student-${selectedStudent.id}`}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div>
                  <h2 className="text-xl font-semibold">{selectedStudent.full_name}</h2>
                  <p className="text-indigo-100 text-sm">Código: {selectedStudent.student_code} • Nasc: {new Date(selectedStudent.birth_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText size={20} className="text-indigo-600" />
                    Documentos Digitalizados
                  </h3>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Upload Arquivo
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </div>

                {studentFiles.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <Upload className="mx-auto text-slate-300 mb-3" size={40} />
                    <p className="text-slate-500">Nenhum documento anexado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400">
                            <FileText size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-medium text-slate-900 truncate">{file.original_name}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(file.upload_date).toLocaleDateString('pt-BR')} • {file.mime_type.split('/')[1].toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleDownload(file.id)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                            title="Visualizar/Baixar"
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                            title="Excluir Documento"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
