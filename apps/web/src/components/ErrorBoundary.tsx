import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Kutilmagan render xatoligi:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <AlertCircle className="text-danger" size={40} aria-hidden />
          <p className="text-lg font-semibold text-brand-dark">Kutilmagan xatolik yuz berdi.</p>
          <p className="text-sm text-ink-muted">Sahifani qayta yuklab ko'ring.</p>
          <Button onClick={() => window.location.reload()}>Sahifani yangilash</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
