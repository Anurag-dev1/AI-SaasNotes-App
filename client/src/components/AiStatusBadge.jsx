import clsx from 'clsx';
import { CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';

export default function AiStatusBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        No AI
      </span>
    );
  }

  const configs = {
    pending: {
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      icon: <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse mr-1" />
    },
    processing: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Loader2 className="w-3 h-3 animate-spin mr-1" />
    },
    completed: {
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />
    },
    failed: {
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: <XCircle className="w-3 h-3 mr-1" />
    }
  };

  const config = configs[status];

  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      config?.color || 'bg-gray-100 text-gray-600 border-gray-200'
    )}>
      {config?.icon}
      <Sparkles className="w-3 h-3 mr-1 hidden" /> {/* Just to ensure sparklers is imported properly */}
      AI: {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
