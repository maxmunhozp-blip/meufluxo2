interface LoadingLogoProps {
  size?: number;
}

export function LoadingLogo({ size = 36 }: LoadingLogoProps) {
  return (
    <div className="loading-logo-wrapper" style={{ width: size, height: size }}>
      <img src="/meufluxo-icon.svg" alt="Carregando" style={{ width: size, height: size, objectFit: 'contain' }} />
      <div
        className="loading-logo-shine"
        style={{
          maskImage: 'url(/meufluxo-icon.svg)',
          WebkitMaskImage: 'url(/meufluxo-icon.svg)',
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
