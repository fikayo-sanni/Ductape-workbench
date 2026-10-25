import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Keeps one section of the dashboard from taking the whole workbench down with it. If drawing it throws, that section says so and
 * everything else carries on. The workbench has no other error boundary, so without this a bad response blanks the page.
 */
export default class SectionBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean; message: string }> {
  state = { failed: false, message: '' };

  static getDerivedStateFromError(error: unknown) {
    return { failed: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    console.error(`[Dashboard] ${this.props.title} could not be shown:`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-orange/30 bg-orange/5 p-4" role="alert">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-grey">{this.props.title} could not be shown</p>
          <p className="mt-0.5 break-words text-xs text-grey-600 sm:text-sm">{this.state.message || 'Something in this section went wrong.'} The rest of the page is unaffected.</p>
        </div>
      </div>
    );
  }
}
