import { App } from '@capacitor/app';

// make the back button navigate back
App.addListener('backButton', () => history.go(-1));

// handle opening app.satellite.earth things
App.addListener('appUrlOpen', (event) => {
	const url = new URL(event.url, location.host);
	history.replaceState({}, '', url);
});
