
import React, { useState } from 'react';
import { Lock, ShieldCheck, User, Key, Loader2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AdminLoginProps {
  onLogin: (user: any) => void;
  onCancel: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: loginError } = await supabase.from('system_admins').select('*').eq('username', username.trim()).maybeSingle();
      if (loginError) setError('خطا در اتصال به پایگاه داده');
      else if (!data || data.password !== password.trim()) setError('نام کاربری یا رمز عبور اشتباه است.');
      else onLogin(data);
    } catch (err) { setError('خطا در برقراری ارتباط'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[12000] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-gray-800 p-10 text-center relative">
           <div className="w-20 h-20 bg-gray-700 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-gray-600 shadow-xl">
             <ShieldCheck size={40} className="text-red-500" />
           </div>
           <h2 className="text-2xl font-black text-white">ورود مدیر سیستم</h2>
           <button onClick={onCancel} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-black flex items-center gap-3 animate-in slide-in-from-top-2"><AlertCircle size={18} className="shrink-0" /><span>{error}</span></div>}
          <div className="space-y-4">
            <div className="relative">
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pr-12 text-sm font-black outline-none focus:border-red-500 transition-all" placeholder="نام کاربری" required />
              <User size={18} className="absolute right-4 top-4.5 text-gray-400" />
            </div>
            <div className="relative">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pr-12 text-sm font-black outline-none focus:border-red-500 transition-all" placeholder="رمز عبور" required />
              <Key size={18} className="absolute right-4 top-4.5 text-gray-400" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-red-700 flex items-center justify-center gap-2 active:scale-95 disabled:bg-gray-400 transition-all">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Lock size={18} /> تایید و ورود</>}
          </button>
        </form>
      </div>
    </div>
  );
};
export default AdminLogin;
