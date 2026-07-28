import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'tijolo-pwa-install-dismissed-at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<BeforeInstallPromptChoice>;
  prompt(): Promise<void>;
}

function wasRecentlyDismissed() {
  try {
    const dismissedAt = window.localStorage.getItem(DISMISS_KEY);

    if (!dismissedAt) {
      return false;
    }

    return Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable in private contexts; hiding the prompt still works.
  }
}

function isRunningStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isRunningStandalone() || wasRecentlyDismissed()) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const dismiss = () => {
    rememberDismissal();
    setIsVisible(false);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-ds-xl border border-cream-200 bg-cream-50/95 p-4 shadow-ds-lg backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ds-pill bg-brand-gold/20 text-brand-goldDeep">
            <Download className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-ds-display text-base font-semibold text-ink-900">
              Instalar Tijolo em Capital no seu celular
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Acesse a plataforma em tela cheia, direto da sua tela inicial.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            className="bg-brand-gold text-ink-900 hover:bg-brand-goldDeep hover:text-cream-50"
            onClick={install}
          >
            Instalar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-cream-300 bg-cream-50 text-ink-700 hover:bg-cream-100 hover:text-ink-900"
            onClick={dismiss}
          >
            Depois
          </Button>
        </div>
      </div>
    </aside>
  );
}
