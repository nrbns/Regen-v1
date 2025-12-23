import React, { useState, useEffect } from 'react';
import FirstRunTour from './FirstRunTour';

// Wrapper to conditionally show tour on first run
export const FirstRunTourWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Check if tour has been completed
    const tourCompleted = localStorage.getItem('omnibrowser:tour:completed');
    if (!tourCompleted) {
      // Wait a bit before showing to let app initialize
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    setShowTour(false);
  };

  const handleSkip = () => {
    setShowTour(false);
  };

  return (
    <>
      {children}
      {showTour && <FirstRunTour onComplete={handleComplete} onSkip={handleSkip} />}
    </>
  );
};

export default FirstRunTourWrapper;
