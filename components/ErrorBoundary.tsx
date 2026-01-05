
import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary class component to catch rendering errors in the component tree.
 * Inheriting from Component<Props, State> ensures setState and props are correctly typed and available.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  // componentDidCatch implementation to capture error details and update state
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center p-6 text-center font-[Vazirmatn]" dir="rtl">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-xl font-black text-gray-800 mb-2">اوه! مشکلی پیش آمد</h1>
          <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto leading-6">
            متاسفانه برنامه با خطا مواجه شد.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#a62626] text-white px-8 py-3 rounded-xl font-black shadow-lg active:scale-95 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            تلاش مجدد
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
