import React from 'react';

type AngkorWatLogoProps = {
  className?: string;
  title?: string;
};

export function AngkorWatLogo({ className, title = 'Angkor Wat' }: AngkorWatLogoProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      className={className}
      fill="currentColor"
    >
      <path d="M16 96h96v12H16z" />
      <path d="M28 84h72v12H28z" />
      <path d="M24 60h16v24H24z" />
      <path d="M40 60h48v24H40z" />
      <path d="M88 60h16v24H88z" />
      <path d="M30 44h12v16H30z" />
      <path d="M52 36h24v24H52z" />
      <path d="M86 44h12v16H86z" />
      <path d="M56 24h16v12H56z" />
    </svg>
  );
}

export default AngkorWatLogo;
