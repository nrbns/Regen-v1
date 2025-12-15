import { useEffect, useState } from 'react';

export function useMobileDetection() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const check = () => {
			try {
				const ua = navigator.userAgent || '';
				const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
				const smallViewport = window.innerWidth <= 768;
				setIsMobile(mobileUA.test(ua) || smallViewport);
			} catch {
				setIsMobile(false);
			}
		};
		check();
		window.addEventListener('resize', check);
		return () => window.removeEventListener('resize', check);
	}, []);

	return { isMobile };
}

