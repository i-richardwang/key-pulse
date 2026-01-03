import { HeartIcon } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl flex h-12 items-center justify-between px-4">
        <p className="text-xs text-muted-foreground">
          KeyPulse &copy; {new Date().getFullYear()} Richard Wang
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          Built with <HeartIcon className="size-3 text-red-500 fill-red-500" /> using Next.js, React & shadcn/ui
        </p>
      </div>
    </footer>
  );
}
