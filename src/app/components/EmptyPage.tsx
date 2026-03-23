import React from "react";
import { Construction } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface EmptyPageProps {
  icon?: React.ReactNode;
  title?: string;
  titleKo?: string;
  description?: string;
  descriptionKo?: string;
  action?: React.ReactNode;
}

export function EmptyPage({ icon, title, titleKo, description, descriptionKo, action }: EmptyPageProps) {
  const { language } = useLanguage();
  const ko = language === "ko";

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        {icon || <Construction size={28} className="text-gray-400" />}
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        {ko ? (titleKo || "준비 중입니다") : (title || "Coming Soon")}
      </h2>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        {ko ? (descriptionKo || "이 페이지는 현재 개발 중입니다. 곧 만나요!") : (description || "This page is under development. Stay tuned!")}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
