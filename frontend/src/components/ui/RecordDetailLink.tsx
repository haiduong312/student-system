'use client';

import { Button } from 'antd';
import type { ReactNode } from 'react';

export function RecordDetailLink({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <Button
      type="link"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        height: 'auto',
        padding: 0,
        fontWeight: 600,
        lineHeight: 1.5,
        textAlign: 'left',
        whiteSpace: 'normal',
      }}
    >
      {children}
    </Button>
  );
}
