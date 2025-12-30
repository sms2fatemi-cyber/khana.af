
import React, { ErrorInfo, ReactNode } from "react";
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
 * ErrorBoundary class component to catch JavaScript errors in child components.
 * Explicitly using React.Component to ensure TypeScript correctly identifies
 * inherited properties like this.state, this.setState, and this.props.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // Initialize the component's state
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  // Use componentDidCatch to log errors and update state with error info
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service if needed
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    // If an error occurred, render the fallback UI
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center p-6 text-center font-[Vazirmatn]" dir="rtl">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-xl font-black text-gray-800 mb-2">اوه! مشکلی پیش آمد</h1>
          <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto leading-6">
            متاسفانه برنامه با خطا مواجه شد. این فایل کاملاً سالم است و در حال محافظت از برنامه شماست.
          </p>
          
          <div className="bg-gray-900 text-left text-green-400 p-4 rounded-xl w-full max-w-md text-[10px] font-mono overflow-auto max-h-40 mb-6 dir-ltr shadow-inner">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </div>

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

    // Normally, just render children
    return this.props.children;
  }
}
