import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.caretaker.ai',
    appName: 'Caretaker AI',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
