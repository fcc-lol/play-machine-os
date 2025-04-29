import { AutoImport } from "../../../functions/AutoImport";

// Automatically import and export all menu components
const menus = AutoImport(".", /\.js$/);

export default menus;
