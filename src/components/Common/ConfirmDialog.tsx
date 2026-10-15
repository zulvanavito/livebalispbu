'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmDialogContextType {
  confirmAction: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
};

export const ConfirmDialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<ConfirmOptions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const confirmAction = useCallback((options: ConfirmOptions) => {
    setDialogState(options);
    setIsLoading(false);
  }, []);

  const closeConfirm = useCallback(() => {
    if (dialogState?.onCancel) {
      dialogState.onCancel();
    }
    setDialogState(null);
    setIsLoading(false);
  }, [dialogState]);

  const handleConfirm = async () => {
    if (!dialogState) return;
    try {
      setIsLoading(true);
      await dialogState.onConfirm();
      setDialogState(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dialogState) return;
      if (e.key === 'Escape' && !isLoading) {
        closeConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState, isLoading, closeConfirm]);

  return (
    <ConfirmDialogContext.Provider value={{ confirmAction, closeConfirm }}>
      {children}

      {dialogState && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isLoading && closeConfirm()}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 animate-in zoom-in-95 duration-150 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  dialogState.isDestructive
                    ? 'bg-rose-50 border border-rose-200 text-rose-600'
                    : 'bg-zinc-100 border border-zinc-200 text-zinc-700'
                }`}
              >
                {dialogState.isDestructive ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-zinc-700" />
                )}
              </div>
              <div>
                <h3 id="confirm-dialog-title" className="font-bold text-base text-zinc-900">
                  {dialogState.title}
                </h3>
                <p id="confirm-dialog-desc" className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  {dialogState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={isLoading}
                onClick={closeConfirm}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer disabled:opacity-50"
              >
                {dialogState.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-black cursor-pointer shadow-xs disabled:opacity-50 ${
                  dialogState.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-600'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-white'
                }`}
              >
                {isLoading ? 'Memproses...' : dialogState.confirmText || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
};
