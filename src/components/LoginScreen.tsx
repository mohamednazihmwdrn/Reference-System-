import React, { useState } from 'react';
import { 
  Building2, 
  Store, 
  Package, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Shield, 
  ArrowLeft
} from 'lucide-react';
import { Branch, UserSession } from '../types';
import { AUDITOR_CREDENTIALS, COMPANY_INFO } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface LoginScreenProps {
  branches: Branch[];
  onLoginSuccess: (session: UserSession) => void;
  onOpenPrivacyPolicy: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  branches,
  onLoginSuccess,
  onOpenPrivacyPolicy,
}) => {
  // Accounts options for the dropdown
  const storeBranches = branches.filter((b) => b.type === 'store');
  const warehouseBranches = branches.filter((b) => b.type === 'warehouse');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(branches[0]?.id || 'b_rawda');
  const [pinPassword, setPinPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Find the selected account details
  const getSelectedAccount = () => {
    if (selectedAccountId === AUDITOR_CREDENTIALS.id) {
      return {
        id: AUDITOR_CREDENTIALS.id,
        name: AUDITOR_CREDENTIALS.name,
        role: 'auditor' as const,
        pinCode: AUDITOR_CREDENTIALS.pinCode,
        userName: 'المراجع العام',
      };
    }
    const b = branches.find((item) => item.id === selectedAccountId);
    if (b) {
      return {
        id: b.id,
        name: b.name,
        role: 'branch_cashier' as const,
        pinCode: b.pinCode,
        userName: b.defaultCashier || b.name,
        branchId: b.id,
      };
    }
    return null;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetAccount = getSelectedAccount();
    if (!targetAccount) {
      setErrorMsg('يرجى تحديد المحل أو المخزن من القائمة');
      return;
    }

    if (!pinPassword.trim()) {
      setErrorMsg('يرجى كتابة كلمة السر الخاصة بالفرع');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (pinPassword.trim() === targetAccount.pinCode) {
        soundManager.playSuccess();
        const session: UserSession = {
          role: targetAccount.role,
          branchId: targetAccount.branchId,
          branchName: targetAccount.name,
          userName: targetAccount.userName,
          loggedInAt: new Date().toISOString(),
        };
        onLoginSuccess(session);
      } else {
        soundManager.playReject();
        setErrorMsg('كلمة السر غير صحيحة، يرجى التأكد وإعادة المحاولة');
        setIsLoading(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 selection:bg-blue-600 selection:text-white" dir="rtl">
      
      {/* Top Branding Bar */}
      <div className="max-w-md mx-auto w-full pt-6 pb-2 text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-mono text-2xl font-black shadow-xl shadow-blue-600/30">
          الروضة
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          شركة الروضة الشريفة للتجارة
        </h1>
        <p className="text-xs text-slate-400">
          منظومة التحقق والمطابقة اللحظية لتحويلات إنستا باي (IPN)
        </p>
      </div>

      {/* Login Card with Professional Dropdown & Password Field */}
      <div className="max-w-md mx-auto w-full my-auto py-4">
        <div className="bg-slate-800/95 border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              <span>تسجيل الدخول للمنظومة</span>
            </h2>
            <p className="text-xs text-slate-400">
              اختر المحل أو المخزن واكتب كلمة السر للوصول إلى حسابك
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Field 1: Professional Account Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                المحل / المخزن / الإدارة: <span className="text-red-400">*</span>
              </label>
              
              <div className="relative">
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <optgroup label="المحلات التجارية">
                    {storeBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏪 {b.name} ({b.code})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="المخازن والمستودعات">
                    {warehouseBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        📦 {b.name} ({b.code})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="الإدارة المالية والتدقيق">
                    <option value={AUDITOR_CREDENTIALS.id}>
                      🛡️ {AUDITOR_CREDENTIALS.name}
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Field 2: Password / PIN Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                كلمة السر / الرقم السري (PIN): <span className="text-red-400">*</span>
              </label>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={pinPassword}
                  onChange={(e) => setPinPassword(e.target.value)}
                  placeholder="أدخل كلمة السر الخاصة بهذا الفرع..."
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-2xl px-4 py-3 pr-4 pl-11 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-white p-0.5"
                  title={showPassword ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 pt-0.5">
                سيتذكر هذا الهاتف تسجيل الدخول تلقائياً ولن يطلب كلمة السر مرة أخرى إلا عند تسجيل الخروج.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-13 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <span>جاري التحقق...</span>
                ) : (
                  <>
                    <span>تسجيل الدخول للمنظومة</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full pt-2 pb-2 text-center space-y-2 text-[11px] text-slate-500 border-t border-slate-800">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenPrivacyPolicy}
            className="text-slate-400 hover:text-white font-semibold transition-colors flex items-center gap-1"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>سياسة الخصوصية لشركة الروضة الشريفة</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-400 font-medium">
          <span>حقوق الملكية الفكرية وبرمجة المنظومة: </span>
          <strong className="text-slate-300">Mohamed Nazih</strong>
          <span className="mx-1">·</span>
          <span>هاتف: </span>
          <a href="tel:01029190615" className="font-mono font-semibold text-slate-300 hover:underline">
            01029190615
          </a>
        </div>
      </footer>

    </div>
  );
};
