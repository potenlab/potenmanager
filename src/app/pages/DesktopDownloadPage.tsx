import React from 'react';
import { motion } from 'motion/react';
import { Zap, Monitor, Download, ArrowLeft, Shield, Wifi, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router';

const VERSION = '0.2.0';

const DOWNLOAD_URL = `https://github.com/potenlab/potenmanager/releases/download/v${VERSION}/Poten.Manager.${VERSION}.exe`;

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  );
}

export function DesktopDownloadPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0079FF] rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-gray-900 text-lg">Poten Manager</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 text-sm font-medium text-[#0079FF] hover:bg-blue-50 rounded-xl transition-colors"
          >
            웹에서 시작하기
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#0079FF] rounded-full text-xs font-semibold mb-8">
              <Monitor size={14} />
              Desktop App v{VERSION}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              더 빠른 경험을 위해<br />
              <span className="text-[#0079FF]">데스크톱 앱</span>을<br className="sm:hidden" /> 다운로드하세요
            </h1>

            <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
              빠르고 집중할 수 있는 네이티브 환경.<br />
              브라우저 없이도 업무를 관리하세요.
            </p>

            {/* Primary CTA */}
            <motion.a
              href={DOWNLOAD_URL}
              download
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#0079FF] text-white rounded-2xl text-base font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
            >
              <WindowsIcon className="shrink-0" />
              <div className="text-left">
                <div>Windows용 다운로드</div>
                <div className="text-xs font-normal text-white/70">Windows 10 이상</div>
              </div>
              <Download size={18} className="ml-2" />
            </motion.a>

            <p className="mt-4 text-xs text-gray-400">
              v{VERSION} · 무료 다운로드
            </p>
          </motion.div>
        </div>
      </section>

      {/* App Screenshot Mockup */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-100"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400 font-medium">Poten Manager</span>
          </div>
          {/* Placeholder content area */}
          <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-[#0079FF]/10 rounded-2xl flex items-center justify-center">
                <Zap size={36} className="text-[#0079FF]" fill="currentColor" />
              </div>
              <p className="text-gray-400 text-sm">AI가 돕는 스마트한 업무 관리</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Gauge, title: '네이티브 성능', desc: '브라우저보다 빠른 실행 속도와 부드러운 인터랙션을 경험하세요.' },
            { icon: Wifi, title: '독립적인 작업 환경', desc: '브라우저 탭에 묻히지 않는 전용 앱으로 집중력을 유지하세요.' },
            { icon: Shield, title: '안전한 업데이트', desc: '새 버전이 출시되면 알림을 통해 간편하게 업데이트할 수 있습니다.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              className="text-center"
            >
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-xl flex items-center justify-center">
                <f.icon size={22} className="text-[#0079FF]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* All Downloads */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">모든 다운로드</h2>
          <div className="space-y-3">
            <a
              href={DOWNLOAD_URL}
              download
              className="flex items-center justify-between px-6 py-4 bg-white rounded-xl border border-gray-200 hover:border-[#0079FF] hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <WindowsIcon className="text-gray-600 group-hover:text-[#0079FF] transition-colors" />
                <div>
                  <div className="font-medium text-gray-900">Windows</div>
                  <div className="text-xs text-gray-400">x64 · Windows 10+</div>
                </div>
              </div>
              <Download size={18} className="text-gray-300 group-hover:text-[#0079FF] transition-colors" />
            </a>
            {/* macOS - Coming soon */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-xl border border-gray-100 opacity-60">
              <div className="flex items-center gap-4">
                <svg className="text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
                </svg>
                <div>
                  <div className="font-medium text-gray-500">macOS</div>
                  <div className="text-xs text-gray-400">Coming soon</div>
                </div>
              </div>
            </div>
            {/* Google Play - Coming soon */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-xl border border-gray-100 opacity-60">
              <div className="flex items-center gap-4">
                <svg className="text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.651 1.535a1 1 0 0 1 0 1.73l-2.654 1.536-2.53-2.53 2.533-2.271zM5.864 1.278L16.8 7.612l-2.303 2.303L5.864 1.278z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-500">Google Play</div>
                  <div className="text-xs text-gray-400">Coming soon</div>
                </div>
              </div>
            </div>
            {/* App Store - Coming soon */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-xl border border-gray-100 opacity-60">
              <div className="flex items-center gap-4">
                <svg className="text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
                </svg>
                <div>
                  <div className="font-medium text-gray-500">App Store</div>
                  <div className="text-xs text-gray-400">Coming soon</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 bg-[#0079FF] rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" fill="currentColor" />
          </div>
          <span className="font-semibold text-gray-700">Poten Manager</span>
        </div>
        <p className="text-xs text-gray-400">
          © 2026 The Potential. All rights reserved.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 inline-flex items-center gap-1 text-sm text-[#0079FF] hover:underline"
        >
          <ArrowLeft size={14} />
          웹에서 시작하기
        </button>
      </footer>
    </div>
  );
}
