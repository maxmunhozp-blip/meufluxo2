import meufluxoXDark from '@/assets/meufluxo-x-dark.svg';

interface LoadingLogoProps {
  size?: number;
}

export function LoadingLogo({ size = 36 }: LoadingLogoProps) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const iconSrc = isDark ? meufluxoXDark : '/meufluxo-icon.svg';
  const maskSrc = isDark ? meufluxoXDark : '/meufluxo-icon.svg';

  return (
    <div className="loading-logo-wrapper" style={{ width: size, height: size }}>
      <img src={iconSrc} alt="Carregando" style={{ width: size, height: size, objectFit: 'contain' }} />
      <div
        className="loading-logo-shine"
        style={{
          maskImage: `url(${maskSrc})`,
          WebkitMaskImage: `url(${maskSrc})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      />
    </div>
  );
}
