import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let message = "예상치 못한 오류가 발생했습니다.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = "요청하신 페이지를 찾을 수 없습니다.";
    } else {
      message = `${error.status} ${error.statusText || "오류"}`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>

        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          문제가 발생했습니다
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-gray-400">{message}</p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            다시 시도
          </button>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
