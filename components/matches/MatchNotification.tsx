import React, { useEffect } from 'react';

interface MatchNotificationProps {
  message: string;
  onClose: () => void;
}

const MatchNotification: React.FC<MatchNotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000); // 3 saniye sonra kapanacak
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'rgba(0, 128, 0, 0.8)',
      color: 'white',
      padding: '20px',
      borderRadius: '5px',
      zIndex: 1000,
    }}>
      {message}
    </div>
  );
};

export default MatchNotification; 