import { AutoImport } from "../../functions/AutoImport";

// Automatically import and export all app components
const apps = AutoImport(".", /\.js$/);

export default apps;
