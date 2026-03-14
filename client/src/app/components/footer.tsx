import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold text-white">Snap2GCal</span>
          </div>
          
          <p className="text-gray-400 text-center">
            Built with ❤️ for busy professionals
          </p>
          
          <p className="text-gray-500 text-sm">
            © 2026 All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
