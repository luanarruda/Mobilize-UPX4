// Ícones em SVG, desenhados com o traço na cor do texto (currentColor):
// funcionam no tema normal e no alto contraste sem arquivos extras.
// São decorativos (aria-hidden): o nome de cada botão está sempre em texto.
import type { ReactNode } from 'react';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icone"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconeMapa = () => (
  <Svg>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </Svg>
);

export const IconeRota = () => (
  <Svg>
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" />
  </Svg>
);

export const IconeLinhas = () => (
  <Svg>
    <rect x="5" y="3" width="14" height="15" rx="3" />
    <path d="M5 11h14M8 18v3M16 18v3" />
    <circle cx="8.5" cy="14.5" r="0.6" fill="currentColor" />
    <circle cx="15.5" cy="14.5" r="0.6" fill="currentColor" />
  </Svg>
);

export const IconeEstrela = () => (
  <Svg>
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
  </Svg>
);

export const IconePessoa = () => (
  <Svg>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);

export const IconeContraste = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
  </Svg>
);
