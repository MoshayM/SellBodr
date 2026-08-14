import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<PWAInstallBanner /></>;
}
