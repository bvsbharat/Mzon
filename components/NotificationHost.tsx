import React, { useEffect, useState } from 'react';
import Icon, { IconName } from './Icon';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
    const { id, message, type } = notification;
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 5000); // Auto-close after 5 seconds

        return () => clearTimeout(timer);
    }, []);
    
    const handleClose = () => {
        setIsExiting(true);
    };
    
    // When the exit animation completes, call the onClose prop to remove from state
    const onAnimationEnd = () => {
        if (isExiting) {
            onClose(id);
        }
    };

    const icon: IconName = type === 'success' ? 'checkCircle' : 'xCircle';
    const colors = type === 'success' 
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-800';

    return (
        <div 
            className={`w-full max-w-sm rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all transform ${colors} ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
            onAnimationEnd={onAnimationEnd}
            role="alert"
        >
            <div className="p-4 flex items-start">
                <div className="flex-shrink-0">
                    <Icon icon={icon} className={`w-6 h-6 ${type === 'success' ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium">{message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        onClick={handleClose}
                        className={`inline-flex rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 ${type === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600 focus:ring-offset-green-50' : 'text-red-500 hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50'}`}
                    >
                        <span className="sr-only">Close</span>
                        <Icon icon="x" className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

interface NotificationHostProps {
    notifications: Notification[];
    onRemoveNotification: (id: string) => void;
}

const NotificationHost: React.FC<NotificationHostProps> = ({ notifications, onRemoveNotification }) => {
    return (
        <div 
            aria-live="assertive" 
            className="fixed inset-0 flex items-start p-4 pointer-events-none sm:p-6 z-[100]"
        >
            <div className="w-full flex flex-col items-end space-y-4">
                {notifications.map((notification) => (
                    <NotificationToast
                        key={notification.id}
                        notification={notification}
                        onClose={onRemoveNotification}
                    />
                ))}
            </div>
        </div>
    );
};

export default NotificationHost;