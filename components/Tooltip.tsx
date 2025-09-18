import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'right' | 'left' | 'top' | 'bottom';
    disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'right',
    disabled = false
}) => {
    const [isVisible, setIsVisible] = useState(false);

    if (disabled) {
        return <>{children}</>;
    }

    const getPositionClasses = () => {
        switch (position) {
            case 'right':
                return 'left-full top-1/2 -translate-y-1/2 ml-2';
            case 'left':
                return 'right-full top-1/2 -translate-y-1/2 mr-2';
            case 'top':
                return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
            case 'bottom':
                return 'top-full left-1/2 -translate-x-1/2 mt-2';
            default:
                return 'left-full top-1/2 -translate-y-1/2 ml-2';
        }
    };

    const getArrowClasses = () => {
        switch (position) {
            case 'right':
                return 'absolute top-1/2 -translate-y-1/2 -left-1 border-r-gray-800 border-r-4 border-y-transparent border-y-4 border-l-0';
            case 'left':
                return 'absolute top-1/2 -translate-y-1/2 -right-1 border-l-gray-800 border-l-4 border-y-transparent border-y-4 border-r-0';
            case 'top':
                return 'absolute left-1/2 -translate-x-1/2 -bottom-1 border-t-gray-800 border-t-4 border-x-transparent border-x-4 border-b-0';
            case 'bottom':
                return 'absolute left-1/2 -translate-x-1/2 -top-1 border-b-gray-800 border-b-4 border-x-transparent border-x-4 border-t-0';
            default:
                return 'absolute top-1/2 -translate-y-1/2 -left-1 border-r-gray-800 border-r-4 border-y-transparent border-y-4 border-l-0';
        }
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={`absolute z-50 ${getPositionClasses()}`}
                    role="tooltip"
                >
                    <div className="bg-gray-800 text-white text-sm px-2 py-1 rounded whitespace-nowrap relative">
                        {content}
                        <div className={getArrowClasses()}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;