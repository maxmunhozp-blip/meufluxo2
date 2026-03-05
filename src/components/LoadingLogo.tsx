interface LoadingLogoProps {
  size?: number;
}

export function LoadingLogo({ size = 120 }: LoadingLogoProps) {
  const theme = document.documentElement.getAttribute('data-theme');
  const isDark = theme === 'dark';
  const iconSrc = isDark ? '/meufluxo-loading-dark.svg' : '/meufluxo-loading-light.svg';

  return (
    <div className="loading-logo-wrapper" style={{ width: size, height: size }}>
      <img src={iconSrc} alt="Carregando" style={{ width: size, height: size, objectFit: 'contain' }} />
      <div
        className={`loading-logo-shine ${isDark ? 'loading-logo-shine-dark' : ''}`}
        style={{
          maskImage: `url(${iconSrc})`,
          WebkitMaskImage: `url(${iconSrc})`,
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
