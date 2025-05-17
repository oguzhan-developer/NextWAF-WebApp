export const config = {
    apiPort: import.meta.env.VITE_APP_API_PORT || 5058,
    apiHost: import.meta.env.VITE_APP_DB_HOST || "172.20.10.4",
    dbUser: import.meta.env.VITE_APP_DB_USER,
    dbPassword: import.meta.env.VITE_APP_DB_PASSWORD,
    dbName: import.meta.env.VITE_APP_DB_NAME
};