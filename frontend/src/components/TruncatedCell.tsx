// Simple: Clamp to 2 lines, no tooltip
function TruncatedCell({ children }: { children: React.ReactNode }) {
    return (
        <span
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
    );
}

export default TruncatedCell;
