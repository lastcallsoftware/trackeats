import React, { useEffect, useRef, useState } from 'react';
import Tooltip from '@mui/material/Tooltip';

// Helper: Only show tooltip if content is visually truncated
function TruncatedCellWithTooltip({ children }: { children: React.ReactNode }) {
    const spanRef = useRef<HTMLSpanElement>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        const el = spanRef.current;
        if (el) {
            setShowTooltip(el.scrollHeight > el.clientHeight + 1);
        }
    }, [children]);

    return (
        <Tooltip title={showTooltip ? children : ''} placement="top" arrow disableHoverListener={!showTooltip}>
            <span
                ref={spanRef}
                style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxHeight: '2.5rem',
                    whiteSpace: 'normal',
                    width: '100%',
                }}
            >
                {children}
            </span>
        </Tooltip>
    );
}

export default TruncatedCellWithTooltip;
