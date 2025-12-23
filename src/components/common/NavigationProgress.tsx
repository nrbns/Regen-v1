import { useEffect } from 'react';
import { useNavigation, useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import '../../styles/nprogress.css';

/**
 * Global navigation progress bar using nprogress.
 * Shows on route transitions and hides on idle.
 */
export function NavigationProgress() {
  const navigation = useNavigation();
  const location = useLocation();

  useEffect(() => {
    NProgress.configure({ showSpinner: false, trickleSpeed: 120, minimum: 0.08 });
  }, []);

  useEffect(() => {
    if (navigation.state === 'loading' || navigation.state === 'submitting') {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [navigation.state, location.pathname]);

  return null;
}
