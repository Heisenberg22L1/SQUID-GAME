import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-lg bg-[#14161d] border border-white/15 text-xs font-semibold text-[#f4f4f6] hover:border-[#ff2e63]/70 hover:text-white transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4 text-[#ff2e63]" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-lg bg-[#14161d] border border-white/15 text-xs font-semibold text-[#f4f4f6] hover:border-[#ff2e63]/70 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4 text-[#ff2e63]" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
              className="w-full max-w-sm rounded-xl bg-[#111318] border border-white/15 p-6 text-left shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 id="ios-install-title" className="font-display text-2xl font-bold tracking-wide text-white">
                  Install on iPhone / iPad
                </h3>
                <button
                  type="button"
                  aria-label="Close iOS install instructions"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> for full-screen offline play.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-lg bg-[#ff2e63] text-sm font-semibold text-white hover:bg-[#e11d48] transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
