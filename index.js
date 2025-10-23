import { registerRootComponent } from 'expo';

import App from './App';

// registerrootcomponent calls appregistry.registercomponent('main', () => app);
// it also ensures that whether you load the app in expo go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
